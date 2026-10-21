import {
  closeRootSession,
  detectRoot,
  executeApprovedRootOperation,
  requestRootSession,
} from "expo-droid-commander-usb-host";

import type { RootProvider, RootScope } from "./root-access";

export const nativeRootProvider: RootProvider = {
  detect: detectRoot,
  async requestScopedSession(request) {
    const result = await requestRootSession(request.sessionId, request.targetId, [...request.scopes], request.durationSeconds);
    if (!("sessionId" in result)) return null;
    const scopes = result.scopes.filter((scope: string): scope is RootScope => ["read-protected-metadata", "approved-setting-change", "training-app-operation"].includes(scope));
    if (scopes.length !== result.scopes.length) return null;
    return { ...result, scopes };
  },
  closeSession: closeRootSession,
  async executeApprovedOperation(input) {
    return executeApprovedRootOperation(input.grant.sessionId, input.operationId, input.parameters);
  },
};
