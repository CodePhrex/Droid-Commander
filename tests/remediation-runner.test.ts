import { describe, expect, it } from "vitest";

import { RemediationRunner, RemediationRunnerError } from "../lib/remediation-runner";
import { ConsentGateError } from "../lib/two-party-consent";

type ConsentStub = { approved: boolean; execute: <T>(id: string, operation: () => Promise<T>) => Promise<T> };

const plan = {
  planId: "plan-001",
  findingId: "security-patch",
  cveId: "CVE-2026-0001",
  targetId: "lab-handset-a",
  purpose: "Verify and remediate the approved training finding.",
  authorizationId: "auth-001",
  allowedKinds: ["safe-proof-check", "setting-change", "application-fix", "system-patch-handoff"] as const,
  steps: [
    { stepId: "proof", actionId: "safe-proof-security-patch", kind: "safe-proof-check" as const, description: "Run the reviewed non-invasive proof check.", reversible: false },
    { stepId: "setting", actionId: "approved-setting-change", kind: "setting-change" as const, description: "Apply the approved reversible training setting.", reversible: true },
  ],
  executionConsentId: "consent-exec-001",
};

function consent(approved = true): ConsentStub {
  return {
    approved,
    execute: async (id, operation) => {
      if (!approved || !id) throw new ConsentGateError("INVALID_STATE", "consent required");
      return operation();
    },
  };
}

function journal() {
  const events: Array<{ event: string; detail: string }> = [];
  return { sink: { record: (event: { event: string; detail: string }) => events.push({ event: event.event, detail: event.detail }) }, events };
}

function adapter(overrides: Partial<{ failSetting: boolean; failApplication: boolean; failRollback: boolean }> = {}) {
  const calls: string[] = [];
  return {
    calls,
    runSafeProofCheck: async () => { calls.push("proof"); return { ok: true, message: "proof complete" }; },
    applySettingChange: async () => { calls.push("setting"); return overrides.failSetting ? { ok: false, message: "setting rejected" } : { ok: true, message: "setting applied", beforeState: "off", afterState: "on", rollbackToken: "rollback-setting" }; },
    applyApplicationFix: async () => { calls.push("application"); return overrides.failApplication ? { ok: false, message: "application fix rejected" } : { ok: true, message: "application fix applied", rollbackToken: "rollback-app" }; },
    openSystemPatchHandoff: async () => { calls.push("patch-handoff"); return { ok: true, message: "OS update screen opened", osConfirmationRequired: true }; },
    rollback: async (_context: unknown, token: string) => { calls.push(`rollback:${token}`); return overrides.failRollback ? { ok: false, message: "rollback rejected" } : { ok: true, message: "rollback complete" }; },
  };
}

describe("remediation runner", () => {
  it("refuses all execution without manual operator and client consent", async () => {
    const fakeConsent = consent(false);
    const record = journal();
    const runner = new RemediationRunner({ consentGate: fakeConsent as never, journal: record.sink, now: () => "2026-10-20T20:00:00.000Z" });
    const fakeAdapter = adapter();
    await expect(runner.execute(plan, fakeAdapter)).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
    expect(fakeAdapter.calls).toEqual([]);
  });

  it("executes only reviewed safe proof and setting steps after consent", async () => {
    const record = journal();
    const runner = new RemediationRunner({ consentGate: consent() as never, journal: record.sink, now: () => "2026-10-20T20:00:00.000Z" });
    const fakeAdapter = adapter();
    const result = await runner.execute(plan, fakeAdapter);
    expect(result.state).toBe("completed");
    expect(fakeAdapter.calls).toEqual(["proof", "setting"]);
    expect(record.events.map((event) => event.event)).toContain("run-completed");
  });

  it("rejects arbitrary exploit playbooks before execution", async () => {
    const runner = new RemediationRunner({ consentGate: consent() as never, journal: journal().sink });
    const exploitPlan = { ...plan, allowedKinds: ["arbitrary-exploit"] as never, steps: [{ ...plan.steps[0], kind: "arbitrary-exploit" as never }] };
    await expect(runner.execute(exploitPlan, adapter())).rejects.toMatchObject({ code: "UNSUPPORTED_PLAYBOOK" });
  });

  it("automatically rolls back completed reversible steps after a later failure", async () => {
    const failurePlan = { ...plan, steps: [...plan.steps, { stepId: "fail", actionId: "failed-step", kind: "application-fix" as const, description: "A step that fails in the lab adapter.", reversible: true }] };
    const record = journal();
    const runner = new RemediationRunner({ consentGate: consent() as never, journal: record.sink });
    const fakeAdapter = adapter({ failApplication: true });
    const result = await runner.execute(failurePlan, fakeAdapter);
    expect(result.state).toBe("rollback-completed");
    expect(fakeAdapter.calls).toEqual(["proof", "setting", "application", "rollback:rollback-setting"]);
  });

  it("reports partial rollback when a rollback operation fails", async () => {
    const record = journal();
    const runner = new RemediationRunner({ consentGate: consent() as never, journal: record.sink });
    const failurePlan = { ...plan, steps: [...plan.steps, { stepId: "fail", actionId: "failed-step", kind: "application-fix" as const, description: "A step that fails in the lab adapter.", reversible: true }] };
    const fakeAdapter = adapter({ failApplication: true, failRollback: true });
    const result = await runner.execute(failurePlan, fakeAdapter);
    expect(result.state).toBe("rollback-partial");
  });

  it("requires a separate consent token for manual rollback", async () => {
    const record = journal();
    const runner = new RemediationRunner({ consentGate: consent() as never, journal: record.sink });
    await runner.execute(plan, adapter());
    const fakeAdapter = adapter();
    await expect(runner.rollback(plan.planId, "rollback-consent", fakeAdapter)).resolves.toMatchObject({ state: "rollback-completed" });
    expect(fakeAdapter.calls).toEqual(["rollback:rollback-setting"]);
  });

  it("models system patching as an OS confirmation handoff", async () => {
    const patchPlan = { ...plan, steps: [{ stepId: "patch", actionId: "os-security-update", kind: "system-patch-handoff" as const, description: "Open the Android system update flow.", reversible: false }] };
    const record = journal();
    const runner = new RemediationRunner({ consentGate: consent() as never, journal: record.sink });
    const fakeAdapter = adapter();
    const result = await runner.execute(patchPlan, fakeAdapter);
    expect(result.state).toBe("completed");
    expect(fakeAdapter.calls).toEqual(["patch-handoff"]);
  });

  it("requires an exact target and authorization in every plan", async () => {
    const runner = new RemediationRunner({ consentGate: consent() as never, journal: journal().sink });
    await expect(runner.execute({ ...plan, targetId: "" }, adapter())).rejects.toBeInstanceOf(RemediationRunnerError);
  });
});
