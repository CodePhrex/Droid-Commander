import { collectBootState } from "expo-droid-commander-usb-host";

import { normalizeBootState, type BootStateReport, type SupportedDeviceProfile } from "./boot-state";

export async function collectSupportedBootState(profiles: readonly SupportedDeviceProfile[]): Promise<BootStateReport> {
  return normalizeBootState(await collectBootState(), profiles);
}
