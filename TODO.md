# Droid Commander — delivery outcomes

## Dashboard communicates the non-rooted posture boundary

- [x] The application is a stand-alone Android security-training tool for authorized and licensed personnel.
- [x] The first version targets standard, non-rooted Android devices.
- [x] The main screen makes clear that the prototype uses observable, permission-compliant signals and does not bypass Android sandboxing, enterprise policy, device-owner controls, lock screens, or consent dialogs.
- [x] The interface is professional, optimized for one-handed portrait use, and keeps core assessments and reports available without requiring a backend.

## Local assessment and policy analysis are explicit and evidence-based

- [x] The user can start a local assessment that presents device-security and vulnerability indicators with clear status and limitations.
- [x] Security-policy analysis identifies risky or noncompliant settings without claiming unrestricted inspection of other apps or the operating system.
- [x] Assessment rows distinguish findings that are observable from checks that are unavailable on a standard non-rooted device.

## Active exercises require scope and authorization

- [x] Every active exercise requires an explicit target scope and authorization record.
- [ ] The authorization context is visible in the training flow and associated with the resulting session.
- [x] The prototype provides a safe, educational exercise path without real exploit payloads or arbitrary remote code execution.

## Remediation and verification distinguish action types

- [ ] Guided remediation steps distinguish settings remediation, application fixes, and manufacturer system updates.
- [ ] The user can run before-and-after verification and see whether the simulated observation changed the posture.
- [ ] The UI communicates that manufacturer system updates are not equivalent to an in-app settings change.

## USB and ADB readiness is consent-first and best-effort

- [x] USB controller mode explains the need for compatible OTG/USB host hardware and a cooperative device protocol.
- [ ] Owner-approved ADB is presented as a separate debugging trust path that requires visible consent and target-side approval.
- [ ] Unsupported hardware, missing permission, incompatible protocol, and disconnection are shown as safe, recoverable states.

## Sessions and reports retain audit context

- [ ] Local session history shows findings, scope, authorization context, remediation activity, verification result, timestamp, and assessment limitations.
- [x] The prototype keeps the report experience independent of the backend and identifies any in-memory/demo data boundary.

## Compliance validation gates are executable and documented

- [x] The project contains pure validation rules for authorization, target scope, consent, action allow-lists, observation limitations, USB readiness, ADB approval, audit context, payload prohibition, and system-update boundaries.
- [x] Automated tests cover allow, review, and deny outcomes for authorized security-policy analysis.
- [x] A compliance document defines positive, negative, boundary, USB, ADB, audit, and safe-training test cases with expected evidence.
- [ ] Native device-matrix tests execute the same controls against real non-rooted test handsets and approved lab fixtures.

## Personnel authorization and license verification workflow

- [x] The workflow separates personnel eligibility, exercise authorization, and target consent/capability as independent gates.
- [x] The workflow defines enrollment, signed or organization-verified credential checks, bounded exercise approval, target binding, session admission, in-session enforcement, closeout, renewal, and revocation.
- [x] The workflow specifies fail-closed behavior, offline verification boundaries, suggested record fields, decision outcomes, recovery rules, and implementation acceptance criteria.
- [x] Credential-specific runtime validation is implemented with issuer trust, signature, validity, organization, action-scope, and cached-revocation checks.
- [x] The provider-neutral organization integration contract is documented, including online status, offline fallback, provider outage, and data-minimization behavior.
- [x] Credential runtime tests cover online, offline-cache, revoked, suspended, stale, malformed, untrusted, and provider-failure states.
- [ ] Native signature verification, secure credential storage, and a deploying organization’s provider adapter are implemented.

## Cooperative USB OTG session protocol

- [x] The protocol draft defines controller/target roles, versioned framing, handshake, peer authentication boundary, visible consent, session open, typed message allow-list, action scope, replay protection, clock skew, heartbeat, and teardown behavior.
- [x] The runtime state machine rejects pre-handshake frames, session mismatch, replay or out-of-order frames, unauthenticated frames, oversized frames, stale frames, and actions outside the session allow-list.
- [x] Protocol tests cover establishment, frame acceptance, replay, consent revocation, timeout, disconnect, and unsupported action behavior.
- [ ] Native OTG discovery, bounded transport, platform cryptography, and physical device-matrix tests are implemented.

## Native Android USB Host adapter

- [x] A Kotlin Android `UsbManager` adapter draft enumerates devices, listens for attach/detach, requests explicit user permission, selects an allow-listed interface with bulk IN/OUT endpoints, and reports structured transport events.
- [x] Native I/O is bounded and off the UI thread, with safe handling for permission denial, unsupported interfaces, short writes, read failures, disconnects, and teardown.
- [x] An Expo Modules bridge sketch and Android device-filter integration notes define the custom development-build boundary.
- [ ] The adapter is wired into a custom Expo development build with organization-approved vendor/product/interface identifiers and verified on physical lab devices.
