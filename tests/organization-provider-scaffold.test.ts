import { describe, expect, it } from 'vitest';
import {
  OrganizationProviderScaffold,
  PLACEHOLDER_ORGANIZATION_PROFILE,
  type CertificateRotationRequest,
  type NativeProviderCallback,
} from '../lib/organization-provider-scaffold';

const now = new Date('2026-10-21T12:00:00.000Z');

function request(overrides: Partial<CertificateRotationRequest> = {}): CertificateRotationRequest {
  return {
    requestId: 'rotation-1',
    organizationId: PLACEHOLDER_ORGANIZATION_PROFILE.organizationId,
    nextFingerprint: 'sha256:0123456789abcdef',
    notBefore: '2026-10-21T11:00:00.000Z',
    notAfter: '2027-10-21T11:00:00.000Z',
    operatorId: 'operator-1',
    reason: 'Configure the firm certificate after independent verification.',
    confirmationId: 'ui-confirmation-1',
    ...overrides,
  };
}

describe('OrganizationProviderScaffold', () => {
  it('starts as an explicit placeholder and makes no approval claim', () => {
    const scaffold = new OrganizationProviderScaffold();
    expect(scaffold.getProfile().status).toBe('placeholder');
    expect(scaffold.getProfile().manufacturerApproval).toBe('not-claimed');
    expect(scaffold.getProfile().certificateState).toBe('missing');
  });

  it('requires an explicit confirmation record for rotation', () => {
    const scaffold = new OrganizationProviderScaffold();
    const result = scaffold.evaluateRotation(request({ confirmationId: ' ' }), now);
    expect(result.decision).toBe('deny');
    expect(result.reasons).toContain('explicit UI confirmation is required');
  });

  it('returns a transparent confirmation payload without destructive action', () => {
    const scaffold = new OrganizationProviderScaffold();
    const confirmation = scaffold.getConfirmation(request());
    expect(confirmation.requiresExplicitConfirmation).toBe(true);
    expect(confirmation.destructiveAction).toBe(false);
    expect(confirmation.body).toContain('does not claim manufacturer approval');
  });

  it('applies a valid rotation and activates the new fingerprint', () => {
    const scaffold = new OrganizationProviderScaffold();
    const result = scaffold.applyRotation(request(), now);
    expect(result.decision).toBe('allow');
    expect(result.profile.status).toBe('configured');
    expect(result.profile.certificateState).toBe('active');
    expect(result.profile.activeCertificateFingerprint).toBe('sha256:0123456789abcdef');
  });

  it('rejects an expired or future validity window', () => {
    const scaffold = new OrganizationProviderScaffold();
    const result = scaffold.evaluateRotation(request({ notAfter: '2026-10-21T11:59:00.000Z' }), now);
    expect(result.decision).toBe('deny');
    expect(result.reasons).toContain('certificate validity window is invalid at the current time');
  });

  it('rejects a rotation bound to a different organization', () => {
    const scaffold = new OrganizationProviderScaffold();
    const result = scaffold.evaluateRotation(request({ organizationId: 'org.other' }), now);
    expect(result.decision).toBe('deny');
    expect(result.reasons).toContain('organization ID does not match the profile');
  });

  it('filters native callbacks to the configured organization', () => {
    const scaffold = new OrganizationProviderScaffold();
    const received: NativeProviderCallback[] = [];
    scaffold.onNativeCallback((event) => received.push(event));
    scaffold.receiveNativeCallback({ organizationId: 'org.other', requestId: 'x', providerId: 'p', status: 'completed', summary: 'ignored', modifications: [], completedAt: now.toISOString() });
    scaffold.receiveNativeCallback({ organizationId: PLACEHOLDER_ORGANIZATION_PROFILE.organizationId, requestId: 'y', providerId: 'p', status: 'completed', summary: 'accepted', modifications: [], completedAt: now.toISOString() });
    expect(received).toHaveLength(1);
    expect(received[0].summary).toBe('accepted');
  });

  it('supports a pending rotation state without activating it', () => {
    const scaffold = new OrganizationProviderScaffold();
    const profile = scaffold.markPendingRotation('sha256:next');
    expect(profile.certificateState).toBe('pending-rotation');
    expect(profile.activeCertificateFingerprint).toBeUndefined();
    expect(profile.nextCertificateFingerprint).toBe('sha256:next');
  });
});
