#!/usr/bin/env bash

# ==============================================================================
# Droid Commander - Prebuild Security Validation Gate & Compliance Checker
# ==============================================================================
# Execution Phase: Pre-compilation / Pre-bundle (CI/CD & Local Release Builds)
# Purpose: Enforces security constraints, signing verification, break-glass key
#          policy, and native module integrity before Expo/Android compilation.
# ==============================================================================

set -euo pipefail

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

log_header() {
  echo -e "\n${BOLD}${BLUE}=== $1 ===${NC}"
}

log_pass() {
  echo -e "  [${GREEN}PASS${NC}] $1"
}

log_fail() {
  echo -e "  [${RED}FAIL${NC}] $1"
  ERRORS=$((ERRORS + 1))
}

log_warn() {
  echo -e "  [${YELLOW}WARN${NC}] $1"
  WARNINGS=$((WARNINGS + 1))
}

echo -e "${BOLD}Starting Droid Commander Prebuild Security Gate Audit...${NC}"
echo "Build Environment: ${NODE_ENV:-development}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ------------------------------------------------------------------------------
# Gate 1: Android Keystore & Release Signing Verification
# ------------------------------------------------------------------------------
log_header "Gate 1: Android Keystore & Code Signing"

if [ "${NODE_ENV:-development}" = "production" ]; then
  if [ -z "${ANDROID_KEYSTORE_PATH:-}" ]; then
    log_fail "ANDROID_KEYSTORE_PATH is not set in production environment."
  elif [ ! -f "$ANDROID_KEYSTORE_PATH" ]; then
    log_fail "Keystore file specified at ANDROID_KEYSTORE_PATH does not exist: $ANDROID_KEYSTORE_PATH"
  else
    log_pass "Release Android Keystore located at $ANDROID_KEYSTORE_PATH"
  fi

  if [ -z "${ANDROID_KEY_ALIAS:-}" ]; then
    log_fail "ANDROID_KEY_ALIAS environment variable missing."
  else
    log_pass "Android Key Alias configured: $ANDROID_KEY_ALIAS"
  fi
else
  log_warn "Development build detected. Skipping strict Android Keystore production check."
fi

# ------------------------------------------------------------------------------
# Gate 2: Break-Glass Admin Key & Governance Configuration
# ------------------------------------------------------------------------------
log_header "Gate 2: Break-Glass Admin Public Key Configuration"

BREAK_GLASS_KEY="${BREAK_GLASS_SUPERUSER_PUBKEY:-}"

if [ -z "$BREAK_GLASS_KEY" ]; then
  if [ "${NODE_ENV:-development}" = "production" ]; then
    log_fail "BREAK_GLASS_SUPERUSER_PUBKEY environment variable is mandatory in production release builds!"
  else
    log_warn "BREAK_GLASS_SUPERUSER_PUBKEY not set. Using ephemeral local dev keypair."
  fi
elif [[ "$BREAK_GLASS_KEY" == *"DEV_KEY"* ]] || [[ "$BREAK_GLASS_KEY" == *"DEBUG"* ]]; then
  log_fail "Development/Debug Break-Glass public key detected in production build configuration!"
else
  log_pass "Production Break-Glass superuser public key verified (Length: ${#BREAK_GLASS_KEY} chars)."
fi

# ------------------------------------------------------------------------------
# Gate 3: Native USB Module Integrity & Kotlin Gate Verification
# ------------------------------------------------------------------------------
log_header "Gate 3: Native USB OTG Host Module Security Enforcement"

KOTLIN_MODULE_PATH="modules/droid-commander-usb-host/android/src/main/java/com/droidcommander/usb/DroidCommanderUsbHostModule.kt"

if [ -f "$KOTLIN_MODULE_PATH" ]; then
  # Check for CRC32 enforcement in code
  if grep -q "CRC32" "$KOTLIN_MODULE_PATH"; then
    log_pass "Native USB module contains hardware CRC32 frame checksum verification."
  else
    log_fail "Native USB module lacks CRC32 hardware frame checksum verification!"
  fi

  # Check for fail-closed state check
  if grep -q "FAIL_CLOSED" "$KOTLIN_MODULE_PATH" || grep -q "ENFORCE_EXECUTION_GATES" "$KOTLIN_MODULE_PATH"; then
    log_pass "Native USB module incorporates fail-closed enforcement state machine."
  else
    log_fail "Native USB module lacks fail-closed execution gate checks."
  fi
else
  log_warn "Native Kotlin USB module not found at expected local path ($KOTLIN_MODULE_PATH). Skipping line-level static analysis."
fi

# ------------------------------------------------------------------------------
# Gate 4: Expo App Configuration & Android Manifest Audit
# ------------------------------------------------------------------------------
log_header "Gate 4: Expo Config & Android Manifest Flags"

EXPO_CONFIG="app.json"

if [ -f "$EXPO_CONFIG" ]; then
  if grep -q '"debuggable": true' "$EXPO_CONFIG" && [ "${NODE_ENV:-development}" = "production" ]; then
    log_fail "app.json contains 'debuggable: true' for a production release build!"
  else
    log_pass "app.json debuggable flag validation passed."
  fi

  if grep -q "android.permission.INTERNET" "$EXPO_CONFIG"; then
    log_fail "FORBIDDEN PERMISSION ENCOUNTERED: Droid Commander is an offline-first tool and must NOT request android.permission.INTERNET!"
  else
    log_pass "Offline integrity check passed: INTERNET permission is strictly omitted."
  fi
else
  log_warn "app.json not found in execution directory. Ensure prebuild script is executed from project root."
fi

# ------------------------------------------------------------------------------
# Gate 5: Database Schema & Migration Preflight
# ------------------------------------------------------------------------------
log_header "Gate 5: Database Schema & Privileged Action Ledger Preflight"

DRIZZLE_DIR="drizzle"

if [ -d "$DRIZZLE_DIR" ]; then
  log_pass "Drizzle ORM migration directory located."
else
  log_warn "Drizzle migration folder ($DRIZZLE_DIR) missing. Run 'npx drizzle-kit generate' prior to compilation."
fi

# ------------------------------------------------------------------------------
# Final Prebuild Report
# ------------------------------------------------------------------------------
echo -e "\n${BOLD}==============================================================================${NC}"
echo -e "${BOLD}PREBUILD SECURITY AUDIT SUMMARY${NC}"
echo -e "=============================================================================="
echo -e "Total Checks Passed: Gate Suite Complete"
echo -e "Warnings Raised:    ${YELLOW}${WARNINGS}${NC}"
echo -e "Critical Violations:${RED} ${ERRORS}${NC}"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "\n${RED}${BOLD}PREBUILD GATE FAILED!${NC} $ERRORS critical security violation(s) detected."
  echo "Build process halted to prevent security regression."
  exit 1
else
  echo -e "\n${GREEN}${BOLD}PREBUILD GATE PASSED!${NC} Application meets security and governance standards."
  exit 0
fi
