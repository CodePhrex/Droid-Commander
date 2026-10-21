import type { BootStateReport } from "./boot-state";

export type RecoveryArtifactManifest = {
  artifactId: string;
  version: string;
  sha256: string;
  signedPayload: string;
  signature: string;
  issuerId: string;
  keyId: string;
  supportedProfileIds: readonly string[];
  artifactPath?: string;
};

export type RecoveryReadinessInput = {
  device: BootStateReport;
  artifact: RecoveryArtifactManifest;
  actualSha256: string;
  signatureValid: boolean;
  ownerConfirmed: boolean;
  backupConfirmed: boolean;
  enterpriseManaged: boolean;
};

export type RecoveryReadiness = {
  decision: "ready-for-authorized-handoff" | "blocked";
  reasons: string[];
  warnings: string[];
  handoffOnly: true;
  unlockingAvailable: false;
  flashingAvailable: false;
  recoveryInstallationAvailable: false;
  artifactId: string;
  matchedProfileId?: string;
};

export type RecoveryMonitorStage = "not-started" | "handoff-ready" | "operator-confirmed" | "bootloader" | "recovery" | "verification" | "complete" | "failed";
export type RecoveryMonitorEvent = { stage: RecoveryMonitorStage; at: string; note: string };
export type RecoveryMonitorState = { readiness: RecoveryReadiness; stage: RecoveryMonitorStage; history: RecoveryMonitorEvent[] };

const transitions: Record<RecoveryMonitorStage, readonly RecoveryMonitorStage[]> = {
  "not-started": ["handoff-ready", "failed"],
  "handoff-ready": ["operator-confirmed", "failed"],
  "operator-confirmed": ["bootloader", "failed"],
  bootloader: ["recovery", "verification", "failed"],
  recovery: ["verification", "failed"],
  verification: ["complete", "failed"],
  complete: [],
  failed: [],
};

function sha(value: string) { return value.trim().toLowerCase(); }

export function evaluateRecoveryReadiness(input: RecoveryReadinessInput): RecoveryReadiness {
  const reasons: string[] = [];
  const warnings = ["OEM bootloader unlock and recovery installation may wipe user data.", "This result authorizes only an operator handoff; it does not unlock, flash, or install anything."];
  const profileId = input.device.matchedProfileId;
  if (input.device.support !== "supported" || !profileId) reasons.push("The device model is not in the exact supported-device registry.");
  if (!input.artifact.supportedProfileIds.includes(profileId ?? "")) reasons.push("The recovery artifact is not approved for the exact matched device profile.");
  if (sha(input.artifact.sha256) !== sha(input.actualSha256)) reasons.push("The recovery artifact SHA-256 does not match its signed manifest.");
  if (!input.signatureValid) reasons.push("The recovery artifact signature could not be verified against a trusted offline issuer.");
  if (!input.ownerConfirmed) reasons.push("Visible owner authorization and data-wipe acknowledgement are required.");
  if (!input.backupConfirmed) reasons.push("A backup or explicit owner-approved backup exception is required before a potentially destructive handoff.");
  if (input.enterpriseManaged) reasons.push("Enterprise-managed devices require the organization’s device-owner recovery process.");
  if (input.device.oemUnlock === "disallowed") reasons.push("The device reports OEM unlocking as disallowed.");
  if (input.device.oemUnlock === "unknown") reasons.push("OEM unlock eligibility is unknown; the operator must resolve it through the official OEM process.");
  if (input.device.verifiedBoot === "red") reasons.push("Verified boot reports red; stop and investigate device integrity before handoff.");
  if (input.device.verifiedBoot === "unknown") reasons.push("Verified-boot state is unknown.");
  return {
    decision: reasons.length === 0 ? "ready-for-authorized-handoff" : "blocked",
    reasons,
    warnings,
    handoffOnly: true,
    unlockingAvailable: false,
    flashingAvailable: false,
    recoveryInstallationAvailable: false,
    artifactId: input.artifact.artifactId,
    matchedProfileId: profileId,
  };
}

export function createRecoveryMonitor(readiness: RecoveryReadiness): RecoveryMonitorState {
  return { readiness, stage: "not-started", history: [] };
}

export function advanceRecoveryMonitor(state: RecoveryMonitorState, next: RecoveryMonitorStage, at: string, note: string): RecoveryMonitorState {
  if (!transitions[state.stage].includes(next)) throw new Error(`Invalid recovery monitor transition from ${state.stage} to ${next}.`);
  if (!note.trim()) throw new Error("A manual operator note is required for every bootloader/recovery state update.");
  if (state.stage === "not-started" && next === "handoff-ready" && state.readiness.decision !== "ready-for-authorized-handoff") throw new Error("A blocked recovery package cannot enter handoff-ready state.");
  return { ...state, stage: next, history: [...state.history, { stage: next, at, note: note.trim() }] };
}
