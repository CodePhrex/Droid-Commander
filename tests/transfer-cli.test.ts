import { describe, expect, it } from "vitest";

import { confirmSourceRelease, createCliState, parseCliState, recordTransferEntry, renderCliStatus, serializeCliState, setTransferCondition, verifyCliState } from "../lib/transfer-cli";

const baseSession = {
  sessionId: "transfer-cli-001",
  sourceDeviceId: "damaged-source",
  destinationDeviceId: "new-device",
  ownerId: "owner-001",
  authorizationId: "auth-001",
  method: "owner-approved-file-transfer" as const,
  selectedCategories: ["contacts", "photos"] as const,
  ownerConfirmed: true,
  sourceUnlocked: true,
  credentialHandledByApp: false,
};

function complete(state = createCliState(baseSession, { destinationReachable: true })) {
  let next = recordTransferEntry(state, { category: "contacts", itemId: "contacts", sourceHash: "a", destinationHash: "a", sourceSize: 1, destinationSize: 1, destinationReadable: true });
  next = recordTransferEntry(next, { category: "photos", itemId: "photo-1", sourceHash: "b", destinationHash: "b", sourceSize: 2, destinationSize: 2, destinationReadable: true });
  return next;
}

describe("transfer CLI state", () => {
  it("persists and restores a non-secret session state", () => {
    const state = createCliState(baseSession);
    const restored = parseCliState(serializeCliState(state));
    expect(restored.session.sessionId).toBe("transfer-cli-001");
    expect(restored.session.credentialHandledByApp).toBe(false);
  });

  it("records entries by item ID and replaces a live update", () => {
    const state = createCliState(baseSession);
    const recorded = recordTransferEntry(recordTransferEntry(state, { category: "photos", itemId: "photo-1", destinationReadable: false }), { category: "photos", itemId: "photo-1", sourceHash: "a", destinationHash: "a", sourceSize: 4, destinationSize: 4, destinationReadable: true });
    expect(recorded.entries).toHaveLength(1);
    expect(recorded.entries[0].destinationReadable).toBe(true);
  });

  it("invalidates old verification when a live condition changes", () => {
    const verified = verifyCliState(complete());
    expect(verified.verification?.outcome).toBe("verified");
    const interrupted = setTransferCondition(verified, "interrupted", true);
    expect(interrupted.verification).toBeNull();
  });

  it("reports the current checklist state for real-time monitoring", () => {
    const status = renderCliStatus(setTransferCondition(createCliState(baseSession), "destination-reachable", true));
    expect(status).toContain("Destination reachable: yes");
    expect(status).toContain("Verification: not-run");
    expect(status).toContain("Source release: held");
  });

  it("requires verification before source release", () => {
    expect(() => confirmSourceRelease(complete())).toThrow("Run verify");
  });

  it("blocks release for partial verification", () => {
    let state = createCliState(baseSession, { destinationReachable: true });
    state = recordTransferEntry(state, { category: "contacts", itemId: "contacts", sourceHash: "a", destinationHash: "different", destinationReadable: true });
    state = verifyCliState(state);
    expect(state.verification?.outcome).toBe("partially-verified");
    expect(() => confirmSourceRelease(state)).toThrow("verified transfer");
  });

  it("allows release only after verified outcome and literal owner acknowledgement", () => {
    const verified = verifyCliState(complete());
    expect(confirmSourceRelease(verified).sourceReleaseConfirmed).toBe(true);
  });

  it("keeps source release held when source preservation changes after verification", () => {
    const verified = verifyCliState(complete());
    const notPreserved = setTransferCondition(verified, "source-preserved", false);
    expect(notPreserved.verification).toBeNull();
    expect(() => confirmSourceRelease(notPreserved)).toThrow("Run verify");
  });

  it("marks interrupted state as partial after verification", () => {
    const interrupted = verifyCliState(setTransferCondition(complete(), "interrupted", true));
    expect(interrupted.verification?.outcome).toBe("partially-verified");
    expect(interrupted.verification?.interrupted).toBe(true);
  });
});
