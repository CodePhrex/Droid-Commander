# Droid Commander documentation index

This index makes the repository’s instructional, technical, and administrative documentation discoverable. The GitHub repository is currently **public**, so every committed document must be safe for public distribution. No customer records, private keys, signing passwords, provider tokens, device dumps, or confidential vendor agreements belong in this repository.

## Privacy classifications

| Classification | Meaning | Repository treatment |
|---|---|---|
| Public-safe | General architecture, source usage, test contracts, safety boundaries, and release instructions with no secrets or customer data. | May be committed to the public repository. |
| Public administrative | Generic authorization, consent, audit, escalation, and release governance templates that do not identify a real customer or reveal confidential contracts. | May be committed after privacy review. |
| Restricted operational | Real firm identity evidence, manufacturer agreements, device inventories, lab credentials, incident records, customer transfer manifests, internal endpoints, or non-public procedures. | Keep in a private repository, organization wiki, secure drive, or approved document system. Do not commit here. |
| Secret | Private keys, keystore passwords, API tokens, signing credentials, recovery codes, biometric data, PINs, raw device images, or credential-bearing logs. | Never commit. Use GitHub Environment secrets, Android Keystore, or an approved secret manager. |

## Instructional documentation

| Document | Classification | Purpose |
|---|---|---|
| `GITHUB_CODESPACES_EXPO_GO.md` | Public-safe | Codespaces, Expo Go, and custom native-build setup boundary. |
| `PREBUILD_READINESS.md` | Public-safe | Build readiness, blockers, and release gates. |
| `COMPLIANCE_VALIDATION.md` | Public administrative | Authorized security-policy validation cases and evidence expectations. |
| `AUTHORIZATION_LICENSE_WORKFLOW.md` | Public administrative | Personnel, license, scope, consent, and revocation workflow. |
| `AUTHORIZED_TECHNICIAN_PROFILE_INTEGRATION.md` | Public administrative | Verified-firm profile, provider integration, certificate rotation, and release gates. |
| `ORGANIZATION_PROVIDER_SCAFFOLD.md` | Public-safe | Placeholder organization profile and non-production scaffold. |
| `PREFLASH_FAILURE_OVERRIDE_GUIDE.md` | Public administrative | Pre-flash triage and governance boundaries. |
| `DAMAGED_DEVICE_RECOVERY.md` | Public administrative | Owner-witnessed recovery and transfer safety boundaries. |
| `DEVICE_IMAGE_WORKFLOW.md` | Public administrative | Authorized image acquisition and restoration evidence. |

## Technical documentation

| Document | Classification | Purpose |
|---|---|---|
| `NATIVE_USB_HOST_INTEGRATION.md` | Public-safe | Kotlin USB Host module and Expo integration. |
| `USB_OTG_SESSION_PROTOCOL.md` | Public-safe | Cooperative controller/target session protocol. |
| `USB_PACKET_WIRE_FORMAT.md` | Public-safe | Binary framing and typed command schema. |
| `USB_COMMAND_CHANNEL.md` | Public-safe | Authenticated command-channel contract. |
| `USB_HOST_E2E_TESTING.md` | Public-safe | Emulator and approved-fixture native tests. |
| `BOOT_STATE_COLLECTION.md` | Public-safe | Read-only boot and verified-boot collection. |
| `RECOVERY_READINESS_CLI.md` | Public-safe | Offline artifact readiness and manual state monitoring. |
| `ROOT_CAPABILITY.md` | Public-safe | Scoped, consented root-manager boundary. |
| `VENDOR_CAPABILITY_PROVIDER.md` | Public-safe | Signed provider manifests, exact target scope, and hard prohibitions. |
| `VULNERABILITY_CATALOG.md` | Public-safe | Authoritative feeds, freshness, offline cache, and patch-source limits. |
| `REMEDIATION_RUNNER.md` | Public-safe | Consent-gated remediation and rollback journal. |
| `PRIVILEGED_ACTION_LEDGER.md` | Public-safe | Hash-chained disclosure ledger and redaction rules. |
| `BREAK_GLASS_ADMIN.md` | Public administrative | Fail-closed recovery administration and audit boundaries. |
| `ANDROID_KEYSTORE_BREAK_GLASS.md` | Public-safe | Keystore trust-anchor and encrypted credential boundaries. |

## Operator and release documentation

| Document | Classification | Purpose |
|---|---|---|
| `OPERATOR_DEVELOPER_MODE.md` | Public administrative | Time-limited diagnostic mode and explicit settings handoff. |
| `DEVELOPER_OPTIONS_CLI.md` | Public-safe | Transparent developer-options inspection and handoff CLI. |
| `TRANSFER_CLI.md` | Public-safe | Owner-witnessed transfer verification CLI. |
| `BREAK_GLASS_LEDGER_CLI.md` | Public-safe | Offline revocation ledger inspection and disclosure. |
| `PRODUCTION_SIGNING.md` | Public-safe | Protected signing Environment and key-rotation process. |
| `PLAN.md` / `plan.md` | Public-safe | Product implementation and design plan. |
| `TODO.md` | Public-safe | Delivery outcomes and remaining release gates. |

## Privacy review rules

Before committing a document, check that it contains no real customer names, device serials, IMEIs, private endpoints, confidential manufacturer terms, credentials, private keys, raw device images, or unredacted audit data. Replace real values with clearly labeled examples such as `EXAMPLE_ONLY`, `REPLACE_ME`, or `org.example.placeholder`.

The public repository’s branch protection and production Environment approval are repository controls, not substitutes for a private document system. Restricted operational documents should be stored separately and linked only through approved access-controlled systems.
