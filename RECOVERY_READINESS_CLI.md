# Offline recovery readiness CLI

The `recovery:cli` command manages an offline, read-only preparation and handoff record for an organization-approved recovery artifact. It validates the exact device profile, artifact SHA-256, artifact signature, owner confirmation, backup prerequisite, enterprise-management status, OEM-unlock eligibility, and verified-boot state.

```bash
pnpm recovery:cli -- validate \
  --device device-state.json \
  --manifest recovery-manifest.json \
  --trust trust-anchors.json \
  --artifact recovery.img \
  --owner-confirmed true \
  --backup-confirmed true \
  --state .droidcmd-recovery/monitor.json \
  --json
```

A successful validation produces `ready-for-authorized-handoff`, not permission to flash. The result always reports `unlockingAvailable: false`, `flashingAvailable: false`, and `recoveryInstallationAvailable: false`. A blocked result exits with status `2` and lists the exact reason, such as model mismatch, hash mismatch, invalid signature, missing owner confirmation, missing backup, enterprise management, disallowed OEM unlock, or unsafe verified-boot state.

The operator may monitor manually reported states without the CLI issuing device commands:

```bash
pnpm recovery:cli -- status --state .droidcmd-recovery/monitor.json --json
pnpm recovery:cli -- advance --state .droidcmd-recovery/monitor.json --to handoff-ready --note "Owner and operator reviewed the signed artifact"
pnpm recovery:cli -- advance --state .droidcmd-recovery/monitor.json --to operator-confirmed --note "Official OEM handoff acknowledged"
pnpm recovery:cli -- advance --state .droidcmd-recovery/monitor.json --to bootloader --note "Operator reports bootloader state"
pnpm recovery:cli -- advance --state .droidcmd-recovery/monitor.json --to recovery --note "Operator reports recovery environment"
pnpm recovery:cli -- advance --state .droidcmd-recovery/monitor.json --to verification --note "Post-handoff verification started"
pnpm recovery:cli -- advance --state .droidcmd-recovery/monitor.json --to complete --note "Operator recorded successful verification"
```

Every transition requires a note and follows the allowed state machine. The CLI does not unlock the bootloader, change OEM settings, run `fastboot`, run `adb`, flash partitions, install recovery images, or accept arbitrary command text. Those actions remain an explicit operator step in the official OEM or authorized-lab workflow.

Implementation: `lib/recovery-readiness.ts` and `scripts/recovery-readiness-cli.ts`. Tests are in `tests/recovery-readiness.test.ts`.
