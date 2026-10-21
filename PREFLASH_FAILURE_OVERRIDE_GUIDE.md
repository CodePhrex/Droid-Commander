# Pre-flash verification failure and override guide

## Purpose and safety boundary

This guide covers preparation for an organization-approved recovery or firmware handoff when the device is offline or cannot reach the support service. It applies to authorized operators, the device owner, and an independent approver. Droid Commander validates readiness and records the handoff; it does not unlock bootloaders, flash partitions, install recovery images, run `fastboot` or `adb`, bypass authentication, or accept arbitrary override commands.

An **override** in this guide means a documented governance exception that routes a case to an authorized OEM or lab process. It does not mean disabling signature checks, model checks, enterprise controls, owner consent, verified-boot integrity checks, or Android authentication. A blocked readiness result must never be edited into a ready result.

## Required roles

The primary operator collects evidence and operates the CLI. The device owner confirms ownership, the exact device, data-wipe risk, backup status, and the desired recovery artifact. An independent approver reviews any exception or backup waiver. An authorized OEM, enterprise administrator, or lab technician performs the official unlock or flashing step outside Droid Commander. An auditor receives the immutable handoff record.

No single person should approve an exception and perform the corresponding destructive handoff. For enterprise-managed devices, the device owner’s organization and device-owner policy take precedence over an individual operator request.

## Standard pre-flash sequence

1. Confirm the authorization record, operator identity, owner identity, target device ID, purpose, and change or incident ticket.
2. Collect bootloader and verified-boot state. Record manufacturer, model, product, bootloader version, Android release, SDK, security patch, flash-lock state, vbmeta state, verity mode, verified-boot state, and OEM-unlock state.
3. Match the device against the exact organization-approved supported-model profile. Similar model names, regional variants, carrier variants, and chipset siblings are not substitutes.
4. Validate the recovery or firmware manifest, including artifact identifier, version, exact supported profile IDs, SHA-256, signer, key ID, signature, and artifact path.
5. Confirm the artifact hash from the local file and verify the signature against the offline trust set. Confirm that the signer and trust anchor are current.
6. Obtain visible owner confirmation of the exact artifact, expected data loss, and intended recovery. Confirm a verified backup or document an approved backup exception.
7. Check enterprise or device-owner status. If managed, stop and use the organization’s documented recovery process.
8. Run `recovery:cli validate`. A `ready-for-authorized-handoff` result only authorizes transfer to the official OEM or lab process. It does not authorize a flash operation inside Droid Commander.

## Failure triage matrix

| Failure | Immediate response | Evidence to retain | Permitted disposition | Prohibited override |
|---|---|---|---|---|
| Model, product, or profile unsupported | Stop. Recollect identity and confirm the exact registry entry. | Raw boot-state report, profile version, photos or serial record if policy allows | Update the organization profile through engineering review, then rerun validation | Treating a similar model as compatible |
| Artifact hash mismatch | Quarantine the artifact and reacquire it from the approved source. | Expected hash, observed hash, file metadata, acquisition record | Reissue or replace the artifact, then validate again | Proceeding because the image “looks right” |
| Signature invalid, signer untrusted, or key expired | Stop the handoff. Contact the signing authority through an approved offline channel. | Manifest, signature result, issuer/key ID, trust-set version | Obtain a newly signed artifact or formally rotate the trust anchor | Skipping or manually marking signature verification successful |
| Artifact not approved for the exact profile | Stop and find the model-specific artifact. | Manifest profile IDs and device profile ID | Engineering may approve a new artifact through normal release governance | Substituting a neighboring model or removing profile checks |
| Owner confirmation missing | Pause the case. Do not unlock or flash. | Owner identity, consent status, timestamp | Obtain visible owner confirmation or use OEM repair/recovery | Treating a ticket or operator statement as owner consent |
| Backup missing or incomplete | Keep the source unchanged. | Backup scope, result, destination, verification result | Independent approver may document a backup exception only when policy permits and the owner accepts irreversible loss | Hiding the missing backup or deleting the source first |
| Enterprise or device-owner managed | Stop generic handoff. | Management state and organization contact | Route to the enrolled organization’s recovery process | Individual operator override |
| OEM unlock disallowed | Stop and contact the OEM or authorized administrator. | OEM-unlock state and device identity | Follow the official eligibility process, if available | Exploiting or bypassing the restriction |
| OEM unlock state unknown | Treat as blocked. Recollect using a supported build or OEM tool. | Property values and collection limitations | Resolve through official documentation or lab diagnostics | Assuming unknown means allowed |
| Verified boot red or integrity anomaly | Stop and isolate the device. | Verified-boot state, vbmeta/verity values, acquisition history | Escalate to security or forensic review | Continuing because the recovery image is signed |
| Verified boot unknown | Stop until state is explained. | Raw properties and reason unavailable | Resolve collection support on the exact model | Treating unknown as green |
| Hardware, cable, display, or button failure | Preserve the device and use owner-approved repair or input assistance. | Hardware symptoms and session events | OEM repair or an authorized lab handoff | Using the failure to bypass authentication |
| CLI, trust-set, or state-file corruption | Stop; preserve the original files. | Hashes and file permissions, error output | Restore from a known-good offline package and rerun all checks | Editing JSON to force a ready state |

## Override and exception procedure

An exception may address only a documented process prerequisite that policy allows an approver to waive, such as a backup exception when the owner accepts irreversible data loss. It may not waive cryptographic integrity, exact device compatibility, signer trust, enterprise ownership, authentication, or verified-boot concerns.

The primary operator creates an exception record containing the ticket, target ID, owner identity, artifact ID and hash, device profile, failure codes, reason, impact, proposed disposition, expiry, and evidence references. The owner signs or visibly confirms the risk. An independent approver reviews the record and either rejects it or authorizes a specific handoff to a named OEM or lab. The exception must be signed or otherwise verifiable offline by the organization’s trust process and must expire at the end of the maintenance window.

Droid Commander should preserve the original blocked readiness result and append the exception as a separate audit event. The exception must not modify the readiness result or remove a failure code. The authorized technician must independently verify the same artifact and device identity immediately before any destructive operation. If any artifact, device, consent, or integrity fact changes, the exception is invalid and the process returns to preflight.

There is no override for a hash mismatch, invalid or untrusted signature, wrong or unknown model, enterprise-management restriction, missing owner consent, authentication bypass request, or verified-boot integrity anomaly. Those cases require correction, reissuance, authorized organizational recovery, OEM service, or forensic escalation.

## Monitoring and failure recovery

Use the recovery monitor to record the operator’s reported stage without issuing device commands:

```bash
pnpm recovery:cli -- status --state .droidcmd-recovery/monitor.json --json
pnpm recovery:cli -- advance --state .droidcmd-recovery/monitor.json --to failed --note "Artifact verification failed; device preserved"
```

A failure, disconnect, unexpected reboot, wrong-model warning, or ambiguous screen must move the record to `failed`. Do not retry from an unknown stage. Preserve the source device, artifact, state file, logs, owner confirmation, and physical evidence. A retry requires a new review of the artifact hash, device state, owner consent, and backup status.

The normal successful monitoring path is `handoff-ready` → `operator-confirmed` → `bootloader` → `recovery` → `verification` → `complete`. Each state transition requires a timestamped operator note. A `complete` state means the operator recorded post-handoff verification; it is not proof that an image was installed by Droid Commander.

## Minimum closeout record

Closeout should contain the target ID, source and destination custody, operator and approver, owner confirmation, ticket, artifact ID, expected and observed hashes, signer and trust-set version, device profile and boot-state report, backup result or exception, all failure and override records, state history, final verification result, and next action. Do not store PINs, patterns, biometric data, private keys, recovery codes, passwords, or arbitrary shell commands.

Implementation references: `lib/boot-state.ts`, `lib/recovery-readiness.ts`, `scripts/recovery-readiness-cli.ts`, `RECOVERY_READINESS_CLI.md`, and `BOOT_STATE_COLLECTION.md`.
