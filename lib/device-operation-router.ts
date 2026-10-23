export const DEVICE_OPERATION_IDS = [
  "read-posture",
  "verify-posture",
  "read-capabilities",
  "collect-boot-state",
  "inspect-root",
  "simulate-remediation",
  "reviewed-remediation",
  "request-root-session",
  "execute-approved-root-operation",
  "vendor-service",
  "acquire-device-image",
  "export-disclosure",
] as const;

export type DeviceOperationId = (typeof DEVICE_OPERATION_IDS)[number];

export const READ_ONLY_DEVICE_OPERATION_IDS = [
  "read-posture",
  "verify-posture",
  "read-capabilities",
  "collect-boot-state",
  "inspect-root",
  "export-disclosure",
] as const satisfies readonly DeviceOperationId[];

export type ReadOnlyDeviceOperationId = (typeof READ_ONLY_DEVICE_OPERATION_IDS)[number];

export const HIGH_SECURITY_DEVICE_OPERATION_IDS = [
  "simulate-remediation",
  "reviewed-remediation",
  "request-root-session",
  "execute-approved-root-operation",
  "vendor-service",
  "acquire-device-image",
] as const satisfies readonly DeviceOperationId[];

export type HighSecurityDeviceOperationId = (typeof HIGH_SECURITY_DEVICE_OPERATION_IDS)[number];

export type DeviceScope =
  | { kind: "local-host"; targetId: "local-host" }
  | { kind: "usb-peer"; targetId: string };

/** Data is opaque to the router; an adapter owns validation of operation-specific parameters. */
export type DeviceOperationParameters = Readonly<Record<string, unknown>>;

export type DeviceOperationExecutionRequest = {
  scope: DeviceScope;
  operationId: DeviceOperationId;
  parameters?: DeviceOperationParameters;
};

export type DeviceOperationHandlerRequest = Readonly<{
  scope: DeviceScope;
  operationId: DeviceOperationId;
  parameters?: DeviceOperationParameters;
}>;

/** A resolved handler result is evidence that its scoped operation completed. */
export type DeviceOperationHandler = (request: DeviceOperationHandlerRequest) => unknown | Promise<unknown>;

/**
 * An adapter is intentionally bound to one exact scope. It can expose the same operation IDs for
 * either kind of device, but an absent handler means the selected device cannot perform it.
 */
export type DeviceOperationAdapter = {
  scope: DeviceScope;
  handlers: Partial<Record<DeviceOperationId, DeviceOperationHandler>>;
  unavailableReasons?: Partial<Record<DeviceOperationId, string>>;
};

export type DeviceOperationAuthorization = {
  allowed: boolean;
  reason: string;
};

export type DeviceOperationAuthorizer = (
  operation: DeviceOperationId,
  scope: DeviceScope,
  request?: DeviceOperationParameters,
) => Promise<DeviceOperationAuthorization>;

export type DeviceOperationResult = {
  /** Undefined only for malformed runtime input; typed callers always receive their requested scope. */
  scope: DeviceScope | undefined;
  /** "unknown" is used only when untyped runtime input supplies an unallowlisted operation ID. */
  operationId: DeviceOperationId | "unknown";
  status: "completed" | "unavailable" | "denied" | "failed";
  data?: unknown;
  reason: string;
};

export type DeviceOperationRouterOptions = {
  resolveAdapter: (scope: DeviceScope) => DeviceOperationAdapter | undefined;
  authorize?: DeviceOperationAuthorizer;
};

const operationIds = new Set<string>(DEVICE_OPERATION_IDS);
const highSecurityOperationIds = new Set<string>(HIGH_SECURITY_DEVICE_OPERATION_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDeviceScope(value: unknown): value is DeviceScope {
  if (!isRecord(value) || typeof value.kind !== "string" || typeof value.targetId !== "string") return false;
  if (!value.targetId.trim() || value.targetId !== value.targetId.trim() || value.targetId.length > 256 || /[\u0000-\u001f\u007f]/.test(value.targetId)) return false;
  return (value.kind === "local-host" && value.targetId === "local-host") || value.kind === "usb-peer";
}

function isDeviceOperationId(value: unknown): value is DeviceOperationId {
  return typeof value === "string" && operationIds.has(value);
}

function sameScope(left: DeviceScope, right: unknown): right is DeviceScope {
  return isDeviceScope(right) && left.kind === right.kind && left.targetId === right.targetId;
}

function isHighSecurityOperation(operationId: DeviceOperationId): operationId is HighSecurityDeviceOperationId {
  return highSecurityOperationIds.has(operationId);
}

function unavailableReason(adapter: DeviceOperationAdapter, operationId: DeviceOperationId) {
  const configuredReason = adapter.unavailableReasons?.[operationId];
  if (typeof configuredReason === "string" && configuredReason.trim()) return configuredReason.trim();
  return `The selected device does not provide ${operationId}.`;
}

function resultOperationId(value: unknown): DeviceOperationId | "unknown" {
  return isDeviceOperationId(value) ? value : "unknown";
}

/**
 * Dispatches a fixed allowlist of operations to the adapter for the exact selected device.
 * It never changes scopes, discovers fallback adapters, or treats caller-supplied data as consent.
 */
export class DeviceOperationRouter {
  constructor(private readonly options: DeviceOperationRouterOptions) {}

  async execute(request: DeviceOperationExecutionRequest): Promise<DeviceOperationResult> {
    const runtimeRequest = request as unknown;
    const rawScope = isRecord(runtimeRequest) ? runtimeRequest.scope : undefined;
    const rawOperationId = isRecord(runtimeRequest) ? runtimeRequest.operationId : undefined;
    const scope: DeviceScope | undefined = isDeviceScope(rawScope) ? Object.freeze({ kind: rawScope.kind, targetId: rawScope.targetId }) as DeviceScope : undefined;
    const operationId = resultOperationId(rawOperationId);

    if (!scope) {
      return { scope: undefined, operationId, status: "unavailable", reason: "The selected device scope is invalid." };
    }
    if (operationId === "unknown") {
      return { scope, operationId, status: "unavailable", reason: "This operation ID is not supported." };
    }

    const rawParameters = isRecord(runtimeRequest) ? runtimeRequest.parameters : undefined;
    if (rawParameters !== undefined && !isRecord(rawParameters)) {
      return { scope, operationId, status: "unavailable", reason: "Operation parameters must be an object when provided." };
    }
    const parameters = rawParameters as DeviceOperationParameters | undefined;

    let adapter: DeviceOperationAdapter | undefined;
    try {
      adapter = this.options.resolveAdapter(scope);
    } catch {
      return { scope, operationId, status: "failed", reason: "The selected device could not be resolved." };
    }

    if (!adapter) {
      return { scope, operationId, status: "unavailable", reason: "The selected device is not available." };
    }
    if (!sameScope(scope, adapter.scope)) {
      return { scope, operationId, status: "unavailable", reason: "The resolved adapter does not match the selected device." };
    }

    const handler = adapter.handlers?.[operationId];
    if (typeof handler !== "function") {
      return { scope, operationId, status: "unavailable", reason: unavailableReason(adapter, operationId) };
    }

    if (isHighSecurityOperation(operationId)) {
      if (!this.options.authorize) {
        return { scope, operationId, status: "denied", reason: "This operation requires common authorization, but no authorizer is configured." };
      }

      let authorization: DeviceOperationAuthorization;
      try {
        authorization = await this.options.authorize(operationId, scope, parameters);
      } catch {
        return { scope, operationId, status: "failed", reason: "Common authorization could not be evaluated." };
      }

      if (authorization?.allowed !== true) {
        const reason = typeof authorization?.reason === "string" && authorization.reason.trim()
          ? authorization.reason.trim()
          : "Common authorization denied this operation.";
        return { scope, operationId, status: "denied", reason };
      }
    }

    // Authorization is asynchronous, so validate the selected adapter's binding again before use.
    if (!sameScope(scope, adapter.scope)) {
      return { scope, operationId, status: "unavailable", reason: "The resolved adapter no longer matches the selected device." };
    }

    try {
      const data = await handler({ scope, operationId, parameters });
      return { scope, operationId, status: "completed", data, reason: "The selected device operation completed." };
    } catch {
      return { scope, operationId, status: "failed", reason: "The selected device operation failed." };
    }
  }
}
