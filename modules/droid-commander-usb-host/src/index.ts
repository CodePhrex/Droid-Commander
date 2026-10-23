import { requireOptionalNativeModule } from "expo-modules-core";

export type UsbHostEvent = {
  type: string;
  payload?: unknown;
};

export type UsbDeviceDescriptor = {
  deviceName: string;
  deviceId: number;
  vendorId: number;
  productId: number;
  deviceClass: number;
  interfaceCount: number;
  permissionGranted: boolean;
};

export type UsbBulkEndpointAvailability = {
  inputAvailable: boolean;
  outputAvailable: boolean;
  inOutPairAvailable: boolean;
};

/** A read-only, unfiltered inventory entry with no name, path, serial, or product string. */
export type UsbInventoryDevice = {
  /** Android assigns this identifier while the device is attached; it is not a serial number. */
  deviceId: number;
  vendorId: number;
  productId: number;
  deviceClass: number;
  interfaceClasses: number[];
  bulkEndpoints: UsbBulkEndpointAvailability;
  permissionGranted: boolean;
};

export type UsbDiagnostics = {
  /** The actual PackageManager FEATURE_USB_HOST value, or null when unavailable. */
  featureUsbHost: boolean | null;
  /** Number of currently enumerated USB devices before policy filtering, or null when unreadable. */
  rawCount: number | null;
  /** Unfiltered, privacy-limited entries; null when Android cannot read the list. */
  devices: UsbInventoryDevice[] | null;
  readOnly: true;
  limitations: string[];
};

export type RootStatus = {
  availability: "unknown" | "unavailable" | "manager-available" | "granted" | "denied";
  manager?: string;
  suPath?: string;
  reason: string;
};

export type RootGrant = {
  sessionId: string;
  targetId: string;
  scopes: string[];
  expiresAt: string;
  manager: string;
};

export type RawBootState = {
  manufacturer: string;
  model: string;
  device: string;
  product: string;
  bootloader: string;
  androidVersion: string;
  sdkInt: number;
  securityPatch: string;
  verifiedBootState?: string;
  flashLocked?: string;
  vbmetaDeviceState?: string;
  verityMode?: string;
  oemUnlockAllowed?: string;
};

export type DebugState = {
  developerOptionsEnabled: boolean;
  adbEnabled: boolean;
  oemUnlockAllowed: string;
  debuggableBuild: boolean;
  readOnly: true;
};

export type RawLocalDeviceState = {
  manufacturer: string | null;
  brand: string | null;
  model: string | null;
  device: string | null;
  product: string | null;
  androidVersion: string | null;
  sdkInt: number | null;
  securityPatch: string | null;
  buildId: string | null;
  buildDisplay: string | null;
  buildType: string | null;
  bootloader: string | null;
  supportedAbis: string[] | null;
  systemBuildFingerprint: string | null;
  verifiedBootState: string | null;
  flashLocked: string | null;
  vbmetaDeviceState: string | null;
  verityMode: string | null;
  developerOptionsEnabled: boolean | null;
  adbEnabled: boolean | null;
  secureScreenLock: boolean | null;
  deviceLocked: boolean | null;
  usbHostSupported: boolean | null;
  usbAccessorySupported: boolean | null;
  usbDeviceCount: number | null;
  appInstallRequestsAllowed: boolean | null;
  totalMemoryBytes: number | null;
  appStorageTotalBytes: number | null;
  appStorageAvailableBytes: number | null;
  appVersion: string | null;
  collectedAt: string | null;
  limitations: string[];
};

type NativeUsbHostModule = {
  addListener(eventName: "onUsbHostEvent", listener: (event: UsbHostEvent) => void): { remove(): void };
  startDiscovery(vendorIds: number[], productIds: number[], interfaceClass: number): Promise<UsbDeviceDescriptor[]>;
  getUsbDiagnostics?: () => Promise<UsbDiagnostics | null>;
  requestPermission(deviceName: string): Promise<boolean>;
  connect(deviceName: string): Promise<boolean>;
  sendBase64(bytesBase64: string): Promise<boolean>;
  close(): Promise<void>;
  provisionBreakGlassTrustAnchor(issuerId: string, keyId: string, certificateBase64: string): Promise<boolean>;
  verifyBreakGlassSignature(payload: string, signatureBase64: string, issuerId: string, keyId: string): Promise<boolean>;
  provisionBreakGlassCredential(credentialJson: string): Promise<boolean>;
  hasProvisionedBreakGlassCredential(): Promise<boolean>;
  clearProvisionedBreakGlassCredential(): Promise<void>;
  detectRoot(): Promise<RootStatus>;
  requestRootSession(sessionId: string, targetId: string, scopes: string[], durationSeconds: number): Promise<RootGrant | { granted: false; reason: string }>;
  executeApprovedRootOperation(sessionId: string, operationId: string, parameters: Record<string, string>): Promise<{ ok: boolean; message: string; value?: string }>;
  closeRootSession(sessionId: string): Promise<void>;
  collectBootState(): Promise<RawBootState>;
  collectDebugState(): Promise<DebugState>;
  collectLocalDeviceState?: () => Promise<RawLocalDeviceState | null>;
  openDeveloperOptions(): Promise<boolean>;
};

const NativeUsbHost = requireOptionalNativeModule<NativeUsbHostModule>("DroidCommanderUsbHost");

export const isUsbHostAvailable = NativeUsbHost !== null;

export function startDiscovery(options: {
  vendorIds: number[];
  productIds: number[];
  interfaceClass: number;
}): Promise<UsbDeviceDescriptor[]> {
  return NativeUsbHost?.startDiscovery(options.vendorIds, options.productIds, options.interfaceClass) ?? Promise.resolve([]);
}

export function getUsbDiagnostics(): Promise<UsbDiagnostics | null> {
  return NativeUsbHost?.getUsbDiagnostics?.() ?? Promise.resolve(null);
}

export function requestPermission(deviceName: string) {
  return NativeUsbHost?.requestPermission(deviceName) ?? Promise.resolve(false);
}

export function connect(deviceName: string) {
  return NativeUsbHost?.connect(deviceName) ?? Promise.resolve(false);
}

export function sendPacket(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = globalThis.btoa(binary);
  return NativeUsbHost?.sendBase64(base64) ?? Promise.resolve(false);
}

export function close() {
  return NativeUsbHost?.close() ?? Promise.resolve();
}

export function addUsbHostListener(listener: (event: UsbHostEvent) => void) {
  return NativeUsbHost?.addListener("onUsbHostEvent", listener) ?? { remove: () => undefined };
}

export function provisionBreakGlassTrustAnchor(issuerId: string, keyId: string, certificateBase64: string) {
  return NativeUsbHost?.provisionBreakGlassTrustAnchor(issuerId, keyId, certificateBase64) ?? Promise.resolve(false);
}

export function verifyBreakGlassSignature(payload: string, signatureBase64: string, issuerId: string, keyId: string) {
  return NativeUsbHost?.verifyBreakGlassSignature(payload, signatureBase64, issuerId, keyId) ?? Promise.resolve(false);
}

export function provisionBreakGlassCredential(credentialJson: string) {
  return NativeUsbHost?.provisionBreakGlassCredential(credentialJson) ?? Promise.resolve(false);
}

export function hasProvisionedBreakGlassCredential() {
  return NativeUsbHost?.hasProvisionedBreakGlassCredential() ?? Promise.resolve(false);
}

export function clearProvisionedBreakGlassCredential() {
  return NativeUsbHost?.clearProvisionedBreakGlassCredential() ?? Promise.resolve();
}

export function detectRoot(): Promise<RootStatus> {
  return NativeUsbHost?.detectRoot() ?? Promise.resolve({ availability: "unavailable", reason: "The native root-capability module is not available on this platform." });
}

export function requestRootSession(sessionId: string, targetId: string, scopes: string[], durationSeconds: number) {
  return NativeUsbHost?.requestRootSession(sessionId, targetId, scopes, durationSeconds) ?? Promise.resolve({ granted: false as const, reason: "The native root-capability module is not available on this platform." });
}

export function executeApprovedRootOperation(sessionId: string, operationId: string, parameters: Record<string, string> = {}) {
  return NativeUsbHost?.executeApprovedRootOperation(sessionId, operationId, parameters) ?? Promise.resolve({ ok: false, message: "The native root-capability module is not available on this platform." });
}

export function closeRootSession(sessionId: string) {
  return NativeUsbHost?.closeRootSession(sessionId) ?? Promise.resolve();
}

export function collectBootState(): Promise<RawBootState> {
  return NativeUsbHost?.collectBootState() ?? Promise.resolve({
    manufacturer: "",
    model: "",
    device: "",
    product: "",
    bootloader: "",
    androidVersion: "",
    sdkInt: 0,
    securityPatch: "",
    verifiedBootState: "",
    flashLocked: "",
    vbmetaDeviceState: "",
    verityMode: "",
    oemUnlockAllowed: "",
  });
}

export function collectDebugState(): Promise<DebugState> {
  return NativeUsbHost?.collectDebugState() ?? Promise.resolve({ developerOptionsEnabled: false, adbEnabled: false, oemUnlockAllowed: "", debuggableBuild: false, readOnly: true });
}

export function collectLocalDeviceState(): Promise<RawLocalDeviceState | null> {
  return NativeUsbHost?.collectLocalDeviceState?.() ?? Promise.resolve(null);
}

export function openDeveloperOptions() {
  return NativeUsbHost?.openDeveloperOptions() ?? Promise.resolve(false);
}
