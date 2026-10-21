# Offline break-glass ledger CLI

The `breakglass:cli` command manages and inspects the local non-secret revocation ledger and validates break-glass credentials without network access.

```bash
pnpm breakglass:cli -- list --ledger .droidcmd-break-glass/ledger.json
pnpm breakglass:cli -- revoke credential-id --ledger .droidcmd-break-glass/ledger.json
pnpm breakglass:cli -- snapshot --ledger .droidcmd-break-glass/ledger.json --json
```

Revocation is one-way in the CLI. There is intentionally no `unrevoke` or reset command. A revoked credential must be replaced through the organization’s controlled provisioning process. Ledger files contain only credential IDs and should be stored with restrictive permissions.

## Offline token check

The `check` command validates the token’s signed claims, trusted issuer, issuer expiry, credential validity window, maximum lifetime, organization, target, capability, local revocation state, and one-time consumption state:

```bash
pnpm breakglass:cli -- check \
  --credential token.json \
  --trust trust-anchors.json \
  --organization org-001 \
  --capability inspect-auth-state \
  --target target-001 \
  --now 2026-10-20T20:05:00.000Z \
  --ledger .droidcmd-break-glass/ledger.json \
  --json
```

Add `--consume true` only when the organization intends to consume the credential after a successful validation. Failed, expired, revoked, replayed, malformed, and unverifiable credentials are never consumed. A denied check exits with status `2`; CLI or file errors exit with status `1`.

The trust file is an array or an object with `trustedIssuers`. Each entry contains `issuerId`, `keyId`, `validUntil`, `publicKeyPem`, and optionally `algorithm` (`RSA-SHA256` or `SHA256`). The CLI accepts public keys only. It never accepts a private key, password, PIN, recovery code, arbitrary command, or network fallback.

Implementation: `scripts/break-glass-ledger-cli.ts`. Validation uses `lib/local-break-glass-credential.ts`; the CLI does not widen the credential’s signed scope or bypass the application’s consent and target-authorization gates.
