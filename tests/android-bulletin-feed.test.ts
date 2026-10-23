import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  ANDROID_BULLETIN_INDEX_URL,
  extractAndroidBulletinOverviewUrl,
  extractLatestAndroidBulletinUrls,
  fetchAndroidBulletinPayload,
  parseAndroidBulletinPage,
} from "../lib/android-bulletin-feed";

const now = new Date("2026-10-20T20:00:00.000Z");
const OCTOBER_SOURCE_URL = "https://source.android.com/docs/security/bulletin/2026/2026-10-01";
const SEPTEMBER_SOURCE_URL = "https://source.android.com/docs/security/bulletin/2026/2026-09-01";
const octoberFixture = readFileSync(new URL("./fixtures/android-bulletin-2026-10-01.html", import.meta.url), "utf8");
const septemberSplitFixture = readFileSync(new URL("./fixtures/android-bulletin-2026-09-split-excerpt.html", import.meta.url), "utf8");

function htmlResponse(html: string, headers: Record<string, string> = {}) {
  return new Response(html, { status: 200, headers: { "content-type": "text/html", ...headers } });
}

describe("official Android Security Bulletin feed", () => {
  it("parses explicit CVE rows, severity, and updated AOSP versions from an exact October 2026 official source excerpt", () => {
    const bulletins = parseAndroidBulletinPage(octoberFixture, OCTOBER_SOURCE_URL, now);

    expect(bulletins).toHaveLength(1);
    expect(bulletins[0]).toMatchObject({
      id: "android-2026-10-01",
      platform: "android",
      patchLevel: "2026-10-01",
      publishedAt: "2026-10-01",
    });
    expect(bulletins[0].fixedCves).toHaveLength(25);
    expect(bulletins[0].fixedCves).toContain("CVE-2026-58865");
    expect(bulletins[0].vulnerabilities.find((vulnerability) => vulnerability.id === "CVE-2026-58865")).toEqual({
      id: "CVE-2026-58865",
      severity: "critical",
      affectedAndroidVersions: ["14", "15", "16", "16-qpr2", "17"],
    });
  });

  it("keeps official -01 and -05 CVE rows in their nearest distinct patch-level sections", () => {
    const bulletins = parseAndroidBulletinPage(septemberSplitFixture, SEPTEMBER_SOURCE_URL, now);
    const septemberFirst = bulletins.find((bulletin) => bulletin.patchLevel === "2026-09-01");
    const septemberFifth = bulletins.find((bulletin) => bulletin.patchLevel === "2026-09-05");

    expect(bulletins.map((bulletin) => bulletin.patchLevel)).toEqual(["2026-09-01", "2026-09-05"]);
    expect(septemberFirst?.fixedCves).toHaveLength(93);
    expect(septemberFifth?.fixedCves).toHaveLength(3);
    expect(septemberFirst?.fixedCves).toContain("CVE-2026-28664");
    expect(septemberFirst?.fixedCves).toContain("CVE-2026-28616");
    expect(septemberFirst?.fixedCves).not.toContain("CVE-2026-28593");
    expect(septemberFifth?.fixedCves).toContain("CVE-2026-28593");
    expect(septemberFifth?.fixedCves).not.toContain("CVE-2026-28664");
  });

  it("discovers only dated Android monthly bulletin pages from official index links, in newest-first order", () => {
    const indexUrl = extractAndroidBulletinOverviewUrl('<a href="/docs/security/bulletin/asb-overview">Android Security Bulletins</a>');
    const urls = extractLatestAndroidBulletinUrls(`
      <a href="/docs/security/bulletin/2026/2026-08-01">August</a>
      <a href="/docs/security/bulletin/pixel/2026/2026-10-01">Pixel</a>
      <a href="/docs/security/bulletin/2026/2026-10-01">October</a>
      <a href="/docs/security/bulletin/aaos/2026/2026-10-01">Automotive</a>
      <a href="/docs/security/bulletin/2026/2026-11-01">Future</a>
      <a href="/docs/security/bulletin/2026/2026-09-01">September</a>
      <a href="/docs/security/bulletin/wear/2026/2026-10-01">Wear</a>
    `, indexUrl, now);

    expect(indexUrl).toBe("https://source.android.com/docs/security/bulletin/asb-overview");
    expect(urls).toEqual([
      "https://source.android.com/docs/security/bulletin/2026/2026-10-01",
      "https://source.android.com/docs/security/bulletin/2026/2026-09-01",
      "https://source.android.com/docs/security/bulletin/2026/2026-08-01",
    ]);
  });

  it("rejects a feed with no recognized official patch section or explicit CVE row instead of returning an empty success", async () => {
    const requestedUrls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url === ANDROID_BULLETIN_INDEX_URL) return htmlResponse('<a href="/docs/security/bulletin/asb-overview">Overview</a>');
      if (url.endsWith("/asb-overview")) return htmlResponse('<a href="/docs/security/bulletin/2026/2026-10-01">October</a>');
      return htmlResponse("<h2>2026-10-01 security patch level vulnerability details</h2><p>No table is present.</p>");
    };

    await expect(fetchAndroidBulletinPayload(fetcher, now)).rejects.toThrow("no recognized official patch-level sections with explicit CVE rows");
    expect(requestedUrls).toEqual([
      ANDROID_BULLETIN_INDEX_URL,
      "https://source.android.com/docs/security/bulletin/asb-overview",
      OCTOBER_SOURCE_URL,
    ]);
  });

  it("rejects an oversized official HTML response before reading its body", async () => {
    const fetcher: typeof fetch = async () => htmlResponse("unread", { "content-length": String(3 * 1024 * 1024 + 1) });
    await expect(fetchAndroidBulletinPayload(fetcher, now)).rejects.toThrow("HTML exceeds 3145728 bytes");
  });
});
