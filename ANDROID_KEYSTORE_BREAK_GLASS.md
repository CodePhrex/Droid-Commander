# Android Keystore break-glass integration

The native module now provides the cryptographic and at-rest storage boundary for the break-glass policy guard.

## Native operations

`BreakGlassKeystoreVerifier` uses the Android Keystore provider for two purposes. Organization trust certificates are stored as Keystore certificate entries and used to verify `SHA256withECDSA` or `SHA256withRSA` signatures. A Keystore-generated AES-GCM key encrypts the verified credential envelope before it is stored in app-private preferences.

The Expo bridge exposes these operations:

- `provisionBreakGlassTrustAnchor(issuerId, keyId, certificateBase64)`
- `verifyBreakGlassSignature(payload, signatureBase64, issuerId, keyId)`
- `provisionBreakGlassCredential(credentialJson)`
- `hasProvisionedBreakGlassCredential()`
- `clearProvisionedBreakGlassCredential()`

Credential provisioning verifies the `break-glass-admin` type and signature before writing the encrypted envelope. A malformed credential, unknown trust anchor, unsupported key type, invalid signature, or Keystore failure returns false and leaves no provisioned credential.

## Provisioning boundary

Trust-anchor installation is a deployment operation and must be performed through the organization’s managed provisioning path, such as an MDM-controlled build, signed configuration package, or an operator workflow protected by the organization’s existing enrollment controls. The app must not accept a certificate from an arbitrary USB peer, target device, or untrusted network response.

The native verifier proves only that a signed recovery credential was issued by a provisioned organization key. The TypeScript break-glass guard still evaluates expiry, organization, capability, reason, ticket, target consent, authentication issue, rate limits, and audit state. Keystore verification never authorizes a target, bypasses Android USB permission, widens scope, or enables active commands.

## Tests and current build boundary

Instrumentation smoke tests are in `modules/droid-commander-usb-host/android/src/androidTest/java/com/droidcommander/usb/BreakGlassKeystoreVerifierInstrumentedTest.kt`. They cover malformed trust material, fail-closed verification before trust-anchor provisioning, and idempotent encrypted-credential clearing.

The current Sandbox cannot compile or execute Android instrumentation because the Android SDK is unavailable. A custom development build on an approved lab device is required to validate certificate provisioning, Keystore persistence across process restarts, and organization-managed deployment.
