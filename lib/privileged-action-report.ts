import type { PrivilegedActionEvent, LedgerVerification } from "./privileged-action-ledger";

function cell(value: string | undefined | null) { return String(value ?? "—").replace(/\|/g, "\\|").replace(/\r?\n/g, " "); }
function bullet(values: readonly string[]) { return values.length ? values.map((value) => `- ${cell(value)}`).join("\n") : "- No system modification recorded"; }

export function renderPrivilegedDisclosureMarkdown(events: readonly PrivilegedActionEvent[], integrity: LedgerVerification, generatedAt = new Date().toISOString()) {
  const latest = events.at(-1);
  const resultCounts = events.reduce<Record<string, number>>((counts, event) => { counts[event.result] = (counts[event.result] ?? 0) + 1; return counts; }, {});
  const counts = Object.entries(resultCounts).map(([result, count]) => `| ${cell(result)} | ${count} |`).join("\n") || "| none | 0 |";
  const entries = events.length ? events.map((event) => `## Event ${event.sequence}: ${cell(event.action)}

| Field | Value |
|---|---|
| Event ID | ${cell(event.eventId)} |
| Recorded at | ${cell(event.recordedAt)} |
| Operator | ${cell(event.operatorId)} |
| Organization | ${cell(event.organizationId)} |
| Target | ${cell(event.targetId)} |
| Action | ${cell(event.action)} |
| Result | ${cell(event.result)} |
| Consent reference | ${cell(event.consentReference)} |
| Ticket reference | ${cell(event.ticketReference)} |
| Previous hash | ${cell(event.previousHash)} |
| Event hash | ${cell(event.hash)} |

**What was requested or observed**

${cell(event.summary)}

**Implementation or handoff**

${cell(event.implementation)}

**System modifications**

${bullet(event.modifications)}
`).join("\n") : "_No privileged actions are recorded in this ledger._\n";
  const integrityText = integrity.valid ? `VALID — ${integrity.entries} event(s), latest hash \`${cell(integrity.lastHash)}\`` : `INVALID — ${cell(integrity.error)}. Do not rely on this report as a complete disclosure until the original ledger is preserved and investigated.`;
  return `# Privileged-Action Disclosure Report

**Generated:** ${cell(generatedAt)}  
**Ledger integrity:** ${integrityText}

This report is a user-facing disclosure of actions recorded by Droid Commander. It includes requests, approvals, denials, handoffs, completions, failures, cancellations, and explicit no-change outcomes. A recorded handoff does not by itself prove that an external OEM or laboratory tool completed the action.

No passwords, PINs, private keys, recovery codes, tokens, secrets, or arbitrary command payloads are included by design.

## Summary

| Result | Count |
|---|---:|
${counts}

**Total events:** ${events.length}  
**Last recorded event:** ${cell(latest?.recordedAt)}

${entries}`;
}
