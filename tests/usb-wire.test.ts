import { describe, expect, it } from "vitest";

import {
  USB_AUTH_TAG_LENGTH,
  USB_HEADER_LENGTH,
  USB_MAX_PACKET_BYTES,
  USB_MAX_PAYLOAD_BYTES,
  UsbWireError,
  decodeActionRequest,
  decodePacket,
  encodeActionRequest,
  encodePacket,
  type UsbPacket,
  type UsbWireMessageType,
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

function expectWireError(run: () => unknown, code: UsbWireError["code"]) {
  try {
    run();
    throw new Error(`Expected UsbWireError with code ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(UsbWireError);
    expect((error as UsbWireError).code).toBe(code);
  }
}

describe("USB binary packet framing", () => {
  it("round-trips every defined message type", () => {
    const messageTypes: UsbWireMessageType[] = [
      "hello",
      "challenge",
      "consent",
      "capabilities",
      "session-open",
      "action-request",
      "action-result",
      "heartbeat",
      "close",
      "error",
    ];
    for (const messageType of messageTypes) {
      const decoded = decodePacket(encodePacket(packet({ messageType })));
      expect(decoded.messageType).toBe(messageType);
    }
  });

  it("round-trips the fixed header and typed payload", () => {
    const encoded = encodePacket(packet());
    expect(encoded.length).toBe(USB_HEADER_LENGTH + 5 + USB_AUTH_TAG_LENGTH);
    const decoded = decodePacket(encoded);
    expect(decoded.messageType).toBe("action-request");
    expect(decoded.flags).toBe(0);
    expect(decoded.sequence).toBe(7);
    expect(decoded.timestampMs).toBe(1792522800000);
    expect(decoded.sessionId).toEqual(bytes(16, 1));
    expect(decoded.nonce).toEqual(bytes(16, 2));
    expect(decoded.authTag).toEqual(bytes(USB_AUTH_TAG_LENGTH, 3));
    expect(decodeActionRequest(decoded.payload)).toEqual({ requestId: 44, action: "read-posture" });
  });

  it("preserves nonzero flags within the unsigned byte range", () => {
    const decoded = decodePacket(encodePacket(packet({ flags: 0xff })));
    expect(decoded.flags).toBe(0xff);
  });

  it("round-trips the only parameterized training commands", () => {
    for (const action of ["simulate-remediation", "verify-posture"] as const) {
      const decoded = decodeActionRequest(encodeActionRequest({ requestId: 9, action, findingId: "finding-12" }));
      expect(decoded).toEqual({ requestId: 9, action, findingId: "finding-12" });
    }
  });

  it("round-trips the smallest and largest request IDs", () => {
    for (const requestId of [0, 0xffffffff]) {
      const decoded = decodeActionRequest(encodeActionRequest({ requestId, action: "read-capabilities" }));
      expect(decoded).toEqual({ requestId, action: "read-capabilities" });
    }
  });

  it("round-trips a finding ID at the exact 1024-byte UTF-8 boundary", () => {
    const findingId = "é".repeat(512);
    expect(new TextEncoder().encode(findingId).length).toBe(1024);
    const decoded = decodeActionRequest(encodeActionRequest({ requestId: 1, action: "verify-posture", findingId }));
    expect(decoded).toEqual({ requestId: 1, action: "verify-posture", findingId });
  });

  it("accepts an exact maximum-size packet", () => {
    const encoded = encodePacket(packet({ payload: bytes(USB_MAX_PAYLOAD_BYTES, 4) }));
    expect(encoded.length).toBe(USB_MAX_PACKET_BYTES);
    expect(decodePacket(encoded).payload.length).toBe(USB_MAX_PAYLOAD_BYTES);
  });

  it("supports a subarray view without reading outside the packet", () => {
    const encoded = encodePacket(packet());
    const surrounding = new Uint8Array(encoded.length + 10).fill(0xaa);
    surrounding.set(encoded, 5);
    const decoded = decodePacket(surrounding.subarray(5, 5 + encoded.length));
    expect(decoded.sequence).toBe(7);
    expect(decoded.payload).toEqual(packet().payload);
  });

  it("uses big-endian sequence and timestamp fields", () => {
    const encoded = encodePacket(packet({ sequence: 0x01020304, timestampMs: 0x010203040506 }));
    expect(Array.from(encoded.slice(23, 27))).toEqual([1, 2, 3, 4]);
    expect(Array.from(encoded.slice(27, 35))).toEqual([0, 0, 1, 2, 3, 4, 5, 6]);
  });

  it("round-trips the largest safe timestamp representable by the JavaScript codec", () => {
    const timestampMs = Number.MAX_SAFE_INTEGER;
    expect(decodePacket(encodePacket(packet({ timestampMs }))).timestampMs).toBe(timestampMs);
  });
});

describe("USB binary packet rejection and mutation coverage", () => {
  it("rejects arbitrary or unsupported actions", () => {
    expectWireError(() => encodeActionRequest({ requestId: 1, action: "run-shell" } as never), "ACTION");
    expectWireError(() => decodeActionRequest(new Uint8Array([0, 0, 0, 1, 99])), "ACTION");
  });

  it("rejects invalid request IDs and flags", () => {
    expectWireError(() => encodeActionRequest({ requestId: -1, action: "read-posture" }), "FIELD");
    expectWireError(() => encodeActionRequest({ requestId: 0x100000000, action: "read-posture" }), "FIELD");
    expectWireError(() => encodePacket(packet({ flags: -1 })), "FIELD");
    expectWireError(() => encodePacket(packet({ flags: 256 })), "FIELD");
  });

  it("rejects unexpected parameters on parameterless actions", () => {
    const payload = encodeActionRequest({ requestId: 1, action: "read-posture" });
    expectWireError(() => decodeActionRequest(new Uint8Array([...payload, 0])), "PAYLOAD");
  });

  it("rejects empty, oversized, and byte-overflowing finding IDs", () => {
    expectWireError(() => encodeActionRequest({ requestId: 1, action: "verify-posture", findingId: "" }), "PAYLOAD");
    expectWireError(() => encodeActionRequest({ requestId: 1, action: "verify-posture", findingId: "x".repeat(1025) }), "PAYLOAD");
    expectWireError(() => encodeActionRequest({ requestId: 1, action: "verify-posture", findingId: "é".repeat(513) }), "PAYLOAD");
  });

  it("rejects malformed parameter lengths and invalid UTF-8", () => {
    const payload = encodeActionRequest({ requestId: 1, action: "verify-posture", findingId: "f-1" });
    const malformed = payload.slice();
    malformed[5] = 0;
    malformed[6] = 20;
    expectWireError(() => decodeActionRequest(malformed), "PAYLOAD");

    const invalidUtf8 = new Uint8Array([0, 0, 0, 1, 4, 0, 1, 0xff]);
    expectWireError(() => decodeActionRequest(invalidUtf8), "PAYLOAD");
    expectWireError(() => decodeActionRequest(new Uint8Array([0, 0, 0, 1, 4, 0, 0])), "PAYLOAD");
  });

  it("rejects bad magic, version, message type, and header length", () => {
    const encoded = encodePacket(packet());
    const badMagic = encoded.slice();
    badMagic[0] = 0;
    expectWireError(() => decodePacket(badMagic), "MAGIC");

    const badVersion = encoded.slice();
    badVersion[2] = 9;
    expectWireError(() => decodePacket(badVersion), "VERSION");

    const badMessageType = encoded.slice();
    badMessageType[3] = 255;
    expectWireError(() => decodePacket(badMessageType), "MESSAGE_TYPE");

    const badHeaderLength = encoded.slice();
    badHeaderLength[5] = 0;
    badHeaderLength[6] = USB_HEADER_LENGTH - 1;
    expectWireError(() => decodePacket(badHeaderLength), "LENGTH");
  });

  it("rejects bad authentication-tag length and reserved header bytes", () => {
    const encoded = encodePacket(packet());
    const badTagLength = encoded.slice();
    badTagLength[55] = 8;
    expectWireError(() => decodePacket(badTagLength), "AUTH_TAG");

    const badReservedByte = encoded.slice();
    badReservedByte[56] = 1;
    expectWireError(() => decodePacket(badReservedByte), "FIELD");
  });

  it("rejects truncation, trailing bytes, and inconsistent payload lengths", () => {
    const encoded = encodePacket(packet());
    expectWireError(() => decodePacket(encoded.slice(0, 20)), "TRUNCATED");
    expectWireError(() => decodePacket(new Uint8Array([...encoded, 0])), "LENGTH");

    const badPayloadLength = encoded.slice();
    badPayloadLength[51] = 0;
    badPayloadLength[52] = 0;
    badPayloadLength[53] = 0;
    badPayloadLength[54] = 99;
    expectWireError(() => decodePacket(badPayloadLength), "LENGTH");
  });

  it("rejects incorrect fixed-field sizes, invalid timestamps, and oversized payloads", () => {
    expectWireError(() => encodePacket(packet({ sessionId: bytes(8, 1) })), "FIELD");
    expectWireError(() => encodePacket(packet({ nonce: bytes(8, 1) })), "FIELD");
    expectWireError(() => encodePacket(packet({ authTag: bytes(8, 1) })), "FIELD");
    expectWireError(() => encodePacket(packet({ timestampMs: -1 })), "FIELD");
    expectWireError(() => encodePacket(packet({ timestampMs: Number.MAX_SAFE_INTEGER + 1 })), "FIELD");
    expectWireError(() => encodePacket(packet({ payload: bytes(USB_MAX_PAYLOAD_BYTES + 1, 1) })), "LENGTH");
  });

  it("does not silently mutate the encoded authentication tag", () => {
    const tag = bytes(USB_AUTH_TAG_LENGTH, 0x5a);
    const decoded = decodePacket(encodePacket(packet({ authTag: tag })));
    expect(decoded.authTag).toEqual(tag);
  });
});
