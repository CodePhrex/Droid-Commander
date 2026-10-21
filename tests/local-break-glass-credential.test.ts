import { describe, expect, it } from "vitest";

import { canonicalClaims, LocalBreakGlassCredentialValidator, LocalBreakGlassLedger } from "../lib/local-break-glass-credential";

function makeCredential(overrides: Record<string, unknown> = {}) {
  const base = {
    credentialId: "bg-local-001",
    operatorId: "operator-001",
    organizationId: "org-001",
    issuerId: "issuer-001",
    credentialType: "break-glass-admin" as const,
    validFrom: "2026-10-20T20:00:00.000Z",
    validUntil: "2026-10-20T20:10:00.000Z",
    allowedCapabilities: ["inspect-auth-state"] as const,
    targetIds: ["target-001"] as const,
    trustKeyId: "key-001",
    signedPayload: "",
    signature: "valid-signature",
    ...overrides,
  };
  return { ...base, signedPayload: canonicalClaims(base) };
}

function validator(options: { verify?: boolean; ledger?: LocalBreakGlassLedger; maxLifetimeMs?: number } = {}) {
  return new LocalBreakGlassCredentialValidator({
    trustedIssuers: [{ issuerId: "issuer-001", keyId: "key-001", validUntil: "2027-01-01T00:00:00.000Z" }],
    signatureVerifier: { verify: async () => options.verify ?? true },
    ledger: options.ledger,
    maxLifetimeMs: options.maxLifetimeMs,
  });
}

function request(credential = makeCredential()) {
  return { credential, organizationId: "org-001", capability: "inspect-auth-state" as const, targetId: "target-001", now: "2026-10-20T20:05:00.000Z", accountEnabled: true };
}

describe("local break-glass credential validator", () => {
  it("allows a valid signed, target-bound credential within its window", async () => {
    await expect(validator().validate(request())).resolves.toMatchObject({ decision: "allow", credentialId: "bg-local-001", expiresAt: "2026-10-20T20:10:00.000Z" });
  });

  it("requires a credential", async () => {
    await expect(validator().validate({ ...request(), credential: undefined })).resolves.toMatchObject({ decision: "deny", findings: [{ code: "CREDENTIAL_REQUIRED" }] });
  });

  it("rejects presented fields that do not match signed claims", async () => {
    const credential = { ...makeCredential(), operatorId: "tampered-operator" };
    await expect(validator().validate(request(credential))).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "CREDENTIAL_MALFORMED" })]) });
  });

  it("rejects an invalid signature", async () => {
    await expect(validator({ verify: false }).validate(request())).resolves.toMatchObject({ decision: "deny", findings: [{ code: "SIGNATURE_INVALID" }] });
  });

  it("fails closed when the local verifier throws", async () => {
    const local = new LocalBreakGlassCredentialValidator({ trustedIssuers: [{ issuerId: "issuer-001", keyId: "key-001", validUntil: "2027-01-01T00:00:00.000Z" }], signatureVerifier: { verify: async () => { throw new Error("keystore unavailable"); } } });
    await expect(local.validate(request())).resolves.toMatchObject({ decision: "deny", findings: [{ code: "VERIFICATION_UNAVAILABLE" }] });
  });

  it("enforces not-yet-valid and expired windows", async () => {
    await expect(validator().validate({ ...request(), now: "2026-10-20T19:59:59.000Z" })).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "NOT_YET_VALID" })]) });
    await expect(validator().validate({ ...request(), now: "2026-10-20T20:10:00.000Z" })).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "EXPIRED" })]) });
  });

  it("rejects malformed clocks and validity windows", async () => {
    await expect(validator().validate({ ...request(), now: "not-a-date" })).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "CLOCK_INVALID" })]) });
    const malformed = makeCredential({ validFrom: "2026-10-20T20:10:00.000Z", validUntil: "2026-10-20T20:00:00.000Z" });
    await expect(validator().validate(request(malformed))).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "CREDENTIAL_MALFORMED" })]) });
  });

  it("enforces the maximum credential lifetime", async () => {
    const long = makeCredential({ validUntil: "2026-10-20T21:00:00.000Z" });
    await expect(validator({ maxLifetimeMs: 15 * 60 * 1000 }).validate(request(long))).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "LIFETIME_TOO_LONG" })]) });
  });

  it("rejects untrusted or expired issuers", async () => {
    const untrusted = makeCredential({ issuerId: "other-issuer", trustKeyId: "other-key" });
    await expect(validator().validate(request(untrusted))).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "ISSUER_UNTRUSTED" })]) });
    const expiredAnchor = new LocalBreakGlassCredentialValidator({ trustedIssuers: [{ issuerId: "issuer-001", keyId: "key-001", validUntil: "2026-10-20T20:04:00.000Z" }], signatureVerifier: { verify: async () => true } });
    await expect(expiredAnchor.validate(request())).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "ISSUER_EXPIRED" })]) });
  });

  it("enforces organization, target, and capability binding", async () => {
    await expect(validator().validate({ ...request(), organizationId: "other-org" })).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "ORGANIZATION_MISMATCH" })]) });
    await expect(validator().validate({ ...request(), targetId: "other-target" })).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "TARGET_MISMATCH" })]) });
    await expect(validator().validate({ ...request(), targetId: undefined })).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "TARGET_REQUIRED" })]) });
    await expect(validator().validate({ ...request(), capability: "export-audit" })).resolves.toMatchObject({ decision: "deny", findings: expect.arrayContaining([expect.objectContaining({ code: "CAPABILITY_NOT_ALLOWED" })]) });
  });

  it("rejects disabled local activation", async () => {
    await expect(validator().validate({ ...request(), accountEnabled: false })).resolves.toMatchObject({ decision: "deny", findings: [{ code: "ACCOUNT_DISABLED" }] });
  });

  it("supports local revocation and ledger persistence", async () => {
    const ledger = new LocalBreakGlassLedger();
    ledger.revoke("bg-local-001");
    await expect(validator({ ledger }).validate(request())).resolves.toMatchObject({ decision: "deny", findings: [{ code: "REVOKED" }] });
    const restored = new LocalBreakGlassLedger(ledger.snapshot());
    expect(restored.isRevoked("bg-local-001")).toBe(true);
  });

  it("consumes a valid credential once and rejects replay", async () => {
    const local = validator();
    await expect(local.validateAndConsume(request())).resolves.toMatchObject({ decision: "allow" });
    await expect(local.validate(request())).resolves.toMatchObject({ decision: "deny", findings: [{ code: "ALREADY_CONSUMED" }] });
  });

  it("does not consume a credential after failed validation", async () => {
    const local = validator({ verify: false });
    await local.validateAndConsume(request());
    expect(local.localLedger.isConsumed("bg-local-001")).toBe(false);
  });
});
