import { describe, expect, it } from 'vitest';
import {
  VendorCapabilityRegistry,
  type ApprovalRecord,
  type CapabilityToken,
  type VendorCapabilityManifest,
  type VendorOperationRequest,
} from '../lib/vendor-capability-provider';

const now = new Date('2026-10-21T10:00:00.000Z');

function manifest(overrides: Partial<VendorCapabilityManifest> = {}): VendorCapabilityManifest {
  return {
    providerId: 'vendor.acme.service',
    vendorName: 'Acme Device Services',
    manifestVersion: 1,
    certificateFingerprint: 'sha256:acme-test',
    issuedAt: '2026-10-21T09:00:00.000Z',
    expiresAt: '2026-10-21T11:00:00.000Z',
    supportedTargets: [{ manufacturer: 'Acme', model: 'A1', product: 'a1', firmwarePatterns: ['14.2.'] }],
    operations: [
      {
        operationId: 'owner-recovery-handoff',
        capability: 'official-owner-recovery',
        risk: 'high',
        destructive: false,
        requiresOwnerConsent: true,
        requiresTwoPersonApproval: true,
        reversible: true,
        description: 'Open the vendor owner-authenticated recovery handoff.',
      },
    ],
    signature: 'signed-manifest',
    ...overrides,
  };
}

function token(overrides: Partial<CapabilityToken> = {}): CapabilityToken {
  return {
    tokenId: 'token-1',
    providerId: 'vendor.acme.service',
    targetId: 'target-1',
    operationId: 'owner-recovery-handoff',
    issuedAt: '2026-10-21T09:30:00.000Z',
    expiresAt: '2026-10-21T10:30:00.000Z',
    nonce: 'nonce-1',
    signature: 'signed-token',
    ...overrides,
  };
}

function request(overrides: Partial<VendorOperationRequest> = {}): VendorOperationRequest {
  return {
    requestId: 'request-1',
    providerId: 'vendor.acme.service',
    target: {
      targetId: 'target-1',
      manufacturer: 'Acme',
      model: 'A1',
      product: 'a1',
      firmware: '14.2.7',
      ownerConsentId: 'owner-consent-1',
    },
    operationId: 'owner-recovery-handoff',
    operatorId: 'operator-1',
    reason: 'Owner requested documented recovery handoff after display failure.',
    requestedAt: now.toISOString(),
    ownerConsentId: 'owner-consent-1',
    approval: {
      approvalId: 'approval-1',
      operatorId: 'operator-1',
      ownerId: 'owner-1',
      secondApproverId: 'reviewer-1',
      approvedAt: now.toISOString(),
      expiresAt: '2026-10-21T10:30:00.000Z',
      exactOperationDigest: 'vendor.acme.service:target-1:owner-recovery-handoff',
    },
    token: token(),
    ...overrides,
  };
}

function registry(audit: unknown[] = []) {
  return new VendorCapabilityRegistry({
    now: () => now,
    verifyManifest: async (value) => value.signature === 'signed-manifest',
    verifyToken: async (value) => value.signature === 'signed-token',
    audit: (event) => audit.push(event),
  });
}

describe('VendorCapabilityRegistry', () => {
  it('registers a valid signed provider manifest', async () => {
    const result = await registry().register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'handoff-required', summary: 'handoff opened', modifications: [] }) });
    expect(result.decision).toBe('allow');
  });

  it('rejects forbidden universal capabilities in a manifest', async () => {
    const result = await registry().register(manifest({ operations: [{ ...manifest().operations[0], operationId: 'arbitrary-shell', description: 'Run arbitrary shell commands.' }] }), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'completed', summary: 'unsafe', modifications: [] }) });
    expect(result.decision).toBe('deny');
    expect(result.reasons.join(' ')).toContain('forbidden operation');
  });

  it('rejects an unsigned manifest and does not register the provider', async () => {
    const r = registry();
    const result = await r.register(manifest({ signature: 'tampered' }), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'completed', summary: 'never', modifications: [] }) });
    expect(result.decision).toBe('deny');
    expect(r.evaluate(request()).decision).toBe('deny');
  });

  it('requires independent second approval for high-risk operations', async () => {
    const r = registry();
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'handoff-required', summary: 'handoff', modifications: [] }) });
    const result = r.evaluate(request({ approval: { ...request().approval!, secondApproverId: 'operator-1' } }));
    expect(result.decision).toBe('deny');
    expect(result.reasons.join(' ')).toContain('independent second approval');
  });

  it('rejects a target outside the signed model and firmware scope', async () => {
    const r = registry();
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'completed', summary: 'never', modifications: [] }) });
    const result = r.evaluate(request({ target: { ...request().target, model: 'A2' } }));
    expect(result.decision).toBe('deny');
    expect(result.reasons.join(' ')).toContain('outside the signed provider scope');
  });

  it('allows an exact owner-consented, two-person, token-bound handoff', async () => {
    const audit: unknown[] = [];
    const r = registry(audit);
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'handoff-required', summary: 'Vendor handoff opened; no device change performed.', modifications: [] }) });
    const result = await r.execute(request());
    expect(result.decision).toBe('allow');
    expect(result.result?.status).toBe('handoff-required');
    expect(audit).toHaveLength(1);
  });

  it('consumes a token once and rejects replay', async () => {
    const r = registry();
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'completed', summary: 'completed', modifications: [] }) });
    expect((await r.execute(request())).decision).toBe('allow');
    const replay = await r.execute(request());
    expect(replay.decision).toBe('deny');
    expect(replay.reasons.join(' ')).toContain('already been consumed');
  });

  it('rejects invalid token signatures before provider execution', async () => {
    let calls = 0;
    const r = new VendorCapabilityRegistry({
      now: () => now,
      verifyManifest: async () => true,
      verifyToken: async () => false,
      audit: () => undefined,
    });
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => { calls += 1; return { status: 'completed', summary: 'never', modifications: [] }; } });
    const result = await r.execute(request());
    expect(result.decision).toBe('deny');
    expect(calls).toBe(0);
  });

  it('requires explicit owner consent', async () => {
    const r = registry();
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'completed', summary: 'never', modifications: [] }) });
    const result = r.evaluate(request({ ownerConsentId: undefined, target: { ...request().target, ownerConsentId: undefined } }));
    expect(result.decision).toBe('deny');
    expect(result.reasons.join(' ')).toContain('owner consent');
  });

  it('revokes a provider and denies subsequent requests', async () => {
    const r = registry();
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'completed', summary: 'never', modifications: [] }) });
    r.revokeProvider('vendor.acme.service');
    expect(r.evaluate(request()).decision).toBe('deny');
  });

  it('requires a reason and exact approval binding', async () => {
    const r = registry();
    await r.register(manifest(), { providerId: 'vendor.acme.service', execute: async () => ({ status: 'completed', summary: 'never', modifications: [] }) });
    const result = r.evaluate(request({ reason: ' ', approval: { ...request().approval!, exactOperationDigest: 'wrong' } }));
    expect(result.decision).toBe('deny');
    expect(result.reasons).toEqual(expect.arrayContaining(['operator reason is required', 'approval is not bound to the exact operation and target']));
  });
});
