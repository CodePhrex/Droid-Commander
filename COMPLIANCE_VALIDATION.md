# Droid Commander — compliance validation and test cases

## Purpose and limits

This document defines the minimum validation gate for authorized security-policy analysis in Droid Commander. It is an application-control baseline, not a legal certification and not a substitute for an organization’s policies, rules of engagement, privacy review, or regulatory mapping. A deployment must configure its own authorized roles, retention period, target inventory, and escalation process.

The first release assumes a standard, non-rooted Android device. The validator therefore treats authorization, target scope, consent, observation availability, and audit context as separate controls. A missing signal becomes `review` or `deny`; it never becomes a pass by inference.

Android’s platform model is important to the test oracle. Device-owner and profile-owner capabilities differ from those of a regular app, and the Android API reference states that only a small number of policies can generally be queried directly by ordinary apps [1]. USB debugging also requires the target owner to enable debugging and approve the RSA key after unlocking the device [2]. The validator must not present a USB cable, ADB connection, or local app permission as a sandbox or enterprise-policy bypass.

## Compliance decision model

Every active exercise should produce one of three decisions:

- **Allow:** the request is in scope, authorized, consented, auditable, and uses an available observation or explicitly approved cooperative transport.
- **Review:** the app can continue only as a non-invasive observation or report with a visible limitation. This is used for unavailable signals and manufacturer-update boundaries.
- **Deny:** the app must not start the action. Denial covers missing authorization, missing consent, expired or mismatched scope, disallowed action, missing transport permission, missing ADB approval, sandbox violations, exploit payloads, and missing audit context.

The implementation is in `lib/compliance.ts`. It is intentionally pure so the same rules can run in unit tests, native adapters, and a future report exporter.

## Test cases

| ID | Scenario | Setup | Expected result | Evidence |
|---|---|---|---|---|
| AUTH-01 | Valid read-only assessment | Active authorization; exact target and scope; purpose and approver present; visible consent; action allow-listed; session ID and timestamp present | Allow | Decision plus zero findings |
| AUTH-02 | No authorization | Remove the authorization record | Deny | `AUTHORIZATION_REQUIRED` |
| AUTH-03 | Incomplete scope | Blank target or scope | Deny | `SCOPE_REQUIRED` |
| AUTH-04 | Missing authority | Blank approver or purpose | Deny | `AUTHORITY_REQUIRED` |
| AUTH-05 | Missing visible consent | Blank consent timestamp | Deny | `CONSENT_REQUIRED` |
| AUTH-06 | Expired authorization | Set `now` at or after `expiresAt` | Deny | `AUTHORIZATION_EXPIRED` |
| AUTH-07 | Target mismatch | Authorize handset A; request handset B | Deny | `TARGET_MISMATCH` |
| AUTH-08 | Action outside scope | Allow-list `read-posture`; request `change-policy` | Deny | `ACTION_NOT_ALLOWED` |
| OBS-01 | Observable local signal | Local source, available signal, high or medium confidence | Allow if all authorization controls pass | Source, confidence, timestamp |
| OBS-02 | Unavailable signal | Local source, unavailable signal, limitation recorded | Review, never pass | `OBSERVATION_UNAVAILABLE` and limitation |
| OBS-03 | Sandbox boundary | Standard-app request to inspect another app’s private data | Deny | `SANDBOX_BOUNDARY` |
| OBS-04 | Unsupported privilege assumption | Request depends on device-owner or profile-owner capability that is not present | Review or deny based on action | Capability state and limitation |
| USB-01 | Disconnected target | No target connection | Review; no transport action starts | `USB_PERMISSION_REQUIRED` and connection state |
| USB-02 | No USB host capability | Connected cable but controller reports no host support | Deny | `USB_HOST_REQUIRED` |
| USB-03 | No target permission | Host capable, target connected, permission not granted | Deny | `USB_PERMISSION_REQUIRED` |
| USB-04 | No cooperative protocol | Permission present but target has not confirmed the allow-listed protocol | Deny | `USB_PROTOCOL_REQUIRED` |
| ADB-01 | ADB not approved | USB debugging path present but owner has not approved the target RSA key | Deny | `ADB_AUTHORIZATION_REQUIRED` |
| ADB-02 | ADB approved | Target unlocked, USB debugging enabled, RSA approval recorded, action allow-listed | Allow for the restricted training action | Approval event and session ID |
| AUD-01 | Missing session context | No session ID or timestamp | Deny | `AUDIT_CONTEXT_REQUIRED` |
| AUD-02 | Complete audit context | Session, scope, approver, purpose, consent, action, result, limitation, and timestamp recorded | Allow or Review according to observation | Exportable report fields |
| SAFE-01 | Exploit payload supplied | Any payload or arbitrary execution request | Deny | `PAYLOADS_PROHIBITED` |
| SAFE-02 | Manufacturer update action | Request to install or control a system update from the generic app path | Review; route to platform/device-policy guidance | `SYSTEM_UPDATE_BOUNDARY` |
| SAFE-03 | Disconnect during action | Target disconnects after an allowed USB start | Stop transport, preserve partial audit event, require re-authorization before restart | Disconnect event, no silent retry |
| SAFE-04 | Consent revoked | Owner revokes USB debugging or cooperative permission | Stop transport and mark session incomplete | Revocation event and incomplete result |

## Validation evidence requirements

A passing report should include the validator version, test-case IDs executed, decision, target identifier, authorization record identifier, scope, approver, purpose, consent timestamp, action allow-list entry, observation source, confidence, limitations, transport state when applicable, session ID, start/end timestamps, remediation category, before/after result, and any denial or review codes. Sensitive data should be minimized and retained only for the configured period.

A reviewer should be able to answer four questions from the report: who approved the activity, which target and actions were in scope, what the app actually observed, and what it could not verify. A report that cannot answer those questions is not compliant with this application baseline.

## Release gates

The unit suite must pass before a build is accepted. Native integration must add device-matrix tests for at least one supported non-rooted handset, one unsupported USB-host handset, one owner-consented ADB path, one denied RSA-consent path, and one disconnection path. Any native adapter that returns privileged-looking data without a capability and source record fails review.

No test may use a production device or a target outside the approved lab inventory. Destructive remediation, policy changes, package installation, system updates, and network logging require a separate approved fixture and an explicit action allow-list entry. The test harness must use synthetic identifiers and non-sensitive fixture data.

## References

[1]: https://developer.android.com/reference/android/app/admin/DevicePolicyManager "Android DevicePolicyManager API reference"
[2]: https://developer.android.com/tools/adb "Android Debug Bridge documentation"
[3]: https://mas.owasp.org/MASVS/ "OWASP Mobile Application Security Verification Standard"
[4]: https://mas.owasp.org/MASVS/07-MASVS-AUTH/ "OWASP MASVS Authentication and Authorization"
