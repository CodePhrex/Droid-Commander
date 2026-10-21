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

export type SupportedDeviceProfile = {
  profileId: string;
  manufacturer: string;
  models: readonly string[];
  products?: readonly string[];
};

export type BootloaderLockState = "locked" | "unlocked" | "unknown";
export type VerifiedBootState = "green" | "yellow" | "orange" | "red" | "unknown";

export type BootStateReport = RawBootState & {
  support: "supported" | "unsupported";
  matchedProfileId?: string;
  bootloaderLockState: BootloaderLockState;
  verifiedBoot: VerifiedBootState;
  oemUnlock: "allowed" | "disallowed" | "unknown";
  collectionBoundary: "read-only";
  flashingAvailable: false;
  unlockingAvailable: false;
  dataWipeWarningRequired: true;
};

function normalized(value: string | undefined) { return value?.trim().toLowerCase() ?? ""; }

function bootloaderLockState(raw: RawBootState): BootloaderLockState {
  const flashLocked = normalized(raw.flashLocked);
  if (["1", "true", "locked"].includes(flashLocked)) return "locked";
  if (["0", "false", "unlocked"].includes(flashLocked)) return "unlocked";
  const deviceState = normalized(raw.vbmetaDeviceState);
  if (deviceState === "locked") return "locked";
  if (deviceState === "unlocked") return "unlocked";
  return "unknown";
}

function verifiedBoot(raw: RawBootState): VerifiedBootState {
  const value = normalized(raw.verifiedBootState);
  return ["green", "yellow", "orange", "red"].includes(value) ? value as VerifiedBootState : "unknown";
}

function oemUnlock(raw: RawBootState): BootStateReport["oemUnlock"] {
  const value = normalized(raw.oemUnlockAllowed);
  if (["1", "true", "allowed"].includes(value)) return "allowed";
  if (["0", "false", "disallowed"].includes(value)) return "disallowed";
  return "unknown";
}

function matchProfile(raw: RawBootState, profiles: readonly SupportedDeviceProfile[]) {
  return profiles.find((profile) => normalized(profile.manufacturer) === normalized(raw.manufacturer)
    && profile.models.some((model) => normalized(model) === normalized(raw.model))
    && (!profile.products || profile.products.length === 0 || profile.products.some((product) => normalized(product) === normalized(raw.product))));
}

export function normalizeBootState(raw: RawBootState, profiles: readonly SupportedDeviceProfile[]): BootStateReport {
  const profile = matchProfile(raw, profiles);
  return {
    ...raw,
    support: profile ? "supported" : "unsupported",
    matchedProfileId: profile?.profileId,
    bootloaderLockState: bootloaderLockState(raw),
    verifiedBoot: verifiedBoot(raw),
    oemUnlock: oemUnlock(raw),
    collectionBoundary: "read-only",
    flashingAvailable: false,
    unlockingAvailable: false,
    dataWipeWarningRequired: true,
  };
}
