import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { appendPrivilegedAction, exportPrivilegedLedger, readPrivilegedLedger, verifyPrivilegedLedger } from "../lib/privileged-action-ledger";

function input(overrides: Record<string, unknown> = {}) {
  return {
    operatorId: "operator-001",
    organizationId: "org-001",
    targetId: "device-001",
    action: "oem-unlock-request" as const,
    result: "requested" as const,
    summary: "Owner-requested OEM unlock preparation",
    implementation: "Recorded visible OEM handoff request; no device mutation performed",
    modifications: ["No system modification performed", "Handoff request created"],
    consentReference: "consent-001",
    ticketReference: "ticket-001",
    recordedAt: "2026-10-20T21:10:00.000Z",
    ...overrides,
  };
}

describe("privileged action ledger", () => {
  it("appends hash-chained disclosure events", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-ledger-"));
    const path = join(dir, "privileged.jsonl");
    const first = appendPrivilegedAction(path, input());
    const second = appendPrivilegedAction(path, input({ action: "bootloader-handoff", result: "approved", recordedAt: "2026-10-20T21:11:00.000Z" }));
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(second.previousHash).toBe(first.hash);
    expect(verifyPrivilegedLedger(path)).toMatchObject({ valid: true, entries: 2, lastHash: second.hash });
  });

  it("exports user disclosure as JSON or JSONL", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-ledger-"));
    const path = join(dir, "privileged.jsonl");
    appendPrivilegedAction(path, input());
    expect(JSON.parse(exportPrivilegedLedger(path, "json"))).toMatchObject({ events: [{ action: "oem-unlock-request", result: "requested" }] });
    expect(exportPrivilegedLedger(path, "jsonl")).toContain("oem-unlock-request");
  });

  it("detects tampering and refuses further appends", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-ledger-"));
    const path = join(dir, "privileged.jsonl");
    appendPrivilegedAction(path, input());
    const tampered = readFileSync(path, "utf8").replace("requested", "completed");
    writeFileSync(path, tampered);
    expect(verifyPrivilegedLedger(path).valid).toBe(false);
    expect(() => appendPrivilegedAction(path, input({ recordedAt: "2026-10-20T21:12:00.000Z" }))).toThrow("invalid ledger");
  });

  it("rejects secrets and requires an explicit no-change or modification disclosure", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-ledger-"));
    const path = join(dir, "privileged.jsonl");
    expect(() => appendPrivilegedAction(path, input({ summary: "Use password hunter" }))).toThrow("secret material");
    expect(() => appendPrivilegedAction(path, input({ modifications: [] }))).toThrow("modification");
  });

  it("preserves append-only evidence for denied and failed actions", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-ledger-"));
    const path = join(dir, "privileged.jsonl");
    appendPrivilegedAction(path, input({ result: "denied", action: "usb-debugging-change", summary: "Owner declined USB debugging request", modifications: ["No setting changed"] }));
    appendPrivilegedAction(path, input({ result: "failed", action: "recovery-handoff", summary: "Recovery handoff stopped after verification failure", modifications: ["Source device preserved", "No image installed"], recordedAt: "2026-10-20T21:11:00.000Z" }));
    const events = readPrivilegedLedger(path);
    expect(events.map((event) => event.result)).toEqual(["denied", "failed"]);
  });
});
