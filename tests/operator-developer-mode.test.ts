import { describe, expect, it } from "vitest";

import { activateOperatorDeveloperMode, isOperatorDeveloperSessionActive, requireDeveloperCapability } from "../lib/operator-developer-mode";

const request = {
  operatorId: "operator-001",
  organizationId: "org-001",
  sessionId: "session-001",
  reason: "Collect diagnostics for approved device analysis",
  now: "2026-10-20T21:00:00.000Z",
  requestedMinutes: 30,
  operatorAuthorized: true,
  capabilities: ["collect-diagnostics", "view-boot-state"] as const,
};

describe("operator developer mode", () => {
  it("activates a bounded diagnostic session", () => {
    const session = activateOperatorDeveloperMode(request);
    expect(session).toMatchObject({ decision: "allow", expiresAt: "2026-10-20T21:30:00.000Z", auditOnly: true, systemSecuritySettingsUnchanged: true });
    expect(isOperatorDeveloperSessionActive(session, "2026-10-20T21:15:00.000Z")).toBe(true);
  });

  it("requires an authorized operator, session, and specific reason", () => {
    const session = activateOperatorDeveloperMode({ ...request, operatorAuthorized: false, sessionId: "", reason: "debug" });
    expect(session.decision).toBe("deny");
    expect(session.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["OPERATOR_REQUIRED", "SESSION_REQUIRED", "REASON_REQUIRED"]));
  });

  it("bounds duration and rejects unknown capabilities", () => {
    const session = activateOperatorDeveloperMode({ ...request, requestedMinutes: 61, capabilities: ["collect-diagnostics", "enable-usb-debugging"] as never });
    expect(session.decision).toBe("deny");
    expect(session.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["DURATION_INVALID", "CAPABILITY_NOT_ALLOWED"]));
  });

  it("expires automatically and cannot authorize a missing capability", () => {
    const session = activateOperatorDeveloperMode(request);
    expect(isOperatorDeveloperSessionActive(session, "2026-10-20T21:31:00.000Z")).toBe(false);
    expect(() => requireDeveloperCapability(session, "view-usb-debug-status", "2026-10-20T21:15:00.000Z")).toThrow("not granted");
  });

  it("allows only granted diagnostic capabilities while active", () => {
    const session = activateOperatorDeveloperMode(request);
    expect(() => requireDeveloperCapability(session, "collect-diagnostics", "2026-10-20T21:15:00.000Z")).not.toThrow();
    expect(() => requireDeveloperCapability(session, "view-boot-state", "2026-10-20T21:31:00.000Z")).toThrow("expired");
  });

  it("never grants settings mutation, arbitrary shell, OEM unlock, or flashing capabilities", () => {
    const session = activateOperatorDeveloperMode({ ...request, capabilities: ["enable-oem-unlock", "run-shell", "flash-recovery"] as never });
    expect(session.decision).toBe("deny");
    expect(session.systemSecuritySettingsUnchanged).toBe(true);
  });
});
