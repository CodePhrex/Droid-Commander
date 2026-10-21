import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export { canonicalizeLedgerValue, validatePrivilegedActionInput } from "./privileged-action-core";
export type { PrivilegedActionEvent, PrivilegedActionInput, PrivilegedActionResult, PrivilegedActionType } from "./privileged-action-core";
import { canonicalizeLedgerValue, validatePrivilegedActionInput, type PrivilegedActionEvent, type PrivilegedActionInput } from "./privileged-action-core";

export type LedgerVerification = { valid: boolean; entries: number; lastHash: string | null; error?: string };

function parseLines(path: string): PrivilegedActionEvent[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line) as PrivilegedActionEvent; } catch { throw new Error(`Ledger line ${index + 1} is not valid JSON.`); }
  });
}

function eventHash(event: Omit<PrivilegedActionEvent, "hash">) { return createHash("sha256").update(canonicalizeLedgerValue(event), "utf8").digest("hex"); }

export function appendPrivilegedAction(path: string, input: PrivilegedActionInput): PrivilegedActionEvent {
  validatePrivilegedActionInput(input);
  const integrity = verifyPrivilegedLedger(path);
  if (!integrity.valid) throw new Error(`Refusing to append to an invalid ledger: ${integrity.error ?? "integrity check failed"}`);
  const prior = parseLines(path);
  const event: Omit<PrivilegedActionEvent, "hash"> = {
    ...input,
    eventId: randomUUID(),
    sequence: prior.length + 1,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    previousHash: prior.at(-1)?.hash ?? null,
  };
  const complete = { ...event, hash: eventHash(event) };
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, "", { mode: 0o600 });
  appendFileSync(path, `${JSON.stringify(complete)}\n`, { mode: 0o600 });
  return complete;
}

export function verifyPrivilegedLedger(path: string): LedgerVerification {
  try {
    const events = parseLines(path);
    let previousHash: string | null = null;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (event.sequence !== index + 1) return { valid: false, entries: events.length, lastHash: previousHash, error: `Sequence mismatch at line ${index + 1}.` };
      if (event.previousHash !== previousHash) return { valid: false, entries: events.length, lastHash: previousHash, error: `Previous-hash mismatch at line ${index + 1}.` };
      const { hash, ...unsigned } = event;
      if (eventHash(unsigned) !== hash) return { valid: false, entries: events.length, lastHash: previousHash, error: `Hash mismatch at line ${index + 1}.` };
      previousHash = hash;
    }
    return { valid: true, entries: events.length, lastHash: previousHash };
  } catch (error) {
    return { valid: false, entries: 0, lastHash: null, error: error instanceof Error ? error.message : "Ledger verification failed." };
  }
}

export function readPrivilegedLedger(path: string) { return parseLines(path); }

export function exportPrivilegedLedger(path: string, format: "json" | "jsonl" = "json") {
  const events = readPrivilegedLedger(path);
  return format === "jsonl" ? events.map((event) => JSON.stringify(event)).join("\n") + (events.length ? "\n" : "") : JSON.stringify({ exportedAt: new Date().toISOString(), integrity: verifyPrivilegedLedger(path), events }, null, 2);
}
