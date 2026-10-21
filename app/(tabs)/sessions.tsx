import { useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { palette, sessions } from "@/constants/commander";
import { renderSessionDisclosureMarkdown } from "@/lib/session-disclosure";

export default function SessionsScreen() {
  const [selected, setSelected] = useState<string | null>("session-041");
  const [exporting, setExporting] = useState(false);

  const exportDisclosure = async () => {
    setExporting(true);
    try {
      await Share.share({
        title: "Droid Commander session disclosure",
        message: renderSessionDisclosureMarkdown(sessions),
      });
    } catch {
      Alert.alert("Export unavailable", "The system share sheet could not be opened. No session data was changed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>FIELD LOG // LOCAL STORAGE</Text>
            <Text style={styles.title}>Session reports.</Text>
          </View>
          <View style={styles.countBadge}><Text style={styles.countText}>03</Text></View>
        </View>
        <Text style={styles.subtitle}>
          Audit-ready context stays with the session: scope, authorization, evidence, remediation, and limitations.
        </Text>

        <View style={styles.storageCard}>
          <View style={styles.storageIcon}><Text style={styles.storageIconText}>▤</Text></View>
          <View style={styles.storageCopy}>
            <Text style={styles.storageTitle}>Stored on this device</Text>
            <Text style={styles.storageDetail}>No cloud sync required for the training log.</Text>
          </View>
          <View style={styles.storageStatus}><View style={styles.dot} /><Text style={styles.storageStatusText}>READY</Text></View>
        </View>

        <View style={styles.exportCard}>
          <View style={styles.exportIcon}><Text style={styles.exportIconText}>↗</Text></View>
          <View style={styles.exportCopy}>
            <Text style={styles.exportTitle}>User disclosure export</Text>
            <Text style={styles.exportDetail}>Share a readable Markdown summary of local sessions.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export session disclosure"
            accessibilityState={{ busy: exporting }}
            disabled={exporting}
            onPress={() => void exportDisclosure()}
            style={({ pressed }) => [styles.exportButton, pressed && styles.pressed, exporting && styles.exportButtonDisabled]}
          >
            <Text style={styles.exportButtonText}>{exporting ? "Preparing…" : "Export"}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.sectionMeta}>SORT: NEWEST</Text>
        </View>

        {sessions.map((session, index) => {
          const expanded = selected === session.id;
          return (
            <Pressable
              key={session.id}
              accessibilityRole="button"
              accessibilityLabel={`${session.title}, ${session.status}. ${expanded ? "Collapse" : "Expand"} audit context`}
              accessibilityState={{ expanded }}
              onPress={() => setSelected(expanded ? null : session.id)}
              style={({ pressed }) => [styles.sessionCard, expanded && styles.selectedCard, pressed && styles.pressed]}
            >
              <View style={styles.sessionTop}>
                <View style={[styles.sessionNumber, { backgroundColor: index === 0 ? palette.orange : "#E7EEEB" }]}>
                  <Text style={[styles.sessionNumberText, { color: index === 0 ? "#FFFFFF" : palette.muted }]}>0{index + 1}</Text>
                </View>
                <View style={styles.sessionMain}>
                  <View style={styles.titleLine}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <View style={[styles.statusPill, { backgroundColor: session.status === "verified" ? palette.greenSoft : palette.yellowSoft }]}>
                      <Text style={[styles.statusText, { color: session.status === "verified" ? palette.green : palette.yellow }]}>{session.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionScope}>{session.scope}</Text>
                  <View style={styles.metaLine}>
                    <Text style={styles.sessionDate}>{session.timestamp}</Text>
                    <Text style={styles.result}>{session.result}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>{expanded ? "⌃" : "⌄"}</Text>
              </View>
              {expanded ? (
                <View style={styles.auditBlock}>
                  <Text style={styles.auditTitle}>AUDIT CONTEXT ATTACHED</Text>
                  <View style={styles.auditRow}><Text style={styles.auditLabel}>Scope</Text><Text style={styles.auditValue}>{session.scope}</Text></View>
                  <View style={styles.auditRow}><Text style={styles.auditLabel}>Authorization</Text><Text style={styles.auditValue}>Owner consent recorded</Text></View>
                  <View style={styles.auditRow}><Text style={styles.auditLabel}>Assessment</Text><Text style={styles.auditValue}>Observable signals only</Text></View>
                  <View style={styles.auditRow}><Text style={styles.auditLabel}>Remediation</Text><Text style={styles.auditValue}>Guided / no payloads</Text></View>
                  <View style={styles.auditRow}><Text style={styles.auditLabel}>Limitations</Text><Text style={styles.auditValue}>Non-rooted device boundary</Text></View>
                  <Pressable style={styles.reportButton}><Text style={styles.reportButtonText}>Open full report</Text><Text style={styles.reportButtonArrow}>→</Text></Pressable>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintKicker}>NEXT LOCAL SESSION</Text>
          <Text style={styles.emptyHintTitle}>Attach authorization before you connect a target.</Text>
          <Text style={styles.emptyHintBody}>The report must explain who approved the scope and what the app could not verify.</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 31, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  countBadge: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 9, marginBottom: 19 },
  storageCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.greenSoft, borderRadius: 16, padding: 13, marginBottom: 26 },
  storageIcon: { width: 33, height: 33, borderRadius: 11, backgroundColor: palette.green, alignItems: "center", justifyContent: "center", marginRight: 10 },
  storageIconText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  storageCopy: { flex: 1 },
  storageTitle: { color: palette.ink, fontSize: 13, fontWeight: "800" },
  storageDetail: { color: palette.green, fontSize: 11, marginTop: 3 },
  storageStatus: { flexDirection: "row", alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green, marginRight: 5 },
  storageStatusText: { color: palette.green, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  exportCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 12, marginBottom: 25 },
  exportIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: palette.orangeSoft, alignItems: "center", justifyContent: "center", marginRight: 10 },
  exportIconText: { color: palette.orange, fontSize: 18, fontWeight: "900" },
  exportCopy: { flex: 1, paddingRight: 8 },
  exportTitle: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  exportDetail: { color: palette.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  exportButton: { minHeight: 40, justifyContent: "center", backgroundColor: palette.navy, borderRadius: 10, paddingHorizontal: 12 },
  exportButtonDisabled: { opacity: 0.65 },
  exportButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800" },
  sectionMeta: { color: palette.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  sessionCard: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 13, marginBottom: 10 },
  selectedCard: { borderColor: "#F8B79B" },
  pressed: { opacity: 0.82 },
  sessionTop: { flexDirection: "row", alignItems: "flex-start" },
  sessionNumber: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", marginRight: 10 },
  sessionNumberText: { fontSize: 10, fontWeight: "900" },
  sessionMain: { flex: 1 },
  titleLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionTitle: { color: palette.ink, fontSize: 14, fontWeight: "800", flex: 1, paddingRight: 6 },
  statusPill: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  sessionScope: { color: palette.muted, fontSize: 11, marginTop: 6 },
  metaLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  sessionDate: { color: palette.muted, fontSize: 10 },
  result: { color: palette.orange, fontSize: 10, fontWeight: "800" },
  chevron: { color: palette.muted, fontSize: 17, marginLeft: 7 },
  auditBlock: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 14, paddingTop: 12, marginLeft: 38 },
  auditTitle: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  auditRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 9 },
  auditLabel: { color: palette.muted, fontSize: 10, width: 80 },
  auditValue: { color: palette.ink, fontSize: 10, fontWeight: "700", flex: 1, textAlign: "right" },
  reportButton: { borderTopWidth: 1, borderTopColor: palette.line, minHeight: 44, marginTop: 13, paddingTop: 12, flexDirection: "row", justifyContent: "space-between" },
  reportButtonText: { color: palette.orange, fontSize: 11, fontWeight: "900" },
  reportButtonArrow: { color: palette.orange, fontSize: 17 },
  emptyHint: { backgroundColor: palette.navy, borderRadius: 17, padding: 16, marginTop: 7 },
  emptyHintKicker: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  emptyHintTitle: { color: "#FFFFFF", fontSize: 16, lineHeight: 20, fontWeight: "800", marginTop: 7 },
  emptyHintBody: { color: palette.navyMuted, fontSize: 12, lineHeight: 17, marginTop: 7 },
});
