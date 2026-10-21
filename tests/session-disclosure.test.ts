import { describe, expect, it } from "vitest";

import { sessions } from "../constants/commander";
import { renderPrivilegedLedgerDisclosureMarkdown, renderSessionDisclosureMarkdown } from "../lib/session-disclosure";

describe("session disclosure export", () => {
  it("renders local session context as readable Markdown", () => {
    const report = renderSessionDisclosureMarkdown(sessions, "2026-10-20T21:30:00.000Z");
    expect(report).toContain("# Droid Commander Session Disclosure");
    expect(report).toContain("session-041");
    expect(report).toContain("owner consent");
    expect(report).toContain("**Generated:** 2026-10-20T21:30:00.000Z");
  });

  it("excludes sensitive fields from the session report", () => {
    const report = renderSessionDisclosureMarkdown([], "2026-10-20T21:30:00.000Z");
    expect(report).toContain("does not include credentials");
    expect(report).not.toContain("private key:");
  });

  it("renders a verified live ledger disclosure", () => {
    const report = renderPrivilegedLedgerDisclosureMarkdown([{
      eventId: "event-1",
      sequence: 1,
      recordedAt: "2026-10-20T21:30:00.000Z",
      previousHash: null,
      hash: "abc123",
      operatorId: "operator-1",
      organizationId: "org-1",
      targetId: "lab-device-1",
      action: "privileged-diagnostic",
      result: "completed",
      summary: "Collected boot-state diagnostics.",
      implementation: "Read-only native adapter.",
      modifications: ["No device changes."],
    }], { valid: true, entries: 1, lastHash: "abc123" }, "2026-10-20T21:30:00.000Z");
    expect(report).toContain("**Integrity:** VERIFIED");
    expect(report).toContain("privileged-diagnostic");
    expect(report).toContain("event-1");
    expect(report).toContain("No device changes.");
  });

  it("marks an invalid chain as an audit failure", () => {
    const report = renderPrivilegedLedgerDisclosureMarkdown([], { valid: false, entries: 2, lastHash: "abc123", error: "Hash mismatch at entry 2." });
    expect(report).toContain("**Integrity:** INVALID");
    expect(report).toContain("Hash mismatch at entry 2.");
    expect(report).toContain("must be treated as an audit failure");
  });
});
