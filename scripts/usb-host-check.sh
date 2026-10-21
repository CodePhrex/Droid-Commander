#!/usr/bin/env bash
# Droid Commander USB Host/OTG compatibility diagnostic.
# Read-only: this script collects device metadata and USB state; it does not
# change Android settings, install packages, unlock devices, or send commands.

set -Eeuo pipefail

SCRIPT_NAME=$(basename "$0")
SERIAL=""
OUTPUT_DIR="./usb-host-reports"

usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [options]

Collect read-only USB Host/OTG and Android device diagnostics through ADB.

Options:
  -s, --serial SERIAL   Use this ADB device serial. Otherwise require exactly one device.
  -o, --output DIR      Write the report into DIR (default: $OUTPUT_DIR).
  -h, --help            Show this help.

Examples:
  $SCRIPT_NAME
  $SCRIPT_NAME --serial R58M1234567 --output ./reports

The script requires adb on the host and USB debugging authorization on the Android
controller. It does not modify the device or test exploit, lock-screen, shell,
flashing, or remediation capabilities.
EOF
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '[usb-host-check] %s\n' "$*" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -s|--serial)
      [[ $# -ge 2 ]] || fail "Missing value for $1"
      SERIAL=$2
      shift 2
      ;;
    -o|--output)
      [[ $# -ge 2 ]] || fail "Missing value for $1"
      OUTPUT_DIR=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

command -v adb >/dev/null 2>&1 || fail "adb was not found in PATH. Install Android Platform Tools first."

mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date -u '+%Y%m%dT%H%M%SZ')
REPORT="$OUTPUT_DIR/usb-host-report-$TIMESTAMP.txt"

adb start-server >/dev/null

mapfile -t DEVICE_LINES < <(adb devices -l | awk 'NR > 1 && $2 == "device"')
if [[ -z "$SERIAL" ]]; then
  case "${#DEVICE_LINES[@]}" in
    0) fail "No authorized ADB device found. Check USB debugging and the RSA authorization prompt." ;;
    1) SERIAL=$(awk '{print $1}' <<<"${DEVICE_LINES[0]}") ;;
    *) fail "More than one authorized device found. Re-run with --serial SERIAL." ;;
  esac
fi

adb -s "$SERIAL" get-state >/dev/null 2>&1 || fail "ADB device '$SERIAL' is not online or authorized."

{
  printf 'Droid Commander USB Host/OTG Diagnostic\n'
  printf '========================================\n'
  printf 'Collected (UTC): %s\n' "$TIMESTAMP"
  printf 'ADB serial: %s\n' "$SERIAL"
  printf 'Host: %s\n' "$(uname -a)"
  printf '\n'

  section() {
    printf '\n--- %s ---\n' "$1"
  }

  section 'ADB inventory'
  adb devices -l

  section 'Android identity and build properties'
  for property in \
    ro.product.manufacturer \
    ro.product.brand \
    ro.product.model \
    ro.product.device \
    ro.build.version.release \
    ro.build.version.sdk \
    ro.build.version.security_patch \
    ro.bootloader \
    ro.boot.verifiedbootstate; do
    printf '%-32s %s\n' "$property" "$(adb -s "$SERIAL" shell getprop "$property" | tr -d '\r')"
  done

  section 'Declared USB features'
  adb -s "$SERIAL" shell pm list features | grep -E 'android\.hardware\.usb\.(host|accessory)' || \
    printf 'No android.hardware.usb.host or android.hardware.usb.accessory feature reported.\n'

  section 'USB manager state'
  adb -s "$SERIAL" shell dumpsys usb 2>&1 || true

  section 'USB port role/status (if supported)'
  adb -s "$SERIAL" shell cmd usb get-port-status 2>&1 || \
    printf 'cmd usb get-port-status is unavailable on this Android build.\n'

  section 'Connected USB devices'
  adb -s "$SERIAL" shell 'ls -la /sys/bus/usb/devices 2>/dev/null || true' 2>&1

  section 'Relevant USB settings (read-only)'
  adb -s "$SERIAL" shell settings get global adb_enabled 2>&1 || true
  adb -s "$SERIAL" shell settings get global development_settings_enabled 2>&1 || true

  section 'Interpretation'
  printf 'USB Host feature: '
  if adb -s "$SERIAL" shell pm list features | grep -q 'android.hardware.usb.host'; then
    printf 'PASS (Android declares host support)\n'
  else
    printf 'NOT DECLARED (physical OTG may be unsupported)\n'
  fi
  printf 'A known-good peripheral test is still required; software declaration alone does not prove power delivery, cable/adapter compatibility, or Android-to-Android interoperability.\n'
  printf 'This report is informational and does not authorize or perform privileged actions.\n'
} | tee "$REPORT"

log "Report written to $REPORT"
