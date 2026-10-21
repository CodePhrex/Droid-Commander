# Native Android USB Host end-to-end tests

The instrumentation suite lives at:

`modules/droid-commander-usb-host/android/src/androidTest/java/com/droidcommander/usb/UsbHostAdapterInstrumentedTest.kt`

## Coverage

The suite verifies:

- USB Host capability gating
- Receiver registration and discovery events
- Vendor/product/interface allow-list rejection
- Permission requests for unknown devices
- Connection attempts without permission
- Send-before-connect rejection
- Empty and oversized payload rejection before I/O
- Idempotent close and receiver teardown
- Physical permission-outcome events
- Physical connection only after permission
- Bounded heartbeat-sized round-trip through an approved cooperative echo fixture

The physical tests are opt-in. They do not attempt to infer authorization from USB attachment and do not issue shell commands, arbitrary code, exploit payloads, or package-install requests.

## Run without a physical fixture

On an Android device or emulator with USB Host support:

```bash
./gradlew :expo-droid-commander-usb-host:connectedDebugAndroidTest
```

The first five tests use a synthetic vendor/product pair (`0x7fff/0x7fff`) and should run without an attached fixture. Devices without USB Host support are skipped rather than treated as a pass.

## Run with an approved cooperative fixture

Attach a lab companion that exposes the organization-approved interface and bulk IN/OUT endpoints. Do not use a production device. Approve the Android USB permission dialog manually once, then run with instrumentation arguments:

```bash
./gradlew :expo-droid-commander-usb-host:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.droidcmd.usb.fixture=true \
  -Pandroid.testInstrumentationRunnerArguments.droidcmd.usb.permissionGranted=true \
  -Pandroid.testInstrumentationRunnerArguments.droidcmd.usb.vendorId=4660 \
  -Pandroid.testInstrumentationRunnerArguments.droidcmd.usb.productId=22136
```

For the echo round-trip test, additionally pass `droidcmd.usb.echo=true`. The fixture must echo only the bounded heartbeat-sized probe and must not interpret it as an arbitrary command.

The permission test intentionally accepts `permission-requested`, `permission-granted`, or `permission-denied` as an observable outcome. A separate operator decision determines whether the test is allowed to proceed after a permission dialog. No test automatically approves permission.

## Build limitation in the current Sandbox

The project contains the generated Android build tree and module source, but the current Sandbox does not have an Android SDK configured. Therefore the instrumentation tests are authored and committed but cannot be compiled or executed here until an Android SDK, Gradle dependencies, and an emulator or approved physical lab device are available.
