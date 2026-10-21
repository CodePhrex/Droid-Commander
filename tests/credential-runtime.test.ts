import { describe, expect, it, vi } from "vitest";

import {
  CredentialRuntime,
  type CredentialRuntimeDependencies,
  type SignedCredential,
} from "../lib/credential-runtime";

const credential: SignedCredential = {
  credentialId: "cred-001",
  operatorId: "operator-007",
  organizationId: "org-lab",
  issuerId: "issuer-training",
  credentialType: "mobile-security-instructor",
  validFrom: "2026-10-01T00:00:00.000Z",
  validUntil: "2026-12-01T00:00:00.000Z",
  allowedActions: ["read-posture"],
  revocationSnapshotId: "rev-001",
  trustKeyId: "key-001",
  signedPayload: "canonical-credential-payload",
  signature: "signature-by-test-issuer",
};

const baseDependencies: CredentialRuntimeDependencies = {
  trustAnchors: [
    { issuerId: "issuer-training", keyId: "key-001", validUntil: "2026-12-15T00:00:00.000Z" },
  ],
  revocationSnapshots: [
    {
      snapshotId: "rev-001",
      fetchedAt: "2026-10-20T12:00:00.000Z",
      validUntil: "2026-10-25T00:00:00.000Z",
      revokedCredentialIds: [],
      suspendedCredentialIds: [],
    },
  ],
  signatureVerifier: { verify: vi.fn(async () => true) },
};

const request = {
  credential,
  organizationId: "org-lab",
  requestedAction: "read-posture",
  now: "2026-10-20T18:00:00.000Z",
  online: false,
};

describe("credential runtime validation", () => {
  it("allows a signed credential with a fresh offline revocation snapshot", async () => {
    const result = await new CredentialRuntime(baseDependencies).verify(request);
    expect(result.decision).toBe("allow");
    expect(result.mode).toBe("offline-cache");
    expect(result.evidence.credentialId).toBe("cred-001");
  });

  it("denies missing credentials", async () => {
    const result = await new CredentialRuntime(baseDependencies).verify({ ...request, credential: undefined });
    expect(result.decision).toBe("deny");
    expect(result.findings[0]?.code).toBe("CREDENTIAL_REQUIRED");
  });

  it("denies a credential signed by an untrusted issuer or key", async () => {
    const result = await new CredentialRuntime(baseDependencies).verify({
      ...request,
      credential: { ...credential, trustKeyId: "unknown-key" },
    });
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("CREDENTIAL_ISSUER_UNTRUSTED");
  });

  it("denies an invalid signature", async () => {
    const dependencies = {
      ...baseDependencies,
      signatureVerifier: { verify: vi.fn(async () => false) },
    };
    const result = await new CredentialRuntime(dependencies).verify(request);
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("CREDENTIAL_SIGNATURE_INVALID");
  });

  it("denies expired and not-yet-valid credentials", async () => {
    const expiredResult = await new CredentialRuntime(baseDependencies).verify({
      ...request,
      now: "2027-01-01T00:00:00.000Z",
    });
    const futureResult = await new CredentialRuntime(baseDependencies).verify({
      ...request,
      now: "2026-09-01T00:00:00.000Z",
    });
    expect(expiredResult.findings.map((item) => item.code)).toContain("CREDENTIAL_EXPIRED");
    expect(futureResult.findings.map((item) => item.code)).toContain("CREDENTIAL_NOT_YET_VALID");
  });

  it("denies organization mismatch and action outside credential scope", async () => {
    const result = await new CredentialRuntime(baseDependencies).verify({
      ...request,
      organizationId: "other-org",
      requestedAction: "change-policy",
    });
    expect(result.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["CREDENTIAL_ORGANIZATION_MISMATCH", "CREDENTIAL_ACTION_NOT_ALLOWED"]),
    );
  });

  it("denies revoked and suspended credentials from the cached snapshot", async () => {
    const revoked = await new CredentialRuntime({
      ...baseDependencies,
      revocationSnapshots: [{ ...baseDependencies.revocationSnapshots[0]!, revokedCredentialIds: ["cred-001"] }],
    }).verify(request);
    const suspended = await new CredentialRuntime({
      ...baseDependencies,
      revocationSnapshots: [{ ...baseDependencies.revocationSnapshots[0]!, suspendedCredentialIds: ["cred-001"] }],
    }).verify(request);
    expect(revoked.findings.map((item) => item.code)).toContain("CREDENTIAL_REVOKED");
    expect(suspended.findings.map((item) => item.code)).toContain("CREDENTIAL_SUSPENDED");
  });

  it("denies offline use when the cached revocation snapshot is stale or absent", async () => {
    const result = await new CredentialRuntime({ ...baseDependencies, revocationSnapshots: [] }).verify(request);
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("REVOCATION_STATUS_UNAVAILABLE");
  });

  it("uses the organization provider online and records provider evidence", async () => {
    const provider = {
      verifyCredential: vi.fn(async () => ({
        status: "valid" as const,
        checkedAt: "2026-10-20T18:00:00.000Z",
        source: "organization-provider" as const,
        reference: "provider-check-99",
      })),
    };
    const result = await new CredentialRuntime({ ...baseDependencies, provider }).verify({ ...request, online: true });
    expect(result.decision).toBe("allow");
    expect(provider.verifyCredential).toHaveBeenCalledWith({
      credentialId: "cred-001",
      organizationId: "org-lab",
      issuerId: "issuer-training",
    });
    expect(result.evidence.providerReference).toBe("provider-check-99");
    expect(result.mode).toBe("online");
  });

  it("denies provider-reported revocation online", async () => {
    const provider = {
      verifyCredential: vi.fn(async () => ({
        status: "revoked" as const,
        checkedAt: "2026-10-20T18:00:00.000Z",
        source: "organization-provider" as const,
      })),
    };
    const result = await new CredentialRuntime({ ...baseDependencies, provider }).verify({ ...request, online: true });
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("CREDENTIAL_REVOKED");
  });

  it("falls back to a fresh offline snapshot when the provider is unavailable", async () => {
    const provider = {
      verifyCredential: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    };
    const result = await new CredentialRuntime({ ...baseDependencies, provider }).verify({ ...request, online: true });
    expect(result.decision).toBe("allow");
    expect(result.mode).toBe("offline-cache");
  });

  it("denies provider outage when no fresh offline snapshot exists", async () => {
    const provider = {
      verifyCredential: vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    };
    const result = await new CredentialRuntime({ ...baseDependencies, provider, revocationSnapshots: [] }).verify({
      ...request,
      online: true,
    });
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("PROVIDER_UNAVAILABLE");
  });

  it("denies an expired trust anchor even when the credential itself is current", async () => {
    const result = await new CredentialRuntime({
      ...baseDependencies,
      trustAnchors: [{ issuerId: "issuer-training", keyId: "key-001", validUntil: "2026-10-01T00:00:00.000Z" }],
    }).verify(request);
    expect(result.decision).toBe("deny");
    expect(result.findings.map((item) => item.code)).toContain("TRUST_BUNDLE_EXPIRED");
  });
});
