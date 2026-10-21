import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({ value: null as string | null }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async () => storage.value,
    setItem: async (_key: string, value: string) => { storage.value = value; },
    removeItem: async () => { storage.value = null; },
  },
}));

vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: async (_algorithm: string, value: string) => createHash("sha256").update(value, "utf8").digest("hex"),
  randomUUID: () => "event-1",
}));

import { NativePrivilegedActionLedger } from "../lib/native-privileged-action-ledger";

describe("native privileged-action ledger", () => {
  beforeEach(() => { storage.value = null; });

  it("appends, verifies, and exports a canonical hash-chained event", async () => {
    const ledger = new NativePrivilegedActionLedger();
    const event = await ledger.append({
      operatorId: "operator-1",
      organizationId: "org-1",
      targetId: "device-1",
      action: "privileged-diagnostic",
      result: "completed",
      summary: "Collected read-only diagnostics.",
      implementation: "Native diagnostic adapter.",
      modifications: ["No device changes."],
      recordedAt: "2026-10-20T21:30:00.000Z",
    });
    const integrity = await ledger.verify();
    const exportJson = await ledger.export("json");

    expect(event.sequence).toBe(1);
    expect(event.previousHash).toBeNull();
    expect(event.hash).toHaveLength(64);
    expect(integrity).toEqual({ valid: true, entries: 1, lastHash: event.hash });
    expect(exportJson).toContain(event.hash);
  });

  it("refuses to append after the stored chain is tampered", async () => {
    const ledger = new NativePrivilegedActionLedger();
    await ledger.append({
      operatorId: "operator-1",
      organizationId: "org-1",
      targetId: "device-1",
      action: "privileged-diagnostic",
      result: "completed",
      summary: "Collected read-only diagnostics.",
      implementation: "Native diagnostic adapter.",
      modifications: ["No device changes."],
    });
    storage.value = storage.value?.replace("No device changes.", "Unexpected change.") ?? null;

    const integrity = await ledger.verify();
    await expect(ledger.append({
      operatorId: "operator-1",
      organizationId: "org-1",
      targetId: "device-1",
      action: "session-close",
      result: "completed",
      summary: "Closed session.",
      implementation: "Dashboard close control.",
      modifications: ["No device changes."],
    })).rejects.toThrow("Refusing to append to an invalid ledger");
    expect(integrity.valid).toBe(false);
  });

  it("rejects secret-like fields before storage", async () => {
    const ledger = new NativePrivilegedActionLedger();
    await expect(ledger.append({
      operatorId: "operator-1",
      organizationId: "org-1",
      targetId: "device-1",
      action: "privileged-diagnostic",
      result: "requested",
      summary: "PIN: 1234",
      implementation: "Native diagnostic adapter.",
      modifications: ["No device changes."],
    })).rejects.toThrow("secret material");
    expect(storage.value).toBeNull();
  });
});
