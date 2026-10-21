#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { activateOperatorDeveloperMode, type OperatorDeveloperCapability, type OperatorDeveloperSession } from "../lib/operator-developer-mode";

type DeveloperState = { session?: OperatorDeveloperSession; events: Array<Record<string, unknown>> };
type DebugState = { developerOptionsEnabled?: boolean; adbEnabled?: boolean; oemUnlockAllowed?: string; debuggableBuild?: boolean; readOnly?: boolean };

const args = process.argv.slice(2).filter((value) => value !== "--");
if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`Usage:
  pnpm developer:cli -- inspect --debug-state DEBUG.json [--json]
  pnpm developer:cli -- activate --operator ID --organization ORG --session SESSION --reason TEXT --minutes N --capability collect-diagnostics [--state PATH] [--json]
  pnpm developer:cli -- deactivate --state PATH [--reason TEXT] [--json]
  pnpm developer:cli -- request-system-toggle --target enabled|disabled --device DEVICE_ID --operator ID --reason TEXT --confirm "I UNDERSTAND" --output REQUEST.json [--json]

The activate/deactivate commands toggle Droid Commander's own operator diagnostic session. request-system-toggle creates a visible, auditable request for the device owner/operator to change Android Developer Options in the system UI; it never mutates Android settings, runs adb, or invokes hidden privilege.`);
  process.exit(0);
}

function parse(values: string[]) {
  const command = values.shift() ?? "";
  const options: Record<string, string | boolean> = { state: ".droidcmd-developer/state.json", json: false };
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

function readJson<T>(path: string): T { return JSON.parse(readFileSync(resolve(path), "utf8")) as T; }
function saveJson(path: string, value: unknown) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 }); }
function emit(value: unknown, json: boolean) { console.log(json ? JSON.stringify(value, null, 2) : JSON.stringify(value, null, 2)); }
function required(options: Record<string, string | boolean>, key: string) { const value = options[key]; if (!value || typeof value !== "string") throw new Error(`Missing --${key}.`); return value; }
function loadState(path: string): DeveloperState { return existsSync(path) ? readJson<DeveloperState>(path) : { events: [] }; }

function main() {
  const { command, options } = parse(args);
  const json = options.json === true;
  if (command === "inspect") {
    const debug = readJson<DebugState>(required(options, "debug-state"));
    emit({ ...debug, inspectionOnly: true, settingsMutationPerformed: false }, json);
    return;
  }
  if (command === "request-system-toggle") {
    const target = required(options, "target");
    if (target !== "enabled" && target !== "disabled") throw new Error("--target must be enabled or disabled.");
    if (required(options, "confirm") !== "I UNDERSTAND") throw new Error('Explicit confirmation must equal "I UNDERSTAND".');
    const request = { requestId: `devopt-${Date.now()}`, deviceId: required(options, "device"), operatorId: required(options, "operator"), reason: required(options, "reason"), requestedState: target, createdAt: new Date().toISOString(), action: "visible-device-settings-handoff", settingsMutationPerformed: false, adbInvoked: false, ownerMustActOnDevice: true };
    const output = required(options, "output");
    saveJson(output, request);
    emit(request, json);
    return;
  }

  const statePath = resolve(String(options.state));
  const state = loadState(statePath);
  if (command === "activate") {
    const capabilities = String(options.capability ?? "collect-diagnostics").split(",") as OperatorDeveloperCapability[];
    const session = activateOperatorDeveloperMode({ operatorId: required(options, "operator"), organizationId: required(options, "organization"), sessionId: required(options, "session"), reason: required(options, "reason"), now: new Date().toISOString(), requestedMinutes: Number(required(options, "minutes")), operatorAuthorized: true, capabilities });
    state.session = session;
    state.events.push({ event: "operator-developer-activate", at: new Date().toISOString(), decision: session.decision, operatorId: session.operatorId, capabilities: session.capabilities });
    saveJson(statePath, state);
    emit({ ...session, statePath }, json);
    if (session.decision === "deny") process.exitCode = 2;
    return;
  }
  if (command === "deactivate") {
    const reason = String(options.reason ?? "Operator ended diagnostic session");
    state.events.push({ event: "operator-developer-deactivate", at: new Date().toISOString(), reason });
    delete state.session;
    saveJson(statePath, state);
    emit({ deactivated: true, statePath }, json);
    return;
  }
  throw new Error(`Unknown command: ${command}. Use --help.`);
}

try { main(); } catch (error) { console.error(`ERROR: ${error instanceof Error ? error.message : "command failed"}`); process.exitCode = 1; }
