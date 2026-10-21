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

type NativeUsbHostModule = {
  addListener(eventName: "onUsbHostEvent", listener: (event: UsbHostEvent) => void): { remove(): void };
  startDiscovery(vendorIds: number[], productIds: number[], interfaceClass: number): Promise<UsbDeviceDescriptor[]>;
  requestPermission(deviceName: string): Promise<boolean>;
  connect(deviceName: string): Promise<boolean>;
  sendBase64(bytesBase64: string): Promise<boolean>;
  close(): Promise<void>;
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
