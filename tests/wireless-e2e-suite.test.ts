import { describe, it, expect } from "vitest";
import { WirelessManager } from "../lib/wireless-manager";
import { CellularManager } from "../lib/cellular-manager";
import { NfcManager } from "../lib/nfc-manager";

describe("Unified Wireless & Connectivity E2E Integration Suite", () => {
  it("should execute end-to-end multi-channel diagnostic workflow across Wi-Fi, BLE, Cellular, and NFC", async () => {
    const wifiManager = WirelessManager.getInstance();
    const cellularManager = CellularManager.getInstance();
    const nfcManager = NfcManager.getInstance();

    const wifiNetworks = await wifiManager.scanWiFiNetworks();
    const btDevices = await wifiManager.scanBluetoothDevices();
    const wifiReport = wifiManager.generateSecurityReport(wifiNetworks, btDevices);

    const sims = await cellularManager.getSimCardStatus();
    const cellTower = await cellularManager.getCellTowerMetrics();
    const cellularReport = cellularManager.generateReport(sims, cellTower);

    const nfcTag = await nfcManager.scanTag();
    const ndefPayloads = await nfcManager.readNdefPayloads();
    const nfcReport = nfcManager.generateSecurityReport(nfcTag, ndefPayloads);

    expect(wifiReport.securityPostureScore).toBeGreaterThan(0);
    expect(cellularReport.signalQualityScore).toBeGreaterThan(0);
    expect(nfcReport.isTamperEvident).toBe(true);

    const adbRes = await wifiManager.enableWirelessDebugging(5555);
    expect(adbRes.success).toBe(true);
    expect(adbRes.port).toBe(5555);
  });
});
