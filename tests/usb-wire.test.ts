import { describe, expect, it } from "vitest";

import {
  USB_AUTH_TAG_LENGTH,
  UsbWireError,
  decodeActionRequest,
  decodePacket,
  encodeActionRequest,
  encodePacket,
  type UsbPacket,
} from "../lib/usb-wire";

const bytes = (value: number, fill: number) => new Uint8Array(value).fill(fill);

function packet(overrides: Partial<UsbPacket> = {}): UsbPacket {
  return {
    messageType: "action-request",
    flags: 0,
    sessionId: bytes(16, 1),
    sequence: 7,
    timestampMs: 1792522800000,
    nonce: bytes(16, 2),
    payload: encodeActionRequest({ requestId: 44, action: "read-posture" }),
    authTag: bytes(USB_AUTH_TAG_LENGTH, 3),
    ...overrides,
  };
}

describe("USB binary packet framing", () => {
  it("round-trips the fixed header and typed payload", () => {
    const encoded = encodePacket(packet());
    const decoded = decodePacket(encoded);
    expect(decoded.messageType).toBe("action-request");
    expect(decoded.sequence).toBe(7);
    expect(decoded.timestampMs).toBe(1792522800000);
    expect(decoded.sessionId).toEqual(bytes(16, 1));
    expect(decodeActionRequest(decoded.payload)).toEqual({ requestId: 44, action: "read-posture" });
  });

  it("round-trips the only parameterized training commands", () => {
    for (const action of ["simulate-remediation", "verify-posture"] as const) {
      const decoded = decodeActionRequest(encodeActionRequest({ requestId: 9, action, findingId: "finding-12" }));
      expect(decoded).toEqual({ requestId: 9, action, findingId: "finding-12" });
    }
  });

  it("rejects arbitrary or unsupported actions", () => {
    expect(() => encodeActionRequest({ requestId: 1, action: "run-shell" } as never)).toThrowError(UsbWireError);
    expect(() => decodeActionRequest(new Uint8Array([0, 0, 0, 1, 99]))).toThrowError(UsbWireError);
  });

  it("rejects unexpected parameters on parameterless actions", () => {
    const payload = encodeActionRequest({ requestId: 1, action: "read-posture" });
    expect(() => decodeActionRequest(new Uint8Array([...payload, 0]))).toThrowError(/must not contain parameters/);
  });

  it("rejects malformed parameter lengths and invalid UTF-8", () => {
    const payload = encodeActionRequest({ requestId: 1, action: "verify-posture", findingId: "f-1" });
    const malformed = payload.slice();
    malformed[5] = 0;
    malformed[6] = 20;
    expect(() => decodeActionRequest(malformed)).toThrowError(UsbWireError);

    const invalidUtf8 = new Uint8Array([0, 0, 0, 1, 4, 0, 1, 0xff]);
    expect(() => decodeActionRequest(invalidUtf8)).toThrowError(/UTF-8/);
  });

  it("rejects bad magic, version, and authentication-tag length", () => {
    const encoded = encodePacket(packet());
    const badMagic = encoded.slice();
    badMagic[0] = 0;
    expect(() => decodePacket(badMagic)).toThrowError(/magic/);

    const badVersion = encoded.slice();
    badVersion[2] = 9;
    expect(() => decodePacket(badVersion)).toThrowError(/version/i);

    const badTagLength = encoded.slice();
    badTagLength[55] = 8;
    expect(() => decodePacket(badTagLength)).toThrowError(/Authentication tag/);
  });

  it("rejects truncation and inconsistent total lengths", () => {
    const encoded = encodePacket(packet());
    expect(() => decodePacket(encoded.slice(0, 20))).toThrowError(UsbWireError);
    expect(() => decodePacket(encoded.slice(0, -1))).toThrowError(/length/i);
  });

  it("rejects incorrect fixed-field sizes and oversized payloads", () => {
    expect(() => encodePacket(packet({ sessionId: bytes(8, 1) }))).toThrowError(/sessionId/);
    expect(() => encodePacket(packet({ authTag: bytes(8, 1) }))).toThrowError(/authTag/);
    expect(() => encodePacket(packet({ payload: bytes(64 * 1024, 1) }))).toThrowError(/Payload/);
  });

  it("uses big-endian sequence and timestamp fields", () => {
    const encoded = encodePacket(packet({ sequence: 0x01020304, timestampMs: 0x010203040506 }));
    expect(Array.from(encoded.slice(23, 27))).toEqual([1, 2, 3, 4]);
    expect(Array.from(encoded.slice(27, 35))).toEqual([0, 0, 1, 2, 3, 4, 5, 6]);
  });
});
