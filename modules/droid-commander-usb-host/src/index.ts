import { requireNativeModule } from "expo-modules-core";

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

const NativeUsbHost = requireNativeModule<NativeUsbHostModule>("DroidCommanderUsbHost");

export function startDiscovery(options: {
  vendorIds: number[];
  productIds: number[];
  interfaceClass: number;
}): Promise<UsbDeviceDescriptor[]> {
  return NativeUsbHost.startDiscovery(options.vendorIds, options.productIds, options.interfaceClass);
}

export function requestPermission(deviceName: string) {
  return NativeUsbHost.requestPermission(deviceName);
}

export function connect(deviceName: string) {
  return NativeUsbHost.connect(deviceName);
}

export function sendPacket(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = globalThis.btoa(binary);
  return NativeUsbHost.sendBase64(base64);
}

export function close() {
  return NativeUsbHost.close();
}

export function addUsbHostListener(listener: (event: UsbHostEvent) => void) {
  return NativeUsbHost.addListener("onUsbHostEvent", listener);
}
