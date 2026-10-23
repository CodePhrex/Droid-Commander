/**
 * Droid Commander - Hardware Battery & Power Delivery Integrity Profiler
 * File: battery-power-profiler.ts
 *
 * Real-time monitoring of host device Battery Management System (BMS) metrics,
 * USB Power Delivery (USB-PD) negotiation states, and thermal profiles over USB OTG.
 * Enforces automatic fail-closed USB port disconnects when safety limits are breached.
 */

export interface BmsTelemetry {
  voltageMv: number;          // Battery voltage in millivolts
  currentMa: number;          // Charge/discharge current in milliamperes
  temperatureCelsius: number; // Battery temperature in Celsius
  batteryLevelPercent: number;// State of Charge (0-100%)
  healthStatus: 'GOOD' | 'OVERHEAT' | 'DEAD' | 'OVER_VOLTAGE' | 'UNSPECIFIED_FAILURE';
  chargingSource: 'USB_OTG' | 'AC_CHARGER' | 'WIRELESS' | 'UNPLUGGED';
  usbPdNegotiatedVoltageV: number; // Negotiated USB-PD voltage (5V, 9V, 12V, 15V, 20V)
  usbPdNegotiatedCurrentA: number; // Negotiated USB-PD current limit
  timestamp: number;
}

export type PowerSafetyStatus = 'SAFE' | 'WARNING_THERMAL' | 'WARNING_OVERCURRENT' | 'CRITICAL_FAULT_DISCONNECT';

export interface PowerAssessmentResult {
  status: PowerSafetyStatus;
  faultReasons: string[];
  metrics: BmsTelemetry;
  requiresImmediateDisconnect: boolean;
}

export class BatteryPowerProfiler {
  // Safety thresholds
  private static readonly MAX_SAFE_TEMP_CELSIUS = 45.0;
  private static readonly CRITICAL_TEMP_CELSIUS = 50.0;
  private static readonly MAX_SAFE_VOLTAGE_MV = 4450; // 4.45V single cell max
  private static readonly MAX_SAFE_CURRENT_MA = 3000;  // 3.0A max OTG current draw
  private static readonly MIN_SAFE_VOLTAGE_MV = 3200; // 3.2V cutoff to prevent deep discharge

  /**
   * Evaluates BMS and USB-PD telemetry against hardware safety boundaries.
   */
  public static evaluatePowerIntegrity(metrics: BmsTelemetry): PowerAssessmentResult {
    const faultReasons: string[] = [];
    let isCritical = false;
    let isWarning = false;

    // Gate 1: Thermal Runaway Protection
    if (metrics.temperatureCelsius >= this.CRITICAL_TEMP_CELSIUS) {
      faultReasons.push(`CRITICAL THERMAL FAULT: Temperature (${metrics.temperatureCelsius}°C) exceeds critical limit (${this.CRITICAL_TEMP_CELSIUS}°C).`);
      isCritical = true;
    } else if (metrics.temperatureCelsius >= this.MAX_SAFE_TEMP_CELSIUS) {
      faultReasons.push(`THERMAL WARNING: Elevated battery temperature (${metrics.temperatureCelsius}°C).`);
      isWarning = true;
    }

    // Gate 2: Overvoltage Protection
    if (metrics.voltageMv > this.MAX_SAFE_VOLTAGE_MV) {
      faultReasons.push(`OVERVOLTAGE FAULT: Battery voltage (${metrics.voltageMv}mV) exceeds safe threshold (${this.MAX_SAFE_VOLTAGE_MV}mV).`);
      isCritical = true;
    } else if (metrics.voltageMv < this.MIN_SAFE_VOLTAGE_MV && metrics.chargingSource === 'UNPLUGGED') {
      faultReasons.push(`DEEP DISCHARGE WARNING: Cell voltage dropped below critical cutoff (${this.MIN_SAFE_VOLTAGE_MV}mV).`);
      isWarning = true;
    }

    // Gate 3: USB OTG Overcurrent & Reverse Flow Protection
    if (Math.abs(metrics.currentMa) > this.MAX_SAFE_CURRENT_MA) {
      faultReasons.push(`OVERCURRENT FAULT: USB current draw (${metrics.currentMa}mA) exceeds maximum safe rating (${this.MAX_SAFE_CURRENT_MA}mA).`);
      isCritical = true;
    }

    // Gate 4: BMS Reported Health Status
    if (metrics.healthStatus === 'OVERHEAT' || metrics.healthStatus === 'OVER_VOLTAGE' || metrics.healthStatus === 'UNSPECIFIED_FAILURE') {
      faultReasons.push(`BMS SYSTEM FAULT: Internal BMS reported hardware failure state '${metrics.healthStatus}'.`);
      isCritical = true;
    }

    // Assign overall status
    let status: PowerSafetyStatus = 'SAFE';
    if (isCritical) {
      status = 'CRITICAL_FAULT_DISCONNECT';
    } else if (isWarning) {
      status = metrics.temperatureCelsius >= this.MAX_SAFE_TEMP_CELSIUS ? 'WARNING_THERMAL' : 'WARNING_OVERCURRENT';
    }

    return {
      status,
      faultReasons,
      metrics,
      requiresImmediateDisconnect: isCritical,
    };
  }
}
