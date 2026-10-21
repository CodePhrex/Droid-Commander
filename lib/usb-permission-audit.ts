import * as Crypto from "expo-crypto";

import { mobilePrivilegedActionLedger } from "./native-privileged-action-ledger";
import type { PrivilegedActionEvent } from "./privileged-action-core";

export const USB_PERMISSION_EVENT_TYPES = [
  "permission-requested",
  "permission-granted",
  "permission-denied",
  "permission-rejected",
  "permission-revoked",
  "device-detached",
] as const;

export type UsbPermissionEventType = (typeof USB_PERMISSION_EVENT_TYPES)[number];

export type UsbPermissionAuditContext = {
  operatorId: string;
  organizationId: string;
  consentReference?: string;
  ticketReference?: string;
};

export type UsbPermissionAuditInput = UsbPermissionAuditContext & {
  type: UsbPermissionEventType;
  deviceName: string;
  recordedAt?: string;
};

export type UsbPermissionAuditResult = {
  event: PrivilegedActionEvent;
  deviceFingerprint: string;
};

const FINGERPRINT_PREFIX = "droidcmd:usb-device:v1:";
const REDACTED_DEVICE_LABEL = "approved USB companion device";

function requireSafeIdentifier(label: string, value: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  if (normalized.length > 256) throw new Error(`${label} is too long.`);
  if(/[\r\n\u0000]/.test(normalized)) throw new Error(`${label} contains unsupported control characters.`);
  return normalized;
}

function eventResult(type: UsbPermissionEventType) {
  switch (type) {
    case "permission-requested":
      return "requested" as const;
    case "permission-granted":
      return "approved" as const;
    case "permission-denied":
    case "permission-rejected":
    case "permission-revoked":
      return "denied" as const;
    case "device-detached":
      return "completed" as const;
  }
}

function eventSummary(type: UsbPermissionEventType) {
  switch (type) {
    case "permission-requested": return "USB permission dialog requested for an approved companion device.";
    case "permission-granted": return "USB permission granted for an approved companion device.";
    case "permission-denied": return "USB permission denied by the device owner.";
    case "permission-rejected": return "USB permission request rejected by the local device policy.";
    case "permission-revoked": return "Previously granted USB permission is no longer available.";
    case "device-detached": return "Approved USB companion device detached from the controller.";
  }
}

/**
 * Produce a non-reversible, domain-separated identifier for the native device name.
 * The raw Android deviceName (which may contain a bus path or serial-like value) is
 * never written to the ledger, UI disclosure, or exception text.
 */
export async function fingerprintUsbDevice(deviceName: string): Promise<string> {
  const normalized = requireSafeIdentifier("deviceName", deviceName);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${FINGERPRINT_PREFIX}${normalized}`,
  );
  return `usb-${digest}`;
}

export async function recordUsbPermissionEvent(input: UsbPermissionAuditInput): Promise<UsbPermissionAuditResult> {
  if (!USB_PERMISSION_EVENT_TYPES.includes(input.type)) {
    throw new Error(`Unsupported USB permission event: ${input.type}.`);
  }

  const operatorId = requireSafeIdentifier("operatorId", input.operatorId);
  const organizationId = requireSafeIdentifier("organizationId", input.organizationId);
  const deviceFingerprint = await fingerprintUsbDevice(input.deviceName);
  const event = await mobilePrivilegedActionLedger.append({
    operatorId,
    organizationId,
    targetId: deviceFingerprint,
    action: "privileged-diagnostic",
    result: eventResult(input.type),
    summary: eventSummary(input.type),
    implementation: "Android UsbManager permission event adapter; no device mutation performed.",
    modifications: [
      "No device settings changed.",
      `USB permission event recorded: ${input.type}.`,
    ],
    consentReference: input.consentReference,
    ticketReference: input.ticketReference,
    recordedAt: input.recordedAt,
  });

  return { event, deviceFingerprint };
}

export const USB_AUDIT_REDACTED_DEVICE_LABEL = REDACTED_DEVICE_LABEL;
