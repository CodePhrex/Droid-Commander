import { PrivilegedActionLedger } from "./privileged-action-ledger-schema";

export interface SimCardStatus {
  slotIndex: number;
  state: "READY" | "ABSENT" | "LOCKED" | "NOT_READY";
  carrierName: string;
  iccid: string;
  isEsim: boolean;
  roaming: boolean;
}

export interface CellTowerInfo {
  mcc: string;
  mnc: string;
  lac: number;
  cellId: number;
  signalDbm: number;
  networkType: "5G-NR" | "LTE" | "3G" | "2G";
}

export interface CellularTelemetryReport {
  timestamp: string;
  sims: SimCardStatus[];
  connectedTower: CellTowerInfo;
  signalQualityScore: number;
}

export class CellularManager {
  private static instance: CellularManager;

  public static getInstance(): CellularManager {
    if (!CellularManager.instance) {
      CellularManager.instance = new CellularManager();
    }
    return CellularManager.instance;
  }

  public async getSimCardStatus(): Promise<SimCardStatus[]> {
    return [
      {
        slotIndex: 0,
        state: "READY",
        carrierName: "Verizon Wireless",
        iccid: "89014103211118510123",
        isEsim: false,
        roaming: false,
      },
      {
        slotIndex: 1,
        state: "READY",
        carrierName: "T-Mobile eUICC",
        iccid: "89012603211118599888",
        isEsim: true,
        roaming: false,
      },
    ];
  }

  public async getCellTowerMetrics(): Promise<CellTowerInfo> {
    return {
      mcc: "310",
      mnc: "410",
      lac: 4120,
      cellId: 8841021,
      signalDbm: -82,
      networkType: "5G-NR",
    };
  }

  public generateReport(sims: SimCardStatus[], tower: CellTowerInfo): CellularTelemetryReport {
    let score = 100;
    if (tower.signalDbm < -100) score -= 30;
    if (sims.some((s) => s.state === "LOCKED")) score -= 20;

    try {
      PrivilegedActionLedger.recordAction("CELLULAR_TELEMETRY_AUDIT", {
        simCount: sims.length,
        networkType: tower.networkType,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return {
      timestamp: new Date().toISOString(),
      sims,
      connectedTower: tower,
      signalQualityScore: Math.max(0, score),
    };
  }
}
