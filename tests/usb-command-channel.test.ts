import { describe, expect, it } from "vitest";

import { UsbCommandChannel } from "../lib/usb-command-channel";
import { decodeActionRequest, decodePacket, encodeActionResult, encodePacket } from "../lib/usb-wire";

type UsbCommandEvent = { type: string; payload?: unknown };
type UsbCommandTransport = {
  sendPacket(bytes: Uint8Array): Promise<boolean>;
  addUsbHostListener(listener: (event: UsbCommandEvent) => void): { remove(): void };
};
type UsbPacket = { messageType: "hello" | "challenge" | "consent" | "capabilities" | "session-open" | "action-request" | "action-result" | "heartbeat" | "close" | "error"; flags: number; sessionId: Uint8Array; sequence: number; timestampMs: number; nonce: Uint8Array; payload: Uint8Array; authTag: Uint8Array };
type ActionResultInput = { requestId: number; status: "ok" | "denied" | "failed" | "invalid"; detail: string };

const bytes = (length: number, fill: number) => new Uint8Array(length).fill(fill);

function toBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

class FakeTransport implements UsbCommandTransport {
  sent: Uint8Array[] = [];
  accepted = true;
  private listener: ((event: UsbCommandEvent) => void) | null = null;

  sendPacket(bytes: Uint8Array) {
    this.sent.push(bytes);
    return Promise.resolve(this.accepted);
  }

  addUsbHostListener(listener: (event: UsbCommandEvent) => void) {
    this.listener = listener;
    return { remove: () => { this.listener = null; } };
  }

  emit(event: UsbCommandEvent) {
    this.listener?.(event);
  }
}

function resultPacket(sessionId: Uint8Array, result: ActionResultInput, overrides: Partial<UsbPacket> = {}) {
  return encodePacket({
    messageType: "action-result",
    flags: 0,
    sessionId,
    sequence: 9,
    timestampMs: 1792522800000,
    nonce: bytes(16, 4),
    payload: encodeActionResult(result),
    authTag: bytes(16, 5),
    ...overrides,
  });
}

describe("USB command channel", () => {
  it("authenticates and transmits a typed safe action request", async () => {
    const transport = new FakeTransport();
    const sessionId = bytes(16, 1);
    const channel = new UsbCommandChannel(transport, {
      sessionId,
      now: () => 1792522800000,
      randomBytes: (length) => bytes(length, 2),
      authenticate: async (unsignedFrame) => {
        const decoded = decodePacket(unsignedFrame);
        expect(decoded.authTag).toEqual(bytes(16, 0));
        expect(decodeActionRequest(decoded.payload)).toEqual({ requestId: 41, action: "read-posture" });
        return bytes(16, 9);
      },
    });

    await expect(channel.sendAction({ requestId: 41, action: "read-posture" })).resolves.toEqual({ requestId: 41, sequence: 1 });
    const sent = decodePacket(transport.sent[0]);
    expect(sent.sessionId).toEqual(sessionId);
    expect(sent.authTag).toEqual(bytes(16, 9));
    expect(sent.sequence).toBe(1);
    channel.close();
  });

  it("increments packet sequence for consecutive commands", async () => {
    const transport = new FakeTransport();
    const channel = new UsbCommandChannel(transport, {
      sessionId: bytes(16, 1),
      authenticate: async () => bytes(16, 8),
      randomBytes: (length) => bytes(length, 2),
    });
    await channel.sendAction({ requestId: 1, action: "read-capabilities" });
    await channel.sendAction({ requestId: 2, action: "verify-posture", findingId: "patch-state" });
    expect(decodePacket(transport.sent[0]).sequence).toBe(1);
    expect(decodePacket(transport.sent[1]).sequence).toBe(2);
    channel.close();
  });

  it("rejects an authenticator that returns the wrong tag length", async () => {
    const transport = new FakeTransport();
    const channel = new UsbCommandChannel(transport, { sessionId: bytes(16, 1), authenticate: async () => bytes(15, 8) });
    await expect(channel.sendAction({ requestId: 1, action: "read-posture" })).rejects.toMatchObject({ code: "AUTH_TAG" });
    expect(transport.sent).toHaveLength(0);
    channel.close();
  });

  it("surfaces native send rejection", async () => {
    const transport = new FakeTransport();
    transport.accepted = false;
    const channel = new UsbCommandChannel(transport, { sessionId: bytes(16, 1), authenticate: async () => bytes(16, 8) });
    await expect(channel.sendAction({ requestId: 1, action: "read-posture" })).rejects.toMatchObject({ code: "SEND_REJECTED" });
    channel.close();
  });

  it("parses an authenticated action-result frame for the active session", () => {
    const transport = new FakeTransport();
    const sessionId = bytes(16, 1);
    const channel = new UsbCommandChannel(transport, { sessionId, authenticate: async () => bytes(16, 8) });
    const results: unknown[] = [];
    channel.onResponse((result, packet) => results.push({ result, sequence: packet.sequence }));
    transport.emit({ type: "bytes-received", payload: { bytesBase64: toBase64(resultPacket(sessionId, { requestId: 41, status: "ok", detail: "Posture verified" })) } });
    expect(results).toEqual([{ result: { requestId: 41, status: "ok", detail: "Posture verified" }, sequence: 9 }]);
    channel.close();
  });

  it("rejects responses for another session and reports a protocol error", () => {
    const transport = new FakeTransport();
    const channel = new UsbCommandChannel(transport, { sessionId: bytes(16, 1), authenticate: async () => bytes(16, 8) });
    const errors: string[] = [];
    channel.onError((error) => errors.push(error.code));
    transport.emit({ type: "bytes-received", payload: { bytesBase64: toBase64(resultPacket(bytes(16, 2), { requestId: 41, status: "ok", detail: "wrong session" })) } });
    expect(errors).toEqual(["SESSION"]);
    channel.close();
  });

  it("rejects malformed base64 and malformed response frames", () => {
    const transport = new FakeTransport();
    const channel = new UsbCommandChannel(transport, { sessionId: bytes(16, 1), authenticate: async () => bytes(16, 8) });
    const errors: string[] = [];
    channel.onError((error) => errors.push(error.code));
    transport.emit({ type: "bytes-received", payload: { bytesBase64: "not-base64" } });
    transport.emit({ type: "bytes-received", payload: { bytesBase64: toBase64(bytes(7, 0)) } });
    expect(errors).toEqual(["BASE64", "FRAME"]);
    channel.close();
  });

  it("ignores unrelated native events and stops after close", () => {
    const transport = new FakeTransport();
    const channel = new UsbCommandChannel(transport, { sessionId: bytes(16, 1), authenticate: async () => bytes(16, 8) });
    const results: unknown[] = [];
    channel.onResponse((result) => results.push(result));
    transport.emit({ type: "connected" });
    channel.close();
    transport.emit({ type: "bytes-received", payload: { bytesBase64: toBase64(resultPacket(bytes(16, 1), { requestId: 1, status: "ok", detail: "late" })) } });
    expect(results).toHaveLength(0);
  });
});
