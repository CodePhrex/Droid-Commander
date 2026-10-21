# Operator transfer CLI

Droid Commander includes an interactive transfer monitor for owner-witnessed recovery sessions. It records checklist state in a local JSON file with file mode `0600`, never accepts authentication credentials, and uses the same verification rules as the application.

Start a new session only after the owner has unlocked the source through Android’s normal authentication flow:

```bash
pnpm transfer:cli -- \
  --session transfer-001 \
  --source damaged-source \
  --destination new-device \
  --owner owner-001 \
  --authorization auth-001 \
  --categories contacts,photos,documents,messages \
  --owner-confirmed true \
  --source-unlocked true \
  --destination-reachable true
```

The CLI prints the current state and accepts commands in real time. `record` adds or replaces a manifest item; `destination reachable|unreachable`, `source preserved|not-preserved`, and `interrupt yes|no` update live conditions; `status` prints the checklist; and `verify` runs the shared verification engine. The supported record format is:

```text
record <category> <itemId> <sourceHash> <destinationHash> <sourceSize> <destinationSize> <readable|unreadable>
```

Source release is held by default. `release-source owner-confirmed` is accepted only after verification returns `verified`, the source remains preserved, and the owner explicitly confirms release. Partial, failed, interrupted, mismatched, unreadable, or unreachable transfers cannot release the source.

Resume an existing session by passing the same `--state path` or by starting with the same default session path. The CLI state contains device IDs, authorization ID, selected categories, manifest metadata, and verification outcomes. It must not contain PINs, patterns, biometric material, recovery codes, private keys, tokens, or passwords.

Implementation is split between `scripts/transfer-cli.ts`, `lib/transfer-cli.ts`, and `lib/transfer-verification.ts`. Automated coverage is in `tests/transfer-cli.test.ts` and `tests/transfer-verification.test.ts`.
