export type ConsentState = "awaiting-operator" | "awaiting-client" | "approved" | "denied" | "expired" | "consumed";

export type HighSecurityRequest = {
  requestId: string;
  operation: string;
  targetId: string;
  targetLabel: string;
  purpose: string;
  riskSummary: string;
  operatorId: string;
  clientId: string;
  challenge: string;
  promptDigest: string;
  createdAt: string;
  expiresAt: string;
};

export type OperatorVerification = {
  operatorId: string;
  credentialReference: string;
  requestDigest: string;
  verifiedAt: string;
  method: "manual-operator-verification";
};

export type ClientConsent = {
  clientId: string;
  requestDigest: string;
  promptDigest: string;
  challengeResponse: string;
  consent: "approved" | "denied";
  confirmedAt: string;
  method: "manual-client-confirmation";
};

export type ConsentAuditEvent = {
  event: "request-created" | "operator-verified" | "client-prompted" | "client-approved" | "client-denied" | "execution-started" | "execution-failed" | "execution-completed" | "consent-rejected";
  requestId: string;
  operation: string;
  targetId: string;
  state: ConsentState;
  at: string;
  reason?: string;
};

export interface ConsentAuditSink {
  record(event: ConsentAuditEvent): void;
}

export type TwoPartyConsentDependencies = {
  now?: () => string;
  digest: (value: string) => string;
  verifyOperator: (request: HighSecurityRequest, verification: OperatorVerification) => Promise<boolean>;
  verifyClient: (request: HighSecurityRequest, consent: ClientConsent) => Promise<boolean>;
  auditSink: ConsentAuditSink;
};

export class ConsentGateError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "INVALID_STATE" | "EXPIRED" | "MISMATCH" | "VERIFICATION_FAILED" | "CLIENT_DENIED" | "CONSUMED", message: string) {
    super(message);
    this.name = "ConsentGateError";
  }
}

type ConsentRecord = {
  request: HighSecurityRequest;
  state: ConsentState;
  operator?: OperatorVerification;
  client?: ClientConsent;
};

function hasText(value: string) {
  return value.trim().length > 0;
}

function time(value: string) {
  return new Date(value).getTime();
}

export class TwoPartyConsentGate {
  private readonly records = new Map<string, ConsentRecord>();
  private readonly now: () => string;

  constructor(private readonly dependencies: TwoPartyConsentDependencies) {
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  createRequest(input: Omit<HighSecurityRequest, "promptDigest" | "createdAt"> & { createdAt?: string }): HighSecurityRequest {
    const createdAt = input.createdAt ?? this.now();
    const fields = [input.requestId, input.operation, input.targetId, input.targetLabel, input.purpose, input.riskSummary, input.operatorId, input.clientId, input.challenge, input.expiresAt];
    if (fields.some((field) => !hasText(field)) || time(input.expiresAt) <= time(createdAt)) throw new ConsentGateError("MISMATCH", "High-security consent requests require complete fields and a future expiry.");
    const request = { ...input, createdAt, promptDigest: this.dependencies.digest(JSON.stringify({ ...input, createdAt })) };
    this.records.set(request.requestId, { request, state: "awaiting-operator" });
    this.dependencies.auditSink.record({ event: "request-created", requestId: request.requestId, operation: request.operation, targetId: request.targetId, state: "awaiting-operator", at: createdAt });
    return request;
  }

  getState(requestId: string): ConsentState {
    const record = this.getRecord(requestId);
    this.expireIfNeeded(record);
    return record.state;
  }

  async verifyOperator(requestId: string, verification: OperatorVerification) {
    const record = this.getRecord(requestId);
    this.ensureLive(record);
    if (record.state !== "awaiting-operator") throw new ConsentGateError("INVALID_STATE", "Operator verification is not expected in the current state.");
    if (verification.method !== "manual-operator-verification" || verification.operatorId !== record.request.operatorId || verification.requestDigest !== record.request.promptDigest || time(verification.verifiedAt) > time(record.request.expiresAt)) {
      this.reject(record, "operator verification did not match the exact request");
      throw new ConsentGateError("MISMATCH", "Operator verification did not match the exact request.");
    }
    if (!await this.dependencies.verifyOperator(record.request, verification)) {
      this.reject(record, "operator verification failed");
      throw new ConsentGateError("VERIFICATION_FAILED", "Operator verification failed.");
    }
    record.operator = verification;
    record.state = "awaiting-client";
    this.dependencies.auditSink.record({ event: "operator-verified", requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: verification.verifiedAt });
    this.dependencies.auditSink.record({ event: "client-prompted", requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: this.now() });
  }

  async confirmClient(requestId: string, consent: ClientConsent) {
    const record = this.getRecord(requestId);
    this.ensureLive(record);
    if (record.state !== "awaiting-client") throw new ConsentGateError("INVALID_STATE", "Client consent is not expected in the current state.");
    if (consent.consent === "denied") {
      record.client = consent;
      record.state = "denied";
      this.dependencies.auditSink.record({ event: "client-denied", requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: consent.confirmedAt });
      throw new ConsentGateError("CLIENT_DENIED", "The client denied this high-security operation.");
    }
    if (consent.method !== "manual-client-confirmation" || consent.clientId !== record.request.clientId || consent.requestDigest !== record.request.promptDigest || consent.promptDigest !== record.request.promptDigest || consent.challengeResponse !== record.request.challenge || time(consent.confirmedAt) > time(record.request.expiresAt)) {
      this.reject(record, "client confirmation did not match the displayed prompt");
      throw new ConsentGateError("MISMATCH", "Client confirmation did not match the displayed prompt.");
    }
    if (!await this.dependencies.verifyClient(record.request, consent)) {
      this.reject(record, "client verification failed");
      throw new ConsentGateError("VERIFICATION_FAILED", "Client verification failed.");
    }
    record.client = consent;
    record.state = "approved";
    this.dependencies.auditSink.record({ event: "client-approved", requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: consent.confirmedAt });
  }

  async execute<T>(requestId: string, operation: () => Promise<T>): Promise<T> {
    const record = this.getRecord(requestId);
    this.ensureLive(record);
    if (record.state !== "approved") throw new ConsentGateError(record.state === "consumed" ? "CONSUMED" : "INVALID_STATE", "Both operator verification and client consent are required before execution.");
    record.state = "consumed";
    this.dependencies.auditSink.record({ event: "execution-started", requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: this.now() });
    try {
      const result = await operation();
      this.dependencies.auditSink.record({ event: "execution-completed", requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: this.now() });
      return result;
    } catch (error) {
      this.dependencies.auditSink.record({ event: "execution-failed", requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: this.now(), reason: error instanceof Error ? error.message : "operation failed" });
      throw error;
    }
  }

  private getRecord(requestId: string) {
    const record = this.records.get(requestId);
    if (!record) throw new ConsentGateError("NOT_FOUND", "The high-security consent request was not found.");
    return record;
  }

  private ensureLive(record: ConsentRecord) {
    this.expireIfNeeded(record);
    if (record.state === "expired") throw new ConsentGateError("EXPIRED", "The high-security consent request has expired.");
  }

  private expireIfNeeded(record: ConsentRecord) {
    if (!["approved", "consumed", "denied", "expired"].includes(record.state) && time(this.now()) >= time(record.request.expiresAt)) record.state = "expired";
  }

  private reject(record: ConsentRecord, reason: string) {
    record.state = "denied";
    this.dependencies.auditSink.record({ event: "consent-rejected", requestId: record.request.requestId, operation: record.request.operation, targetId: record.request.targetId, state: record.state, at: this.now(), reason });
  }
}
