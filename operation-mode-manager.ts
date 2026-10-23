/**
 * Droid Commander - Operation Mode Manager
 * File: operation-mode-manager.ts
 *
 * Manages dual-mode operational switching between:
 *  1) LOCAL_HOST_SELF: Servicing and auditing the local host Android device itself.
 *  2) REMOTE_TARGET_USB: Servicing an external target phone connected via USB OTG.
 *
 * Enforces mode-specific security boundaries, capability matrices, and audit logging.
 */

export type OperationMode = 'LOCAL_HOST_SELF' | 'REMOTE_TARGET_USB';

export interface ModeCapabilities {
  canAccessUsbOtg: boolean;
  canExecuteFastboot: boolean;
  canAuditLocalKeystore: boolean;
  canAssessLocalCves: boolean;
  canManageLocalSelinux: boolean;
  canMeasureLocalBms: boolean;
  requiresTwoPartyConsent: boolean;
  requiresBreakGlassForElevation: boolean;
}

export interface OperationModeState {
  activeMode: OperationMode;
  capabilities: ModeCapabilities;
  switchedAtTimestamp: number;
  switchedByTechnicianId: string;
  reason: string;
}

export interface ModeChangeEvent {
  previousMode: OperationMode;
  newMode: OperationMode;
  state: OperationModeState;
  auditBlockPayload: {
    eventType: 'OPERATION_MODE_CHANGED';
    previousMode: OperationMode;
    newMode: OperationMode;
    timestamp: number;
    technicianId: string;
    hash: string;
  };
}

export type ModeChangeListener = (event: ModeChangeEvent) => void;

export class OperationModeManager {
  private static instance: OperationModeManager;
  private currentState: OperationModeState;
  private listeners: ModeChangeListener[] = [];

  private static readonly CAPABILITY_MATRIX: Record<OperationMode, ModeCapabilities> = {
    LOCAL_HOST_SELF: {
      canAccessUsbOtg: false,
      canExecuteFastboot: false,
      canAuditLocalKeystore: true,
      canAssessLocalCves: true,
      canManageLocalSelinux: true,
      canMeasureLocalBms: true,
      requiresTwoPartyConsent: false, // Self-authorization via technician license
      requiresBreakGlassForElevation: true,
    },
    REMOTE_TARGET_USB: {
      canAccessUsbOtg: true,
      canExecuteFastboot: true,
      canAuditLocalKeystore: true,
      canAssessLocalCves: true,
      canManageLocalSelinux: true,
      canMeasureLocalBms: true,
      requiresTwoPartyConsent: true, // Strict owner consent required
      requiresBreakGlassForElevation: true,
    },
  };

  private constructor() {
    this.currentState = {
      activeMode: 'LOCAL_HOST_SELF',
      capabilities: OperationModeManager.CAPABILITY_MATRIX['LOCAL_HOST_SELF'],
      switchedAtTimestamp: Date.now(),
      switchedByTechnicianId: 'TECH-LOCAL-DEFAULT',
      reason: 'Initial system boot - local host default mode',
    };
  }

  public static getInstance(): OperationModeManager {
    if (!OperationModeManager.instance) {
      OperationModeManager.instance = new OperationModeManager();
    }
    return OperationModeManager.instance;
  }

  /**
   * Returns the currently active operation mode state.
   */
  public getCurrentState(): OperationModeState {
    return { ...this.currentState };
  }

  /**
   * Returns the active operation mode string.
   */
  public getActiveMode(): OperationMode {
    return this.currentState.activeMode;
  }

  /**
   * Returns the capability permissions for the active operation mode.
   */
  public getActiveCapabilities(): ModeCapabilities {
    return { ...this.currentState.capabilities };
  }

  /**
   * Switches the active operational mode.
   */
  public switchMode(
    newMode: OperationMode,
    technicianId: string,
    reason: string
  ): ModeChangeEvent {
    if (this.currentState.activeMode === newMode) {
      throw new Error(`System is already operating in ${newMode} mode.`);
    }

    const previousMode = this.currentState.activeMode;
    const now = Date.now();

    this.currentState = {
      activeMode: newMode,
      capabilities: OperationModeManager.CAPABILITY_MATRIX[newMode],
      switchedAtTimestamp: now,
      switchedByTechnicianId: technicianId,
      reason,
    };

    // Construct SHA-256 simulation block hash for Privileged Action Ledger
    const blockData = `${previousMode}:${newMode}:${now}:${technicianId}:${reason}`;
    const hash = this.computeSimpleHash(blockData);

    const event: ModeChangeEvent = {
      previousMode,
      newMode,
      state: this.getCurrentState(),
      auditBlockPayload: {
        eventType: 'OPERATION_MODE_CHANGED',
        previousMode,
        newMode,
        timestamp: now,
        technicianId,
        hash,
      },
    };

    // Notify registered UI / system listeners
    this.notifyListeners(event);

    return event;
  }

  /**
   * Subscribes to mode change events.
   */
  public subscribe(listener: ModeChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(event: ModeChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in mode change listener:', err);
      }
    }
  }

  private computeSimpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256_sim_${hex}_mode_switch`;
  }
}
