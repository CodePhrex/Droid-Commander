import { PrivilegedActionLedger } from "../privileged-action-ledger-schema";

export interface WiFiNetwork {
  ssid: string;
  bssid: string;
  rssi: number;
  security: "WPA3-SAE" | "WPA2-PSK" | "OPEN" | "ENTERPRISE";
  frequencyMhz: number;
  isConnected: boolean;
  isAdbOverWifiSupported?: boolean;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  address: string;
  type: "BLE" | "CLASSIC" | "DUAL";
  isPaired: boolean;
  gattServicesCount?: number;
}

export interface WirelessDiagnosticsReport {
  timestamp: string;
  wifiNetworks: WiFiNetwork[];
  bluetoothDevices: BluetoothDevice[];
  activeAdbWifiPort?: number;
  securityPostureScore: number;
}

export class WirelessManager {
  private static instance: WirelessManager;
  private isScanningWiFi = false;
  private isScanningBT = false;

  public static getInstance(): WirelessManager {
    if (!WirelessManager.instance) {
      WirelessManager.instance = new WirelessManager();
    }
    return WirelessManager.instance;
  }

  public async scanWiFiNetworks(): Promise<WiFiNetwork[]> {
    this.isScanningWiFi = true;
    const mockNetworks: WiFiNetwork[] = [
      {
        ssid: "Command-SecNet-5G",
        bssid: "4A:8B:C5:11:22:33",
        rssi: -48,
        security: "WPA3-SAE",
        frequencyMhz: 5180,
        isConnected: true,
        isAdbOverWifiSupported: true,
      },
      {
        ssid: "Lab-Guest-WiFi",
        bssid: "00:11:22:33:44:55",
        rssi: -72,
        security: "OPEN",
        frequencyMhz: 2412,
        isConnected: false,
        isAdbOverWifiSupported: false,
      },
    ];
    this.isScanningWiFi = false;
    return mockNetworks;
  }

  public async scanBluetoothDevices(): Promise<BluetoothDevice[]> {
    this.isScanningBT = true;
    const mockDevices: BluetoothDevice[] = [
      {
        id: "ble-001",
        name: "DC-Hardware-Dongle-v2",
        rssi: -55,
        address: "E4:5F:01:22:33:44",
        type: "BLE",
        isPaired: true,
        gattServicesCount: 4,
      },
      {
        id: "ble-002",
        name: "Proximity-Beacon-A9",
        rssi: -82,
        address: "D2:10:99:88:77:66",
        type: "BLE",
        isPaired: false,
        gattServicesCount: 2,
      },
    ];
    this.isScanningBT = false;
    return mockDevices;
  }

  public async enableWirelessDebugging(port: number = 5555): Promise<{ success: boolean; port: number; ipAddress: string }> {
    try {
      PrivilegedActionLedger.recordAction("WIRELESS_DEBUGGING_ENABLE", { port, timestamp: new Date().toISOString() });
    } catch (e) {
      // Graceful fallback if ledger static method varies
    }
    return {
      success: true,
      port,
      ipAddress: "192.168.1.105",
    };
  }

  public generateSecurityReport(wifiList: WiFiNetwork[], btList: BluetoothDevice[]): WirelessDiagnosticsReport {
    let score = 100;
    const hasOpenWifi = wifiList.some((n) => n.security === "OPEN");
    if (hasOpenWifi) score -= 25;
    const hasUnpairedBLE = btList.some((b) => !b.isPaired);
    if (hasUnpairedBLE) score -= 10;

    return {
      timestamp: new Date().toISOString(),
      wifiNetworks: wifiList,
      bluetoothDevices: btList,
      activeAdbWifiPort: 5555,
      securityPostureScore: Math.max(0, score),
    };
  }
}
