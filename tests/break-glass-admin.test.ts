import { describe, expect, it } from "vitest";

import { BreakGlassAdminGuard, type BreakGlassAuditEvent, type BreakGlassCredential, type BreakGlassRequest } from "../lib/break-glass-admin";

const now = "2026-10-20T20:00:00.000Z";
const credential: BreakGlassCredential = {
  credentialId: "bg-001",
  operatorId: "operator-7",
  organizationId: "lab-org",
  issuerId: "lab-issuer",
  credentialType: "break-glass-admin",
  validFrom: "2026-10-20T19:00:00.000Z",
  validUntil: "2026-10-20T21:00:00.000Z",
  allowedCapabilities: ["inspect-auth-state", "retry-auth-confirmation", "refresh-provider-status", "export-audit", "close-session"],
  trustKeyId: "key-1",
  signedPayload: "signed-recovery-payload",
  signature: "signed-recovery-signature",
};

function request(overrides: Partial<BreakGlassRequest> = {}): BreakGlassRequest {
  return {
    credential,
    organizationId: "lab-org",
    capability: "inspect-auth-state",
    reason: "Vendor authentication confirmation failed during approved lab recovery.",
    ticketId: "INC-2048",
    now,
    accountEnabled: true,
    targetId: "lab-handset-a",
    targetConsent: "confirmed",
    vendorAuthState: "failed",
    deviceAuthState: "confirmed",
    ...overrides,
  };
}

function guard(audit: BreakGlassAuditEvent[] = [], verify: (signature: string) => Promise<boolean> = async () => true) {
  return new BreakGlassAdminGuard({
    trustedIssuers: [{ issuerId: "lab-issuer", keyId: "key-1", validUntil: "2026-12-31T00:00:00.000Z" }],
    signatureVerifier: { verify: async ({ signature }) => verify(signature) },
    auditSink: { record: (event) => audit.push(event) },
  });
}

describe("break-glass administrator guard", () => {
  it("allows only a signed, scoped recovery capability and preserves target authorization", async () => {
    const audit: BreakGlassAuditEvent[] = [];
    const result = await guard(audit).activate(request({ capability: "inspect-auth-state" }));
    expect(result.decision).toBe("allow");
    expect(result.evidence.targetAuthorizationUnchanged).toBe(true);
    expect(audit[0]).toMatchObject({ event: "break-glass-activated", decision: "allow", credentialId: "bg-001", targetId: "lab-handset-a" });
  });

  it("does not contain or accept a built-in password path", async () => {
    const result = await guard().activate(request({ credential: undefined }));
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("BREAK_GLASS_CREDENTIAL_REQUIRED");
  });

  it("denies a disabled account, expired credential, wrong organization, or untrusted issuer", async () => {
    const disabled = await guard().activate(request({ accountEnabled: false }));
    expect(disabled.findings.map((item) => item.code)).toContain("BREAK_GLASS_ACCOUNT_DISABLED");
    const expired = await guard().activate(request({ now: "2026-10-20T22:00:00.000Z" }));
    expect(expired.findings.map((item) => item.code)).toContain("BREAK_GLASS_EXPIRED");
    const wrongOrg = await guard().activate(request({ organizationId: "other-org" }));
    expect(wrongOrg.findings.map((item) => item.code)).toContain("BREAK_GLASS_ORGANIZATION_MISMATCH");
    const untrusted = await guard().activate(request({ credential: { ...credential, trustKeyId: "unknown-key" } }));
    expect(untrusted.findings.map((item) => item.code)).toContain("BREAK_GLASS_ISSUER_UNTRUSTED");
    const wrongType = await guard().activate(request({ credential: { ...credential, credentialType: "personnel" as "break-glass-admin" } }));
    expect(wrongType.findings.map((item) => item.code)).toContain("BREAK_GLASS_CREDENTIAL_TYPE_INVALID");
  });

  it("fails closed on invalid signatures and verifier outages", async () => {
    const invalid = await guard([], async () => false).activate(request());
    expect(invalid.findings.map((item) => item.code)).toContain("BREAK_GLASS_SIGNATURE_INVALID");
    const unavailable = await guard([], async () => { throw new Error("keystore unavailable"); }).activate(request());
    expect(unavailable.findings.map((item) => item.code)).toContain("BREAK_GLASS_VERIFICATION_UNAVAILABLE");
  });

  it("requires a specific reason and incident ticket", async () => {
    const result = await guard().activate(request({ reason: "fix", ticketId: "" }));
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toEqual(expect.arrayContaining(["BREAK_GLASS_REASON_REQUIRED", "BREAK_GLASS_TICKET_REQUIRED"]));
  });

  it("cannot override missing target consent or authorize an active command", async () => {
    const noConsent = await guard().activate(request({ capability: "retry-auth-confirmation", targetConsent: "missing" }));
    expect(noConsent.findings.map((item) => item.code)).toContain("BREAK_GLASS_TARGET_CONSENT_REQUIRED");
    expect(noConsent.findings.map((item) => item.code)).toContain("BREAK_GLASS_ACTIVE_ACTION_BLOCKED");
    const unsupported = await guard().activate(request({ capability: "send-command" as never }));
    expect(unsupported.findings.map((item) => item.code)).toContain("BREAK_GLASS_CAPABILITY_NOT_ALLOWED");
  });

  it("requires an actual vendor or device authentication issue", async () => {
    const result = await guard().activate(request({ vendorAuthState: "confirmed", deviceAuthState: "confirmed" }));
    expect(result.findings.map((item) => item.code)).toContain("BREAK_GLASS_AUTH_ISSUE_REQUIRED");
  });

  it("rate-limits repeated failed activation attempts and records each attempt", async () => {
    const audit: BreakGlassAuditEvent[] = [];
    const admin = guard(audit, async () => false);
    const bad = request({ credential: { ...credential, signature: "bad" } });
    await admin.activate(bad);
    await admin.activate(bad);
    const third = await admin.activate(bad);
    const fourth = await admin.activate(request());
    expect(third.decision).toBe("deny");
    expect(fourth.findings.map((item) => item.code)).toContain("BREAK_GLASS_RATE_LIMITED");
    expect(audit).toHaveLength(4);
    expect(audit.every((event) => event.event === "break-glass-attempt")).toBe(true);
  });
});
