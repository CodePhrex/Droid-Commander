import { describe, expect, it } from "vitest";

import { sessions } from "../constants/commander";
import { renderSessionDisclosureMarkdown } from "../lib/session-disclosure";

describe("session disclosure export", () => {
  it("renders local session context as readable Markdown", () => {
    const report = renderSessionDisclosureMarkdown(sessions, "2026-10-20T21:30:00.000Z");
    expect(report).toContain("# Droid Commander Session Disclosure");
    expect(report).toContain("session-041");
    expect(report).toContain("owner consent");
    expect(report).toContain("**Generated:** 2026-10-20T21:30:00.000Z");
  });

  it("states the prototype ledger boundary and excludes sensitive fields", () => {
    const report = renderSessionDisclosureMarkdown([], "2026-10-20T21:30:00.000Z");
    expect(report).toContain("hash-chained privileged-action ledger export");
    expect(report).toContain("does not include credentials");
    expect(report).not.toContain("private key:");
  });
});
