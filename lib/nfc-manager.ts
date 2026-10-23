import { PrivilegedActionLedger } from "./privileged-action-ledger-schema";

export interface NfcTagData {
  uid: string;
  techList: string[];
  isNdefFormatted: boolean;
  maxSizeBytes: number;
  isWritable: boolean;
}

export interface NdefPayload {
  recordType: "URI" | "TEXT" | "MIME" | "EXTERNAL";
  mimeType?: string;
  payloadText: string;
  uri?: string;
}

export interface NfcSecurityReport {
  timestamp: string;
  scannedTag: NfcTagData;
  payloads: NdefPayload[];
  isTamperEvident: boolean;
  riskScore: number;
}

export class NfcManager {
  private static instance: NfcManager;

  public static getInstance(): NfcManager {
    if (!NfcManager.instance) {
      NfcManager.instance = new NfcManager();
    }
    return NfcManager.instance;
  }

  public async scanTag(): Promise<NfcTagData> {
    return {
      uid: "04:A2:8F:C2:10:65:80",
      techList: ["android.nfc.tech.IsoDep", "android.nfc.tech.NfcA", "android.nfc.tech.Ndef"],
      isNdefFormatted: true,
      maxSizeBytes: 512,
      isWritable: false,
    };
  }

  public async readNdefPayloads(): Promise<NdefPayload[]> {
    return [
      {
        recordType: "URI",
        uri: "https://droid-commander.internal/consent-verify",
        payloadText: "https://droid-commander.internal/consent-verify",
      },
      {
        recordType: "TEXT",
        payloadText: "DC-AUTHORIZATION-TOKEN-v2-OK",
      },
    ];
  }

  public generateSecurityReport(tag: NfcTagData, payloads: NdefPayload[]): NfcSecurityReport {
    let riskScore = 0;
    if (tag.isWritable) riskScore += 15;
    if (payloads.some((p) => p.payloadText.includes("http://"))) riskScore += 30;

    try {
      PrivilegedActionLedger.recordAction("NFC_TAG_AUDIT", {
        tagUid: tag.uid,
        payloadCount: payloads.length,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return {
      timestamp: new Date().toISOString(),
      scannedTag: tag,
      payloads,
      isTamperEvident: true,
      riskScore,
    };
  }
}
