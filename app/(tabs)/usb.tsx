import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ServiceHandoffPanel } from "@/components/service-handoff-panel";
import { palette } from "@/constants/commander";
import {
  addUsbHostListener,
  close as closeUsbHost,
  connect as connectUsbHost,
  getUsbDiagnostics,
  isUsbHostAvailable,
  requestPermission as requestUsbPermission,
  startDiscovery,
  type UsbDeviceDescriptor,
  type UsbDiagnostics,
  type UsbHostEvent,
} from "expo-droid-commander-usb-host";
import { recordUsbPermissionEvent, USB_PERMISSION_EVENT_TYPES, type UsbPermissionEventType } from "@/lib/usb-permission-audit";
import { createNativeUsbCommandChannel } from "@/lib/native-usb-command-channel";
import type { UsbCommandChannel } from "@/lib/usb-command-channel";
import type { ActionResult } from "@/lib/usb-wire";
import { DeviceOperationRouter } from "@/lib/device-operation-router";
import {
  UsbSessionManager,
  type UsbSessionEvent,
  type UsbSessionState,
} from "@/lib/usb-session";

type LinkState = "idle" | "scanning" | "connected";
type PermissionState = "not-requested" | "granted";
type DiagnosticsStatus = "not-checked" | "available" | "unavailable";

type SessionBinding = {
  authenticate: (unsignedFrame: Uint8Array) => Promise<Uint8Array>;
  verify: (frame: unknown) => Promise<boolean>;
};

type UsbDevice = {
  id: string;
  nativeDeviceId: number;
  name: string;
  descriptor: string;
  interfaceLabel: string;
  permission: PermissionState;
  signal: string;
};

const USB_PROFILE = {
  // Replace these placeholders with the organization-approved companion IDs.
  vendorIds: [0x1234],
  productIds: [0x5678],
  interfaceClass: 0xff,
};
const USB_PROFILE_CONFIGURED = false;

const SESSION_POLICY = {
  allowedActions: ["read-posture", "read-capabilities", "simulate-remediation", "verify-posture"],
  maxFrameBytes: 64 * 1024,
  heartbeatTimeoutMs: 30_000,
  clockSkewMs: 120_000,
};

// Replace these scaffold identifiers with the authenticated operator and verified
// organization profile when the identity provider is connected.
const USB_AUDIT_CONTEXT = {
  operatorId: "operator.local-session",
  organizationId: "org.placeholder.configure-me",
};

function deviceFromDescriptor(descriptor: UsbDeviceDescriptor): UsbDevice {
  return {
    id: descriptor.deviceName,
    nativeDeviceId: descriptor.deviceId,
    name: `Approved companion #${descriptor.deviceId}`,
    descriptor: `USB ${descriptor.vendorId.toString(16).padStart(4, "0")}:${descriptor.productId.toString(16).padStart(4, "0")} · native allow-list`,
    interfaceLabel: `${descriptor.interfaceCount} interface${descriptor.interfaceCount === 1 ? "" : "s"} · bulk policy`,
    permission: descriptor.permissionGranted ? "granted" : "not-requested",
    signal: descriptor.permissionGranted ? "Permission granted" : "Permission required to open",
  };
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  if (!globalThis.crypto?.getRandomValues) return null;
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function describeNativeEvent(event: UsbHostEvent) {
  return event.type.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function countLabel(value: number | null) {
  return value === null ? "—" : value.toString().padStart(2, "0");
}

function usbId(value: number) {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

export default function UsbLinkScreen() {
  const [nativeAvailable] = useState(isUsbHostAvailable);
  const [linkState, setLinkState] = useState<LinkState>("idle");
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState(nativeAvailable ? "Host capability not checked · tap Scan to read Android USB Host state" : "Custom Android build required");
  const [diagnostics, setDiagnostics] = useState<UsbDiagnostics | null>(null);
  const [diagnosticsStatus, setDiagnosticsStatus] = useState<DiagnosticsStatus>("not-checked");
  const [auditWarning, setAuditWarning] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<UsbSessionState>("disconnected");
  const [sessionEvent, setSessionEvent] = useState<UsbSessionEvent | null>(null);
  const [commandReady, setCommandReady] = useState(false);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);

  const sessionRef = useRef<UsbSessionManager | null>(null);
  const channelRef = useRef<UsbCommandChannel | null>(null);
  // A production peer verifier and cryptographic binding must populate this
  // extension point. Native event text alone never establishes authentication.
  const bindingRef = useRef<SessionBinding | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionBytesRef = useRef<Uint8Array | null>(null);
  const requestIdRef = useRef(1);

  const selected = useMemo(() => devices.find((device) => device.id === selectedId) ?? null, [devices, selectedId]);
  const filteredDiagnostics = useMemo(() => {
    const approvedIds = new Set(devices.map((device) => device.nativeDeviceId));
    return diagnostics?.devices?.filter((device) => !approvedIds.has(device.deviceId)) ?? [];
  }, [devices, diagnostics]);
  const connected = linkState === "connected" && selected !== null;
  const authenticated = sessionState === "established";
  const hostFeatureLabel = !nativeAvailable
    ? "NATIVE BUILD REQUIRED"
    : diagnosticsStatus === "not-checked"
      ? "NOT CHECKED"
      : diagnostics?.featureUsbHost === true
        ? "SUPPORTED"
        : diagnostics?.featureUsbHost === false
          ? "UNSUPPORTED"
          : "UNAVAILABLE";
  const approvedMatchLabel = USB_PROFILE_CONFIGURED ? countLabel(devices.length) : "—";

  const publishSessionEvent = useCallback((event: UsbSessionEvent) => {
    setSessionEvent(event);
    setSessionState(event.state);
    setLastEvent(event.message);
  }, []);

  const closeProtocol = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;
    setCommandReady(false);
    const manager = sessionRef.current;
    if (manager && manager.state !== "closed" && manager.state !== "disconnected") {
      publishSessionEvent(manager.disconnect());
    } else {
      setSessionState("disconnected");
    }
    sessionRef.current = null;
    bindingRef.current = null;
    sessionIdRef.current = null;
    sessionBytesRef.current = null;
  }, [publishSessionEvent]);

  const createTransportSession = useCallback(() => {
    const bytes = randomBytes(16);
    if (!bytes) {
      setSessionState("blocked");
      setLastEvent("Secure randomness unavailable; authenticated session blocked");
      return;
    }

    const sessionId = hex(bytes);
    const manager = new UsbSessionManager({
      sessionId,
      now: () => new Date().toISOString(),
      policy: SESSION_POLICY,
      // Fail closed until the production peer-handshake verifier is injected.
      authenticator: { verify: async () => false },
    });

    sessionIdRef.current = sessionId;
    sessionBytesRef.current = bytes;
    sessionRef.current = manager;
    publishSessionEvent(manager.connect());
  }, [publishSessionEvent]);

  const installCommandChannel = useCallback(() => {
    const binding = bindingRef.current;
    const sessionBytes = sessionBytesRef.current;
    if (!binding || !sessionBytes || sessionRef.current?.state !== "established") {
      setCommandReady(false);
      return;
    }
    const channel = createNativeUsbCommandChannel({ sessionId: sessionBytes, authenticate: binding.authenticate });
    channel.onResponse((result) => setLastResult(result));
    channel.onError((error) => {
      setCommandReady(false);
      setLastEvent(`Command channel rejected a frame: ${error.code}`);
    });
    channelRef.current = channel;
    setCommandReady(true);
  }, []);

  useEffect(() => {
    const subscription = addUsbHostListener((event) => {
      const payload = typeof event.payload === "object" && event.payload !== null ? event.payload as Record<string, unknown> : {};
      const deviceName = typeof payload.deviceName === "string" ? payload.deviceName : null;

      if (USB_PERMISSION_EVENT_TYPES.includes(event.type as UsbPermissionEventType) && deviceName) {
        void recordUsbPermissionEvent({
          ...USB_AUDIT_CONTEXT,
          type: event.type as UsbPermissionEventType,
          deviceName,
        }).catch(() => {
          setAuditWarning("USB permission lifecycle event could not be recorded. The displayed permission state is informational; review the audit ledger before relying on it.");
          setLastEvent("USB event observed, but audit ledger write failed");
        });
      }

      if (event.type === "permission-granted") {
        setDevices((current) => current.map((device) => deviceName !== null && device.id === deviceName ? { ...device, permission: "granted", signal: "Permission granted" } : device));
      }
      if (event.type === "permission-denied" || event.type === "permission-rejected") {
        setDevices((current) => current.map((device) => deviceName !== null && device.id === deviceName ? { ...device, permission: "not-requested", signal: "Permission denied" } : device));
      }
      if (event.type === "connected") {
        setLinkState("connected");
        createTransportSession();
      }
      if (event.type === "session-established") {
        const binding = bindingRef.current;
        const manager = sessionRef.current;
        if (!binding || !manager || payload.sessionId !== sessionIdRef.current) {
          setLastEvent("Peer session claim ignored: matching authenticated verifier and crypto binding unavailable");
          return;
        }
        void binding.verify(payload).then((verified) => {
          if (!verified || sessionRef.current !== manager || bindingRef.current !== binding) return;
          const established = manager.establish();
          publishSessionEvent(established);
          if (established.state === "established") installCommandChannel();
        }).catch(() => {
          closeProtocol();
          setLastEvent("Peer-verifier failure; protocol session closed");
        });
        return;
      }
      if (event.type === "disconnected" || event.type === "connection-failed" || event.type === "transport-error") {
        closeProtocol();
        setLinkState("idle");
      }
      setLastEvent(describeNativeEvent(event));
    });
    return () => {
      subscription.remove();
      closeProtocol();
    };
  }, [closeProtocol, createTransportSession, installCommandChannel, publishSessionEvent]);

  const scan = async () => {
    if (!nativeAvailable) {
      setLastEvent("Native USB Host module unavailable · use a custom Android build");
      return;
    }
    setLinkState("scanning");
    setLastEvent("Reading Android USB Host capability and unfiltered inventory…");
    let inventory: UsbDiagnostics | null = null;
    try {
      inventory = await getUsbDiagnostics();
      setDiagnostics(inventory);
      setDiagnosticsStatus(inventory ? "available" : "unavailable");
    } catch {
      setDiagnostics(null);
      setDiagnosticsStatus("unavailable");
    }

    if (inventory?.featureUsbHost === false) {
      setDevices([]);
      setSelectedId(null);
      setLastEvent("Android reports USB Host unsupported; approved discovery was not started");
      setLinkState("idle");
      return;
    }

    try {
      const found = await startDiscovery(USB_PROFILE);
      if (!USB_PROFILE_CONFIGURED) {
        setDevices([]);
        setSelectedId(null);
        setLastEvent(inventory?.rawCount === null || inventory?.rawCount === undefined
          ? "USB profile NOT CONFIGURED · raw inventory could not be read"
          : `USB profile NOT CONFIGURED · ${inventory.rawCount} device${inventory.rawCount === 1 ? "" : "s"} enumerated; placeholder discovery is not treated as an approved match`);
        return;
      }
      const nextDevices = found.map(deviceFromDescriptor);
      setDevices(nextDevices);
      setSelectedId(nextDevices[0]?.id ?? null);
      setLastEvent(`Discovery complete · ${nextDevices.length} approved profile${nextDevices.length === 1 ? "" : "s"} found`);
    } catch {
      setLastEvent("Discovery failed · inspect native transport events");
    } finally {
      setLinkState("idle");
    }
  };

  const requestPermission = async () => {
    if (!selected || !nativeAvailable || !USB_PROFILE_CONFIGURED) return;
    setLastEvent("Waiting for Android owner-permission dialog…");
    const requested = await requestUsbPermission(selected.id);
    if (!requested) setLastEvent("Permission request rejected by native USB Host API");
  };

  const connect = async () => {
    if (!selected || selected.permission !== "granted" || !nativeAvailable || !USB_PROFILE_CONFIGURED) return;
    setLastEvent("Opening bounded native USB transport; authenticated session still required…");
    const opened = await connectUsbHost(selected.id);
    if (!opened) setLastEvent("Connection rejected · check permission and interface policy");
  };

  const requestConsent = () => {
    const manager = sessionRef.current;
    if (!manager || linkState !== "connected") return;
    publishSessionEvent(manager.requireConsent());
    setLastEvent("Scope displayed locally. Target cooperative protocol and authentication are unavailable; commands remain locked");
  };

  const sendReadPosture = async () => {
    const channel = channelRef.current;
    const device = selected;
    if (!commandReady || !channel || !device || sessionRef.current?.state !== "established") {
      setLastEvent("Typed commands require a configured target verifier and platform crypto binding");
      return;
    }
    const router = new DeviceOperationRouter({
      resolveAdapter: (scope) => scope.kind === "usb-peer" && scope.targetId === device.id && channelRef.current === channel && sessionRef.current?.state === "established" ? {
        scope: { kind: "usb-peer", targetId: device.id },
        handlers: { "read-posture": () => channel.sendAction({ requestId: requestIdRef.current++, action: "read-posture" }) },
      } : undefined,
    });
    const result = await router.execute({ scope: { kind: "usb-peer", targetId: device.id }, operationId: "read-posture" });
    if (result.status === "completed") {
      const sent = result.data as { sequence: number };
      setLastEvent(`Authenticated read-posture sent · sequence ${sent.sequence}; awaiting matching response`);
    } else {
      setLastEvent(result.reason);
    }
  };

  const disconnect = async () => {
    closeProtocol();
    await closeUsbHost();
    setLinkState("idle");
    setLastResult(null);
    setLastEvent("Connection closed · interface released and session invalidated");
  };

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>USB LINK // COOPERATIVE TRANSPORT</Text>
            <Text style={styles.title}>Device connections.</Text>
            <Text style={styles.subtitle}>Transport connection and authenticated exercise session are separate gates.</Text>
          </View>
          <View style={[styles.stateDot, connected && styles.stateDotConnected, authenticated && styles.stateDotAuthenticated]} />
        </View>

        <View style={styles.hostCard}>
          <View style={styles.hostTopRow}>
            <View style={styles.hostIcon}><Text style={styles.hostIconText}>↕</Text></View>
            <View style={styles.hostCopy}>
              <Text style={styles.hostLabel}>LOCAL USB HOST</Text>
              <Text style={styles.hostTitle}>{authenticated ? "Authenticated session active" : connected ? "Transport connected · session locked" : nativeAvailable ? diagnosticsStatus === "not-checked" ? "Host capability not checked" : `USB Host feature ${hostFeatureLabel.toLowerCase()}` : "Native build required"}</Text>
            </View>
            <View style={styles.readyPill}><Text style={styles.readyPillText}>{authenticated ? "AUTH" : connected ? "LINK" : nativeAvailable ? diagnosticsStatus === "not-checked" ? "CHECK" : hostFeatureLabel : "OFFLINE"}</Text></View>
          </View>
          <View style={styles.hostStats}>
            <View><Text style={styles.statLabel}>HOST FEATURE</Text><Text style={styles.statValue}>{hostFeatureLabel}</Text></View>
            <View><Text style={styles.statLabel}>ENUMERATED</Text><Text style={styles.statValue}>{diagnosticsStatus === "available" ? countLabel(diagnostics?.rawCount ?? null) : "—"}</Text></View>
            <View><Text style={styles.statLabel}>PROFILE</Text><Text style={styles.statValue}>{USB_PROFILE_CONFIGURED ? "CONFIGURED" : "NOT CONFIGURED"}</Text></View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={nativeAvailable ? "Read USB Host capability and inventory" : "Custom Android build required for USB scanning"} accessibilityState={{ disabled: linkState === "scanning" }} onPress={scan} disabled={linkState === "scanning"} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed, linkState === "scanning" && styles.disabled]}>
            <Text style={styles.scanButtonText}>{linkState === "scanning" ? "Scanning…" : nativeAvailable ? "Scan USB Host" : "Native build required"}</Text>
            <Text style={styles.scanButtonArrow}>↗</Text>
          </Pressable>
          <View style={styles.lastEventBox}><Text style={styles.eventLabel}>LAST EVENT</Text><Text style={styles.eventText} numberOfLines={2}>{lastEvent}</Text></View>
        </View>

        {auditWarning ? <View accessibilityRole="alert" style={styles.auditWarning}><Text style={styles.auditWarningLabel}>LIFECYCLE AUDIT WARNING</Text><Text style={styles.auditWarningText}>{auditWarning}</Text></View> : null}

        <View style={styles.diagnosticsCard}>
          <View style={styles.diagnosticsHeader}><View><Text style={styles.controlKicker}>READ-ONLY HOST ASSESSMENT</Text><Text style={styles.diagnosticsTitle}>{diagnosticsStatus === "not-checked" ? "Scan to check local USB Host" : diagnosticsStatus === "unavailable" ? "Host assessment unavailable" : `USB Host feature ${hostFeatureLabel.toLowerCase()}`}</Text></View><Text style={styles.diagnosticsBadge}>{diagnosticsStatus === "available" ? "READ ONLY" : "PENDING"}</Text></View>
          <Text style={styles.diagnosticsBody}>{diagnosticsStatus === "not-checked" ? "Module presence is not a hardware result. Scan reads Android's USB Host feature and attached-device inventory without opening a device or requesting permission." : "Android can enumerate attached USB devices before permission. Permission is required only to open an approved transport."}</Text>
          <View style={styles.diagnosticStats}>
            <View style={styles.diagnosticStat}><Text style={styles.diagnosticStatLabel}>HOST FEATURE</Text><Text style={styles.diagnosticStatValue}>{hostFeatureLabel}</Text></View>
            <View style={styles.diagnosticStat}><Text style={styles.diagnosticStatLabel}>ENUMERATED</Text><Text style={styles.diagnosticStatValue}>{diagnosticsStatus === "available" ? countLabel(diagnostics?.rawCount ?? null) : "—"}</Text></View>
            <View style={styles.diagnosticStat}><Text style={styles.diagnosticStatLabel}>APPROVED MATCHES</Text><Text style={styles.diagnosticStatValue}>{approvedMatchLabel}</Text></View>
          </View>
          {!USB_PROFILE_CONFIGURED ? <Text style={styles.profileWarning}>USB PROFILE: NOT CONFIGURED. Placeholder IDs are not treated as a universal or approved profile, so transport discovery and actions remain unavailable.</Text> : null}
          {diagnosticsStatus === "available" && diagnostics?.rawCount === 0 ? <Text style={styles.inventoryNotice}>No attached USB device was enumerated in this scan. This does not indicate a USB Host hardware failure.</Text> : null}
          {filteredDiagnostics.length > 0 ? <View style={styles.diagnosticList}>
            <Text style={styles.diagnosticListTitle}>{USB_PROFILE_CONFIGURED ? "FILTERED FROM APPROVED DISCOVERY" : "UNCONFIGURED INVENTORY"}</Text>
            {filteredDiagnostics.slice(0, 4).map((device) => <View key={device.deviceId} style={styles.diagnosticEntry}>
              <View style={styles.diagnosticEntryTop}><Text style={styles.diagnosticEntryId}>LOCAL ID #{device.deviceId}</Text><Text style={styles.diagnosticEntryFlag}>{USB_PROFILE_CONFIGURED ? "FILTERED" : "NOT CONFIGURED"}</Text></View>
              <Text style={styles.diagnosticEntryMeta}>VID {usbId(device.vendorId)} · PID {usbId(device.productId)} · device class {device.deviceClass}</Text>
              <Text style={styles.diagnosticEntryMeta}>Interface classes {device.interfaceClasses.length ? device.interfaceClasses.join(", ") : "none"} · bulk IN {device.bulkEndpoints.inputAvailable ? "yes" : "no"} · OUT {device.bulkEndpoints.outputAvailable ? "yes" : "no"} · pair {device.bulkEndpoints.inOutPairAvailable ? "yes" : "no"}</Text>
              <Text style={styles.diagnosticEntryPermission}>Permission {device.permissionGranted ? "granted" : "not granted"} · read-only diagnostic</Text>
            </View>)}
            {filteredDiagnostics.length > 4 ? <Text style={styles.inventoryNotice}>+ {filteredDiagnostics.length - 4} additional privacy-limited entries not shown</Text> : null}
          </View> : null}
        </View>

        <ServiceHandoffPanel />

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Approved companions</Text><Text style={styles.sectionMeta}>{USB_PROFILE_CONFIGURED ? `${approvedMatchLabel} MATCHES` : "NOT CONFIGURED"}</Text></View>
        {devices.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyMark}>○</Text><Text style={styles.emptyTitle}>{USB_PROFILE_CONFIGURED ? "No approved companion matched." : "Approved profile not configured."}</Text><Text style={styles.emptyBody}>{nativeAvailable ? USB_PROFILE_CONFIGURED ? "Attached hardware can be enumerated before permission. Permission is required only before opening a selected approved transport." : "The privacy-limited inventory above can show attached hardware, but organization-approved IDs must replace the placeholders before discovery, permission, or transport actions are enabled." : "Live discovery is unavailable in this preview. Use the custom Android development build."}</Text></View>
        ) : devices.map((device) => {
          const isSelected = device.id === selectedId;
          return (
            <Pressable key={device.id} accessibilityRole="button" accessibilityLabel={`${device.name}, ${device.permission === "granted" ? "permission granted" : "permission required"}`} accessibilityState={{ selected: isSelected }} onPress={() => setSelectedId(device.id)} style={({ pressed }) => [styles.deviceCard, isSelected && styles.deviceCardSelected, pressed && styles.pressed]}>
              <View style={[styles.deviceIcon, isSelected && styles.deviceIconSelected]}><Text style={[styles.deviceIconText, isSelected && styles.deviceIconTextSelected]}>▣</Text></View>
              <View style={styles.deviceBody}>
                <View style={styles.deviceTopRow}><Text style={styles.deviceName}>{device.name}</Text><View style={[styles.permissionPill, device.permission === "granted" && styles.permissionPillGranted]}><Text style={[styles.permissionText, device.permission === "granted" && styles.permissionTextGranted]}>{device.permission === "granted" ? "PERMITTED" : "UNVERIFIED"}</Text></View></View>
                <Text style={styles.deviceDescriptor}>{device.descriptor}</Text>
                <View style={styles.deviceMetaRow}><Text style={styles.deviceMeta}>{device.interfaceLabel}</Text><Text style={styles.deviceSignal}>{authenticated && isSelected ? "Authenticated" : connected && isSelected ? "Transport connected" : device.signal}</Text></View>
              </View>
              <Text style={styles.chevron}>{isSelected ? "⌃" : "⌄"}</Text>
            </Pressable>
          );
        })}

        {selected ? (
          <View style={styles.controlCard}>
            <View style={styles.controlHeader}><View><Text style={styles.controlKicker}>SELECTED TARGET</Text><Text style={styles.controlTitle}>{selected.name}</Text></View><Text style={styles.controlIndex}>{authenticated ? "04 / 04" : connected ? "03 / 04" : selected.permission === "granted" ? "02 / 04" : "01 / 04"}</Text></View>
            <View style={styles.stepRow}>
              <Step number="01" label="Discovered" complete />
              <Step number="02" label="Permission" complete={selected.permission === "granted"} />
              <Step number="03" label="Transport" complete={connected} />
              <Step number="04" label="Session" complete={authenticated} />
            </View>
            {!connected && selected.permission !== "granted" ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Request owner permission for the selected USB device" onPress={requestPermission} style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}><Text style={styles.controlButtonText}>Request owner permission</Text><Text style={styles.controlButtonArrow}>→</Text></Pressable>
            ) : !connected ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Open a bounded USB transport" onPress={connect} style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}><Text style={styles.controlButtonText}>Open bounded transport</Text><Text style={styles.controlButtonArrow}>→</Text></Pressable>
            ) : !authenticated ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Display session scope and await peer authentication" onPress={requestConsent} style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}><Text style={styles.controlButtonText}>Display scope & await peer</Text><Text style={styles.controlButtonArrow}>→</Text></Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Disconnect and invalidate the USB session" onPress={disconnect} style={({ pressed }) => [styles.disconnectButton, pressed && styles.pressed]}><Text style={styles.disconnectText}>Disconnect & invalidate session</Text><Text style={styles.disconnectArrow}>×</Text></Pressable>
            )}
          </View>
        ) : null}

        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}><View><Text style={styles.controlKicker}>SESSION CONTROL</Text><Text style={styles.sessionTitle}>{sessionState === "awaiting-consent" ? "Scope shown; target auth unavailable" : "No authenticated session"}</Text></View><Text style={styles.sessionBadge}>{commandReady ? "READY" : "LOCKED"}</Text></View>
          <Text style={styles.sessionBody}>A USB connection and a locally displayed scope do not establish a session. Target-cooperative protocol verification and platform crypto binding are unavailable, so typed commands remain locked.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Send an authenticated read posture action" accessibilityState={{ disabled: !commandReady }} onPress={sendReadPosture} disabled={!commandReady} style={({ pressed }) => [styles.commandButton, !commandReady && styles.disabled, pressed && styles.pressed]}><Text style={styles.commandButtonText}>Run typed read-posture</Text><Text style={styles.commandButtonArrow}>→</Text></Pressable>
          {lastResult ? <Text style={styles.resultText}>Request {lastResult.requestId} · {lastResult.status} · {lastResult.detail}</Text> : null}
          {sessionEvent ? <Text style={styles.sessionEventText}>{sessionEvent.code} · {sessionEvent.message}</Text> : null}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Toggle transport boundary details" onPress={() => setDetailsOpen(!detailsOpen)} style={styles.boundaryCard}>
          <View style={styles.boundaryTopRow}><View style={styles.boundaryMark}><Text style={styles.boundaryMarkText}>!</Text></View><View style={styles.boundaryCopy}><Text style={styles.boundaryTitle}>Transport boundary</Text><Text style={styles.boundarySubtitle}>USB permission is not authorization.</Text></View><Text style={styles.chevron}>{detailsOpen ? "⌃" : "⌄"}</Text></View>
          {detailsOpen ? <View style={styles.boundaryDetails}><Text style={styles.detailLine}><Text style={styles.detailNumber}>01</Text> Android may enumerate attached USB hardware before permission; permission is required before opening a selected transport.</Text><Text style={styles.detailLine}><Text style={styles.detailNumber}>02</Text> Transport connection is separate from target-cooperative protocol verification and authenticated session establishment.</Text><Text style={styles.detailLine}><Text style={styles.detailNumber}>03</Text> No target verifier or platform crypto binding is wired here, so commands cannot unlock or simulate an established session.</Text></View> : null}
        </Pressable>
        <Text style={styles.footerNote}>{nativeAvailable ? "Fail closed: this screen cannot establish an authenticated session or unlock commands until a target-cooperative verifier and platform crypto binding are implemented." : "Live discovery requires the custom Android development build; this preview does not simulate USB devices."}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Step({ number, label, complete }: { number: string; label: string; complete: boolean }) {
  return <View style={styles.step}><View style={[styles.stepCircle, complete && styles.stepCircleComplete]}><Text style={[styles.stepNumber, complete && styles.stepNumberComplete]}>{complete ? "✓" : number}</Text></View><Text style={[styles.stepLabel, complete && styles.stepLabelComplete]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerCopy: { flex: 1, paddingRight: 20 },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 31, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  stateDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.yellow, marginTop: 7, marginRight: 3 },
  stateDotConnected: { backgroundColor: palette.orange },
  stateDotAuthenticated: { backgroundColor: palette.green },
  hostCard: { backgroundColor: palette.navy, borderRadius: 21, padding: 18, marginTop: 20 },
  hostTopRow: { flexDirection: "row", alignItems: "center" },
  hostIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: palette.orange, alignItems: "center", justifyContent: "center" },
  hostIconText: { color: "#FFFFFF", fontSize: 23, fontWeight: "700" },
  hostCopy: { flex: 1, marginLeft: 11 },
  hostLabel: { color: palette.navyMuted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  hostTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginTop: 5 },
  readyPill: { borderWidth: 1, borderColor: "#476371", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 },
  readyPillText: { color: palette.navyMuted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  hostStats: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#294758", marginTop: 16, paddingTop: 13 },
  statLabel: { color: palette.navyMuted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  statValue: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", marginTop: 5 },
  actionRow: { flexDirection: "row", alignItems: "stretch", marginTop: 12, marginBottom: 25 },
  scanButton: { flex: 1, backgroundColor: palette.orange, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scanButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  scanButtonArrow: { color: "#FFFFFF", fontSize: 18 },
  lastEventBox: { flex: 1, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, marginLeft: 8 },
  eventLabel: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  eventText: { color: palette.ink, fontSize: 10, lineHeight: 13, marginTop: 4 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
  auditWarning: { backgroundColor: "#FCECEB", borderWidth: 1, borderColor: "#F5C7C3", borderRadius: 14, padding: 13, marginBottom: 13 },
  auditWarningLabel: { color: palette.red, fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  auditWarningText: { color: "#7D403B", fontSize: 11, lineHeight: 16, marginTop: 5 },
  diagnosticsCard: { backgroundColor: "#FFFDFC", borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 16, marginBottom: 22 },
  diagnosticsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  diagnosticsTitle: { color: palette.ink, fontSize: 16, fontWeight: "800", marginTop: 5 },
  diagnosticsBadge: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  diagnosticsBody: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 11 },
  diagnosticStats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: palette.line, marginTop: 13, paddingTop: 11 },
  diagnosticStat: { flex: 1, paddingRight: 5 },
  diagnosticStatLabel: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  diagnosticStatValue: { color: palette.ink, fontSize: 10, fontWeight: "900", marginTop: 5 },
  profileWarning: { color: "#7A5B1F", fontSize: 11, fontWeight: "700", lineHeight: 16, marginTop: 13 },
  inventoryNotice: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 11 },
  diagnosticList: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 13, paddingTop: 11 },
  diagnosticListTitle: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8, marginBottom: 7 },
  diagnosticEntry: { backgroundColor: "#F8F7F2", borderRadius: 11, padding: 10, marginTop: 7 },
  diagnosticEntryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  diagnosticEntryId: { color: palette.ink, fontSize: 10, fontWeight: "900" },
  diagnosticEntryFlag: { color: palette.orange, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  diagnosticEntryMeta: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  diagnosticEntryPermission: { color: palette.green, fontSize: 9, fontWeight: "900", marginTop: 5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800" },
  sectionMeta: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  emptyCard: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 18, alignItems: "center" },
  emptyMark: { color: palette.orange, fontSize: 27, lineHeight: 30 },
  emptyTitle: { color: palette.ink, fontSize: 14, fontWeight: "800", marginTop: 6 },
  emptyBody: { color: palette.muted, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 5 },
  deviceCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 13, marginBottom: 9 },
  deviceCardSelected: { borderColor: "#F8B79B", backgroundColor: "#FFFDFC" },
  deviceIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#EEF1EF", alignItems: "center", justifyContent: "center", marginRight: 10 },
  deviceIconSelected: { backgroundColor: palette.orange },
  deviceIconText: { color: palette.muted, fontSize: 15 },
  deviceIconTextSelected: { color: "#FFFFFF" },
  deviceBody: { flex: 1 },
  deviceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deviceName: { color: palette.ink, fontSize: 14, fontWeight: "800", flex: 1, paddingRight: 6 },
  permissionPill: { backgroundColor: palette.yellowSoft, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4 },
  permissionPillGranted: { backgroundColor: palette.greenSoft },
  permissionText: { color: palette.yellow, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  permissionTextGranted: { color: palette.green },
  deviceDescriptor: { color: palette.muted, fontSize: 11, marginTop: 5 },
  deviceMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  deviceMeta: { color: palette.muted, fontSize: 9, fontWeight: "800" },
  deviceSignal: { color: palette.green, fontSize: 9, fontWeight: "900" },
  chevron: { color: palette.muted, fontSize: 17, marginLeft: 7 },
  controlCard: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 16, marginTop: 5 },
  controlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  controlKicker: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  controlTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", marginTop: 5 },
  controlIndex: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  stepRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 15 },
  step: { alignItems: "center", flex: 1 },
  stepCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center" },
  stepCircleComplete: { backgroundColor: palette.green, borderColor: palette.green },
  stepNumber: { color: palette.muted, fontSize: 9, fontWeight: "900" },
  stepNumberComplete: { color: "#FFFFFF" },
  stepLabel: { color: palette.muted, fontSize: 9, fontWeight: "800", marginTop: 5 },
  stepLabelComplete: { color: palette.ink },
  controlButton: { backgroundColor: palette.orange, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  controlButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  controlButtonArrow: { color: "#FFFFFF", fontSize: 18 },
  disconnectButton: { backgroundColor: "#FCECEB", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  disconnectText: { color: palette.red, fontSize: 13, fontWeight: "900" },
  disconnectArrow: { color: palette.red, fontSize: 20 },
  sessionCard: { backgroundColor: "#FFFDFC", borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 16, marginTop: 16 },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sessionTitle: { color: palette.ink, fontSize: 16, fontWeight: "800", marginTop: 5 },
  sessionBadge: { color: commandBadgeColor("locked"), fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  sessionBody: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 12 },
  commandButton: { backgroundColor: palette.navy, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  commandButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  commandButtonArrow: { color: "#FFFFFF", fontSize: 18 },
  resultText: { color: palette.green, fontSize: 11, lineHeight: 15, marginTop: 12 },
  sessionEventText: { color: palette.muted, fontSize: 10, lineHeight: 14, marginTop: 8 },
  boundaryCard: { backgroundColor: palette.orangeSoft, borderRadius: 17, padding: 16, marginTop: 20 },
  boundaryTopRow: { flexDirection: "row", alignItems: "center" },
  boundaryMark: { width: 27, height: 27, borderRadius: 9, backgroundColor: palette.orange, alignItems: "center", justifyContent: "center", marginRight: 10 },
  boundaryMarkText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  boundaryCopy: { flex: 1 },
  boundaryTitle: { color: palette.ink, fontSize: 14, fontWeight: "800" },
  boundarySubtitle: { color: "#7A6A65", fontSize: 11, marginTop: 3 },
  boundaryDetails: { borderTopWidth: 1, borderTopColor: "#F2CDBB", marginTop: 13, paddingTop: 11 },
  detailLine: { color: "#7A6A65", fontSize: 11, lineHeight: 17, marginBottom: 5 },
  detailNumber: { color: palette.orange, fontWeight: "900" },
  footerNote: { color: palette.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 18, paddingHorizontal: 8 },
});

function commandBadgeColor(_state: "locked" | "ready") {
  return palette.yellow;
}
