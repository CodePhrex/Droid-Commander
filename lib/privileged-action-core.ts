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

export const PRIVILEGED_ACTIONS: readonly PrivilegedActionType[] = [
  "developer-options-change", "usb-debugging-change", "oem-unlock-request", "bootloader-handoff", "recovery-handoff", "root-session", "privileged-diagnostic", "remediation", "system-patch-handoff", "session-close",
];

export const PRIVILEGED_RESULTS: readonly PrivilegedActionResult[] = ["requested", "approved", "denied", "started", "completed", "failed", "cancelled"];

const secretPattern = /(?:password|passcode|pin|private\s*key|secret|recovery\s*code|seed\s*phrase|access\s*token|refresh\s*token|client\s*secret)/i;

export function canonicalizeLedgerValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalizeLedgerValue).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeLedgerValue((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function validatePrivilegedActionInput(input: PrivilegedActionInput) {
  const checkText = (label: string, value: string | undefined, required = true) => {
    if (required && !value?.trim()) throw new Error(`${label} is required.`);
    if (value && secretPattern.test(value)) throw new Error(`${label} appears to contain secret material; credentials and private data are never stored in the ledger.`);
  };
  checkText("operatorId", input.operatorId);
  checkText("organizationId", input.organizationId);
  checkText("targetId", input.targetId);
  checkText("summary", input.summary);
  checkText("implementation", input.implementation);
  checkText("consentReference", input.consentReference, false);
  checkText("ticketReference", input.ticketReference, false);
  if (!PRIVILEGED_ACTIONS.includes(input.action)) throw new Error(`Unsupported privileged action: ${input.action}.`);
  if (!PRIVILEGED_RESULTS.includes(input.result)) throw new Error(`Unsupported privileged action result: ${input.result}.`);
  if (!input.modifications.length) throw new Error("At least one modification or explicit no-change statement is required.");
  input.modifications.forEach((modification) => checkText("modification", modification));
}
