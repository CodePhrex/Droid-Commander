# Droid Commander — delivery outcomes

## Dashboard communicates the non-rooted posture boundary

- [ ] The application is a stand-alone Android security-training tool for authorized and licensed personnel.
- [ ] The first version targets standard, non-rooted Android devices.
- [ ] The main screen makes clear that the prototype uses observable, permission-compliant signals and does not bypass Android sandboxing, enterprise policy, device-owner controls, lock screens, or consent dialogs.
- [ ] The interface is professional, optimized for one-handed portrait use, and keeps core assessments and reports available without requiring a backend.

## Local assessment and policy analysis are explicit and evidence-based

- [ ] The user can start a local assessment that presents device-security and vulnerability indicators with clear status and limitations.
- [ ] Security-policy analysis identifies risky or noncompliant settings without claiming unrestricted inspection of other apps or the operating system.
- [ ] Assessment rows distinguish findings that are observable from checks that are unavailable on a standard non-rooted device.

## Active exercises require scope and authorization

- [ ] Every active exercise requires an explicit target scope and authorization record.
- [ ] The authorization context is visible in the training flow and associated with the resulting session.
- [ ] The prototype provides a safe, educational exercise path without real exploit payloads or arbitrary remote code execution.

## Remediation and verification distinguish action types

- [ ] Guided remediation steps distinguish settings remediation, application fixes, and manufacturer system updates.
- [ ] The user can run before-and-after verification and see whether the simulated observation changed the posture.
- [ ] The UI communicates that manufacturer system updates are not equivalent to an in-app settings change.

## USB and ADB readiness is consent-first and best-effort

- [ ] USB controller mode explains the need for compatible OTG/USB host hardware and a cooperative device protocol.
- [ ] Owner-approved ADB is presented as a separate debugging trust path that requires visible consent and target-side approval.
- [ ] Unsupported hardware, missing permission, incompatible protocol, and disconnection are shown as safe, recoverable states.

## Sessions and reports retain audit context

- [ ] Local session history shows findings, scope, authorization context, remediation activity, verification result, timestamp, and assessment limitations.
- [ ] The prototype keeps the report experience independent of the backend and identifies any in-memory/demo data boundary.
