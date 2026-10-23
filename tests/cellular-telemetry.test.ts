import { describe, it, expect, beforeEach } from "vitest";
import { CellularManager } from "../lib/cellular-manager";

describe("CellularManager & SIM Telemetry Modules", () => {
  let manager: CellularManager;

  beforeEach(() => {
    manager = CellularManager.getInstance();
  });

  it("should return a singleton instance of CellularManager", () => {
    const inst1 = CellularManager.getInstance();
    const inst2 = CellularManager.getInstance();
    expect(inst1).toBe(inst2);
  });

  it("should retrieve active SIM card and eUICC status", async () => {
    const sims = await manager.getSimCardStatus();
    expect(sims).toBeDefined();
    expect(Array.isArray(sims)).toBe(true);
    expect(sims.length).toBeGreaterThan(0);
    expect(sims[0].carrierName).toContain("Verizon");
  });

  it("should fetch connected cell tower metrics", async () => {
    const tower = await manager.getCellTowerMetrics();
    expect(tower).toBeDefined();
    expect(tower.networkType).toBe("5G-NR");
    expect(tower.signalDbm).toBeLessThan(0);
  });

  it("should generate a telemetry report and calculate signal quality score", async () => {
    const sims = await manager.getSimCardStatus();
    const tower = await manager.getCellTowerMetrics();
    const report = manager.generateReport(sims, tower);

    expect(report.signalQualityScore).toBeGreaterThanOrEqual(0);
    expect(report.signalQualityScore).toBeLessThanOrEqual(100);
    expect(report.timestamp).toBeDefined();
  });
});
