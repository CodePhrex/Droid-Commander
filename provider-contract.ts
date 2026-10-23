/**
 * Droid Commander - Vendor Capability Provider Contract Framework
 *
 * Defines the contract, signature verification, capability tiers,
 * sandbox isolation rules, and audit logging for third-party extensions.
 */

import { CryptoService } from '../security/crypto';
import { PrivilegedActionLedger } from '../db/ledger';

/**
 * Execution Tiers for Provider Capabilities
 */
export enum ProviderExecutionTier {
  TIER_0_READ_ONLY = 'TIER_0_READ_ONLY',           // Read telemetry, logs, device status
  TIER_1_USER_CONFIRMED = 'TIER_1_USER_CONFIRMED',   // Requires explicit interactive UI prompt per invocation
  TIER_2_HARDWARE_DIRECT = 'TIER_2_HARDWARE_DIRECT', // Requires native USB OTG raw packet dispatch
  TIER_3_ELEVATED = 'TIER_3_ELEVATED',               // System-level remediation / require break-glass or high consent
}

/**
 * Manifest defining a Vendor Capability Provider
 */
export interface CapabilityManifest {
  providerId: string;
  vendorName: string;
  vendorPublicKeyPem: string;
  version: string;
  minAppVersion: string;
  executionTier: ProviderExecutionTier;
  requestedPermissions: string[];
  supportedDeviceVidsPids: Array<{ vid: number; pid: number }>;
  issuedAt: number;
  expiresAt: number;
  manifestSignature: string; // Vendor ECDSA signature over canonical JSON
}

/**
 * Capability Execution Context passed during invocation
 */
export interface ExecutionContext {
  sessionId: string;
  technicianId: string;
  deviceId: string;
  activeScopes: string[];
  isBreakGlassActive: boolean;
}

/**
 * Execution Result returned by a Capability Provider
 */
export interface ExecutionResult {
  success: boolean;
  capabilityId: string;
  executionTimeMs: number;
  outputData: Record<string, unknown>;
  auditDetails: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Interface that all Vendor Capability Plugins must implement
 */
export interface ICapabilityProvider {
  manifest: CapabilityManifest;
  initialize(): Promise<boolean>;
  executeCapability(
    capabilityId: string,
    params: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult>;
  shutdown(): Promise<void>;
}

/**
 * Vendor Capability Provider Manager
 */
export class VendorCapabilityManager {
  private registeredProviders: Map<string, ICapabilityProvider> = new Map();
  private verifiedManifests: Map<string, CapabilityManifest> = new Map();

  /**
   * Registers and cryptographically validates a new Vendor Capability Provider
   */
  async registerProvider(provider: ICapabilityProvider): Promise<boolean> {
    const { manifest } = provider;

    // 1. Verify Manifest Expiration
    if (Date.now() >= manifest.expiresAt) {
      await PrivilegedActionLedger.appendEntry({
        eventType: 'PROVIDER_REGISTRATION_FAILED',
        actor: 'SYSTEM',
        scopes: [manifest.providerId],
        details: `Provider manifest expired at ${new Date(manifest.expiresAt).toISOString()}`,
      });
      throw new Error(`Registration failed: Manifest for ${manifest.providerId} has expired.`);
    }

    // 2. Cryptographically Verify Manifest Signature
    const isSignatureValid = await this.verifyManifestSignature(manifest);
    if (!isSignatureValid) {
      await PrivilegedActionLedger.appendEntry({
        eventType: 'PROVIDER_SIGNATURE_INVALID',
        actor: 'SYSTEM',
        scopes: [manifest.providerId],
        details: `Cryptographic signature verification failed for vendor ${manifest.vendorName}`,
      });
      throw new Error(`Registration failed: Invalid digital signature for provider ${manifest.providerId}.`);
    }

    // 3. Check Execution Tier & Permission Policy
    this.enforceTierPolicies(manifest);

    // 4. Initialize Provider Plugin
    const initialized = await provider.initialize();
    if (!initialized) {
      throw new Error(`Provider ${manifest.providerId} failed to initialize.`);
    }

    // 5. Store & Audit Log
    this.registeredProviders.set(manifest.providerId, provider);
    this.verifiedManifests.set(manifest.providerId, manifest);

    await PrivilegedActionLedger.appendEntry({
      eventType: 'PROVIDER_REGISTERED_SUCCESS',
      actor: 'SYSTEM',
      scopes: manifest.requestedPermissions,
      details: `Registered provider ${manifest.providerId} (Tier: ${manifest.executionTier}, Vendor: ${manifest.vendorName})`,
    });

    return true;
  }

  /**
   * Invokes a registered capability after checking consent, scope, and break-glass gates
   */
  async invokeCapability(
    providerId: string,
    capabilityId: string,
    params: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const provider = this.registeredProviders.get(providerId);
    if (!provider) {
      throw new Error(`Capability invocation failed: Provider '${providerId}' is not registered.`);
    }

    const manifest = provider.manifest;

    // Gate Check 1: Tier 3 & Tier 2 permission scopes
    const hasRequiredScope = manifest.requestedPermissions.every(perm =>
      context.activeScopes.includes(perm) || context.activeScopes.includes('*')
    );

    if (!hasRequiredScope && !context.isBreakGlassActive) {
      await PrivilegedActionLedger.appendEntry({
        eventType: 'CAPABILITY_INVOCATION_BLOCKED',
        actor: context.technicianId,
        scopes: manifest.requestedPermissions,
        details: `Blocked invocation of ${capabilityId} from ${providerId}: Missing required scope consent`,
      });
      throw new Error(`Scope Enforcement: Missing consent for requested capability permissions.`);
    }

    // Execute with performance measurement
    const startTime = Date.now();
    let result: ExecutionResult;

    try {
      result = await provider.executeCapability(capabilityId, params, context);
      result.executionTimeMs = Date.now() - startTime;

      // Log invocation in Ledger
      await PrivilegedActionLedger.appendEntry({
        eventType: 'CAPABILITY_EXECUTED_SUCCESS',
        actor: context.technicianId,
        scopes: manifest.requestedPermissions,
        details: `Executed ${capabilityId} via ${providerId} in ${result.executionTimeMs}ms (Break-Glass: ${context.isBreakGlassActive})`,
      });
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      await PrivilegedActionLedger.appendEntry({
        eventType: 'CAPABILITY_EXECUTION_ERROR',
        actor: context.technicianId,
        scopes: manifest.requestedPermissions,
        details: `Failed executing ${capabilityId} via ${providerId}: ${errorMsg}`,
      });

      result = {
        success: false,
        capabilityId,
        executionTimeMs,
        outputData: {},
        auditDetails: `Execution crashed: ${errorMsg}`,
        errorCode: 'EXECUTION_EXCEPTION',
        errorMessage: errorMsg,
      };
    }

    return result;
  }

  /**
   * Validates vendor ECDSA signature over canonicalized manifest payload
   */
  private async verifyManifestSignature(manifest: CapabilityManifest): Promise<boolean> {
    const payloadToVerify = {
      providerId: manifest.providerId,
      vendorName: manifest.vendorName,
      version: manifest.version,
      minAppVersion: manifest.minAppVersion,
      executionTier: manifest.executionTier,
      requestedPermissions: manifest.requestedPermissions,
      supportedDeviceVidsPids: manifest.supportedDeviceVidsPids,
      issuedAt: manifest.issuedAt,
      expiresAt: manifest.expiresAt,
    };

    const canonicalJson = JSON.stringify(payloadToVerify, Object.keys(payloadToVerify).sort());
    return await CryptoService.verifyEcdsaSignature(
      canonicalJson,
      manifest.manifestSignature,
      manifest.vendorPublicKeyPem
    );
  }

  /**
   * Validates provider tier security policies
   */
  private enforceTierPolicies(manifest: CapabilityManifest): void {
    if (manifest.executionTier === ProviderExecutionTier.TIER_3_ELEVATED) {
      // High security check: TIER_3 must explicitly declare vendor verification
      if (!manifest.requestedPermissions.includes('GOVERNANCE_ELEVATED_EXECUTE')) {
        throw new Error(`Tier Policy Violation: Tier 3 providers must request GOVERNANCE_ELEVATED_EXECUTE permission.`);
      }
    }
  }

  getRegisteredProviders(): CapabilityManifest[] {
    return Array.from(this.verifiedManifests.values());
  }
}
