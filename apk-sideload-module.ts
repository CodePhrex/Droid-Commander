/**
 * Droid Commander - APK Sideloading & Package Manager Module
 * File: apk-sideload-module.ts
 *
 * Handles owner-consented APK package validation, signature verification,
 * and multi-stage ADB streaming installation (`pm install-create / write / commit`).
 */

import { privilegedActionLedger } from './privileged-action-ledger-schema';

export interface ApkMetadata {
  fileName: string;
  fileSizeBytes: number;
  packageName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  sha256Digest: string;
  requestedPermissions: string[];
  isSignedByDebugKey: boolean;
}

export interface SideloadSession {
  sessionId: string;
  apk: ApkMetadata;
  targetDeviceId: string;
  ownerConsentVerified: boolean;
  status: 'QUEUED' | 'STREAMING_PACKETS' | 'VERIFYING_SIGNATURE' | 'COMMITTED' | 'FAILED' | 'BLOCKED_NO_CONSENT';
  progressPercent: number;
  errorMessage?: string;
}

export class ApkSideloadModule {
  private activeSessions: Map<string, SideloadSession> = new Map();

  /**
   * Pre-flight checks on APK before installation stream
   */
  async validateApkPayload(apk: ApkMetadata, ownerConsent: boolean): Promise<{ valid: boolean; reason?: string }> {
    if (!ownerConsent) {
      return { valid: false, reason: 'Explicit owner consent is required before sideloading APK packages.' };
    }

    if (apk.isSignedByDebugKey) {
      return { valid: false, reason: 'Packages signed with untrusted test/debug keys are blocked by governance policy.' };
    }

    if (apk.targetSdkVersion < 28) {
      return { valid: false, reason: 'Legacy Android SDK versions (< 28) are restricted for security reasons.' };
    }

    return { valid: true };
  }

  /**
   * Begins multi-stage streaming install
   */
  async initiateSideload(
    apk: ApkMetadata,
    targetDeviceId: string,
    ownerConsentVerified: boolean
  ): Promise<SideloadSession> {
    const sessionId = `sideload-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const session: SideloadSession = {
      sessionId,
      apk,
      targetDeviceId,
      ownerConsentVerified,
      status: ownerConsentVerified ? 'QUEUED' : 'BLOCKED_NO_CONSENT',
      progressPercent: 0,
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Simulates streaming byte packets via ADB OTG connection
   */
  async streamApkChunk(sessionId: string, bytesTransferred: number): Promise<SideloadSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Sideload session ${sessionId} not found.`);
    }

    if (session.status === 'BLOCKED_NO_CONSENT' || session.status === 'FAILED') {
      return session;
    }

    session.status = 'STREAMING_PACKETS';
    const percent = Math.min(100, Math.floor((bytesTransferred / session.apk.fileSizeBytes) * 100));
    session.progressPercent = percent;

    if (percent === 100) {
      session.status = 'VERIFYING_SIGNATURE';
    }

    return session;
  }

  /**
   * Commits the APK installation session (`pm install-commit <session_id>`)
   */
  async commitInstallation(sessionId: string): Promise<SideloadSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Sideload session ${sessionId} not found.`);
    }

    if (session.progressPercent < 100) {
      session.status = 'FAILED';
      session.errorMessage = 'Installation commit aborted: Incomplete stream.';
      return session;
    }

    session.status = 'COMMITTED';
    return session;
  }
}
