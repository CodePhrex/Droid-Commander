import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { collectBootState, collectLocalDeviceState, detectRoot, getUsbDiagnostics } from "expo-droid-commander-usb-host";
import { DeviceOperationRouter, type DeviceOperationId, type DeviceScope } from "../lib/device-operation-router";
import { LocalAssessmentStore } from "../lib/local-assessment-store";

export const LOCAL_HOST_SCOPE: DeviceScope = Object.freeze({ kind: "local-host", targetId: "local-host" });

// This adapter addresses only the Android device executing this application.
// Privileged adapters are not installed here: their existing consent and provider
// controllers remain mandatory. Missing handlers cannot become simulated success.
export const localHostOperationRouter = new DeviceOperationRouter({
  resolveAdapter: (scope) => scope.kind === "local-host" && scope.targetId === LOCAL_HOST_SCOPE.targetId ? {
    scope: LOCAL_HOST_SCOPE,
    handlers: {
      "read-posture": () => collectLocalDeviceState(),
      "verify-posture": () => collectLocalDeviceState(),
      "inspect-root": () => detectRoot(),
      "collect-boot-state": () => collectBootState(),
      "read-capabilities": () => getUsbDiagnostics(),
    },
    unavailableReasons: {
      "reviewed-remediation": "A reviewed remediation adapter and its operator/owner consent controller are not configured for this device.",
      "request-root-session": "A scoped root-session UI/authorization binding is not configured; inspecting root availability does not request access.",
      "vendor-service": "A manufacturer-authorized provider is not configured for this device and firmware.",
      "acquire-device-image": "No authorized device-image acquisition adapter is configured; ordinary Android apps cannot image every protected partition.",
    },
  } : undefined,
});

async function readLocal(operationId: DeviceOperationId) {
  const result = await localHostOperationRouter.execute({ scope: LOCAL_HOST_SCOPE, operationId });
  if (result.status === "completed") return result.data ?? null;
  if (result.status === "failed") throw new Error(result.reason);
  return null;
}

export const localAssessmentStore = new LocalAssessmentStore({
  collect: () => readLocal("read-posture"),
  detectRoot: () => readLocal("inspect-root"),
  storage: AsyncStorage,
  now: () => new Date().toISOString(),
  uuid: () => Crypto.randomUUID(),
});

export function useLocalAssessment() {
  const state = useSyncExternalStore(localAssessmentStore.subscribe, localAssessmentStore.getSnapshot, localAssessmentStore.getSnapshot);
  useEffect(() => { void localAssessmentStore.initialize(); }, []);
  return { ...state, runAssessment: localAssessmentStore.runAssessment };
}
