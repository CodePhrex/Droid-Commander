import { ConsentGateError, type TwoPartyConsentGate } from "./two-party-consent";

export type RemediationStepKind = "safe-proof-check" | "setting-change" | "application-fix" | "system-patch-handoff";
export type RemediationRunState = "completed" | "rolled-back" | "partial-failure" | "rollback-completed" | "rollback-partial";

export type RemediationStep = {
  stepId: string;
  actionId: string;
  kind: RemediationStepKind;
  description: string;
  reversible: boolean;
};

export type RemediationPlan = {
  planId: string;
  findingId: string;
  cveId?: string;
  targetId: string;
  purpose: string;
  authorizationId: string;
  allowedKinds: readonly RemediationStepKind[];
  steps: RemediationStep[];
  executionConsentId: string;
};

export type RemediationContext = {
  planId: string;
  findingId: string;
  cveId?: string;
  targetId: string;
  authorizationId: string;
  step: RemediationStep;
};

export type RemediationStepResult = {
  ok: boolean;
  message: string;
  beforeState?: string;
  afterState?: string;
  rollbackToken?: string;
  osConfirmationRequired?: boolean;
};

export interface RemediationAdapter {
  runSafeProofCheck(context: RemediationContext): Promise<RemediationStepResult>;
  applySettingChange(context: RemediationContext): Promise<RemediationStepResult>;
  applyApplicationFix(context: RemediationContext): Promise<RemediationStepResult>;
  openSystemPatchHandoff(context: RemediationContext): Promise<RemediationStepResult>;
  rollback(context: RemediationContext, rollbackToken: string): Promise<RemediationStepResult>;
}

export type RemediationJournalEvent = {
  event: "plan-accepted" | "step-started" | "step-completed" | "step-failed" | "automatic-rollback" | "manual-rollback" | "run-completed";
  planId: string;
  targetId: string;
  stepId?: string;
  state?: RemediationRunState;
  detail: string;
  at: string;
};

export interface RemediationJournal {
  record(event: RemediationJournalEvent): void;
}

export class RemediationRunnerError extends Error {
  constructor(public readonly code: "INVALID_PLAN" | "TARGET_MISMATCH" | "UNSUPPORTED_PLAYBOOK" | "STEP_FAILED" | "ROLLBACK_FAILED" | "CONSENT_REQUIRED", message: string) {
    super(message);
    this.name = "RemediationRunnerError";
  }
}

type CompletedStep = { step: RemediationStep; result: RemediationStepResult };

type RunRecord = {
  plan: RemediationPlan;
  completed: CompletedStep[];
  state?: RemediationRunState;
};

export class RemediationRunner {
  private readonly runs = new Map<string, RunRecord>();

  constructor(private readonly dependencies: { consentGate: TwoPartyConsentGate; journal: RemediationJournal; now?: () => string }) {}

  async execute(plan: RemediationPlan, adapter: RemediationAdapter): Promise<{ state: RemediationRunState; completedStepIds: string[]; detail: string }> {
    this.validatePlan(plan);
    const record: RunRecord = { plan, completed: [] };
    this.runs.set(plan.planId, record);
    this.dependencies.journal.record({ event: "plan-accepted", planId: plan.planId, targetId: plan.targetId, detail: "Reviewed remediation plan accepted; execution remains consent-gated.", at: this.now() });

    try {
      return await this.dependencies.consentGate.execute(plan.executionConsentId, async () => {
        for (const step of plan.steps) {
          this.dependencies.journal.record({ event: "step-started", planId: plan.planId, targetId: plan.targetId, stepId: step.stepId, detail: step.description, at: this.now() });
          const result = await this.executeStep(plan, step, adapter);
          if (!result.ok) {
            this.dependencies.journal.record({ event: "step-failed", planId: plan.planId, targetId: plan.targetId, stepId: step.stepId, detail: result.message, at: this.now() });
            throw new RemediationRunnerError("STEP_FAILED", result.message);
          }
          record.completed.push({ step, result });
          this.dependencies.journal.record({ event: "step-completed", planId: plan.planId, targetId: plan.targetId, stepId: step.stepId, detail: result.message, at: this.now() });
        }
        record.state = "completed";
        this.dependencies.journal.record({ event: "run-completed", planId: plan.planId, targetId: plan.targetId, state: record.state, detail: "All approved remediation steps completed.", at: this.now() });
        return { state: record.state, completedStepIds: record.completed.map((item) => item.step.stepId), detail: "completed" };
      });
    } catch (error) {
      if (error instanceof ConsentGateError) throw new RemediationRunnerError("CONSENT_REQUIRED", "Manual operator and client consent is required before remediation execution.");
      if (error instanceof RemediationRunnerError && error.code === "CONSENT_REQUIRED") throw error;
      const rollbackState = await this.rollbackCompleted(record, adapter, "automatic rollback after failed remediation");
      record.state = rollbackState;
      this.dependencies.journal.record({ event: "run-completed", planId: plan.planId, targetId: plan.targetId, state: rollbackState, detail: "Remediation failed; completed reversible steps were rolled back where possible.", at: this.now() });
      return { state: rollbackState, completedStepIds: record.completed.map((item) => item.step.stepId), detail: error instanceof Error ? error.message : "remediation failed" };
    }
  }

  async rollback(planId: string, rollbackConsentId: string, adapter: RemediationAdapter): Promise<{ state: RemediationRunState; detail: string }> {
    const record = this.runs.get(planId);
    if (!record) throw new RemediationRunnerError("INVALID_PLAN", "The remediation run is not available for rollback.");
    if (!record.completed.some((item) => item.step.reversible && item.result.rollbackToken)) throw new RemediationRunnerError("ROLLBACK_FAILED", "No reversible completed steps are available for rollback.");
    return this.dependencies.consentGate.execute(rollbackConsentId, async () => {
      const state = await this.rollbackCompleted(record, adapter, "manual rollback approved by operator and client");
      record.state = state;
      return { state, detail: state === "rollback-completed" ? "rollback completed" : "rollback partially completed" };
    });
  }

  private validatePlan(plan: RemediationPlan) {
    if (!plan.planId || !plan.findingId || !plan.targetId || !plan.purpose || !plan.authorizationId || !plan.executionConsentId || plan.steps.length === 0) throw new RemediationRunnerError("INVALID_PLAN", "A remediation plan requires a finding, exact target, authorization, purpose, consent, and at least one step.");
    if (plan.steps.some((step) => !step.stepId || !step.actionId || !step.description || !plan.allowedKinds.includes(step.kind))) throw new RemediationRunnerError("UNSUPPORTED_PLAYBOOK", "Every remediation step must be a reviewed, allow-listed playbook step.");
    if (plan.steps.some((step) => step.kind === ("arbitrary-exploit" as RemediationStepKind))) throw new RemediationRunnerError("UNSUPPORTED_PLAYBOOK", "Arbitrary exploit execution is not a supported remediation step.");
  }

  private async executeStep(plan: RemediationPlan, step: RemediationStep, adapter: RemediationAdapter) {
    const context: RemediationContext = { planId: plan.planId, findingId: plan.findingId, cveId: plan.cveId, targetId: plan.targetId, authorizationId: plan.authorizationId, step };
    switch (step.kind) {
      case "safe-proof-check": return adapter.runSafeProofCheck(context);
      case "setting-change": return adapter.applySettingChange(context);
      case "application-fix": return adapter.applyApplicationFix(context);
      case "system-patch-handoff": return adapter.openSystemPatchHandoff(context);
    }
  }

  private async rollbackCompleted(record: RunRecord, adapter: RemediationAdapter, detail: string): Promise<RemediationRunState> {
    let failed = false;
    for (const completed of [...record.completed].reverse()) {
      if (!completed.step.reversible || !completed.result.rollbackToken) continue;
      const context: RemediationContext = { planId: record.plan.planId, findingId: record.plan.findingId, cveId: record.plan.cveId, targetId: record.plan.targetId, authorizationId: record.plan.authorizationId, step: completed.step };
      this.dependencies.journal.record({ event: "automatic-rollback", planId: record.plan.planId, targetId: record.plan.targetId, stepId: completed.step.stepId, detail, at: this.now() });
      const result = await adapter.rollback(context, completed.result.rollbackToken);
      if (!result.ok) failed = true;
    }
    return failed ? "rollback-partial" : "rollback-completed";
  }

  private now() {
    return this.dependencies.now?.() ?? new Date().toISOString();
  }
}
