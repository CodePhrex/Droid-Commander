# Droid Commander — cooperative USB OTG session protocol

## Scope and non-goals

This protocol is for two devices that both run a cooperative Droid Commander companion. One device is the **controller** and the other is the **target**. It is an application-level protocol carried over a compatible USB OTG/host path; it is not ADB, not a general Android administration channel, and not a privilege escalation path.

The target companion must explicitly opt in. The protocol exchanges only typed, allow-listed training messages. It must not transport exploit payloads, arbitrary shell commands, arbitrary code, lock-screen bypass requests, credential collection, or requests to read another app’s private data. A connected cable never substitutes for target consent, exercise authorization, or Android platform permissions.

The implementation skeleton is `lib/usb-session.ts`. It models protocol state, frame sequencing, replay protection, authenticated frames, action allow-lists, clock skew, heartbeat timeout, consent revocation, and controlled teardown. It intentionally does not implement USB device discovery or cryptography; those belong to a native adapter and a reviewed platform crypto implementation.

## Roles and transport assumptions

The controller initiates an exercise after personnel credential validation, exercise authorization, target binding, and local audit creation. The target companion displays the proposed scope and waits for the target owner or designated administrator to confirm. The two apps then exchange protocol messages over a USB path selected by the platform. The native adapter must report whether the controller supports USB host mode, whether a target permission was granted, and whether the target exposes the expected cooperative interface.

The app must gracefully report unsupported hardware, incompatible USB roles, missing permission, disconnection, and protocol mismatch. It must never attempt to reconfigure the target’s USB role or fall back to ADB without a separate, visible ADB approval path.

## Protocol version and frame envelope

Protocol version `1` uses a bounded frame envelope. The native transport may encode this envelope as a binary or structured representation, but both sides must validate the same logical fields:

```text
protocolVersion: 1
sessionId: opaque random session identifier
messageType: allow-listed message type
seq: monotonically increasing integer per direction
sentAt: ISO-8601 timestamp
nonce: unique per frame and session
payload: typed message body
transcript or frame authentication tag
```

The default maximum frame is 64 KiB. The implementation should set a smaller profile limit when the target only needs posture facts. Payloads must be bounded, schema-validated, and rejected when unknown fields would change the meaning of an action. The protocol must not accept an unbounded string as an instruction.

Every frame is bound to the session ID, protocol version, direction, sequence, nonce, and transcript. Each side rejects a repeated nonce, a repeated or out-of-order sequence, a stale timestamp outside the configured clock-skew window, an invalid authentication tag, or a frame for another session.

## Handshake

### 1. Discovery

The controller detects a candidate USB connection and confirms the native capability report. It creates a fresh session ID and controller nonce. No active target action is available in this state.

### 2. Hello exchange

Both devices exchange `hello` messages containing role, app/protocol version, device identifier reference, supported capabilities, and a digest of the approved exercise authorization. Raw license material and private credentials are not sent over the USB channel.

The target compares the authorization digest, target identifier, and permitted action categories with its local consent screen. Any mismatch moves the session to `blocked`.

### 3. Challenge and authentication

Each side sends a fresh challenge. The peers authenticate the handshake transcript using an organization-approved mechanism and platform cryptography. The exact key agreement and signature algorithm are deployment decisions and must be implemented using vetted platform APIs or a reviewed library. No static shared secret should be embedded in the APK.

The target must prove possession of the expected companion identity, and the controller must prove that it is operating inside an admitted local session. Authentication is not authorization: it only establishes peer identity for the next gate.

### 4. Visible consent

The target shows the target identifier, controller identifier, exercise purpose, allowed actions, start/end time, and a statement that the session cannot bypass Android protections. The target owner confirms. The controller also records its operator authorization context. The peers exchange a `consent` message and a `capabilities` message.

### 5. Session open

After both consent messages are positive, the controller sends `session-open` with the session ID, approved action digest, expiry, and audit session reference. The target confirms the same values. Both sides enter `established` only after local checks pass.

## Allow-listed message types

Only these message types are defined for version 1:

- `hello`: role, version, capability summary, and authorization digest.
- `challenge`: fresh nonce and transcript reference.
- `consent`: granted/revoked state plus consent timestamp and display version.
- `capabilities`: USB and companion capability facts; no claims beyond the source API.
- `session-open`: bounded scope, expiry, action digest, and audit reference.
- `action-request`: one action from the signed session allow-list.
- `action-result`: structured result, observation source, confidence, and limitation.
- `heartbeat`: liveness only; it carries no action.
- `close`: controlled close reason.
- `error`: machine-readable protocol error without sensitive payloads.

Version 1 training actions should be limited to `read-posture`, `read-capabilities`, `simulate-remediation`, and `verify-posture`. Any future setting change must be a separately named action with additional confirmation and device-policy capability checks. `install-package`, `run-shell`, `execute-code`, `bypass-lock`, and equivalent actions are not valid message actions.

## Session state machine

```text
disconnected
  -> discovering
  -> awaiting-consent
  -> established
  -> closing
  -> closed
```

The session moves to `blocked` on an identity mismatch, authorization digest mismatch, invalid authentication, replay, clock-skew violation, oversized or malformed frame, action outside the allow-list, or an untrusted capability claim. It moves to `closing` on consent revocation, heartbeat timeout, explicit close, or transport error. A closed or blocked session cannot resume; a new session ID and fresh consent are required.

The heartbeat interval and timeout are deployment policy. A missed heartbeat must stop active transport and preserve an incomplete audit event. The controller must not silently retry with another target, broader permissions, or a new action list.

## Action-request rules

An `action-request` contains exactly one allow-listed action, a request ID, a bounded parameter object, and the current session expiry. The target validates the action again; it does not trust the controller’s earlier check. The target returns an `action-result` containing status, source, confidence, limitations, and a result digest.

The target must reject a request when the action is not in the signed session scope, the request is expired, the target consent is no longer active, the required native capability is unavailable, or the requested result would require access beyond the companion’s permitted Android APIs. An unavailable observation must be reported as `unavailable` or `review`, not `clear`.

## Teardown and audit behavior

On disconnect, target consent revocation, owner lock where policy requires re-consent, heartbeat timeout, credential or authorization expiry, or any protocol error, both sides stop sending action messages and record an end event. The report records session ID, target ID, operator and authorization references, consent timestamp, message counts, last accepted sequence, close reason, findings, limitations, and whether the session completed or was incomplete.

Sensitive payloads, raw credentials, private app data, and authentication secrets must not be written to logs. The report stores identifiers, digests, and machine-readable outcomes. Partial results remain clearly marked as partial.

## Native adapter boundary

The native layer must expose only: USB role/capability detection, permission state, connection/disconnection callbacks, bounded byte transport, and platform-secure cryptographic primitives. The JavaScript or shared policy layer owns state transitions, allow-lists, audit events, and decision codes. Any native adapter that returns privileged-looking data without a source and capability record fails compliance review.

## Test requirements

`tests/usb-session.test.ts` covers handshake gating, authenticated frame acceptance, pre-establishment rejection, session mismatch, replay and ordering, action allow-list enforcement, frame authentication failure, clock skew, consent revocation, heartbeat timeout, post-disconnect restart requirements, and frame-size limits. Native tests must add at least one OTG-capable pair, one unsupported host, one missing target permission case, one incompatible protocol case, one consent-revocation case, and one physical disconnection during an active read-only action.

## Official platform references

- Android USB host overview: https://developer.android.com/develop/connectivity/usb/host
- Android USB accessory overview: https://developer.android.com/develop/connectivity/usb/accessory
- Android Debug Bridge authorization: https://developer.android.com/tools/adb
