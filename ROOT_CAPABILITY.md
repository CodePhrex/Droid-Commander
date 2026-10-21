# Scoped root capability

Some authorized training applications require capabilities that a standard Android application cannot obtain. Droid Commander now has a root-capability workflow for devices that are already rooted and have an installed root manager. It does not contain a rooting exploit, bootloader bypass, verified-boot bypass, or hidden administrator credential.

## Workflow

1. The app calls the native detector. A standard device returns `unavailable`; a device with an installed root-manager entry point returns `manager-available`.
2. The operator and target user review an exact request containing the target, authorization record, purpose, scopes, and duration.
3. The existing two-party consent gate is consumed before the native provider asks the root manager for a grant.
4. The native provider requests a short-lived session through the installed root-manager entry point. The root manager remains responsible for its own user prompt and denial policy.
5. The TypeScript controller permits only fixed operation IDs whose scopes are present in the grant. It never accepts a shell string or arbitrary command.
6. The session expires after at most fifteen minutes and can be closed explicitly.

The native adapter currently implements one fixed protected-metadata operation, `read-protected-metadata`, as a proof of the boundary. Application-specific root operations must be reviewed and added individually. `approved-setting-change` and `training-app-operation` are scope names, not permission to run arbitrary commands.

## Safety boundary

User consent is necessary but not sufficient. The target must also have a valid exercise authorization, matching target identity, approved scope, and a root manager that grants the session. If any condition fails, Droid Commander remains in the non-rooted or unavailable state. Root access does not authorize exploit execution, package installation, code injection, lock-screen bypass, USB permission bypass, or silent system patching.

Root grants are session-bound, short-lived, and not persisted as reusable credentials. The controller closes expired sessions before another operation. Production deployments should add device-owner policy checks, an organization audit sink, and a native-device test matrix before enabling additional root operation IDs.

## Implementation

- Scope and consent controller: `lib/root-access.ts`
- Native provider binding: `lib/native-root-provider.ts`
- Android root-manager adapter: `modules/droid-commander-usb-host/android/src/main/java/com/droidcommander/usb/RootCapabilityProvider.kt`
- Expo bridge: `modules/droid-commander-usb-host/src/index.ts` and `DroidCommanderUsbHostModule.kt`
- Tests: `tests/root-access.test.ts`
