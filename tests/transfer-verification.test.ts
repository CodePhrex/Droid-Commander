import { describe, expect, it } from "vitest";

import { canReleaseSource, createTransferSession, verifyTransfer } from "../lib/transfer-verification";

const session = createTransferSession({
  sessionId: "transfer-001",
  sourceDeviceId: "damaged-source",
  destinationDeviceId: "new-device",
  ownerId: "owner-001",
  authorizationId: "auth-001",
  method: "android-backup",
  selectedCategories: ["contacts", "photos", "documents", "messages"],
  ownerConfirmed: true,
  sourceUnlocked: true,
  credentialHandledByApp: false,
});

const completeEntries = [
  { category: "contacts" as const, itemId: "contacts-manifest", sourceHash: "a", destinationHash: "a", sourceSize: 10, destinationSize: 10, destinationReadable: true },
  { category: "photos" as const, itemId: "photo-001", sourceHash: "b", destinationHash: "b", sourceSize: 100, destinationSize: 100, destinationReadable: true },
  { category: "documents" as const, itemId: "doc-001", sourceHash: "c", destinationHash: "c", sourceSize: 50, destinationSize: 50, destinationReadable: true },
  { category: "messages" as const, itemId: "messages-manifest", sourceHash: "d", destinationHash: "d", sourceSize: 20, destinationSize: 20, destinationReadable: true },
];

describe("owner-witnessed transfer verification", () => {
  it("deduplicates selected categories while preserving the consent-bound session", () => {
    const created = createTransferSession({ ...session, selectedCategories: ["photos", "photos"] });
    expect(created.selectedCategories).toEqual(["photos"]);
    expect(created.ownerConfirmed).toBe(true);
    expect(created.sourceUnlocked).toBe(true);
  });

  it("rejects identical source and destination IDs", () => {
    expect(() => createTransferSession({ ...session, destinationDeviceId: session.sourceDeviceId })).toThrow("distinct source and destination");
  });

  it("rejects a transfer without owner confirmation", () => {
    expect(() => createTransferSession({ ...session, ownerConfirmed: false })).toThrow("visible owner confirmation");
  });

  it("rejects a transfer from a locked source", () => {
    expect(() => createTransferSession({ ...session, sourceUnlocked: false })).toThrow("unlocked source device");
  });

  it("rejects credential or biometric material handled by the application", () => {
    expect(() => createTransferSession({ ...session, credentialHandledByApp: true })).toThrow("Credentials and biometric material");
  });

  it("returns verified only when all selected categories are readable and match", () => {
    const verification = verifyTransfer(session, { entries: completeEntries, interrupted: false, sourcePreserved: true, destinationReachable: true });
    expect(verification).toMatchObject({ outcome: "verified", missingCategories: [], hashMismatches: [], unreadableItems: [], canReleaseSource: "owner-may-approve" });
    expect(canReleaseSource(verification, false)).toBe(false);
    expect(canReleaseSource(verification, true)).toBe(true);
  });

  it("returns partially-verified when a selected category is missing", () => {
    const verification = verifyTransfer(session, { entries: completeEntries.filter((entry) => entry.category !== "messages"), interrupted: false, sourcePreserved: true, destinationReachable: true });
    expect(verification.outcome).toBe("partially-verified");
    expect(verification.missingCategories).toEqual(["messages"]);
    expect(verification.canReleaseSource).toBe(false);
  });

  it("returns partially-verified for hash or size mismatches", () => {
    const entries = completeEntries.map((entry) => entry.itemId === "photo-001" ? { ...entry, destinationHash: "different" } : entry);
    const verification = verifyTransfer(session, { entries, interrupted: false, sourcePreserved: true, destinationReachable: true });
    expect(verification.outcome).toBe("partially-verified");
    expect(verification.hashMismatches).toEqual(["photo-001"]);
  });

  it("returns partially-verified for unreadable destination items", () => {
    const entries = completeEntries.map((entry) => entry.itemId === "doc-001" ? { ...entry, destinationReadable: false } : entry);
    const verification = verifyTransfer(session, { entries, interrupted: false, sourcePreserved: true, destinationReachable: true });
    expect(verification.outcome).toBe("partially-verified");
    expect(verification.unreadableItems).toEqual(["doc-001"]);
  });

  it("records interrupted transfers as partial and preserves the source", () => {
    const verification = verifyTransfer(session, { entries: completeEntries, interrupted: true, sourcePreserved: true, destinationReachable: true });
    expect(verification).toMatchObject({ outcome: "partially-verified", interrupted: true, sourcePreserved: true });
    expect(canReleaseSource(verification, true)).toBe(false);
  });

  it("fails when the destination cannot be verified", () => {
    const verification = verifyTransfer(session, { entries: completeEntries, interrupted: false, sourcePreserved: true, destinationReachable: false });
    expect(verification.outcome).toBe("failed");
    expect(verification.reasons).toContain("The destination was not reachable for verification.");
  });

  it("fails and blocks source release when the source was not preserved", () => {
    const verification = verifyTransfer(session, { entries: completeEntries, interrupted: false, sourcePreserved: false, destinationReachable: true });
    expect(verification.outcome).toBe("failed");
    expect(verification.canReleaseSource).toBe(false);
    expect(canReleaseSource(verification, true)).toBe(false);
  });

  it("keeps verification fail-closed if unsafe credential handling is reported", () => {
    const unsafeSession = { ...session, credentialHandledByApp: true };
    const verification = verifyTransfer(unsafeSession, { entries: completeEntries, interrupted: false, sourcePreserved: true, destinationReachable: true });
    expect(verification.outcome).toBe("failed");
    expect(verification.reasons).toContain("Credential or biometric material was exposed to the application.");
  });
});
