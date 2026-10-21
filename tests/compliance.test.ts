import { describe, expect, it } from "vitest";

import { validateCompliance, type AuthorizationRecord, type ComplianceRequest } from "../lib/compliance";

const baseAuthorization: AuthorizationRecord = {
  id: "auth-001",
  targetId: "lab-handset-a",
  scope: "Patch posture lesson",
  authorizedBy: "Training ticket SEC-42",
  purpose: "Authorized classroom exercise",
  consentAt: "2026-10-20T16:00:00.000Z",
  expiresAt: "2026-10-21T16:00:00.000Z",
  allowedActions: ["read-posture"],
};

const baseRequest: ComplianceRequest = {
  now: "2026-10-20T18:00:00.000Z",
  action: "read-posture",
  targetId: "lab-handset-a",
  authorization: baseAuthorization,
  observation: { source: "local", available: true, confidence: "high" },
  auditContext: { sessionId: "session-001", timestamp: "2026-10-20T18:00:00.000Z" },
};

describe("authorized security-policy analysis compliance", () => {
  it("allows an in-scope, consented, auditable read-only assessment", () => {
    const result = validateCompliance(baseRequest);
    expect(result.decision).toBe("allow");
    expect(result.findings).toHaveLength(0);
  });

  it("blocks a request with no authorization record", () => {
    const result = validateCompliance({ ...baseRequest, authorization: undefined });
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("AUTHORIZATION_REQUIRED");
  });

  it("blocks missing scope, approving authority, purpose, and consent", () => {
    const authorization = {
      ...baseAuthorization,
      targetId: "",
      scope: "",
      authorizedBy: "",
      purpose: "",
      consentAt: "",
    };
    const result = validateCompliance({ ...baseRequest, authorization });
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["SCOPE_REQUIRED", "AUTHORITY_REQUIRED", "CONSENT_REQUIRED"]),
    );
  });

  it("blocks expired authorization", () => {
    const result = validateCompliance({
      ...baseRequest,
      now: "2026-10-22T18:00:00.000Z",
    });
    expect(result.findings.map((item) => item.code)).toContain("AUTHORIZATION_EXPIRED");
    expect(result.decision).toBe("deny");
  });

  it("blocks a target mismatch and an action outside the allow-list", () => {
    const result = validateCompliance({
      ...baseRequest,
      targetId: "other-handset",
      action: "change-policy",
    });
    expect(result.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["TARGET_MISMATCH", "ACTION_NOT_ALLOWED"]),
    );
  });

  it("does not convert an unavailable signal into a passing assessment", () => {
    const result = validateCompliance({
      ...baseRequest,
      observation: {
        source: "local",
        available: false,
        confidence: "low",
        limitation: "Device-owner access is unavailable on this test handset.",
      },
    });
    expect(result.decision).toBe("review");
    expect(result.findings.map((item) => item.code)).toContain("OBSERVATION_UNAVAILABLE");
  });

  it("blocks a standard-app claim to inspect another app's private data", () => {
    const result = validateCompliance({
      ...baseRequest,
      action: "inspect-other-app-private-data",
    });
    expect(result.findings.map((item) => item.code)).toContain("SANDBOX_BOUNDARY");
    expect(result.decision).toBe("deny");
  });

  it("blocks exploit payloads and arbitrary execution in training mode", () => {
    const result = validateCompliance({ ...baseRequest, containsExploitPayload: true });
    expect(result.findings.map((item) => item.code)).toContain("PAYLOADS_PROHIBITED");
    expect(result.decision).toBe("deny");
  });

  it("requires an audit session and timestamp", () => {
    const result = validateCompliance({ ...baseRequest, auditContext: undefined });
    expect(result.findings.map((item) => item.code)).toContain("AUDIT_CONTEXT_REQUIRED");
    expect(result.decision).toBe("deny");
  });

  it("reviews manufacturer update actions instead of treating them as app remediation", () => {
    const result = validateCompliance({ ...baseRequest, isSystemUpdateAction: true });
    expect(result.decision).toBe("review");
    expect(result.findings.map((item) => item.code)).toContain("SYSTEM_UPDATE_BOUNDARY");
  });
});

describe("USB and ADB consent gates", () => {
  const usbBase = {
    ...baseRequest,
    action: "usb-training-action",
    authorization: { ...baseAuthorization, allowedActions: ["usb-training-action"] },
  } satisfies ComplianceRequest;

  it("reviews a disconnected target without attempting a transport action", () => {
    const result = validateCompliance({
      ...usbBase,
      transport: {
        connected: false,
        usbHostSupported: true,
        usbPermissionGranted: false,
        cooperativeProtocol: false,
        adbAuthorized: false,
      },
    });
    expect(result.decision).toBe("review");
    expect(result.findings.map((item) => item.code)).toContain("USB_PERMISSION_REQUIRED");
  });

  it("blocks when the controller lacks USB host capability", () => {
    const result = validateCompliance({
      ...usbBase,
      transport: {
        connected: true,
        usbHostSupported: false,
        usbPermissionGranted: true,
        cooperativeProtocol: true,
        adbAuthorized: false,
      },
    });
    expect(result.findings.map((item) => item.code)).toContain("USB_HOST_REQUIRED");
    expect(result.decision).toBe("deny");
  });

  it("blocks a USB session without target permission or cooperative protocol", () => {
    const result = validateCompliance({
      ...usbBase,
      transport: {
        connected: true,
        usbHostSupported: true,
        usbPermissionGranted: false,
        cooperativeProtocol: false,
        adbAuthorized: false,
      },
    });
    expect(result.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["USB_PERMISSION_REQUIRED", "USB_PROTOCOL_REQUIRED"]),
    );
  });

  it("requires separate owner-approved ADB authorization", () => {
    const result = validateCompliance({
      ...usbBase,
      action: "adb-training-action",
      authorization: { ...baseAuthorization, allowedActions: ["adb-training-action"] },
      transport: {
        connected: true,
        usbHostSupported: true,
        usbPermissionGranted: true,
        cooperativeProtocol: true,
        adbAuthorized: false,
      },
    });
    expect(result.findings.map((item) => item.code)).toContain("ADB_AUTHORIZATION_REQUIRED");
    expect(result.decision).toBe("deny");
  });

  it("allows a fully consented cooperative USB action", () => {
    const result = validateCompliance({
      ...usbBase,
      transport: {
        connected: true,
        usbHostSupported: true,
        usbPermissionGranted: true,
        cooperativeProtocol: true,
        adbAuthorized: false,
      },
    });
    expect(result.decision).toBe("allow");
  });
});
