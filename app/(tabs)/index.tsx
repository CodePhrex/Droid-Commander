import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { HostInformation } from "@/components/host-information";
import { palette, statusLabel, type AssessmentStatus } from "@/constants/commander";
import { useLocalAssessment } from "@/hooks/use-local-assessment";

const statusColors: Record<AssessmentStatus, { text: string; fill: string }> = {
  critical: { text: palette.red, fill: "#FCECEB" },
  review: { text: palette.yellow, fill: palette.yellowSoft },
  clear: { text: palette.green, fill: palette.greenSoft },
  limited: { text: palette.muted, fill: "#EEF1F1" },
};

export default function CommandCenterScreen() {
  const { report, phase, error, storageWarning, cached, runAssessment } = useLocalAssessment();
  const running = phase === "running";
  const checks = report?.checks ?? [];
  const summary = report?.summary;

  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [usbExpanded, setUsbExpanded] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeName, setScopeName] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [sessionAuthorized, setSessionAuthorized] = useState(false);

  const canCreateScope = scopeName.trim().length > 2 && authorizedBy.trim().length > 2;
  const observed = summary?.observed ?? 0;
  const totalChecks = checks.length || 1;
  const coveragePct = Math.round((observed / totalChecks) * 100);

  return (
    <ScreenContainer containerClassName="bg-[#F4F7FB]" safeAreaClassName="bg-[#F4F7FB]">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>DROID COMMANDER // DEVICE OVERVIEW</Text>
            <Text style={styles.wordmark}>Droid Commander</Text>
          </View>
          <View style={styles.offlinePill}>
            <View style={styles.greenDot} />
            <Text style={styles.offlineText}>LOCAL MODE</Text>
          </View>
        </View>

        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text style={styles.title}>Clear signals.\nConfident decisions.</Text>
            <Text style={styles.subtitle}>
              A consent-first field instrument for learning how device posture can be measured and improved.
            </Text>
          </View>
          <Text style={styles.buildTag}>FIELD BUILD{"\n"}0.1</Text>
        </View>

        <View style={styles.postureCard}>
          <View style={styles.postureTopRow}>
            <Text style={styles.postureLabel}>DEVICE POSTURE</Text>
            <Text style={styles.postureStamp}>
              {running ? "READING…" : report ? (cached ? "CACHED" : "LIVE") : "NOT ASSESSED"}
            </Text>
          </View>
          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <Text style={styles.score}>{report ? coveragePct : "—"}</Text>
              <Text style={styles.scoreDenominator}>{report ? "%" : ""}</Text>
            </View>
            <View style={styles.scoreCopy}>
              <Text style={styles.scoreTitle}>
                {report ? "Observable coverage" : "No host reading yet"}
              </Text>
              <Text style={styles.scoreDetail}>
                {report
                  ? `${summary?.observed ?? 0} observed · ${summary?.review ?? 0} review · ${summary?.clear ?? 0} clear · ${summary?.unknown ?? 0} unknown. This is not a security score.`
                  : "Run a local host assessment to collect real Android readings. Coverage is not a security score."}
              </Text>
            </View>
          </View>
          <View style={styles.scoreBarTrack}>
            <View style={[styles.scoreBarFill, { width: report ? `${coveragePct}%` : "0%" }]} />
          </View>
          {report ? (
            <View style={styles.scoreMetaRow}>
              <Text style={styles.scoreMeta}>{summary?.review ?? 0} review</Text>
              <Text style={styles.scoreMeta}>{summary?.clear ?? 0} clear</Text>
              <Text style={styles.scoreMeta}>{summary?.unknown ?? 0} limited</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={running ? "Reading local signals" : report ? "Refresh host readings" : "Run local host assessment"}
          accessibilityState={{ disabled: running }}
          disabled={running}
          onPress={() => void runAssessment()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, running && styles.runningButton]}
        >
          <View style={styles.primaryButtonIcon}>
            <Text style={styles.primaryButtonIconText}>+</Text>
          </View>
          <View style={styles.primaryButtonCopy}>
            <Text style={styles.primaryButtonTitle}>
              {running ? "Reading local signals…" : report ? "Refresh host readings" : "Run local assessment"}
            </Text>
            <Text style={styles.primaryButtonDetail}>
              Uses only observable, permission-compliant native signals
            </Text>
          </View>
          <Text style={styles.primaryArrow}>›</Text>
        </Pressable>

        {error ? (
          <Text accessibilityRole="alert" style={styles.alertText}>
            {error}
          </Text>
        ) : null}
        {storageWarning ? (
          <Text accessibilityRole="alert" style={styles.alertText}>
            {storageWarning}
          </Text>
        ) : null}

        <HostInformation report={report} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assessment signals</Text>
          <Text style={styles.sectionMeta}>{checks.length ? `${checks.length} CHECKS` : "—"}</Text>
        </View>

        {checks.slice(0, 4).map((item, index) => {
          const colors = statusColors[item.status];
          const expanded = expandedFinding === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${statusLabel(item.status)}. ${expanded ? "Collapse" : "Expand"} evidence`}
              accessibilityState={{ expanded }}
              onPress={() => setExpandedFinding(expanded ? null : item.id)}
              style={({ pressed }) => [styles.findingCard, pressed && styles.pressed]}
            >
              <View style={styles.findingIndex}>
                <Text style={styles.findingIndexText}>0{index + 1}</Text>
              </View>
              <View style={styles.findingBody}>
                <View style={styles.findingTopRow}>
                  <Text style={styles.findingTitle}>{item.label}</Text>
                  <View style={[styles.statusPill, { backgroundColor: colors.fill }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>
                {expanded ? (
                  <Text selectable style={styles.findingDetail}>
                    Value: {item.value}{"\n"}
                    {item.detail}{"\n"}
                    Evidence: {item.source}{"\n"}
                    Limitation: {item.limitation}
                  </Text>
                ) : (
                  <Text style={styles.collapsedValue}>{item.value}</Text>
                )}
                <Text style={styles.findingAction}>
                  {expanded ? item.action : "Tap to inspect evidence"}
                </Text>
              </View>
              <Text style={styles.findingChevron}>{expanded ? "⌃" : "⌄"}</Text>
            </Pressable>
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Connection readiness</Text>
          <Text style={styles.sectionMeta}>USB / ADB</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Transport readiness details"
          accessibilityState={{ expanded: usbExpanded }}
          onPress={() => setUsbExpanded(!usbExpanded)}
          style={({ pressed }) => [styles.transportCard, pressed && styles.pressed]}
        >
          <View style={styles.transportIcon}>
            <Text style={styles.transportIconText}>↕</Text>
          </View>
          <View style={styles.transportBody}>
            <View style={styles.findingTopRow}>
              <Text style={styles.findingTitle}>No target connected</Text>
              <View style={styles.neutralPill}>
                <Text style={styles.neutralPillText}>BEST EFFORT</Text>
              </View>
            </View>
            <Text style={styles.transportDetail}>
              Connect a compatible OTG path, then confirm the owner-approved protocol on both devices.
            </Text>
            {usbExpanded ? (
              <View style={styles.transportChecklist}>
                <Text style={styles.checklistLine}>
                  <Text style={styles.checklistMark}>01</Text> Host hardware and cable capability
                </Text>
                <Text style={styles.checklistLine}>
                  <Text style={styles.checklistMark}>02</Text> Target-side permission and consent
                </Text>
                <Text style={styles.checklistLine}>
                  <Text style={styles.checklistMark}>03</Text> Cooperative protocol or approved ADB trust
                </Text>
              </View>
            ) : null}
            <Text style={styles.findingAction}>
              {usbExpanded ? "USB path is never a privilege bypass" : "Review connection prerequisites"}
            </Text>
          </View>
          <Text style={styles.findingChevron}>{usbExpanded ? "⌃" : "⌄"}</Text>
        </Pressable>

        <View style={styles.scopeCard}>
          <View style={styles.scopeTopRow}>
            <View style={styles.scopeMark}>
              <Text style={styles.scopeMarkText}>{sessionAuthorized ? "✓" : "!"}</Text>
            </View>
            <View style={styles.scopeCopy}>
              <Text style={styles.scopeTitle}>
                {sessionAuthorized ? "Scope attached" : "Training scope required"}
              </Text>
              <Text style={styles.scopeDetail}>
                {sessionAuthorized
                  ? `${scopeName} · authorized by ${authorizedBy}`
                  : "Create an auditable authorization before any active exercise."}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sessionAuthorized ? "Review authorization" : "Create scoped session"}
            onPress={() => setScopeOpen(true)}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>
              {sessionAuthorized ? "Review authorization" : "Create scoped session"}
            </Text>
            <Text style={styles.secondaryButtonArrow}>→</Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          Local host only. Readings are read-only native observations. Coverage is not a security
          score. Missing values stay unknown.
        </Text>
      </ScrollView>

      <Modal visible={scopeOpen} animationType="slide" transparent onRequestClose={() => setScopeOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalKicker}>AUTHORIZATION RECORD</Text>
            <Text style={styles.modalTitle}>Define the training scope.</Text>
            <Text style={styles.modalBody}>
              This record stays attached to the exercise and its report. It does not grant device privileges.
            </Text>
            <Text style={styles.inputLabel}>TARGET SCOPE</Text>
            <TextInput
              value={scopeName}
              onChangeText={setScopeName}
              placeholder="e.g. Lab handset A"
              placeholderTextColor="#9AA5A7"
              style={styles.input}
            />
            <Text style={styles.inputLabel}>AUTHORIZED BY</Text>
            <TextInput
              value={authorizedBy}
              onChangeText={setAuthorizedBy}
              placeholder="Name or training ticket"
              placeholderTextColor="#9AA5A7"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setScopeOpen(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!canCreateScope}
                onPress={() => {
                  setSessionAuthorized(true);
                  setScopeOpen(false);
                }}
                style={[styles.modalPrimary, !canCreateScope && styles.disabledButton]}
              >
                <Text style={styles.modalPrimaryText}>Attach authorization</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  kicker: { color: palette.orange, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  wordmark: { color: "#172B4D", fontSize: 21, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 },
  offlinePill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  greenDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: palette.green, marginRight: 6 },
  offlineText: { color: palette.green, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  introRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 22,
    marginBottom: 18,
  },
  introCopy: { flex: 1, paddingRight: 18 },
  title: { color: "#172B4D", fontSize: 30, fontWeight: "800", letterSpacing: -1.1, lineHeight: 34 },
  subtitle: { color: "#62748A", fontSize: 14, lineHeight: 20, marginTop: 8 },
  buildTag: {
    color: "#62748A",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "right",
  },
  postureCard: { backgroundColor: "#173B6C", borderRadius: 22, padding: 20, marginBottom: 12 },
  postureTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  postureLabel: { color: palette.navyMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  postureStamp: { color: palette.orange, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  scoreRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  scoreBlock: { flexDirection: "row", alignItems: "flex-end", width: 116 },
  score: { color: "#FFFFFF", fontSize: 54, fontWeight: "800", letterSpacing: -3, lineHeight: 58 },
  scoreDenominator: { color: palette.navyMuted, fontSize: 13, fontWeight: "700", marginBottom: 9, marginLeft: 3 },
  scoreCopy: { flex: 1, paddingBottom: 5 },
  scoreTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  scoreDetail: { color: palette.navyMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  scoreBarTrack: { height: 6, borderRadius: 4, backgroundColor: "#C8D9EE", marginTop: 18, overflow: "hidden" },
  scoreBarFill: { height: 6, backgroundColor: palette.orange, borderRadius: 4 },
  scoreMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  scoreMeta: { color: palette.navyMuted, fontSize: 10, fontWeight: "700" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    backgroundColor: palette.orange,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  runningButton: { opacity: 0.7 },
  primaryButtonIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonIconText: { color: "#FFFFFF", fontSize: 22, fontWeight: "500", lineHeight: 24 },
  primaryButtonCopy: { flex: 1, marginLeft: 11 },
  primaryButtonTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  primaryButtonDetail: { color: "#F0F6FF", fontSize: 11, marginTop: 3 },
  primaryArrow: { color: "#FFFFFF", fontSize: 27, fontWeight: "300", paddingHorizontal: 4 },
  pressed: { opacity: 0.82 },
  alertText: { color: palette.red, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 12,
  },
  sectionTitle: { color: "#172B4D", fontSize: 17, fontWeight: "800" },
  sectionMeta: { color: "#62748A", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  findingCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 15,
    padding: 13,
    marginBottom: 9,
  },
  findingIndex: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "#E6F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  findingIndexText: { color: palette.orange, fontSize: 10, fontWeight: "900" },
  findingBody: { flex: 1 },
  findingTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  findingTitle: { color: "#172B4D", fontSize: 14, fontWeight: "800", flex: 1, paddingRight: 7 },
  statusPill: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4 },
  statusText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  findingDetail: { color: "#62748A", fontSize: 12, lineHeight: 17, marginTop: 8 },
  collapsedValue: { color: "#62748A", fontSize: 9, fontWeight: "900", letterSpacing: 0.7, marginTop: 7 },
  findingAction: { color: palette.orange, fontSize: 11, fontWeight: "800", marginTop: 8 },
  findingChevron: { color: "#62748A", fontSize: 17, marginLeft: 7, marginTop: 1 },
  transportCard: {
    flexDirection: "row",
    backgroundColor: "#EAF1F8",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  transportIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#173B6C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  transportIconText: { color: "#FFFFFF", fontSize: 21, fontWeight: "700" },
  transportBody: { flex: 1 },
  neutralPill: { borderRadius: 5, backgroundColor: "#DCE7F4", paddingHorizontal: 6, paddingVertical: 4 },
  neutralPillText: { color: "#62748A", fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  transportDetail: { color: "#62748A", fontSize: 12, lineHeight: 17, marginTop: 8 },
  transportChecklist: {
    borderTopWidth: 1,
    borderTopColor: "#DCE5EF",
    marginTop: 10,
    paddingTop: 8,
    gap: 6,
  },
  checklistLine: { color: "#172B4D", fontSize: 11, lineHeight: 15 },
  checklistMark: { color: palette.orange, fontWeight: "900", letterSpacing: 0.6 },
  scopeCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 14,
  },
  scopeTopRow: { flexDirection: "row", alignItems: "center" },
  scopeMark: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#E6F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  scopeMarkText: { color: palette.orange, fontSize: 18, fontWeight: "900" },
  scopeCopy: { flex: 1 },
  scopeTitle: { color: "#172B4D", fontSize: 14, fontWeight: "800" },
  scopeDetail: { color: "#62748A", fontSize: 11, lineHeight: 16, marginTop: 3 },
  secondaryButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#DCE5EF",
    marginTop: 14,
    paddingTop: 13,
  },
  secondaryButtonText: { color: palette.orange, fontSize: 12, fontWeight: "900" },
  secondaryButtonArrow: { color: palette.orange, fontSize: 18 },
  footerNote: {
    color: "#62748A",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    paddingHorizontal: 9,
    marginTop: 1,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(23,43,77,0.45)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#F4F7FB",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#C7D4E3",
    alignSelf: "center",
    marginBottom: 24,
  },
  modalKicker: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  modalTitle: { color: "#172B4D", fontSize: 25, fontWeight: "800", letterSpacing: -0.6, marginTop: 7 },
  modalBody: { color: "#62748A", fontSize: 13, lineHeight: 18, marginTop: 8, marginBottom: 20 },
  inputLabel: {
    color: "#62748A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 7,
    marginTop: 9,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5EF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#172B4D",
    fontSize: 14,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 22 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 12 },
  cancelText: { color: "#62748A", fontSize: 14, fontWeight: "700" },
  modalPrimary: {
    backgroundColor: palette.orange,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabledButton: { opacity: 0.45 },
});
