import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/constants/commander";

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

const discoveredDevice: UsbDevice = {
  id: "lab-handset-a",
  name: "Lab handset A",
  descriptor: "USB companion · approved lab profile",
  interfaceLabel: "Bulk IN / OUT · protocol v1",
  permission: "not-requested",
  signal: "Ready",
};

export default function UsbLinkScreen() {
  const [linkState, setLinkState] = useState<LinkState>("idle");
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState("No transport event yet");

  const selected = useMemo(() => devices.find((device) => device.id === selectedId) ?? null, [devices, selectedId]);
  const connected = linkState === "connected" && selected !== null;

  const scan = () => {
    setLinkState("scanning");
    setLastEvent("Scanning USB Host inventory…");
    setTimeout(() => {
      setDevices([{ ...discoveredDevice }]);
      setSelectedId(discoveredDevice.id);
      setLinkState("idle");
      setLastEvent("Discovery complete · 1 approved profile found");
    }, 600);
  };

  const requestPermission = () => {
    if (!selected) return;
    setDevices((current) => current.map((device) => device.id === selected.id ? { ...device, permission: "granted", signal: "Permission granted" } : device));
    setLastEvent("Owner permission recorded for this USB device");
  };

  const connect = () => {
    if (!selected || selected.permission !== "granted") return;
    setLinkState("connected");
    setLastEvent("Session open · awaiting protocol heartbeat");
  };

  const disconnect = () => {
    setLinkState("idle");
    setLastEvent("Connection closed · interface released");
  };

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>USB LINK // COOPERATIVE TRANSPORT</Text>
            <Text style={styles.title}>Device connections.</Text>
            <Text style={styles.subtitle}>
              Discover an explicitly approved companion, request owner permission, and open a bounded training session.
            </Text>
          </View>
          <View style={[styles.stateDot, connected && styles.stateDotConnected]} />
        </View>

        <View style={styles.hostCard}>
          <View style={styles.hostTopRow}>
            <View style={styles.hostIcon}><Text style={styles.hostIconText}>↕</Text></View>
            <View style={styles.hostCopy}>
              <Text style={styles.hostLabel}>LOCAL USB HOST</Text>
              <Text style={styles.hostTitle}>Ready for a cooperative link</Text>
            </View>
            <View style={styles.readyPill}><Text style={styles.readyPillText}>{connected ? "ACTIVE" : "READY"}</Text></View>
          </View>
          <View style={styles.hostStats}>
            <View><Text style={styles.statLabel}>ROLE</Text><Text style={styles.statValue}>CONTROLLER</Text></View>
            <View><Text style={styles.statLabel}>FRAME</Text><Text style={styles.statValue}>64 KB MAX</Text></View>
            <View><Text style={styles.statLabel}>AUTH</Text><Text style={styles.statValue}>REQUIRED</Text></View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={scan} disabled={linkState === "scanning"} style={({ pressed }) => [styles.scanButton, pressed && styles.pressed, linkState === "scanning" && styles.disabled]}>
            <Text style={styles.scanButtonText}>{linkState === "scanning" ? "Scanning…" : "Scan for devices"}</Text>
            <Text style={styles.scanButtonArrow}>↗</Text>
          </Pressable>
          <View style={styles.lastEventBox}>
            <Text style={styles.eventLabel}>LAST EVENT</Text>
            <Text style={styles.eventText} numberOfLines={2}>{lastEvent}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Discovered devices</Text>
          <Text style={styles.sectionMeta}>{devices.length.toString().padStart(2, "0")} FOUND</Text>
        </View>

        {devices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyMark}>○</Text>
            <Text style={styles.emptyTitle}>No approved companion in view.</Text>
            <Text style={styles.emptyBody}>USB permission and a cooperative interface are required before a device can appear here.</Text>
          </View>
        ) : (
          devices.map((device) => {
            const isSelected = device.id === selectedId;
            return (
              <Pressable key={device.id} onPress={() => setSelectedId(device.id)} style={({ pressed }) => [styles.deviceCard, isSelected && styles.deviceCardSelected, pressed && styles.pressed]}>
                <View style={[styles.deviceIcon, isSelected && styles.deviceIconSelected]}><Text style={[styles.deviceIconText, isSelected && styles.deviceIconTextSelected]}>▣</Text></View>
                <View style={styles.deviceBody}>
                  <View style={styles.deviceTopRow}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <View style={[styles.permissionPill, device.permission === "granted" && styles.permissionPillGranted]}>
                      <Text style={[styles.permissionText, device.permission === "granted" && styles.permissionTextGranted]}>{device.permission === "granted" ? "PERMITTED" : "UNVERIFIED"}</Text>
                    </View>
                  </View>
                  <Text style={styles.deviceDescriptor}>{device.descriptor}</Text>
                  <View style={styles.deviceMetaRow}>
                    <Text style={styles.deviceMeta}>{device.interfaceLabel}</Text>
                    <Text style={styles.deviceSignal}>{connected && isSelected ? "Connected" : device.signal}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>{isSelected ? "⌃" : "⌄"}</Text>
              </Pressable>
            );
          })
        )}

        {selected ? (
          <View style={styles.controlCard}>
            <View style={styles.controlHeader}>
              <View>
                <Text style={styles.controlKicker}>SELECTED TARGET</Text>
                <Text style={styles.controlTitle}>{selected.name}</Text>
              </View>
              <Text style={styles.controlIndex}>{connected ? "03 / 03" : selected.permission === "granted" ? "02 / 03" : "01 / 03"}</Text>
            </View>
            <View style={styles.stepRow}>
              <Step number="01" label="Discovered" complete />
              <Step number="02" label="Permission" complete={selected.permission === "granted"} />
              <Step number="03" label="Connected" complete={connected} />
            </View>
            {!connected && selected.permission !== "granted" ? (
              <Pressable onPress={requestPermission} style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}>
                <Text style={styles.controlButtonText}>Request owner permission</Text>
                <Text style={styles.controlButtonArrow}>→</Text>
              </Pressable>
            ) : !connected ? (
              <Pressable onPress={connect} style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}>
                <Text style={styles.controlButtonText}>Open bounded session</Text>
                <Text style={styles.controlButtonArrow}>→</Text>
              </Pressable>
            ) : (
              <Pressable onPress={disconnect} style={({ pressed }) => [styles.disconnectButton, pressed && styles.pressed]}>
                <Text style={styles.disconnectText}>Disconnect and release interface</Text>
                <Text style={styles.disconnectArrow}>×</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        <Pressable onPress={() => setDetailsOpen(!detailsOpen)} style={styles.boundaryCard}>
          <View style={styles.boundaryTopRow}>
            <View style={styles.boundaryMark}><Text style={styles.boundaryMarkText}>!</Text></View>
            <View style={styles.boundaryCopy}>
              <Text style={styles.boundaryTitle}>Transport boundary</Text>
              <Text style={styles.boundarySubtitle}>USB permission is not authorization.</Text>
            </View>
            <Text style={styles.chevron}>{detailsOpen ? "⌃" : "⌄"}</Text>
          </View>
          {detailsOpen ? (
            <View style={styles.boundaryDetails}>
              <Text style={styles.detailLine}><Text style={styles.detailNumber}>01</Text> Both devices must show the same scoped exercise.</Text>
              <Text style={styles.detailLine}><Text style={styles.detailNumber}>02</Text> Only typed, allow-listed protocol frames are accepted.</Text>
              <Text style={styles.detailLine}><Text style={styles.detailNumber}>03</Text> Disconnect, replay, or consent changes close the session.</Text>
            </View>
          ) : null}
        </Pressable>

        <Text style={styles.footerNote}>Prototype screen: discovery and connection states are simulated until the native Expo module is run in a custom Android development build.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Step({ number, label, complete }: { number: string; label: string; complete: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepCircle, complete && styles.stepCircleComplete]}><Text style={[styles.stepNumber, complete && styles.stepNumberComplete]}>{complete ? "✓" : number}</Text></View>
      <Text style={[styles.stepLabel, complete && styles.stepLabelComplete]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerCopy: { flex: 1, paddingRight: 20 },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 31, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  stateDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: palette.yellow, marginTop: 7, marginRight: 3 },
  stateDotConnected: { backgroundColor: palette.green },
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
  disabled: { opacity: 0.7 },
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
