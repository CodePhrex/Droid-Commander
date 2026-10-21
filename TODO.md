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
- [ ] Credential-specific runtime validation and native organization-provider integration are implemented and covered by tests.
