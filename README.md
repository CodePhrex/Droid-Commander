# Droid Commander (`v1.0.0-RELEASE`)

## 🛡️ Overview

**Droid Commander** is an **offline-first security training, device service orchestration, and diagnostic prototype platform** designed specifically for licensed technical service professionals and mobile security researchers. 

Operating under a strict **fail-closed zero-trust architecture**, Droid Commander allows technicians to perform hardware diagnostics, host security audits, firmware integrity verifications, and recovery deployments across both **Local Host** devices and **Remote USB OTG Target** devices—without requiring external cloud connectivity or exposing device data.

---

## ⚡ Key Architectural Capabilities

### 1. Dual-Mode Transport Architecture
* **Local Host (`LOCAL_HOST_SELF`):** Direct self-assessment of the technician’s Android host device.
* **Remote USB OTG (`REMOTE_TARGET_USB`):** Direct bulk transport communication over USB OTG host interfaces via `droid-commander-usb-host-module.kt`.

### 2. Headless & Damaged Device Servicing
* **Screenless Control:** Service target devices with shattered, unresponsive, or liquid-damaged OLED screens without requiring touch input.
* **Buttonless Recovery:** Programmatic software reboot macros (`adb reboot bootloader`, `adb reboot recovery`, Fastboot flashing) for devices with missing or stuck power/volume keys.
* **BMS VBUS Power Rail Cut-Off:** Real-time battery voltage/thermal profiling with a manual 5V VBUS rail cut-off switch to prevent short circuits on liquid-damaged boards.

### 3. Owner Consent & Privileged Access Governance
* **Fail-Closed Gateways:** Privileged execution methods, package installations, and elevated commands are locked by default and require explicit ECDSA-signed owner consent tokens (`OWNER_APPROVED_ROOT_ACCESS`).
* **Non-Malicious Diagnostic Testing:** Controlled diagnostic testing generation (`KEYSTORE_CHALLENGE_VECTOR`, `SELINUX_AUDIT_STUB`) to verify security boundaries under owner authorization.

### 4. Passkey Biometric Break-Glass Override
* **1-Tap Biometric Authentication:** Uses native Android `BiometricPrompt` / StrongBox hardware Keystore to activate 15-minute emergency override sessions (`BYPASS_TWO_PARTY_CONSENT`, `FORCE_USB_EXECUTION`).
* **Session Lifetime Enforcement:** Automatic countdown timers with automatic auto-expiration and instant manual revocation.

### 5. Privileged Action Ledger & Forensic Vaults
* **Cryptographic Hash Chain:** Every execution, deployment, or Break-Glass override appends a signed block to an immutable SHA-256 hash chain.
* **Encrypted Telemetry Vault:** Offline AES-256-GCM encrypted archives with HMAC-SHA256 signature binding for compliance reports.

### 6. Online Knowledge Sync & Device Registry
* **Zero-Trust Intelligence Feeds:** Downloads CVE databases, OEM partition manifests, and USB VID/PID registries with ECDSA signature verification.
* **Target Interaction Registry:** Historical tracking, hardware serial indexing, session timelines, and live cybernetic schematic rendering (`DeviceIllustrationCard`).

---

## 🖥️ UI Screen Suite (14 Screens)

1. **Operations Dashboard (`home-screen-v5.tsx`)** - Central dual-mode toggle with live schematic visual cards.
2. **Target Device Registry (`device-history-screen-v2.tsx`)** - Historical device interaction tracking & session logs.
3. **Vulnerability Scanner (`vulnerability-scanner-screen-v2.tsx`)** - CVE risk assessment & remediation playbooks.
4. **Host ADB Shell (`adb-shell-screen-v2.tsx`)** - Terminal emulator with preloaded diagnostic macros.
5. **Firmware Deployment Hub (`firmware-deployment-screen-v2.tsx`)** - Vendor image & OTA flashing interface.
6. **Online Knowledge Sync (`online-knowledge-sync-screen.tsx`)** - Signed CVE & partition hash update engine.
7. **Passkey Break-Glass (`passkey-break-glass-screen.tsx`)** - Biometric emergency scope elevation.
8. **Privileged Action Ledger (`ledger-inspector-screen-v2.tsx`)** - SHA-256 audit chain inspector & tamper verifier.
9. **BMS Power Telemetry (`power-telemetry-screen-v2.tsx`)** - Live voltage, thermal, & VBUS rail cut-off controls.
10. **Reports & Telemetry Vault (`reports-vault-screen-v2.tsx`)** - Encrypted PDF/JSON compliance report exporter.
11. **Two-Party Consent (`consent-licensing-screen-v2.tsx`)** - License verification & scope permission matrix.
12. **Keystore Audit (`keystore-audit-screen-v2.tsx`)** - Hardware StrongBox attestation & Root CA store inspector.
13. **Firmware Integrity (`firmware-integrity-screen-v2.tsx`)** - Android Verified Boot (AVB) digest checker.
14. **Splash & Boot (`splash-screen-v2.tsx`)** - Cybernetic boot animation & hardware readiness check.

---

## 📂 Repository Layout

```text
droid-commander/
├── .gitignore                         # File exclusion rules & sensitive pattern blocklist
├── git-push-exclusion-guard.sh        # Pre-push automated security scanner
├── repository-readme.md               # Master repository architecture guide
│
├── native-core/                       # Native Android Kotlin Drivers
│   ├── droid-commander-usb-host-module.kt
│   ├── fastboot-diagnostic-module.kt
│   └── droid-commander-keystore-attestation.kt
│
├── security-engines/                  # Core Business & Security Logic
│   ├── live-host-assessment-cve-engine.ts
│   ├── root-detection-analyzer.ts
│   ├── owner-root-consent-manager.ts
│   ├── apk-sideload-module.ts
│   ├── diagnostic-payload-generator.ts
│   ├── passkey-auth-provider.ts
│   ├── passkey-emergency-service.ts
│   ├── break-glass-auth-service.ts
│   ├── online-knowledge-sync-engine.ts
│   ├── target-device-registry.ts
│   └── device-graphics-manager.ts
│
├── ui-components/                     # React Native Design System & Screens
│   ├── device-illustration-card.tsx
│   ├── home-screen-v5.tsx
│   ├── device-history-screen-v2.tsx
│   └── ... (12 additional screen components)
│
└── documentation/                     # Comprehensive Operational Documentation
    ├── field-operations-deployment-guide.md
    ├── ui-style-architecture-guide.md
    ├── developer-onboarding-architecture-guide.md
    ├── field-quick-reference-card.md
    ├── field-troubleshooting-guide.md
    ├── hardware-lab-testing-protocol.md
    └── sample-ledger-chain-report.md
```

---

## 📚 Complete Documentation Index

For detailed technical specifications, refer to the individual documentation guides:

* [📱 Field Operations & Deployment Guide](./documentation/field-operations-deployment-guide.md)
* [🎨 Cybernetic UI Style & Architecture Guide](./documentation/ui-style-architecture-guide.md)
* [👨‍💻 Developer Onboarding & Architecture Guide](./documentation/developer-onboarding-architecture-guide.md)
* [⚡ Field Operations Quick Reference Card](./documentation/field-quick-reference-card.md)
* [🔧 Field Troubleshooting & Error Remediation Guide](./documentation/field-troubleshooting-guide.md)
* [🧪 Hardware Lab Testing & OTG Setup Protocol](./documentation/hardware-lab-testing-protocol.md)
* [📜 Sample Privileged Action Ledger Report](./documentation/sample-ledger-chain-report.md)

---

## 🔒 Pre-Push File Exclusion Guard

To ensure sensitive environments, release archives, or private signing keys are never pushed to GitHub:

```bash
# Run the pre-push exclusion guard before committing or pushing
./git-push-exclusion-guard.sh
```

---

*Droid Commander `v1.0.0-RELEASE` — CodePhrex Mobile Security Orchestration Engine*

## Current UI inventory and implementation status (2026-10-25)

The UI specification manual defines **14 numbered screens** and the project owner has confirmed **four additional screens** for the working inventory: USB OTG Hardware Inspector, Cellular & Dual-SIM Diagnostics, Wireless & Network Diagnostics, and Automated Remediation Playbooks. This is an inventory of intended screen entries, not a claim that exactly 18 routes are currently registered or that every described capability is production-ready.

### Current primary navigation

The current `app/(tabs)/_layout.tsx` declares five visible tabs:

1. **Command** — operations dashboard / host assessment entry point.
2. **Assess** — local security assessment.
3. **Sessions** — assessment history and privileged-action ledger disclosure.
4. **Threat Intel** — vulnerability/reference catalog.
5. **USB Link** — USB host discovery and service handoff.

Additional source files may exist outside these primary tabs. A source file's presence does not prove that a screen is reachable from navigation.

### Evidence and capability boundaries

The current source audit found several places where UI data must not be described as live device evidence without a verified collector:

- The vulnerability scanner v3 initializes a sample Galaxy S24 telemetry profile in its screen state. Treat it as illustrative until it is populated from the current host assessment and its provenance is displayed.
- The USB OTG hardware inspector currently passes a hard-coded example USB descriptor and power telemetry into its evaluation engine. This is simulated inspection input, not proof of live USB discovery.
- The SIM diagnostics screen calls a cellular telemetry engine and carrier-token submission method; actual Android/carrier capability and any state-changing effect require separate platform and device verification.
- The wireless diagnostics screen calls a wireless manager; real Wi-Fi/Bluetooth discovery and wireless-debugging control must be verified against Android permissions, OS restrictions, and native implementation.
- The remediation screen calls an engine after a timed UI delay. The delay or success-looking UI is not evidence that a live mitigation or carrier recovery occurred.

Use explicit evidence states such as **verified**, **reported**, **simulated**, **unavailable**, and **unknown**. Unknown or permission-denied readings must not be silently treated as clean. Include source and collection timestamp where available. CVE correlation indicates potential applicability, not proof that an exploit ran or that a vulnerability is present.

### Screen audit and release status

The exhaustive screen audit is in progress. It must distinguish: (1) the specification, (2) active Expo Router routes, (3) legacy/unrouted components, (4) implemented logic, (5) simulated or placeholder behavior, and (6) native/device verification. Several filenames listed in older screen documentation were not found at the exact `app/(tabs)/` paths checked; this is not by itself proof that the feature is absent, because legacy components and replacement implementations may live elsewhere.

No UI redesign or hardware capability is implied by this documentation update. Browser preview, automated tests, Android build/signing, and physical-device/USB validation are separate gates. Do not describe the app as production-ready or hardware-verified unless the relevant checks have actually passed.
