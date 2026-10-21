# Organization provider scaffold

This is a clearly labeled **non-production placeholder** for the authorized retail and service technician firm identity requested for Droid Commander. It does not claim a legal identity, manufacturer approval, vendor authorization, or access to any device.

## Placeholder profile

The default profile is:

- Display name: `AUTHORIZED RETAIL & SERVICE TECHNICIAN FIRM (PLACEHOLDER)`
- Legal name: `PLACEHOLDER — REPLACE WITH VERIFIED FIRM NAME`
- Organization ID: `org.placeholder.configure-me`
- Region: `UNCONFIGURED`
- Manufacturer approval: `not-claimed`
- Certificate state: `missing`

A deployment must replace these values through a reviewed configuration process. The application must not silently infer or invent the firm’s legal identity.

## Certificate rotation scaffold

`OrganizationProviderScaffold` supports a future organization certificate lifecycle:

1. Begin with a missing certificate and placeholder profile.
2. Mark a candidate fingerprint as `pending-rotation`.
3. Present a visible confirmation showing the organization label, next fingerprint, validity window, and a statement that no manufacturer approval is being claimed.
4. Require a non-empty operator reason and confirmation ID.
5. Validate the organization binding and certificate validity window.
6. Apply the rotation only after external certificate verification succeeds.
7. Track `active`, `expiring`, `expired`, and `revoked` states.

Private keys, keystore passwords, signing credentials, and provider tokens are intentionally not stored in source code or this profile. They belong in protected deployment secrets or a secure device/provider keystore.

## UI confirmation contract

Before a certificate rotation or provider action is committed, the UI should show:

- The exact organization display name.
- The provider ID and certificate fingerprint.
- Valid-from and expiration timestamps.
- Device/model scope and operation risk, when applicable.
- Whether owner consent and second approval are required.
- A clear statement that the profile is not proof of manufacturer approval.
- A visible confirm or cancel action.

The scaffold marks confirmation as explicit and non-destructive. It does not auto-approve actions.

## Native completion callback contract

A native provider adapter may emit structured callbacks with request ID, organization ID, provider ID, lifecycle status, public summary, declared modifications, optional certificate fingerprint, and completion time. Callbacks are accepted only when the organization ID matches the configured profile. The adapter must not send passwords, private keys, biometric data, arbitrary shell text, exploit payloads, or hidden modifications in callback fields.

Supported statuses are `started`, `progress`, `handoff-required`, `completed`, `failed`, and `cancelled`. Every callback should be forwarded to the privileged-action ledger by the eventual production adapter.

## Production completion gates

This scaffold is not a vendor integration. Before production use, the organization must provide verified identity data, a public certificate chain or manufacturer-issued trust anchor, a documented certificate rotation owner, an approved vendor SDK/service contract, exact device/provider scope, a native adapter, UI review, physical-device lab validation, and production audit-sink wiring. Manufacturer approval must be independently verified and must never be represented by this placeholder.
