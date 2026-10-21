import { describe, expect, it, vi } from "vitest";

import { UsbSessionManager, type UsbFrame, type UsbSessionOptions } from "../lib/usb-session";

const now = { value: "2026-10-20T19:00:00.000Z" };

function createManager(overrides: Partial<UsbSessionOptions> = {}) {
  const options: UsbSessionOptions = {
    sessionId: "session-usb-001",
    now: () => now.value,
    policy: {
      allowedActions: ["read-posture", "verify-posture"],
      maxFrameBytes: 4096,
      heartbeatTimeoutMs: 30_000,
      clockSkewMs: 120_000,
    },
    authenticator: { verify: vi.fn(async () => true) },
    ...overrides,
  };
  return { manager: new UsbSessionManager(options), options };
}

function frame(seq: number, type: UsbFrame["type"] = "heartbeat", payload: unknown = {}) : UsbFrame {
  return {
    protocolVersion: 1,
    sessionId: "session-usb-001",
    type,
    seq,
    sentAt: now.value,
    nonce: `nonce-${seq}`,
    payload,
    authTag: `tag-${seq}`,
  };
}

function establishedManager(overrides: Partial<UsbSessionOptions> = {}) {
  const setup = createManager(overrides);
  setup.manager.connect();
  setup.manager.requireConsent();
  setup.manager.establish();
  return setup;
}

describe("USB OTG session protocol", () => {
  it("requires discovery and visible consent before establishment", () => {
    const { manager } = createManager();
    expect(manager.establish().code).toBe("HANDSHAKE_REQUIRED");
    manager.connect();
    expect(manager.establish().code).toBe("HANDSHAKE_REQUIRED");
    manager.requireConsent();
    expect(manager.establish().code).toBe("SESSION_ESTABLISHED");
  });

  it("accepts an authenticated in-scope frame and advances sequence", async () => {
    const { manager } = establishedManager();
    const result = await manager.receive(frame(1, "action-request", { action: "read-posture" }));
    expect(result.code).toBe("FRAME_ACCEPTED");
    expect(manager.state).toBe("established");
  });

  it("rejects frames before session establishment", async () => {
    const { manager } = createManager();
    const result = await manager.receive(frame(1));
    expect(result.code).toBe("HANDSHAKE_REQUIRED");
  });

  it("blocks a session-id mismatch", async () => {
    const { manager } = establishedManager();
    const result = await manager.receive({ ...frame(1), sessionId: "other-session" });
    expect(result.code).toBe("FRAME_REJECTED");
    expect(manager.state).toBe("blocked");
  });

  it("blocks replayed or out-of-order sequence numbers and nonces", async () => {
    const { manager } = establishedManager();
    await manager.receive(frame(1));
    const replay = await manager.receive(frame(1));
    expect(replay.code).toBe("REPLAY_DETECTED");
    expect(manager.state).toBe("blocked");
  });

  it("blocks an action outside the session allow-list", async () => {
    const { manager } = establishedManager();
    const result = await manager.receive(frame(1, "action-request", { action: "install-package" }));
    expect(result.code).toBe("ACTION_NOT_ALLOWED");
    expect(manager.state).toBe("blocked");
  });

  it("blocks unauthenticated frames", async () => {
    const authenticator = { verify: vi.fn(async () => false) };
    const { manager } = establishedManager({ authenticator });
    const result = await manager.receive(frame(1));
    expect(result.code).toBe("FRAME_REJECTED");
    expect(authenticator.verify).toHaveBeenCalledOnce();
  });

  it("blocks frames outside the clock-skew window", async () => {
    const { manager } = establishedManager();
    const result = await manager.receive({ ...frame(1), sentAt: "2026-10-20T18:00:00.000Z" });
    expect(result.code).toBe("CLOCK_SKEW");
    expect(manager.state).toBe("blocked");
  });

  it("closes when consent is revoked by the peer", async () => {
    const { manager } = establishedManager();
    const result = await manager.receive(frame(1, "consent", { granted: false }));
    expect(result.code).toBe("CONSENT_REVOKED");
    expect(manager.state).toBe("closing");
  });

  it("closes on heartbeat timeout and requires a new session after disconnect", async () => {
    const { manager } = establishedManager();
    now.value = "2026-10-20T19:00:31.000Z";
    expect(manager.tick()?.code).toBe("HEARTBEAT_TIMEOUT");
    expect(manager.disconnect().state).toBe("closed");
    expect((await manager.receive(frame(1))).code).toBe("HANDSHAKE_REQUIRED");
  });

  it("rejects oversized frames", async () => {
    const { manager } = establishedManager({
      policy: { allowedActions: ["read-posture"], maxFrameBytes: 100, heartbeatTimeoutMs: 30_000, clockSkewMs: 120_000 },
    });
    const result = await manager.receive(frame(1, "heartbeat", { padding: "x".repeat(500) }));
    expect(result.code).toBe("FRAME_TOO_LARGE");
    expect(manager.state).toBe("blocked");
  });
});
