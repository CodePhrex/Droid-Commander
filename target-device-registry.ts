/**
 * Droid Commander - Target Device & Session Interaction Registry
 * File: target-device-registry.ts
 *
 * Stores, indexes, and tracks all Android target devices that Droid Commander
 * has interacted with over USB OTG or Local Host modes. Maintains detailed hardware
 * telemetry, session logs, executed commands, CVE risks, and ledger hash references.
 */

import { PrivilegedActionLedger } from './privileged-action-ledger-schema';

export interface TargetDeviceProfile {
  deviceId: string;
  hardwareSerial: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  buildFingerprint: string;
  securityPatchLevel: string;
  selinuxPosture: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED';
  avbState: 'LOCKED_GREEN' | 'UNLOCKED_ORANGE' | 'SELF_SIGNED_YELLOW';
  rootFramework: 'NONE' | 'MAGISK' | 'KERNEL_SU' | 'APATCH' | 'DEBUGGABLE_BUILD';
  firstInteractedAt: number;
  lastInteractedAt: number;
  totalSessionsCount: number;
  highestRiskScoreObserved: number;
  lastKnownStatus: 'ACTIVE_CONNECTED' | 'DISCONNECTED' | 'SERVICED_SUCCESS' | 'REQUIRES_REMEDIATION';
}

export interface TargetSessionRecord {
  sessionId: string;
  deviceId: string;
  technicianId: string;
  connectionMode: 'LOCAL_HOST_SELF' | 'REMOTE_USB_OTG' | 'FASTBOOT_SERVICING';
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  commandsExecutedCount: number;
  remediationsApplied: string[];
  cveCountDetected: number;
  riskScore: number;
  activeConsentScopes: string[];
  isBreakGlassUsed: boolean;
  ledgerBlockHash: string;
  summaryNotes: string;
}

export class TargetDeviceRegistry {
  private static instance: TargetDeviceRegistry;
  private deviceStore: Map<string, TargetDeviceProfile> = new Map();
  private sessionStore: Map<string, TargetSessionRecord[]> = new Map();

  private constructor() {
    this.seedDefaultDeviceHistory();
  }

  public static getInstance(): TargetDeviceRegistry {
    if (!TargetDeviceRegistry.instance) {
      TargetDeviceRegistry.instance = new TargetDeviceRegistry();
    }
    return TargetDeviceRegistry.instance;
  }

  /**
   * Registers or updates a target device profile upon connection or diagnostic run.
   */
  public registerOrUpdateDevice(details: Partial<TargetDeviceProfile> & { deviceId: string; manufacturer: string; model: string }): TargetDeviceProfile {
    const existing = this.deviceStore.get(details.deviceId);
    const now = Date.now();

    const profile: TargetDeviceProfile = {
      deviceId: details.deviceId,
      hardwareSerial: details.hardwareSerial || existing?.hardwareSerial || `HW-${Math.floor(Math.random() * 899999 + 100000)}`,
      manufacturer: details.manufacturer,
      model: details.model,
      androidVersion: details.androidVersion || existing?.androidVersion || 'Android 14 (API 34)',
      buildFingerprint: details.buildFingerprint || existing?.buildFingerprint || `${details.manufacturer.toLowerCase()}/${details.model.toLowerCase()}:14/UQ1A.240205.004/release-keys`,
      securityPatchLevel: details.securityPatchLevel || existing?.securityPatchLevel || '2024-02-05',
      selinuxPosture: details.selinuxPosture || existing?.selinuxPosture || 'ENFORCING',
      avbState: details.avbState || existing?.avbState || 'LOCKED_GREEN',
      rootFramework: details.rootFramework || existing?.rootFramework || 'NONE',
      firstInteractedAt: existing?.firstInteractedAt || now,
      lastInteractedAt: now,
      totalSessionsCount: (existing?.totalSessionsCount || 0) + 1,
      highestRiskScoreObserved: Math.max(existing?.highestRiskScoreObserved || 0, details.highestRiskScoreObserved || 0),
      lastKnownStatus: details.lastKnownStatus || 'ACTIVE_CONNECTED',
    };

    this.deviceStore.set(details.deviceId, profile);
    return profile;
  }

  /**
   * Records a completed interaction session for a device and links it to the Privileged Action Ledger.
   */
  public async recordSession(session: TargetSessionRecord): Promise<TargetSessionRecord> {
    const deviceSessions = this.sessionStore.get(session.deviceId) || [];
    deviceSessions.unshift(session); // Insert at beginning (newest first)
    this.sessionStore.set(session.deviceId, deviceSessions);

    // Update target device metadata
    const device = this.deviceStore.get(session.deviceId);
    if (device) {
      device.lastInteractedAt = session.startTime;
      device.highestRiskScoreObserved = Math.max(device.highestRiskScoreObserved, session.riskScore);
      this.deviceStore.set(session.deviceId, device);
    }

    // Log device session event to Privileged Action Ledger
    await PrivilegedActionLedger.appendEntry({
      eventType: 'TARGET_DEVICE_SESSION_RECORDED',
      actor: session.technicianId,
      details: JSON.stringify({
        sessionId: session.sessionId,
        deviceId: session.deviceId,
        connectionMode: session.connectionMode,
        commandsCount: session.commandsExecutedCount,
        riskScore: session.riskScore,
        breakGlass: session.isBreakGlassUsed,
        ledgerHash: session.ledgerBlockHash,
      }),
      timestamp: session.startTime,
    });

    return session;
  }

  /**
   * Retrieves all registered target devices sorted by last interaction time.
   */
  public getAllDevices(): TargetDeviceProfile[] {
    return Array.from(this.deviceStore.values()).sort((a, b) => b.lastInteractedAt - a.lastInteractedAt);
  }

  /**
   * Retrieves a specific device profile by Device ID or Serial.
   */
  public getDeviceById(deviceId: string): TargetDeviceProfile | null {
    return this.deviceStore.get(deviceId) || null;
  }

  /**
   * Retrieves all historical interaction sessions for a given device.
   */
  public getSessionsForDevice(deviceId: string): TargetSessionRecord[] {
    return this.sessionStore.get(deviceId) || [];
  }

  /**
   * Searches devices by Manufacturer, Model, Serial, or Device ID.
   */
  public searchDevices(query: string): TargetDeviceProfile[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllDevices();

    return this.getAllDevices().filter(
      (d) =>
        d.deviceId.toLowerCase().includes(q) ||
        d.manufacturer.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.hardwareSerial.toLowerCase().includes(q) ||
        d.buildFingerprint.toLowerCase().includes(q)
    );
  }

  /**
   * Pre-populates default sample device interaction history for testing.
   */
  private seedDefaultDeviceHistory(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const dev1: TargetDeviceProfile = {
      deviceId: 'PIXEL_7_PRO_OTG_001',
      hardwareSerial: 'HW-SN-998214',
      manufacturer: 'Google',
      model: 'Pixel 7 Pro',
      androidVersion: 'Android 14 (API 34)',
      buildFingerprint: 'google/cheetah/cheetah:14/UQ1A.240205.004/11223344:user/release-keys',
      securityPatchLevel: '2024-02-05',
      selinuxPosture: 'ENFORCING',
      avbState: 'LOCKED_GREEN',
      rootFramework: 'NONE',
      firstInteractedAt: now - 5 * dayMs,
      lastInteractedAt: now - 1 * dayMs,
      totalSessionsCount: 4,
      highestRiskScoreObserved: 2.1,
      lastKnownStatus: 'SERVICED_SUCCESS',
    };

    const dev2: TargetDeviceProfile = {
      deviceId: 'SAMSUNG_S23_LEGACY_002',
      hardwareSerial: 'HW-SN-441029',
      manufacturer: 'Samsung',
      model: 'Galaxy S23 Ultra',
      androidVersion: 'Android 13 (API 33)',
      buildFingerprint: 'samsung/dm3q/dm3q:13/TP1A.220624.014/S918BXXU1AWA6:user/release-keys',
      securityPatchLevel: '2023-05-01',
      selinuxPosture: 'PERMISSIVE',
      avbState: 'UNLOCKED_ORANGE',
      rootFramework: 'KERNEL_SU',
      firstInteractedAt: now - 12 * dayMs,
      lastInteractedAt: now - 2 * dayMs,
      totalSessionsCount: 7,
      highestRiskScoreObserved: 10.0,
      lastKnownStatus: 'REQUIRES_REMEDIATION',
    };

    const dev3: TargetDeviceProfile = {
      deviceId: 'XIAOMI_13T_SERVICING_003',
      hardwareSerial: 'HW-SN-772109',
      manufacturer: 'Xiaomi',
      model: '13T Pro',
      androidVersion: 'Android 14 (API 34)',
      buildFingerprint: 'xiaomi/aristotle/aristotle:14/UKQ1.230917.001/V816.0.2.0.UMLEUXM:user/release-keys',
      securityPatchLevel: '2024-01-01',
      selinuxPosture: 'ENFORCING',
      avbState: 'LOCKED_GREEN',
      rootFramework: 'NONE',
      firstInteractedAt: now - 2 * dayMs,
      lastInteractedAt: now - 3 * 3600 * 1000,
      totalSessionsCount: 2,
      highestRiskScoreObserved: 4.8,
      lastKnownStatus: 'ACTIVE_CONNECTED',
    };

    this.deviceStore.set(dev1.deviceId, dev1);
    this.deviceStore.set(dev2.deviceId, dev2);
    this.deviceStore.set(dev3.deviceId, dev3);

    // Seed session records
    this.sessionStore.set(dev1.deviceId, [
      {
        sessionId: 'SESS_882910',
        deviceId: dev1.deviceId,
        technicianId: 'TECH_LEAD_01',
        connectionMode: 'REMOTE_USB_OTG',
        startTime: now - 1 * dayMs,
        durationSeconds: 340,
        commandsExecutedCount: 12,
        remediationsApplied: ['REMED_SELINUX_ENFORCE'],
        cveCountDetected: 1,
        riskScore: 2.1,
        activeConsentScopes: ['READ_TELEMETRY', 'ASSESS_HOST', 'REMEDIATE_SELINUX'],
        isBreakGlassUsed: false,
        ledgerBlockHash: '0xa482e10c73b9e4a810f2...',
        summaryNotes: 'Routine diagnostic and SELinux posture enforcement over USB OTG.',
      },
    ]);

    this.sessionStore.set(dev2.deviceId, [
      {
        sessionId: 'SESS_441209',
        deviceId: dev2.deviceId,
        technicianId: 'TECH_ADMIN_02',
        connectionMode: 'REMOTE_USB_OTG',
        startTime: now - 2 * dayMs,
        durationSeconds: 890,
        commandsExecutedCount: 28,
        remediationsApplied: ['REMED_SELINUX_ENFORCE', 'REMED_REVOKE_DEBUG', 'REMED_USB_LOCKDOWN'],
        cveCountDetected: 4,
        riskScore: 10.0,
        activeConsentScopes: ['*'],
        isBreakGlassUsed: true,
        ledgerBlockHash: '0x21b13ce88e10c49a712...',
        summaryNotes: 'Emergency Break-Glass recovery executed on unpatched target with KernelSU.',
      },
    ]);
  }
}
