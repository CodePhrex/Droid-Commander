# Droid Commander: Developer Onboarding & Security Architecture Guide

## 1. System Philosophy & Security Principles

**Droid Commander** is an offline-first Android security-training and device-service orchestration system designed strictly for authorized, licensed technical personnel operating on explicit target devices.

### Core Architecture Pillars
1. **Air-Gapped Operational Safety**: Operates without external cloud dependencies or internet permissions to ensure local audit containment.
2. **Fail-Closed Gate Enforcement**: Hardware USB interfaces, capability provider plugins, and execution command channels default to a locked state upon any protocol anomaly or missing consent signature.
3. **Two-Party Consent Model**: Every elevated action requires explicit, cryptographically verifiable intersection between technician license capabilities and device owner consent scopes.
4. **Tamper-Evident Privileged Action Ledger**: All operations, authentication attempts, break-glass overrides, and telemetry evaluations are committed to an append-only, SHA-256 hash-chained SQLite ledger.
5. **Emergency Break-Glass Governance**: Superusers can temporarily override operational restrictions using ECDSA P-256 signed break-glass tokens that are cryptographically verified, time-bounded, and non-repudiably logged.

---

## 2. Technical Stack & Architecture

- **Frontend**: Expo / React Native UI with NativeWind styling and React Navigation.
- **Native Android Modules**: Kotlin USB Host OTG module (`droid-commander-usb-host`) and Android Keystore hardware attestation module (`droid-commander-keystore`).
- **Data & Governance**: Drizzle ORM over SQLite storing the Privileged Action Ledger, active technician licenses, and vulnerability telemetry.
- **Security & Authorization**: ECDSA P-256 signature verification, WebCrypto subtle crypto algorithms, and anti-replay nonce tracking.

---

## 3. Developer Workflow & Verification

1. **Prebuild Security Gate**: Execute `prebuild-security-checks.sh` to confirm air-gap configuration and Keystore signing settings.
2. **Automated Unit Testing**: Run `droid-commander-test-suite.test.ts` to validate cryptographic token checks, break-glass session expirations, and SHA-256 hash chain verification.
3. **Ledger Integrity Inspection**: Use `ledger-cli-verifier.ts` to inspect audit trail logs and run simulated session verifications.
