import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { palette } from "@/constants/commander";

type ToolItem = {
  title: string;
  eyebrow: string;
  detail: string;
  icon: string;
  route: "/(tabs)/wireless-diagnostics-screen" | "/(tabs)/catalog" | "/(tabs)/sessions" | "/(tabs)/usb";
  tag: string;
};

const tools: ToolItem[] = [
  {
    title: "Wireless diagnostics",
    eyebrow: "WI-FI · BLUETOOTH",
    detail: "Review the current preview and see what is required for real radio discovery.",
    icon: "wifi",
    route: "/(tabs)/wireless-diagnostics-screen",
    tag: "PREVIEW",
  },
  {
    title: "CVE & patch library",
    eyebrow: "THREAT INTELLIGENCE",
    detail: "Review catalog freshness, patch references and evidence-based host correlations.",
    icon: "book.closed.fill",
    route: "/(tabs)/catalog",
    tag: "LOCAL + FEEDS",
  },
  {
    title: "Session reports",
    eyebrow: "HISTORY · AUDIT",
    detail: "Open saved host assessments and export the privileged-action disclosure.",
    icon: "clock.arrow.circlepath",
    route: "/(tabs)/sessions",
    tag: "LOCAL",
  },
  {
    title: "USB Link",
    eyebrow: "COOPERATIVE TRANSPORT",
    detail: "Inspect USB-host capability, permission requests and approved companion status.",
    icon: "cable.connector",
    route: "/(tabs)/usb",
    tag: "DEVICE SUPPORT",
  },
];

export default function ToolsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>DROID COMMANDER / TOOLKIT</Text>
            <Text style={styles.title}>Choose a tool.</Text>
          </View>
          <View style={styles.mark}>
            <IconSymbol name="slider.horizontal.3" size={24} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.subtitle}>
          Device checks first. Every tool states its data source and limits before you act.
        </Text>

        <View style={styles.notice}>
          <Text style={styles.noticeLabel}>CURRENT DEVICE SESSION</Text>
          <Text style={styles.noticeTitle}>Read-only by default</Text>
          <Text style={styles.noticeBody}>
            Droid Commander does not bypass Android permissions. A visible tool or a successful UI action does not mean the underlying native capability is available.
          </Text>
        </View>

        {tools.map((tool, index) => (
          <Pressable
            key={tool.title}
            accessibilityRole="button"
            accessibilityLabel={`Open ${tool.title}`}
            onPress={() => router.push(tool.route)}
            style={({ pressed }) => [styles.toolCard, pressed && styles.pressed]}
          >
            <View style={styles.toolTop}>
              <View style={styles.toolIcon}>
                <IconSymbol name={tool.icon as never} size={22} color={palette.orange} />
              </View>
              <Text style={styles.tag}>{tool.tag}</Text>
            </View>
            <Text style={styles.toolEyebrow}>{`0${index + 1} / ${tool.eyebrow}`}</Text>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDetail}>{tool.detail}</Text>
            <View style={styles.openRow}>
              <Text style={styles.openText}>Open tool</Text>
              <Text style={styles.arrow}>→</Text>
            </View>
          </Pressable>
        ))}
        <Text style={styles.footer}>
          Preview labels are intentional. Real-device discovery and vulnerability correlation must be supported by native readings before results are treated as evidence.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerCopy: { flex: 1, paddingRight: 12 },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 32, fontWeight: "900", letterSpacing: -1.2, marginTop: 5 },
  mark: { width: 48, height: 48, borderRadius: 15, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 18 },
  notice: { backgroundColor: palette.navy, borderRadius: 18, padding: 17, marginBottom: 20 },
  noticeLabel: { color: palette.navyMuted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  noticeTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 7 },
  noticeBody: { color: palette.navyMuted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  toolCard: { backgroundColor: "#FFFFFF", borderColor: palette.line, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  toolTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toolIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: palette.orangeSoft, alignItems: "center", justifyContent: "center" },
  tag: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.5, borderWidth: 1, borderColor: palette.line, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  toolEyebrow: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.9, marginTop: 14 },
  toolTitle: { color: palette.ink, fontSize: 19, fontWeight: "800", marginTop: 4 },
  toolDetail: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  openRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EDF0ED" },
  openText: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  arrow: { color: palette.orange, fontSize: 20, fontWeight: "800" },
  footer: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 7, paddingHorizontal: 3 },
});
