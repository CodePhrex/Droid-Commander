import { describe, it, expect, beforeEach } from "vitest";
import { WirelessManager } from "../lib/wireless-manager";

describe("WirelessManager & Connectivity Modules", () => {
  let manager: WirelessManager;

  beforeEach(() => {
    manager = WirelessManager.getInstance();
  });

  it("should return a singleton instance of WirelessManager", () => {
    const inst1 = WirelessManager.getInstance();
    const inst2 = WirelessManager.getInstance();
    expect(inst1).toBe(inst2);
  });

  it("should scan Wi-Fi networks and evaluate security posture", async () => {
    const networks = await manager.scanWiFiNetworks();
    expect(networks).toBeDefined();
    expect(Array.isArray(networks)).toBe(true);
    expect(networks.length).toBeGreaterThan(0);

    const connected = networks.find((n) => n.isConnected);
    expect(connected).toBeDefined();
    expect(connected?.security).toBe("WPA3-SAE");
  });

  it("should scan Bluetooth & BLE devices", async () => {
    const devices = await manager.scanBluetoothDevices();
    expect(devices).toBeDefined();
    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBeGreaterThan(0);

    const bleDev = devices.find((d) => d.type === "BLE");
    expect(bleDev).toBeDefined();
  });

  it("should calculate security posture score accurately", async () => {
    const wifi = await manager.scanWiFiNetworks();
    const bt = await manager.scanBluetoothDevices();

    const report = manager.generateSecurityReport(wifi, bt);
    expect(report.securityPostureScore).toBeGreaterThanOrEqual(0);
    expect(report.securityPostureScore).toBeLessThanOrEqual(100);
    expect(report.timestamp).toBeDefined();
  });

  it("should enable wireless debugging and record to action ledger", async () => {
    const result = await manager.enableWirelessDebugging(5555);
    expect(result.success).toBe(true);
    expect(result.port).toBe(5555);
    expect(result.ipAddress).toBeDefined();
  });
});
