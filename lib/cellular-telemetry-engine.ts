/**
 * Droid Commander - Cellular Telemetry & Carrier Provisioning Engine
 * File: lib/cellular-telemetry-engine.ts
 */

import { PrivilegedActionLedger } from './privileged-action-ledger-schema';

export type SimSlotState =
  | 'ABSENT'
  | 'READY'
  | 'PIN_REQUIRED'
  | 'PUK_REQUIRED'
  | 'CARRIER_LOCKED'
  | 'PERM_DISABLED';

export interface CarrierLockInfo {
  isLocked: boolean;
  lockType: 'NCK' | 'NSCK' | 'SPCK' | 'CCK' | 'NONE';
  lockingMccMnc: string; // e.g., "310-410"
  lockingOperatorName: string;
  attemptsRemaining: number;
}

export interface SimSlotTelemetry {
  slotId: number;
  slotState: SimSlotState;
  iccidMasked: string;
  carrierName: string;
  mccMnc: string;
  networkGeneration: '5G_SA' | '5G_NSA' | 'LTE' | '3G' | 'NONE';
  signalQuality: {
    rsrpDbm: number;
    rsrqDb: number;
    rssiDbm: number;
    signalLevelBars: number; // 0-4
  };
  carrierLockInfo?: CarrierLockInfo;
}

export interface HostCellularTelemetry {
  deviceId: string;
  isRadioOn: boolean;
  slots: SimSlotTelemetry[];
  activeDataSlotId: number;
  timestamp: number;
}

export interface ApnConfiguration {
  apnName: string;
  apnAddress: string;
  mcc: string;
  mnc: string;
  protocol: 'IPv4' | 'IPv6' | 'IPv4v6';
}

export class CellularTelemetryEngine {
  private telemetryState: HostCellularTelemetry;

  constructor() {
    this.telemetryState = {
      deviceId: 'HOST_CELLULAR_01',
      isRadioOn: true,
      activeDataSlotId: 1,
      slots: [
        {
          slotId: 1,
          slotState: 'CARRIER_LOCKED',
          iccidMasked: '8901410321******1234',
          carrierName: 'Verizon Wireless (Locked)',
          mccMnc: '310-410',
          networkGeneration: '5G_NSA',
          signalQuality: {
            rsrpDbm: -92,
            rsrqDb: -11,
            rssiDbm: -75,
            signalLevelBars: 3,
          },
          carrierLockInfo: {
            isLocked: true,
            lockType: 'NCK',
            lockingMccMnc: '310-410',
            lockingOperatorName: 'Verizon Wireless',
            attemptsRemaining: 5,
          },
        },
        {
          slotId: 2,
          slotState: 'READY',
          iccidMasked: '8901260456******5678',
          carrierName: 'T-Mobile US',
          mccMnc: '310-260',
          networkGeneration: '5G_SA',
          signalQuality: {
            rsrpDbm: -84,
            rsrqDb: -8,
            rssiDbm: -68,
            signalLevelBars: 4,
          },
          carrierLockInfo: {
            isLocked: false,
            lockType: 'NONE',
            lockingMccMnc: '',
            lockingOperatorName: '',
            attemptsRemaining: 10,
          },
        },
      ],
      timestamp: Date.now(),
    };
  }

  public async getTelemetry(): Promise<HostCellularTelemetry> {
    return { ...this.telemetryState, timestamp: Date.now() };
  }

  public async submitCarrierToken(
    slotId: number,
    unlockToken: string
  ): Promise<{ success: boolean; attemptsRemaining: number; newSlotState: SimSlotState; message: string }> {
    const slot = this.telemetryState.slots.find((s) => s.slotId === slotId);
    if (!slot || !slot.carrierLockInfo) {
      return { success: false, attemptsRemaining: 0, newSlotState: 'ABSENT', message: 'Slot not found' };
    }

    if (!slot.carrierLockInfo.isLocked) {
      return {
        success: true,
        attemptsRemaining: slot.carrierLockInfo.attemptsRemaining,
        newSlotState: slot.slotState,
        message: 'Slot is already unlocked.',
      };
    }

    if (slot.carrierLockInfo.attemptsRemaining <= 0) {
      slot.slotState = 'PERM_DISABLED';
      return {
        success: false,
        attemptsRemaining: 0,
        newSlotState: 'PERM_DISABLED',
        message: 'Modem unlock counter exhausted. Permanent lock engaged.',
      };
    }

    // Official NCK key match simulation
    if (unlockToken === '12345678' || unlockToken === '87654321') {
      slot.slotState = 'READY';
      slot.carrierLockInfo.isLocked = false;
      slot.carrierLockInfo.attemptsRemaining = 10;
      slot.carrierName = 'Unlocked Network Carrier';

      try {
        await PrivilegedActionLedger.recordAction('CARRIER_UNLOCK_SUCCESS', {
          slotId,
          lockingMccMnc: slot.carrierLockInfo.lockingMccMnc,
          timestamp: Date.now(),
        });
      } catch (e) {}

      return {
        success: true,
        attemptsRemaining: 10,
        newSlotState: 'READY',
        message: 'Network subsidy key accepted. Device subsidy lock removed.',
      };
    } else {
      slot.carrierLockInfo.attemptsRemaining -= 1;
      if (slot.carrierLockInfo.attemptsRemaining <= 0) {
        slot.slotState = 'PERM_DISABLED';
      }

      try {
        await PrivilegedActionLedger.recordAction('CARRIER_UNLOCK_FAILED', {
          slotId,
          attemptsRemaining: slot.carrierLockInfo.attemptsRemaining,
          timestamp: Date.now(),
        });
      } catch (e) {}

      return {
        success: false,
        attemptsRemaining: slot.carrierLockInfo.attemptsRemaining,
        newSlotState: slot.slotState,
        message: `Invalid unlock key. ${slot.carrierLockInfo.attemptsRemaining} attempts remaining.`,
      };
    }
  }

  public async provisionApn(slotId: number, apn: ApnConfiguration): Promise<{ success: boolean; message: string }> {
    const slot = this.telemetryState.slots.find((s) => s.slotId === slotId);
    if (!slot) {
      return { success: false, message: 'Invalid slot ID' };
    }

    try {
      await PrivilegedActionLedger.recordAction('APN_PROVISIONED', {
        slotId,
        apnName: apn.apnName,
        apnAddress: apn.apnAddress,
        timestamp: Date.now(),
      });
    } catch (e) {}

    return { success: true, message: `APN ${apn.apnName} (${apn.apnAddress}) provisioned successfully.` };
  }
}
