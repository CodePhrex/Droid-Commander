import { collectDebugState, openDeveloperOptions, type DebugState } from "expo-droid-commander-usb-host";

import { requireDeveloperCapability, type OperatorDeveloperSession } from "./operator-developer-mode";

export async function inspectDebugState(session: OperatorDeveloperSession, now: string): Promise<DebugState> {
  requireDeveloperCapability(session, "view-usb-debug-status", now);
  return collectDebugState();
}

export async function openDeveloperSettings(session: OperatorDeveloperSession, now: string) {
  requireDeveloperCapability(session, "open-developer-settings", now);
  return openDeveloperOptions();
}
