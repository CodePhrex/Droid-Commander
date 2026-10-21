#!/usr/bin/env node
import { createVerify } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { LocalBreakGlassLedger, LocalBreakGlassCredentialValidator, type LocalBreakGlassCredential } from "../lib/local-break-glass-credential";
import type { BreakGlassCapability } from "../lib/break-glass-admin";

type TrustAnchor = { issuerId: string; keyId: string; validUntil: string; publicKeyPem: string; algorithm?: "RSA-SHA256" | "SHA256" };

type CliOptions = { ledger: string; json: boolean; [key: string]: string | boolean };

const rawArgs = process.argv.slice(2).filter((value) => value !== "--");
if (rawArgs.includes("--help") || rawArgs.includes("-h") || rawArgs.length === 0) {
  console.log(`Usage:
  pnpm breakglass:cli -- list [--ledger PATH] [--json]
  pnpm breakglass:cli -- revoke CREDENTIAL_ID [--ledger PATH] [--json]
  pnpm breakglass:cli -- snapshot [--ledger PATH] [--json]
  pnpm breakglass:cli -- check --credential TOKEN.json --trust TRUST.json --organization ORG --capability CAPABILITY [--target TARGET] [--now ISO] [--account-enabled true|false] [--consume true] [--ledger PATH] [--json]

TRUST.json contains an array or {"trustedIssuers": [...]} of entries with issuerId, keyId, validUntil, and publicKeyPem. Signatures are base64-encoded RSA-SHA256 or ECDSA-SHA256 signatures over signedPayload. Private keys are never accepted.`);
  process.exit(0);
}

function parseOptions(values: string[]): { command: string; positional: string[]; options: CliOptions } {
  const command = values.shift() ?? "";
  const positional: string[] = [];
  const options: CliOptions = { ledger: ".droidcmd-break-glass/ledger.json", json: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) { positional.push(value); continue; }
    const key = value.slice(2);
    const next = values[index + 1];
    if (next && !next.startsWith("--")) options[key] = next, index += 1;
    else options[key] = true;
  }
  return { command, positional, options };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as T;
}

function loadLedger(path: string) {
  if (!existsSync(path)) return new LocalBreakGlassLedger();
  const snapshot = readJson<{ revokedCredentialIds?: string[]; consumedCredentialIds?: string[] }>(path);
  return new LocalBreakGlassLedger({ revokedCredentialIds: snapshot.revokedCredentialIds ?? [], consumedCredentialIds: snapshot.consumedCredentialIds ?? [] });
}

function saveLedger(path: string, ledger: LocalBreakGlassLedger) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(ledger.snapshot(), null, 2), { mode: 0o600 });
}

function emit(value: unknown, json: boolean) {
  console.log(json ? JSON.stringify(value, null, 2) : typeof value === "string" ? value : JSON.stringify(value, null, 2));
}

function buildVerifier(anchors: TrustAnchor[]) {
  return {
    verify: async ({ payload, signature, issuerId, keyId }: { payload: string; signature: string; issuerId: string; keyId: string }) => {
      const anchor = anchors.find((candidate) => candidate.issuerId === issuerId && candidate.keyId === keyId);
      if (!anchor) return false;
      const verifier = createVerify(anchor.algorithm ?? "RSA-SHA256");
      verifier.update(payload, "utf8");
      verifier.end();
      try {
        return verifier.verify(anchor.publicKeyPem, Buffer.from(signature, "base64"));
      } catch {
        return false;
      }
    },
  };
}

async function main() {
  const { command, positional, options } = parseOptions(rawArgs);
  const ledgerPath = resolve(String(options.ledger));
  const ledger = loadLedger(ledgerPath);
  const json = options.json === true;

  if (command === "list") {
    const snapshot = ledger.snapshot();
    emit({ ledgerPath, revokedCount: snapshot.revokedCredentialIds.length, consumedCount: snapshot.consumedCredentialIds.length, ...snapshot }, json);
    return;
  }
  if (command === "snapshot") {
    emit(ledger.snapshot(), true);
    return;
  }
  if (command === "revoke") {
    const credentialId = positional[0];
    if (!credentialId) throw new Error("revoke requires a credential ID.");
    ledger.revoke(credentialId);
    saveLedger(ledgerPath, ledger);
    emit({ revoked: credentialId, ledgerPath }, json);
    return;
  }
  if (command !== "check") throw new Error(`Unknown command: ${command}. Use --help.`);

  const credentialPath = String(options.credential ?? "");
  const trustPath = String(options.trust ?? "");
  if (!credentialPath || !trustPath || !options.organization || !options.capability) throw new Error("check requires --credential, --trust, --organization, and --capability.");
  const credential = readJson<LocalBreakGlassCredential>(credentialPath);
  const trustDocument = readJson<TrustAnchor[] | { trustedIssuers: TrustAnchor[] }>(trustPath);
  const anchors = Array.isArray(trustDocument) ? trustDocument : trustDocument.trustedIssuers;
  const validator = new LocalBreakGlassCredentialValidator({ trustedIssuers: anchors.map(({ issuerId, keyId, validUntil }) => ({ issuerId, keyId, validUntil })), signatureVerifier: buildVerifier(anchors), ledger });
  const result = options.consume === true || options.consume === "true"
    ? await validator.validateAndConsume({ credential, organizationId: String(options.organization), capability: String(options.capability) as BreakGlassCapability, targetId: options.target ? String(options.target) : undefined, now: String(options.now ?? new Date().toISOString()), accountEnabled: options["account-enabled"] !== "false" })
    : await validator.validate({ credential, organizationId: String(options.organization), capability: String(options.capability) as BreakGlassCapability, targetId: options.target ? String(options.target) : undefined, now: String(options.now ?? new Date().toISOString()), accountEnabled: options["account-enabled"] !== "false" });
  if (options.consume === true || options.consume === "true") saveLedger(ledgerPath, ledger);
  emit({ ...result, ledgerPath, consumed: Boolean(options.consume === true || options.consume === "true") && result.decision === "allow" }, json);
  if (result.decision === "deny") process.exitCode = 2;
}

main().catch((error) => { console.error(`ERROR: ${error instanceof Error ? error.message : "command failed"}`); process.exitCode = 1; });
