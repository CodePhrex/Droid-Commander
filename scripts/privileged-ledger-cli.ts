#!/usr/bin/env node
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { appendPrivilegedAction, exportPrivilegedLedger, readPrivilegedLedger, verifyPrivilegedLedger, type PrivilegedActionResult, type PrivilegedActionType } from "../lib/privileged-action-ledger";
import { renderPrivilegedDisclosureMarkdown } from "../lib/privileged-action-report";

const args = process.argv.slice(2).filter((value) => value !== "--");
if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`Usage:
  pnpm privileged:ledger -- append --ledger PATH --action oem-unlock-request --result requested --operator ID --organization ORG --target TARGET --summary TEXT --implementation TEXT --modifications "item one|item two" [--consent-ref REF] [--ticket-ref REF] [--json]
  pnpm privileged:ledger -- verify --ledger PATH [--json]
  pnpm privileged:ledger -- inspect --ledger PATH [--json]
  pnpm privileged:ledger -- export --ledger PATH --format json|jsonl --output PATH
  pnpm privileged:ledger -- report --ledger PATH --format markdown|pdf --output PATH [--json]

The ledger is append-only and hash-chained. It records requests, approvals, handoffs, completions, failures, cancellations, and system modifications. It rejects credentials, private keys, passwords, PINs, recovery codes, tokens, and secret material.`);
  process.exit(0);
}

function parse(values: string[]) {
  const command = values.shift() ?? "";
  const options: Record<string, string | boolean> = { json: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (next && !next.startsWith("--")) options[key] = next, index += 1;
    else options[key] = true;
  }
  return { command, options };
}

function required(options: Record<string, string | boolean>, key: string) { const value = options[key]; if (!value || typeof value !== "string") throw new Error(`Missing --${key}.`); return value; }
function output(value: unknown, json: boolean) { console.log(json ? JSON.stringify(value, null, 2) : JSON.stringify(value, null, 2)); }

function main() {
  const { command, options } = parse(args);
  const json = options.json === true;
  const ledger = resolve(required(options, "ledger"));
  if (command === "append") {
    const event = appendPrivilegedAction(ledger, {
      operatorId: required(options, "operator"),
      organizationId: required(options, "organization"),
      targetId: required(options, "target"),
      action: required(options, "action") as PrivilegedActionType,
      result: required(options, "result") as PrivilegedActionResult,
      summary: required(options, "summary"),
      implementation: required(options, "implementation"),
      modifications: required(options, "modifications").split("|").map((value) => value.trim()).filter(Boolean),
      consentReference: typeof options["consent-ref"] === "string" ? options["consent-ref"] : undefined,
      ticketReference: typeof options["ticket-ref"] === "string" ? options["ticket-ref"] : undefined,
    });
    output(event, json);
    return;
  }
  if (command === "verify") {
    const result = verifyPrivilegedLedger(ledger);
    output(result, json);
    if (!result.valid) process.exitCode = 2;
    return;
  }
  if (command === "inspect") {
    const integrity = verifyPrivilegedLedger(ledger);
    const events = existsSync(ledger) ? readPrivilegedLedger(ledger) : [];
    output({ ledger, integrity, entries: events.length, lastEvent: events.at(-1) ?? null }, json);
    if (!integrity.valid) process.exitCode = 2;
    return;
  }
  if (command === "export") {
    const format = options.format === "jsonl" ? "jsonl" : "json";
    const exported = exportPrivilegedLedger(ledger, format);
    const outputPath = required(options, "output");
    writeFileSync(resolve(outputPath), exported, { mode: 0o600 });
    output({ output: resolve(outputPath), format, integrity: verifyPrivilegedLedger(ledger) }, json);
    return;
  }
  if (command === "report") {
    const format = options.format === "pdf" ? "pdf" : "markdown";
    const events = existsSync(ledger) ? readPrivilegedLedger(ledger) : [];
    const integrity = verifyPrivilegedLedger(ledger);
    const markdown = renderPrivilegedDisclosureMarkdown(events, integrity);
    const outputPath = resolve(required(options, "output"));
    if (format === "markdown") {
      writeFileSync(outputPath, markdown, { mode: 0o600 });
    } else {
      const tempDir = mkdtempSync(`${tmpdir()}/droidcmd-report-`);
      const sourcePath = resolve(tempDir, "disclosure.md");
      writeFileSync(sourcePath, markdown, { mode: 0o600 });
      const conversion = spawnSync("manus-md-to-pdf", [sourcePath, outputPath], { encoding: "utf8" });
      if (conversion.error || conversion.status !== 0) throw new Error(`PDF conversion failed. Markdown source retained at ${sourcePath}. ${conversion.stderr ?? conversion.error?.message ?? ""}`.trim());
    }
    output({ output: outputPath, format, integrity, entries: events.length }, json);
    if (!integrity.valid) process.exitCode = 2;
    return;
  }
  throw new Error(`Unknown command: ${command}. Use --help.`);
}

try { main(); } catch (error) { console.error(`ERROR: ${error instanceof Error ? error.message : "command failed"}`); process.exitCode = 1; }
