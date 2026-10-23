import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseAndroidBulletinPage } from "../lib/android-bulletin-feed";
import { OfflineVulnerabilityCatalog } from "../lib/vulnerability-catalog";

// Public source facts only: exact official-page excerpts retained in tests/fixtures.
// This is a captured reference baseline, not a live feed or a complete CVE database.
const capturedAt = "2026-10-21T19:00:00.000Z";
const inputs = [
  { filename: "android-bulletin-2026-10-01.html", url: "https://source.android.com/docs/security/bulletin/2026/2026-10-01" },
  { filename: "android-bulletin-2026-09-split-excerpt.html", url: "https://source.android.com/docs/security/bulletin/2026/2026-09-01" },
];

async function main() {
  const sourceDocuments = inputs.map((input) => {
    const html = readFileSync(resolve("tests/fixtures", input.filename), "utf8");
    return { ...input, html, excerptSha256: createHash("sha256").update(html).digest("hex") };
  });
  const bulletins = sourceDocuments.flatMap((document) => parseAndroidBulletinPage(document.html, document.url, new Date(capturedAt)));
  if (!bulletins.length || bulletins.some((bulletin) => !bulletin.fixedCves.length)) throw new Error("Official excerpts did not produce valid CVE-bearing patch sections");
  const catalog = new OfflineVulnerabilityCatalog({
    now: () => capturedAt,
    storage: { read: async () => null, write: async () => undefined },
    feedClient: {
      fetch: async (sourceId) => {
        if (sourceId !== "android-bulletin") throw new Error("Not included in bundled Android reference; refresh requires network and source configuration");
        return { sourceId, fetchedAt: capturedAt, payload: { bulletins } };
      },
    },
  });
  const view = await catalog.sync();
  const snapshot = view.snapshot;
  if (!snapshot || !snapshot.records.length) throw new Error("Empty offline reference is not deliverable");
  const document = {
    ...snapshot,
    provenance: {
      kind: "bundled-android-reference",
      capturedAt,
      coverage: "October 2026 and September 2026 Android Security Bulletin CVE tables only",
      completeInventory: false,
      sourceDocuments: sourceDocuments.map(({ filename, url, excerptSha256 }) => ({ filename, url, excerptSha256 })),
    },
  };
  mkdirSync(resolve("assets/data"), { recursive: true });
  writeFileSync(resolve("assets/data/android-reference-snapshot.json"), `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Bundled reference: ${snapshot.records.length} unique CVE records, ${snapshot.patches.length} patch sections; captured ${capturedAt}; signature ${snapshot.integrity.signatureStatus}`);
}

void main().catch(() => { console.error("Failed to generate a valid official Android reference snapshot"); process.exitCode = 1; });
