export type OrganizationProfileStatus = 'placeholder' | 'configured' | 'verified' | 'suspended';
export type CertificateState = 'missing' | 'active' | 'expiring' | 'expired' | 'revoked' | 'pending-rotation';

export interface OrganizationProfile {
  organizationId: string;
  displayName: string;
  legalName: string;
  region: string;
  supportUrl?: string;
  status: OrganizationProfileStatus;
  manufacturerApproval: 'not-claimed' | 'pending-verification' | 'verified';
  certificateState: CertificateState;
  activeCertificateFingerprint?: string;
  nextCertificateFingerprint?: string;
  configuredAt?: string;
  verifiedAt?: string;
}

export interface CertificateRotationRequest {
  requestId: string;
  organizationId: string;
  currentFingerprint?: string;
  nextFingerprint: string;
  notBefore: string;
  notAfter: string;
  operatorId: string;
  reason: string;
  confirmationId: string;
}

export interface RotationDecision {
  decision: 'allow' | 'deny';
  reasons: readonly string[];
  profile: OrganizationProfile;
}

export interface OrganizationUiConfirmation {
  title: string;
  body: string;
  organizationLabel: string;
  certificateFingerprint: string;
  expiresAt: string;
  requiresExplicitConfirmation: true;
  destructiveAction: false;
}

export type NativeProviderCallback = {
  requestId: string;
  organizationId: string;
  providerId: string;
  status: 'started' | 'progress' | 'handoff-required' | 'completed' | 'failed' | 'cancelled';
  summary: string;
  modifications: readonly string[];
  certificateFingerprint?: string;
  completedAt: string;
};

export interface NativeOrganizationProviderAdapter {
  readonly organizationId: string;
  readonly providerId: string;
  onCallback(callback: (event: NativeProviderCallback) => void): () => void;
}

export const PLACEHOLDER_ORGANIZATION_PROFILE: OrganizationProfile = {
  organizationId: 'org.placeholder.configure-me',
  displayName: 'AUTHORIZED RETAIL & SERVICE TECHNICIAN FIRM (PLACEHOLDER)',
  legalName: 'PLACEHOLDER — REPLACE WITH VERIFIED FIRM NAME',
  region: 'UNCONFIGURED',
  status: 'placeholder',
  manufacturerApproval: 'not-claimed',
  certificateState: 'missing',
};

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export class OrganizationProviderScaffold {
  private profile: OrganizationProfile;
  private readonly callbacks = new Set<(event: NativeProviderCallback) => void>();

  constructor(profile: OrganizationProfile = PLACEHOLDER_ORGANIZATION_PROFILE) {
    this.profile = { ...profile };
  }

  getProfile(): OrganizationProfile {
    return { ...this.profile };
  }

  getConfirmation(request: CertificateRotationRequest): OrganizationUiConfirmation {
    return {
      title: 'Confirm organization certificate rotation',
      body: 'This changes the trusted organization certificate reference. It does not claim manufacturer approval or enable device access.',
      organizationLabel: this.profile.displayName,
      certificateFingerprint: request.nextFingerprint,
      expiresAt: request.notAfter,
      requiresExplicitConfirmation: true,
      destructiveAction: false,
    };
  }

  evaluateRotation(request: CertificateRotationRequest, now: Date = new Date()): RotationDecision {
    const reasons: string[] = [];
    if (this.profile.status === 'suspended') reasons.push('organization profile is suspended');
    if (this.profile.organizationId !== request.organizationId) reasons.push('organization ID does not match the profile');
    if (!request.nextFingerprint || request.nextFingerprint.length < 16) reasons.push('next certificate fingerprint is missing or too short');
    if (!request.reason.trim()) reasons.push('rotation reason is required');
    if (!request.confirmationId.trim()) reasons.push('explicit UI confirmation is required');
    const notBefore = timestamp(request.notBefore);
    const notAfter = timestamp(request.notAfter);
    const current = now.getTime();
    if (!Number.isFinite(notBefore) || !Number.isFinite(notAfter) || notBefore > current || notAfter <= current || notAfter <= notBefore) {
      reasons.push('certificate validity window is invalid at the current time');
    }
    if (request.currentFingerprint && this.profile.activeCertificateFingerprint && request.currentFingerprint !== this.profile.activeCertificateFingerprint) {
      reasons.push('current certificate fingerprint does not match the active profile');
    }
    if (request.nextFingerprint === this.profile.activeCertificateFingerprint) reasons.push('next certificate is already active');
    return { decision: reasons.length === 0 ? 'allow' : 'deny', reasons, profile: this.getProfile() };
  }

  applyRotation(request: CertificateRotationRequest, now: Date = new Date()): RotationDecision {
    const decision = this.evaluateRotation(request, now);
    if (decision.decision === 'deny') return decision;
    this.profile = {
      ...this.profile,
      status: 'configured',
      certificateState: 'active',
      activeCertificateFingerprint: request.nextFingerprint,
      nextCertificateFingerprint: undefined,
      configuredAt: now.toISOString(),
    };
    return { decision: 'allow', reasons: [], profile: this.getProfile() };
  }

  markPendingRotation(nextFingerprint: string): OrganizationProfile {
    this.profile = { ...this.profile, certificateState: 'pending-rotation', nextCertificateFingerprint: nextFingerprint };
    return this.getProfile();
  }

  setCertificateState(state: CertificateState): OrganizationProfile {
    this.profile = { ...this.profile, certificateState: state };
    return this.getProfile();
  }

  onNativeCallback(callback: (event: NativeProviderCallback) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  receiveNativeCallback(event: NativeProviderCallback): void {
    if (event.organizationId !== this.profile.organizationId) return;
    for (const callback of this.callbacks) callback(event);
  }
}
