import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/constants/commander";
import { openDeveloperOptions } from "expo-droid-commander-usb-host";

const SAMSUNG_HANDOFFS = [
  {
    label: "Samsung Members diagnostics",
    detail: "Owner-run Galaxy hardware and software checks",
    url: "https://www.samsung.com/us/support/answer/ANS10003632/",
  },
  {
    label: "Samsung Smart Switch",
    detail: "Owner-operated backup and restore guidance",
    url: "https://www.samsung.com/us/support/owners/app/smart-switch",
  },
  {
    label: "Samsung Support",
    detail: "Official support and repair options",
    url: "https://www.samsung.com/us/support/",
  },
] as const;

export function ServiceHandoffPanel() {
  const [adbStepsOpen, setAdbStepsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const openHostDeveloperOptions = () => {
    if (Platform.OS !== "android") {
      setNotice("Developer Options handoff is available only in the Android native build.");
      return;
    }

    Alert.alert(
      "Open Developer Options on this host?",
      "This opens Android Settings on the phone running Droid Commander. It will not change a setting or open Settings on a connected target.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void openDeveloperOptions().then((opened) => {
              setNotice(opened
                ? "Settings opened on this host. The device owner must make any requested change in Android."
                : "Android Settings could not be opened. No setting was changed.");
            }).catch(() => {
              setNotice("Android Settings handoff failed. No setting was changed.");
            });
          },
        },
      ],
    );
  };

  const openSamsungHandoff = async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
      setNotice(`${label} opened. The device owner operates the Samsung tool.`);
    } catch {
      setNotice(`Could not open ${label}. No device action was taken.`);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>OWNER-OPERATED SERVICE HANDOFFS</Text>
      <Text style={styles.title}>Host stays local. Target stays owner-controlled.</Text>
      <Text style={styles.body}>
        The Settings button opens Developer Options on this host only. A target owner must use the target device itself; Droid Commander does not change target settings or run ADB commands.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Developer Options on this host device"
        onPress={openHostDeveloperOptions}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>Open Developer Options on this host</Text>
        <Text style={styles.arrow}>↗</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Owner-approved ADB handoff</Text>
        <Text style={styles.body}>
          Droid Commander has no ADB client. If a service task needs ADB, use trusted Android Platform Tools separately, only after the target owner unlocks the device, enables USB debugging, and accepts that workstation’s authorization prompt.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: adbStepsOpen }}
          accessibilityLabel={adbStepsOpen ? "Hide ADB owner handoff checklist" : "Show ADB owner handoff checklist"}
          onPress={() => setAdbStepsOpen((open) => !open)}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>{adbStepsOpen ? "Hide owner checklist" : "Show owner checklist"}</Text>
          <Text style={styles.secondaryArrow}>{adbStepsOpen ? "⌃" : "⌄"}</Text>
        </Pressable>
        {adbStepsOpen ? (
          <View style={styles.checklist}>
            <Text style={styles.checklistLine}><Text style={styles.checklistNumber}>01</Text> Confirm the exact target and service task with its owner.</Text>
            <Text style={styles.checklistLine}><Text style={styles.checklistNumber}>02</Text> The owner unlocks the target and makes any Developer Options change on that device.</Text>
            <Text style={styles.checklistLine}><Text style={styles.checklistNumber}>03</Text> The owner reviews and accepts the trusted workstation’s authorization prompt.</Text>
            <Text style={styles.checklistLine}><Text style={styles.checklistNumber}>04</Text> Stop when the approved task is complete and revoke debugging authorization if it is no longer needed.</Text>
            <Text style={styles.limitNote}>This is a manual handoff guide only. No ADB session, command, data access, or setting change is performed here.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Official Samsung resources</Text>
        {SAMSUNG_HANDOFFS.map((item) => (
          <Pressable
            key={item.url}
            accessibilityRole="link"
            accessibilityLabel={`Open official ${item.label} resource`}
            onPress={() => void openSamsungHandoff(item.url, item.label)}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          >
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>{item.label}</Text>
              <Text style={styles.linkDetail}>{item.detail}</Text>
            </View>
            <Text style={styles.secondaryArrow}>↗</Text>
          </Pressable>
        ))}
        <Text style={styles.limitNote}>
          Links open on the host running this app. To run an owner-operated Samsung diagnostic or backup on the target, open the corresponding Samsung tool on the target itself.
        </Text>
      </View>

      {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 17, padding: 16, marginBottom: 22 },
  kicker: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { color: palette.ink, fontSize: 17, lineHeight: 22, fontWeight: "800", marginTop: 6 },
  body: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
  primaryButton: { backgroundColor: palette.navy, borderRadius: 12, minHeight: 46, paddingHorizontal: 13, marginTop: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", flexShrink: 1, paddingRight: 8 },
  arrow: { color: "#FFFFFF", fontSize: 17 },
  section: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 15, paddingTop: 13 },
  sectionTitle: { color: palette.ink, fontSize: 13, fontWeight: "900" },
  secondaryButton: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 11, marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  secondaryButtonText: { color: palette.ink, fontSize: 11, fontWeight: "800" },
  secondaryArrow: { color: palette.orange, fontSize: 16, fontWeight: "900" },
  checklist: { backgroundColor: "#F8F7F2", borderRadius: 11, padding: 11, marginTop: 9 },
  checklistLine: { color: palette.ink, fontSize: 10, lineHeight: 16, marginBottom: 6 },
  checklistNumber: { color: palette.orange, fontWeight: "900" },
  limitNote: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
  linkRow: { minHeight: 51, borderBottomWidth: 1, borderBottomColor: palette.line, flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  linkCopy: { flex: 1, paddingRight: 8 },
  linkTitle: { color: palette.ink, fontSize: 11, fontWeight: "800" },
  linkDetail: { color: palette.muted, fontSize: 9, marginTop: 3 },
  notice: { color: palette.green, fontSize: 10, lineHeight: 15, marginTop: 10 },
  pressed: { opacity: 0.78 },
});
