# Break-glass administrator recovery

Droid Commander does not ship a universal administrator password, hidden credential, or vendor-authentication bypass. The recovery path is a controlled break-glass capability for diagnosing an unexpected vendor or device authentication-confirmation failure.

## Activation requirements

Every activation requires all of the following:

- An organization-signed credential with `credentialType: break-glass-admin`.
- A trusted issuer and non-expired signing key.
- A valid credential window and matching organization.
- A capability in the fixed recovery allow-list.
- A specific reason of at least 12 characters.
- An incident or change ticket reference.
- A recorded vendor or device authentication issue.
- Visible target consent when a target is referenced.
- Successful signature verification.

The credential is provisioned by the deploying organization. No private key or reusable secret is embedded in the app.

## Allowed recovery capabilities

The guard supports only:

- `inspect-auth-state`
- `retry-auth-confirmation`
- `refresh-provider-status`
- `export-audit`
- `close-session`

These capabilities can inspect or recover the authentication workflow. They cannot authorize a target, skip Android USB permission, override vendor/device authentication, widen scope, establish a session without consent, send active commands, install packages, execute code, or bypass a lock screen.

## Fail-closed controls

The guard denies disabled accounts, missing or malformed credentials, wrong organizations, untrusted or expired issuers, expired credentials, invalid signatures, verifier outages, missing reasons, missing tickets, missing consent, and attempts without an actual authentication issue. Three failed attempts trigger a temporary lockout. Every attempt is recorded with the decision, codes, operator reference when available, capability, target reference, and whether a reason/ticket was supplied.

A successful break-glass result includes `targetAuthorizationUnchanged: true`. The normal personnel, exercise-authorization, target-consent, and capability gates still apply after recovery. Recovery is not a substitute for session admission.

## Implementation

- Guard: `lib/break-glass-admin.ts`
- Tests: `tests/break-glass-admin.test.ts`

## Local offline credential validation

The local validator in `lib/local-break-glass-credential.ts` is the offline credential boundary. It requires a locally trusted issuer and signing key, verifies that the signed claims exactly match the presented credential, enforces organization and target binding, checks the fixed capability allow-list, rejects disabled accounts, and applies a maximum credential lifetime. A credential is valid only when the local clock is inside its signed `validFrom`/`validUntil` window and the issuer trust anchor is also current.

The local ledger stores revocation and one-time-consumption identifiers. `validateAndConsume` consumes a credential only after every validation and signature check succeeds; failed, expired, malformed, revoked, or verifier-unavailable attempts do not consume it. The ledger can be serialized as non-secret metadata for offline persistence and restored on startup. It contains no private keys, passwords, PINs, recovery codes, or reusable universal secret.

Offline operation remains bounded: a valid local credential can activate only its signed, target-bound recovery capability. It cannot authorize a new target, bypass Android authentication, install code, execute arbitrary commands, or widen the approved scope. Expired, replayed, revoked, or unverifiable credentials fail closed.

Before deployment, the organization must connect the signature verifier to Android Keystore-backed verification or another reviewed platform crypto boundary, define the accepted issuer, and configure the audit sink. Until then, this module is a provider-neutral policy guard and not a production credential store.
