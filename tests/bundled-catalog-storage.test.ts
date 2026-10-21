import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import bundled from "../assets/data/android-reference-snapshot.json";
import { parseAndroidBulletinPage } from "../lib/android-bulletin-feed";
import { withBundledCatalogReference } from "../lib/bundled-catalog-storage";
import { OfflineVulnerabilityCatalog, type CatalogSnapshot } from "../lib/vulnerability-catalog";

const reference = bundled as CatalogSnapshot;
const now = bundled.generatedAt;
const source = () => ({ read: async () => null, write: vi.fn(async () => undefined) });

describe("real bundled Android reference", () => {
  it("loads useful references on first offline launch without a network call", async () => {
    const fetch = vi.fn(async () => { throw new Error("offline"); });
    const catalog = new OfflineVulnerabilityCatalog({ storage: withBundledCatalogReference(source(), reference), feedClient: { fetch }, now: () => now });
    const view = await catalog.loadCached();
    expect(fetch).not.toHaveBeenCalled();
    expect(view).toMatchObject({ online: false, offlineUsable: true, dataState: "cached" });
    expect(view.snapshot?.records).toHaveLength(121);
    expect(view.snapshot?.patches).toHaveLength(3);
    expect(view.snapshot?.integrity.signatureStatus).toBe("not-configured");
  });
  it("contains only public CVEs explicitly parsed from the provenance-pinned official excerpts", () => {
    const parsedIds = new Set<string>();
    for (const source of bundled.provenance.sourceDocuments) {
      const html = readFileSync(new URL(`../tests/fixtures/${source.filename}`, import.meta.url), "utf8");
      expect(createHash("sha256").update(html).digest("hex")).toBe(source.excerptSha256);
      expect(source.url).toMatch(/^https:\/\/source\.android\.com\/docs\/security\/bulletin\//);
      for (const patch of parseAndroidBulletinPage(html, source.url, new Date(now))) for (const id of patch.fixedCves) parsedIds.add(id);
    }
    expect(new Set(bundled.records.map((record) => record.id))).toEqual(parsedIds);
    expect(bundled.records.every((record) => /^CVE-\d{4}-\d{4,}$/.test(record.id))).toBe(true);
    expect(bundled.provenance.completeInventory).toBe(false);
  });
  it("preserves a nonempty existing cache rather than overwriting user refresh results", async () => {
    const cached = { ...bundled, generatedAt: "2026-10-22T00:00:00Z" };
    const storage = withBundledCatalogReference({ read: async () => JSON.stringify(cached), write: async () => undefined }, reference);
    expect(JSON.parse((await storage.read())!).generatedAt).toBe(cached.generatedAt);
  });
  it.each(["not-json", JSON.stringify({ ...bundled, records: [], patches: [] })])("replaces corrupt or previously empty catalog data with the real reference baseline", async (raw) => {
    const storage = withBundledCatalogReference({ read: async () => raw, write: async () => undefined }, reference);
    expect(JSON.parse((await storage.read())!).records).toHaveLength(121);
  });
  it("retains the baseline with stale source disclosure after offline refresh failure", async () => {
    const catalog = new OfflineVulnerabilityCatalog({ storage: withBundledCatalogReference(source(), reference), feedClient: { fetch: async () => { throw new Error("offline"); } }, now: () => now });
    const view = await catalog.sync();
    expect(view.snapshot?.records).toHaveLength(121);
    expect(view.dataState).toBe("stale");
    expect(view.snapshot?.sources.find((source) => source.sourceId === "android-bulletin")?.status).toBe("stale");
  });
});
