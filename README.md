# Droid Commander

Droid Commander is an Android security-training and device-service orchestration prototype for authorized, licensed personnel. It is offline-first and designed around explicit scope, owner consent, provider authorization, auditable actions, and fail-closed behavior.

## Current status

The repository contains an Expo/React Native application, a generated Android project, a local Kotlin USB Host module, protocol and policy libraries, tests, CI workflows, and operational documentation. Earlier APKs compiled and were signed, but physical testing showed that Command/Assess still displayed demo observations and Sessions displayed sample activity. The current source replaces those paths with actual native host collection, shared persisted host reports and conservative host-to-CVE correlation; see [LIVE_HOST_ASSESSMENT.md](LIVE_HOST_ASSESSMENT.md). A new native build and Galaxy A15 validation are still required for these changes. Compilation is not evidence of complete device-service functionality.

Production signing is protected by the GitHub `production` Environment and requires reviewer approval. End-to-end cooperative USB authentication, configured companion profiles and real manufacturer-provider adapters remain release gates. The USB screen must not present module presence or raw device enumeration as an authenticated command session.

This repository does not contain a manufacturer-approved universal backdoor. It does not implement automated lock-screen bypass, arbitrary shell access, arbitrary code or exploit execution, silent OEM unlocking, unattended flashing, credential extraction, or encryption bypass.

## Start locally

```bash
pnpm install
pnpm check
pnpm test
pnpm lint
pnpm start
```

For Codespaces and Android toolchain setup, see [GITHUB_CODESPACES_EXPO_GO.md](GITHUB_CODESPACES_EXPO_GO.md). For a custom native Android build, see [NATIVE_USB_HOST_INTEGRATION.md](NATIVE_USB_HOST_INTEGRATION.md) and the Android CI workflow in `.github/workflows/android-build.yml`.

## Documentation

Use [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) to find instructional, technical, administrative, security, provider, recovery, USB, build, and release documentation. The index also records the privacy classification of each document.

## Authorized use

Use only with documented authorization, owner consent, approved lab devices, and applicable law and organizational policy. Provider integrations must use the signed, exact-scope contract in [VENDOR_CAPABILITY_PROVIDER.md](VENDOR_CAPABILITY_PROVIDER.md). The firm identity remains a placeholder until independently verified; see [AUTHORIZED_TECHNICIAN_PROFILE_INTEGRATION.md](AUTHORIZED_TECHNICIAN_PROFILE_INTEGRATION.md).

## Reporting security issues

Do not publish credentials, private keys, device data, exploit details, or customer information in issues. Follow [SECURITY.md](SECURITY.md) for responsible disclosure and containment guidance.
