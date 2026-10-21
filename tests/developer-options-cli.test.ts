import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tsx = resolve("node_modules/tsx/dist/cli.mjs");
const cli = resolve("scripts/developer-options-cli.ts");

function run(args: string[]) {
  return execFileSync(process.execPath, [tsx, cli, "--", ...args], { encoding: "utf8" });
}

describe("developer-options CLI", () => {
  it("inspects imported debug state without mutating settings", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-devopt-"));
    const debugPath = join(dir, "debug.json");
    writeFileSync(debugPath, JSON.stringify({ developerOptionsEnabled: false, adbEnabled: false, oemUnlockAllowed: "0", debuggableBuild: false, readOnly: true }));
    const result = JSON.parse(run(["inspect", "--debug-state", debugPath, "--json"]));
    expect(result).toMatchObject({ inspectionOnly: true, settingsMutationPerformed: false, adbEnabled: false });
  });

  it("activates and deactivates the local operator diagnostic session", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-devopt-"));
    const state = join(dir, "state.json");
    const activated = JSON.parse(run(["activate", "--operator", "operator-001", "--organization", "org-001", "--session", "session-001", "--reason", "Approved diagnostics for device analysis", "--minutes", "15", "--capability", "collect-diagnostics", "--state", state, "--json"]));
    expect(activated.decision).toBe("allow");
    const deactivated = JSON.parse(run(["deactivate", "--state", state, "--reason", "Diagnostics complete", "--json"]));
    expect(deactivated.deactivated).toBe(true);
    expect(JSON.parse(readFileSync(state, "utf8")).session).toBeUndefined();
  });

  it("creates an explicit, non-mutating system settings toggle request", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-devopt-"));
    const output = join(dir, "request.json");
    const request = JSON.parse(run(["request-system-toggle", "--target", "enabled", "--device", "device-001", "--operator", "operator-001", "--reason", "USB debugging needed for approved lab diagnostics", "--confirm", "I UNDERSTAND", "--output", output, "--json"]));
    expect(request).toMatchObject({ requestedState: "enabled", action: "visible-device-settings-handoff", settingsMutationPerformed: false, adbInvoked: false, ownerMustActOnDevice: true });
    expect(JSON.parse(readFileSync(output, "utf8")).deviceId).toBe("device-001");
  });
});
