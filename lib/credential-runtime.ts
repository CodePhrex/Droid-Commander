export type CredentialDecision = "allow" | "deny" | "review";

export type CredentialCode =
  | "CREDENTIAL_REQUIRED"
  | "CREDENTIAL_MALFORMED"
  | "CREDENTIAL_ISSUER_UNTRUSTED"
  | "CREDENTIAL_SIGNATURE_INVALID"
  | "CREDENTIAL_EXPIRED"
  | "CREDENTIAL_NOT_YET_VALID"
  | "CREDENTIAL_REVOKED"
  | "CREDENTIAL_SUSPENDED"
  | "CREDENTIAL_STATUS_UNKNOWN"
  | "CREDENTIAL_ACTION_NOT_ALLOWED"
  | "CREDENTIAL_ORGANIZATION_MISMATCH"
  | "REVOCATION_STATUS_UNAVAILABLE"
  | "TRUST_BUNDLE_EXPIRED"
  | "PROVIDER_UNAVAILABLE";

export type CredentialFinding = {
  code: CredentialCode;
  severity: "block" | "review" | "info";
  message: string;
};

export type SignedCredential = {
  credentialId: string;
  operatorId: string;
  organizationId: string;
  issuerId: string;
  credentialType: string;
  validFrom: string;
  validUntil: string;
  allowedActions: string[];
  revocationSnapshotId: string;
  trustKeyId: string;
  signedPayload: string;
  signature: string;
};

export type TrustAnchor = {
  issuerId: string;
  keyId: string;
  validUntil: string;
};

export type RevocationSnapshot = {
  snapshotId: string;
  fetchedAt: string;
  validUntil: string;
  revokedCredentialIds: string[];
  suspendedCredentialIds: string[];
};

export type ProviderVerification = {
  status: "valid" | "revoked" | "suspended" | "unknown";
  checkedAt: string;
  source: "organization-provider";
  reference?: string;
};

export interface OrganizationCredentialProvider {
  verifyCredential(input: {
    credentialId: string;
    organizationId: string;
    issuerId: string;
  }): Promise<ProviderVerification>;
}

export interface CredentialSignatureVerifier {
  verify(input: { payload: string; signature: string; issuerId: string; keyId: string }): Promise<boolean>;
}

export interface CredentialRuntimeDependencies {
  trustAnchors: TrustAnchor[];
  revocationSnapshots: RevocationSnapshot[];
  signatureVerifier: CredentialSignatureVerifier;
  provider?: OrganizationCredentialProvider;
}

export type CredentialVerificationRequest = {
  credential?: SignedCredential;
  organizationId: string;
  requestedAction: string;
  now: string;
  online: boolean;
};

export type CredentialVerificationResult = {
  decision: CredentialDecision;
  mode: "online" | "offline-cache" | "unverified";
  findings: CredentialFinding[];
  evidence: {
    credentialId?: string;
    issuerId?: string;
    trustKeyId?: string;
    revocationSnapshotId?: string;
    providerReference?: string;
    verifiedAt: string;
  };
};

const finding = (
  code: CredentialCode,
  severity: CredentialFinding["severity"],
  message: string,
): CredentialFinding => ({ code, severity, message });

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function time(value: string) {
  return new Date(value).getTime();
}

function expired(now: string, validUntil: string) {
  return time(now) >= time(validUntil);
}

function notYetValid(now: string, validFrom: string) {
  return time(now) < time(validFrom);
}

function getSnapshot(snapshots: RevocationSnapshot[], snapshotId: string, now: string) {
  return snapshots.find((snapshot) => snapshot.snapshotId === snapshotId && !expired(now, snapshot.validUntil));
}

export class CredentialRuntime {
  constructor(private readonly dependencies: CredentialRuntimeDependencies) {}

  async verify(request: CredentialVerificationRequest): Promise<CredentialVerificationResult> {
    const findings: CredentialFinding[] = [];
    const credential = request.credential;
    let mode: CredentialVerificationResult["mode"] = request.online ? "online" : "offline-cache";
    let providerEvidence: ProviderVerification | undefined;

    if (!credential) {
      findings.push(finding("CREDENTIAL_REQUIRED", "block", "A signed personnel credential is required."));
      return this.result(request, findings, "unverified");
    }

    if (
      [
        credential.credentialId,
        credential.operatorId,
        credential.organizationId,
        credential.issuerId,
        credential.credentialType,
        credential.validFrom,
        credential.validUntil,
        credential.revocationSnapshotId,
        credential.trustKeyId,
        credential.signedPayload,
        credential.signature,
      ].some((value) => !hasText(value)) ||
      credential.allowedActions.length === 0
    ) {
      findings.push(finding("CREDENTIAL_MALFORMED", "block", "The credential is missing required signed fields."));
    }

    if (credential.organizationId !== request.organizationId) {
      findings.push(finding("CREDENTIAL_ORGANIZATION_MISMATCH", "block", "The credential belongs to a different organization."));
    }

    const anchor = this.dependencies.trustAnchors.find(
      (candidate) => candidate.issuerId === credential.issuerId && candidate.keyId === credential.trustKeyId,
    );
    if (!anchor) {
      findings.push(finding("CREDENTIAL_ISSUER_UNTRUSTED", "block", "The issuer or signing key is not in the active trust bundle."));
    } else if (expired(request.now, anchor.validUntil)) {
      findings.push(finding("TRUST_BUNDLE_EXPIRED", "block", "The issuer trust anchor has expired."));
    }

    if (notYetValid(request.now, credential.validFrom)) {
      findings.push(finding("CREDENTIAL_NOT_YET_VALID", "block", "The credential validity window has not started."));
    }
    if (expired(request.now, credential.validUntil)) {
      findings.push(finding("CREDENTIAL_EXPIRED", "block", "The credential is outside its validity window."));
    }
    if (!credential.allowedActions.includes(request.requestedAction)) {
      findings.push(finding("CREDENTIAL_ACTION_NOT_ALLOWED", "block", "The requested action is not allowed by the credential."));
    }

    if (anchor && !expired(request.now, anchor.validUntil)) {
      const signatureValid = await this.dependencies.signatureVerifier.verify({
        payload: credential.signedPayload,
        signature: credential.signature,
        issuerId: credential.issuerId,
        keyId: credential.trustKeyId,
      });
      if (!signatureValid) {
        findings.push(finding("CREDENTIAL_SIGNATURE_INVALID", "block", "The credential signature could not be verified."));
      }
    }

    let snapshot = getSnapshot(this.dependencies.revocationSnapshots, credential.revocationSnapshotId, request.now);

    if (request.online && this.dependencies.provider) {
      try {
        providerEvidence = await this.dependencies.provider.verifyCredential({
          credentialId: credential.credentialId,
          organizationId: credential.organizationId,
          issuerId: credential.issuerId,
        });
        if (providerEvidence.status === "revoked") {
          findings.push(finding("CREDENTIAL_REVOKED", "block", "The organization provider reports this credential as revoked."));
        } else if (providerEvidence.status === "suspended") {
          findings.push(finding("CREDENTIAL_SUSPENDED", "block", "The organization provider reports this credential as suspended."));
        } else if (providerEvidence.status === "unknown") {
          findings.push(finding("CREDENTIAL_STATUS_UNKNOWN", "block", "The organization provider could not establish credential status."));
        }
      } catch {
        if (!snapshot) {
          findings.push(finding("PROVIDER_UNAVAILABLE", "block", "The organization provider is unavailable and no fresh offline revocation state exists."));
        } else {
          mode = "offline-cache";
        }
      }
    }

    if (!request.online && !snapshot) {
      findings.push(finding("REVOCATION_STATUS_UNAVAILABLE", "block", "Offline verification requires a non-expired cached revocation snapshot."));
    }

    if (snapshot?.revokedCredentialIds.includes(credential.credentialId)) {
      findings.push(finding("CREDENTIAL_REVOKED", "block", "The cached revocation snapshot lists this credential as revoked."));
    }
    if (snapshot?.suspendedCredentialIds.includes(credential.credentialId)) {
      findings.push(finding("CREDENTIAL_SUSPENDED", "block", "The cached revocation snapshot lists this credential as suspended."));
    }

    return this.result(request, findings, mode, {
      credentialId: credential.credentialId,
      issuerId: credential.issuerId,
      trustKeyId: credential.trustKeyId,
      revocationSnapshotId: snapshot?.snapshotId,
      providerReference: providerEvidence?.reference,
    });
  }

  private result(
    request: CredentialVerificationRequest,
    findings: CredentialFinding[],
    mode: CredentialVerificationResult["mode"],
    evidence: Partial<CredentialVerificationResult["evidence"]> = {},
  ): CredentialVerificationResult {
    const hasBlock = findings.some((item) => item.severity === "block");
    const hasReview = findings.some((item) => item.severity === "review");
    return {
      decision: hasBlock ? "deny" : hasReview ? "review" : "allow",
      mode,
      findings,
      evidence: { ...evidence, verifiedAt: request.now },
    };
  }
}
