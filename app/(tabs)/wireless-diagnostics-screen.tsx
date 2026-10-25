import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/constants/commander";

const previewNetworks = [
  { name: "Example-Lab-5G", detail: "WPA3 · 5 GHz · sample only", strength: "Strong" },
  { name: "Guest-Network", detail: "Open · 2.4 GHz · sample only", strength: "Review" },
];
const previewDevices = [
  { name: "Example BLE Sensor", detail: "BLE · sample only", status: "Paired" },
  { name: "Example Beacon", detail: "BLE · sample only", status: "Unknown" },
];

export default function WirelessDiagnosticsScreen() {
  const explainRealScan = () => {
    Alert.alert(
      "Real scan not available yet",
      "This build has no native Wi-Fi/Bluetooth discovery implementation connected to this screen. Android permissions and OS restrictions also apply. The examples below are demo data, not nearby devices. No scan was performed.",
    );
  };

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>TOOLS / RADIO VISIBILITY</Text>
        <Text style={styles.title}>Wireless diagnostics.</Text>
        <Text style={styles.subtitle}>
          A transparent preview of the intended Wi-Fi and Bluetooth workflow. Live radio discovery is not connected in this build.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>DEMO PREVIEW · NOT A LIVE SCAN</Text>
          </View>
          <Text style={styles.statusTitle}>Device discovery is not enabled</Text>
          <Text style={styles.statusDetail}>
            Droid Commander currently has no native scanner feeding this screen. The sample entries below are clearly marked and must not be used as evidence of nearby networks or devices.
          </Text>
          <Pressable accessibilityRole="button" onPress={explainRealScan} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Check live-scan availability</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Wi-Fi preview</Text>
          <Text style={styles.sectionCount}>2 EXAMPLES</Text>
        </View>
        {previewNetworks.map((network) => (
          <View key={network.name} style={styles.itemCard}>
            <View style={styles.itemIcon}><Text style={styles.itemIconText}>Wi</Text></View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{network.name}</Text>
              <Text style={styles.itemDetail}>{network.detail}</Text>
            </View>
            <Text style={[styles.itemStatus, network.strength === "Review" && styles.reviewStatus]}>{network.strength}</Text>
          </View>
        ))}

        <View style={[styles.sectionRow, styles.secondSection]}>
          <Text style={styles.sectionTitle}>Bluetooth preview</Text>
          <Text style={styles.sectionCount}>2 EXAMPLES</Text>
        </View>
        {previewDevices.map((device) => (
          <View key={device.name} style={styles.itemCard}>
            <View style={styles.btIcon}><Text style={styles.btIconText}>BT</Text></View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{device.name}</Text>
              <Text style={styles.itemDetail}>{device.detail}</Text>
            </View>
            <Text style={styles.itemStatus}>{device.status}</Text>
          </View>
        ))}

        <View style={styles.limitCard}>
          <Text style={styles.limitTitle}>Why is the list not live?</Text>
          <Text style={styles.limitBody}>
            A screen and a button cannot discover radios by themselves. The app needs supported native APIs, the right runtime permissions, device settings where required, and tested Android-version behavior. Those pieces have not yet been implemented here.
          </Text>
        </View>
        <Text style={styles.footer}>Wireless debugging is not enabled by this screen. Use Android Developer options to manage wireless debugging manually.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  statusCard: { backgroundColor: palette.navy, borderRadius: 20, padding: 18, marginBottom: 24 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: palette.orange, marginRight: 8 },
  statusLabel: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  statusTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", marginTop: 12 },
  statusDetail: { color: palette.navyMuted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  primaryButton: { backgroundColor: palette.orange, borderRadius: 12, paddingHorizontal: 13, minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pressed: { opacity: 0.78 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  arrow: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  secondSection: { marginTop: 18 },
  sectionTitle: { color: palette.ink, fontSize: 18, fontWeight: "800" },
  sectionCount: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderColor: palette.line, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  itemIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EAF1F7", alignItems: "center", justifyContent: "center" },
  itemIconText: { color: palette.navy, fontSize: 11, fontWeight: "900" },
  btIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: palette.orangeSoft, alignItems: "center", justifyContent: "center" },
  btIconText: { color: palette.orange, fontSize: 11, fontWeight: "900" },
  itemCopy: { flex: 1, paddingHorizontal: 10 },
  itemTitle: { color: palette.ink, fontSize: 13, fontWeight: "800" },
  itemDetail: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  itemStatus: { color: palette.green, fontSize: 9, fontWeight: "900" },
  reviewStatus: { color: palette.yellow },
  limitCard: { backgroundColor: "#FFFFFF", borderColor: palette.line, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 18 },
  limitTitle: { color: palette.ink, fontSize: 15, fontWeight: "800" },
  limitBody: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  footer: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 14, paddingHorizontal: 2 },
});
