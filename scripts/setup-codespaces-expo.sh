#!/usr/bin/env bash
set -Eeuo pipefail

# Droid Commander GitHub Codespaces + Expo Go bootstrap.
# Run from the repository root inside an x86-64 GitHub Codespace.
# Expo Go runs the JavaScript/web-compatible surface. Custom Android native
# capabilities require a custom development build and are not exposed by Expo Go.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-${HOME}/.android-sdk}}"
START_EXPO=0
START_WEB=0
SKIP_ANDROID=0

log() { printf '[codespaces-expo] %s\n' "$*"; }
fatal() { printf '[codespaces-expo] ERROR: %s\n' "$*" >&2; exit 1; }
usage() {
  cat <<'USAGE'
Usage: scripts/setup-codespaces-expo.sh [options]

Options:
  --start-expo       Start Expo in tunnel mode for Expo Go after setup.
  --start-web        Start the Expo web preview after setup.
  --skip-android     Install Node dependencies but skip SDK/NDK installation.
  --help             Show this help.

Environment overrides:
  ANDROID_SDK_ROOT       SDK directory (default: ~/.android-sdk)
  INSTALL_SYSTEM_PACKAGES=0  Skip apt prerequisites when installing Android tools
  WRITE_PROFILE=0        Do not write a system profile file in the Codespace
  EXPO_PORT=8081         Metro port

Expo Go limitation:
  Expo Go can run the JavaScript interface and safe unsupported-platform fallbacks.
  It cannot load Droid Commander’s custom Kotlin USB Host, Keystore, root-manager,
  boot-state, or native diagnostic modules. Use a custom development build on a
  physical Android device for those features.
USAGE
}

while (($#)); do
  case "$1" in
    --start-expo) START_EXPO=1; shift ;;
    --start-web) START_WEB=1; shift ;;
    --skip-android) SKIP_ANDROID=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fatal "unknown argument: $1" ;;
  esac
done

[[ "$(uname -m)" == "x86_64" ]] || fatal "GitHub Codespaces runner must be x86-64; found $(uname -m)"
[[ -f "$ROOT_DIR/package.json" && -f "$ROOT_DIR/pnpm-lock.yaml" ]] || fatal "run this script from a Droid Commander checkout"
command -v corepack >/dev/null 2>&1 || fatal "corepack is required"

if [[ "$SKIP_ANDROID" == "0" ]]; then
  [[ -x "$ROOT_DIR/scripts/setup-android-ci.sh" ]] || fatal "missing scripts/setup-android-ci.sh"
  log "installing the pinned Android SDK/NDK toolchain into $SDK_ROOT"
  INSTALL_SYSTEM_PACKAGES="${INSTALL_SYSTEM_PACKAGES:-1}" \
  WRITE_PROFILE="${WRITE_PROFILE:-0}" \
  ALLOW_OTHER_UBUNTU="${ALLOW_OTHER_UBUNTU:-1}" \
  ANDROID_SDK_ROOT="$SDK_ROOT" \
    "$ROOT_DIR/scripts/setup-android-ci.sh"
else
  log "skipping Android SDK/NDK installation"
fi

log "enabling pnpm 9.12.0"
corepack enable
corepack prepare pnpm@9.12.0 --activate

cd "$ROOT_DIR"
log "installing JavaScript dependencies from the lockfile"
pnpm install --frozen-lockfile

cat <<EOF

Droid Commander Codespaces setup is complete.

Project: $ROOT_DIR
SDK:     $SDK_ROOT

Expo Go mode:
  1. Run:  scripts/setup-codespaces-expo.sh --start-expo
  2. Scan the displayed QR code with Expo Go, or open the forwarded tunnel URL.

Web preview:
  Run:    scripts/setup-codespaces-expo.sh --start-web

Native Android features:
  Expo Go intentionally falls back to unsupported-platform behavior for the custom
  USB Host, Keystore, root-capability, boot-state, and developer-diagnostics APIs.
  A custom Android development build on a physical device is required for those.
EOF

if [[ "$START_EXPO" == "1" && "$START_WEB" == "1" ]]; then
  fatal "choose only one of --start-expo or --start-web"
elif [[ "$START_EXPO" == "1" ]]; then
  export ANDROID_HOME="$SDK_ROOT"
  export ANDROID_SDK_ROOT="$SDK_ROOT"
  export PATH="$SDK_ROOT/platform-tools:$SDK_ROOT/cmdline-tools/latest/bin:$PATH"
  export EXPO_USE_METRO_WORKSPACE_ROOT=1
  export EXPO_PORT="${EXPO_PORT:-8081}"
  log "starting Expo tunnel for Expo Go on port $EXPO_PORT"
  exec pnpm exec expo start --tunnel --port "$EXPO_PORT"
elif [[ "$START_WEB" == "1" ]]; then
  export EXPO_USE_METRO_WORKSPACE_ROOT=1
  export EXPO_PORT="${EXPO_PORT:-8081}"
  log "starting Expo web preview on port $EXPO_PORT"
  exec pnpm exec expo start --web --port "$EXPO_PORT"
fi
