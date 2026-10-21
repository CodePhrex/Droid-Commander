import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/constants/commander";
import {
  addUsbHostListener,
  close as closeUsbHost,
  connect as connectUsbHost,
  isUsbHostAvailable,
  requestPermission as requestUsbPermission,
  startDiscovery,
  type UsbDeviceDescriptor,
  type UsbHostEvent,
} from "expo-droid-commander-usb-host";
import { createNativeUsbCommandChannel } from "@/lib/native-usb-command-channel";
import { UsbCommandChannel } from "@/lib/usb-command-channel";
import {
  UsbSessionManager,
  type UsbSessionEvent,
  type UsbSessionState,
} from "@/lib/usb-session";
import type { ActionResult } from "@/lib/usb-wire";

type LinkState = "idle" | "scanning" | "connected";
type PermissionState = "not-requested" | "granted";

type UsbDevice = {
  id: string;
  name: string;
  descriptor: string;
  interfaceLabel: string;
  permission: PermissionState;
  signal: string;
};

type SessionBinding = {
  authenticate: (unsignedFrame: Uint8Array) => Promise<Uint8Array>;
  verify: (frame: unknown) => Promise<boolean>;
};

const USB_PROFILE = {
  // Replace these placeholders with the organization-approved companion IDs.
  vendorIds: [0x1234],
  productIds: [0x5678],
  interfaceClass: 0xff,
};

const SESSION_POLICY = {
  allowedActions: ["read-posture", "read-capabilities", "simulate-remediation", "verify-posture"],
  maxFrameBytes: 64 * 1024,
  heartbeatTimeoutMs: 30_000,
  clockSkewMs: 120_000,
};

function deviceFromDescriptor(descriptor: UsbDeviceDescriptor): UsbDevice {
  const shortName = descriptor.deviceName.split("/").pop() || descriptor.deviceName;
  return {
    id: descriptor.deviceName,
    name: shortName,
    descriptor: `USB ${descriptor.vendorId.toString(16).padStart(4, "0")}:${descriptor.productId.toString(16).padStart(4, "0")} · native allow-list`,
    interfaceLabel: `${descriptor.interfaceCount} interface${descriptor.interfaceCount === 1 ? "" : "s"} · bulk policy`,
    permission: descriptor.permissionGranted ? "granted" : "not-requested",
    signal: descriptor.permissionGranted ? "Permission granted" : "Ready",
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

export default function UsbLinkScreen() {
  const [nativeAvailable] = useState(isUsbHostAvailable);
  const [linkState, setLinkState] = useState<LinkState>("idle");
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState(nativeAvailable ? "Native USB Host module ready" : "Custom Android build required");
  const [sessionState, setSessionState] = useState<UsbSessionState>("disconnected");
  const [sessionEvent, setSessionEvent] = useState<UsbSessionEvent | null>(null);
  const [commandReady, setCommandReady] = useState(false);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);

  const sessionRef = useRef<UsbSessionManager | null>(null);
  const channelRef = useRef<UsbCommandChannel | null>(null);
  const bindingRef = useRef<SessionBinding | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionBytesRef = useRef<Uint8Array | null>(null);
  const requestIdRef = useRef(1);

  const selected = useMemo(() => devices.find((device) => device.id === selectedId) ?? null, [devices, selectedId]);
  const connected = linkState === "connected" && selected !== null;
  const authenticated = sessionState === "established";

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
    sessionIdRef.current = null;
    sessionBytesRef.current = null;
    bindingRef.current = null;
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
      setLastEvent("Session established locally, but platform crypto binding is not available; commands remain locked");
      return;
    }

    const channel = createNativeUsbCommandChannel({
      sessionId: sessionBytes,
      authenticate: binding.authenticate,
    });
    channel.onResponse((result) => setLastResult(result));
    channel.onError((error) => {
      setCommandReady(false);
      setLastEvent(`Command channel rejected a frame: ${error.code}`);
    });
    channelRef.current = channel;
    setCommandReady(true);
    setLastEvent("Authenticated command channel ready; only typed actions are enabled");
  }, []);

  useEffect(() => {
    const subscription = addUsbHostListener((event) => {
      const payload = typeof event.payload === "object" && event.payload !== null ? event.payload as Record<string, unknown> : {};
      const deviceName = typeof payload.deviceName === "string" ? payload.deviceName : null;

      if (event.type === "permission-granted") {
        setDevices((current) => current.map((device) => device.id === deviceName || deviceName === null ? { ...device, permission: "granted", signal: "Permission granted" } : device));
      }
      if (event.type === "permission-denied" || event.type === "permission-rejected") {
        setDevices((current) => current.map((device) => device.id === deviceName || deviceName === null ? { ...device, permission: "not-requested", signal: "Permission denied" } : device));
      }
      if (event.type === "connected") {
        setLinkState("connected");
        createTransportSession();
      }
      if (event.type === "session-established" && payload.sessionId === sessionIdRef.current) {
        const manager = sessionRef.current;
        if (manager) {
          const established = manager.establish();
          publishSessionEvent(established);
          if (established.state === "established") installCommandChannel();
        }
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
    setLastEvent("Scanning USB Host inventory…");
    try {
      const found = await startDiscovery(USB_PROFILE);
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
    if (!selected || !nativeAvailable) return;
    setLastEvent("Waiting for Android owner-permission dialog…");
    const requested = await requestUsbPermission(selected.id);
    if (!requested) setLastEvent("Permission request rejected by native USB Host API");
  };

  const connect = async () => {
    if (!selected || selected.permission !== "granted" || !nativeAvailable) return;
    setLastEvent("Opening bounded native USB transport; authenticated session still required…");
    const opened = await connectUsbHost(selected.id);
    if (!opened) setLastEvent("Connection rejected · check permission and interface policy");
  };

  const requestConsent = () => {
    const manager = sessionRef.current;
    if (!manager || linkState !== "connected") return;
    publishSessionEvent(manager.requireConsent());
    setLastEvent("Consent scope displayed locally; waiting for a matching peer handshake");
  };

  const sendReadPosture = async () => {
    if (!commandReady || !channelRef.current) return;
    try {
      const result = await channelRef.current.sendAction({ requestId: requestIdRef.current, action: "read-posture" });
      requestIdRef.current += 1;
      setLastEvent(`Typed read-posture sent · sequence ${result.sequence}; waiting for authenticated result`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown channel error";
      setLastEvent(`Command blocked: ${code}`);
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
              <Text style={styles.hostTitle}>{authenticated ? "Authenticated session active" : connected ? "Transport connected · session locked" : nativeAvailable ? "Ready for a cooperative link" : "Native build required"}</Text>
            </View>
            <View style={styles.readyPill}><Text style={styles.readyPillText}>{authenticated ? "AUTH" : connected ? "LINK" : nativeAvailable ? "READY" : "OFFLINE"}</Text></View>
          </View>
          <View style={styles.hostStats}>
            <View><Text style={styles.statLabel}>TRANSPORT</Text><Text style={styles.statValue}>{connected ? "CONNECTED" : "IDLE"}</Text></View>
            <View><Text style={styles.statLabel}>SESSION</Text><Text style={styles.statValue}>{authenticated ? "ESTABLISHED" : sessionState.toUpperCase()}</Text></View>
            <View><Text style={styles.statLabel}>COMMANDS</Text><Text style={styles.statValue}>{commandReady ? "TYPED ONLY" : "LOCKED"}</Text></View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={nativeAvailable ? "Scan for approved USB devices" : "Custom Android build required for USB scanning"} accessibilityState={{ disabled: linkState === "scanning" }} onPress={scan} disabled={linkState === "scanning"} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed, linkState === "scanning" && styles.disabled]}>
            <Text style={styles.scanButtonText}>{linkState === "scanning" ? "Scanning…" : nativeAvailable ? "Scan for devices" : "Native build required"}</Text>
            <Text style={styles.scanButtonArrow}>↗</Text>
          </Pressable>
          <View style={styles.lastEventBox}><Text style={styles.eventLabel}>LAST EVENT</Text><Text style={styles.eventText} numberOfLines={2}>{lastEvent}</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Discovered devices</Text><Text style={styles.sectionMeta}>{devices.length.toString().padStart(2, "0")} FOUND</Text></View>
        {devices.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyMark}>○</Text><Text style={styles.emptyTitle}>No approved companion in view.</Text><Text style={styles.emptyBody}>{nativeAvailable ? "USB permission and a cooperative interface are required before a device can appear here." : "Live discovery is unavailable in this preview. Use the custom Android development build."}</Text></View>
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
          <View style={styles.sessionHeader}><View><Text style={styles.controlKicker}>SESSION CONTROL</Text><Text style={styles.sessionTitle}>{sessionState === "awaiting-consent" ? "Awaiting matching peer consent" : authenticated ? "Authenticated command channel" : "No authenticated session"}</Text></View><Text style={styles.sessionBadge}>{commandReady ? "READY" : "LOCKED"}</Text></View>
          <Text style={styles.sessionBody}>{authenticated ? "Only typed, allow-listed actions may be transmitted. Responses must be session-bound and authenticated before disclosure." : "A USB connection alone never authorizes commands. The draft keeps the command channel locked until the peer handshake verifier and platform cryptography are connected."}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Send an authenticated read posture action" accessibilityState={{ disabled: !commandReady }} onPress={sendReadPosture} disabled={!commandReady} style={({ pressed }) => [styles.commandButton, !commandReady && styles.disabled, pressed && styles.pressed]}><Text style={styles.commandButtonText}>Run typed read-posture</Text><Text style={styles.commandButtonArrow}>→</Text></Pressable>
          {lastResult ? <Text style={styles.resultText}>Last result · {lastResult.status.toUpperCase()} · {lastResult.detail}</Text> : null}
          {sessionEvent ? <Text style={styles.sessionEventText}>{sessionEvent.code} · {sessionEvent.message}</Text> : null}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Toggle transport boundary details" onPress={() => setDetailsOpen(!detailsOpen)} style={styles.boundaryCard}>
          <View style={styles.boundaryTopRow}><View style={styles.boundaryMark}><Text style={styles.boundaryMarkText}>!</Text></View><View style={styles.boundaryCopy}><Text style={styles.boundaryTitle}>Transport boundary</Text><Text style={styles.boundarySubtitle}>USB permission is not authorization.</Text></View><Text style={styles.chevron}>{detailsOpen ? "⌃" : "⌄"}</Text></View>
          {detailsOpen ? <View style={styles.boundaryDetails}><Text style={styles.detailLine}><Text style={styles.detailNumber}>01</Text> Transport connects before the cooperative session is established.</Text><Text style={styles.detailLine}><Text style={styles.detailNumber}>02</Text> Only typed, allow-listed protocol frames are accepted.</Text><Text style={styles.detailLine}><Text style={styles.detailNumber}>03</Text> Disconnect, replay, failed authentication, or consent changes close the session.</Text></View> : null}
        </Pressable>
        <Text style={styles.footerNote}>{nativeAvailable ? "Draft wiring is fail-closed: the native peer-handshake verifier must emit a matching session-established event before commands can unlock." : "Live discovery requires the custom Android development build; this preview does not simulate USB devices."}</Text>
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
