import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type PrivilegedActionType =
  | "developer-options-change"
  | "usb-debugging-change"
  | "oem-unlock-request"
  | "bootloader-handoff"
  | "recovery-handoff"
  | "root-session"
  | "privileged-diagnostic"
  | "remediation"
  | "system-patch-handoff"
  | "session-close";

export type PrivilegedActionResult = "requested" | "approved" | "denied" | "started" | "completed" | "failed" | "cancelled";

export type PrivilegedActionInput = {
  operatorId: string;
  organizationId: string;
  targetId: string;
  action: PrivilegedActionType;
  result: PrivilegedActionResult;
  summary: string;
  implementation: string;
  modifications: readonly string[];
  consentReference?: string;
  ticketReference?: string;
  recordedAt?: string;
};

export type PrivilegedActionEvent = PrivilegedActionInput & {
  eventId: string;
  sequence: number;
  recordedAt: string;
  previousHash: string | null;
  hash: string;
};

export type LedgerVerification = { valid: boolean; entries: number; lastHash: string | null; error?: string };

const secretPattern = /(?:password|passcode|pin|private\s*key|secret|recovery\s*code|seed\s*phrase|access\s*token|refresh\s*token|client\s*secret)/i;
const actions = new Set<PrivilegedActionType>([
  "developer-options-change", "usb-debugging-change", "oem-unlock-request", "bootloader-handoff", "recovery-handoff", "root-session", "privileged-diagnostic", "remediation", "system-patch-handoff", "session-close",
]);
const results = new Set<PrivilegedActionResult>(["requested", "approved", "denied", "started", "completed", "failed", "cancelled"]);

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function checkText(label: string, value: string | undefined, required = true) {
  if (required && !value?.trim()) throw new Error(`${label} is required.`);
  if (value && secretPattern.test(value)) throw new Error(`${label} appears to contain secret material; credentials and private data are never stored in the ledger.`);
}

function parseLines(path: string): PrivilegedActionEvent[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line) as PrivilegedActionEvent; } catch { throw new Error(`Ledger line ${index + 1} is not valid JSON.`); }
  });
}

function eventHash(event: Omit<PrivilegedActionEvent, "hash">) { return createHash("sha256").update(canonical(event), "utf8").digest("hex"); }

export function appendPrivilegedAction(path: string, input: PrivilegedActionInput): PrivilegedActionEvent {
  checkText("operatorId", input.operatorId);
  checkText("organizationId", input.organizationId);
  checkText("targetId", input.targetId);
  checkText("summary", input.summary);
  checkText("implementation", input.implementation);
  checkText("consentReference", input.consentReference, false);
  checkText("ticketReference", input.ticketReference, false);
  if (!actions.has(input.action)) throw new Error(`Unsupported privileged action: ${input.action}.`);
  if (!results.has(input.result)) throw new Error(`Unsupported privileged action result: ${input.result}.`);
  if (!input.modifications.length) throw new Error("At least one modification or explicit no-change statement is required.");
  input.modifications.forEach((modification) => checkText("modification", modification));
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
