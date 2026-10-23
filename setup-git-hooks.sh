#!/usr/bin/env bash
# Droid Commander - Git Pre-Commit Hook Setup Script
# File: setup-git-hooks.sh
# Sets up local pre-commit checks for developers to enforce offline air-gap policies,
# prevent secret leakage, and run static security analysis before commits.

set -e

HOOKS_DIR=".git/hooks"
PRE_COMMIT_FILE="$HOOKS_DIR/pre-commit"

echo "================================================================="
echo "  DROID COMMANDER - LOCAL GIT PRE-COMMIT HOOK INSTALLER"
echo "================================================================="

# Verify script is executed inside a git repository
if [ ! -d ".git" ]; then
  echo "❌ ERROR: .git directory not found! Run this script from the project root."
  exit 1
fi

mkdir -p "$HOOKS_DIR"

echo "Writing pre-commit hook script to $PRE_COMMIT_FILE..."

cat << 'EOF' > "$PRE_COMMIT_FILE"
#!/usr/bin/env bash
# Droid Commander - Local Pre-Commit Security & Air-Gap Enforcement Hook

echo "🔍 Running pre-commit security checks..."

# Check 1: Enforce Offline Air-Gap (Scan Manifests & Configs for INTERNET Permission)
echo "  [1/4] Checking offline air-gap policy..."
STAGED_MANIFEST_VIOLATIONS=$(git diff --cached --name-only | grep -E "AndroidManifest\.xml|app\.json" || true)

if [ -n "$STAGED_MANIFEST_VIOLATIONS" ]; then
  if git diff --cached $STAGED_MANIFEST_VIOLATIONS | grep -i "android.permission.INTERNET"; then
    echo "❌ COMMIT BLOCKED: Attempting to commit prohibited 'android.permission.INTERNET' declaration!"
    echo "   Droid Commander requires strict offline air-gap operation."
    exit 1
  fi
fi

# Check 2: Secret & Private Key Leak Prevention
echo "  [2/4] Scanning staged files for accidental secret leakage..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -n "$STAGED_FILES" ]; then
  # Block committing binary keystores or private key formats
  LEAKED_KEYSTORES=$(echo "$STAGED_FILES" | grep -E "\.(keystore|jks|p12|pfx|pem|key)$" || true)
  if [ -n "$LEAKED_KEYSTORES" ]; then
    echo "❌ COMMIT BLOCKED: Keystore or private key file detected in staged files:"
    echo "$LEAKED_KEYSTORES"
    echo "   Never commit signing keystores to git repositories!"
    exit 1
  fi

  # Scan file contents for private key headers
  if git diff --cached -S"BEGIN PRIVATE KEY" --name-only | grep -q .; then
    echo "❌ COMMIT BLOCKED: Private key header detected in staged changes!"
    exit 1
  fi
fi

# Check 3: Run Prebuild Security Validation Script if present
if [ -f "./prebuild-security-checks.sh" ]; then
  echo "  [3/4] Executing prebuild security check script..."
  chmod +x ./prebuild-security-checks.sh
  ./prebuild-security-checks.sh
else
  echo "  [3/4] prebuild-security-checks.sh not found, skipping script check."
fi

# Check 4: Fast TypeScript Typecheck on Staged Changes
echo "  [4/4] Running fast TypeScript type check..."
if command -v npx >/dev/null 2>&1; then
  npx tsc --noEmit || {
    echo "❌ COMMIT BLOCKED: TypeScript compilation errors found!"
    exit 1;
  }
fi

echo "✅ All local pre-commit security gates passed successfully!"
exit 0
EOF

chmod +x "$PRE_COMMIT_FILE"

echo "✅ Pre-commit hook installed successfully at $PRE_COMMIT_FILE!"
echo "   All future git commits will automatically run local air-gap & secret checks."
echo "================================================================="
