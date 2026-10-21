import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { appendPrivilegedAction, verifyPrivilegedLedger } from "../lib/privileged-action-ledger";
import { renderPrivilegedDisclosureMarkdown } from "../lib/privileged-action-report";

describe("privileged disclosure report", () => {
  it("renders a readable summary and event disclosure", () => {
    const path = join(mkdtempSync(join(tmpdir(), "droidcmd-report-")), "ledger.jsonl");
    appendPrivilegedAction(path, { operatorId: "operator-001", organizationId: "org-001", targetId: "device-001", action: "oem-unlock-request", result: "requested", summary: "Owner-requested OEM unlock preparation", implementation: "Visible OEM handoff request; no device mutation performed", modifications: ["No system modification performed"], recordedAt: "2026-10-20T21:20:00.000Z" });
    const report = renderPrivilegedDisclosureMarkdown([JSON.parse(readFileSync(path, "utf8"))], verifyPrivilegedLedger(path), "2026-10-20T21:21:00.000Z");
    expect(report).toContain("# Privileged-Action Disclosure Report");
    expect(report).toContain("VALID");
    expect(report).toContain("oem-unlock-request");
    expect(report).toContain("No system modification performed");
    expect(report).not.toContain("Owner password: ");
  });

  it("discloses invalid-chain status instead of hiding it", () => {
    const report = renderPrivilegedDisclosureMarkdown([], { valid: false, entries: 1, lastHash: null, error: "Hash mismatch at line 1." }, "2026-10-20T21:21:00.000Z");
    expect(report).toContain("INVALID");
    expect(report).toContain("Do not rely on this report as a complete disclosure");
  });
});
