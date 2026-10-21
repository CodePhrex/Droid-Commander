# Privileged-action disclosure ledger

Droid Commander supports an append-only, hash-chained ledger for user-facing disclosure of privileged or security-sensitive workflows. The CLI persists JSONL, while the Android app persists the same event contract in AsyncStorage and exposes the verified chain through the Sessions dashboard. It records requests, approvals, denials, starts, completions, failures, cancellations, handoffs, and explicit no-change outcomes for actions such as OEM-unlock requests, USB-debugging changes, bootloader or recovery handoffs, root sessions, diagnostics, remediation, system-patch handoffs, and session closure.

Each event contains the operator, organization, target, action, result, human-readable summary, implementation or handoff description, system modifications or explicit no-change statements, optional consent and ticket references, timestamp, sequence, previous hash, and event hash. The chain is verified before each append; a corrupted ledger cannot receive new entries until it is preserved and repaired through the organization’s evidence process.

The ledger rejects passwords, passcodes, PINs, private keys, secrets, recovery codes, seed phrases, access tokens, refresh tokens, and client secrets. It does not record raw credentials, arbitrary shell commands, or private payloads. Store the ledger with restrictive file permissions and include it in the owner disclosure package only after reviewing for local policy and personal-data requirements.

## Android dashboard storage

The mobile adapter is `lib/native-privileged-action-ledger.ts`. It uses the `@droidcmd/privileged-action-ledger/v1` AsyncStorage key, Expo Crypto SHA-256 hashing, the shared canonical serializer, and the same sequence/previous-hash validation rules as the CLI ledger. It refuses to append when the stored chain is invalid, rejects secret-like fields before storage, serializes writes to avoid concurrent sequence collisions, and supports JSON/JSONL export.

The Sessions dashboard reads and verifies the mobile ledger on mount, displays the entry count and chain status, and shares a Markdown disclosure containing event metadata, summary, implementation, modifications, target, timestamp, and integrity evidence. An invalid chain is surfaced as `INVALID`; it is not repaired or hidden.

Native device smoke validation remains required for AsyncStorage durability and Expo Crypto behavior on the supported Android build.

## CLI

Append a transparent event:

```bash
pnpm privileged:ledger -- append \
  --ledger .droidcmd-audit/privileged.jsonl \
  --action oem-unlock-request \
  --result requested \
  --operator operator-001 \
  --organization org-001 \
  --target device-001 \
  --summary "Owner-requested OEM unlock preparation" \
  --implementation "Recorded visible OEM handoff request; no device mutation performed" \
  --modifications "No system modification performed|Handoff request created" \
  --consent-ref consent-001 \
  --ticket-ref ticket-001 \
  --json
```

Verify integrity and inspect the latest event:

```bash
pnpm privileged:ledger -- verify --ledger .droidcmd-audit/privileged.jsonl --json
pnpm privileged:ledger -- inspect --ledger .droidcmd-audit/privileged.jsonl --json
```

Export a user disclosure package:

```bash
pnpm privileged:ledger -- export \
  --ledger .droidcmd-audit/privileged.jsonl \
  --format json \
  --output user-disclosure.json
```

Generate a human-readable Markdown report:

```bash
pnpm privileged:ledger -- report \
  --ledger .droidcmd-audit/privileged.jsonl \
  --format markdown \
  --output user-disclosure.md
```

Generate a PDF disclosure using the installed Markdown-to-PDF converter:

```bash
pnpm privileged:ledger -- report \
  --ledger .droidcmd-audit/privileged.jsonl \
  --format pdf \
  --output user-disclosure.pdf
```

The report includes the ledger integrity result, event counts, event metadata, user-readable summaries, implementation or handoff descriptions, recorded modifications, consent/ticket references, and hash-chain values. If the ledger is invalid, the report clearly marks it `INVALID` and tells the reader not to rely on it as a complete disclosure; it does not hide or silently repair the problem. PDF conversion uses the generated Markdown as its sole source, so Markdown remains available as the inspectable disclosure source.

An intact ledger proves what Droid Commander recorded; it does not prove that an OEM or external laboratory tool completed an action unless an explicit completion or handoff event with corresponding evidence was recorded. Failed, denied, cancelled, and no-change events are retained rather than hidden.

Implementation: `lib/privileged-action-core.ts`, `lib/privileged-action-ledger.ts`, `lib/native-privileged-action-ledger.ts`, `lib/privileged-action-report.ts`, and `scripts/privileged-ledger-cli.ts`. Tests: `tests/privileged-action-ledger.test.ts`, `tests/native-privileged-action-ledger.test.ts`, `tests/privileged-action-report.test.ts`, and `tests/session-disclosure.test.ts`.
