# Droid Commander — authorization and license verification workflow

## Purpose

This workflow defines how Droid Commander admits authorized personnel, verifies that their license or training credential is current, and limits each exercise to an approved target and action set. It is a product and control draft, not a legal determination that a person is licensed. The deploying organization remains responsible for deciding which credentials are acceptable, who may approve exercises, how long evidence is retained, and which laws or policies apply.

The workflow is fail-closed. A missing, expired, revoked, unverifiable, or out-of-scope record prevents active actions. The app may still show general educational content and safe local diagnostics that do not touch another target.

## Separate the three gates

Droid Commander must not treat these conditions as interchangeable:

1. **Personnel eligibility:** the person has a current license, certification, employment assignment, or training credential accepted by the deploying organization.
2. **Exercise authorization:** an approving authority has authorized a named exercise, target scope, purpose, allowed actions, time window, and operator.
3. **Target consent and capability:** the target owner or designated administrator has visibly consented, and the actual device/transport reports the capability required for the approved action.

All three gates are required before an active exercise. A valid license alone must never authorize access to an arbitrary device.

## Recommended lifecycle

### 1. Organization enrollment

An organization administrator provisions the app for the training program. The administrator configures accepted credential issuers, credential types, approval roles, maximum authorization duration, permitted action categories, target inventory rules, report retention, and revocation behavior.

For an offline-first deployment, the administrator also provisions a signed trust bundle containing the issuer public key or keys, policy version, key identifier, and bundle expiry. Private signing keys never ship in the app and never reside on a field device.

The app displays the active policy version and the last successful trust-bundle verification. An expired trust bundle permits education-only mode but blocks new active authorizations until the policy is refreshed.

### 2. Personnel enrollment

The operator starts enrollment on a controlled device. The app collects the minimum identity data needed by the organization, such as operator identifier, organization identifier, credential identifier, issuer, credential type, validity period, and status. The preferred input is a signed credential or an organization-issued authorization package. Manual entry is allowed only as a pending record for administrator review; it cannot unlock active actions by itself.

The app verifies the credential signature against a trusted issuer key, checks the credential validity window, checks revocation or suspension status when the organization provides an offline revocation list, and confirms that the credential type is permitted for the requested action category. The app records verification time, verifier version, key identifier, and result. It stores a credential reference or cryptographic digest rather than an unnecessary copy of a license document.

If the device is online, the app may request a current status from the organization’s verification service. Online status must not silently override a signed credential whose issuer, subject, scope, or validity does not match. If the device is offline, only a valid signed credential and a non-expired cached revocation state may satisfy the personnel gate.

### 3. Exercise request

Before any active action, the operator creates an exercise request. The request must include a human-readable purpose, target identifier or bounded target inventory, target environment, permitted action categories, planned start and end time, safety constraints, and the operator identity. The request must not contain a generic instruction such as “scan anything connected.”

An approving authority reviews the request and either signs it or records an approval through the organization’s configured service. The authorization record receives a unique ID and a short validity window. The approved action list is deny-by-default and should prefer read-only posture analysis over changes.

A license and an exercise authorization should be checked independently. The report must show both record identifiers so reviewers can distinguish eligibility from approval.

### 4. Target consent and binding

At session start, the app binds the authorization to the actual target. The operator confirms the target identifier, visible consent state, and device capability. For a USB path, the app records host support, connection state, target-side permission, and cooperative protocol confirmation. For an ADB path, the target must have USB debugging enabled and the owner must unlock and approve the debugging trust prompt before any ADB action is considered authorized.

If the target identifier differs from the approved target, the transport disconnects, consent is revoked, or the protocol is not the allow-listed cooperative protocol, the session moves to `blocked` or `incomplete`. The app must not automatically switch to another target or silently retry with broader permissions.

### 5. Session admission

The app evaluates the gates in this order:

1. App integrity and local clock sanity.
2. Personnel credential validity and revocation state.
3. Exercise authorization signature, scope, action allow-list, and time window.
4. Target identity and visible consent.
5. Transport and platform capability.
6. Audit record creation.

Only after all required gates pass does the app issue a short-lived local session capability. This capability is an internal authorization result, not an Android privilege. It is bound to the operator, credential reference, exercise authorization ID, target ID, allowed actions, device/transport, start time, expiry, and a random session nonce.

The app should require step-up confirmation immediately before any action that changes settings, installs an application, triggers a remediation, or requests a platform update. These actions should be separate allow-list entries rather than implied by a read-only assessment.

### 6. In-session enforcement

Every action checks the session capability again. The check must compare the requested action and target against the bound allow-list and expiry. It must also check that the observation source can support the claim. If a regular app cannot observe a policy, the result is `unavailable` or `review`; it is never reported as compliant by inference.

The application must reject exploit payloads, arbitrary remote code execution, lock-screen bypass requests, sandbox escape attempts, credential harvesting, and actions outside the signed exercise scope. A policy-analysis session can show a teaching explanation or a safe simulated result, but it cannot turn the explanation into an operational bypass.

### 7. Closeout and report

The operator closes the session explicitly or the app closes it at expiry, disconnect, revocation, or fatal error. The report records the operator reference, credential verification result, exercise authorization ID, target ID, consent evidence, action list, observations, limitations, remediation category, before-and-after results, transport events, denial/review events, start and end timestamps, and app/policy versions.

The report must identify whether it is complete, incomplete, denied, or review-only. A disconnected or revoked session is not a successful session merely because some checks completed earlier. The organization can export a minimized report for its audit system; raw license documents and unnecessary personal data should not be included.

### 8. Renewal and revocation

A credential, trust bundle, exercise authorization, or target consent may expire independently. The app must display which item caused the block. Renewal creates a new record and does not rewrite historical evidence. Revocation takes precedence over cached approval. If the device cannot obtain current revocation information within the configured offline window, active actions are blocked and the app falls back to education-only mode.

## Suggested record shapes

The following fields are a draft schema and should be finalized with the deploying organization’s privacy and records teams.

### Personnel credential record

```text
credentialId
operatorId
organizationId
issuerId
credentialType
validFrom
validUntil
status: valid | expired | suspended | revoked | unverifiable
verificationMethod: signed-bundle | online-service | pending-manual-review
verifiedAt
revocationSnapshotId
trustKeyId
credentialDigest
```

### Exercise authorization record

```text
authorizationId
operatorId
organizationId
targetIds or targetInventoryId
purpose
allowedActions[]
constraints[]
issuedAt
validFrom
expiresAt
approverId
approvalRole
signature or approval reference
policyVersion
status: active | expired | revoked | rejected
```

### Session record

```text
sessionId
authorizationId
credentialId
targetId
consentAt
transportState
capabilityChecks[]
startedAt
endedAt
endReason: completed | denied | expired | disconnected | revoked | error
findings[]
limitations[]
remediationEvents[]
verificationResults[]
reportIntegrityDigest
```

## Decision matrix

| Condition | Education content | Local non-invasive checks | Active target actions |
|---|---:|---:|---:|
| No personnel credential | Allow | Allow | Deny |
| Credential pending manual review | Allow | Allow | Deny |
| Credential expired, suspended, revoked, or unverifiable | Allow | Allow | Deny |
| Credential valid but no exercise authorization | Allow | Allow | Deny |
| Authorization valid but target not in scope | Allow | Only if not target-bound | Deny |
| Target consent missing or revoked | Allow | Local-only checks | Deny |
| USB host, permission, or protocol requirement missing | Allow | Local-only checks | Deny or mark incomplete |
| ADB RSA approval missing | Allow | Local-only checks | Deny ADB actions |
| Observation unavailable | Allow | Record review/limitation | Deny claims that require the missing signal |
| All gates valid and action allow-listed | Allow | Allow | Allow within the signed scope |

## Failure and recovery rules

The app should use specific failure states rather than a generic “not authorized” message. The minimum codes are `CREDENTIAL_REQUIRED`, `CREDENTIAL_EXPIRED`, `CREDENTIAL_REVOKED`, `CREDENTIAL_UNVERIFIABLE`, `AUTHORIZATION_REQUIRED`, `AUTHORIZATION_EXPIRED`, `AUTHORIZATION_REVOKED`, `TARGET_OUT_OF_SCOPE`, `CONSENT_REQUIRED`, `TARGET_MISMATCH`, `CAPABILITY_UNAVAILABLE`, `ADB_APPROVAL_REQUIRED`, `SESSION_EXPIRED`, and `AUDIT_CONTEXT_REQUIRED`.

Recovery must be narrow. The operator may refresh a trust bundle, obtain a new authorization, renew a credential, reconnect the same approved target, or return to education-only mode. The app must not widen the target scope, add actions, skip consent, reuse an expired record, or fall back from a failed signed verification to unreviewed manual text.

## Acceptance criteria for implementation

The implementation is ready for native integration when a test can prove that a valid credential without an exercise authorization is denied, a valid authorization for target A cannot be used with target B, a revoked or expired record cannot be renewed by editing local fields, a disconnected or consent-revoked target ends the active session, an unavailable observation is reported as a limitation, and every completed or denied session has an auditable end reason. The workflow should also pass the existing validator suite in `tests/compliance.test.ts` and add credential-specific tests before production use.
