import { generateKeyPairSync, createSign } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { canonicalClaims, type LocalBreakGlassCredential } from "../lib/local-break-glass-credential";

const tsx = resolve("node_modules/tsx/dist/cli.mjs");
const cli = resolve("scripts/break-glass-ledger-cli.ts");

function run(args: string[]) {
  try {
    return { status: 0, stdout: execFileSync(process.execPath, [tsx, cli, "--", ...args], { encoding: "utf8" }) };
  } catch (error) {
    const result = error as { status?: number; stdout?: string; stderr?: string };
    return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  }
}

describe("break-glass ledger CLI", () => {
  it("lists and irreversibly revokes credential IDs offline", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-ledger-"));
    const ledger = join(dir, "ledger.json");
    expect(run(["list", "--ledger", ledger, "--json"]).status).toBe(0);
    expect(run(["revoke", "credential-001", "--ledger", ledger, "--json"]).status).toBe(0);
    const listed = JSON.parse(run(["list", "--ledger", ledger, "--json"]).stdout);
    expect(listed.revokedCredentialIds).toEqual(["credential-001"]);
    expect(readFileSync(ledger, "utf8")).toContain("credential-001");
  });

  it("checks and consumes a valid public-key-signed token offline", () => {
    const dir = mkdtempSync(join(tmpdir(), "droidcmd-token-"));
    const ledger = join(dir, "ledger.json");
    const tokenPath = join(dir, "token.json");
    const trustPath = join(dir, "trust.json");
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const credentialBase = {
      credentialId: "credential-002",
      operatorId: "operator-001",
      organizationId: "org-001",
      issuerId: "issuer-001",
      credentialType: "break-glass-admin" as const,
      validFrom: "2026-10-20T20:00:00.000Z",
      validUntil: "2026-10-20T20:10:00.000Z",
      allowedCapabilities: ["inspect-auth-state"] as const,
      targetIds: ["target-001"] as const,
      trustKeyId: "key-001",
      signedPayload: "",
      signature: "",
    };
    const payload = canonicalClaims(credentialBase);
    const signer = createSign("RSA-SHA256");
    signer.update(payload, "utf8");
    signer.end();
    const credential: LocalBreakGlassCredential = { ...credentialBase, signedPayload: payload, signature: signer.sign(privateKey).toString("base64") };
    writeFileSync(tokenPath, JSON.stringify(credential));
    writeFileSync(trustPath, JSON.stringify([{ issuerId: "issuer-001", keyId: "key-001", validUntil: "2027-01-01T00:00:00.000Z", publicKeyPem: publicKey.export({ type: "spki", format: "pem" }) }]));

    const consumed = run(["check", "--credential", tokenPath, "--trust", trustPath, "--organization", "org-001", "--capability", "inspect-auth-state", "--target", "target-001", "--now", "2026-10-20T20:05:00.000Z", "--ledger", ledger, "--consume", "true", "--json"]);
    expect(consumed.status).toBe(0);
    expect(JSON.parse(consumed.stdout)).toMatchObject({ decision: "allow", consumed: true });

    const replay = run(["check", "--credential", tokenPath, "--trust", trustPath, "--organization", "org-001", "--capability", "inspect-auth-state", "--target", "target-001", "--now", "2026-10-20T20:05:00.000Z", "--ledger", ledger, "--json"]);
    expect(replay.status).toBe(2);
    expect(replay.stdout).toContain("ALREADY_CONSUMED");
  });
});
