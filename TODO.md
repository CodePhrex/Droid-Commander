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
- [x] The Kotlin adapter is staged as a local Expo module with autolinking metadata, JavaScript bridge, Android manifest feature declaration, and base64 bridge boundary for binary packets.
- [x] Android instrumentation coverage is authored for capability gating, allow-list filtering, permission outcomes, bounded send rejection, lifecycle teardown, and opt-in approved-fixture connection/round-trip flows.
- [ ] The adapter is compiled in a custom Expo development build with organization-approved vendor/product/interface identifiers and verified on physical lab devices.

## Bootloader and verified-boot state collection

- [x] The native Android module collects read-only build identity, bootloader version, security patch, verified-boot state, flash-lock state, vbmeta state, verity mode, and exposed OEM-unlock state using fixed property names.
- [x] The normalizer matches only exact organization-approved manufacturer/model/product profiles and reports unknown or unregistered devices as unsupported.
- [x] Reports distinguish locked, unlocked, and unknown bootloader state; green/yellow/orange/red/unknown verified boot; and allowed/disallowed/unknown OEM unlock.
- [x] Collection explicitly exposes no unlock, flashing, recovery-installation, or arbitrary-command capability.
- [x] Boot-state normalization is covered by automated tests and documented in `BOOT_STATE_COLLECTION.md`.
- [ ] Add organization-specific supported-model profiles and verify collected values on physical lab devices.

## Offline recovery readiness and flashing-state monitor

- [x] The `recovery:cli` validates an exact supported device profile, artifact SHA-256, trusted offline signature, owner/data-wipe confirmation, backup prerequisite, enterprise-management status, OEM-unlock eligibility, and verified-boot state.
- [x] The CLI persists a handoff-only monitor and accepts only manual, noted transitions through handoff-ready, operator-confirmed, bootloader, recovery, verification, complete, or failed.
- [x] Validation and monitoring always report unlock, flashing, and recovery installation as unavailable; the CLI does not issue fastboot, adb, unlock, or flash commands.
- [x] Recovery readiness rules and state transitions are covered by automated tests and documented in `RECOVERY_READINESS_CLI.md`.
- [ ] Add organization-specific artifact schemas and physical device/OEM handoff verification.

## USB Link connection-management screen

- [x] A dedicated React Native screen provides USB Host readiness, discovery, device cards, permission state, connection lifecycle, transport event status, and safe-operation boundary messaging.
- [x] The screen calls the local Expo USB Host module for discovery, Android permission requests, bounded connection, close/teardown, and native transport-event updates.
- [x] The bridge degrades safely to an explicit custom-build-required state when the native module is unavailable on web, Expo Go, or another unsupported platform.
- [x] The screen is wired to live native-module events.
- [ ] Connection state persists across app restarts.

## USB packet framing and binary command serialization

- [x] The wire format defines a fixed versioned header with magic, message type, session binding, sequence, timestamp, nonce, exact payload length, and fixed authentication-tag length.
- [x] Binary action serialization is strict and limited to read-posture, read-capabilities, simulate-remediation, and verify-posture; it does not accept arbitrary commands or payloads.
- [x] The codec rejects malformed, truncated, oversized, unknown-version/type, invalid UTF-8, inconsistent-length, and unsupported-action packets.
- [x] Wire-format tests cover round-trips, endian encoding, fixed-field validation, and malformed input.
- [x] The command channel requires an injected 16-byte session authenticator, transmits only typed allow-listed actions over the native bridge, and parses only matching-session action-result frames.
- [x] Command-channel tests cover authenticated send, sequence increments, tag rejection, native send rejection, response parsing, wrong-session rejection, malformed base64/frames, and post-close behavior.
- [ ] Native stream reassembly, authentication-tag verification, and physical transport tests are implemented.

## Break-glass administrator recovery

- [x] A fail-closed break-glass guard requires an organization-signed recovery credential, trusted issuer, validity window, explicit reason, incident ticket, recorded vendor/device authentication issue, and target consent when a target is referenced.
- [x] Recovery capabilities are fixed to authentication diagnostics, confirmation retry, provider refresh, audit export, and controlled session close; they cannot authorize targets, bypass USB permission, override device/vendor authentication, send active commands, install packages, execute code, or bypass a lock screen.
- [x] The guard records every attempt, fails closed on verifier errors, resets failed-attempt state after successful activation, and temporarily locks after repeated failures.
- [x] Break-glass behavior and tests are documented in `BREAK_GLASS_ADMIN.md` and `tests/break-glass-admin.test.ts`.
- [x] Android Keystore-backed signature verification, certificate trust-anchor storage, encrypted credential provisioning, and clear/revoke controls are exposed through the local Expo module.
- [x] Native smoke tests cover malformed trust material, fail-closed verification before trust-anchor provisioning, and idempotent credential clearing.
- [x] A local offline validator enforces signed-claims consistency, trust-anchor validity, maximum lifetime, exact clock window, organization/target/capability binding, local revocation, and one-time consumption.
- [x] Local validator tests cover valid, missing, malformed, tampered, invalid-signature, verifier-outage, not-yet-valid, expired, overlong, untrusted, revoked, replayed, disabled, and target-mismatch credentials.
- [x] The offline `breakglass:cli` can list and snapshot the local ledger, irreversibly revoke credential IDs, verify public-key-signed tokens, and optionally consume a valid token once.
- [x] CLI integration tests cover offline listing, revocation persistence, public-key signature verification, successful consumption, and replay denial.
- [ ] Managed deployment provisioning, user-authenticated Keystore use where required by policy, and a production audit sink are connected.

## Two-party high-security verification and consent

- [x] High-security requests require separate operator verification and client/target consent before execution.
- [x] The client prompt displays the exact operation, target, purpose, risk, operator, expiry, and one-time challenge; the client must type the challenge to confirm.
- [x] Approval is bound to a request digest, expires, is audited, and is consumed before execution so it cannot be replayed.
- [x] Denial, mismatch, verifier failure, expiry, and execution failure are fail-closed and covered by automated tests.
- [x] The reusable prompt and gate are documented in `TWO_PARTY_CONSENT.md`.
- [ ] Connect every high-security native operation to this gate and the production operator/client identity providers.

## Offline CVE and patch catalog

- [x] The application has a catalog service with NVD CVE, CISA KEV, OSV package, and Android Security Bulletin source roles.
- [x] The service normalizes and merges duplicate CVEs, prioritizes known exploitation, maps package fixed versions, and records Android security patch levels and fixed CVEs.
- [x] The last valid snapshot persists through the native AsyncStorage adapter and remains searchable offline after restart.
- [x] Source freshness, stale/unavailable state, cache integrity, and optional signed-feed verification are explicit; invalid or unsigned payloads are not presented as verified.
- [x] Catalog synchronization and offline fallback are covered by automated tests and documented in `VULNERABILITY_CATALOG.md`.
- [ ] Add the freshness/search UI, a managed refresh schedule, signed organization feed mirror, and OEM/SoC bulletins for the deployed device inventory.

## Consent-gated vulnerability proof and remediation

- [x] A detected CVE can map to a reviewed, typed remediation plan containing the exact finding, target, purpose, authorization, allowed step kinds, and two-party execution consent.
- [x] The runner supports only safe proof checks, bounded setting changes, approved application fixes, and OS-managed system-patch handoff; arbitrary exploit payloads and unrestricted commands are rejected.
- [x] Execution consumes the two-party consent before the first step and journals plan, step, failure, completion, and rollback events.
- [x] Completed reversible steps are automatically rolled back in reverse order after a later failure, with explicit `rollback-partial` state when recovery is incomplete.
- [x] Manual rollback requires a separate two-party consent request; system patching remains an Android/vendor confirmation handoff rather than a silent in-app update or downgrade.
- [x] Runner behavior is covered by automated tests and documented in `REMEDIATION_RUNNER.md`.
- [ ] Bind each production `actionId` to reviewed native implementations and persist the remediation journal in the organization audit system.

## Scoped root capability after explicit consent

- [x] The application can detect whether an already-installed root-manager entry point is available and keeps standard devices in an explicit unavailable state.
- [x] Root access requests require an exact target, authorization ID, purpose, allow-listed scopes, two-party consent, and a session duration no longer than fifteen minutes.
- [x] Native root access is requested through the installed root manager; the app does not install a rooting exploit, bypass verified boot, or silently acquire root.
- [x] Root sessions expire, can be closed explicitly, and expose only fixed reviewed operation IDs rather than arbitrary shell commands.
- [x] The native bridge currently implements protected-metadata proof and safely reports unsupported application-specific root operations.
- [x] Root capability behavior is covered by automated tests and documented in `ROOT_CAPABILITY.md`.
- [ ] Add organization-approved root operation adapters, device-owner policy checks, production audit persistence, and physical rooted-device validation.

## Damaged-device recovery without authentication bypass

- [x] The application explicitly refuses to bypass PIN, pattern, fingerprint, face authentication, lock-screen protection, encryption, or Android trust prompts, including on rooted devices.
- [x] The recovery planner detects damaged display, touch, button, and biometric conditions and reports safe owner-mediated alternatives.
- [x] Safe alternatives include owner-entered external input, already-authorized ADB diagnostics after unlock, owner-witnessed backup after unlock, preconfigured enterprise recovery, OEM repair, and official destructive factory reset.
- [x] Every recovery action is bound to the exact target and requires visible owner confirmation; destructive reset requires a separate destructive confirmation.
- [x] Recovery behavior and tests are documented in `DAMAGED_DEVICE_RECOVERY.md` and `tests/damaged-device-recovery.test.ts`.
- [x] `DAMAGED_DEVICE_RECOVERY.md` includes an owner-witnessed transfer checklist and post-unlock destination verification procedure that excludes credentials and preserves the source after failed verification.
- [x] Executable transfer verification rules and tests cover verified, partial, failed, interrupted, mismatched, unreadable, unreachable-destination, unsafe-credential, and source-preservation outcomes.
- [x] The `transfer:cli` operator interface persists non-secret session state, monitors checklist conditions in real time, records manifest updates, runs shared verification, and refuses source release until verified plus owner-confirmed.
- [x] CLI state and command behavior are tested and documented in `TRANSFER_CLI.md`.
- [ ] Add native hardware-health signals, device-specific external-display/input support, and OEM/enterprise integration without weakening authentication boundaries.
