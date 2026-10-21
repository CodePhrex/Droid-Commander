export type ComplianceDecision = "allow" | "deny" | "review";

export type ComplianceCode =
  | "AUTHORIZATION_REQUIRED"
  | "SCOPE_REQUIRED"
  | "AUTHORITY_REQUIRED"
  | "CONSENT_REQUIRED"
  | "AUTHORIZATION_EXPIRED"
  | "ACTION_NOT_ALLOWED"
  | "TARGET_MISMATCH"
  | "OBSERVATION_UNAVAILABLE"
  | "SANDBOX_BOUNDARY"
  | "USB_HOST_REQUIRED"
  | "USB_PERMISSION_REQUIRED"
  | "USB_PROTOCOL_REQUIRED"
  | "ADB_AUTHORIZATION_REQUIRED"
  | "AUDIT_CONTEXT_REQUIRED"
  | "PAYLOADS_PROHIBITED"
  | "SYSTEM_UPDATE_BOUNDARY";

export type ComplianceFinding = {
  code: ComplianceCode;
  severity: "block" | "review" | "info";
  message: string;
};

export type AuthorizationRecord = {
  id: string;
  targetId: string;
  scope: string;
  authorizedBy: string;
  purpose: string;
  consentAt: string;
  expiresAt: string;
  allowedActions: string[];
};

export type Observation = {
  source: "local" | "device-owner" | "cooperative-target" | "adb";
  available: boolean;
  confidence: "high" | "medium" | "low";
  limitation?: string;
};

export type TransportState = {
  connected: boolean;
  usbHostSupported: boolean;
  usbPermissionGranted: boolean;
  cooperativeProtocol: boolean;
  adbAuthorized: boolean;
};

export type ComplianceRequest = {
  now: string;
  action: string;
  targetId: string;
  authorization?: AuthorizationRecord;
  observation?: Observation;
  transport?: TransportState;
  auditContext?: {
    sessionId: string;
    timestamp: string;
  };
  containsExploitPayload?: boolean;
  isSystemUpdateAction?: boolean;
};

export type ComplianceResult = {
  decision: ComplianceDecision;
  findings: ComplianceFinding[];
};

const finding = (
  code: ComplianceCode,
  severity: ComplianceFinding["severity"],
  message: string,
): ComplianceFinding => ({ code, severity, message });

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function isExpired(now: string, expiresAt: string) {
  return new Date(now).getTime() >= new Date(expiresAt).getTime();
}

export function validateCompliance(request: ComplianceRequest): ComplianceResult {
  const findings: ComplianceFinding[] = [];
  const auth = request.authorization;

  if (!auth) {
    findings.push(finding("AUTHORIZATION_REQUIRED", "block", "An active authorization record is required."));
  } else {
    if (!hasText(auth.targetId) || !hasText(auth.scope)) {
      findings.push(finding("SCOPE_REQUIRED", "block", "Authorization must identify a concrete target and scope."));
    }
    if (!hasText(auth.authorizedBy) || !hasText(auth.purpose)) {
      findings.push(finding("AUTHORITY_REQUIRED", "block", "Authorization must identify the approving authority and purpose."));
    }
    if (!hasText(auth.consentAt)) {
      findings.push(finding("CONSENT_REQUIRED", "block", "Visible target consent must be recorded before an active exercise."));
    }
    if (auth.targetId !== request.targetId) {
      findings.push(finding("TARGET_MISMATCH", "block", "The authorization target does not match the requested target."));
    }
    if (isExpired(request.now, auth.expiresAt)) {
      findings.push(finding("AUTHORIZATION_EXPIRED", "block", "The authorization record is no longer active."));
    }
    if (!auth.allowedActions.includes(request.action)) {
      findings.push(finding("ACTION_NOT_ALLOWED", "block", "The requested action is outside the approved action set."));
    }
  }

  if (request.observation && !request.observation.available) {
    findings.push(
      finding(
        "OBSERVATION_UNAVAILABLE",
        "review",
        request.observation.limitation ?? "The requested signal is unavailable and must not be treated as a pass.",
      ),
    );
  }

  if (request.observation?.source === "local" && request.action === "inspect-other-app-private-data") {
    findings.push(finding("SANDBOX_BOUNDARY", "block", "A standard app cannot claim access to another app's private data."));
  }

  if (request.transport) {
    const transport = request.transport;
    if (!transport.connected) {
      findings.push(finding("USB_PERMISSION_REQUIRED", "review", "No target is connected; no transport action may run."));
    } else {
      if (!transport.usbHostSupported) {
        findings.push(finding("USB_HOST_REQUIRED", "block", "The controller device does not report USB host capability."));
      }
      if (!transport.usbPermissionGranted) {
        findings.push(finding("USB_PERMISSION_REQUIRED", "block", "Target-side USB permission has not been granted."));
      }
      if (!transport.cooperativeProtocol) {
        findings.push(finding("USB_PROTOCOL_REQUIRED", "block", "The target has not confirmed the allow-listed cooperative protocol."));
      }
    }
    if (request.action === "adb-training-action" && !transport.adbAuthorized) {
      findings.push(finding("ADB_AUTHORIZATION_REQUIRED", "block", "ADB training actions require owner-approved debugging authorization."));
    }
  }

  if (request.containsExploitPayload) {
    findings.push(finding("PAYLOADS_PROHIBITED", "block", "Training mode does not accept exploit payloads or arbitrary remote code execution."));
  }

  if (request.isSystemUpdateAction) {
    findings.push(finding("SYSTEM_UPDATE_BOUNDARY", "review", "Manufacturer system updates require the platform's device-policy/update path and are not generic app remediation."));
  }

  if (!request.auditContext?.sessionId || !request.auditContext.timestamp) {
    findings.push(finding("AUDIT_CONTEXT_REQUIRED", "block", "Every active exercise must carry a session ID and timestamp."));
  }

  const hasBlock = findings.some((item) => item.severity === "block");
  const hasReview = findings.some((item) => item.severity === "review");

  return {
    decision: hasBlock ? "deny" : hasReview ? "review" : "allow",
    findings,
  };
}
