#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { createCliState, confirmSourceRelease, parseCliState, recordTransferEntry, renderCliStatus, serializeCliState, setTransferCondition, verifyCliState, type TransferCliState } from "../lib/transfer-cli";
import type { TransferCategory, TransferSession } from "../lib/transfer-verification";

const rawArgs = process.argv.slice(2).filter((value) => value !== "--");
if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  console.log("Usage: pnpm transfer:cli -- --session ID --source SOURCE --destination DESTINATION --owner OWNER --authorization AUTH --categories contacts,photos --owner-confirmed true --source-unlocked true [--state PATH]");
  process.exit(0);
}

const args = new Map<string, string>();
for (let index = 0; index < rawArgs.length; index += 1) {
  const value = rawArgs[index];
  if (value.startsWith("--")) args.set(value.slice(2), rawArgs[index + 1]?.startsWith("--") ? "true" : rawArgs[++index] ?? "true");
}

const statePath = resolve(args.get("state") ?? `.droidcmd-transfer/${args.get("session") ?? "transfer-session"}.json`);
let state: TransferCliState = loadOrCreate();

function loadOrCreate(): TransferCliState {
  if (existsSync(statePath)) return parseCliState(readFileSync(statePath, "utf8"));
  const required = ["session", "source", "destination", "owner", "authorization", "categories"];
  const missing = required.filter((key) => !args.get(key));
  if (missing.length > 0 || args.get("owner-confirmed") !== "true" || args.get("source-unlocked") !== "true") {
    throw new Error(`New sessions require --${missing[0] ?? "owner-confirmed true and source-unlocked true"}. No credentials are accepted by this CLI.`);
  }
  const session: TransferSession = {
    sessionId: args.get("session")!,
    sourceDeviceId: args.get("source")!,
    destinationDeviceId: args.get("destination")!,
    ownerId: args.get("owner")!,
    authorizationId: args.get("authorization")!,
    method: (args.get("method") ?? "owner-approved-file-transfer") as TransferSession["method"],
    selectedCategories: args.get("categories")!.split(",").map((value) => value.trim()).filter(Boolean) as TransferCategory[],
    ownerConfirmed: true,
    sourceUnlocked: true,
    credentialHandledByApp: false,
  };
  const created = createCliState(session, { destinationReachable: args.get("destination-reachable") === "true" });
  persist(created);
  return created;
}

function persist(next: TransferCliState) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, serializeCliState(next), { mode: 0o600 });
}

function print(message: string) { output.write(`${message}\n`); }
function help() {
  print(["Commands:",
    "  status                                      Show live checklist state",
    "  record <category> <itemId> <srcHash> <dstHash> <srcSize> <dstSize> <readable|unreadable>",
    "  destination <reachable|unreachable>         Set destination verification state",
    "  source <preserved|not-preserved>             Set source-retention state",
    "  interrupt <yes|no>                           Record transfer interruption state",
    "  verify                                      Run the existing transfer verification engine",
    "  release-source <owner-confirmed>             Release only after verified outcome",
    "  help                                        Show this help",
    "  quit                                        Save and exit",
    "No PIN, pattern, biometric, recovery code, private key, or credential input is accepted.",
  ].join("\n"));
}

function command(line: string) {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  const name = parts.shift()?.toLowerCase();
  if (!name) return;
  if (name === "status") return print(renderCliStatus(state));
  if (name === "help") return help();
  if (name === "record") {
    if (parts.length !== 7) throw new Error("record requires category, item ID, source hash, destination hash, source size, destination size, and readable|unreadable.");
    state = recordTransferEntry(state, { category: parts[0] as TransferCategory, itemId: parts[1], sourceHash: parts[2], destinationHash: parts[3], sourceSize: Number(parts[4]), destinationSize: Number(parts[5]), destinationReadable: parts[6] === "readable" });
    persist(state); return print(`Recorded ${parts[0]}:${parts[1]}`);
  }
  if (name === "destination") {
    if (!["reachable", "unreachable"].includes(parts[0])) throw new Error("Use destination reachable|unreachable.");
    state = setTransferCondition(state, "destination-reachable", parts[0] === "reachable"); persist(state); return print(`Destination ${parts[0]}.`);
  }
  if (name === "source") {
    if (!["preserved", "not-preserved"].includes(parts[0])) throw new Error("Use source preserved|not-preserved.");
    state = setTransferCondition(state, "source-preserved", parts[0] === "preserved"); persist(state); return print(`Source ${parts[0]}.`);
  }
  if (name === "interrupt") {
    if (!["yes", "no"].includes(parts[0])) throw new Error("Use interrupt yes|no.");
    state = setTransferCondition(state, "interrupted", parts[0] === "yes"); persist(state); return print(`Interruption ${parts[0]}.`);
  }
  if (name === "verify") {
    state = verifyCliState(state); persist(state); return print(renderCliStatus(state));
  }
  if (name === "release-source") {
    if (parts[0] !== "owner-confirmed") throw new Error("Source release requires the literal owner-confirmed acknowledgement.");
    state = confirmSourceRelease(state); persist(state); return print("Source release recorded after verified transfer and owner confirmation.");
  }
  if (name === "quit" || name === "exit") return "quit";
  throw new Error(`Unknown command: ${name}. Type help.`);
}

async function main() {
  print(`Droid Commander transfer monitor · state ${statePath}`);
  print("Owner-witnessed mode: the CLI never accepts or stores authentication credentials.");
  print(renderCliStatus(state));
  help();
  const rl = createInterface({ input, output, prompt: "transfer> " });
  rl.prompt();
  for await (const line of rl) {
    try {
      if (command(line) === "quit") { rl.close(); break; }
    } catch (error) {
      print(`ERROR: ${error instanceof Error ? error.message : "command rejected"}`);
    }
    rl.prompt();
  }
}

main().catch((error) => { output.write(`ERROR: ${error instanceof Error ? error.message : "unable to start transfer CLI"}\n`); process.exitCode = 1; });
