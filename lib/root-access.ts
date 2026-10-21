import { ConsentGateError, type TwoPartyConsentGate } from "./two-party-consent";

export type RootScope = "read-protected-metadata" | "approved-setting-change" | "training-app-operation";
export type RootAvailability = "unknown" | "unavailable" | "manager-available" | "granted" | "denied";

export type RootStatus = {
  availability: RootAvailability;
  manager?: string;
  suPath?: string;
  reason: string;
};

export type RootGrant = {
  sessionId: string;
  targetId: string;
  scopes: RootScope[];
  expiresAt: string;
  manager: string;
};

export type RootRequest = {
  sessionId: string;
  targetId: string;
  authorizationId: string;
  purpose: string;
  scopes: readonly RootScope[];
  durationSeconds: number;
  consentRequestId: string;
};

export interface RootProvider {
  detect(): Promise<RootStatus>;
  requestScopedSession(request: Omit<RootRequest, "consentRequestId">): Promise<RootGrant | null>;
  closeSession(sessionId: string): Promise<void>;
  executeApprovedOperation(input: { grant: RootGrant; operationId: string; parameters: Record<string, string> }): Promise<{ ok: boolean; message: string }>;
}

export class RootAccessError extends Error {
  constructor(public readonly code: "INVALID_REQUEST" | "CONSENT_REQUIRED" | "ROOT_UNAVAILABLE" | "SESSION_EXPIRED" | "SCOPE_DENIED" | "OPERATION_UNSUPPORTED", message: string) {
    super(message);
    this.name = "RootAccessError";
  }
}

const OPERATION_SCOPES: Record<string, RootScope> = {
  "read-protected-metadata": "read-protected-metadata",
  "apply-approved-setting": "approved-setting-change",
  "run-approved-training-app-operation": "training-app-operation",
};

export class RootAccessController {
  private readonly sessions = new Map<string, RootGrant>();

  constructor(private readonly dependencies: { provider: RootProvider; consentGate: TwoPartyConsentGate; now?: () => string }) {}

  detect() {
    return this.dependencies.provider.detect();
  }

  async requestAccess(request: RootRequest): Promise<RootGrant> {
    this.validateRequest(request);
    try {
      return await this.dependencies.consentGate.execute(request.consentRequestId, async () => {
        const grant = await this.dependencies.provider.requestScopedSession({ ...request });
        if (!grant) throw new RootAccessError("ROOT_UNAVAILABLE", "The device did not grant the requested root session.");
        this.sessions.set(grant.sessionId, grant);
        return grant;
      });
    } catch (error) {
      if (error instanceof ConsentGateError) throw new RootAccessError("CONSENT_REQUIRED", "Explicit operator and client consent is required before root access.");
      throw error;
    }
  }

  async executeApprovedOperation(sessionId: string, operationId: string, parameters: Record<string, string> = {}) {
    const grant = this.sessions.get(sessionId);
    if (!grant) throw new RootAccessError("ROOT_UNAVAILABLE", "No active scoped root session exists.");
    if (new Date(grant.expiresAt).getTime() <= new Date(this.now()).getTime()) {
      this.sessions.delete(sessionId);
      await this.dependencies.provider.closeSession(sessionId);
      throw new RootAccessError("SESSION_EXPIRED", "The scoped root session has expired.");
    }
    const requiredScope = OPERATION_SCOPES[operationId];
    if (!requiredScope) throw new RootAccessError("OPERATION_UNSUPPORTED", "Only reviewed native root operation IDs are supported.");
    if (!grant.scopes.includes(requiredScope)) throw new RootAccessError("SCOPE_DENIED", "The requested root operation is outside the approved scope.");
    return this.dependencies.provider.executeApprovedOperation({ grant, operationId, parameters });
  }

  async close(sessionId: string) {
    this.sessions.delete(sessionId);
    await this.dependencies.provider.closeSession(sessionId);
  }

  private validateRequest(request: RootRequest) {
    if (!request.sessionId || !request.targetId || !request.authorizationId || !request.purpose || !request.consentRequestId || request.scopes.length === 0) throw new RootAccessError("INVALID_REQUEST", "Root access requires an exact target, authorization, purpose, scope, session, and consent request.");
    if (!Number.isInteger(request.durationSeconds) || request.durationSeconds < 1 || request.durationSeconds > 900) throw new RootAccessError("INVALID_REQUEST", "Root sessions must be between one second and fifteen minutes.");
    if (request.scopes.some((scope) => !Object.values(OPERATION_SCOPES).includes(scope))) throw new RootAccessError("INVALID_REQUEST", "The requested root scope is not allow-listed.");
  }

  private now() {
    return this.dependencies.now?.() ?? new Date().toISOString();
  }
}
