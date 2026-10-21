export type UsbSessionState =
  | "disconnected"
  | "discovering"
  | "awaiting-consent"
  | "established"
  | "closing"
  | "closed"
  | "blocked";

export type UsbMessageType =
  | "hello"
  | "challenge"
  | "consent"
  | "capabilities"
  | "session-open"
  | "action-request"
  | "action-result"
  | "heartbeat"
  | "close"
  | "error";

export type UsbFrame<TPayload = unknown> = {
  protocolVersion: 1;
  sessionId: string;
  type: UsbMessageType;
  seq: number;
  sentAt: string;
  nonce: string;
  payload: TPayload;
  authTag: string;
};

export type UsbSessionPolicy = {
  allowedActions: string[];
  maxFrameBytes: number;
  heartbeatTimeoutMs: number;
  clockSkewMs: number;
};

export type UsbSessionEvent = {
  state: UsbSessionState;
  code:
    | "CONNECTED"
    | "HANDSHAKE_REQUIRED"
    | "CONSENT_REQUIRED"
    | "SESSION_ESTABLISHED"
    | "FRAME_ACCEPTED"
    | "FRAME_REJECTED"
    | "ACTION_NOT_ALLOWED"
    | "REPLAY_DETECTED"
    | "CLOCK_SKEW"
    | "FRAME_TOO_LARGE"
    | "CONSENT_REVOKED"
    | "HEARTBEAT_TIMEOUT"
    | "DISCONNECTED";
  message: string;
  seq?: number;
};

export interface UsbFrameAuthenticator {
  verify(frame: UsbFrame): Promise<boolean>;
}

export type UsbSessionOptions = {
  sessionId: string;
  now: () => string;
  policy: UsbSessionPolicy;
  authenticator: UsbFrameAuthenticator;
};

function time(value: string) {
  return new Date(value).getTime();
}

function event(
  state: UsbSessionState,
  code: UsbSessionEvent["code"],
  message: string,
  seq?: number,
): UsbSessionEvent {
  return { state, code, message, ...(seq === undefined ? {} : { seq }) };
}

export class UsbSessionManager {
  private currentState: UsbSessionState = "disconnected";
  private expectedSeq = 1;
  private lastActivityAt?: string;
  private readonly seenNonces = new Set<string>();

  constructor(private readonly options: UsbSessionOptions) {}

  get state() {
    return this.currentState;
  }

  connect(): UsbSessionEvent {
    this.currentState = "discovering";
    this.expectedSeq = 1;
    this.lastActivityAt = this.options.now();
    this.seenNonces.clear();
    return event(this.currentState, "CONNECTED", "USB transport connected; cooperative handshake required.");
  }

  requireConsent(): UsbSessionEvent {
    this.currentState = "awaiting-consent";
    return event(this.currentState, "CONSENT_REQUIRED", "Both devices must display and confirm the approved session scope.");
  }

  establish(): UsbSessionEvent {
    if (this.currentState !== "awaiting-consent") {
      this.currentState = "blocked";
      return event(this.currentState, "HANDSHAKE_REQUIRED", "Session cannot establish before discovery and visible consent.");
    }
    this.currentState = "established";
    this.lastActivityAt = this.options.now();
    return event(this.currentState, "SESSION_ESTABLISHED", "Cooperative USB session established within the approved scope.");
  }

  async receive<TPayload>(frame: UsbFrame<TPayload>): Promise<UsbSessionEvent> {
    if (this.currentState !== "established") {
      return event(this.currentState, "HANDSHAKE_REQUIRED", "Frames are rejected until the session is established.", frame.seq);
    }
    if (frame.protocolVersion !== 1 || frame.sessionId !== this.options.sessionId) {
      this.currentState = "blocked";
      return event(this.currentState, "FRAME_REJECTED", "Protocol version or session identity does not match.", frame.seq);
    }
    if (Math.abs(time(this.options.now()) - time(frame.sentAt)) > this.options.policy.clockSkewMs) {
      this.currentState = "blocked";
      return event(this.currentState, "CLOCK_SKEW", "Frame timestamp is outside the permitted clock-skew window.", frame.seq);
    }
    if (frame.seq !== this.expectedSeq || this.seenNonces.has(frame.nonce)) {
      this.currentState = "blocked";
      return event(this.currentState, "REPLAY_DETECTED", "Frame sequence or nonce was replayed or arrived out of order.", frame.seq);
    }
    if (JSON.stringify(frame).length > this.options.policy.maxFrameBytes) {
      this.currentState = "blocked";
      return event(this.currentState, "FRAME_TOO_LARGE", "Frame exceeds the protocol size limit.", frame.seq);
    }
    if (frame.type === "action-request") {
      const action = typeof frame.payload === "object" && frame.payload !== null && "action" in frame.payload
        ? String((frame.payload as { action: unknown }).action)
        : "";
      if (!this.options.policy.allowedActions.includes(action)) {
        this.currentState = "blocked";
        return event(this.currentState, "ACTION_NOT_ALLOWED", "Requested action is outside the signed session allow-list.", frame.seq);
      }
    }
    const authenticated = await this.options.authenticator.verify(frame);
    if (!authenticated) {
      this.currentState = "blocked";
      return event(this.currentState, "FRAME_REJECTED", "Frame authentication failed.", frame.seq);
    }
    this.expectedSeq += 1;
    this.seenNonces.add(frame.nonce);
    this.lastActivityAt = this.options.now();
    if (frame.type === "consent" && typeof frame.payload === "object" && frame.payload !== null && "granted" in frame.payload && (frame.payload as { granted: unknown }).granted === false) {
      this.currentState = "closing";
      return event(this.currentState, "CONSENT_REVOKED", "Consent was revoked; the session is closing without retry.", frame.seq);
    }
    if (frame.type === "close") {
      this.currentState = "closing";
      return event(this.currentState, "DISCONNECTED", "Peer requested a controlled session close.", frame.seq);
    }
    return event(this.currentState, "FRAME_ACCEPTED", "Authenticated frame accepted within the session scope.", frame.seq);
  }

  tick(): UsbSessionEvent | undefined {
    if (this.currentState !== "established" || !this.lastActivityAt) return undefined;
    if (time(this.options.now()) - time(this.lastActivityAt) > this.options.policy.heartbeatTimeoutMs) {
      this.currentState = "closing";
      return event(this.currentState, "HEARTBEAT_TIMEOUT", "Heartbeat timeout; transport is closing safely.");
    }
    return undefined;
  }

  disconnect(): UsbSessionEvent {
    this.currentState = "closed";
    return event(this.currentState, "DISCONNECTED", "USB transport disconnected; restart requires a new consented session.");
  }
}
