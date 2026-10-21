# Native Android USB Host integration draft

## Current project state

Droid Commander is currently an Expo-managed project without a checked-in Android directory. The native implementation is therefore staged under `native/android/` as an integration draft. It requires a development build or prebuild/custom Expo module before it can run on a physical Android device; Expo Go cannot load this custom native module.

## Files

- `native/android/src/main/java/com/droidcommander/usb/UsbHostAdapter.kt` — Android `UsbManager` adapter.
- `native/android/src/main/java/com/droidcommander/usb/DroidCommanderUsbHostModule.kt` — thin Expo Modules bridge sketch.
- `native/android/src/main/res/xml/usb_device_filter.xml` — narrow attachment-filter placeholder.

## Adapter behavior

The adapter uses the Android USB Host API to enumerate `UsbManager.deviceList`, listen for `USB_DEVICE_ATTACHED` and `USB_DEVICE_DETACHED`, request user permission through an immutable `PendingIntent`, and connect only to a device that matches the configured vendor/product allow-list and an interface with the configured class/subclass/protocol plus bulk IN and OUT endpoints.

The permission dialog result is checked before opening the device. All bulk transfers run on a single background executor rather than the UI thread. Payloads are bounded by `maxPayloadBytes`; short writes, negative reads, permission failures, missing interfaces, and disconnects emit structured events and close the connection. Closing releases the claimed interface, closes the `UsbDeviceConnection`, cancels the reader, unregisters the receiver, and shuts down the executor.

The adapter deliberately does not:

- enumerate or connect to arbitrary devices without an allow-list;
- use ADB or any shell/command channel;
- infer target consent from USB permission;
- parse or authorize Droid Commander protocol actions;
- bypass Android sandbox, lock-screen, enterprise, or device-owner boundaries;
- log raw credentials, private app data, or authentication secrets.

The shared `lib/usb-session.ts` state machine remains responsible for session identity, handshake, framing, authentication, replay protection, action scope, consent, audit context, and safe teardown. The bridge should forward native events to that state machine instead of treating `connected` as `established`.

## Manifest and filter integration

The app should declare USB host support and a narrow device attachment filter in the custom Android project. The filter must be populated with the organization-approved companion vendor/product identifiers; the placeholder `0/0` values in this draft are not production values. A runtime enumeration path is still required because already-connected devices do not necessarily arrive through the attachment activity flow.

For an explicitly enumerated device, the app must call `UsbManager.requestPermission()` and wait for `EXTRA_PERMISSION_GRANTED == true` before opening the device. A denied dialog must end in a recoverable `permission-denied` state, not a retry loop.

## Security and privacy review gates

Before enabling a production device profile, review the companion interface class and endpoint policy, exact vendor/product identifiers, maximum frame size, read/write timeout, receiver export behavior, Android target SDK behavior, and secure storage for the session authorization digest. Test with synthetic IDs and a cooperative lab companion only.

A native integration is not complete until the device matrix covers: no USB Host feature, unsupported vendor/product, wrong interface class, missing bulk endpoint, permission denial, allowed connection, malformed/oversized transport payload, short write, read timeout, physical disconnect, process pause/resume, and explicit consent revocation.

## Official references

- [Android USB Host overview](https://developer.android.com/develop/connectivity/usb/host)
- [UsbManager API](https://developer.android.com/reference/android/hardware/usb/UsbManager)
- [UsbDeviceConnection API](https://developer.android.com/reference/android/hardware/usb/UsbDeviceConnection)
