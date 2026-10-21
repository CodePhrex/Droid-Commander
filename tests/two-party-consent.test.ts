import { describe, expect, it } from "vitest";

import { ConsentGateError, TwoPartyConsentGate } from "../lib/two-party-consent";

type RequestInput = {
  requestId: string;
  operation: string;
  targetId: string;
  targetLabel: string;
  purpose: string;
  riskSummary: string;
  operatorId: string;
  clientId: string;
  challenge: string;
  expiresAt: string;
  createdAt?: string;
};

const input: RequestInput = {
  requestId: "hs-001",
  operation: "apply-training-remediation",
  targetId: "lab-handset-a",
  targetLabel: "Lab handset A",
  purpose: "Verify the approved training remediation on the named lab handset.",
  riskSummary: "Changes one approved training setting and records before-and-after evidence.",
  operatorId: "operator-7",
  clientId: "client-3",
  challenge: "NORTH-42",
  createdAt: "2026-10-20T20:00:00.000Z",
  expiresAt: "2026-10-20T20:05:00.000Z",
};

function setup(overrides: Partial<{ verifyOperator: boolean; verifyClient: boolean }> = {}) {
  const audit: Array<{ event: string; state: string }> = [];
  const gate = new TwoPartyConsentGate({
    now: () => "2026-10-20T20:01:00.000Z",
    digest: (value) => `digest:${value}`,
    verifyOperator: async () => overrides.verifyOperator ?? true,
    verifyClient: async () => overrides.verifyClient ?? true,
    auditSink: { record: (event) => audit.push({ event: event.event, state: event.state }) },
  });
  const request = gate.createRequest(input);
  return { gate, request, audit };
}

async function approve() {
  const { gate, request, audit } = setup();
  await gate.verifyOperator(request.requestId, {
    operatorId: request.operatorId,
    credentialReference: "credential-7",
    requestDigest: request.promptDigest,
    verifiedAt: "2026-10-20T20:01:10.000Z",
    method: "manual-operator-verification",
  });
  await gate.confirmClient(request.requestId, {
    clientId: request.clientId,
    requestDigest: request.promptDigest,
    promptDigest: request.promptDigest,
    challengeResponse: request.challenge,
    consent: "approved",
    confirmedAt: "2026-10-20T20:01:20.000Z",
    method: "manual-client-confirmation",
  });
  return { gate, request, audit };
}

describe("two-party high-security consent", () => {
  it("requires operator verification before prompting the client", async () => {
    const { gate, request } = setup();
    await expect(gate.confirmClient(request.requestId, { clientId: request.clientId, requestDigest: request.promptDigest, promptDigest: request.promptDigest, challengeResponse: request.challenge, consent: "approved", confirmedAt: "2026-10-20T20:01:20.000Z", method: "manual-client-confirmation" })).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(gate.getState(request.requestId)).toBe("awaiting-operator");
  });

  it("requires an exact operator identity and request digest", async () => {
    const { gate, request } = setup();
    await expect(gate.verifyOperator(request.requestId, { operatorId: "other", credentialReference: "credential-7", requestDigest: request.promptDigest, verifiedAt: "2026-10-20T20:01:10.000Z", method: "manual-operator-verification" })).rejects.toMatchObject({ code: "MISMATCH" });
    expect(gate.getState(request.requestId)).toBe("denied");
  });

  it("requires the client to confirm the exact displayed challenge", async () => {
    const { gate, request } = setup();
    await gate.verifyOperator(request.requestId, { operatorId: request.operatorId, credentialReference: "credential-7", requestDigest: request.promptDigest, verifiedAt: "2026-10-20T20:01:10.000Z", method: "manual-operator-verification" });
    await expect(gate.confirmClient(request.requestId, { clientId: request.clientId, requestDigest: request.promptDigest, promptDigest: request.promptDigest, challengeResponse: "WRONG", consent: "approved", confirmedAt: "2026-10-20T20:01:20.000Z", method: "manual-client-confirmation" })).rejects.toMatchObject({ code: "MISMATCH" });
    expect(gate.getState(request.requestId)).toBe("denied");
  });

  it("allows one execution only after both parties approve", async () => {
    const { gate, request, audit } = await approve();
    await expect(gate.execute(request.requestId, async () => "executed")).resolves.toBe("executed");
    await expect(gate.execute(request.requestId, async () => "should not run")).rejects.toMatchObject({ code: "CONSUMED" });
    expect(audit.map((event) => event.event)).toEqual(["request-created", "operator-verified", "client-prompted", "client-approved", "execution-started", "execution-completed"]);
  });

  it("fails closed when operator or client verification fails", async () => {
    const operatorFailure = setup({ verifyOperator: false });
    await expect(operatorFailure.gate.verifyOperator(operatorFailure.request.requestId, { operatorId: operatorFailure.request.operatorId, credentialReference: "credential-7", requestDigest: operatorFailure.request.promptDigest, verifiedAt: "2026-10-20T20:01:10.000Z", method: "manual-operator-verification" })).rejects.toMatchObject({ code: "VERIFICATION_FAILED" });
    const clientFailure = setup({ verifyClient: false });
    await clientFailure.gate.verifyOperator(clientFailure.request.requestId, { operatorId: clientFailure.request.operatorId, credentialReference: "credential-7", requestDigest: clientFailure.request.promptDigest, verifiedAt: "2026-10-20T20:01:10.000Z", method: "manual-operator-verification" });
    await expect(clientFailure.gate.confirmClient(clientFailure.request.requestId, { clientId: clientFailure.request.clientId, requestDigest: clientFailure.request.promptDigest, promptDigest: clientFailure.request.promptDigest, challengeResponse: clientFailure.request.challenge, consent: "approved", confirmedAt: "2026-10-20T20:01:20.000Z", method: "manual-client-confirmation" })).rejects.toMatchObject({ code: "VERIFICATION_FAILED" });
  });

  it("records explicit client denial and does not execute", async () => {
    const { gate, request } = setup();
    await gate.verifyOperator(request.requestId, { operatorId: request.operatorId, credentialReference: "credential-7", requestDigest: request.promptDigest, verifiedAt: "2026-10-20T20:01:10.000Z", method: "manual-operator-verification" });
    await expect(gate.confirmClient(request.requestId, { clientId: request.clientId, requestDigest: request.promptDigest, promptDigest: request.promptDigest, challengeResponse: "", consent: "denied", confirmedAt: "2026-10-20T20:01:20.000Z", method: "manual-client-confirmation" })).rejects.toMatchObject({ code: "CLIENT_DENIED" });
    await expect(gate.execute(request.requestId, async () => "blocked")).rejects.toBeInstanceOf(ConsentGateError);
  });

  it("expires an unconfirmed request before either party can approve it", async () => {
    const audit: Array<{ event: string; state: string }> = [];
    const gate = new TwoPartyConsentGate({ now: () => "2026-10-20T20:06:00.000Z", digest: (value) => value, verifyOperator: async () => true, verifyClient: async () => true, auditSink: { record: (event) => audit.push({ event: event.event, state: event.state }) } });
    const request = gate.createRequest(input);
    await expect(gate.verifyOperator(request.requestId, { operatorId: request.operatorId, credentialReference: "credential-7", requestDigest: request.promptDigest, verifiedAt: "2026-10-20T20:01:10.000Z", method: "manual-operator-verification" })).rejects.toMatchObject({ code: "EXPIRED" });
    expect(gate.getState(request.requestId)).toBe("expired");
  });

  it("fails execution and records the failure without reopening consent", async () => {
    const { gate, request, audit } = await approve();
    await expect(gate.execute(request.requestId, async () => { throw new Error("native action rejected"); })).rejects.toThrow("native action rejected");
    expect(audit.map((event) => event.event)).toContain("execution-failed");
    expect(gate.getState(request.requestId)).toBe("consumed");
  });
});
