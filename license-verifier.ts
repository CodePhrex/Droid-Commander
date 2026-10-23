import { CryptoService } from './crypto';
import { PrivilegedActionLedger } from '../db/ledger';

/**
 * Authorization License Payload Structure
 * Defines the cryptographically signed contract for technician operations.
 */
export interface AuthorizationLicense {
  licenseId: string;
  technicianId: string;
  organizationId: string;
  boundHardwareSerial?: string;
  boundVidPid?: { vid: number; pid: number };
  permittedScopes: string[];
  issuedAt: number; // Unix timestamp (ms)
  expiresAt: number; // Unix timestamp (ms)
  issuerPublicKeyPem: string;
  signature: string; // Base64 encoded ECDSA P-256 signature
}

/**
 * Two-Party Consent Record
 * Captures explicit device owner agreement alongside technician authorization.
 */
export interface TwoPartyConsentRecord {
  consentId: string;
  licenseId: string;
  deviceOwnerIdentity: string;
  consentTimestamp: number;
  acceptedScopes: string[];
  ownerSignatureOrConfirmation: string;
  sessionNonce: string;
}

/**
 * Verified Session Ticket
 * Unlocks USB OTG session execution gates when both parties consent.
 */
export interface VerifiedSessionTicket {
  ticketId: string;
  technicianId: string;
  activeScopes: Set<string>;
  expiresAt: number;
  consentRecord: TwoPartyConsentRecord;
  isValid: boolean;
}

export class LicenseVerifierService {
  /**
   * Verifies an Authorization License cryptographically and temporally.
   */
  static async verifyLicense(
    license: AuthorizationLicense,
    connectedHardwareSerial?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const now = Date.now();

    // 1. Temporal Checks
    if (now < license.issuedAt) {
      await PrivilegedActionLedger.logFailure('LICENSE_NOT_YET_VALID', license.technicianId);
      return { valid: false, reason: 'License issuance date is in the future.' };
    }

    if (now >= license.expiresAt) {
      await PrivilegedActionLedger.logFailure('LICENSE_EXPIRED', license.technicianId);
      return { valid: false, reason: 'License has expired.' };
    }

    // 2. Hardware Binding Enforcement
    if (license.boundHardwareSerial && connectedHardwareSerial) {
      if (license.boundHardwareSerial !== connectedHardwareSerial) {
        await PrivilegedActionLedger.logFailure(
          'LICENSE_HARDWARE_MISMATCH',
          license.technicianId
        );
        return {
          valid: false,
          reason: `License is bound to serial ${license.boundHardwareSerial}, but connected hardware is ${connectedHardwareSerial}.`,
        };
      }
    }

    // 3. Cryptographic Signature Verification
    try {
      const payloadToVerify = JSON.stringify({
        licenseId: license.licenseId,
        technicianId: license.technicianId,
        organizationId: license.organizationId,
        boundHardwareSerial: license.boundHardwareSerial,
        boundVidPid: license.boundVidPid,
        permittedScopes: license.permittedScopes,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt,
      });

      const isValidSignature = await CryptoService.verifyEcdsaSignature(
        payloadToVerify,
        license.signature,
        license.issuerPublicKeyPem
      );

      if (!isValidSignature) {
        await PrivilegedActionLedger.logFailure('LICENSE_INVALID_SIGNATURE', license.technicianId);
        return { valid: false, reason: 'Cryptographic signature verification failed.' };
      }
    } catch (error) {
      await PrivilegedActionLedger.logFailure('LICENSE_CRYPTO_ERROR', license.technicianId);
      return { valid: false, reason: `Crypto verification error: ${(error as Error).message}` };
    }

    return { valid: true };
  }

  /**
   * Establishes a Two-Party Consent Session.
   * Requires both a valid Technician License AND an explicit Owner Consent Record.
   */
  static async establishTwoPartyConsentSession(
    license: AuthorizationLicense,
    ownerConsent: TwoPartyConsentRecord,
    connectedHardwareSerial?: string
  ): Promise<VerifiedSessionTicket> {
    // 1. Validate License First
    const licenseCheck = await this.verifyLicense(license, connectedHardwareSerial);
    if (!licenseCheck.valid) {
      throw new Error(`Cannot establish session: ${licenseCheck.reason}`);
    }

    // 2. Intersection of License Scopes and Owner Accepted Scopes
    const allowedScopes = license.permittedScopes.filter((scope) =>
      ownerConsent.acceptedScopes.includes(scope)
    );

    if (allowedScopes.length === 0) {
      await PrivilegedActionLedger.logFailure(
        'TWO_PARTY_CONSENT_NO_COMMON_SCOPES',
        license.technicianId
      );
      throw new Error('Two-party consent failed: No overlapping permitted scopes between technician and owner.');
    }

    // 3. Log Success to Privileged Action Ledger
    const logged = await PrivilegedActionLedger.appendEntry({
      eventType: 'TWO_PARTY_CONSENT_ESTABLISHED',
      actor: license.technicianId,
      owner: ownerConsent.deviceOwnerIdentity,
      scopes: allowedScopes,
      timestamp: Date.now(),
      nonce: ownerConsent.sessionNonce,
    });

    if (!logged) {
      throw new Error('Fail-closed gate triggered: Failed to record two-party consent in ledger.');
    }

    // 4. Issue Short-Lived Session Ticket
    const sessionLifetime = Math.min(license.expiresAt, Date.now() + 60 * 60 * 1000); // Max 1 hour
    return {
      ticketId: `TICKET_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      technicianId: license.technicianId,
      activeScopes: new Set(allowedScopes),
      expiresAt: sessionLifetime,
      consentRecord: ownerConsent,
      isValid: true,
    };
  }
}
