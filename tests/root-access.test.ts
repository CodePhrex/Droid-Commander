import { describe, expect, it } from "vitest";

import { RootAccessController, RootAccessError } from "../lib/root-access";
import { ConsentGateError } from "../lib/two-party-consent";

const request = {
  sessionId: "root-session-001",
  targetId: "lab-handset-a",
  authorizationId: "auth-001",
  purpose: "Run an approved training application operation.",
  scopes: ["training-app-operation"] as const,
  durationSeconds: 120,
  consentRequestId: "consent-root-001",
};

function consent(approved = true) {
  return { execute: async <T>(_id: string, operation: () => Promise<T>) => { if (!approved) throw new ConsentGateError("INVALID_STATE", "consent required"); return operation(); } };
}

function provider(overrides: Partial<{ grant: boolean; status: "unavailable" | "manager-available" }> = {}) {
  const calls: string[] = [];
  return {
    calls,
    detect: async () => ({ availability: overrides.status ?? "manager-available", manager: "TestRootManager", reason: "test" }),
    requestScopedSession: async () => overrides.grant === false ? null : { sessionId: request.sessionId, targetId: request.targetId, scopes: [...request.scopes], expiresAt: "2026-10-20T20:02:00.000Z", manager: "TestRootManager" },
    closeSession: async (sessionId: string) => { calls.push(`close:${sessionId}`); },
    executeApprovedOperation: async ({ operationId }: { operationId: string }) => { calls.push(operationId); return { ok: true, message: "approved native operation" }; },
  };
}

describe("scoped root access", () => {
  it("detects an already-installed root manager without requesting root", async () => {
    const root = provider();
    const controller = new RootAccessController({ provider: root, consentGate: consent() as never });
    await expect(controller.detect()).resolves.toMatchObject({ availability: "manager-available" });
    expect(root.calls).toEqual([]);
  });

  it("requires explicit consent before requesting a scoped root session", async () => {
    const root = provider();
    const controller = new RootAccessController({ provider: root, consentGate: consent(false) as never });
    await expect(controller.requestAccess(request)).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  });

  it("grants only the requested short-lived scopes after consent", async () => {
    const root = provider();
    const controller = new RootAccessController({ provider: root, consentGate: consent() as never, now: () => "2026-10-20T20:00:00.000Z" });
    const grant = await controller.requestAccess(request);
    expect(grant).toMatchObject({ sessionId: request.sessionId, scopes: ["training-app-operation"] });
    await expect(controller.executeApprovedOperation(request.sessionId, "run-approved-training-app-operation")).resolves.toMatchObject({ ok: true });
    expect(root.calls).toEqual(["run-approved-training-app-operation"]);
  });

  it("rejects operations outside the approved root scope", async () => {
    const root = provider();
    const controller = new RootAccessController({ provider: root, consentGate: consent() as never, now: () => "2026-10-20T20:00:00.000Z" });
    await controller.requestAccess(request);
    await expect(controller.executeApprovedOperation(request.sessionId, "apply-approved-setting")).rejects.toMatchObject({ code: "SCOPE_DENIED" });
  });

  it("rejects arbitrary root commands", async () => {
    const root = provider();
    const controller = new RootAccessController({ provider: root, consentGate: consent() as never, now: () => "2026-10-20T20:00:00.000Z" });
    await controller.requestAccess(request);
    await expect(controller.executeApprovedOperation(request.sessionId, "su -c rm -rf /" as never)).rejects.toMatchObject({ code: "OPERATION_UNSUPPORTED" });
  });

  it("rejects durations longer than fifteen minutes", async () => {
    const controller = new RootAccessController({ provider: provider(), consentGate: consent() as never });
    await expect(controller.requestAccess({ ...request, durationSeconds: 901 })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("fails closed when the root manager denies the session", async () => {
    const controller = new RootAccessController({ provider: provider({ grant: false }), consentGate: consent() as never });
    await expect(controller.requestAccess(request)).rejects.toMatchObject({ code: "ROOT_UNAVAILABLE" });
  });

  it("expires a session and closes it before executing another operation", async () => {
    const root = provider();
    const controller = new RootAccessController({ provider: root, consentGate: consent() as never, now: () => "2026-10-20T20:03:00.000Z" });
    await controller.requestAccess(request);
    await expect(controller.executeApprovedOperation(request.sessionId, "run-approved-training-app-operation")).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    expect(root.calls).toContain(`close:${request.sessionId}`);
  });

  it("closes a granted session explicitly", async () => {
    const root = provider();
    const controller = new RootAccessController({ provider: root, consentGate: consent() as never });
    await controller.requestAccess(request);
    await controller.close(request.sessionId);
    expect(root.calls).toContain(`close:${request.sessionId}`);
  });

  it("uses an explicit unavailable state on a standard device", async () => {
    const root = provider({ status: "unavailable" });
    const controller = new RootAccessController({ provider: root, consentGate: consent() as never });
    await expect(controller.detect()).resolves.toMatchObject({ availability: "unavailable" });
  });

  it("keeps the error type stable for application-level handling", () => {
    expect(new RootAccessError("OPERATION_UNSUPPORTED", "not allowed")).toBeInstanceOf(Error);
  });
});
