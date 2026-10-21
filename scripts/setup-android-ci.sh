#!/usr/bin/env bash
set -Eeuo pipefail

# Droid Commander Android CI toolchain bootstrap.
# Intended for Ubuntu 24.04 LTS on a native x86-64 runner.
# This script installs only the Android/JDK toolchain; it does not build the app.

SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/opt/android-sdk}}"
CMDLINE_TOOLS_VERSION="${CMDLINE_TOOLS_VERSION:-15859902}"
CMDLINE_TOOLS_SHA256="${CMDLINE_TOOLS_SHA256:-4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583}"
CMDLINE_TOOLS_URL="${CMDLINE_TOOLS_URL:-https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip}"
ANDROID_API="${ANDROID_API:-36}"
ANDROID_BUILD_TOOLS="${ANDROID_BUILD_TOOLS:-36.0.0}"
ANDROID_NDK="${ANDROID_NDK:-27.3.13750724}"
ANDROID_CMAKE="${ANDROID_CMAKE:-3.31.5}"
JDK_PACKAGE="${JDK_PACKAGE:-openjdk-21-jdk}"
INSTALL_SYSTEM_PACKAGES="${INSTALL_SYSTEM_PACKAGES:-1}"
WRITE_PROFILE="${WRITE_PROFILE:-1}"
VERIFY_ONLY=0

log() { printf '[android-ci] %s\n' "$*"; }
fatal() { printf '[android-ci] ERROR: %s\n' "$*" >&2; exit 1; }
usage() {
  cat <<'USAGE'
Usage: scripts/setup-android-ci.sh [--verify-only] [--help]

Installs the pinned Android CI toolchain for Droid Commander:
  Android API 36, Build Tools 36.0.0, NDK 27.3.13750724, CMake 3.31.5,
  Android command-line tools 15859902, and OpenJDK 21.

Environment overrides:
  ANDROID_SDK_ROOT       SDK directory (default: /opt/android-sdk)
  CMDLINE_TOOLS_URL      verified command-line-tools archive URL
  CMDLINE_TOOLS_SHA256   SHA-256 for that archive
  INSTALL_SYSTEM_PACKAGES=0  skip apt installation
  WRITE_PROFILE=0        do not write /etc/profile.d/android-sdk.sh
  ALLOW_OTHER_UBUNTU=1   allow a supported non-24.04 Ubuntu host
USAGE
}

while (($#)); do
  case "$1" in
    --verify-only) VERIFY_ONLY=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fatal "unknown argument: $1" ;;
  esac
done

require_command() { command -v "$1" >/dev/null 2>&1 || fatal "missing command: $1"; }

check_host() {
  [[ "$(uname -m)" == "x86_64" ]] || fatal "native x86-64 is required; found $(uname -m)"
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
      [[ "${ALLOW_OTHER_UBUNTU:-0}" == "1" ]] || fatal "Ubuntu 24.04 is required; found ${PRETTY_NAME:-unknown}. Set ALLOW_OTHER_UBUNTU=1 only after validation."
      log "warning: continuing on ${PRETTY_NAME:-unknown} because ALLOW_OTHER_UBUNTU=1"
    fi
  else
    fatal "/etc/os-release is unavailable; cannot verify Ubuntu"
  fi
}

install_system_packages() {
  [[ "$INSTALL_SYSTEM_PACKAGES" == "1" ]] || { log "skipping apt package installation"; return; }
  require_command sudo
  log "installing host prerequisites"
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates curl file git make gcc g++ unzip wget \
    ninja-build python3 \
    libc6 libstdc++6 zlib1g lib32stdc++6 lib32z1 \
    "$JDK_PACKAGE"
}

set_java() {
  if command -v javac >/dev/null 2>&1; then
    JAVA_BIN="$(readlink -f "$(command -v javac)")"
    JAVA_HOME="${JAVA_HOME:-${JAVA_BIN%/bin/javac}}"
  else
    fatal "javac is unavailable; install $JDK_PACKAGE or set JAVA_HOME"
  fi
  export JAVA_HOME
  export PATH="$JAVA_HOME/bin:$PATH"
  java_major="$(java -version 2>&1 | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -n1)"
  [[ "$java_major" == "21" ]] || fatal "JDK 21 is required; found Java ${java_major:-unknown}"
}

install_command_line_tools() {
  local tools_dir="$SDK_ROOT/cmdline-tools/latest"
  local archive
  archive="$(mktemp --tmpdir android-cmdline-tools.XXXXXX.zip)"
  mkdir -p "$SDK_ROOT"

  if [[ -x "$tools_dir/bin/sdkmanager" ]]; then
    log "using existing SDK command-line tools at $tools_dir"
    return
  fi

  require_command curl
  require_command sha256sum
  log "downloading verified Android command-line tools ${CMDLINE_TOOLS_VERSION}"
  curl --fail --location --retry 3 --retry-delay 2 --output "$archive" "$CMDLINE_TOOLS_URL"
  printf '%s  %s\n' "$CMDLINE_TOOLS_SHA256" "$archive" | sha256sum --check --status \
    || fatal "command-line-tools checksum mismatch"

  local staging="$SDK_ROOT/cmdline-tools/.staging"
  rm -rf "$staging"
  mkdir -p "$staging"
  unzip -q "$archive" -d "$staging"
  [[ -x "$staging/cmdline-tools/bin/sdkmanager" ]] || fatal "unexpected command-line-tools archive layout"
  rm -rf "$tools_dir"
  mv "$staging/cmdline-tools" "$tools_dir"
  rm -rf "$staging" "$archive"
}

sdkmanager_path() { printf '%s/cmdline-tools/latest/bin/sdkmanager\n' "$SDK_ROOT"; }

install_sdk_packages() {
  local sdkmanager
  sdkmanager="$(sdkmanager_path)"
  [[ -x "$sdkmanager" ]] || fatal "sdkmanager was not installed"

  export ANDROID_HOME="$SDK_ROOT"
  export ANDROID_SDK_ROOT="$SDK_ROOT"
  export PATH="$SDK_ROOT/platform-tools:$SDK_ROOT/cmdline-tools/latest/bin:$PATH"

  log "accepting Android SDK licenses"
  yes | "$sdkmanager" --sdk_root="$SDK_ROOT" --licenses >/dev/null || true
  log "installing pinned Android packages independently"
  local package
  for package in \
    "platform-tools" \
    "platforms;android-${ANDROID_API}" \
    "build-tools;${ANDROID_BUILD_TOOLS}" \
    "cmake;${ANDROID_CMAKE}" \
    "ndk;${ANDROID_NDK}"; do
    log "installing $package"
    if ! "$sdkmanager" --sdk_root="$SDK_ROOT" "$package"; then
      log "sdkmanager returned nonzero for $package; continuing to strict installed-tool verification"
    fi
  done
}

write_environment_file() {
  [[ "$WRITE_PROFILE" == "1" ]] || return
  require_command sudo
  local profile=/etc/profile.d/droid-commander-android.sh
  log "writing $profile"
  sudo tee "$profile" >/dev/null <<EOF
# Droid Commander Android CI toolchain
export JAVA_HOME="$JAVA_HOME"
export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH"
EOF
}

verify_toolchain() {
  export ANDROID_HOME="$SDK_ROOT"
  export ANDROID_SDK_ROOT="$SDK_ROOT"
  export PATH="$JAVA_HOME/bin:$SDK_ROOT/platform-tools:$SDK_ROOT/cmdline-tools/latest/bin:$PATH"

  local sdkmanager="$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"
  local cmake="$SDK_ROOT/cmake/$ANDROID_CMAKE/bin/cmake"
  local ninja="$SDK_ROOT/cmake/$ANDROID_CMAKE/bin/ninja"
  local aapt2="$SDK_ROOT/build-tools/$ANDROID_BUILD_TOOLS/aapt2"
  local clang="$SDK_ROOT/ndk/$ANDROID_NDK/toolchains/llvm/prebuilt/linux-x86_64/bin/clang"

  for path in "$sdkmanager" "$cmake" "$ninja" "$aapt2" "$clang"; do
    [[ -e "$path" ]] || fatal "missing expected tool: $path"
  done
  [[ -x "$cmake" && -x "$ninja" && -x "$aapt2" && -x "$clang" ]] || fatal "one or more installed tools are not executable"

  for binary in "$cmake" "$ninja" "$aapt2" "$clang"; do
    file -L "$binary" | grep -Eq 'ELF 64-bit.*x86-64' \
      || fatal "tool is not an x86-64 ELF binary: $binary"
  done

  [[ "$("$cmake" --version | sed -n '1p')" == "cmake version ${ANDROID_CMAKE}"* ]] \
    || fatal "unexpected CMake version"
  [[ "$("$ninja" --version)" =~ ^[0-9]+\.[0-9]+\.?[0-9]*$ ]] \
    || fatal "Ninja is not executable"
  "$aapt2" version >/dev/null
  "$clang" --version >/dev/null

  log "verified host architecture: $(uname -m)"
  log "verified Java: $(java -version 2>&1 | head -n1)"
  log "verified SDK: $SDK_ROOT"
  log "verified packages: android-${ANDROID_API}, build-tools ${ANDROID_BUILD_TOOLS}, NDK ${ANDROID_NDK}, CMake ${ANDROID_CMAKE}"
}

main() {
  check_host
  if (( VERIFY_ONLY )); then
    set_java
    verify_toolchain
    return
  fi
  install_system_packages
  set_java
  install_command_line_tools
  install_sdk_packages
  write_environment_file
  verify_toolchain
  log "Android CI toolchain setup complete"
  log "export JAVA_HOME=$JAVA_HOME"
  log "export ANDROID_SDK_ROOT=$SDK_ROOT"
}

main "$@"
