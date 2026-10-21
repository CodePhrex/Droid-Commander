import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { assessments, palette, statusLabel, type AssessmentStatus } from "@/constants/commander";

const statusColors: Record<AssessmentStatus, { text: string; fill: string }> = {
  critical: { text: palette.red, fill: "#FCECEB" },
  review: { text: palette.yellow, fill: palette.yellowSoft },
  clear: { text: palette.green, fill: palette.greenSoft },
  limited: { text: palette.muted, fill: "#EEF1F1" },
};

export default function AssessmentsScreen() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selected, setSelected] = useState("security-patch");

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>ASSESSMENT BAY // LOCAL EVIDENCE</Text>
        <Text style={styles.title}>Observable checks.</Text>
        <Text style={styles.subtitle}>
          Each row states what the app can see, what it cannot see, and what a safe next step looks like.
        </Text>

        <View style={styles.modeCard}>
          <View style={styles.modeTop}>
            <View>
              <Text style={styles.modeLabel}>ASSESSMENT MODE</Text>
              <Text style={styles.modeTitle}>{completed ? "Verification complete" : "Standard device / non-rooted"}</Text>
            </View>
            <View style={styles.modeBadge}><Text style={styles.modeBadgeText}>LOCAL</Text></View>
          </View>
          <Text style={styles.modeDetail}>
            {completed
              ? "The demo loop updated one signal. Native adapters will replace these representative observations."
              : "No backend, root access, or device-owner privileges are assumed in this mode."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={running ? "Reading local signals" : completed ? "Run assessment again" : "Run local assessment"}
            accessibilityState={{ disabled: running }}
            disabled={running}
            onPress={() => {
              setRunning(true);
              setTimeout(() => {
                setRunning(false);
                setCompleted(true);
              }, 550);
            }}
            style={({ pressed }) => [styles.runButton, pressed && styles.pressed, running && styles.runningButton]}
          >
            <Text style={styles.runButtonText}>{running ? "Reading local signals…" : completed ? "Run again" : "Run assessment"}</Text>
            <Text style={styles.runButtonArrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Check manifest</Text>
          <Text style={styles.sectionMeta}>4 OBSERVATIONS</Text>
        </View>

        {assessments.map((item, index) => {
          const expanded = selected === item.id;
          const colors = statusColors[item.status];
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${statusLabel(item.status)}. ${expanded ? "Collapse" : "Expand"} evidence`}
              accessibilityState={{ expanded }}
              onPress={() => setSelected(expanded ? "" : item.id)}
              style={({ pressed }) => [styles.checkCard, expanded && styles.selectedCard, pressed && styles.pressed]}
            >
              <View style={[styles.number, { backgroundColor: expanded ? palette.orange : "#EEF1EF" }]}>
                <Text style={[styles.numberText, { color: expanded ? "#FFFFFF" : palette.muted }]}>0{index + 1}</Text>
              </View>
              <View style={styles.checkBody}>
                <View style={styles.checkTopRow}>
                  <Text style={styles.checkTitle}>{item.label}</Text>
                  <View style={[styles.status, { backgroundColor: colors.fill }]}><Text style={[styles.statusText, { color: colors.text }]}>{statusLabel(item.status)}</Text></View>
                </View>
                {expanded ? <Text style={styles.detail}>{item.detail}</Text> : <Text style={styles.collapsed}>{item.category.toUpperCase()} SIGNAL</Text>}
                {expanded ? <Text style={styles.action}>{item.action} →</Text> : null}
              </View>
              <Text style={styles.chevron}>{expanded ? "⌃" : "⌄"}</Text>
            </Pressable>
          );
        })}

        <View style={styles.limitCard}>
          <Text style={styles.limitKicker}>BOUNDARY NOTE</Text>
          <Text style={styles.limitTitle}>A missing signal is not a clean result.</Text>
          <Text style={styles.limitBody}>
            Standard apps are sandboxed. When a check needs device-owner access, target cooperation, or a manufacturer feed, Droid Commander records the limitation instead of guessing.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34 },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 31, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  modeCard: { backgroundColor: palette.navy, borderRadius: 21, padding: 18, marginBottom: 25 },
  modeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modeLabel: { color: palette.navyMuted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  modeTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", marginTop: 6 },
  modeBadge: { borderWidth: 1, borderColor: "#476371", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 },
  modeBadgeText: { color: palette.navyMuted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  modeDetail: { color: palette.navyMuted, fontSize: 12, lineHeight: 17, marginTop: 10 },
  runButton: { backgroundColor: palette.orange, borderRadius: 12, minHeight: 48, marginTop: 16, paddingHorizontal: 13, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  runningButton: { opacity: 0.7 },
  runButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  runButtonArrow: { color: "#FFFFFF", fontSize: 18 },
  pressed: { opacity: 0.8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800" },
  sectionMeta: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  checkCard: { flexDirection: "row", backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 13, marginBottom: 9 },
  selectedCard: { borderColor: "#F8B79B", backgroundColor: "#FFFDFC" },
  number: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", marginRight: 10 },
  numberText: { fontSize: 10, fontWeight: "900" },
  checkBody: { flex: 1 },
  checkTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  checkTitle: { color: palette.ink, fontSize: 14, fontWeight: "800", flex: 1, paddingRight: 6 },
  status: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5 },
  statusText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  detail: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  collapsed: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.7, marginTop: 7 },
  action: { color: palette.orange, fontSize: 11, fontWeight: "900", marginTop: 8 },
  chevron: { color: palette.muted, fontSize: 17, marginLeft: 7 },
  limitCard: { backgroundColor: palette.orangeSoft, borderRadius: 17, padding: 16, marginTop: 9 },
  limitKicker: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  limitTitle: { color: palette.ink, fontSize: 16, fontWeight: "800", marginTop: 7 },
  limitBody: { color: "#7A6A65", fontSize: 12, lineHeight: 17, marginTop: 7 },
});
