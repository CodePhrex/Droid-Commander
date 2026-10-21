# Authorized retail and service technician profile integration guide

## Purpose and status

This guide defines how an authorized retail and service technician firm can be represented in Droid Commander and how a manufacturer-approved provider integration can be connected later.

The repository currently contains a **non-production placeholder only**. It is not a legal identity, does not prove authorization, does not claim manufacturer approval, and cannot unlock, flash, bypass authentication, execute arbitrary shell, or install recovery images by itself.

Implemented scaffold:

- `lib/organization-provider-scaffold.ts` — profile state, certificate rotation checks, UI confirmation payload, and native callback filtering.
- `lib/vendor-capability-provider.ts` — signed vendor manifest admission, exact target binding, consent/approval/token gates, revocation, and audit events.
- `ORGANIZATION_PROVIDER_SCAFFOLD.md` — concise contract and boundary reference.
- `VENDOR_CAPABILITY_PROVIDER.md` — provider operation and security contract.

## Profile data to configure

Replace the placeholder only through a reviewed configuration change. Do not infer identity from a package name, email address, device, or payment record.

| Field | Required value | Example format |
|---|---|---|
| `organizationId` | Stable organization-controlled slug | `org.example-repair` |
| `displayName` | Customer-facing trading name | `Example Device Repair` |
| `legalName` | Verified legal entity name | `Example Device Repair LLC` |
| `region` | Country/state or service territory | `US-CA` |
| `supportUrl` | Public support or policy URL | `https://support.example.com` |
| `status` | `configured` only after review | `placeholder` → `configured` |
| `manufacturerApproval` | `verified` only with evidence | `not-claimed` → `verified` |
| `certificateState` | Current trust state | `missing`, `active`, `expiring`, `revoked` |

The profile should also have an internal owner, an escalation contact, a privacy contact, and a documented list of supported services. Those operational records belong in the organization’s secure deployment configuration or management system, not in public source code.

## Evidence package before configuration

The firm should assemble an evidence package before replacing the placeholder:

1. Legal identity and registration evidence.
2. Authorized technician or reseller/service agreement.
3. Manufacturer or vendor authorization letter, if the integration relies on one.
4. Public certificate chain, certificate fingerprint, purpose, issuer, validity, and revocation endpoint.
5. Approved provider ID and exact SDK/service version.
6. Supported manufacturer, model, product, firmware, region, and operation matrix.
7. Data-handling and retention policy for device diagnostics and transfer evidence.
8. Named certificate-rotation owner and emergency revocation contact.
9. Physical lab-device test plan and evidence of owner-consent UX review.

A certificate fingerprint is public identification data. Private keys, keystore passwords, client secrets, provider tokens, and signing material must be stored only in protected GitHub Environment secrets, an approved secret manager, or Android Keystore-backed storage.

## Provider manifest and adapter integration

A provider integration consists of three separately reviewed pieces:

- **Manifest:** signed provider identity, certificate fingerprint, validity window, exact target scope, and fixed operation declarations.
- **Adapter:** implementation of the approved vendor SDK or official service API.
- **Trust configuration:** certificate trust anchors, rotation policy, revocation behavior, and deployment environment mapping.

A manifest operation must declare:

- Stable `operationId`.
- Capability category.
- Risk level and whether it is destructive.
- Whether owner consent is required.
- Whether independent second approval is required.
- Whether the operation is reversible.
- Human-readable description and expected modifications.

The adapter must accept structured operation requests only. It must not accept raw shell strings, arbitrary code, arbitrary exploit payloads, credentials, private keys, or a universal command parameter. Manufacturer-specific behavior belongs behind fixed operation IDs and the manufacturer’s documented API or SDK.

The current registry supports official owner recovery, signed lab simulation, reviewed device operations, visible OEM-unlock handoff, signed recovery handoff, and vendor service handoff. These are categories, not permissions. Each request still requires exact target matching, consent, approval, token verification, and audit recording.

## Request and UI confirmation sequence

Before a provider operation begins, the application should show a confirmation sheet containing:

1. Firm display name and organization ID.
2. Provider name and provider ID.
3. Manufacturer, model, product, firmware, and target identifier.
4. Exact operation name, capability category, risk, and reversibility.
5. Expected modifications and whether the vendor will perform a handoff.
6. Owner-consent status and consent record reference.
7. Operator identity and independent approver identity when required.
8. Capability-token expiration and one-time-use warning.
9. Certificate fingerprint and trust status.
10. A prominent statement that the profile does not itself prove manufacturer approval.
11. Confirm and cancel controls; no implicit confirmation from navigation or screen load.

High-risk or destructive operations require two distinct people. The second approval must be bound to the exact provider, target, and operation digest. The operation should be cancellable before the provider begins and should display a final data-loss warning for OEM unlock, reset, flashing, or recovery workflows.

## Certificate lifecycle and rotation runbook

### Enrollment

- Create the organization profile in `placeholder` state.
- Verify the evidence package independently.
- Install the public trust anchor or certificate fingerprint through protected deployment configuration.
- Set the profile to `configured`; do not set `manufacturerApproval` to `verified` until the authorization evidence is independently confirmed.
- Run provider manifest verification and a non-destructive lab handoff.

### Routine rotation

- Create a rotation request with request ID, current fingerprint, next fingerprint, validity window, operator ID, reason, and explicit UI confirmation ID.
- Mark the candidate as `pending-rotation`.
- Verify the next certificate through the documented issuer or manufacturer channel.
- Confirm that the next certificate is not expired, not future-only, and is bound to the intended organization.
- Deploy trust configuration using protected secrets/configuration management.
- Apply the rotation and record the new fingerprint in the audit ledger.
- Run a signed manifest verification and a non-destructive provider health check.
- Retain the previous trust anchor only for the documented overlap period, then revoke it.

### Emergency revocation

- Mark the certificate `revoked` and revoke the provider manifest.
- Disable provider registration and reject all new capability tokens.
- Preserve public audit events and incident references; do not export secrets.
- Notify the manufacturer/provider and the organization security contact.
- Issue a new certificate only after compromise scope and trust-anchor changes are reviewed.

The scaffold intentionally does not implement a cryptographic certificate authority or private-key storage. Production verification must use an approved native or service-side verifier and a managed trust-anchor process.

## Native callback integration

Native code should emit structured callbacks with:

- `requestId`
- `organizationId`
- `providerId`
- Lifecycle status: `started`, `progress`, `handoff-required`, `completed`, `failed`, or `cancelled`.
- Public summary.
- Declared modifications.
- Optional certificate fingerprint.
- Completion timestamp.

The scaffold drops callbacks for a different organization ID. A production adapter must additionally validate provider ID, request state, callback signature or authenticated channel, and target binding before forwarding the event.

Every callback must be written to the privileged-action ledger with the result, implementation or handoff summary, declared modifications, and integrity metadata. Never include passwords, PINs, recovery codes, private keys, biometric data, raw tokens, arbitrary shell text, or hidden modifications.

## Test and release gates

The integration is not production-ready until all of the following are complete:

- Placeholder profile replaced with verified firm identity.
- Manufacturer/vendor authorization independently documented where claimed.
- Public trust anchor and certificate rotation owner configured.
- Provider manifest signature verification tested with valid, expired, revoked, tampered, and wrong-target manifests.
- Adapter tested against exact model/firmware fixtures and unsupported-device fixtures.
- Owner-consent and two-person approval UX reviewed.
- Token expiration, replay, mismatch, revocation, and callback authentication tested.
- Native callbacks connected to the ledger and tested through success, handoff, cancellation, disconnect, timeout, and failure paths.
- No arbitrary shell, arbitrary code, lock-screen bypass, silent OEM unlock, unattended flashing, or credential-extraction operation is present.
- Physical lab validation completed on each approved device family.
- Privacy, security, legal, vendor-contract, and release review completed.

The current automated scaffold tests verify placeholder status, explicit confirmation, validity windows, organization binding, callback filtering, pending rotation, signed manifest admission, exact target binding, consent, two-person approval, token replay prevention, revocation, and prohibited capability rejection. They do not substitute for vendor authorization or physical-device validation.
