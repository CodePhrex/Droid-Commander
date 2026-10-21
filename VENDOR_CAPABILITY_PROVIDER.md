# Vendor-authorized capability providers

Droid Commander can integrate with a manufacturer or vendor service when the vendor supplies a narrowly scoped, signed capability manifest. This is an authorization and orchestration boundary—not a universal backdoor.

## Provider contract

A provider manifest contains:

- A stable provider ID, vendor name, certificate fingerprint, validity window, and signature.
- Exact supported manufacturer, model, optional product, and firmware-prefix constraints.
- A fixed operation list. Each operation declares its capability, risk, reversibility, owner-consent requirement, two-person-approval requirement, and human-readable description.

The application verifies the manifest before registration. An expired, revoked, unsigned, malformed, or adapter-mismatched provider is not registered.

Provider adapters receive a typed `VendorOperationRequest` and a matching operation declaration. They do not receive raw shell strings, arbitrary code, credentials, private keys, or a general-purpose command channel. A provider may return `completed`, `failed`, or `handoff-required`, plus a public summary and declared modifications.

## Admission gates

Every request must pass all of these gates:

1. The provider is registered, trusted, unexpired, and not revoked.
2. The exact target manufacturer/model/product/firmware matches the signed provider scope.
3. The operation is declared by the manifest and is not a prohibited universal capability.
4. The operator supplies a non-empty reason.
5. Owner consent is present when the operation requires it.
6. High-risk and destructive operations include independent second approval bound to the exact provider, target, and operation.
7. A short-lived capability token is present, signature-verified, target-bound, operation-bound, and not previously consumed.
8. Every decision is written to the privileged-action audit sink.

A token nonce is consumed before provider execution. If a provider fails after admission, the request remains consumed and the failure is audited; it cannot be silently retried as if it never ran.

## Supported capability categories

The initial contract supports these categories as provider-declared handoffs or fixed operations:

- `official-owner-recovery`: manufacturer owner-authenticated recovery.
- `signed-lab-simulation`: isolated vendor-supplied training or simulation operation.
- `reviewed-device-operation`: a specifically reviewed, non-arbitrary device operation.
- `oem-unlock-handoff`: a visible official OEM unlock flow with data-loss warning.
- `signed-recovery-handoff`: a model-specific, signed recovery artifact handoff.
- `vendor-service-handoff`: transition to an official service workflow.

These categories do not themselves grant access. The provider manifest, exact target match, user consent, token, and approval gates still apply.

## Hard prohibitions

The registry rejects operation IDs or descriptions that request:

- Arbitrary shell execution.
- Arbitrary code execution or exploit payload delivery.
- Silent lock-screen bypass.
- Silent OEM unlocking.
- Unattended flashing.
- Credential extraction.

A vendor must expose a typed, reviewed operation instead of requesting a universal command primitive. Disclosure or payment status does not weaken these boundaries.

## Revocation and audit

Revoking a provider immediately removes its registered manifest and adapter. Provider manifests should be revoked when a certificate, service endpoint, artifact family, or vendor integration is no longer trusted.

Each allow or deny event records the request ID, provider, declared operation, target ID, decision, public reason, capability category, and completion timestamp. Do not place passwords, PINs, recovery codes, tokens, private keys, biometric data, or raw payloads in audit fields.

## Native integration boundary

A future native vendor adapter may call an official SDK or manufacturer service, but it must preserve this contract. Native code should expose fixed operation IDs and structured parameters only. The UI must show the provider, exact target, operation, risk, consent state, approval state, token expiry, and expected modifications before the final confirmation.

Until an organization-approved vendor adapter is connected, the registry remains a policy and test harness. It does not unlock, flash, bypass authentication, execute arbitrary shell, or install a recovery image on its own.
