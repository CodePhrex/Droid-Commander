# Consent-gated remediation runner

Droid Commander now has a remediation runner for approved troubleshooting and confirmation workflows. It does not execute arbitrary exploit payloads, shell commands, remote code, lock-screen bypasses, package injection, or sandbox escapes. A catalog CVE is evidence for selecting a reviewed playbook; it is not an instruction to execute unreviewed code.

## Supported playbook steps

The runner accepts only four typed step kinds:

- `safe-proof-check`: a non-invasive check that confirms whether the observed condition is present.
- `setting-change`: a reviewed, bounded setting change with a before-state and rollback token.
- `application-fix`: an organization-approved application remediation with a rollback token when supported.
- `system-patch-handoff`: opens the Android or vendor update flow and records that the operating system must show its own confirmation.

Every step must be listed in the signed exercise authorization’s allowed kinds. Unknown or arbitrary exploit steps are rejected before execution.

## Consent and rollback

A remediation plan carries an exact finding ID, CVE reference when available, target ID, purpose, authorization ID, reviewed steps, and a previously approved two-party consent request. The runner calls `TwoPartyConsentGate.execute()` immediately before starting. The approval is consumed before the first step so it cannot be replayed.

The runner journals plan acceptance, step start and completion, failures, automatic rollback, manual rollback, and final state. If a later step fails, completed reversible steps are rolled back in reverse order. If any rollback fails, the run is marked `rollback-partial` and requires operator review. A manual rollback requires a separate operator-and-client consent request.

System patching is deliberately an OS handoff. The app does not silently install, downgrade, or replace Android system images. Android and the device manufacturer own the update confirmation and rollback capability. The runner records the handoff and verification result; it does not claim that every vendor patch is reversible.

## Implementation

- Runner: `lib/remediation-runner.ts`
- Tests: `tests/remediation-runner.test.ts`
- Consent gate: `lib/two-party-consent.ts`

A production adapter must bind each `actionId` to a reviewed native implementation, capture target and authorization checks again at execution time, and persist the journal in the organization’s audit store. A catalog match alone is never sufficient authority to change a target.
