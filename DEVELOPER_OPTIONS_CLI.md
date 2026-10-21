# Transparent developer-options CLI

The `developer:cli` command has two separate responsibilities. It can toggle Droid Commander’s own time-limited operator diagnostic session, and it can inspect or create a visible request for Android Developer Options changes. It never pretends that a request changed Android settings.

Inspect a previously collected native debug-state record:

```bash
pnpm developer:cli -- inspect \
  --debug-state debug-state.json \
  --json
```

Activate Droid Commander’s local diagnostic session:

```bash
pnpm developer:cli -- activate \
  --operator operator-001 \
  --organization org-001 \
  --session session-001 \
  --reason "Approved diagnostics for device analysis" \
  --minutes 15 \
  --capability collect-diagnostics \
  --state .droidcmd-developer/state.json \
  --json

pnpm developer:cli -- deactivate \
  --state .droidcmd-developer/state.json \
  --reason "Diagnostics complete" \
  --json
```

Create an explicit system-settings handoff request:

```bash
pnpm developer:cli -- request-system-toggle \
  --target enabled \
  --device device-001 \
  --operator operator-001 \
  --reason "USB debugging needed for approved lab diagnostics" \
  --confirm "I UNDERSTAND" \
  --output .droidcmd-developer/request.json \
  --json
```

The handoff request records the requested state, operator, device, reason, timestamp, and the facts that no settings mutation or ADB invocation occurred. The operator or device owner must then review and make any permitted change visibly in Android Settings. Enterprise policy, Android permissions, and device-owner controls still apply.

The CLI does not silently toggle Developer Options, USB debugging, wireless debugging, OEM unlocking, root, arbitrary shell access, packages, bootloaders, or flashing. It does not accept a hidden override or treat operator intent as proof that Android granted the setting.

Implementation: `scripts/developer-options-cli.ts`. The app-level session policy is in `lib/operator-developer-mode.ts`; native read-only inspection and the visible Developer Options handoff are exposed by the local Expo module. Tests are in `tests/developer-options-cli.test.ts`.
