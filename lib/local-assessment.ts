import type { RawLocalDeviceState, RootStatus } from "expo-droid-commander-usb-host";
import type { AssessmentStatus } from "../constants/commander";

export type LocalCheck = {
  id: string;
  label: string;
  status: AssessmentStatus;
  observed: boolean;
  category: "device" | "policy" | "application" | "transport";
  value: string;
  detail: string;
  source: string;
  limitation: string;
  action: string;
};

export type LocalAssessmentReport = {
  schemaVersion: 1;
  id: string;
  collectedAt: string;
  source: "android-native";
  scope: "local-host";
  readOnly: true;
  rootGrantRequested: false;
  host: RawLocalDeviceState;
  root: { availability: RootStatus["availability"]; reason: string };
  checks: LocalCheck[];
  summary: { observed: number; unknown: number; review: number; clear: number };
  limitations: string[];
};

export const PATCH_REVIEW_DAYS = 90;
const TEXT_FIELDS = [
  "manufacturer", "brand", "model", "device", "product", "androidVersion",
  "securityPatch", "buildId", "buildDisplay", "buildType", "bootloader",
  "systemBuildFingerprint", "verifiedBootState", "flashLocked", "vbmetaDeviceState",
  "verityMode", "appVersion", "collectedAt",
] as const;
const BOOLEAN_FIELDS = [
  "developerOptionsEnabled", "adbEnabled", "secureScreenLock", "deviceLocked",
  "usbHostSupported", "usbAccessorySupported", "appInstallRequestsAllowed",
] as const;
const NUMBER_FIELDS = [
  "sdkInt", "usbDeviceCount", "totalMemoryBytes", "appStorageTotalBytes", "appStorageAvailableBytes",
] as const;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() && value.length <= 1024 && !/[\u0000-\u001f]/.test(value)
    ? value.trim() : null;
}

/** Keep only known non-secret fields; never persist arbitrary native payloads. */
export function sanitizeLocalDeviceState(value: unknown): RawLocalDeviceState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!text(raw.collectedAt) || !Number.isFinite(Date.parse(String(raw.collectedAt)))) return null;
  const result: Record<string, unknown> = {};
  TEXT_FIELDS.forEach((field) => { result[field] = text(raw[field]); });
  BOOLEAN_FIELDS.forEach((field) => { result[field] = typeof raw[field] === "boolean" ? raw[field] : null; });
  NUMBER_FIELDS.forEach((field) => {
    result[field] = typeof raw[field] === "number" && Number.isFinite(raw[field]) && raw[field] >= 0
      ? raw[field] : null;
  });
  result.supportedAbis = Array.isArray(raw.supportedAbis)
    ? raw.supportedAbis.map(text).filter((item): item is string => item !== null).slice(0, 8) : null;
  // Collector limitations are supplemented below with the known app boundaries.
  // Unrecognized fields (including serials, USB paths and credentials) are dropped.
  result.limitations = [];
  return result as RawLocalDeviceState;
}

export function parsePatchDate(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === value ? date : null;
}

export function normalizeRootObservation(value: unknown): LocalAssessmentReport["root"] {
  const availability = value && typeof value === "object" ? (value as Record<string, unknown>).availability : null;
  if (availability === "manager-available") {
    return { availability, reason: "A known root-manager entry point was detected. Root permission was not requested or verified by this scan." };
  }
  if (availability === "unavailable") {
    return { availability, reason: "No known root-manager entry point was detected. This is not proof that the device is unrooted." };
  }
  return { availability: "unknown", reason: "Root-manager detection is unavailable. No root permission was requested." };
}

export function assessLocalDevice(raw: unknown, rootRaw: unknown, id: string, now: string): LocalAssessmentReport | null {
  const host = sanitizeLocalDeviceState(raw);
  if (!host) return null;
  const root = normalizeRootObservation(rootRaw);
  const checks: LocalCheck[] = [];
  const boolCheck = (
    field: "adbEnabled" | "developerOptionsEnabled" | "secureScreenLock" | "usbHostSupported" | "appInstallRequestsAllowed",
    label: string, category: LocalCheck["category"], trueStatus: AssessmentStatus,
    falseStatus: AssessmentStatus, source: string, limitation: string,
  ) => {
    const value = host[field];
    checks.push({
      id: field, label, category, value: value === null ? "Unknown / unavailable" : value ? "Yes" : "No",
      status: value === null ? "limited" : value ? trueStatus : falseStatus,
      observed: value !== null,
      source, limitation,
      detail: value === null ? "Android did not provide a readable value. No passing result is inferred." : `Android reports ${label.toLowerCase()}: ${value ? "yes" : "no"}.`,
      action: "Expand to inspect the collected evidence",
    });
  };
  const patchMs = parsePatchDate(host.securityPatch);
  const nowMs = Date.parse(now);
  const ageDays = patchMs === null || !Number.isFinite(nowMs) ? null : Math.floor((nowMs - patchMs) / 86_400_000);
  const validAge = ageDays !== null && ageDays >= 0;
  checks.push({
    id: "securityPatch", label: "Security patch level", category: "device",
    value: host.securityPatch ?? "Unknown / unavailable",
    status: !validAge ? "limited" : ageDays > PATCH_REVIEW_DAYS ? "review" : "clear",
    observed: validAge,
    source: "Build.VERSION.SECURITY_PATCH",
    detail: !validAge ? "Patch date is missing, invalid, or ahead of the controller clock; age cannot be assessed."
      : `Reported patch date is ${ageDays} day${ageDays === 1 ? "" : "s"} old. Local review threshold: ${PATCH_REVIEW_DAYS} days.`,
    limitation: "Patch age is a configurable-policy-style indicator, not a CVE diagnosis, exploitability test, or proof the latest Samsung update is installed. Device clock affects age.",
    action: "Cross-reference this patch date in Threat Intel",
  });
  boolCheck("adbEnabled", "USB debugging enabled", "device", "review", "clear", "Settings.Global.adb_enabled", "This is the local setting, not an active ADB connection or authorization to a remote host.");
  boolCheck("secureScreenLock", "Secure screen lock configured", "policy", "clear", "review", "KeyguardManager.isDeviceSecure", "This does not verify enterprise lock policy strength, the owner's identity, or biometric enrollment.");
  boolCheck("developerOptionsEnabled", "Developer options enabled", "device", "review", "clear", "Settings.Global.development_settings_enabled", "Enabled developer options may be intentional on a test device; this alone is not a vulnerability.");
  boolCheck("usbHostSupported", "USB Host feature declared", "transport", "clear", "limited", "PackageManager.FEATURE_USB_HOST", "The declared feature does not prove cable integrity, host power, active USB role, or Droid Commander peer compatibility.");
  boolCheck("appInstallRequestsAllowed", "This app can request APK installs", "application", "review", "clear", "PackageManager.canRequestPackageInstalls", "Scoped only to Droid Commander. It is not a global unknown-sources or other-app posture check.");
  checks.push({
    id: "root", label: "Root-manager availability", category: "device",
    value: root.availability === "manager-available" ? "Entry point detected; no grant requested" : root.availability === "unavailable" ? "No known entry point detected" : "Unknown / unavailable",
    status: root.availability === "manager-available" ? "review" : "limited",
    observed: root.availability !== "unknown",
    detail: root.reason, source: "Existing native RootCapabilityProvider.detect",
    limitation: "Detection checks known executable locations only; hidden or differently configured root managers may not be detected. A scan never creates a root session.",
    action: "Root operations require a separately authorized scoped session",
  });
  const bootValue = host.verifiedBootState;
  const bootRecognized = bootValue !== null && ["green", "yellow", "orange", "red"].includes(bootValue);
  checks.push({
    id: "verifiedBoot", label: "Reported verified-boot state", category: "device",
    value: bootValue ?? "Unknown / unavailable",
    status: !bootRecognized ? "limited" : bootValue === "green" ? "clear" : "review",
    observed: bootRecognized,
    detail: bootRecognized ? `Firmware reports verified boot: ${bootValue}.` : "No recognized verified-boot value was exposed to the app.",
    source: "Fixed read-only ro.boot.verifiedbootstate property",
    limitation: "A local reported property is not remote hardware attestation. Reading it does not permit unlocking or flashing.",
    action: "Inspect firmware identity below",
  });
  const limitations = [
    "Local host only. No connected target was assessed.",
    "Read-only collection. No root session, USB permission, setting change, or device mutation was requested.",
    "No serial, IMEI, MAC address, account data, installed-package inventory, credential, or raw USB path is stored.",
    "Missing readings remain unknown. Reported firmware properties are not hardware attestation.",
    "CVE correlation is a separate evidence-based catalog comparison, not exploit execution or proof of exploitability.",
  ];
  return {
    schemaVersion: 1, id, collectedAt: host.collectedAt ?? now, source: "android-native", scope: "local-host",
    readOnly: true, rootGrantRequested: false, host, root, checks,
    summary: {
      observed: checks.filter((check) => check.observed).length,
      unknown: checks.filter((check) => !check.observed).length,
      review: checks.filter((check) => check.status === "review" || check.status === "critical").length,
      clear: checks.filter((check) => check.status === "clear").length,
    },
    limitations,
  };
}

export function hostIdentity(host: RawLocalDeviceState | null | undefined): string {
  return host ? [host.manufacturer, host.model].filter(Boolean).join(" ") || "Local Android host" : "Host not yet assessed";
}

export function hostInformationRows(report: LocalAssessmentReport): { label: string; value: string }[] {
  const h = report.host;
  const yesNo = (v: boolean | null) => v === null ? "Unknown" : v ? "Yes" : "No";
  const bytes = (v: number | null) => v === null ? "Unknown" : `${(v / (1024 ** 3)).toFixed(2)} GiB`;
  return [
    { label: "Device", value: hostIdentity(h) },
    { label: "Android / SDK", value: `${h.androidVersion ?? "Unknown"} / ${h.sdkInt ?? "Unknown"}` },
    { label: "Firmware / build", value: h.buildDisplay ?? h.buildId ?? "Unknown" },
    { label: "Build ID / type", value: `${h.buildId ?? "Unknown"} / ${h.buildType ?? "Unknown"}` },
    { label: "Product / device", value: `${h.product ?? "Unknown"} / ${h.device ?? "Unknown"}` },
    { label: "Security patch", value: h.securityPatch ?? "Unknown" },
    { label: "Bootloader version", value: h.bootloader ?? "Unknown" },
    { label: "Verified boot / vbmeta", value: `${h.verifiedBootState ?? "Unknown"} / ${h.vbmetaDeviceState ?? "Unknown"}` },
    { label: "Flash lock / verity", value: `${h.flashLocked ?? "Unknown"} / ${h.verityMode ?? "Unknown"}` },
    { label: "CPU ABIs", value: h.supportedAbis?.join(", ") || "Unknown" },
    { label: "RAM", value: bytes(h.totalMemoryBytes) },
    { label: "App-volume storage / free", value: `${bytes(h.appStorageTotalBytes)} / ${bytes(h.appStorageAvailableBytes)}` },
    { label: "Screen currently locked", value: yesNo(h.deviceLocked) },
    { label: "USB Host / Accessory", value: `${yesNo(h.usbHostSupported)} / ${yesNo(h.usbAccessorySupported)}` },
    { label: "Enumerated USB devices", value: h.usbDeviceCount === null ? "Unknown" : String(h.usbDeviceCount) },
    { label: "Root-manager status", value: report.root.availability },
    { label: "App version", value: h.appVersion ?? "Unknown" },
    { label: "Collected", value: report.collectedAt },
    { label: "System build fingerprint", value: h.systemBuildFingerprint ?? "Unknown" },
  ];
}

function escapeMarkdown(value: string): string { return value.replace(/[\\`*_{}\[\]<>|]/g, "\\$&").replace(/[\r\n]+/g, " "); }
export function renderLocalAssessmentMarkdown(report: LocalAssessmentReport): string {
  const lines = [
    "# Droid Commander — Local Host Assessment", "",
    `Report ID: ${escapeMarkdown(report.id)}`, `Source: ${report.source}`,
    `Collected: ${report.collectedAt}`, "Scope: local host; read-only",
    "Root grant requested: no", "Owner consent for a remote target: not claimed", "", "## Host information", "",
    ...hostInformationRows(report).map((row) => `- ${row.label}: ${escapeMarkdown(row.value)}`), "", "## Checks", "",
    ...report.checks.flatMap((check) => [
      `### ${check.label} — ${check.status.toUpperCase()}`, `Value: ${escapeMarkdown(check.value)}`,
      `Evidence source: ${check.source}`, escapeMarkdown(check.detail), `Limitation: ${check.limitation}`, "",
    ]), "## Limitations", "", ...report.limitations.map((line) => `- ${line}`), "",
    "Storage: app-private AsyncStorage. Not encrypted by this feature and not hardware-attested.", "",
  ];
  return lines.join("\n");
}
