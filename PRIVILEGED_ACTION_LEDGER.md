# Privileged-action disclosure ledger

Droid Commander now supports an append-only JSONL ledger for user-facing disclosure of privileged or security-sensitive workflows. It records requests, approvals, denials, starts, completions, failures, cancellations, handoffs, and explicit no-change outcomes for actions such as OEM-unlock requests, USB-debugging changes, bootloader or recovery handoffs, root sessions, diagnostics, remediation, system-patch handoffs, and session closure.

Each event contains the operator, organization, target, action, result, human-readable summary, implementation or handoff description, system modifications or explicit no-change statements, optional consent and ticket references, timestamp, sequence, previous hash, and event hash. The chain is verified before each append; a corrupted ledger cannot receive new entries until it is preserved and repaired through the organization’s evidence process.

The ledger rejects passwords, passcodes, PINs, private keys, secrets, recovery codes, seed phrases, access tokens, refresh tokens, and client secrets. It does not record raw credentials, arbitrary shell commands, or private payloads. Store the ledger with restrictive file permissions and include it in the owner disclosure package only after reviewing for local policy and personal-data requirements.

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

An intact ledger proves what Droid Commander recorded; it does not prove that an OEM or external tool completed an action unless an explicit completion or handoff event with corresponding evidence was recorded. Failed, denied, cancelled, and no-change events are retained rather than hidden.

Implementation: `lib/privileged-action-ledger.ts` and `scripts/privileged-ledger-cli.ts`. Tests: `tests/privileged-action-ledger.test.ts`.
