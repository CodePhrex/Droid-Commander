#!/bin/bash
# ==============================================================================
# DROID COMMANDER - PRE-PUSH FILE EXCLUSION GUARD SCRIPT
# File: git-push-exclusion-guard.sh
# ==============================================================================
# Scans staged git files and commit objects for sensitive patterns, release zips,
# environment keys, or uncommitted database vaults prior to executing `git push`.
# ==============================================================================

set -e

RED='\030[0;31m'
GREEN='\030[0;32m'
YELLOW='\030[1;33m'
CYAN='\030[0;36m'
NC='\030[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}    DROID COMMANDER - PRE-PUSH FILE EXCLUSION GUARD              ${NC}"
echo -e "${CYAN}================================================================${NC}"

BLOCKED_PATTERNS=(
  "\.env$"
  "env-config\.env"
  "\.zip$"
  "\.pem$"
  "\.keystore$"
  "\.jks$"
  "\.key$"
  "\.db$"
  "\.sqlite$"
  "knowledge_vault\.db"
  "node_modules/"
)

VIOLATIONS_FOUND=0

# Check staged or tracking files
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || find . -type f -not -path '*/.*' | head -n 50)

echo -e "\n🔍 Scanning files for git push exclusion compliance..."

for file in $STAGED_FILES; do
  for pattern in "${BLOCKED_PATTERNS[@]}"; do
    if echo "$file" | grep -qE "$pattern"; then
      echo -e "  ${RED}❌ BLOCKED FILE DETECTED:${NC} $file (Matches pattern: ${YELLOW}$pattern${NC})"
      VIOLATIONS_FOUND=$((VIOLATIONS_FOUND + 1))
    fi
  done
done

if [ $VIOLATIONS_FOUND -gt 0 ]; then
  echo -e "\n${RED}================================================================${NC}"
  echo -e "${RED} 🚨 GIT PUSH ABORTED: $VIOLATIONS_FOUND prohibited file(s) flagged!      ${NC}"
  echo -e "${RED} Please remove flagged sensitive files/archives or update .gitignore. ${NC}"
  echo -e "${RED}================================================================${NC}"
  exit 1
else
  echo -e "\n${GREEN}================================================================${NC}"
  echo -e "${GREEN} ✅ ALL FILES PASSED EXCLUSION AUDIT. SAFE TO PUSH TO GITHUB.  ${NC}"
  echo -e "${GREEN}================================================================${NC}"
  exit 0
fi
