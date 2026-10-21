#!/usr/bin/env bash
set -Eeuo pipefail

# Droid Commander GitHub Codespaces bootstrap.
# Default mode prepares the JavaScript project for Expo Go or web preview.
# --android-toolchain additionally installs the pinned Android SDK/NDK/CMake
# toolchain for a custom development build. Expo Go cannot load this project's
# custom USB Host native module.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PNPM_VERSION="${PNPM_VERSION:-9.12.0}"
INSTALL_ANDROID_TOOLCHAIN=0
START_EXPO_GO=0
START_WEB=0

log() { printf '[codespaces] %s\n' "$*"; }
fatal() { printf '[codespaces] ERROR: %s\n' "$*" >&2; exit 1; }
usage() {
  cat <<'USAGE'
Usage: scripts/setup-github-codespaces.sh [options]

Default behavior:
  1. Verify the Codespaces host and Node.js runtime.
  2. Activate pnpm 9.12.0.
  3. Install the locked project dependencies.

Options:
  --android-toolchain  Also install the pinned Android SDK/NDK/CMake toolchain
                       using scripts/setup-android-ci.sh.
  --expo-go            Start Metro through an Expo tunnel after setup.
  --web                Start the Expo web preview after setup.
  --help               Show this help.

Environment overrides:
  PNPM_VERSION         pnpm version (default: 9.12.0)
  ANDROID_SDK_ROOT     Codespaces SDK path when --android-toolchain is used
  EXPO_START_ARGS      Extra arguments appended to Expo Go startup

Important:
  Expo Go can preview JavaScript/UI functionality, but it cannot load the
  custom Droid Commander USB Host, Keystore, or other native-module features.
  Those require a custom Android development build on an x86-64 runner.
USAGE
}

while (($#)); do
  case "$1" in
    --android-toolchain) INSTALL_ANDROID_TOOLCHAIN=1; shift ;;
    --expo-go) START_EXPO_GO=1; shift ;;
    --web) START_WEB=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fatal "unknown argument: $1" ;;
  esac
done

if (( START_EXPO_GO && START_WEB )); then
  fatal "choose only one of --expo-go or --web"
fi

command -v node >/dev/null 2>&1 || fatal "Node.js is required in the Codespace"
node - <<'NODE'
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const ok =
  (major === 20 && (minor > 19 || (minor === 19 && patch >= 4))) ||
  (major === 22 && minor >= 13) ||
  (major === 24 && minor >= 3) ||
  major >= 25;
if (!ok) {
  console.error(`[codespaces] ERROR: Node.js 20.19.4+ or Node.js 22+ is required; found ${process.version}`);
  process.exit(1);
}
NODE

if [[ "${CODESPACES:-false}" != "true" ]]; then
  log "warning: CODESPACES is not true; continuing as a compatible local bootstrap"
fi

[[ "$(uname -m)" == "x86_64" ]] || fatal "Codespaces native Android builds require x86-64; found $(uname -m)"

if ! command -v corepack >/dev/null 2>&1; then
  command -v npm >/dev/null 2>&1 || fatal "corepack or npm is required to install pnpm"
  npm install --global "pnpm@${PNPM_VERSION}"
else
  corepack enable
  corepack prepare "pnpm@${PNPM_VERSION}" --activate
fi

command -v pnpm >/dev/null 2>&1 || fatal "pnpm activation failed"
[[ "$(pnpm --version)" == "$PNPM_VERSION" ]] || fatal "expected pnpm ${PNPM_VERSION}; found $(pnpm --version)"

cd "$ROOT_DIR"
log "installing locked JavaScript dependencies"
pnpm install --frozen-lockfile

if (( INSTALL_ANDROID_TOOLCHAIN )); then
  export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/.local/android-sdk}"
  export ANDROID_HOME="$ANDROID_SDK_ROOT"
  export INSTALL_SYSTEM_PACKAGES="${INSTALL_SYSTEM_PACKAGES:-1}"
  export WRITE_PROFILE=0
  log "installing the pinned Android toolchain into $ANDROID_SDK_ROOT"
  "$ROOT_DIR/scripts/setup-android-ci.sh"
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
  log "custom Android builds are available through ./gradlew in android/"
else
  log "skipping Android SDK/NDK installation; Expo Go does not require it"
fi

if (( START_EXPO_GO )); then
  log "starting Expo through a tunnel for Expo Go"
  log "native USB Host and Keystore features are unavailable in Expo Go"
  # shellcheck disable=SC2086
  exec pnpm exec expo start --tunnel ${EXPO_START_ARGS:-}
fi

if (( START_WEB )); then
  log "starting the Expo web preview"
  # shellcheck disable=SC2086
  exec pnpm exec expo start --web --port 8081 ${EXPO_START_ARGS:-}
fi

log "Codespaces setup complete"
log "Expo Go preview: ./scripts/setup-github-codespaces.sh --expo-go"
log "Web preview:      ./scripts/setup-github-codespaces.sh --web"
log "Custom Android:   ./scripts/setup-github-codespaces.sh --android-toolchain"
