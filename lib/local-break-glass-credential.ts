import type { BreakGlassCapability, BreakGlassSignatureVerifier } from "./break-glass-admin";

export type LocalBreakGlassCredential = {
  credentialId: string;
  operatorId: string;
  organizationId: string;
  issuerId: string;
  credentialType: "break-glass-admin";
  validFrom: string;
  validUntil: string;
  allowedCapabilities: readonly BreakGlassCapability[];
  targetIds?: readonly string[];
  trustKeyId: string;
  signedPayload: string;
  signature: string;
};

export type LocalBreakGlassRequest = {
  credential?: LocalBreakGlassCredential;
  organizationId: string;
  capability: BreakGlassCapability;
  targetId?: string;
  now: string;
  accountEnabled: boolean;
};

export type LocalBreakGlassCode =
  | "CREDENTIAL_REQUIRED"
  | "CREDENTIAL_MALFORMED"
  | "CREDENTIAL_TYPE_INVALID"
  | "ISSUER_UNTRUSTED"
  | "ISSUER_EXPIRED"
  | "SIGNATURE_INVALID"
  | "VERIFICATION_UNAVAILABLE"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "LIFETIME_TOO_LONG"
  | "ORGANIZATION_MISMATCH"
  | "TARGET_REQUIRED"
  | "TARGET_MISMATCH"
  | "CAPABILITY_NOT_ALLOWED"
  | "ACCOUNT_DISABLED"
  | "REVOKED"
  | "ALREADY_CONSUMED"
  | "CLOCK_INVALID";

export type LocalBreakGlassFinding = { code: LocalBreakGlassCode; message: string };
export type LocalBreakGlassResult = {
  decision: "allow" | "deny";
  findings: LocalBreakGlassFinding[];
  credentialId?: string;
  expiresAt?: string;
};

export type LocalBreakGlassLedgerSnapshot = {
  revokedCredentialIds: string[];
  consumedCredentialIds: string[];
};

export class LocalBreakGlassLedger {
  private readonly revoked = new Set<string>();
  private readonly consumed = new Set<string>();

  constructor(snapshot?: LocalBreakGlassLedgerSnapshot) {
    snapshot?.revokedCredentialIds.forEach((id) => this.revoked.add(id));
    snapshot?.consumedCredentialIds.forEach((id) => this.consumed.add(id));
  }

  revoke(credentialId: string) { this.revoked.add(credentialId); }
  isRevoked(credentialId: string) { return this.revoked.has(credentialId); }
  isConsumed(credentialId: string) { return this.consumed.has(credentialId); }
  consume(credentialId: string) { this.consumed.add(credentialId); }
  snapshot(): LocalBreakGlassLedgerSnapshot { return { revokedCredentialIds: [...this.revoked].sort(), consumedCredentialIds: [...this.consumed].sort() }; }
}

export type LocalBreakGlassValidatorDependencies = {
  trustedIssuers: Array<{ issuerId: string; keyId: string; validUntil: string }>;
  signatureVerifier: BreakGlassSignatureVerifier;
  ledger?: LocalBreakGlassLedger;
  maxLifetimeMs?: number;
};

const allowedCapabilities = new Set<BreakGlassCapability>([
  "inspect-auth-state",
  "retry-auth-confirmation",
  "refresh-provider-status",
  "export-audit",
  "close-session",
]);

function parseTime(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalClaims(credential: LocalBreakGlassCredential) {
  return JSON.stringify({
    credentialId: credential.credentialId,
    operatorId: credential.operatorId,
    organizationId: credential.organizationId,
    issuerId: credential.issuerId,
    credentialType: credential.credentialType,
    validFrom: credential.validFrom,
    validUntil: credential.validUntil,
    allowedCapabilities: [...credential.allowedCapabilities].sort(),
    targetIds: [...(credential.targetIds ?? [])].sort(),
    trustKeyId: credential.trustKeyId,
  });
}

function hasText(value: unknown) { return typeof value === "string" && value.trim().length > 0; }

export class LocalBreakGlassCredentialValidator {
  private readonly ledger: LocalBreakGlassLedger;
  private readonly maxLifetimeMs: number;

  constructor(private readonly dependencies: LocalBreakGlassValidatorDependencies) {
    this.ledger = dependencies.ledger ?? new LocalBreakGlassLedger();
    this.maxLifetimeMs = dependencies.maxLifetimeMs ?? 15 * 60 * 1000;
  }

  get localLedger() { return this.ledger; }

  async validate(request: LocalBreakGlassRequest): Promise<LocalBreakGlassResult> {
    const credential = request.credential;
    const findings: LocalBreakGlassFinding[] = [];
    const nowMs = parseTime(request.now);
    if (nowMs === null) findings.push({ code: "CLOCK_INVALID", message: "The local validation clock value is not a valid timestamp." });
    if (!request.accountEnabled) findings.push({ code: "ACCOUNT_DISABLED", message: "The local break-glass account is disabled." });
    if (!credential) {
      findings.push({ code: "CREDENTIAL_REQUIRED", message: "An organization-signed local break-glass credential is required." });
      return this.result(request, findings);
    }

    const requiredText = [credential.credentialId, credential.operatorId, credential.organizationId, credential.issuerId, credential.validFrom, credential.validUntil, credential.trustKeyId, credential.signedPayload, credential.signature];
    if (requiredText.some((value) => !hasText(value)) || !Array.isArray(credential.allowedCapabilities)) findings.push({ code: "CREDENTIAL_MALFORMED", message: "The credential is missing a required signed field." });
    if (credential.credentialType !== "break-glass-admin") findings.push({ code: "CREDENTIAL_TYPE_INVALID", message: "The credential type is not break-glass-admin." });
    if (this.ledger.isRevoked(credential.credentialId)) findings.push({ code: "REVOKED", message: "The credential is locally revoked." });
    if (this.ledger.isConsumed(credential.credentialId)) findings.push({ code: "ALREADY_CONSUMED", message: "The one-time break-glass credential has already been consumed." });
    if (credential.organizationId !== request.organizationId) findings.push({ code: "ORGANIZATION_MISMATCH", message: "The credential belongs to a different organization." });
    if (!allowedCapabilities.has(request.capability) || !credential.allowedCapabilities.includes(request.capability)) findings.push({ code: "CAPABILITY_NOT_ALLOWED", message: "The requested capability is not in the fixed local allow-list." });

    const fromMs = parseTime(credential.validFrom);
    const untilMs = parseTime(credential.validUntil);
    if (fromMs === null || untilMs === null || untilMs <= fromMs) findings.push({ code: "CREDENTIAL_MALFORMED", message: "The credential validity window is malformed." });
    if (fromMs !== null && untilMs !== null && untilMs - fromMs > this.maxLifetimeMs) findings.push({ code: "LIFETIME_TOO_LONG", message: "The credential validity window exceeds the local maximum." });
    if (nowMs !== null && fromMs !== null && nowMs < fromMs) findings.push({ code: "NOT_YET_VALID", message: "The credential is not yet valid." });
    if (nowMs !== null && untilMs !== null && nowMs >= untilMs) findings.push({ code: "EXPIRED", message: "The credential has expired." });

    const targetIds = credential.targetIds ?? [];
    if (targetIds.length > 0 && !request.targetId) findings.push({ code: "TARGET_REQUIRED", message: "This credential is target-bound and requires an exact target ID." });
    if (targetIds.length > 0 && request.targetId && !targetIds.includes(request.targetId)) findings.push({ code: "TARGET_MISMATCH", message: "The target is outside the credential’s signed target binding." });

    const anchor = this.dependencies.trustedIssuers.find((candidate) => candidate.issuerId === credential.issuerId && candidate.keyId === credential.trustKeyId);
    if (!anchor) findings.push({ code: "ISSUER_UNTRUSTED", message: "The issuer or trust key is not in the local trust set." });
    else if (nowMs !== null && parseTime(anchor.validUntil) !== null && nowMs >= parseTime(anchor.validUntil)!) findings.push({ code: "ISSUER_EXPIRED", message: "The local issuer trust anchor has expired." });

    if (credential.signedPayload !== canonicalClaims(credential)) findings.push({ code: "CREDENTIAL_MALFORMED", message: "Signed claims do not match the credential fields presented to the validator." });

    const canVerify = findings.length === 0 && anchor;
    if (canVerify) {
      try {
        const valid = await this.dependencies.signatureVerifier.verify({ payload: credential.signedPayload, signature: credential.signature, issuerId: credential.issuerId, keyId: credential.trustKeyId });
        if (!valid) findings.push({ code: "SIGNATURE_INVALID", message: "The local signature verifier rejected the credential." });
      } catch {
        findings.push({ code: "VERIFICATION_UNAVAILABLE", message: "The local signature verifier failed closed." });
      }
    }

    return this.result(request, findings);
  }

  async validateAndConsume(request: LocalBreakGlassRequest): Promise<LocalBreakGlassResult> {
    const result = await this.validate(request);
    if (result.decision === "allow" && result.credentialId) this.ledger.consume(result.credentialId);
    return result;
  }

  private result(request: LocalBreakGlassRequest, findings: LocalBreakGlassFinding[]): LocalBreakGlassResult {
    return { decision: findings.length === 0 ? "allow" : "deny", findings, credentialId: request.credential?.credentialId, expiresAt: request.credential?.validUntil };
  }
}

export { canonicalClaims };
