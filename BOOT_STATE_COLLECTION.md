# Bootloader and verified-boot state collection

Droid Commander now collects read-only Android build and boot-state metadata through the native module. The collector reads manufacturer, model, device, product, bootloader version, Android release, SDK level, security patch level, verified-boot state, flash-lock state, vbmeta device state, verity mode, and the exposed OEM-unlock setting. It uses fixed property names and does not accept caller-provided shell text.

The TypeScript normalizer compares the returned identity against an organization-provided exact supported-device registry. A device is supported only when manufacturer and model match, plus product when the profile specifies products. Unknown or unregistered models are reported as unsupported; the app does not guess compatibility from a similar model name.

The report normalizes bootloader state as locked, unlocked, or unknown; verified boot as green, yellow, orange, red, or unknown; and OEM unlock as allowed, disallowed, or unknown. Collection always reports a read-only boundary. It never unlocks the bootloader, changes OEM settings, flashes partitions, installs a recovery image, executes fastboot commands, or claims that a custom recovery is compatible. Any later flashing workflow must use a separately reviewed, signed, model-specific handoff process with owner consent and an explicit data-wipe warning.

Implementation:

- Normalizer: `lib/boot-state.ts`
- Native binding: `lib/native-boot-state.ts`
- Android collector: `modules/droid-commander-usb-host/android/src/main/java/com/droidcommander/usb/BootStateCollector.kt`
- Expo bridge: `modules/droid-commander-usb-host/src/index.ts`
- Tests: `tests/boot-state.test.ts`
