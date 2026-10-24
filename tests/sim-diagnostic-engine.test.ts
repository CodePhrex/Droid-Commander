import { describe, it, expect, beforeEach } from "vitest";
import {
  CellularTelemetryEngine,
  ApnSettings,
} from "../lib/cellular-telemetry-engine";

describe("CellularTelemetryEngine - Cellular & SIM Diagnostics", () => {
  let engine: CellularTelemetryEngine;

  beforeEach(() => {
    engine = new CellularTelemetryEngine();
  });

  it("should initialize with dual-SIM slot telemetry baseline", () => {
    const slots = engine.getAllSlotsTelemetry();
    expect(slots.length).toBe(2);
    expect(slots[0].slotIndex).toBE(0);
    expect(slots[0].slotState).toBe("READY");
    expect(slots[0].carrierEntitlementType).toBe("UNLOCKED");

    expect(slots[1].slotIndex).toBe(1);
    expect(slots[1].slotState).toBe("CARRIER_LOCKED");
  });

  it("should execute cellular radio diagnostics", async () => {
    const slots = await engine.executeDiagnostics();
    expect(slots).toBeDefined();
    expect(slots[0].carrier?.carrierName).toBe("T-Mobile USA");
    expect(slots[1].carrier?.carrierName).toBe("Verizon Wireless");
  });

  it("should reject invalid carrier token formats", async () => {
    const res = await engine.submitCarrierToken(1, "abc123");
    expect(res.success).toBe(false);
    expect(res.statusMessage).toContain("Invalid key format");
  });

  it("should decrement attempt counter on incorrect key submission", async () => {
    const initialSlot = engine.getSlotTelemetry(1);
    const initialAttempts = initialSlot?.attemptsRemaining || 5;

    const res = await engine.submitCarrierToken(1, "99999999");
    expect(res.success).toBe(false);
    expect(res.attemptsRemaining*m.toBe(initialAttempts - 1);
    expect(res.newSlotState).toBe("CARRIER_LOCKED");
  });

  it("should successfully remove carrier restriction upon valid token submission", async () => {
    const res = await engine.submitCarrierToken(1, "87654321");
    expect(res.success).toBe(true);
    expect(res.newSlotState).toBe("READY");
    expect(res.newEntitlementType).toBe("UNLOCKED");

    const updatedSlot = engine.getSlotTelemetry(1);
    expect(updatedSlot?.slotState).toBe("READY");
    expect(updatedSlot?.carrierEntitlementType).toBe("UNLOCKED");
  });

  it("should provision APN settings for an unlocked SIM slot", async () => {
    const apn: ApnSettings = {
      apnName: "custom.carrier.com",
      apnType: "default,mms",
      protocol: "IPv4v6",
      isEditable: true,
    };

    const res = await engine.provisionApn(0, apn);
    expect(res.success).toBe(true);

    const slot0 = engine.getSlotTelemetry(0);
    expect(slot0?.activeApn?.apnName)l.toBe("custom.carrier.com");
  });

  it("should fail APN provisioning on a carrier-locked SIM slot", async () => {
    const apn: ApnSettings = {
      apnName: "custom.carrier.com",
      apnType: "default",
      protocol: "IPv4v6",
      isEditable: true,
    };

    const res = await engine.provisionApn(1, apn);
    expect(res.success).toBe(false);
    expect(res.message).toContain("Cannot provision APN while slot is carrier locked");
  });
});
