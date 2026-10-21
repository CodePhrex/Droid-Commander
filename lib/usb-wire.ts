export const USB_WIRE_VERSION = 1;
export const USB_MAGIC = new Uint8Array([0x44, 0x43]); // "DC"
export const USB_HEADER_LENGTH = 57;
export const USB_AUTH_TAG_LENGTH = 16;
export const USB_MAX_PACKET_BYTES = 64 * 1024;
export const USB_MAX_PAYLOAD_BYTES = USB_MAX_PACKET_BYTES - USB_HEADER_LENGTH - USB_AUTH_TAG_LENGTH;

export type UsbWireMessageType = "hello" | "challenge" | "consent" | "capabilities" | "session-open" | "action-request" | "action-result" | "heartbeat" | "close" | "error";

const MESSAGE_TYPE_TO_CODE: Record<UsbWireMessageType, number> = {
  hello: 1,
  challenge: 2,
  consent: 3,
  capabilities: 4,
  "session-open": 5,
  "action-request": 6,
  "action-result": 7,
  heartbeat: 8,
  close: 9,
  error: 10,
};

const CODE_TO_MESSAGE_TYPE = Object.fromEntries(
  Object.entries(MESSAGE_TYPE_TO_CODE).map(([name, code]) => [code, name]),
) as Record<number, UsbWireMessageType | undefined>;

export type SafeAction = "read-posture" | "read-capabilities" | "simulate-remediation" | "verify-posture";

const ACTION_TO_CODE: Record<SafeAction, number> = {
  "read-posture": 1,
  "read-capabilities": 2,
  "simulate-remediation": 3,
  "verify-posture": 4,
};

const CODE_TO_ACTION = Object.fromEntries(
  Object.entries(ACTION_TO_CODE).map(([name, code]) => [code, name]),
) as Record<number, SafeAction | undefined>;

export type ActionRequest =
  | { requestId: number; action: "read-posture"; findingId?: never }
  | { requestId: number; action: "read-capabilities"; findingId?: never }
  | { requestId: number; action: "simulate-remediation"; findingId: string }
  | { requestId: number; action: "verify-posture"; findingId: string };

export type UsbPacket = {
  messageType: UsbWireMessageType;
  flags: number;
  sessionId: Uint8Array;
  sequence: number;
  timestampMs: number;
  nonce: Uint8Array;
  payload: Uint8Array;
  authTag: Uint8Array;
};

export class UsbWireError extends Error {
  constructor(public readonly code: "TRUNCATED" | "MAGIC" | "VERSION" | "LENGTH" | "FIELD" | "MESSAGE_TYPE" | "ACTION" | "PAYLOAD" | "AUTH_TAG", message: string) {
    super(message);
    this.name = "UsbWireError";
  }
}

function requireLength(value: Uint8Array, expected: number, label: string) {
  if (value.length !== expected) throw new UsbWireError("FIELD", `${label} must be exactly ${expected} bytes.`);
}

function requireUint32(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new UsbWireError("FIELD", `${label} must be an unsigned 32-bit integer.`);
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

function decodeUtf8(value: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    throw new UsbWireError("PAYLOAD", "Text field is not valid UTF-8.");
  }
}

function writeU16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, false);
}

function writeU32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, false);
}

function readU16(view: DataView, offset: number) {
  return view.getUint16(offset, false);
}

function readU32(view: DataView, offset: number) {
  return view.getUint32(offset, false);
}

function concat(...parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    result.set(part, cursor);
    cursor += part.length;
  }
  return result;
}

export function encodeActionRequest(request: ActionRequest): Uint8Array {
  requireUint32(request.requestId, "requestId");
  const actionCode = ACTION_TO_CODE[request.action];
  if (!actionCode) throw new UsbWireError("ACTION", "Action is not allow-listed.");

  if (request.action === "read-posture" || request.action === "read-capabilities") {
    const bytes = new Uint8Array(5);
    const view = new DataView(bytes.buffer);
    writeU32(view, 0, request.requestId);
    view.setUint8(4, actionCode);
    return bytes;
  }

  const findingId = utf8(request.findingId);
  if (findingId.length === 0 || findingId.length > 1024) throw new UsbWireError("PAYLOAD", "findingId must be 1–1024 UTF-8 bytes.");
  const bytes = new Uint8Array(7 + findingId.length);
  const view = new DataView(bytes.buffer);
  writeU32(view, 0, request.requestId);
  view.setUint8(4, actionCode);
  writeU16(view, 5, findingId.length);
  bytes.set(findingId, 7);
  return bytes;
}

export function decodeActionRequest(payload: Uint8Array): ActionRequest {
  if (payload.length < 5) throw new UsbWireError("PAYLOAD", "Action request is truncated.");
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const requestId = readU32(view, 0);
  const action = CODE_TO_ACTION[view.getUint8(4)];
  if (!action) throw new UsbWireError("ACTION", "Action code is not allow-listed.");

  if (action === "read-posture" || action === "read-capabilities") {
    if (payload.length !== 5) throw new UsbWireError("PAYLOAD", "Read-only action must not contain parameters.");
    return { requestId, action };
  }

  if (payload.length < 7) throw new UsbWireError("PAYLOAD", "Parameterized action is truncated.");
  const findingLength = readU16(view, 5);
  if (findingLength === 0 || payload.length !== 7 + findingLength) throw new UsbWireError("PAYLOAD", "Parameterized action length is invalid.");
  return { requestId, action, findingId: decodeUtf8(payload.subarray(7)) } as ActionRequest;
}

export function encodePacket(packet: UsbPacket): Uint8Array {
  const messageCode = MESSAGE_TYPE_TO_CODE[packet.messageType];
  if (!messageCode) throw new UsbWireError("MESSAGE_TYPE", "Message type is not defined by the wire protocol.");
  requireLength(packet.sessionId, 16, "sessionId");
  requireLength(packet.nonce, 16, "nonce");
  requireLength(packet.authTag, USB_AUTH_TAG_LENGTH, "authTag");
  requireUint32(packet.sequence, "sequence");
  if (!Number.isSafeInteger(packet.timestampMs) || packet.timestampMs < 0) throw new UsbWireError("FIELD", "timestampMs must be a non-negative safe integer.");
  if (packet.payload.length > USB_MAX_PAYLOAD_BYTES) throw new UsbWireError("LENGTH", "Payload exceeds the packet limit.");

  const totalLength = USB_HEADER_LENGTH + packet.payload.length + packet.authTag.length;
  if (totalLength > USB_MAX_PACKET_BYTES) throw new UsbWireError("LENGTH", "Packet exceeds the maximum packet size.");

  const result = new Uint8Array(totalLength);
  const view = new DataView(result.buffer);
  result.set(USB_MAGIC, 0);
  view.setUint8(2, USB_WIRE_VERSION);
  view.setUint8(3, messageCode);
  view.setUint8(4, packet.flags & 0xff);
  writeU16(view, 5, USB_HEADER_LENGTH);
  result.set(packet.sessionId, 7);
  writeU32(view, 23, packet.sequence);
  const timestampHigh = Math.floor(packet.timestampMs / 0x100000000);
  const timestampLow = packet.timestampMs >>> 0;
  writeU32(view, 27, timestampHigh);
  writeU32(view, 31, timestampLow);
  result.set(packet.nonce, 35);
  writeU32(view, 51, packet.payload.length);
  view.setUint8(55, packet.authTag.length);
  view.setUint8(56, 0);
  result.set(packet.payload, USB_HEADER_LENGTH);
  result.set(packet.authTag, USB_HEADER_LENGTH + packet.payload.length);
  return result;
}

export function decodePacket(bytes: Uint8Array): UsbPacket {
  if (bytes.length < USB_HEADER_LENGTH) throw new UsbWireError("TRUNCATED", "Packet is shorter than the fixed header.");
  if (bytes[0] !== USB_MAGIC[0] || bytes[1] !== USB_MAGIC[1]) throw new UsbWireError("MAGIC", "Packet magic does not match Droid Commander.");
  if (bytes[2] !== USB_WIRE_VERSION) throw new UsbWireError("VERSION", "Unsupported wire protocol version.");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const messageType = CODE_TO_MESSAGE_TYPE[view.getUint8(3)];
  if (!messageType) throw new UsbWireError("MESSAGE_TYPE", "Message type code is not allow-listed.");
  const headerLength = readU16(view, 5);
  if (headerLength !== USB_HEADER_LENGTH) throw new UsbWireError("LENGTH", "Unexpected header length.");
  const payloadLength = readU32(view, 51);
  const authTagLength = view.getUint8(55);
  if (authTagLength !== USB_AUTH_TAG_LENGTH) throw new UsbWireError("AUTH_TAG", "Authentication tag must be 16 bytes.");
  if (bytes.length !== headerLength + payloadLength + authTagLength || bytes.length > USB_MAX_PACKET_BYTES) {
    throw new UsbWireError("LENGTH", "Packet length fields do not match the received bytes.");
  }

  const timestampMs = readU32(view, 27) * 0x100000000 + readU32(view, 31);
  return {
    messageType,
    flags: view.getUint8(4),
    sessionId: bytes.slice(7, 23),
    sequence: readU32(view, 23),
    timestampMs,
    nonce: bytes.slice(35, 51),
    payload: bytes.slice(headerLength, headerLength + payloadLength),
    authTag: bytes.slice(headerLength + payloadLength),
  };
}
