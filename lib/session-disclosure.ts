import type { Session } from "@/constants/commander";

function cell(value: string) { return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " "); }

export function renderSessionDisclosureMarkdown(entries: readonly Session[], generatedAt = new Date().toISOString()) {
  const rows = entries.map((session) => `| ${cell(session.id)} | ${cell(session.title)} | ${cell(session.status)} | ${cell(session.scope)} | ${cell(session.timestamp)} | ${cell(session.result)} |`).join("\n");
  return `# Droid Commander Session Disclosure\n\n**Generated:** ${generatedAt}\n\nThis user-facing disclosure contains the locally stored session context, authorization scope, assessment result, and stated limitations. It does not include credentials, private keys, PINs, biometric data, arbitrary commands, or hidden device changes.\n\n> Prototype boundary: this export reflects the current local session report store. The hash-chained privileged-action ledger export remains available through the operator CLI until native ledger persistence is connected to the dashboard.\n\n## Sessions\n\n| ID | Session | Status | Scope | Timestamp | Result |\n|---|---|---|---|---|---|\n${rows || "| — | No sessions recorded | — | — | — | — |"}\n\n## Audit controls\n\n- Authorization scope is retained with each session.\n- Owner-consent context is disclosed when recorded.\n- Observable-only limitations are retained rather than inferred away.\n- Remediation is reported as guided/no-payload where applicable.\n`;
}
