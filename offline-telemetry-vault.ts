/**
 * Droid Commander - Encrypted Offline Snapshot & Telemetry Vault
 * File: offline-telemetry-vault.ts
 *
 * Securely package, encrypt, and cryptographically sign host telemetry, CVE assessment
 * reports, and SHA-256 Privileged Action Ledger chains into offline AES-256-GCM archive
 * bundles for forensic retention and compliance verification.
 */

import * as crypto from 'crypto';

export interface HostSnapshotPayload {
  snapshotId: string;
  createdAt: number;
  deviceId: string;
  telemetry: Record<string, any>;
  assessmentReport?: Record<string, any>;
  ledgerChainHeadHash: string;
  technicianId: string;
}

export interface EncryptedVaultArchive {
  archiveId: string;
  version: string;
  algorithm: 'AES-256-GCM';
  ivBase64: string;
  authTagBase64: string;
  encryptedDataBase64: string;
  hmacSignatureBase64: string;
  metadata: {
    deviceId: string;
    createdAt: number;
    recordCount: number;
    ledgerHeadHash: string;
  };
}

export class OfflineTelemetryVault {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH_BYTES = 12;
  private static readonly AUTH_TAG_LENGTH_BYTES = 16;

  /**
   * Packages telemetry data into an encrypted offline vault archive.
   *
   * @param snapshot Unencrypted payload object containing host telemetry and assessment data
   * @param masterKey 32-byte (256-bit) raw secret key derived from StrongBox TEE Keystore
   */
  public static createVaultArchive(
    snapshot: HostSnapshotPayload,
    masterKey: Buffer
  ): EncryptedVaultArchive {
    if (masterKey.length !== 32) {
      throw new Error('Vault encryption error: Master key must be exactly 32 bytes (256 bits).');
    }

    const archiveId = `VAULT_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const serializedPayload = JSON.stringify(snapshot);

    const iv = crypto.randomBytes(this.IV_LENGTH_BYTES);
    const cipher = crypto.createCipheriv(this.ALGORITHM, masterKey, iv, {
      authTagLength: this.AUTH_TAG_LENGTH_BYTES,
    });

    let encrypted = cipher.update(serializedPayload, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Compute HMAC-SHA256 signature over encrypted payload + metadata for integrity binding
    const hmacKey = crypto.createHmac('sha256', masterKey);
    hmacKey.update(archiveId);
    hmacKey.update(iv);
    hmacKey.update(encrypted);
    hmacKey.update(authTag);
    const hmacSignature = hmacKey.digest('base64');

    return {
      archiveId,
      version: '1.0.0',
      algorithm: 'AES-256-GCM',
      ivBase64: iv.toString('base64'),
      authTagBase64: authTag.toString('base64'),
      encryptedDataBase64: encrypted,
      hmacSignatureBase64: hmacSignature,
      metadata: {
        deviceId: snapshot.deviceId,
        createdAt: snapshot.createdAt,
        recordCount: Object.keys(snapshot.telemetry || {}).length,
        ledgerHeadHash: snapshot.ledgerChainHeadHash,
      },
    };
  }

  /**
   * Decrypts and verifies an offline vault archive.
   *
   * @param archive Encrypted archive structure
   * @param masterKey 32-byte secret key matching creation key
   */
  public static decryptVaultArchive(
    archive: EncryptedVaultArchive,
    masterKey: Buffer
  ): HostSnapshotPayload {
    // Step 1: Verify HMAC integrity signature
    const iv = Buffer.from(archive.ivBase64, 'base64');
    const authTag = Buffer.from(archive.authTagBase64, 'base64');

    const hmacKey = crypto.createHmac('sha256', masterKey);
    hmacKey.update(archive.archiveId);
    hmacKey.update(iv);
    hmacKey.update(archive.encryptedDataBase64);
    hmacKey.update(authTag);
    const expectedHmac = hmacKey.digest('base64');

    if (!crypto.timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(archive.hmacSignatureBase64))) {
      throw new Error('Cryptographic Verification Error: HMAC signature mismatch. Archive tampered or corrupted.');
    }

    // Step 2: Decrypt AES-256-GCM payload
    const decipher = crypto.createDecipheriv(this.ALGORITHM, masterKey, iv, {
      authTagLength: this.AUTH_TAG_LENGTH_BYTES,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(archive.encryptedDataBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as HostSnapshotPayload;
  }

  /**
   * Checks the integrity of an archive without performing full payload decryption.
   */
  public static verifyVaultIntegrity(
    archive: EncryptedVaultArchive,
    masterKey: Buffer
  ): boolean {
    try {
      const iv = Buffer.from(archive.ivBase64, 'base64');
      const authTag = Buffer.from(archive.authTagBase64, 'base64');

      const hmacKey = crypto.createHmac('sha256', masterKey);
      hmacKey.update(archive.archiveId);
      hmacKey.update(iv);
      hmacKey.update(archive.encryptedDataBase64);
      hmacKey.update(authTag);
      const expectedHmac = hmacKey.digest('base64');

      return crypto.timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(archive.hmacSignatureBase64));
    } catch (_err) {
      return false;
    }
  }
}
