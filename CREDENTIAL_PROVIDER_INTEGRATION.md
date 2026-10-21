# Credential runtime and organization-provider integration

## What is implemented

`lib/credential-runtime.ts` defines a provider-neutral boundary between Droid Commander and an organization’s credential system. The runtime validates the signed credential locally, checks issuer trust, validity windows, organization binding, action scope, and cached revocation state. An optional `OrganizationCredentialProvider` supplies current status when the device is online.

The runtime returns `allow`, `deny`, or `review` through structured findings. The current credential gate is fail-closed: missing, malformed, untrusted, invalidly signed, expired, not-yet-valid, revoked, suspended, out-of-scope, or unverifiable credentials are denied for active actions.

## Provider contract

The organization integration must implement one adapter method:

```ts
interface OrganizationCredentialProvider {
  verifyCredential(input: {
    credentialId: string;
    organizationId: string;
    issuerId: string;
  }): Promise<{
    status: "valid" | "revoked" | "suspended" | "unknown";
    checkedAt: string;
    source: "organization-provider";
    reference?: string;
  }>;
}
```

The provider should authenticate the app using the organization’s approved mechanism. The adapter must return a bounded result, not raw provider records or unrestricted directory data. Network failures must be distinguishable from a positive “valid” status.

The signing verifier is also injected:

```ts
interface CredentialSignatureVerifier {
  verify(input: {
    payload: string;
    signature: string;
    issuerId: string;
    keyId: string;
  }): Promise<boolean>;
}
```

This keeps cryptographic implementation platform-specific. A native build can use a vetted platform or library implementation; the field device must hold only public verification material. The payload must be canonicalized by the issuing system before signing and must be verified against the exact signed bytes.

## Offline behavior

Offline active verification is allowed only when all local conditions pass: the credential signature is valid; the issuer and key are trusted; the credential is within its validity window; the requested action is allow-listed; the organization matches; and the referenced revocation snapshot is present and not expired. If the revocation snapshot is stale or absent, active use is denied.

If an online provider request fails but a fresh local revocation snapshot exists, the runtime records `offline-cache` mode and continues only within the signed credential scope. The report should show that the provider was unavailable. If no fresh snapshot exists, the result is denied with `PROVIDER_UNAVAILABLE`.

A provider response of `unknown` is not equivalent to `valid`. Revoked and suspended states always deny active actions. Cached approval never overrides a newer explicit revocation.

## Integration sequence

1. The organization issues or imports a signed credential and publishes the matching issuer trust anchor.
2. The app receives a bounded credential bundle and verifies its structure and signature locally.
3. The app loads a revocation snapshot with a defined freshness window.
4. When online, the provider adapter checks current status and returns a reference suitable for the audit record.
5. The runtime evaluates the requested action against the credential allow-list.
6. The runtime returns a decision and evidence object to the exercise admission layer.
7. The session report stores identifiers, timestamps, key ID, snapshot ID, provider reference when present, mode, and result. It does not need to store the raw license document.

## Security and privacy requirements

The integration must not collect more identity or credential data than the organization’s policy requires. Store a credential identifier and digest rather than a raw license image when possible. Protect cached credentials and revocation snapshots with platform-secure storage and bind them to the app installation. Do not log signed payloads, signatures, access tokens, or raw provider responses.

The provider must authorize each request for the organization and environment it serves. It must not accept an operator-supplied organization ID as proof of membership. The app must compare the returned organization and issuer context with the signed credential and local policy.

Credential verification is not exercise authorization. After a credential is accepted, the existing compliance validator must still enforce target scope, exercise approval, target consent, transport capability, audit context, and safe-training restrictions.

## Test coverage

`tests/credential-runtime.test.ts` covers signed offline success, missing and malformed credentials, untrusted issuers, invalid signatures, time-window failures, organization and action mismatch, cached revocation and suspension, stale snapshots, online provider evidence, provider-reported revocation, provider outage fallback, and expired trust anchors.

The remaining production work is the native signature verifier, secure local persistence, a real organization-provider adapter, revocation refresh scheduling, clock-tamper handling, and device-matrix validation. Those pieces require a deploying organization’s credential format and provider contract; the module intentionally does not invent either.
