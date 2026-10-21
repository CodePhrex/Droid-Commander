#!/usr/bin/env node
import { createHash, createVerify } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { advanceRecoveryMonitor, createRecoveryMonitor, evaluateRecoveryReadiness, type RecoveryArtifactManifest, type RecoveryMonitorState } from "../lib/recovery-readiness";
import type { BootStateReport } from "../lib/boot-state";

type TrustAnchor = { issuerId: string; keyId: string; validUntil: string; publicKeyPem: string; algorithm?: "RSA-SHA256" | "SHA256" };

const rawArgs = process.argv.slice(2).filter((value) => value !== "--");
if (rawArgs.includes("--help") || rawArgs.includes("-h") || rawArgs.length === 0) {
  console.log(`Usage:
  pnpm recovery:cli -- validate --device DEVICE.json --manifest RECOVERY.json --trust TRUST.json --artifact FILE --owner-confirmed true --backup-confirmed true [--state PATH] [--json]
  pnpm recovery:cli -- status --state PATH [--json]
  pnpm recovery:cli -- advance --state PATH --to bootloader|recovery|verification|complete|failed --note "operator observation" [--at ISO] [--json]

This CLI validates and monitors an authorized handoff. It never unlocks, flashes, installs recovery images, or runs fastboot/adb commands.`);
  process.exit(0);
}

function parse(values: string[]) {
  const command = values.shift() ?? "";
  const options: Record<string, string | boolean> = { state: ".droidcmd-recovery/monitor.json", json: false };
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

function json<T>(path: string): T { return JSON.parse(readFileSync(resolve(path), "utf8")) as T; }
function output(value: unknown, asJson: boolean) { console.log(asJson ? JSON.stringify(value, null, 2) : JSON.stringify(value, null, 2)); }
function hashFile(path: string) { return createHash("sha256").update(readFileSync(resolve(path))).digest("hex"); }
function saveState(path: string, state: RecoveryMonitorState) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(state, null, 2), { mode: 0o600 }); }
function verifyManifest(manifest: RecoveryArtifactManifest, anchors: TrustAnchor[]) {
  const anchor = anchors.find((candidate) => candidate.issuerId === manifest.issuerId && candidate.keyId === manifest.keyId);
  if (!anchor) return false;
  const verifier = createVerify(anchor.algorithm ?? "RSA-SHA256");
  verifier.update(manifest.signedPayload, "utf8");
  verifier.end();
  try { return verifier.verify(anchor.publicKeyPem, Buffer.from(manifest.signature, "base64")); } catch { return false; }
}

function requireOption(options: Record<string, string | boolean>, key: string) {
  const value = options[key];
  if (!value || typeof value !== "string") throw new Error(`Missing --${key}.`);
  return value;
}

function main() {
  const { command, options } = parse(rawArgs);
  const asJson = options.json === true;
  const statePath = resolve(String(options.state));
  if (command === "status") {
    if (!existsSync(statePath)) throw new Error(`Monitor state does not exist: ${statePath}`);
    output(json<RecoveryMonitorState>(statePath), asJson);
    return;
  }
  if (command === "advance") {
    if (!existsSync(statePath)) throw new Error(`Monitor state does not exist: ${statePath}`);
    const state = json<RecoveryMonitorState>(statePath);
    const next = requireOption(options, "to") as RecoveryMonitorState["stage"];
    const note = requireOption(options, "note");
    const updated = advanceRecoveryMonitor(state, next, typeof options.at === "string" ? options.at : new Date().toISOString(), note);
    saveState(statePath, updated);
    output(updated, asJson);
    return;
  }
  if (command !== "validate") throw new Error(`Unknown command: ${command}. Use --help.`);

  const device = json<BootStateReport>(requireOption(options, "device"));
  const manifest = json<RecoveryArtifactManifest>(requireOption(options, "manifest"));
  const trustDocument = json<TrustAnchor[] | { trustedIssuers: TrustAnchor[] }>(requireOption(options, "trust"));
  const anchors = Array.isArray(trustDocument) ? trustDocument : trustDocument.trustedIssuers;
  const artifactPath = typeof options.artifact === "string" ? options.artifact : manifest.artifactPath;
  if (!artifactPath) throw new Error("Provide --artifact or artifactPath in the manifest.");
  const readiness = evaluateRecoveryReadiness({
    device,
    artifact: manifest,
    actualSha256: hashFile(artifactPath),
    signatureValid: verifyManifest(manifest, anchors),
    ownerConfirmed: options["owner-confirmed"] === "true",
    backupConfirmed: options["backup-confirmed"] === "true",
    enterpriseManaged: options["enterprise-managed"] === "true",
  });
  const state = createRecoveryMonitor(readiness);
  saveState(statePath, state);
  output({ ...readiness, statePath }, asJson);
  if (readiness.decision === "blocked") process.exitCode = 2;
}

try { main(); } catch (error) { console.error(`ERROR: ${error instanceof Error ? error.message : "command failed"}`); process.exitCode = 1; }
