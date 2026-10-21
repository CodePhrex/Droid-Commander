import { describe, expect, it } from "vitest";

import {
  DeviceOperationRouter,
  type DeviceOperationAdapter,
  type DeviceOperationHandler,
  type DeviceScope,
} from "../lib/device-operation-router";

const hostScope: DeviceScope = { kind: "local-host", targetId: "local-host" };
const peerScope: DeviceScope = { kind: "usb-peer", targetId: "usb-peer-17" };

function adapter(scope: DeviceScope, handlers: DeviceOperationAdapter["handlers"], unavailableReasons?: DeviceOperationAdapter["unavailableReasons"]): DeviceOperationAdapter {
  return { scope, handlers, unavailableReasons };
}

describe("DeviceOperationRouter", () => {
  it("dispatches the same operation ID to the handler bound to each scope", async () => {
    const dispatched: string[] = [];
    const hostHandler: DeviceOperationHandler = async ({ scope }) => {
      dispatched.push(`${scope.kind}:${scope.targetId}`);
      return { source: "host" };
    };
    const peerHandler: DeviceOperationHandler = async ({ scope }) => {
      dispatched.push(`${scope.kind}:${scope.targetId}`);
      return { source: "peer" };
    };
    const router = new DeviceOperationRouter({
      resolveAdapter: (scope) => scope.kind === "local-host"
        ? adapter(hostScope, { "read-posture": hostHandler })
        : adapter(peerScope, { "read-posture": peerHandler }),
    });

    await expect(router.execute({ scope: hostScope, operationId: "read-posture" })).resolves.toMatchObject({
      scope: hostScope,
      operationId: "read-posture",
      status: "completed",
      data: { source: "host" },
    });
    await expect(router.execute({ scope: peerScope, operationId: "read-posture" })).resolves.toMatchObject({
      scope: peerScope,
      operationId: "read-posture",
      status: "completed",
      data: { source: "peer" },
    });
    expect(dispatched).toEqual(["local-host:local-host", "usb-peer:usb-peer-17"]);
  });

  it("runs a local-host operation without a USB adapter", async () => {
    let hostRuns = 0;
    const router = new DeviceOperationRouter({
      resolveAdapter: (scope) => scope.kind === "local-host"
        ? adapter(hostScope, { "inspect-root": async () => { hostRuns += 1; return { inspected: true }; } })
        : undefined,
    });

    await expect(router.execute({ scope: hostScope, operationId: "inspect-root" })).resolves.toMatchObject({
      status: "completed",
      data: { inspected: true },
    });
    expect(hostRuns).toBe(1);
  });

  it("rejects an adapter whose target does not exactly match the selected target", async () => {
    let calls = 0;
    const wrongPeer: DeviceScope = { kind: "usb-peer", targetId: "usb-peer-other" };
    const router = new DeviceOperationRouter({
      resolveAdapter: () => adapter(wrongPeer, { "read-posture": async () => { calls += 1; } }),
    });

    await expect(router.execute({ scope: peerScope, operationId: "read-posture" })).resolves.toMatchObject({
      status: "unavailable",
      reason: "The resolved adapter does not match the selected device.",
    });
    expect(calls).toBe(0);
  });

  it("does not fall back to the local host when a selected USB peer is missing", async () => {
    let hostCalls = 0;
    const selectedScopes: DeviceScope[] = [];
    const router = new DeviceOperationRouter({
      resolveAdapter: (scope) => {
        selectedScopes.push(scope);
        if (scope.kind === "local-host") return adapter(hostScope, { "read-posture": async () => { hostCalls += 1; } });
        return undefined;
      },
    });

    await expect(router.execute({ scope: peerScope, operationId: "read-posture" })).resolves.toMatchObject({
      scope: peerScope,
      status: "unavailable",
      reason: "The selected device is not available.",
    });
    expect(selectedScopes).toEqual([peerScope]);
    expect(hostCalls).toBe(0);
  });

  it("reports missing capabilities as unavailable for both local host and USB peer", async () => {
    const reason = "The selected device does not expose this capability.";
    const router = new DeviceOperationRouter({
      resolveAdapter: (scope) => scope.kind === "local-host"
        ? adapter(hostScope, {}, { "read-capabilities": reason })
        : adapter(peerScope, {}, { "read-capabilities": reason }),
    });

    await expect(router.execute({ scope: hostScope, operationId: "read-capabilities" })).resolves.toMatchObject({ status: "unavailable", reason });
    await expect(router.execute({ scope: peerScope, operationId: "read-capabilities" })).resolves.toMatchObject({ status: "unavailable", reason });
  });

  it("does not treat owner-consent data as a local-host authorization shortcut", async () => {
    let handlerCalls = 0;
    const router = new DeviceOperationRouter({
      resolveAdapter: () => adapter(hostScope, { "reviewed-remediation": async () => { handlerCalls += 1; } }),
    });

    await expect(router.execute({
      scope: hostScope,
      operationId: "reviewed-remediation",
      parameters: { ownerConsent: true },
    })).resolves.toMatchObject({
      status: "denied",
      reason: "This operation requires common authorization, but no authorizer is configured.",
    });
    expect(handlerCalls).toBe(0);
  });

  it("does not let a caller-forged approved flag bypass common authorization", async () => {
    let handlerCalls = 0;
    let authorizedRequest: unknown;
    const router = new DeviceOperationRouter({
      resolveAdapter: () => adapter(hostScope, { "request-root-session": async () => { handlerCalls += 1; } }),
      authorize: async (_operation, _scope, request) => {
        authorizedRequest = request;
        return { allowed: false, reason: "Common authorization did not approve this operation." };
      },
    });

    await expect(router.execute({
      scope: hostScope,
      operationId: "request-root-session",
      parameters: { approved: true },
    })).resolves.toMatchObject({
      status: "denied",
      reason: "Common authorization did not approve this operation.",
    });
    expect(authorizedRequest).toEqual({ approved: true });
    expect(handlerCalls).toBe(0);
  });

  it("uses valid common authorization before dispatching high-security operations on both scopes", async () => {
    const authorizedScopes: DeviceScope[] = [];
    const dispatchedScopes: DeviceScope[] = [];
    const handler: DeviceOperationHandler = async ({ scope }) => {
      dispatchedScopes.push(scope);
      return { serviced: scope.targetId };
    };
    const router = new DeviceOperationRouter({
      resolveAdapter: (scope) => scope.kind === "local-host"
        ? adapter(hostScope, { "vendor-service": handler })
        : adapter(peerScope, { "vendor-service": handler }),
      authorize: async (_operation, scope) => {
        authorizedScopes.push(scope);
        return { allowed: true, reason: "Authorized by the common gate." };
      },
    });

    await expect(router.execute({ scope: hostScope, operationId: "vendor-service" })).resolves.toMatchObject({ status: "completed", data: { serviced: "local-host" } });
    await expect(router.execute({ scope: peerScope, operationId: "vendor-service" })).resolves.toMatchObject({ status: "completed", data: { serviced: "usb-peer-17" } });
    expect(authorizedScopes).toEqual([hostScope, peerScope]);
    expect(dispatchedScopes).toEqual([hostScope, peerScope]);
  });

  it("rejects unknown runtime operation IDs without resolving or dispatching an adapter", async () => {
    let resolverCalls = 0;
    const router = new DeviceOperationRouter({
      resolveAdapter: () => {
        resolverCalls += 1;
        return adapter(hostScope, { "read-posture": async () => undefined });
      },
    });

    await expect(router.execute({ scope: hostScope, operationId: "arbitrary-shell" as never })).resolves.toEqual({
      scope: hostScope,
      operationId: "unknown",
      status: "unavailable",
      reason: "This operation ID is not supported.",
    });
    expect(resolverCalls).toBe(0);
  });

  it("sanitizes unexpected handler errors instead of returning sensitive exception text", async () => {
    const router = new DeviceOperationRouter({
      resolveAdapter: () => adapter(hostScope, {
        "inspect-root": async () => { throw new Error("session token=top-secret-value"); },
      }),
    });

    const result = await router.execute({ scope: hostScope, operationId: "inspect-root" });
    expect(result).toMatchObject({ status: "failed", reason: "The selected device operation failed." });
    expect(result.reason).not.toContain("top-secret-value");
  });

  it("rejects an empty peer identifier before any device lookup", async () => {
    let lookups = 0;
    const router = new DeviceOperationRouter({ resolveAdapter: () => { lookups += 1; return undefined; } });
    const result = await router.execute({ scope: { kind: "usb-peer", targetId: " " }, operationId: "read-posture" });
    expect(result.status).toBe("unavailable");
    expect(lookups).toBe(0);
  });

  it("snapshots the selected peer before waiting for authorization", async () => {
    const requested: DeviceScope = { kind: "usb-peer", targetId: "original-peer" };
    let executedTarget = "";
    const router = new DeviceOperationRouter({
      resolveAdapter: (scope) => adapter(scope, { "vendor-service": ({ scope }) => { executedTarget = scope.targetId; } }),
      authorize: async () => { requested.targetId = "other-peer"; return { allowed: true, reason: "approved original peer" }; },
    });
    const result = await router.execute({ scope: requested, operationId: "vendor-service" });
    expect(result.status).toBe("completed");
    expect(executedTarget).toBe("original-peer");
  });

  it("does not accept a truthy non-boolean authorization value", async () => {
    let calls = 0;
    const router = new DeviceOperationRouter({
      resolveAdapter: () => adapter(hostScope, { "vendor-service": () => { calls += 1; } }),
      authorize: async () => ({ allowed: "false" as unknown as boolean, reason: "malformed approval" }),
    });
    const result = await router.execute({ scope: hostScope, operationId: "vendor-service" });
    expect(result.status).toBe("denied");
    expect(calls).toBe(0);
  });
});
