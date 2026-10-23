import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/constants/commander";
import { useLocalAssessment } from "@/hooks/use-local-assessment";
import { hostIdentity, renderLocalAssessmentMarkdown, type LocalAssessmentReport } from "@/lib/local-assessment";
import { mobilePrivilegedActionLedger, type MobileLedgerVerification } from "@/lib/native-privileged-action-ledger";
import { renderPrivilegedLedgerDisclosureMarkdown } from "@/lib/session-disclosure";

export default function SessionsScreen() {
  const { history, storageWarning } = useLocalAssessment();
  const [selected, setSelected] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState<LocalAssessmentReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const [ledgerIntegrity, setLedgerIntegrity] = useState<MobileLedgerVerification | null>(null);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    void mobilePrivilegedActionLedger.verify().then((integrity) => {
      if (mounted) setLedgerIntegrity(integrity);
    }).catch(() => {
      if (mounted) setLedgerIntegrity({ valid: false, entries: 0, lastHash: null, error: "Ledger unavailable." });
    });
    return () => { mounted = false; };
  }, []));

  const exportDisclosure = async () => {
    setExporting(true);
    try {
      // Re-read on export; never share a stale snapshot cached on initial mount.
      const [events, integrity] = await Promise.all([mobilePrivilegedActionLedger.read(), mobilePrivilegedActionLedger.verify()]);
      setLedgerIntegrity(integrity);
      await Share.share({ title: "Droid Commander privileged-action ledger", message: renderPrivilegedLedgerDisclosureMarkdown(events, integrity) });
    } catch {
      Alert.alert("Export unavailable", "The ledger could not be read or the system share sheet could not be opened. No device data was changed.");
    } finally { setExporting(false); }
  };

  const shareReport = async (report: LocalAssessmentReport) => {
    try {
      await Share.share({ title: "Droid Commander local host assessment", message: renderLocalAssessmentMarkdown(report) });
    } catch {
      Alert.alert("Export unavailable", "The system share sheet could not be opened. The report remains stored locally.");
    }
  };

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View><Text style={styles.kicker}>FIELD LOG // ACTUAL HOST READINGS</Text><Text style={styles.title}>Session reports.</Text></View>
          <View style={styles.countBadge}><Text style={styles.countText}>{history.length}</Text></View>
        </View>
        <Text style={styles.subtitle}>Real read-only host assessments, with evidence, collection timestamps and limitations. No sample handsets or fabricated owner consent.</Text>
        <View style={styles.storageCard}>
          <Text style={styles.storageTitle}>{storageWarning ? "Storage warning" : "Local assessment history"}</Text>
          <Text style={styles.storageDetail}>{storageWarning ?? "Up to 100 newest reports in app-private AsyncStorage. No app-level cloud sync; Android system backup settings may still apply. This history is not encrypted or hardware-attested by the app."}</Text>
        </View>
        <View style={styles.exportCard}>
          <View style={styles.exportCopy}>
            <Text style={styles.exportTitle}>Privileged action ledger</Text>
            <Text style={styles.exportDetail}>{!ledgerIntegrity ? "Checking integrity…" : ledgerIntegrity.valid ? `${ledgerIntegrity.entries} entries · SHA-256 chain verified` : `Integrity warning · ${ledgerIntegrity.error ?? "verification failed"}`}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Export privileged action disclosure" accessibilityState={{ busy: exporting }} disabled={exporting} onPress={() => void exportDisclosure()} style={styles.exportButton}>
            <Text style={styles.exportButtonText}>{exporting ? "Preparing…" : "Export"}</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionTitle}>Actual host assessment history</Text>
        {!history.length ? <View style={styles.sessionCard}><Text style={styles.sessionTitle}>No host reports recorded yet</Text><Text style={styles.subtitle}>Run an assessment in Command or Assess. It reads the device running Droid Commander; a USB target is not required.</Text></View> : history.map((report) => {
          const expanded = selected === report.id;
          return (
            <View key={report.id} style={styles.sessionCard}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setSelected(expanded ? null : report.id)}>
                <View style={styles.headerRow}><Text style={styles.sessionTitle}>{hostIdentity(report.host)}</Text><Text style={styles.statusText}>READ-ONLY</Text></View>
                <Text style={styles.sessionDate}>{report.collectedAt}</Text>
                <Text style={styles.result}>{report.summary.review} review · {report.summary.unknown} unknown · {report.summary.observed}/{report.checks.length} observed</Text>
              </Pressable>
              {expanded ? <View style={styles.auditBlock}>
                <Text style={styles.auditTitle}>ACTUAL EVIDENCE CONTEXT</Text>
                <Text style={styles.auditValue}>Source: Android native APIs{`\n`}Scope: local host only{`\n`}Root grant requested: no{`\n`}Remote owner consent: not claimed{`\n`}Patch level: {report.host.securityPatch ?? "unknown"}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Open full host report" onPress={() => setOpenReport(report)} style={styles.reportButton}><Text style={styles.reportButtonText}>Open full report →</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Share host assessment report" onPress={() => void shareReport(report)} style={styles.reportButton}><Text style={styles.reportButtonText}>Export this report →</Text></Pressable>
              </View> : null}
            </View>
          );
        })}
      </ScrollView>
      <Modal visible={openReport !== null} animationType="slide" onRequestClose={() => setOpenReport(null)}>
        <ScreenContainer containerClassName="bg-[#F5F3EE]">
          <View style={styles.modalToolbar}>
            <Pressable accessibilityRole="button" onPress={() => setOpenReport(null)}><Text style={styles.reportButtonText}>Close</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { if (openReport) void shareReport(openReport); }}><Text style={styles.reportButtonText}>Export report</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}><Text selectable style={styles.reportContent}>{openReport ? renderLocalAssessmentMarkdown(openReport) : ""}</Text></ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 31, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  countBadge: { minWidth: 38, height: 38, borderRadius: 13, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 9, marginBottom: 19 },
  storageCard: { backgroundColor: palette.greenSoft, borderRadius: 16, padding: 14, marginBottom: 20 },
  storageTitle: { color: palette.ink, fontSize: 13, fontWeight: "800" },
  storageDetail: { color: palette.green, fontSize: 11, lineHeight: 17, marginTop: 5 },
  exportCard: { flexDirection: "row", alignItems: "center", backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 12, marginBottom: 25 },
  exportCopy: { flex: 1, paddingRight: 8 },
  exportTitle: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  exportDetail: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  exportButton: { minHeight: 44, justifyContent: "center", backgroundColor: palette.navy, borderRadius: 10, paddingHorizontal: 13 },
  exportButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", marginBottom: 10 },
  sessionCard: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  sessionTitle: { color: palette.ink, fontSize: 15, fontWeight: "800", flexShrink: 1 },
  statusText: { color: palette.green, fontSize: 9, fontWeight: "900" },
  sessionDate: { color: palette.muted, fontSize: 11, marginTop: 7 },
  result: { color: palette.orange, fontSize: 11, marginTop: 8 },
  auditBlock: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 14, paddingTop: 12 },
  auditTitle: { color: palette.orange, fontSize: 9, fontWeight: "900" },
  auditValue: { color: palette.ink, fontSize: 12, lineHeight: 20, marginTop: 8 },
  reportButton: { borderTopWidth: 1, borderTopColor: palette.line, minHeight: 44, marginTop: 12, justifyContent: "center" },
  reportButtonText: { color: palette.orange, fontSize: 12, fontWeight: "900" },
  modalToolbar: { padding: 20, flexDirection: "row", justifyContent: "space-between" },
  reportContent: { color: palette.ink, fontSize: 13, lineHeight: 21 },
});
