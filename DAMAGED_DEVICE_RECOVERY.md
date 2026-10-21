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
