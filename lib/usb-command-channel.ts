import {
  decodeActionResult,
  decodePacket,
  encodeActionRequest,
  encodePacket,
} from "./usb-wire";
import type { ActionRequest, ActionResult, UsbPacket } from "./usb-wire";


export type UsbCommandEvent = {
  type: string;
  payload?: unknown;
};

export type UsbCommandTransport = {
  sendPacket(bytes: Uint8Array): Promise<boolean>;
  addUsbHostListener(listener: (event: UsbCommandEvent) => void): { remove(): void };
};

export type UsbCommandChannelOptions = {
  sessionId: Uint8Array;
  authenticate: (unsignedFrame: Uint8Array) => Promise<Uint8Array>;
  now?: () => number;
  randomBytes?: (length: number) => Uint8Array;
};

export class UsbCommandChannelError extends Error {
  constructor(public readonly code: "SESSION" | "AUTHENTICATOR" | "AUTH_TAG" | "RANDOMNESS" | "SEND_REJECTED" | "BASE64" | "FRAME" | "RESPONSE", message: string) {
    super(message);
    this.name = "UsbCommandChannelError";
  }
}

type ResponseListener = (result: ActionResult, packet: UsbPacket) => void;
type ErrorListener = (error: UsbCommandChannelError) => void;

const ZERO_AUTH_TAG = new Uint8Array(16);

function defaultRandomBytes(length: number) {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) throw new UsbCommandChannelError("RANDOMNESS", "A cryptographically secure random source is required.");
  return cryptoApi.getRandomValues(new Uint8Array(length));
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function fromBase64(value: string) {
  try {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    throw new UsbCommandChannelError("BASE64", "Native USB event contained invalid base64 bytes.");
  }
}

export class UsbCommandChannel {
  private readonly sessionId: Uint8Array;
  private readonly authenticate: UsbCommandChannelOptions["authenticate"];
  private readonly now: () => number;
  private readonly randomBytes: (length: number) => Uint8Array;
  private readonly responseListeners = new Set<ResponseListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private readonly subscription: { remove(): void };
  private nextSequence = 1;

  constructor(private readonly transport: UsbCommandTransport, options: UsbCommandChannelOptions) {
    if (options.sessionId.length !== 16) throw new UsbCommandChannelError("SESSION", "A USB command session ID must be 16 bytes.");
    this.sessionId = options.sessionId.slice();
    this.authenticate = options.authenticate;
    this.now = options.now ?? Date.now;
    this.randomBytes = options.randomBytes ?? defaultRandomBytes;
    this.subscription = transport.addUsbHostListener((event) => this.handleEvent(event));
  }

  async sendAction(request: ActionRequest): Promise<{ requestId: number; sequence: number }> {
    const sequence = this.nextSequence;
    this.nextSequence += 1;
    const unsignedPacket: UsbPacket = {
      messageType: "action-request",
      flags: 0,
      sessionId: this.sessionId,
      sequence,
      timestampMs: this.now(),
      nonce: this.randomBytes(16),
      payload: encodeActionRequest(request),
      authTag: ZERO_AUTH_TAG,
    };
    const unsignedFrame = encodePacket(unsignedPacket);
    const authTag = await this.authenticate(unsignedFrame);
    if (authTag.length !== 16) throw new UsbCommandChannelError("AUTH_TAG", "The session authenticator must return a 16-byte tag.");
    const accepted = await this.transport.sendPacket(encodePacket({ ...unsignedPacket, authTag }));
    if (!accepted) throw new UsbCommandChannelError("SEND_REJECTED", "The native USB transport rejected the packet.");
    return { requestId: request.requestId, sequence };
  }

  onResponse(listener: ResponseListener) {
    this.responseListeners.add(listener);
    return { remove: () => this.responseListeners.delete(listener) };
  }

  onError(listener: ErrorListener) {
    this.errorListeners.add(listener);
    return { remove: () => this.errorListeners.delete(listener) };
  }

  close() {
    this.subscription.remove();
    this.responseListeners.clear();
    this.errorListeners.clear();
  }

  private handleEvent(event: UsbCommandEvent) {
    if (event.type !== "bytes-received") return;
    const payload = typeof event.payload === "object" && event.payload !== null ? event.payload as Record<string, unknown> : {};
    if (typeof payload.bytesBase64 !== "string") {
      this.emitError(new UsbCommandChannelError("FRAME", "bytes-received event did not contain base64 bytes."));
      return;
    }
    try {
      const packet = decodePacket(fromBase64(payload.bytesBase64));
      if (!sameBytes(packet.sessionId, this.sessionId)) throw new UsbCommandChannelError("SESSION", "Response session ID does not match the active session.");
      if (packet.messageType !== "action-result") throw new UsbCommandChannelError("RESPONSE", "Received a non-result frame on the command response channel.");
      const result = decodeActionResult(packet.payload);
      this.responseListeners.forEach((listener) => listener(result, packet));
    } catch (error) {
      this.emitError(error instanceof UsbCommandChannelError ? error : new UsbCommandChannelError("FRAME", error instanceof Error ? error.message : "Invalid response frame."));
    }
  }

  private emitError(error: UsbCommandChannelError) {
    this.errorListeners.forEach((listener) => listener(error));
  }
}
