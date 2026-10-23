import type { CatalogSeverity } from "./vulnerability-catalog";

/** The official Android Security Bulletin landing page, not a third-party mirror. */
export const ANDROID_BULLETIN_INDEX_URL = "https://source.android.com/docs/security/bulletin";
export const MAX_ANDROID_BULLETIN_PAGES = 3;
export const ANDROID_BULLETIN_REQUEST_TIMEOUT_MS = 15_000;
export const MAX_ANDROID_BULLETIN_HTML_BYTES = 3 * 1024 * 1024;

const CVE_ID = /^CVE-\d{4}-\d{4,}$/i;
const PATCH_LEVEL = /^(\d{4})-(\d{2})-(01|05)$/;
const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export type AndroidBulletinVulnerability = {
  /** CVE IDs are taken only from a dedicated CVE table cell. */
  id: string;
  severity: CatalogSeverity;
  /** Values from the official table's "Updated AOSP versions" column, where present. */
  affectedAndroidVersions: string[];
};

export type AndroidBulletinPatch = {
  id: string;
  platform: "android";
  title: string;
  patchLevel: string;
  publishedAt?: string;
  fixedCves: string[];
  vulnerabilities: AndroidBulletinVulnerability[];
  url: string;
};

export type AndroidBulletinPayload = {
  bulletins: AndroidBulletinPatch[];
  sourceUrl: string;
  coverage: "latest-3-monthly-bulletins";
};

type HtmlDocument = {
  html: string;
  modifiedAt?: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, encoded: string) => {
      const codePoint = encoded.toLowerCase().startsWith("x") ? Number.parseInt(encoded.slice(1), 16) : Number.parseInt(encoded, 10);
      return Number.isSafeInteger(codePoint) ? String.fromCodePoint(codePoint) : "";
    })
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/gi, (_, entity: string) => ({
      nbsp: " ",
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      "#39": "'",
      apos: "'",
    })[entity.toLowerCase()] ?? "");
}

/** Converts only enough markup to text to identify document headings and table cells. */
export function androidBulletinHtmlText(html: string) {
  return normalizeWhitespace(decodeHtml(
    html
      .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ")
      .replace(/<br\s*\/?>/gi, ", ")
      .replace(/<[^>]+>/g, " "),
  ));
}

function validPatchLevel(value: string, now: Date) {
  const match = PATCH_LEVEL.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    && parsed.getTime() <= now.getTime();
}

function validDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

function monthNameDate(value: string, now: Date) {
  const match = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const month = MONTHS[match[1].toLowerCase()];
  if (month === undefined) return undefined;
  const parsed = new Date(Date.UTC(Number(match[3]), month, Number(match[2])));
  if (!validDate(parsed) || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== Number(match[2]) || parsed.getTime() > now.getTime()) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function dateFromBulletinUrl(url: string, now: Date) {
  const match = /\/bulletin\/(\d{4})\/(\d{4}-\d{2}-\d{2})$/.exec(new URL(url).pathname);
  return match && validPatchLevel(match[2], now) ? match[2] : undefined;
}

function officialUrl(href: string, baseUrl: string) {
  try {
    const url = new URL(decodeHtml(href), baseUrl);
    const base = new URL(baseUrl);
    return url.protocol === "https:" && url.origin === base.origin ? url : null;
  } catch {
    return null;
  }
}

function anchorHrefs(html: string, baseUrl: string) {
  return [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)]
    .map((match) => officialUrl(match[1], baseUrl))
    .filter((url): url is URL => url !== null);
}

/** Finds the official bulletin overview linked from the official landing index. */
export function extractAndroidBulletinOverviewUrl(indexHtml: string, indexUrl = ANDROID_BULLETIN_INDEX_URL) {
  const overview = anchorHrefs(indexHtml, indexUrl).find((url) => url.pathname === "/docs/security/bulletin/asb-overview" && !url.search && !url.hash);
  if (!overview) throw new Error("Android bulletin index did not link to the official bulletin overview");
  return overview.toString();
}

/**
 * Returns at most the three newest dated Android-platform bulletin pages. It accepts
 * only /docs/security/bulletin/YYYY/YYYY-MM-DD links, excluding Pixel, Automotive,
 * Wear, and other platform-specific bulletin paths by construction.
 */
export function extractLatestAndroidBulletinUrls(overviewHtml: string, overviewUrl: string, now: Date = new Date()) {
  const bulletins = new Map<string, string>();
  for (const url of anchorHrefs(overviewHtml, overviewUrl)) {
    const match = /^\/docs\/security\/bulletin\/(\d{4})\/(\d{4}-\d{2}-\d{2})$/.exec(url.pathname);
    if (!match || url.search || url.hash || !validPatchLevel(match[2], now)) continue;
    if (!bulletins.has(match[2])) bulletins.set(match[2], url.toString());
  }
  const latest = [...bulletins.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, MAX_ANDROID_BULLETIN_PAGES)
    .map(([, url]) => url);
  if (latest.length === 0) throw new Error("Android bulletin overview did not contain any current official Android monthly bulletin links");
  return latest;
}

function tableCells(rowHtml: string) {
  return [...rowHtml.matchAll(/<t([dh])\b[^>]*>([\s\S]*?)<\/t\1>/gi)].map((match) => ({ kind: match[1].toLowerCase(), text: androidBulletinHtmlText(match[2]) }));
}

function tableVulnerabilities(tableHtml: string) {
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => tableCells(match[1])).filter((row) => row.length > 0);
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.kind === "h"));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((cell) => cell.text.toLowerCase());
  const cveColumn = headers.findIndex((header) => header === "cve" || header === "cve id");
  if (cveColumn < 0) return [];
  const severityColumn = headers.findIndex((header) => header === "severity");
  const versionsColumn = headers.findIndex((header) => header.includes("aosp") && header.includes("version"));
  const vulnerabilities: AndroidBulletinVulnerability[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const cve = row[cveColumn]?.text.trim().replace(/,+$/, "").trim().toUpperCase();
    if (!cve || !CVE_ID.test(cve)) continue;
    const reportedSeverity = row[severityColumn]?.text.toLowerCase();
    const severity: CatalogSeverity = reportedSeverity && ["none", "low", "medium", "high", "critical"].includes(reportedSeverity)
      ? reportedSeverity as CatalogSeverity
      : "unknown";
    const affectedAndroidVersions = (row[versionsColumn]?.text ?? "")
      .split(",")
      .map((version) => version.trim())
      .filter((version) => /^\d{1,2}(?:-qpr\d+)?$/i.test(version));
    vulnerabilities.push({ id: cve, severity, affectedAndroidVersions: [...new Set(affectedAndroidVersions)] });
  }
  return vulnerabilities;
}

function publishedAtFromHtml(html: string, fallback: string | undefined, now: Date) {
  const text = androidBulletinHtmlText(html);
  const published = /\bPublished\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\b/i.exec(text)?.[1]
    ?? /\b([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+Bulletin Published\b/i.exec(text)?.[1];
  return (published && monthNameDate(published, now)) || fallback;
}

/**
 * Parses a single official Android monthly bulletin. CVEs are taken only from rows
 * under the nearest preceding H2 patch-level heading; CVEs in prose or unrelated
 * tables are deliberately ignored.
 */
export function parseAndroidBulletinPage(html: string, url: string, now: Date = new Date()): AndroidBulletinPatch[] {
  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => ({ text: androidBulletinHtmlText(match[1]), start: match.index ?? 0, end: (match.index ?? 0) + match[0].length }));
  const fallbackPublishedAt = dateFromBulletinUrl(url, now);
  const publishedAt = publishedAtFromHtml(html, fallbackPublishedAt, now);
  const patches: AndroidBulletinPatch[] = [];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const patchMatch = /\b(\d{4}-\d{2}-(?:01|05))\s+security patch level vulnerability details\b/i.exec(heading.text);
    if (!patchMatch || !validPatchLevel(patchMatch[1], now)) continue;
    const section = html.slice(heading.end, headings[index + 1]?.start ?? html.length);
    const vulnerabilitiesById = new Map<string, AndroidBulletinVulnerability>();
    for (const table of section.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)) {
      for (const vulnerability of tableVulnerabilities(table[0])) {
        const previous = vulnerabilitiesById.get(vulnerability.id);
        vulnerabilitiesById.set(vulnerability.id, previous
          ? {
            id: vulnerability.id,
            severity: previous.severity === "unknown" ? vulnerability.severity : previous.severity,
            affectedAndroidVersions: [...new Set([...previous.affectedAndroidVersions, ...vulnerability.affectedAndroidVersions])],
          }
          : vulnerability);
      }
    }
    const vulnerabilities = [...vulnerabilitiesById.values()];
    if (vulnerabilities.length === 0) continue;
    const patchLevel = patchMatch[1];
    patches.push({
      id: `android-${patchLevel}`,
      platform: "android",
      title: `Android Security Bulletin ${patchLevel}`,
      patchLevel,
      publishedAt,
      fixedCves: vulnerabilities.map((vulnerability) => vulnerability.id),
      vulnerabilities,
      url,
    });
  }
  return patches;
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

async function fetchHtml(fetcher: typeof fetch, url: string): Promise<HtmlDocument> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANDROID_BULLETIN_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, { headers: { Accept: "text/html,application/xhtml+xml", "Accept-Language": "en" }, signal: controller.signal });
    if (!response.ok) throw new Error(`android-bulletin HTTP ${response.status} for ${url}`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_ANDROID_BULLETIN_HTML_BYTES) throw new Error(`android-bulletin HTML exceeds ${MAX_ANDROID_BULLETIN_HTML_BYTES} bytes for ${url}`);
    const html = await response.text();
    if (byteLength(html) > MAX_ANDROID_BULLETIN_HTML_BYTES) throw new Error(`android-bulletin HTML exceeds ${MAX_ANDROID_BULLETIN_HTML_BYTES} bytes for ${url}`);
    const lastModified = response.headers.get("last-modified");
    const modified = lastModified ? new Date(lastModified) : null;
    return { html, modifiedAt: modified && validDate(modified) ? modified.toISOString() : undefined };
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`android-bulletin request timed out after ${ANDROID_BULLETIN_REQUEST_TIMEOUT_MS}ms for ${url}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches the official index, its official overview, and no more than three recent Android monthly pages. */
export async function fetchAndroidBulletinPayload(fetcher: typeof fetch = fetch, now: Date = new Date()) {
  const fetchedAt = new Date().toISOString();
  const index = await fetchHtml(fetcher, ANDROID_BULLETIN_INDEX_URL);
  const overviewUrl = extractAndroidBulletinOverviewUrl(index.html);
  const overview = await fetchHtml(fetcher, overviewUrl);
  const urls = extractLatestAndroidBulletinUrls(overview.html, overviewUrl, now);
  const documents: Array<{ url: string; document: HtmlDocument }> = [];
  for (const url of urls) documents.push({ url, document: await fetchHtml(fetcher, url) });
  const bulletins = documents.flatMap(({ url, document }) => parseAndroidBulletinPage(document.html, url, now));
  const cveCount = bulletins.reduce((total, bulletin) => total + bulletin.fixedCves.length, 0);
  if (bulletins.length === 0 || cveCount === 0) {
    throw new Error("Android bulletin parser found no recognized official patch-level sections with explicit CVE rows");
  }
  const modifiedAt = [index, overview, ...documents.map(({ document }) => document)]
    .map((document) => document.modifiedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  return {
    fetchedAt,
    modifiedAt,
    payload: { bulletins, sourceUrl: ANDROID_BULLETIN_INDEX_URL, coverage: "latest-3-monthly-bulletins" } satisfies AndroidBulletinPayload,
  };
}
