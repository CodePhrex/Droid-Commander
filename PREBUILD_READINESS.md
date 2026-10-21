# Droid Commander pre-build readiness audit

Audit date: 2026-10-20

## Current conclusion

**Not ready for a production or lab release build yet.** The project has a broad, tested policy and UI prototype, but the remaining work is concentrated in native compilation, organization-specific configuration, physical-device validation, persistence wiring, and provider integration. A development build can be attempted after the custom Android toolchain is available; it should not be described as production-ready until the open gates below are closed.

## Delivered foundation

- Offline-first React Native/Expo dashboard with command center, assessments, sessions, threat intelligence, USB Link, and operator-oriented visual system.
- Observable non-rooted assessment boundary with compliance validation and safe remediation/rollback planning.
- Organization authorization, credential validation, break-glass governance, two-party consent, developer-mode controls, and append-only privileged-action disclosure ledger.
- Cooperative USB protocol, binary wire format, command channel, Kotlin UsbManager adapter draft, local Expo module, and dashboard transport screen.
- Read-only boot/verified-boot collection, exact supported-model matching, recovery-readiness handoff monitor, and damaged-device owner-witnessed transfer planning.
- Offline CVE, CISA KEV, OSV, and Android bulletin catalog with AsyncStorage cache and Threat Intel screen.
- Native dashboard ledger storage using AsyncStorage plus Expo Crypto SHA-256 chain verification and user disclosure export.
- Authorized image-workflow policy layer for provider handoff, encrypted destination checks, chunk manifests, SHA-256 verification, and restoration evidence.

## Blocking release gates

### 1. Custom Android build and native compilation

- Compile the generated Android project with the local Expo USB Host module and Expo Crypto.
- Resolve any Kotlin/Gradle/API-level issues on the actual supported Expo SDK 57 toolchain.
- Build an installable debug artifact and then a signed release candidate through the organization’s keystore process.
- Confirm Android manifest, USB Host feature, package identity, app label, launcher icon, and versioning.

### 2. Organization configuration

- Replace placeholder USB vendor/product/interface IDs with reviewed companion-device identifiers.
- Load organization-approved device-model profiles for boot-state and recovery readiness.
- Configure the signed credential issuer, trust anchors, revocation provider, operator identity source, and licensing/provider adapter.
- Configure the production audit sink and retention policy.
- Define supported Android API levels, OEM families, enterprise/device-owner modes, and data-retention rules.

### 3. Physical device validation

- Run the Android instrumentation suite on supported non-rooted handsets.
- Test USB attach/detach, permission grant/deny, incompatible interfaces, short writes, read errors, disconnection, and approved companion round trips.
- Test boot-state values across locked, unlocked, verified, unverified, and unknown lab states.
- Test AsyncStorage durability, Expo Crypto hashing, share-sheet export, rotation/restart behavior, low-storage behavior, and app upgrade migration.
- Validate damaged-device flows using owner-entered external input without capturing credentials.

### 4. Incomplete product workflows

- Persist authorization records and associate them with resulting sessions instead of relying on representative/static UI data.
- Complete guided remediation categories, before/after verification, and manufacturer-update handoff messaging.
- Complete owner-approved ADB presentation and safe recoverable USB states.
- Connect native privileged-operation callbacks to the mobile ledger.
- Persist USB connection state and audit events across app restarts.
- Add screenshot-based visual regression checks for phone and tablet layouts.

### 5. Image acquisition and restoration

- Select and contract an organization-approved acquisition provider. Droid Commander must not invent a raw-image or encryption-bypass engine.
- Implement the native provider adapter for only approved capabilities (`user-data-export`, `full-block-image-read`, `restore-provider`).
- Decide whether full-device images are encrypted at rest by the provider, how keys are managed outside the app, and how images are securely destroyed.
- Persist signed image manifests and append acquisition, verification, handoff, restore-request, and restore-result events to the ledger.
- Validate chunk hashing, interrupted acquisition, resume behavior, destination capacity, manifest mismatch, restore rollback, and source preservation on physical lab fixtures.
- Add a separate destructive-restore confirmation requiring owner confirmation and target re-binding.

## Recommended build sequence

1. Freeze the organization configuration and supported-device matrix.
2. Connect credential/provider/audit integrations.
3. Finish authorization-to-session persistence and native ledger callbacks.
4. Compile the custom Android development build.
5. Run instrumentation tests on physical fixtures.
6. Close USB, boot-state, damaged-device, ledger, and image-provider defects.
7. Run privacy/security review and verify all disclosure/redaction requirements.
8. Produce a signed release candidate and perform a clean-install, upgrade, offline, and recovery test pass.

## Explicit non-goals

The release must not include a hidden administrator account, lock-screen bypass, decryption bypass, silent ADB/OEM-unlock enablement, arbitrary shell execution, unreviewed exploit payloads, unrestricted partition flashing, or raw imaging of a locked device. Owner consent and an authorization record are necessary but do not override Android, OEM, enterprise, encryption, or provider boundaries.
