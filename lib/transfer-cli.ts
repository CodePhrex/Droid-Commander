import {
  canReleaseSource,
  createTransferSession,
  type TransferManifestEntry,
  type TransferSession,
  type TransferVerification,
  verifyTransfer,
} from "./transfer-verification";

export type TransferCliState = {
  session: TransferSession;
  entries: TransferManifestEntry[];
  interrupted: boolean;
  sourcePreserved: boolean;
  destinationReachable: boolean;
  verification: TransferVerification | null;
  sourceReleaseConfirmed: boolean;
};

export function createCliState(session: TransferSession, options: { destinationReachable?: boolean; sourcePreserved?: boolean } = {}): TransferCliState {
  return {
    session: createTransferSession(session),
    entries: [],
    interrupted: false,
    sourcePreserved: options.sourcePreserved ?? true,
    destinationReachable: options.destinationReachable ?? false,
    verification: null,
    sourceReleaseConfirmed: false,
  };
}

export function recordTransferEntry(state: TransferCliState, entry: TransferManifestEntry): TransferCliState {
  if (!entry.category || !entry.itemId) throw new Error("A transfer record requires a category and item ID.");
  return { ...state, entries: [...state.entries.filter((existing) => existing.itemId !== entry.itemId), entry], verification: null, sourceReleaseConfirmed: false };
}

export function setTransferCondition(state: TransferCliState, condition: "interrupted" | "destination-reachable" | "source-preserved", value: boolean): TransferCliState {
  if (condition === "interrupted") return { ...state, interrupted: value, verification: null, sourceReleaseConfirmed: false };
  if (condition === "destination-reachable") return { ...state, destinationReachable: value, verification: null, sourceReleaseConfirmed: false };
  return { ...state, sourcePreserved: value, verification: null, sourceReleaseConfirmed: false };
}

export function verifyCliState(state: TransferCliState): TransferCliState {
  return { ...state, verification: verifyTransfer(state.session, { entries: state.entries, interrupted: state.interrupted, sourcePreserved: state.sourcePreserved, destinationReachable: state.destinationReachable }), sourceReleaseConfirmed: false };
}

export function confirmSourceRelease(state: TransferCliState): TransferCliState {
  if (!state.verification) throw new Error("Run verify before confirming source release.");
  if (!canReleaseSource(state.verification, true)) throw new Error("Source release requires a verified transfer and explicit owner confirmation.");
  return { ...state, sourceReleaseConfirmed: true };
}

export function serializeCliState(state: TransferCliState): string {
  return JSON.stringify(state, null, 2);
}

export function parseCliState(value: string): TransferCliState {
  const parsed = JSON.parse(value) as TransferCliState;
  if (!parsed?.session?.sessionId || !parsed.session.sourceDeviceId || !parsed.session.destinationDeviceId || !Array.isArray(parsed.entries)) throw new Error("Invalid transfer CLI state file.");
  return parsed;
}

export function renderCliStatus(state: TransferCliState): string {
  const verification = state.verification;
  const lines = [
    `Session: ${state.session.sessionId}`,
    `Source: ${state.session.sourceDeviceId}`,
    `Destination: ${state.session.destinationDeviceId}`,
    `Owner confirmed: ${state.session.ownerConfirmed ? "yes" : "no"}`,
    `Source unlocked: ${state.session.sourceUnlocked ? "yes" : "no"}`,
    `Destination reachable: ${state.destinationReachable ? "yes" : "no"}`,
    `Source preserved: ${state.sourcePreserved ? "yes" : "no"}`,
    `Entries: ${state.entries.length}`,
    `Interrupted: ${state.interrupted ? "yes" : "no"}`,
    `Verification: ${verification?.outcome ?? "not-run"}`,
    `Source release: ${state.sourceReleaseConfirmed ? "owner-confirmed" : "held"}`,
  ];
  if (verification?.reasons.length) lines.push(`Reasons: ${verification.reasons.join(" | ")}`);
  return lines.join("\n");
}
