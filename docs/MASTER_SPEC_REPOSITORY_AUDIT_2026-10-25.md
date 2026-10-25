# Droid Commander Master Specification — Repository Audit

**Audit baseline:** 2026-10-25  
**Specification source:** Droid Commander — Master Technical Export & Exhaustive Context Transfer, v1.0.0-RELEASE, v2-EXHAUSTIVE  
**Repository baseline:** `main` as inspected for this audit  
**Status:** Preliminary source review; not a hardware certification or release approval

## Purpose and interpretation

This audit maps the supplied master specification to source evidence. A feature described in the specification, shown in a screenshot, or represented by a UI control is not automatically considered implemented or verified. “Code present” means relevant source was found; real-device behavior requires tests on supported hardware.

## Executive summary

The repository contains a meaningful local Android assessment flow, evidence-oriented assessment/report screens, a USB-host native module and UI, vulnerability-catalog integration, session-report history, and a privileged-action ledger. These are useful foundations.

The following items remain unverified or incomplete based on the source inspected: end-to-end two-party authorization, hardware-backed attestation validation, carrier-authorized SIM unlock workflows, production-grade firmware/kernel remediation, complete USB hardware behavior, and successful production signing. The reported splash-screen issue also remains a device-level blocker until a fresh build is tested with logs.

## Capability matrix

| Master-spec capability | Preliminary status | Evidence / gap |
|---|---|---|
| Offline-first local host assessment | Code present; verify on device | Assessment UI and local assessment hook use native host readings. Verify that assessment itself makes no network calls and that missing values remain unknown. |
| Evidence, limitations, and local reports | Code present; verify tests | Assessment and session screens describe native evidence, timestamps, limitations, and local history. Test persistence, export, and privacy boundaries. |
| Wireless and Bluetooth diagnostics | Not verified in this review | Inspect native collectors and UI wiring; do not infer active Wi-Fi/BLE scanning from illustrative screenshots or recommendations. |
| USB host discovery and permission handling | Integration present; hardware verification required | Expo native module and USB screen exist. Test attach/detach, permission denial/grant, reconnect, device filtering, transfer errors, and lifecycle cleanup. |
| USB companion protocol | Scaffold / incomplete configuration indicators | USB screen contains placeholder vendor/product identifiers and an unconfigured-profile flag. Do not describe the companion protocol as production-ready until configured and tested. |
| Vulnerability catalog and correlation | Integration present; source trust needs verification | Catalog screen loads cached data and syncs; correlation statuses distinguish potential matches, reported patched, and insufficient evidence. Verify source signatures, freshness, offline operation, and vendor-specific matching. |
| Privileged-action audit ledger | Integration present; integrity testing required | Session screen reads/verifies a ledger and exports a disclosure. Add tampering, interrupted-write, key-loss, and replay tests. |
| Two-party consent and technician licensing | Not established end-to-end | A scope/author UI or provisioned credential API is not proof of independently verified owner consent plus technician authorization. Enforce consent at the privileged-action boundary, not only in UI. |
| Hardware-backed KeyMint/Keystore attestation | Not verified end-to-end | Verify key security level, attestation chain, root trust, challenge freshness, boot state, revocation/update policy, and unsupported-device behavior. Avoid collecting or exposing persistent device identifiers unless essential and authorized. |
| SIM subsidy-key / PUK recovery | Not established | Treat as carrier-authorized service only. Do not claim that an app can reset carrier contracts or bypass carrier controls without a documented supported API and authorized integration. |
| Firmware flashing / kernel remediation | Not established as operational capability | Any future provider adapter must be explicit, device/vendor-scoped, independently authorized, audited, recoverable, and fail closed. No UI button should imply successful remediation without a verified result. |
| OWASP MASVS alignment | Not certified | Use MASVS as a control checklist and attach test evidence; do not claim compliance from a checklist or scanner run alone. |
| Build and CI reliability | Needs a clean run | Inspect workflow/package-manager/test-command consistency, native prebuild checks, SAST results, signing secrets, and artifact provenance. |
| App startup / splash screen | Open device-level issue | A splash-hide call does not prove JS startup or first-screen rendering. Reproduce using a fresh APK and filtered device logs. |
| Dark Tactical / Modern Professional theme | Separate UI branch work; verify before release | Test both themes across every screen, modal, empty/error/loading state, contrast, and persisted preference. Do not merge based only on a screenshot or a successful compile. |

## Security findings and review actions

### 1. Web message origin validation

The inspected `lib/_core/manus-runtime.ts` was reported to use `window.parent.postMessage(..., "*")`. A wildcard target is not automatically exploitable in every usage, but it removes target-origin restriction. Review the expected parent origin and message contract. Where the expected origin is known, use it explicitly and validate the sender origin and message schema on receipt. If the runtime genuinely requires cross-origin behavior, document the threat model and constrain the accepted origins and payloads.

### 2. CORS allowlisting

The inspected CORS code includes an origin allowlist check before reflecting the origin. Preserve that policy and add regression tests for an approved origin, an unapproved origin, absent Origin headers, and preflight requests. Ensure credentialed responses never combine permissive origins with credentials.

### 3. Offline-first definition

Define “offline-first” as a verifiable operating mode: core host assessment, local reports, consent validation, cryptographic verification, and local audit operations must not require network access. If optional catalog synchronization or API functionality exists, label it separately and prove the core mode still works with connectivity disabled. Do not equate “offline-first” with “the app has no INTERNET permission” unless that is an intentional repository-wide requirement.

### 4. USB lifecycle and permissions

The USB screen includes placeholder companion IDs and an unconfigured profile. Treat device discovery as inventory until the approved profile is configured and a companion device is tested. Android USB attachment filters and `directBootAware` do not eliminate runtime permission prompts or preserve a USB permission grant across reboot by themselves. Test the actual Android lifecycle.

### 5. Hardware attestation

Do not implement the export’s illustrative HMAC formula as a general Android device-ID attestation mechanism. Use Android Keystore/KeyMint key attestation where supported, validate the certificate chain and challenge, check relevant security-level and boot-state claims, and handle unsupported devices as unknown/unverified rather than silently passing them.

### 6. Vulnerability correlation and scores

A CVE record or model match is not proof that a handset is vulnerable. Record the exact evidence used (manufacturer/model, build, patch level, chipset where available, affected-version criteria, source and timestamp). Distinguish potential match, insufficient evidence, and reported patched. Do not present illustrative scores or sample device telemetry as live observations.

## Prioritized implementation plan

### P0 — Build reproducibility and startup
- Establish the repository's intended package manager and make the workflow use its matching lockfile and install command.
- Ensure CI calls scripts that actually exist in `package.json`; verify unit-test and type-check commands.
- Run clean dependency install, lint/type checks, tests, Android native build, and artifact inspection.
- Reproduce the A15 splash issue with a fresh build and capture startup logs.
- Keep debug and signed production builds separate; verify signing configuration and artifact provenance.

### P1 — Security boundaries
- Validate message origins and schemas; add negative tests.
- Add CORS allowlist regression tests.
- Trace all privileged-operation entry points and enforce fail-closed authorization in the service layer.
- Verify USB prebuild checks point to the actual module source path.
- Ensure sensitive identifiers are minimized in UI, logs, reports, and exported files.

### P2 — Device capability validation
- Test USB attach/detach, permission flows, profile matching, transfers, disconnect recovery, and cleanup on physical hardware.
- Test offline assessment and catalog behavior with networking disabled.
- Test ledger integrity under modification, interruption, missing keys, and corrupted storage.
- Test attestation validation with valid, invalid, stale-challenge, unsupported, and untrusted-chain cases.
- Keep simulated, illustrative, unavailable, and live device data visibly distinct.

### P3 — Product and release readiness
- Finish the shared theme system across all screens and states.
- Test accessibility, contrast, persisted theme selection, and small-screen layout.
- Document supported Android versions and hardware limitations.
- Attach reproducible test evidence to release candidates and maintain a release checklist.

## Acceptance criteria for the first stabilization PR

- [ ] Workflow install command and lockfile are aligned with the declared package manager.
- [ ] All invoked package scripts exist and complete successfully.
- [ ] TypeScript/lint/tests and Android build results are recorded with the exact commit SHA.
- [ ] Debug APK artifact exists and installs on the target test device.
- [ ] App reaches the first interactive screen; no persistent splash loop.
- [ ] Startup failure path and native module initialization errors are captured in logs.
- [ ] No claim of production signing or device-level success is made without evidence.

## Limitations of this audit

This document is a preliminary source review of selected repository files and the supplied technical export. It is not a complete line-by-line audit, penetration test, formal MASVS assessment, hardware attestation certification, or real-device validation. All “code present” items require the tests listed above before being described as operational or production-ready.
