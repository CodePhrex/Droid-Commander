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
- [x] `PREFLASH_FAILURE_OVERRIDE_GUIDE.md` defines failure triage, evidence retention, escalation, narrowly scoped governance exceptions, non-overrideable safety failures, and monitor closeout requirements.
- [ ] Add organization-specific artifact schemas and physical device/OEM handoff verification.

## USB Link connection-management screen

- [x] A dedicated React Native screen provides USB Host readiness, discovery, device cards, permission state, connection lifecycle, transport event status, and safe-operation boundary messaging.
- [x] The screen calls the local Expo USB Host module for discovery, Android permission requests, bounded connection, close/teardown, and native transport-event updates.
- [x] The bridge degrades safely to an explicit custom-build-required state when the native module is unavailable on web, Expo Go, or another unsupported platform.
- [x] The screen is wired to live native-module events.
- [ ] Connection state persists across app restarts.

## GUI quality and operator usability

- [x] All screens share a responsive centered content frame capped for tablet/web readability while preserving full-width phone layouts.
- [x] The global tab bar has compact labels, consistent active-state styling, keyboard dismissal, and touch-friendly item spacing.
- [x] Primary workflows use larger touch targets and accessible labels/states for assessment, session, catalog, command-center, and USB actions.
- [x] GUI checks and lint remain clean after the visual consistency pass.
- [ ] Add screenshot-based visual regression coverage for key states on representative phone and tablet sizes.

## GUI privileged-action disclosure export

- [x] The Sessions dashboard exposes a visible privileged-action ledger export control with progress, accessible labeling, and no data mutation.
- [x] The dashboard reads a React Native-safe AsyncStorage ledger, verifies its SHA-256 hash chain on load, displays entry count/integrity state, and shares a readable Markdown ledger disclosure through the native system share sheet.
- [x] The mobile ledger uses the same canonical field ordering, sequence, previous-hash, event-hash, validation, secret-rejection, and invalid-append refusal rules as the CLI ledger.
- [x] The export explicitly excludes credentials, private keys, PINs, biometric data, arbitrary commands, and hidden device changes; invalid chains are visibly marked `INVALID`.
- [x] Mobile storage and disclosure formatter behavior are covered by automated tests; native device smoke validation remains required for AsyncStorage and Expo Crypto.

## Operator developer mode and diagnostic oversight

- [x] An application-level operator developer session requires authorization, a bound session, a specific reason, a 1–60 minute duration, and a fixed diagnostic capability allow-list.
- [x] Sessions expire automatically, enforce capability checks before each use, and explicitly record that Android security settings remain unchanged.
- [x] The native module exposes read-only Developer Options, USB-debugging, OEM-unlock, and debuggable-build state, plus a visible handoff to Android Developer Options.
- [x] The feature does not silently enable Developer Options, USB debugging, wireless debugging, OEM unlock, root, arbitrary shell, package installation, bootloader unlock, or flashing.
- [x] Policy behavior is covered by automated tests and documented in `OPERATOR_DEVELOPER_MODE.md`.
- [x] `developer:cli` inspects imported debug state, toggles Droid Commander’s own local diagnostic session, and creates explicit non-mutating Android Developer Options handoff requests with operator/device/reason/confirmation records.
- [x] CLI integration tests cover inspection, local activation/deactivation, and system-toggle request transparency.
- [ ] Add organization-specific operator identity provisioning and production audit-sink integration.

## Privileged-action disclosure ledger

- [x] An append-only JSONL ledger records privileged-action requests, approvals, denials, starts, completions, failures, cancellations, handoffs, and explicit no-change outcomes.
- [x] Each event records operator, organization, target, action, result, summary, implementation/handoff description, modifications, consent/ticket references, timestamp, sequence, previous hash, and event hash.
- [x] Appends verify the prior hash chain and refuse to extend a corrupted ledger; exports support user disclosure in JSON and JSONL formats.
- [x] The ledger rejects passwords, PINs, private keys, recovery codes, tokens, secrets, arbitrary shell commands, and private payloads.
- [x] Ledger tests cover chained events, disclosure exports, tamper detection, append refusal, denied/failed retention, and secret rejection; documentation is in `PRIVILEGED_ACTION_LEDGER.md`.
- [x] `privileged:ledger report` formats the verified ledger into a human-readable Markdown disclosure or an explicit PDF conversion, including integrity status, event summaries, implementation/handoff descriptions, modifications, and hash-chain evidence.
- [x] Invalid-chain reports are visibly marked `INVALID` and are never presented as complete disclosures.
- [ ] Connect all native privileged-operation completion callbacks and the production audit sink to this ledger.

## Authorized device-image acquisition and restoration evidence

- [x] The image workflow binds acquisition to authorization, operator, organization, exact target, owner consent, known encryption state, encrypted destination, capacity, and explicit provider capabilities.
- [x] Full-device image requests require a reviewed provider capability and are distinguished from ordinary Android backup or owner file transfer.
- [x] Locked/encrypted targets, unknown encryption state, missing consent, insufficient capacity, unencrypted destinations, missing provider capabilities, and missing restore providers are blocked or routed to an explicit handoff; no authentication or encryption bypass is implemented.
- [x] Provider manifests require sequential chunks, exact offsets and lengths, total-size agreement, encrypted-at-rest storage, and valid SHA-256 digests before restoration evidence is accepted.
- [x] Image policy and manifest tests are covered in `tests/device-image-workflow.test.ts`, with boundaries documented in `DEVICE_IMAGE_WORKFLOW.md`.
- [ ] Connect an organization-approved acquisition/restore provider, secure manifest persistence, interrupted-transfer resume, destructive-restore confirmation, and native image callbacks to the privileged ledger.

## Pre-build readiness audit

- [x] `PREBUILD_READINESS.md` records delivered foundations, explicit build blockers, physical-device validation gates, image-provider requirements, recommended build order, and prohibited release capabilities.
- [ ] Custom Android compilation, organization configuration, physical-device matrix, provider integrations, complete session persistence, production audit sink, and release security/privacy review are complete.

## Protected production Android signing

- [x] Release Gradle builds fail closed unless the keystore path, keystore password, key alias, and key password are present.
- [x] The workflow signs APK and AAB outputs only from the protected GitHub `production` Environment, materializes the keystore ephemerally with restrictive permissions, and never commits or prints signing material.
- [x] Production runs are limited to `v*` tags or manual dispatch, require the debug job to pass, use the GitHub run number for version codes, generate SHA-256 checksums, and upload signed outputs as one artifact.
- [x] Setup and rotation guidance is documented in `PRODUCTION_SIGNING.md`.
- [ ] Configure actual production secrets, required reviewers, Play App Signing/upload-key policy, and release approval rules in GitHub.

## Organization identity and provider scaffold

- [x] A clearly labeled non-production placeholder profile exists for the authorized retail and service technician firm; it makes no legal-identity or manufacturer-approval claim.
- [x] Certificate lifecycle states, explicit UI confirmation payloads, validity-window checks, organization binding, pending rotation, and native structured completion callbacks are scaffolded.
- [x] Placeholder-profile, rotation, confirmation, validity, organization-binding, callback-filtering, and pending-state tests are implemented.
- [x] Production secrets and private key material remain outside source code and documentation.
- [ ] Replace the placeholder only after verified firm identity, manufacturer/provider authorization, trust-anchor distribution, native adapter implementation, UI review, and physical lab validation are complete.

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

## Vendor-authorized capability providers

- [x] A provider registry validates signed, time-bounded manifests and adapter identity before registration.
- [x] Requests are bound to exact target model/firmware, declared operation, operator reason, owner consent, independent second approval for high-risk work, and a short-lived single-use capability token.
- [x] Provider revocation, token replay prevention, manifest/target/approval mismatch checks, fail-closed provider execution, and audit events are implemented and tested.
- [x] Universal arbitrary shell, arbitrary code/exploit payload, silent lock-screen bypass, silent OEM unlock, unattended flashing, and credential-extraction declarations are rejected by policy.
- [x] The contract and native-integration boundary are documented in `VENDOR_CAPABILITY_PROVIDER.md`.
- [ ] Connect a real manufacturer/provider SDK, certificate trust-anchor rotation, UI confirmation surface, and native completion callbacks after vendor authorization and lab validation.
