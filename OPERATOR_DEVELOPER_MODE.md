# Operator developer mode

Droid Commander provides a time-limited developer mode for authorized debugging and analysis. It is an application-level diagnostic session, not a hidden Android administrator mode. Activation requires an authorized operator identity, a bound session, a specific reason, a duration from 1 to 60 minutes, and a fixed diagnostic capability list.

Allowed capabilities are:

- `verbose-logging`
- `collect-diagnostics`
- `export-redacted-audit`
- `open-developer-settings`
- `view-boot-state`
- `view-usb-debug-status`

Every session carries an explicit expiry and must be checked before each capability use. Expired sessions and ungranted capabilities fail closed. The session is audit-only and records that system security settings remain unchanged.

## Android behavior

The native module can read the exposed state of Developer Options, USB debugging, OEM-unlock setting, and whether the build is marked debuggable. These values are read-only. The module can open Android’s Developer Options screen for a visible operator or device-owner action, but it does not toggle any setting.

Droid Commander does not silently enable Developer Options, USB debugging, wireless debugging, OEM unlocking, root, arbitrary shell access, package installation, bootloader unlocking, or flashing. A user must make any Android settings change visibly in the system UI, subject to Android and enterprise policy. The app does not treat `adbEnabled` or `oemUnlockAllowed` as proof of authorization.

Implementation:

- Policy: `lib/operator-developer-mode.ts`
- Native binding: `lib/native-developer-mode.ts`
- Android bridge: `modules/droid-commander-usb-host/android/src/main/java/com/droidcommander/usb/DroidCommanderUsbHostModule.kt`
- JavaScript bridge: `modules/droid-commander-usb-host/src/index.ts`
- Tests: `tests/operator-developer-mode.test.ts`
