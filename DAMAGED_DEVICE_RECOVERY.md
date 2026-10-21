# Damaged-device recovery

Droid Commander does not bypass a PIN, pattern, fingerprint, face authentication, lock screen, encryption, or Android trust boundary. A damaged display, failed buttons, or broken biometric sensor does not change that boundary. Root access also does not make it safe or appropriate for this application to defeat the lock screen.

The recovery planner identifies safe alternatives:

- Owner-entered external input, when compatible USB host hardware is available. The owner enters the credential directly into Android; Droid Commander does not receive, log, or store the PIN, pattern, or biometric data.
- Authorized ADB diagnostics only when ADB was already authorized by the target and the device is unlocked. The app does not approve ADB or bypass the RSA trust prompt.
- Owner-witnessed backup through the normal Android or OEM path when the device is unlocked.
- Existing enterprise or device-owner recovery configured before the incident.
- OEM or authorized repair for display, button, or biometric hardware failure.
- Official Android/OEM factory reset with a separate destructive confirmation. This is a data-destroying recovery action, not a data-recovery or authentication-bypass method.

The planner is implemented in `lib/damaged-device-recovery.ts` and covered by `tests/damaged-device-recovery.test.ts`. Every recovery action is bound to the target ID and requires visible owner confirmation. The application must preserve the credentials and secrets inside Android’s own authentication surface.

## Owner-witnessed transfer checklist

Use this checklist only after the owner has unlocked the device through Android’s normal authentication surface. The owner should remain physically present for the complete transfer and should confirm the source and destination identifiers before any copy begins.

1. Record the owner’s identity, authorization record, source device ID, destination device ID, date, transfer purpose, and selected transfer method. Do not record the PIN, pattern, biometric data, recovery code, or encryption key.
2. Inspect the damaged-device profile and record which display, touch, button, USB, and biometric components are unavailable. Attach photos or repair ticket references only when the organization’s evidence policy allows them.
3. Connect the owner-approved external display or input device, if needed. The owner enters the credential directly into Android. Droid Commander may observe only the resulting lock state and connection status; it must not capture keystrokes, screen contents, or biometric material.
4. Confirm that Android reports the source device as unlocked. If the device remains locked, stop the transfer and use OEM repair, preconfigured enterprise recovery, or an official recovery path instead.
5. Select the transfer scope with the owner. Prefer Android Backup, OEM migration, or a direct owner-approved file transfer. Keep application data, private keys, and protected credential stores excluded unless the platform’s own transfer flow explicitly supports them.
6. Confirm destination capacity, destination identity, encryption state, and available network or USB transport. Record the transfer tool and version.
7. Start the transfer only after the owner confirms the exact scope and destination. Record a session ID, start time, item counts where available, and transport interruptions. Never copy authentication secrets into Droid Commander logs.
8. On completion, disconnect the source only after Android and the transfer tool report a clean close. Keep the source device powered and unchanged until verification is complete.

## Post-unlock transfer verification

Verification must be performed on the destination through its normal owner-authenticated interface. Compare the source and destination manifests when the transfer tool provides them. At minimum, record whether the expected contacts, photos, documents, messages, application list, and selected settings are present. For files, compare names, sizes, and cryptographic hashes for a representative sample or the complete set when the tool supports it.

The owner should open representative files and applications on the destination and confirm that the content is readable. Re-authenticate accounts through their official sign-in or migration flow rather than copying passwords, tokens, or private keys into the app. Confirm that screen lock, encryption, security patch level, backup policy, and enterprise enrollment on the destination meet the organization’s baseline.

Record verification results as `verified`, `partially-verified`, or `failed`, including missing categories, hash mismatches, interrupted transfers, and the next owner-approved action. A failed verification must not trigger deletion or factory reset of the source. Preserve the source until the owner or authorized custodian approves a second transfer, repair, or official reset.

The transfer checklist does not authorize lock-screen bypass, credential extraction, hidden ADB approval, decryption, or forensic acquisition from a locked device. Those cases require an authorized OEM, enterprise, or forensic provider using a documented legal and technical process.
