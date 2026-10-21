import { describe, expect, it } from "vitest";

import { assessDamagedDevice, canExecuteRecoveryAction } from "../lib/damaged-device-recovery";

const damagedLocked = {
  targetId: "lab-handset-damaged",
  display: "failed" as const,
  touch: "failed" as const,
  physicalButtons: "failed" as const,
  fingerprint: "failed" as const,
  faceAuthentication: "failed" as const,
  lockState: "locked" as const,
  usbHostAvailable: true,
  adbAuthorized: false,
  deviceOwnerManaged: false,
  enterpriseRecoveryConfigured: false,
};

describe("damaged device recovery planner", () => {
  it("never reports an authentication bypass as available", () => {
    const assessment = assessDamagedDevice(damagedLocked);
    expect(assessment.authenticationBypassAvailable).toBe(false);
    expect(assessment.blockedReasons).toContain("The device is locked; no application-level authentication bypass is available.");
  });

  it("offers owner-entered external input without handling the credential", () => {
    const assessment = assessDamagedDevice(damagedLocked);
    const option = assessment.options.find((candidate) => candidate.action === "owner-entered-external-input");
    expect(option).toMatchObject({ available: true, requiresOwnerPresence: true, destructive: false });
    expect(canExecuteRecoveryAction(assessment, "owner-entered-external-input", { targetId: damagedLocked.targetId, ownerConfirmed: true, destructiveConfirmed: false }).allowed).toBe(true);
  });

  it("does not offer ADB diagnostics while locked or unauthorized", () => {
    const assessment = assessDamagedDevice(damagedLocked);
    expect(assessment.options.find((candidate) => candidate.action === "authorized-adb-diagnostics")?.available).toBe(false);
  });

  it("allows authorized ADB diagnostics only after unlock and prior trust", () => {
    const assessment = assessDamagedDevice({ ...damagedLocked, lockState: "unlocked", adbAuthorized: true });
    expect(assessment.options.find((candidate) => candidate.action === "authorized-adb-diagnostics")?.available).toBe(true);
  });

  it("offers enterprise recovery only when configured before the incident", () => {
    const assessment = assessDamagedDevice({ ...damagedLocked, deviceOwnerManaged: true, enterpriseRecoveryConfigured: true });
    expect(assessment.options.find((candidate) => candidate.action === "enterprise-recovery")?.available).toBe(true);
  });

  it("always provides repair guidance but requires owner confirmation", () => {
    const assessment = assessDamagedDevice(damagedLocked);
    expect(assessment.options.find((candidate) => candidate.action === "oem-repair")?.available).toBe(true);
    expect(canExecuteRecoveryAction(assessment, "oem-repair", { targetId: damagedLocked.targetId, ownerConfirmed: false, destructiveConfirmed: false }).allowed).toBe(false);
  });

  it("requires a separate destructive confirmation for official factory reset", () => {
    const assessment = assessDamagedDevice(damagedLocked);
    expect(canExecuteRecoveryAction(assessment, "official-factory-reset", { targetId: damagedLocked.targetId, ownerConfirmed: true, destructiveConfirmed: false }).allowed).toBe(false);
    expect(canExecuteRecoveryAction(assessment, "official-factory-reset", { targetId: damagedLocked.targetId, ownerConfirmed: true, destructiveConfirmed: true }).allowed).toBe(true);
  });

  it("rejects a recovery confirmation bound to another target", () => {
    const assessment = assessDamagedDevice(damagedLocked);
    expect(canExecuteRecoveryAction(assessment, "oem-repair", { targetId: "other-device", ownerConfirmed: true, destructiveConfirmed: false })).toMatchObject({ allowed: false });
  });
});
