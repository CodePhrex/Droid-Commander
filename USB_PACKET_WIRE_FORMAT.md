# Droid Commander — USB packet framing and binary command serialization

## Purpose and boundary

This specification defines the version-1 binary wire format carried by the native USB Host adapter. It serializes the already-approved cooperative session protocol; it does not grant authority, implement ADB, or create a general command channel. The session manager remains responsible for authorization, consent, action scope, replay policy, and teardown. The native crypto layer is responsible for producing and verifying the authentication tag.

The reference implementation is `lib/usb-wire.ts`. It is transport-agnostic and can be used by the Kotlin bridge after converting Kotlin `ByteArray` values to the Expo bridge representation.

## Packet layout

All multi-byte integers are unsigned big-endian. The fixed header is 57 bytes:

| Offset | Size | Field | Rule |
|---:|---:|---|---|
| 0 | 2 | Magic | `0x44 0x43` (`DC`) |
| 2 | 1 | Version | `1` |
| 3 | 1 | Message type | Allow-listed numeric code |
| 4 | 1 | Flags | Reserved for negotiated, reviewed flags |
| 5 | 2 | Header length | Must equal `57` |
| 7 | 16 | Session ID | Opaque session binding |
| 23 | 4 | Sequence | Per-direction unsigned 32-bit sequence |
| 27 | 8 | Timestamp | Milliseconds since Unix epoch, high word then low word |
| 35 | 16 | Nonce | Unique per frame and session |
| 51 | 4 | Payload length | Exact payload byte count |
| 55 | 1 | Auth-tag length | Must equal `16` in version 1 |
| 56 | 1 | Reserved | Must be zero when emitted |
| 57 | variable | Payload | Typed message body |
| after payload | 16 | Auth tag | Opaque crypto output |

The maximum packet is 64 KiB, including header and authentication tag. The default maximum payload is therefore 65,447 bytes. Deployments should use a smaller profile limit for posture observations. A receiver must reject truncation, extra bytes, length mismatch, unknown version/type, invalid fixed-field sizes, and unsupported authentication-tag length before dispatching a payload.

The serializer does not verify the cryptographic tag; it preserves the tag for the reviewed native crypto layer. The authenticated data must cover the complete header, payload, direction, and session transcript. A tag failure rejects the packet and blocks the session.

## Message type codes

| Code | Type |
|---:|---|
| 1 | `hello` |
| 2 | `challenge` |
| 3 | `consent` |
| 4 | `capabilities` |
| 5 | `session-open` |
| 6 | `action-request` |
| 7 | `action-result` |
| 8 | `heartbeat` |
| 9 | `close` |
| 10 | `error` |

Unknown codes are rejected. Version 1 does not define an escape or vendor-specific command code.

## Binary action-request payload

An `action-request` payload is deliberately small and fixed-schema:

```text
requestId:      u32
commandCode:    u8
[when needed]
parameterBytes: u16
findingId:      UTF-8 bytes
```

The allow-listed command codes are:

| Code | Action | Parameters |
|---:|---|---|
| 1 | `read-posture` | None |
| 2 | `read-capabilities` | None |
| 3 | `simulate-remediation` | `findingId`, 1–1024 UTF-8 bytes |
| 4 | `verify-posture` | `findingId`, 1–1024 UTF-8 bytes |

A read-only command must have exactly five payload bytes (`u32` request ID plus `u8` command code). Parameterized commands must have an exact length match. Invalid UTF-8, empty identifiers, unknown commands, trailing bytes, and arbitrary fields are rejected.

Version 1 intentionally does not serialize `run-shell`, package installation, lock-screen operations, arbitrary code, exploit payloads, or unrestricted parameter maps. Any future action requires a new reviewed command code, a matching target-side allow-list, a separate authorization category, and new tests.

## Binary action-result payload

An `action-result` payload uses the matching request ID and a bounded detail string:

```text
requestId:   u32
status:      u8 (1=ok, 2=denied, 3=failed, 4=invalid)
detailSize:  u16
detail:      UTF-8 bytes, 0–4096 bytes
```

The response parser rejects unknown statuses, invalid UTF-8, detail-length mismatches, and detail strings larger than 4096 bytes. Response frames must also match the active session ID before the result is delivered to the command layer.

## Stream reassembly and dispatch

USB bulk transfers are transport chunks, not packet boundaries. The native adapter must accumulate bytes until at least the five-byte prefix needed to read the header length and payload length, then wait for the exact packet length. It must enforce the maximum before allocating a buffer. After a complete packet is decoded, it passes through authentication and session-state validation before command dispatch.

The receiver must not scan indefinitely for a magic sequence after malformed data. A malformed or length-invalid packet should emit a protocol error, close the connection, and require a fresh session. Partial data at disconnect is discarded and recorded as an incomplete transport event.

## Kotlin bridge mapping

The Kotlin adapter already exposes bounded `ByteArray` send/receive events. The Expo bridge should pass the bytes to a JavaScript/native serializer without converting them to arbitrary JSON commands. The bridge must preserve byte values exactly and must not silently UTF-8 decode a binary packet.

The JavaScript policy layer should:

1. decode and length-check the packet;
2. verify the authentication tag through the native crypto boundary;
3. compare session ID, sequence, nonce, timestamp, and action scope;
4. decode the typed command;
5. dispatch only the resulting allow-listed action;
6. encode a typed result packet with a fresh sequence and nonce.

## Test requirements

`tests/usb-wire.test.ts` covers packet round-trip, parameterized and parameterless action round-trips, unsupported commands, malformed parameter lengths, invalid UTF-8, bad magic/version/tag length, truncation, inconsistent total lengths, fixed-field size errors, oversized payloads, and big-endian encoding. Native tests must additionally cover chunked stream reassembly, tag failure, duplicate nonce, sequence gap, and disconnect during a partial packet.
