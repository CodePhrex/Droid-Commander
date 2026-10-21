export type OperatorDeveloperCapability =
  | "verbose-logging"
  | "collect-diagnostics"
  | "export-redacted-audit"
  | "open-developer-settings"
  | "view-boot-state"
  | "view-usb-debug-status";

export type OperatorDeveloperRequest = {
  operatorId: string;
  organizationId: string;
  sessionId: string;
  reason: string;
  now: string;
  requestedMinutes: number;
  operatorAuthorized: boolean;
  capabilities: readonly OperatorDeveloperCapability[];
};

export type OperatorDeveloperFinding = {
  code: "OPERATOR_REQUIRED" | "REASON_REQUIRED" | "DURATION_INVALID" | "CAPABILITY_NOT_ALLOWED" | "SESSION_REQUIRED" | "EXPIRED";
  message: string;
};

export type OperatorDeveloperSession = {
  decision: "allow" | "deny";
  operatorId: string;
  organizationId: string;
  sessionId: string;
  activatedAt: string;
  expiresAt?: string;
  capabilities: OperatorDeveloperCapability[];
  findings: OperatorDeveloperFinding[];
  auditOnly: true;
  systemSecuritySettingsUnchanged: true;
};

const ALLOWED = new Set<OperatorDeveloperCapability>([
  "verbose-logging",
  "collect-diagnostics",
  "export-redacted-audit",
  "open-developer-settings",
  "view-boot-state",
  "view-usb-debug-status",
]);
const MAX_MINUTES = 60;

function parse(value: string) { const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? timestamp : null; }

export function activateOperatorDeveloperMode(request: OperatorDeveloperRequest): OperatorDeveloperSession {
  const findings: OperatorDeveloperFinding[] = [];
  if (!request.operatorAuthorized) findings.push({ code: "OPERATOR_REQUIRED", message: "An authorized operator identity is required." });
  if (!request.sessionId.trim()) findings.push({ code: "SESSION_REQUIRED", message: "A bound operator session is required." });
  if (request.reason.trim().length < 12) findings.push({ code: "REASON_REQUIRED", message: "A specific diagnostic reason of at least 12 characters is required." });
  if (!Number.isInteger(request.requestedMinutes) || request.requestedMinutes < 1 || request.requestedMinutes > MAX_MINUTES) findings.push({ code: "DURATION_INVALID", message: `Developer mode must be between 1 and ${MAX_MINUTES} minutes.` });
  const capabilities = [...new Set(request.capabilities)];
  if (capabilities.some((capability) => !ALLOWED.has(capability))) findings.push({ code: "CAPABILITY_NOT_ALLOWED", message: "The requested capability is outside the fixed diagnostic allow-list." });
  const now = parse(request.now);
  if (now === null) findings.push({ code: "SESSION_REQUIRED", message: "A valid activation timestamp is required." });
  const expiresAt = now === null ? undefined : new Date(now + request.requestedMinutes * 60_000).toISOString();
  return {
    decision: findings.length === 0 ? "allow" : "deny",
    operatorId: request.operatorId,
    organizationId: request.organizationId,
    sessionId: request.sessionId,
    activatedAt: request.now,
    expiresAt,
    capabilities,
    findings,
    auditOnly: true,
    systemSecuritySettingsUnchanged: true,
  };
}

export function isOperatorDeveloperSessionActive(session: OperatorDeveloperSession, now: string) {
  if (session.decision !== "allow" || !session.expiresAt) return false;
  const nowMs = parse(now);
  const expiresMs = parse(session.expiresAt);
  return nowMs !== null && expiresMs !== null && nowMs < expiresMs;
}

export function requireDeveloperCapability(session: OperatorDeveloperSession, capability: OperatorDeveloperCapability, now: string) {
  if (!isOperatorDeveloperSessionActive(session, now)) throw new Error("The operator developer session is expired or inactive.");
  if (!session.capabilities.includes(capability)) throw new Error(`Developer capability ${capability} is not granted to this session.`);
}
