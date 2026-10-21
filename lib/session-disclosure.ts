import type { Session } from "@/constants/commander";
import type { PrivilegedActionEvent } from "./privileged-action-core";

function cell(value: string) { return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " "); }

export function renderSessionDisclosureMarkdown(entries: readonly Session[], generatedAt = new Date().toISOString()) {
  const rows = entries.map((session) => `| ${cell(session.id)} | ${cell(session.title)} | ${cell(session.status)} | ${cell(session.scope)} | ${cell(session.timestamp)} | ${cell(session.result)} |`).join("\n");
  return `# Droid Commander Session Disclosure\n\n**Generated:** ${generatedAt}\n\nThis user-facing disclosure contains the locally stored session context, authorization scope, assessment result, and stated limitations. It does not include credentials, private keys, PINs, biometric data, arbitrary commands, or hidden device changes.\n\n## Sessions\n\n| ID | Session | Status | Scope | Timestamp | Result |\n|---|---|---|---|---|---|\n${rows || "| — | No sessions recorded | — | — | — | — |"}\n\n## Audit controls\n\n- Authorization scope is retained with each session.\n- Owner-consent context is disclosed when recorded.\n- Observable-only limitations are retained rather than inferred away.\n- Remediation is reported as guided/no-payload where applicable.\n`;
}

export function renderPrivilegedLedgerDisclosureMarkdown(
  events: readonly PrivilegedActionEvent[],
  integrity: { valid: boolean; entries: number; lastHash: string | null; error?: string },
  generatedAt = new Date().toISOString(),
) {
  const status = integrity.valid ? "VERIFIED" : "INVALID";
  const rows = events.map((event) => `| ${event.sequence} | ${cell(event.eventId)} | ${cell(event.action)} | ${cell(event.result)} | ${cell(event.targetId)} | ${cell(event.summary)} | ${cell(event.implementation)} | ${cell(event.modifications.join("; "))} | ${cell(event.recordedAt)} |`).join("\n");
  const warning = integrity.error ? `**Integrity warning:** ${cell(integrity.error)}\n` : "";
  return `# Droid Commander Privileged-Action Ledger Disclosure\n\n**Generated:** ${generatedAt}\n**Integrity:** ${status}\n**Entries:** ${integrity.entries}\n**Last hash:** ${integrity.lastHash ?? "—"}\n${warning}\nThis disclosure is generated from the app’s local hash-chained privileged-action ledger. It records transparent action metadata, not credentials or private payloads.\n\n## Events\n\n| Sequence | Event ID | Action | Result | Target | Summary | Implementation | Modifications | Recorded |\n|---:|---|---|---|---|---|---|---|---|\n${rows || "| — | — | No privileged actions recorded | — | — | — | — | — | — |"}\n\n## Redaction boundary\n\n- Passwords, PINs, private keys, recovery codes, tokens, arbitrary shell commands, and private payloads are excluded.\n- An INVALID integrity status must be treated as an audit failure, not as a complete disclosure.\n- This report does not imply that a requested action changed the device; result and implementation metadata are recorded separately.\n`;
}
