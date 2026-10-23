export type HardwareState = "working" | "failed" | "unknown";
export type LockState = "unlocked" | "locked" | "unknown";
export type RecoveryAction =
  | "owner-entered-external-input"
  | "authorized-adb-diagnostics"
  | "owner-witnessed-backup"
  | "enterprise-recovery"
  | "oem-repair"
  | "official-factory-reset";

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
  /** Short label shown in the UI and service manifest. */
  manifestLabel: string;
  /** Explicit owner-operated handoff instructions. */
  ownerHandoff: string;
};

export type RecoveryAssessment = {
  targetId: string;
  authenticationBypassAvailable: false;
  options: RecoveryOption[];
  blockedReasons: string[];
};

export type RecoveryManifestEntry = {
  action: RecoveryAction;
  available: boolean;
  destructive: boolean;
  reason: string;
  manifestLabel: string;
  ownerHandoff: string;
  ownerConfirmed: boolean;
  destructiveConfirmed: boolean;
  confirmedAt: string | null;
};

export type RecoveryServiceManifest = {
  schemaVersion: 1;
  manifestId: string;
  createdAt: string;
  targetId: string;
  operatorId: string;
  clientName?: string;
  purpose: string;
  profile: DamagedDeviceProfile;
  authenticationBypassAvailable: false;
  entries: RecoveryManifestEntry[];
  blockedReasons: string[];
};

const ACTION_META: Record<
  RecoveryAction,
  { manifestLabel: string; ownerHandoff: string }
> = {
  "owner-entered-external-input": {
    manifestLabel: "Owner-entered external input",
    ownerHandoff:
      "Owner connects a compatible external keyboard/input path and enters their own credential directly into Android. Droid Commander must not receive, store, or relay the credential.",
  },
  "authorized-adb-diagnostics": {
    manifestLabel: "Authorized ADB diagnostics",
    ownerHandoff:
      "Only when ADB is already authorized by the owner and the device is unlocked. Use read-only diagnostics; do not enable ADB or approve new trust from this app.",
  },
  "owner-witnessed-backup": {
    manifestLabel: "Owner-witnessed backup",
    ownerHandoff:
      "Owner approves and completes backup through the normal Android or OEM path while present. This app only documents the handoff.",
  },
  "enterprise-recovery": {
    manifestLabel: "Enterprise / device-owner recovery",
    ownerHandoff:
      "Use the organization’s preconfigured device-owner recovery policy. This planner cannot create enrollment while the device is locked.",
  },
  "oem-repair": {
    manifestLabel: "OEM / authorized repair",
    ownerHandoff:
      "Route the owner to the OEM or an authorized repair provider for display, button, or biometric hardware service.",
  },
  "official-factory-reset": {
    manifestLabel: "Official factory reset",
    ownerHandoff:
      "Owner uses the official Android/OEM recovery reset path. This destroys user data and is not an authentication bypass or data-recovery method.",
  },
};

export function assessDamagedDevice(profile: DamagedDeviceProfile): RecoveryAssessment {
  const locked = profile.lockState !== "unlocked";
  const inputBroken =
    profile.display === "failed" ||
    profile.touch === "failed" ||
    profile.physicalButtons === "failed";

  const options: RecoveryOption[] = [
    {
      action: "owner-entered-external-input",
      available: inputBroken && profile.usbHostAvailable,
      requiresOwnerPresence: true,
      destructive: false,
      reason:
        inputBroken && profile.usbHostAvailable
          ? "A compatible external input path may let the owner enter the credential directly into Android; Droid Commander must not receive or store it."
          : "Requires a damaged-input condition and compatible USB host hardware.",
      ...ACTION_META["owner-entered-external-input"],
    },
    {
      action: "authorized-adb-diagnostics",
      available: profile.adbAuthorized && !locked,
      requiresOwnerPresence: true,
      destructive: false,
      reason:
        profile.adbAuthorized && !locked
          ? "ADB is already authorized and the device is unlocked."
          : "Requires target-side ADB authorization and an unlocked device; this planner does not approve or bypass ADB trust.",
      ...ACTION_META["authorized-adb-diagnostics"],
    },
    {
      action: "owner-witnessed-backup",
      available: !locked,
      requiresOwnerPresence: true,
      destructive: false,
      reason: !locked
        ? "The owner may approve a backup through the normal Android or OEM path."
        : "Backup access remains subject to Android authentication and encryption policy.",
      ...ACTION_META["owner-witnessed-backup"],
    },
    {
      action: "enterprise-recovery",
      available: profile.deviceOwnerManaged && profile.enterpriseRecoveryConfigured,
      requiresOwnerPresence: true,
      destructive: false,
      reason:
        profile.deviceOwnerManaged && profile.enterpriseRecoveryConfigured
          ? "Use the organization’s preconfigured device-owner recovery policy."
          : "Requires an existing device-owner or enterprise recovery enrollment; it cannot be created while locked.",
      ...ACTION_META["enterprise-recovery"],
    },
    {
      action: "oem-repair",
      available: true,
      requiresOwnerPresence: true,
      destructive: false,
      reason:
        "Route to the OEM or authorized repair provider for display, button, or biometric hardware service.",
      ...ACTION_META["oem-repair"],
    },
    {
      action: "official-factory-reset",
      available: true,
      requiresOwnerPresence: true,
      destructive: true,
      reason:
        "The owner may use the official Android/OEM recovery reset path; this destroys user data and is not an authentication bypass or data-recovery method.",
      ...ACTION_META["official-factory-reset"],
    },
  ];

  const blockedReasons = [
    locked ? "The device is locked; no application-level authentication bypass is available." : "",
    profile.fingerprint === "failed"
      ? "Fingerprint hardware is unavailable; repair or owner-authenticated fallback is required."
      : "",
    profile.faceAuthentication === "failed"
      ? "Face-authentication hardware or sensors are unavailable; repair or owner-authenticated fallback is required."
      : "",
    profile.display === "failed" && !profile.usbHostAvailable
      ? "The display is unavailable and no compatible external input path is reported."
      : "",
  ].filter(Boolean);

  return {
    targetId: profile.targetId,
    authenticationBypassAvailable: false,
    options,
    blockedReasons,
  };
}

export function canExecuteRecoveryAction(
  assessment: RecoveryAssessment,
  action: RecoveryAction,
  confirmation: {
    targetId: string;
    ownerConfirmed: boolean;
    destructiveConfirmed: boolean;
  },
) {
  const option = assessment.options.find((candidate) => candidate.action === action);
  if (!option || !option.available) {
    return {
      allowed: false,
      reason: "The recovery action is not available for the observed device state.",
    };
  }
  if (confirmation.targetId !== assessment.targetId) {
    return { allowed: false, reason: "Target identity does not match the recovery assessment." };
  }
  if (!confirmation.ownerConfirmed) {
    return { allowed: false, reason: "Visible owner confirmation is required." };
  }
  if (option.destructive && !confirmation.destructiveConfirmed) {
    return { allowed: false, reason: "Separate destructive-action confirmation is required." };
  }
  return { allowed: true, reason: option.reason };
}

function simpleId(): string {
  return `rcv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRecoveryServiceManifest(input: {
  targetId: string;
  operatorId: string;
  clientName?: string;
  purpose: string;
  profile: DamagedDeviceProfile;
  assessment: RecoveryAssessment;
}): RecoveryServiceManifest {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    manifestId: simpleId(),
    createdAt: now,
    targetId: input.targetId,
    operatorId: input.operatorId,
    clientName: input.clientName,
    purpose: input.purpose,
    profile: input.profile,
    authenticationBypassAvailable: false,
    blockedReasons: input.assessment.blockedReasons,
    entries: input.assessment.options.map((opt) => ({
      action: opt.action,
      available: opt.available,
      destructive: opt.destructive,
      reason: opt.reason,
      manifestLabel: opt.manifestLabel,
      ownerHandoff: opt.ownerHandoff,
      ownerConfirmed: false,
      destructiveConfirmed: false,
      confirmedAt: null,
    })),
  };
}

export function recordOwnerConfirmation(
  manifest: RecoveryServiceManifest,
  action: RecoveryAction,
  confirmation: { ownerConfirmed: boolean; destructiveConfirmed: boolean },
): RecoveryServiceManifest {
  const now = new Date().toISOString();
  return {
    ...manifest,
    entries: manifest.entries.map((entry) =>
      entry.action === action
        ? {
            ...entry,
            ownerConfirmed: confirmation.ownerConfirmed,
            destructiveConfirmed: confirmation.destructiveConfirmed,
            confirmedAt: confirmation.ownerConfirmed ? now : null,
          }
        : entry,
    ),
  };
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}\[\]<>|]/g, "\\$&").replace(/[\r\n]+/g, " ");
}

export function formatRecoveryManifestMarkdown(manifest: RecoveryServiceManifest): string {
  const lines = [
    "# Droid Commander — Damaged Device Service Manifest",
    "",
    `Manifest ID: ${escapeMarkdown(manifest.manifestId)}`,
    `Created: ${manifest.createdAt}`,
    `Target: ${escapeMarkdown(manifest.targetId)}`,
    `Operator: ${escapeMarkdown(manifest.operatorId)}`,
    manifest.clientName ? `Client: ${escapeMarkdown(manifest.clientName)}` : null,
    `Purpose: ${escapeMarkdown(manifest.purpose)}`,
    "Authentication bypass available: never",
    "",
    "## Observed profile",
    "",
    `- Display: ${manifest.profile.display}`,
    `- Touch: ${manifest.profile.touch}`,
    `- Physical buttons: ${manifest.profile.physicalButtons}`,
    `- Fingerprint: ${manifest.profile.fingerprint}`,
    `- Face authentication: ${manifest.profile.faceAuthentication}`,
    `- Lock state: ${manifest.profile.lockState}`,
    `- USB host available: ${manifest.profile.usbHostAvailable}`,
    `- ADB authorized: ${manifest.profile.adbAuthorized}`,
    `- Device-owner managed: ${manifest.profile.deviceOwnerManaged}`,
    `- Enterprise recovery configured: ${manifest.profile.enterpriseRecoveryConfigured}`,
    "",
    "## Blocked reasons",
    "",
    ...(manifest.blockedReasons.length
      ? manifest.blockedReasons.map((r) => `- ${escapeMarkdown(r)}`)
      : ["- None recorded"]),
    "",
    "## Options and owner confirmations",
    "",
  ].filter((line): line is string => line !== null);

  for (const entry of manifest.entries) {
    lines.push(`### ${escapeMarkdown(entry.manifestLabel)}`);
    lines.push(`Available: ${entry.available ? "yes" : "no"}`);
    lines.push(`Destructive: ${entry.destructive ? "yes" : "no"}`);
    lines.push(`Reason: ${escapeMarkdown(entry.reason)}`);
    lines.push(`Owner handoff: ${escapeMarkdown(entry.ownerHandoff)}`);
    lines.push(
      `Owner confirmed: ${entry.ownerConfirmed ? "yes" : "no"}${entry.confirmedAt ? ` at ${entry.confirmedAt}` : ""}`,
    );
    if (entry.destructive) {
      lines.push(`Destructive confirmed: ${entry.destructiveConfirmed ? "yes" : "no"}`);
    }
    lines.push("");
  }

  lines.push(
    "This document records owner-operated handoffs only. It does not unlock devices, enable ADB, extract credentials, or perform factory reset.",
  );
  return lines.join("\n");
}
