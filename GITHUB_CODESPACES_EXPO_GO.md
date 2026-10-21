# GitHub Codespaces and Expo Go

Run the bootstrap from the repository root inside an x86-64 GitHub Codespace:

```bash
bash scripts/setup-github-codespaces.sh
```

This activates pnpm 9.12.0 and installs the locked JavaScript dependencies. Expo Go does not require the Android SDK or NDK because it executes the JavaScript/UI surface in the Expo Go client.

## Expo Go preview

Start Metro through a tunnel so a phone running Expo Go can reach the Codespace:

```bash
bash scripts/setup-github-codespaces.sh --expo-go
```

Use the QR code or tunnel URL printed by Expo. The Expo Go preview includes the dashboard, assessments, sessions, catalog, and safe unsupported-platform states.

## Web preview

```bash
bash scripts/setup-github-codespaces.sh --web
```

## Custom Android toolchain

Install the pinned SDK, NDK, CMake, Build Tools, and JDK in addition to the JavaScript dependencies:

```bash
bash scripts/setup-github-codespaces.sh --android-toolchain
```

Then build from the generated Android project:

```bash
cd android
./gradlew :app:assembleDebug --no-daemon --stacktrace
```

The Codespace must be x86-64 for the native build. The bootstrap reuses `scripts/setup-android-ci.sh` and installs the project’s pinned versions.

## Expo Go limitation

Expo Go cannot load Droid Commander’s custom Kotlin modules. The following features require a custom Android development build installed on a physical Android device:

- USB Host discovery and Android-to-Android transport
- Android Keystore verification and credential provisioning
- Root-manager capability checks
- Bootloader and verified-boot state collection
- Native developer-state inspection
- Physical USB instrumentation tests

Expo Go therefore provides a UI and policy-preview environment, not a complete native security-tool environment. The JavaScript bridge intentionally falls back to explicit unsupported-platform behavior rather than pretending that native capabilities are available.
