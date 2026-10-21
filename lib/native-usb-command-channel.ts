import {
  addUsbHostListener,
  sendPacket,
} from "expo-droid-commander-usb-host";

import { UsbCommandChannel, type UsbCommandChannelOptions } from "./usb-command-channel";

export function createNativeUsbCommandChannel(options: UsbCommandChannelOptions) {
  return new UsbCommandChannel({ sendPacket, addUsbHostListener }, options);
}
