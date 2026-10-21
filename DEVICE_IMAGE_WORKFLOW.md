# Device image acquisition and restoration workflow

Droid Commander now has an image-workflow layer for planning an authorized image acquisition, validating a provider-generated manifest, checking chunk digests, and preserving restoration evidence. It does **not** bypass a PIN, pattern, biometric, Android encryption, verified boot, enterprise controls, or a locked device. It does not issue `adb`, `fastboot`, bootloader-unlock, partition-write, or arbitrary shell commands.

## What the app can do

The workflow in `lib/device-image-workflow.ts` can:

- Bind an image plan to an authorization record, operator, organization, and exact target.
- Require visible owner consent, encrypted destination storage, sufficient capacity, and known encryption state.
- Distinguish a raw full-device image from normal Android backup or owner-approved file transfer.
- Require explicit provider capabilities: `full-block-image-read`, `user-data-export`, and `restore-provider`.
- Return `ready`, `handoff-required`, or `blocked` instead of silently degrading.
- Validate a sequential chunk manifest with exact offsets, lengths, total size, encrypted-at-rest state, and SHA-256 digests.
- Compare each provider-reported chunk digest before accepting it as verified.

## Full-image behavior

A standard Android application cannot create a raw full-device image of a locked or encrypted target. A full image requires a separately approved acquisition provider, such as an organization-controlled rooted lab image engine or authorized forensic/OEM workflow, plus the provider’s own user and legal controls. Droid Commander can prepare the request and record the provider manifest, but it must not implement a bypass or assume that root alone makes a raw image safe.

Normal Android backup and OEM migration remain the preferred path for owner-authenticated transfer. They may restore selected user data but are not treated as raw full-device images. If the target is locked, encryption state is unknown, owner consent is missing, the destination is not encrypted, or a required provider capability is absent, the plan is blocked or routed to an explicit handoff.

## Restoration evidence

A restore-capable provider must return a manifest containing an image ID, exact target ID, scope, provider ID, creation time, total byte count, chunk size, encrypted-at-rest state, and ordered chunk digests. The application must verify the manifest before accepting it as restoration-ready. A digest mismatch, missing chunk, sequence gap, offset mismatch, or integrity failure stops the workflow and preserves the source.

Restoration remains a separate, destructive operation. It requires a new owner confirmation, a target match, a verified image manifest, a destination backup or rollback plan, and provider-specific confirmation. A successful manifest check is not proof that a vendor tool completed a restore.

## Native integration still required

The current implementation is the policy and evidence layer. Before production use, connect it to an organization-approved image provider adapter, test encrypted and unlocked lab devices, implement secure manifest persistence, add native storage-capacity and hardware-health signals, and append acquisition/handoff/verification events to the mobile privileged-action ledger.

Tests: `tests/device-image-workflow.test.ts`.
