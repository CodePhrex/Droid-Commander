# Two-party high-security consent

High-security operations now require two independent manual approvals. The operator is verified first, then the client or target owner receives an exact prompt describing the operation, target, purpose, risk, operator, expiry, and one-time challenge. Execution is unavailable until both approvals succeed.

The client must type the displayed challenge and confirm the exact request digest. A changed target, operation, purpose, risk summary, client identity, or challenge invalidates the approval. The consent request expires quickly, records every transition, and can be consumed only once. A failed execution is still consumed and is not silently retried under the same approval.

The gate does not replace personnel credential validation, exercise authorization, target consent, Android permissions, device-owner policy, or transport authentication. It is an additional high-security step. It cannot widen scope or authorize a target that the existing policy layers rejected.

## Flow

1. Create a request with an explicit operation, exact target ID, human-readable purpose, risk summary, operator ID, client ID, one-time challenge, and expiry.
2. Verify the operator against the existing credential and approval systems. The verification must reference the exact request digest.
3. Display the client prompt. The client reviews the exact target and operation, then types the challenge and explicitly approves or denies.
4. Execute through `TwoPartyConsentGate.execute()`. This transitions the request to `consumed` before the operation starts, preventing replay.
5. Record completion or failure in the audit sink.

The reusable prompt is `components/high-security-consent-prompt.tsx`. It intentionally uses a visible summary and typed challenge rather than a single ambiguous confirmation button.

## Implementation boundary

- Policy gate: `lib/two-party-consent.ts`
- Tests: `tests/two-party-consent.test.ts`
- UI prompt: `components/high-security-consent-prompt.tsx`

The current implementation provides the approval primitive and prompt. A production operation must call `execute()` immediately before the high-security action and must pass the approved request through the normal credential, target, device, and transport checks as well.
