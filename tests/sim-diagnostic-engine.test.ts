import { describe, it, expect, beforeEach } from "vitest";
import { CellularTelemetryEngine } from "../lib/cellular-telemetry-engine";

describe("CellularTelemetryEngine - Dual SIM & Carrier Diagnostics", () => {
  let engine: CellularTelemetryEngine;

  beforeEach(() => {
    engine = new CellularTelemetryEngine();
  });

  it("should initialize with default dual-SIM telemetry slots", async () => {
    const telemetry = await engine.getTelemetry();
    expect(telemetry.slots.length).toBe(2);
    expect(telemetry.slots[0].slotId).toBe(1);
    expect(telemetry.slots[1].slotId).toBe(2);
  });

  it("should report slot 1 as CARRIER_LOCKED by default", async () => {
    const telemetry = await engine.getTelemetry();
    const slot1 = telemetry.slots.find((s) => s.slotId === 1);
    expect(slot1).toBeDefined();
    expect(slot1?.slotState).toBe("CARRIER_LOCKED");
    expect(slot1?.carrierLockInfo?.isLocked).toBe(true);
  });

  it("should reject invalid carrier token and decrement attempts counter", async () => {
    const initialTelemetry = await engine.getTelemetry();
    const slot1 = initialTelemetry.slots.find((s) => s.slotId === 1);
    const initialAttempts = slot1?.carrierLockInfo?.attemptsRemaining ?? 5;

    const res = await engine.submitCarrierToken(1, "99999999");
    expect(res.success).toBe(false);
    expect(res.attemptsRemaining).toBe(initialAttempts - 1);
    expect(res.newSlotState).toBe("CARRIER_LOCKED");
  });

  it("should accept valid NCK key and unlock carrier slot", async () => {
    const res = await engine.submitCarrierToken(1, "12345678");
    expect(res.success).toBe(true);
    expect(res.newSlotState).toBe("READY");

    const updatedTelemetry = await engine.getTelemetry();
    const slot1 = updatedTelemetry.slots.find((s) => s.slotId === 1);
    expect(slot1?.slotState).toBe("READY");
    expect(slot1?.carrierLockInfo?.isLocked).toBe(false);
  });

  it("should provision APN settings successfully for unlocked slot", async () => {
    const apnRes = await engine.provisionApn(1, {
      apnName: "Custom Fast LTE",
      apnAddress: "fast.carrier.net",
      mcc: "310",
      mnc: "410",
      protocol: "IPv4v6",
    });
    expect(apnRes.success).toBe(true);
  });
});
