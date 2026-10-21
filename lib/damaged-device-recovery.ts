export type HardwareState = "working" | "failed" | "unknown";
export type LockState = "unlocked" | "locked" | "unknown";
export type RecoveryAction = "owner-entered-external-input" | "authorized-adb-diagnostics" | "owner-witnessed-backup" | "enterprise-recovery" | "oem-repair" | "official-factory-reset";

export type DamagedDeviceProfile = {
  targetId: string;
  display: HardwareState;
  touch: HardwareState;
  physicalButtons: HardwareState;
  fingerprint: HardwareState;
  faceAuthentication: HardwareState;
  lockState: LockState;
  usbHostAvailable: boolean;
  adbAuthorized: boolean;
  deviceOwnerManaged: boolean;
  enterpriseRecoveryConfigured: boolean;
};

export type RecoveryOption = {
  action: RecoveryAction;
  available: boolean;
  requiresOwnerPresence: boolean;
  destructive: boolean;
  reason: string;
};

export type RecoveryAssessment = {
  targetId: string;
  authenticationBypassAvailable: false;
  options: RecoveryOption[];
  blockedReasons: string[];
};

export function assessDamagedDevice(profile: DamagedDeviceProfile): RecoveryAssessment {
  const locked = profile.lockState !== "unlocked";
  const inputBroken = profile.display === "failed" || profile.touch === "failed" || profile.physicalButtons === "failed";
  const options: RecoveryOption[] = [
    {
      action: "owner-entered-external-input",
      available: inputBroken && profile.usbHostAvailable,
      requiresOwnerPresence: true,
      destructive: false,
      reason: inputBroken && profile.usbHostAvailable ? "A compatible external input path may let the owner enter the credential directly into Android; Droid Commander must not receive or store it." : "Requires a damaged-input condition and compatible USB host hardware.",
    },
    {
      action: "authorized-adb-diagnostics",
      available: profile.adbAuthorized && !locked,
      requiresOwnerPresence: true,
      destructive: false,
      reason: profile.adbAuthorized && !locked ? "ADB is already authorized and the device is unlocked." : "Requires target-side ADB authorization and an unlocked device; this planner does not approve or bypass ADB trust.",
    },
    {
      action: "owner-witnessed-backup",
      available: !locked,
      requiresOwnerPresence: true,
      destructive: false,
      reason: !locked ? "The owner may approve a backup through the normal Android or OEM path." : "Backup access remains subject to Android authentication and encryption policy.",
    },
    {
      action: "enterprise-recovery",
      available: profile.deviceOwnerManaged && profile.enterpriseRecoveryConfigured,
      requiresOwnerPresence: true,
      destructive: false,
      reason: profile.deviceOwnerManaged && profile.enterpriseRecoveryConfigured ? "Use the organization’s preconfigured device-owner recovery policy." : "Requires an existing device-owner or enterprise recovery enrollment; it cannot be created while locked.",
    },
    {
      action: "oem-repair",
      available: true,
      requiresOwnerPresence: true,
      destructive: false,
      reason: "Route to the OEM or authorized repair provider for display, button, or biometric hardware service.",
    },
    {
      action: "official-factory-reset",
      available: true,
      requiresOwnerPresence: true,
      destructive: true,
      reason: "The owner may use the official Android/OEM recovery reset path; this destroys user data and is not an authentication bypass or data-recovery method.",
    },
  ];

  const blockedReasons = [
    locked ? "The device is locked; no application-level authentication bypass is available." : "",
    profile.fingerprint === "failed" ? "Fingerprint hardware is unavailable; repair or owner-authenticated fallback is required." : "",
    profile.faceAuthentication === "failed" ? "Face-authentication hardware or sensors are unavailable; repair or owner-authenticated fallback is required." : "",
    profile.display === "failed" && !profile.usbHostAvailable ? "The display is unavailable and no compatible external input path is reported." : "",
  ].filter(Boolean);

  return { targetId: profile.targetId, authenticationBypassAvailable: false, options, blockedReasons };
}

export function canExecuteRecoveryAction(assessment: RecoveryAssessment, action: RecoveryAction, confirmation: { targetId: string; ownerConfirmed: boolean; destructiveConfirmed: boolean }) {
  const option = assessment.options.find((candidate) => candidate.action === action);
  if (!option || !option.available) return { allowed: false, reason: "The recovery action is not available for the observed device state." };
  if (confirmation.targetId !== assessment.targetId) return { allowed: false, reason: "Target identity does not match the recovery assessment." };
  if (!confirmation.ownerConfirmed) return { allowed: false, reason: "Visible owner confirmation is required." };
  if (option.destructive && !confirmation.destructiveConfirmed) return { allowed: false, reason: "Separate destructive-action confirmation is required." };
  return { allowed: true, reason: option.reason };
}
