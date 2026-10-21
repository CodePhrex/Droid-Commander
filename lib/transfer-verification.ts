export type TransferCategory = "contacts" | "photos" | "documents" | "messages" | "applications" | "settings";
export type TransferOutcome = "verified" | "partially-verified" | "failed";

export type TransferSession = {
  sessionId: string;
  sourceDeviceId: string;
  destinationDeviceId: string;
  ownerId: string;
  authorizationId: string;
  method: "android-backup" | "oem-migration" | "owner-approved-file-transfer";
  selectedCategories: TransferCategory[];
  ownerConfirmed: boolean;
  sourceUnlocked: boolean;
  credentialHandledByApp: boolean;
};

export type TransferManifestEntry = {
  category: TransferCategory;
  itemId: string;
  sourceHash?: string;
  destinationHash?: string;
  sourceSize?: number;
  destinationSize?: number;
  destinationReadable: boolean;
};

export type TransferVerificationInput = {
  entries: TransferManifestEntry[];
  interrupted: boolean;
  sourcePreserved: boolean;
  destinationReachable: boolean;
};

export type TransferVerification = {
  outcome: TransferOutcome;
  missingCategories: TransferCategory[];
  hashMismatches: string[];
  unreadableItems: string[];
  interrupted: boolean;
  sourcePreserved: boolean;
  reasons: string[];
  canReleaseSource: false | "owner-may-approve";
};

export function createTransferSession(input: TransferSession): TransferSession {
  if (!input.sessionId || !input.sourceDeviceId || !input.destinationDeviceId || input.sourceDeviceId === input.destinationDeviceId) throw new Error("Transfer requires distinct source and destination device IDs.");
  if (!input.ownerId || !input.authorizationId || input.selectedCategories.length === 0) throw new Error("Transfer requires an owner, authorization, and explicit category scope.");
  if (!input.ownerConfirmed || !input.sourceUnlocked) throw new Error("Transfer requires visible owner confirmation and an unlocked source device.");
  if (input.credentialHandledByApp) throw new Error("Credentials and biometric material must remain inside Android or the official transfer tool.");
  return { ...input, selectedCategories: [...new Set(input.selectedCategories)] };
}

export function verifyTransfer(session: TransferSession, input: TransferVerificationInput): TransferVerification {
  const reasons: string[] = [];
  const observedCategories = new Set(input.entries.map((entry) => entry.category));
  const missingCategories = session.selectedCategories.filter((category) => !observedCategories.has(category));
  const hashMismatches = input.entries.filter((entry) => (entry.sourceHash && entry.destinationHash && entry.sourceHash !== entry.destinationHash) || (entry.sourceSize !== undefined && entry.destinationSize !== undefined && entry.sourceSize !== entry.destinationSize)).map((entry) => entry.itemId);
  const unreadableItems = input.entries.filter((entry) => !entry.destinationReadable).map((entry) => entry.itemId);

  if (!session.ownerConfirmed) reasons.push("Owner confirmation is missing.");
  if (!session.sourceUnlocked) reasons.push("The source device was not confirmed unlocked through Android.");
  if (session.credentialHandledByApp) reasons.push("Credential or biometric material was exposed to the application.");
  if (!input.destinationReachable) reasons.push("The destination was not reachable for verification.");
  if (!input.sourcePreserved) reasons.push("The source was not preserved after transfer and verification.");
  if (missingCategories.length > 0) reasons.push(`Missing categories: ${missingCategories.join(", ")}.`);
  if (hashMismatches.length > 0) reasons.push(`Manifest mismatches: ${hashMismatches.join(", ")}.`);
  if (unreadableItems.length > 0) reasons.push(`Unreadable destination items: ${unreadableItems.join(", ")}.`);
  if (input.interrupted) reasons.push("The transfer was interrupted before clean close.");

  const hardFailure = !session.ownerConfirmed || !session.sourceUnlocked || session.credentialHandledByApp || !input.destinationReachable || !input.sourcePreserved;
  const incomplete = missingCategories.length > 0 || hashMismatches.length > 0 || unreadableItems.length > 0 || input.interrupted;
  const outcome: TransferOutcome = hardFailure ? "failed" : incomplete ? "partially-verified" : "verified";
  return {
    outcome,
    missingCategories,
    hashMismatches,
    unreadableItems,
    interrupted: input.interrupted,
    sourcePreserved: input.sourcePreserved,
    reasons,
    canReleaseSource: outcome === "verified" && session.ownerConfirmed && input.sourcePreserved ? "owner-may-approve" : false,
  };
}

export function canReleaseSource(verification: TransferVerification, ownerReleaseConfirmed: boolean) {
  return verification.outcome === "verified" && verification.canReleaseSource === "owner-may-approve" && ownerReleaseConfirmed;
}
