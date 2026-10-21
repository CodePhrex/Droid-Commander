# USB binary command channel

`lib/usb-command-channel.ts` is the command layer above the native `UsbManager` connection. It uses the existing typed binary codec and native base64 bridge events.

## Transmission flow

1. The caller provides a 16-byte established-session ID.
2. The caller provides a platform-backed authenticator; commands cannot be sent without one.
3. `sendAction()` encodes only the existing safe action allow-list.
4. The channel creates a fresh per-frame nonce and monotonic sequence.
5. The channel encodes an `action-request` packet with a zeroed tag for authentication input.
6. The authenticator returns exactly 16 tag bytes.
7. The channel re-encodes the packet with that tag and calls the native bridge `sendPacket()`.
8. A native `send-rejected` result becomes a typed `SEND_REJECTED` error.

The channel never supplies a default tag, never uses `Math.random()` for nonces, and never accepts arbitrary command strings.

## Response flow

Native `bytes-received` events carry base64 bytes. The channel decodes the packet, checks the session ID, requires message type `action-result`, and parses:

```text
requestId:   u32
status:      u8 (1=ok, 2=denied, 3=failed, 4=invalid)
detailSize:  u16
 detail:     UTF-8 text, at most 4096 bytes
```

Malformed base64, truncated frames, wrong-session responses, non-result packets, and invalid response payloads are reported through `onError()` and are not delivered to response listeners.

The current channel intentionally keeps cryptographic verification at the injected session-authenticator boundary. Production wiring must connect that boundary to the established consented session and platform-backed cryptography before enabling active commands.

## Safe actions

The only serializable actions remain:

- `read-posture`
- `read-capabilities`
- `simulate-remediation`
- `verify-posture`

There is no shell command, arbitrary package operation, exploit payload, lock-screen operation, or unrestricted parameter map in this channel.

## Example integration shape

```ts
const channel = new UsbCommandChannel(
  {
    sendPacket: nativeUsbHost.sendPacket,
    addUsbHostListener: nativeUsbHost.addUsbHostListener,
  },
  {
    sessionId,
    authenticate: (unsignedFrame) => establishedSessionSigner.sign(unsignedFrame),
  },
);

channel.onResponse((result) => report.append(result));
channel.onError((error) => audit.record(error));
await channel.sendAction({ requestId: 7, action: "read-posture" });
```

The USB Link screen currently owns discovery, permission, and transport lifecycle. The command channel should be constructed only after the higher-level consented session reaches its established state; a connected USB interface alone is not sufficient authority.
