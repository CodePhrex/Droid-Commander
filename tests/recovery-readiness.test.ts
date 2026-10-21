import { describe, expect, it } from "vitest";

import { normalizeBootState } from "../lib/boot-state";
import { advanceRecoveryMonitor, createRecoveryMonitor, evaluateRecoveryReadiness } from "../lib/recovery-readiness";

const device = normalizeBootState({ manufacturer: "ExampleOEM", model: "Example X1", device: "examplex1", product: "examplex1_global", bootloader: "1.0", androidVersion: "15", sdkInt: 35, securityPatch: "2026-10-05", verifiedBootState: "green", flashLocked: "1", vbmetaDeviceState: "locked", verityMode: "enforcing", oemUnlockAllowed: "1" }, [{ profileId: "example-x1", manufacturer: "ExampleOEM", models: ["Example X1"], products: ["examplex1_global"] }]);

const artifact = { artifactId: "recovery-example-x1-1", version: "1.0", sha256: "abc123", signedPayload: "signed-manifest", signature: "signature", issuerId: "org-issuer", keyId: "org-key", supportedProfileIds: ["example-x1"] };
const readyInput = { device, artifact, actualSha256: "ABC123", signatureValid: true, ownerConfirmed: true, backupConfirmed: true, enterpriseManaged: false };

describe("recovery readiness and manual flashing-state monitor", () => {
  it("readies an exact, signed, backed-up owner-approved artifact for handoff", () => {
    const readiness = evaluateRecoveryReadiness(readyInput);
    expect(readiness).toMatchObject({ decision: "ready-for-authorized-handoff", handoffOnly: true, unlockingAvailable: false, flashingAvailable: false, recoveryInstallationAvailable: false, matchedProfileId: "example-x1" });
  });

  it("blocks mismatched artifact hashes and signatures", () => {
    const readiness = evaluateRecoveryReadiness({ ...readyInput, actualSha256: "different", signatureValid: false });
    expect(readiness.decision).toBe("blocked");
    expect(readiness.reasons).toEqual(expect.arrayContaining(["The recovery artifact SHA-256 does not match its signed manifest.", "The recovery artifact signature could not be verified against a trusted offline issuer."]));
  });

  it("blocks missing owner confirmation and backup", () => {
    const readiness = evaluateRecoveryReadiness({ ...readyInput, ownerConfirmed: false, backupConfirmed: false });
    expect(readiness.decision).toBe("blocked");
  });

  it("blocks enterprise-managed devices from generic handoff", () => {
    const readiness = evaluateRecoveryReadiness({ ...readyInput, enterpriseManaged: true });
    expect(readiness.reasons).toContain("Enterprise-managed devices require the organization’s device-owner recovery process.");
  });

  it("blocks unknown or disallowed OEM unlock and red/unknown verified boot", () => {
    expect(evaluateRecoveryReadiness({ ...readyInput, device: { ...device, oemUnlock: "disallowed" } }).decision).toBe("blocked");
    expect(evaluateRecoveryReadiness({ ...readyInput, device: { ...device, verifiedBoot: "red" } }).decision).toBe("blocked");
    expect(evaluateRecoveryReadiness({ ...readyInput, device: { ...device, verifiedBoot: "unknown" } }).decision).toBe("blocked");
  });

  it("blocks artifacts approved for another exact profile", () => {
    const readiness = evaluateRecoveryReadiness({ ...readyInput, artifact: { ...artifact, supportedProfileIds: ["other-profile"] } });
    expect(readiness.reasons).toContain("The recovery artifact is not approved for the exact matched device profile.");
  });

  it("requires readiness before the monitor enters handoff-ready", () => {
    const monitor = createRecoveryMonitor(evaluateRecoveryReadiness({ ...readyInput, backupConfirmed: false }));
    expect(() => advanceRecoveryMonitor(monitor, "handoff-ready", "2026-10-20T20:00:00.000Z", "operator reviewed block")).toThrow("blocked recovery package");
  });

  it("monitors a manually reported authorized handoff through verification", () => {
    let monitor = createRecoveryMonitor(evaluateRecoveryReadiness(readyInput));
    monitor = advanceRecoveryMonitor(monitor, "handoff-ready", "2026-10-20T20:00:00.000Z", "owner and operator reviewed signed artifact");
    monitor = advanceRecoveryMonitor(monitor, "operator-confirmed", "2026-10-20T20:01:00.000Z", "operator completed official OEM handoff confirmation");
    monitor = advanceRecoveryMonitor(monitor, "bootloader", "2026-10-20T20:02:00.000Z", "operator reports device in bootloader");
    monitor = advanceRecoveryMonitor(monitor, "recovery", "2026-10-20T20:03:00.000Z", "operator reports recovery environment");
    monitor = advanceRecoveryMonitor(monitor, "verification", "2026-10-20T20:04:00.000Z", "operator reports post-handoff verification started");
    monitor = advanceRecoveryMonitor(monitor, "complete", "2026-10-20T20:05:00.000Z", "operator recorded successful verification");
    expect(monitor.stage).toBe("complete");
    expect(monitor.history).toHaveLength(6);
  });

  it("rejects skipped states and missing operator notes", () => {
    const monitor = createRecoveryMonitor(evaluateRecoveryReadiness(readyInput));
    expect(() => advanceRecoveryMonitor(monitor, "bootloader", "2026-10-20T20:00:00.000Z", "skipped handoff")).toThrow("Invalid recovery monitor transition");
    const handoff = advanceRecoveryMonitor(monitor, "handoff-ready", "2026-10-20T20:00:00.000Z", "ready");
    expect(() => advanceRecoveryMonitor(handoff, "operator-confirmed", "2026-10-20T20:01:00.000Z", " ")).toThrow("operator note");
  });
});
