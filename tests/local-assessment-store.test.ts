import { describe, expect, it, vi } from "vitest";
import { HOST_HISTORY_KEY, LocalAssessmentStore } from "../lib/local-assessment-store";

const now = "2026-10-21T18:00:00.000Z";
const raw = { manufacturer: "Samsung", model: "TEST-HOST", androidVersion: "16", sdkInt: 36, collectedAt: now, securityPatch: "2026-10-01" };
function setup(options: { initial?: string; collect?: () => Promise<unknown>; saveFails?: boolean; rootFails?: boolean } = {}) {
  let value: string | null = options.initial ?? null;
  let sequence = 0;
  const storage = {
    getItem: vi.fn(async () => value),
    setItem: vi.fn(async (_key: string, input: string) => { if (options.saveFails) throw new Error("disk full"); value = input; }),
  };
  const collect = vi.fn(options.collect ?? (async () => raw));
  const dependencies = { storage, collect, detectRoot: vi.fn(async () => { if (options.rootFails) throw new Error("denied"); return { availability: "unavailable" }; }), now: () => now, uuid: () => `report-${++sequence}` };
  return { store: new LocalAssessmentStore(dependencies), dependencies, storage, collect, saved: () => value };
}

describe("shared live-host assessment store", () => {
  it("starts empty rather than with fictional handset sessions", async () => {
    const { store } = setup();
    await store.initialize();
    expect(store.getSnapshot()).toMatchObject({ phase: "idle", history: [], report: null });
  });
  it("collects real native evidence and saves it once", async () => {
    const { store, collect, storage } = setup();
    await store.runAssessment();
    expect(collect).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(HOST_HISTORY_KEY, expect.stringContaining("TEST-HOST"));
    expect(store.getSnapshot()).toMatchObject({ phase: "complete", cached: false });
    expect(store.getSnapshot().history).toHaveLength(1);
  });
  it("coalesces simultaneous buttons into one collection/write", async () => {
    let complete!: (v: unknown) => void;
    const { store, collect, storage } = setup({ collect: () => new Promise((resolve) => { complete = resolve; }) });
    await store.initialize();
    const a = store.runAssessment();
    const b = store.runAssessment();
    expect(a).toBe(b);
    await Promise.resolve();
    complete(raw);
    await a;
    expect(collect).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
  it("restores actual reports across restart as cached, not newly scanned", async () => {
    const first = setup();
    await first.store.runAssessment();
    const second = setup({ initial: first.saved()! });
    await second.store.initialize();
    expect(second.store.getSnapshot()).toMatchObject({ cached: true, phase: "complete" });
    expect(second.store.getSnapshot().report?.host.model).toBe("TEST-HOST");
    expect(second.collect).not.toHaveBeenCalled();
  });
  it("reconstructs saved derived checks instead of trusting edited pass claims", async () => {
    const first = setup();
    await first.store.runAssessment();
    const cache = JSON.parse(first.saved()!);
    cache.reports[0].checks = [{ status: "clear", label: "Everything safe" }];
    cache.reports[0].summary = { clear: 1000, observed: 1000 };
    const second = setup({ initial: JSON.stringify(cache) });
    await second.store.initialize();
    expect(second.store.getSnapshot().report?.checks).toHaveLength(8);
    expect(second.store.getSnapshot().report?.summary.clear).not.toBe(1000);
  });
  it("does not claim a privileged ledger verifies host-report history", async () => {
    const { store } = setup({ initial: "corrupt-json" });
    await store.initialize();
    expect(store.getSnapshot().history).toEqual([]);
    expect(store.getSnapshot().storageWarning).toContain("could not be read or validated");
  });
  it("reports old APK/native-module absence without saving a fake session", async () => {
    const { store, storage } = setup({ collect: async () => null });
    await store.runAssessment();
    expect(store.getSnapshot()).toMatchObject({ phase: "unavailable", report: null, history: [] });
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("surfaces native errors and does not leak error text or passwords", async () => {
    const { store } = setup({ collect: async () => { throw new Error("password=secret"); } });
    await store.runAssessment();
    expect(store.getSnapshot().phase).toBe("error");
    expect(JSON.stringify(store.getSnapshot())).not.toContain("password");
  });
  it("continues read-only host scan when root detection is unavailable", async () => {
    const { store } = setup({ rootFails: true });
    await store.runAssessment();
    expect(store.getSnapshot().phase).toBe("complete");
    expect(store.getSnapshot().report?.root.availability).toBe("unknown");
  });
  it("does not claim a failed save will survive restart", async () => {
    const { store } = setup({ saveFails: true });
    await store.runAssessment();
    expect(store.getSnapshot().report?.host.model).toBe("TEST-HOST");
    expect(store.getSnapshot().storageWarning).toContain("not saved");
  });
  it("notifies all subscribed screens of the same report", async () => {
    const { store } = setup();
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const unsubscribe = store.subscribe(listenerA);
    store.subscribe(listenerB);
    await store.runAssessment();
    expect(listenerA).toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalled();
    const count = listenerA.mock.calls.length;
    unsubscribe();
    await store.runAssessment();
    expect(listenerA).toHaveBeenCalledTimes(count);
    expect(store.getSnapshot().history).toHaveLength(2);
  });
});
