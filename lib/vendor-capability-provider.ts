export type VendorCapability =
  | 'official-owner-recovery'
  | 'signed-lab-simulation'
  | 'reviewed-device-operation'
  | 'oem-unlock-handoff'
  | 'signed-recovery-handoff'
  | 'vendor-service-handoff';

export type RiskLevel = 'low' | 'high' | 'destructive';
export type ProviderDecision = 'allow' | 'deny';

export interface SupportedTarget {
  manufacturer: string;
  model: string;
  product?: string;
  firmwarePatterns?: readonly string[];
}

export interface VendorOperationDeclaration {
  operationId: string;
  capability: VendorCapability;
  risk: RiskLevel;
  destructive: boolean;
  requiresOwnerConsent: boolean;
  requiresTwoPersonApproval: boolean;
  reversible: boolean;
  description: string;
}

export interface VendorCapabilityManifest {
  providerId: string;
  vendorName: string;
  manifestVersion: 1;
  certificateFingerprint: string;
  issuedAt: string;
  expiresAt: string;
  supportedTargets: readonly SupportedTarget[];
  operations: readonly VendorOperationDeclaration[];
  signature: string;
}

export interface VendorTarget {
  targetId: string;
  manufacturer: string;
  model: string;
  product?: string;
  firmware: string;
  ownerConsentId?: string;
}

export interface ApprovalRecord {
  approvalId: string;
  operatorId: string;
  ownerId?: string;
  secondApproverId?: string;
  approvedAt: string;
  expiresAt: string;
  exactOperationDigest: string;
}

export interface CapabilityToken {
  tokenId: string;
  providerId: string;
  targetId: string;
  operationId: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  signature: string;
}

export interface VendorOperationRequest {
  requestId: string;
  providerId: string;
  target: VendorTarget;
  operationId: string;
  operatorId: string;
  reason: string;
  requestedAt: string;
  ownerConsentId?: string;
  approval?: ApprovalRecord;
  token?: CapabilityToken;
}

export interface VendorAuditEvent {
  requestId: string;
  providerId: string;
  operationId: string;
  targetId: string;
  decision: ProviderDecision;
  reason: string;
  providerName?: string;
  capability?: VendorCapability;
  completedAt: string;
}

export interface VendorProviderAdapter {
  readonly providerId: string;
  execute(operation: VendorOperationRequest, declaration: VendorOperationDeclaration): Promise<{
    status: 'completed' | 'failed' | 'handoff-required';
    summary: string;
    modifications: readonly string[];
  }>;
}

export interface VendorProviderDependencies {
  now: () => Date;
  verifyManifest: (manifest: VendorCapabilityManifest) => Promise<boolean>;
  verifyToken: (token: CapabilityToken, manifest: VendorCapabilityManifest) => Promise<boolean>;
  audit: (event: VendorAuditEvent) => void;
}

export interface ProviderEvaluation {
  decision: ProviderDecision;
  reasons: readonly string[];
  manifest?: VendorCapabilityManifest;
  declaration?: VendorOperationDeclaration;
}

const FORBIDDEN_OPERATION_IDS = new Set([
  'arbitrary-shell',
  'arbitrary-code-execution',
  'silent-lockscreen-bypass',
  'silent-oem-unlock',
  'unattended-flash',
  'credential-extraction',
]);

const FORBIDDEN_DESCRIPTORS = [
  'arbitrary shell',
  'arbitrary code',
  'lock-screen bypass',
  'lockscreen bypass',
  'silent oem',
  'unattended flash',
  'credential extraction',
];

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function targetMatches(target: VendorTarget, supported: SupportedTarget): boolean {
  if (target.manufacturer !== supported.manufacturer || target.model !== supported.model) {
    return false;
  }
  if (supported.product && target.product !== supported.product) {
    return false;
  }
  if (supported.firmwarePatterns && supported.firmwarePatterns.length > 0) {
    return supported.firmwarePatterns.some((pattern) => target.firmware.startsWith(pattern));
  }
  return true;
}

function isForbiddenDeclaration(operation: VendorOperationDeclaration): boolean {
  const haystack = `${operation.operationId} ${operation.description}`.toLowerCase();
  return (
    FORBIDDEN_OPERATION_IDS.has(operation.operationId) ||
    FORBIDDEN_DESCRIPTORS.some((descriptor) => haystack.includes(descriptor))
  );
}

export function validateManifestShape(manifest: VendorCapabilityManifest): string[] {
  const reasons: string[] = [];
  if (!manifest.providerId || !manifest.vendorName || !manifest.certificateFingerprint) {
    reasons.push('provider identity and certificate fingerprint are required');
  }
  if (manifest.manifestVersion !== 1) {
    reasons.push('unsupported manifest version');
  }
  if (!Number.isFinite(toTimestamp(manifest.issuedAt)) || !Number.isFinite(toTimestamp(manifest.expiresAt))) {
    reasons.push('manifest validity timestamps are invalid');
  }
  if (manifest.operations.length === 0) {
    reasons.push('manifest must declare at least one operation');
  }
  for (const operation of manifest.operations) {
    if (!operation.operationId || !operation.description) {
      reasons.push('every operation requires an ID and description');
    }
    if (isForbiddenDeclaration(operation)) {
      reasons.push(`forbidden operation declaration: ${operation.operationId}`);
    }
    if (operation.destructive && !operation.requiresOwnerConsent) {
      reasons.push(`destructive operation lacks owner consent: ${operation.operationId}`);
    }
    if (operation.risk === 'destructive' && !operation.requiresTwoPersonApproval) {
      reasons.push(`destructive risk lacks two-person approval: ${operation.operationId}`);
    }
  }
  return reasons;
}

export class VendorCapabilityRegistry {
  private readonly manifests = new Map<string, VendorCapabilityManifest>();
  private readonly adapters = new Map<string, VendorProviderAdapter>();
  private readonly revokedProviders = new Set<string>();
  private readonly consumedTokens = new Set<string>();

  constructor(private readonly dependencies: VendorProviderDependencies) {}

  async register(manifest: VendorCapabilityManifest, adapter: VendorProviderAdapter): Promise<ProviderEvaluation> {
    const reasons = validateManifestShape(manifest);
    const now = this.dependencies.now().getTime();
    if (toTimestamp(manifest.issuedAt) > now || toTimestamp(manifest.expiresAt) <= now) {
      reasons.push('manifest is outside its validity window');
    }
    if (this.revokedProviders.has(manifest.providerId)) {
      reasons.push('provider is revoked');
    }
    if (adapter.providerId !== manifest.providerId) {
      reasons.push('adapter/provider identity mismatch');
    }
    if (!(await this.dependencies.verifyManifest(manifest))) {
      reasons.push('manifest signature verification failed');
    }
    if (reasons.length > 0) {
      return { decision: 'deny', reasons };
    }
    this.manifests.set(manifest.providerId, manifest);
    this.adapters.set(manifest.providerId, adapter);
    return { decision: 'allow', reasons: [] };
  }

  revokeProvider(providerId: string): void {
    this.revokedProviders.add(providerId);
    this.manifests.delete(providerId);
    this.adapters.delete(providerId);
  }

  evaluate(request: VendorOperationRequest): ProviderEvaluation {
    const manifest = this.manifests.get(request.providerId);
    const reasons: string[] = [];
    if (!manifest || this.revokedProviders.has(request.providerId)) {
      return { decision: 'deny', reasons: ['provider is not registered or is revoked'] };
    }
    const now = this.dependencies.now().getTime();
    if (toTimestamp(manifest.expiresAt) <= now) reasons.push('provider manifest has expired');
    if (!request.reason.trim()) reasons.push('operator reason is required');
    const declaration = manifest.operations.find((item) => item.operationId === request.operationId);
    if (!declaration) reasons.push('operation is not declared by the provider manifest');
    if (declaration && isForbiddenDeclaration(declaration)) reasons.push('operation is forbidden by platform policy');
    if (!manifest.supportedTargets.some((target) => targetMatches(request.target, target))) {
      reasons.push('target model or firmware is outside the signed provider scope');
    }
    if (declaration?.requiresOwnerConsent && !request.ownerConsentId) {
      reasons.push('explicit owner consent is required');
    }
    if (declaration?.requiresTwoPersonApproval) {
      const approval = request.approval;
      if (!approval || approval.operatorId === approval.secondApproverId) {
        reasons.push('independent second approval is required');
      }
      if (approval && approval.exactOperationDigest !== `${request.providerId}:${request.target.targetId}:${request.operationId}`) {
        reasons.push('approval is not bound to the exact operation and target');
      }
    }
    if (!request.token) {
      reasons.push('single-use capability token is required');
    } else {
      if (this.consumedTokens.has(request.token.nonce)) reasons.push('capability token has already been consumed');
      if (request.token.providerId !== request.providerId || request.token.targetId !== request.target.targetId || request.token.operationId !== request.operationId) {
        reasons.push('capability token is bound to a different provider, target, or operation');
      }
      if (toTimestamp(request.token.expiresAt) <= now) reasons.push('capability token has expired');
    }
    return {
      decision: reasons.length === 0 ? 'allow' : 'deny',
      reasons,
      manifest,
      declaration,
    };
  }

  async execute(request: VendorOperationRequest): Promise<ProviderEvaluation & { result?: Awaited<ReturnType<VendorProviderAdapter['execute']>> }> {
    const evaluation = this.evaluate(request);
    const completedAt = this.dependencies.now().toISOString();
    if (evaluation.decision === 'deny' || !evaluation.declaration) {
      this.dependencies.audit({
        requestId: request.requestId,
        providerId: request.providerId,
        operationId: request.operationId,
        targetId: request.target.targetId,
        decision: 'deny',
        reason: evaluation.reasons.join('; '),
        providerName: evaluation.manifest?.vendorName,
        capability: evaluation.declaration?.capability,
        completedAt,
      });
      return evaluation;
    }
    const adapter = this.adapters.get(request.providerId);
    if (!adapter) {
      const denied = { ...evaluation, decision: 'deny' as const, reasons: ['provider adapter is unavailable'] };
      this.dependencies.audit({
        requestId: request.requestId,
        providerId: request.providerId,
        operationId: request.operationId,
        targetId: request.target.targetId,
        decision: 'deny',
        reason: denied.reasons[0],
        providerName: evaluation.manifest?.vendorName,
        capability: evaluation.declaration.capability,
        completedAt,
      });
      return denied;
    }
    if (!(await this.dependencies.verifyToken(request.token!, evaluation.manifest!))) {
      const denied = { ...evaluation, decision: 'deny' as const, reasons: ['capability token signature verification failed'] };
      this.dependencies.audit({
        requestId: request.requestId,
        providerId: request.providerId,
        operationId: request.operationId,
        targetId: request.target.targetId,
        decision: 'deny',
        reason: denied.reasons[0],
        providerName: evaluation.manifest?.vendorName,
        capability: evaluation.declaration.capability,
        completedAt,
      });
      return denied;
    }
    this.consumedTokens.add(request.token!.nonce);
    try {
      const result = await adapter.execute(request, evaluation.declaration);
      this.dependencies.audit({
        requestId: request.requestId,
        providerId: request.providerId,
        operationId: request.operationId,
        targetId: request.target.targetId,
        decision: 'allow',
        reason: result.summary,
        providerName: evaluation.manifest?.vendorName,
        capability: evaluation.declaration.capability,
        completedAt: this.dependencies.now().toISOString(),
      });
      return { ...evaluation, result };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'provider operation failed';
      this.dependencies.audit({
        requestId: request.requestId,
        providerId: request.providerId,
        operationId: request.operationId,
        targetId: request.target.targetId,
        decision: 'deny',
        reason,
        providerName: evaluation.manifest?.vendorName,
        capability: evaluation.declaration.capability,
        completedAt: this.dependencies.now().toISOString(),
      });
      return { ...evaluation, decision: 'deny', reasons: [reason] };
    }
  }
}
