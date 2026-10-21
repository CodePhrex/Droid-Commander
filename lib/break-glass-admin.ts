export type BreakGlassDecision = "allow" | "deny";

export type BreakGlassCapability =
  | "inspect-auth-state"
  | "retry-auth-confirmation"
  | "refresh-provider-status"
  | "export-audit"
  | "close-session";

export type BreakGlassCode =
  | "BREAK_GLASS_CREDENTIAL_REQUIRED"
  | "BREAK_GLASS_CREDENTIAL_MALFORMED"
  | "BREAK_GLASS_CREDENTIAL_TYPE_INVALID"
  | "BREAK_GLASS_ISSUER_UNTRUSTED"
  | "BREAK_GLASS_SIGNATURE_INVALID"
  | "BREAK_GLASS_EXPIRED"
  | "BREAK_GLASS_NOT_YET_VALID"
  | "BREAK_GLASS_ORGANIZATION_MISMATCH"
  | "BREAK_GLASS_ACCOUNT_DISABLED"
  | "BREAK_GLASS_CAPABILITY_NOT_ALLOWED"
  | "BREAK_GLASS_REASON_REQUIRED"
  | "BREAK_GLASS_TICKET_REQUIRED"
  | "BREAK_GLASS_TARGET_CONSENT_REQUIRED"
  | "BREAK_GLASS_AUTH_ISSUE_REQUIRED"
  | "BREAK_GLASS_RATE_LIMITED"
  | "BREAK_GLASS_VERIFICATION_UNAVAILABLE"
  | "BREAK_GLASS_ACTIVE_ACTION_BLOCKED";

export type BreakGlassFinding = {
  code: BreakGlassCode;
  message: string;
};

export type BreakGlassCredential = {
  credentialId: string;
  operatorId: string;
  organizationId: string;
  issuerId: string;
  credentialType: "break-glass-admin";
  validFrom: string;
  validUntil: string;
  allowedCapabilities: BreakGlassCapability[];
  trustKeyId: string;
  signedPayload: string;
  signature: string;
};

export type BreakGlassRequest = {
  credential?: BreakGlassCredential;
  organizationId: string;
  capability: BreakGlassCapability;
  reason: string;
  ticketId: string;
  now: string;
  accountEnabled: boolean;
  targetId?: string;
  targetConsent: "confirmed" | "missing" | "unknown";
  vendorAuthState: "confirmed" | "failed" | "unknown";
  deviceAuthState: "confirmed" | "failed" | "unknown";
};

export type BreakGlassAuditEvent = {
  event: "break-glass-attempt" | "break-glass-activated";
  credentialId?: string;
  operatorId?: string;
  organizationId: string;
  capability: BreakGlassCapability;
  targetId?: string;
  decision: BreakGlassDecision;
  codes: BreakGlassCode[];
  reasonProvided: boolean;
  ticketProvided: boolean;
  at: string;
};

export interface BreakGlassSignatureVerifier {
  verify(input: { payload: string; signature: string; issuerId: string; keyId: string }): Promise<boolean>;
}

export interface BreakGlassAuditSink {
  record(event: BreakGlassAuditEvent): void;
}

export type BreakGlassAdminDependencies = {
  trustedIssuers: Array<{ issuerId: string; keyId: string; validUntil: string }>;
  signatureVerifier: BreakGlassSignatureVerifier;
  auditSink: BreakGlassAuditSink;
  maxFailedAttempts?: number;
  lockoutMs?: number;
};

export type BreakGlassResult = {
  decision: BreakGlassDecision;
  findings: BreakGlassFinding[];
  evidence: {
    credentialId?: string;
    operatorId?: string;
    capability: BreakGlassCapability;
    activatedAt: string;
    targetId?: string;
    targetAuthorizationUnchanged: true;
  };
};

const allowedCapabilities = new Set<BreakGlassCapability>([
  "inspect-auth-state",
  "retry-auth-confirmation",
  "refresh-provider-status",
  "export-audit",
  "close-session",
]);

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function milliseconds(value: string) {
  return new Date(value).getTime();
}

function isExpired(now: string, until: string) {
  return milliseconds(now) >= milliseconds(until);
}

function isNotYetValid(now: string, from: string) {
  return milliseconds(now) < milliseconds(from);
}

export class BreakGlassAdminGuard {
  private failedAttempts = 0;
  private lockedUntil = 0;
  private readonly maxFailedAttempts: number;
  private readonly lockoutMs: number;

  constructor(private readonly dependencies: BreakGlassAdminDependencies) {
    this.maxFailedAttempts = dependencies.maxFailedAttempts ?? 3;
    this.lockoutMs = dependencies.lockoutMs ?? 15 * 60 * 1000;
  }

  async activate(request: BreakGlassRequest): Promise<BreakGlassResult> {
    const credential = request.credential;
    const findings: BreakGlassFinding[] = [];
    const nowMs = milliseconds(request.now);

    if (this.lockedUntil > nowMs) {
      findings.push({ code: "BREAK_GLASS_RATE_LIMITED", message: "Break-glass activation is temporarily locked after repeated failures." });
      return this.finish(request, findings);
    }

    if (!request.accountEnabled) findings.push({ code: "BREAK_GLASS_ACCOUNT_DISABLED", message: "The break-glass account is disabled until explicitly provisioned by the organization." });
    if (!credential) findings.push({ code: "BREAK_GLASS_CREDENTIAL_REQUIRED", message: "An organization-signed break-glass credential is required; no built-in password exists." });
    if (credential && [credential.credentialId, credential.operatorId, credential.organizationId, credential.issuerId, credential.validFrom, credential.validUntil, credential.trustKeyId, credential.signedPayload, credential.signature].some((value) => !hasText(value))) {
      findings.push({ code: "BREAK_GLASS_CREDENTIAL_MALFORMED", message: "The recovery credential is missing a required signed field." });
    }
    if (credential && credential.credentialType !== "break-glass-admin") findings.push({ code: "BREAK_GLASS_CREDENTIAL_TYPE_INVALID", message: "The credential is not an organization-issued break-glass administrator credential." });
    if (credential && credential.organizationId !== request.organizationId) findings.push({ code: "BREAK_GLASS_ORGANIZATION_MISMATCH", message: "The recovery credential belongs to a different organization." });
    if (credential && isNotYetValid(request.now, credential.validFrom)) findings.push({ code: "BREAK_GLASS_NOT_YET_VALID", message: "The recovery credential is not yet valid." });
    if (credential && isExpired(request.now, credential.validUntil)) findings.push({ code: "BREAK_GLASS_EXPIRED", message: "The recovery credential has expired." });
    if (!allowedCapabilities.has(request.capability) || (credential && !credential.allowedCapabilities.includes(request.capability))) findings.push({ code: "BREAK_GLASS_CAPABILITY_NOT_ALLOWED", message: "This capability is not in the fixed break-glass recovery allow-list." });
    if (request.reason.trim().length < 12) findings.push({ code: "BREAK_GLASS_REASON_REQUIRED", message: "A specific recovery reason of at least 12 characters is required." });
    if (request.ticketId.trim().length < 3) findings.push({ code: "BREAK_GLASS_TICKET_REQUIRED", message: "An incident or change ticket reference is required." });
    if (request.targetId && request.targetConsent !== "confirmed") findings.push({ code: "BREAK_GLASS_TARGET_CONSENT_REQUIRED", message: "Break-glass recovery cannot override missing or unknown target consent." });
    if (request.vendorAuthState === "confirmed" && request.deviceAuthState === "confirmed") findings.push({ code: "BREAK_GLASS_AUTH_ISSUE_REQUIRED", message: "Break-glass activation requires a recorded vendor or device authentication issue." });
    if (request.capability === "retry-auth-confirmation" && request.targetConsent !== "confirmed") findings.push({ code: "BREAK_GLASS_ACTIVE_ACTION_BLOCKED", message: "Authentication retry cannot begin until the target has visibly consented." });

    const anchor = credential && this.dependencies.trustedIssuers.find((candidate) => candidate.issuerId === credential.issuerId && candidate.keyId === credential.trustKeyId);
    if (credential && !anchor) findings.push({ code: "BREAK_GLASS_ISSUER_UNTRUSTED", message: "The recovery credential issuer or key is not trusted." });
    if (credential && anchor && isExpired(request.now, anchor.validUntil)) findings.push({ code: "BREAK_GLASS_EXPIRED", message: "The recovery issuer trust anchor has expired." });

    if (credential && anchor && !findings.some((item) => item.code === "BREAK_GLASS_CREDENTIAL_MALFORMED" || item.code === "BREAK_GLASS_EXPIRED" || item.code === "BREAK_GLASS_NOT_YET_VALID")) {
      try {
        const valid = await this.dependencies.signatureVerifier.verify({ payload: credential.signedPayload, signature: credential.signature, issuerId: credential.issuerId, keyId: credential.trustKeyId });
        if (!valid) findings.push({ code: "BREAK_GLASS_SIGNATURE_INVALID", message: "The recovery credential signature could not be verified." });
      } catch {
        findings.push({ code: "BREAK_GLASS_VERIFICATION_UNAVAILABLE", message: "The recovery credential verifier failed closed." });
      }
    }

    return this.finish(request, findings);
  }

  private finish(request: BreakGlassRequest, findings: BreakGlassFinding[]): BreakGlassResult {
    const credential = request.credential;
    const decision: BreakGlassDecision = findings.length === 0 ? "allow" : "deny";
    if (decision === "deny") {
      this.failedAttempts += 1;
      if (this.failedAttempts >= this.maxFailedAttempts) this.lockedUntil = milliseconds(request.now) + this.lockoutMs;
    } else {
      this.failedAttempts = 0;
      this.lockedUntil = 0;
    }
    this.dependencies.auditSink.record({
      event: decision === "allow" ? "break-glass-activated" : "break-glass-attempt",
      credentialId: credential?.credentialId,
      operatorId: credential?.operatorId,
      organizationId: request.organizationId,
      capability: request.capability,
      targetId: request.targetId,
      decision,
      codes: findings.map((item) => item.code),
      reasonProvided: request.reason.trim().length >= 12,
      ticketProvided: request.ticketId.trim().length >= 3,
      at: request.now,
    });
    return {
      decision,
      findings,
      evidence: {
        credentialId: credential?.credentialId,
        operatorId: credential?.operatorId,
        capability: request.capability,
        activatedAt: request.now,
        targetId: request.targetId,
        targetAuthorizationUnchanged: true,
      },
    };
  }
}
