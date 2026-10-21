import { describe, expect, it } from "vitest";

import { normalizeBootState } from "../lib/boot-state";

const raw = {
  manufacturer: "ExampleOEM",
  model: "Example X1",
  device: "examplex1",
  product: "examplex1_global",
  bootloader: "1.2.3",
  androidVersion: "15",
  sdkInt: 35,
  securityPatch: "2026-10-05",
  verifiedBootState: "green",
  flashLocked: "1",
  vbmetaDeviceState: "locked",
  verityMode: "enforcing",
  oemUnlockAllowed: "0",
};

describe("bootloader and verified-boot state collection", () => {
  it("matches an exact organization-approved model and product profile", () => {
    const report = normalizeBootState(raw, [{ profileId: "example-x1-global", manufacturer: "ExampleOEM", models: ["Example X1"], products: ["examplex1_global"] }]);
    expect(report).toMatchObject({ support: "supported", matchedProfileId: "example-x1-global", bootloaderLockState: "locked", verifiedBoot: "green", oemUnlock: "disallowed", collectionBoundary: "read-only", flashingAvailable: false, unlockingAvailable: false, dataWipeWarningRequired: true });
  });

  it("rejects an unregistered model without guessing compatibility", () => {
    const report = normalizeBootState(raw, [{ profileId: "other", manufacturer: "ExampleOEM", models: ["Other X"] }]);
    expect(report.support).toBe("unsupported");
    expect(report.matchedProfileId).toBeUndefined();
  });

  it("normalizes unlocked and vbmeta states", () => {
    const report = normalizeBootState({ ...raw, flashLocked: "0", vbmetaDeviceState: "unlocked", verifiedBootState: "orange", oemUnlockAllowed: "1" }, []);
    expect(report).toMatchObject({ bootloaderLockState: "unlocked", verifiedBoot: "orange", oemUnlock: "allowed" });
  });

  it("accepts yellow and red verified-boot states without treating them as green", () => {
    expect(normalizeBootState({ ...raw, verifiedBootState: "yellow" }, []).verifiedBoot).toBe("yellow");
    expect(normalizeBootState({ ...raw, verifiedBootState: "red" }, []).verifiedBoot).toBe("red");
  });

  it("returns unknown for missing or unfamiliar properties", () => {
    const report = normalizeBootState({ ...raw, flashLocked: "", vbmetaDeviceState: "", verifiedBootState: "mystery", oemUnlockAllowed: "" }, []);
    expect(report).toMatchObject({ bootloaderLockState: "unknown", verifiedBoot: "unknown", oemUnlock: "unknown" });
  });

  it("never turns collection into an unlock or flashing capability", () => {
    const report = normalizeBootState(raw, [{ profileId: "example", manufacturer: "ExampleOEM", models: ["Example X1"] }]);
    expect(report.flashingAvailable).toBe(false);
    expect(report.unlockingAvailable).toBe(false);
    expect(report.collectionBoundary).toBe("read-only");
  });

  it("uses model matching case-insensitively but keeps exact model boundaries", () => {
    expect(normalizeBootState(raw, [{ profileId: "example", manufacturer: "exampleoem", models: ["example x1"] }]).support).toBe("supported");
    expect(normalizeBootState({ ...raw, model: "Example X10" }, [{ profileId: "example", manufacturer: "ExampleOEM", models: ["Example X1"] }]).support).toBe("unsupported");
  });
});
