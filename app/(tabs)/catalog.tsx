import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { palette } from "@/constants/commander";
import { correlateHostVulnerabilities, type HostVulnerabilityCorrelationStatus } from "@/lib/host-vulnerability-correlation";
import { createNativeVulnerabilityCatalog } from "@/lib/native-vulnerability-catalog";
import type { CatalogSourceState, CatalogView } from "@/lib/vulnerability-catalog";
import { useLocalAssessment } from "@/hooks/use-local-assessment";

const catalog = createNativeVulnerabilityCatalog();
const RECORD_CARD_LIMIT = 12;
const CORRELATION_CARD_LIMIT = 6;

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message : "The catalog operation failed. Existing cached data, if any, has not been changed.";
}

function sourceColor(source: CatalogSourceState) {
  if (source.status === "fresh") return palette.green;
  if (source.status === "stale") return palette.orange;
  if (source.status === "unverified") return palette.yellow;
  return palette.red;
}

function correlationColor(status: HostVulnerabilityCorrelationStatus) {
  if (status === "potential-match") return palette.orange;
  if (status === "reported-patched") return palette.green;
  return palette.yellow;
}

function correlationLabel(status: HostVulnerabilityCorrelationStatus) {
  if (status === "potential-match") return "POTENTIAL MATCH";
  if (status === "reported-patched") return "REPORTED PATCHED";
  return "INSUFFICIENT EVIDENCE";
}

function hostModel(report: ReturnType<typeof useLocalAssessment>["report"]) {
  if (!report) return "No local host snapshot";
  return [report.host.manufacturer, report.host.model].filter((value): value is string => Boolean(value)).join(" ") || "Model not reported";
}

function hostBuild(report: ReturnType<typeof useLocalAssessment>["report"]) {
  if (!report) return "Not reported";
  return report.host.buildDisplay ?? report.host.buildId ?? report.host.systemBuildFingerprint ?? "Not reported";
}

export default function CatalogScreen() {
  const [view, setView] = useState<CatalogView | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const assessment = useLocalAssessment();

  const refreshCatalog = useCallback(async () => {
    setRefreshing(true);
    setCatalogError(null);
    try {
      const result = await catalog.sync();
      setView(result);
    } catch (error) {
      setCatalogError(errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void catalog.loadCached()
      .then((result) => {
        if (mounted) setView(result);
      })
      .catch((error) => {
        if (mounted) setCatalogError(errorMessage(error));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const searchedRecords = catalog.search(query);
  const records = searchedRecords.slice(0, RECORD_CARD_LIMIT);
  const allPatches = view?.snapshot?.patches ?? [];
  const patches = allPatches.slice(0, 5);
  const correlation = useMemo(
    () => correlateHostVulnerabilities(assessment.report?.host ?? null, view?.snapshot ?? null),
    [assessment.report, view?.snapshot],
  );
  const correlationFindings = correlation.findings.slice(0, CORRELATION_CARD_LIMIT);
  const state = view?.dataState ?? "empty";
  const stateColor = state === "current" ? palette.green : state === "stale" ? palette.orange : state === "cached" ? palette.yellow : palette.red;
  const signatureStatus = view?.snapshot?.integrity.signatureStatus ?? "not-configured";
  const catalogStatusCopy = view?.offlineUsable
    ? `Showing cached catalog data. Snapshot signature status: ${signatureStatus.replace("-", " ")}. Check each source below for freshness and failures.`
    : "No usable catalog snapshot is available. A refresh may populate reachable official feeds.";

  const runAssessment = useCallback(() => {
    void assessment.runAssessment().catch(() => undefined);
  }, [assessment]);

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="px-4">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshCatalog()} tintColor={palette.orange} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View><Text style={styles.eyebrow}>LOCAL THREAT INTELLIGENCE</Text><Text style={styles.title}>CVE + patch library</Text><Text style={styles.subtitle}>Offline-first reference data for authorized assessment.</Text></View>
          <View style={[styles.stateDot, { backgroundColor: stateColor }]}><IconSymbol name="book.closed.fill" size={20} color="#FFFFFF" /></View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}><Text style={styles.statusLabel}>CATALOG STATUS</Text><Text style={[styles.statusValue, { color: stateColor }]}>{state.toUpperCase()}</Text></View>
          <Text style={styles.statusCopy}>{catalogStatusCopy}</Text>
          <Text style={styles.signatureCopy}>HTTPS transport · signature status: {signatureStatus.replace("-", " ")}</Text>
          <View style={styles.metrics}><Metric value={String(view?.snapshot?.records.length ?? 0)} label="records" /><Metric value={String(view?.snapshot?.patches.length ?? 0)} label="patch advisories" /><Metric value={String(view?.staleSources.length ?? 0)} label="stale sources" /></View>
        </View>
        <Notice title="Dated offline reference" copy="This APK includes 121 unique CVE references from selected September/October 2026 Android bulletin tables, captured October 21, 2026. They are usable offline, not a complete OEM vulnerability or executable exploit library. Refresh for newer data; the live Android parser checks at most three recent monthly pages." tone="warning" />
        {catalogError && <Notice title="Catalog error" copy={catalogError} tone="error" />}

        <SectionTitle title="Cross-reference this host" />
        <View style={styles.hostCard}>
          <View style={styles.hostCardTop}>
            <View><Text style={styles.hostEyebrow}>LOCAL HOST · READ-ONLY</Text><Text style={styles.hostTitle}>{hostModel(assessment.report)}</Text></View>
            <Text style={[styles.phaseBadge, { color: assessment.phase === "running" ? palette.orange : assessment.phase === "complete" ? palette.green : palette.muted }]}>{assessment.phase.toUpperCase()}</Text>
          </View>
          <HostRow label="Android" value={assessment.report?.host.androidVersion ?? "Not reported"} />
          <HostRow label="Build" value={hostBuild(assessment.report)} />
          <HostRow label="Security patch" value={assessment.report?.host.securityPatch ?? "Not reported"} />
          <HostRow label="Collected" value={assessment.report?.collectedAt ?? "No scan recorded"} />
          <Pressable accessibilityRole="button" accessibilityLabel="Collect local host details for vulnerability cross-reference" accessibilityState={{ busy: assessment.phase === "running", disabled: assessment.phase === "running" }} disabled={assessment.phase === "running"} onPress={runAssessment} style={({ pressed }) => [styles.assessmentButton, assessment.phase === "running" && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.assessmentButtonText}>{assessment.phase === "running" ? "Collecting local host details…" : "Collect local host details"}</Text>
          </Pressable>
          {assessment.error && <Notice title="Local assessment" copy={assessment.error} tone="error" />}
          {assessment.storageWarning && <Notice title="Storage warning" copy={assessment.storageWarning} tone="warning" />}

          {assessment.report && <View style={styles.correlationArea}>
            <View style={styles.correlationHeading}><Text style={styles.correlationTitle}>Patch cross-reference</Text><Text style={[styles.correlationOverall, { color: correlationColor(correlation.status) }]}>{correlationLabel(correlation.status)}</Text></View>
            <View style={styles.correlationMetrics}>
              <Metric value={String(correlation.counts["potential-match"])} label="potential" dark />
              <Metric value={String(correlation.counts["reported-patched"])} label="reported covered" dark />
              <Metric value={String(correlation.counts["insufficient-evidence"])} label="insufficient" dark />
            </View>
            {correlation.counts.total > CORRELATION_CARD_LIMIT && <Text style={styles.visibleCount}>Showing the first {CORRELATION_CARD_LIMIT} of {correlation.counts.total} correlation entries.</Text>}
            {correlationFindings.length === 0 ? <Text style={styles.correlationEmpty}>No eligible Android bulletin evidence is available for this host and cached catalog. This is not a safety conclusion.</Text> : correlationFindings.map((finding) => <View key={finding.id} style={styles.correlationCard}>
              <View style={styles.correlationCardTop}><Text style={styles.correlationId}>{finding.id}</Text><Text style={[styles.findingBadge, { color: correlationColor(finding.status) }]}>{correlationLabel(finding.status)}</Text></View>
              <Text style={styles.correlationName}>{finding.title}</Text>
              <Text style={styles.correlationMeta}>Earliest listed SPL: {finding.minimumPatchLevel ?? "not established"} · evidence: {finding.platformEvidence.replaceAll("-", " ")}</Text>
              {finding.advisories.length > 0 && <Text style={styles.correlationMeta}>Android bulletin advisories: {finding.advisories.map((advisory) => `${advisory.id} (${advisory.patchLevel ?? "no SPL"})`).join(", ")}</Text>}
              <Text style={styles.correlationRationale}>{finding.rationale}</Text>
            </View>)}
            <Text style={styles.correlationLimit}>{correlation.limitations[0]}</Text>
            <Text style={styles.correlationLimit}>{correlation.limitations[1]}</Text>
          </View>}
        </View>

        <View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={18} color={palette.muted} /><TextInput accessibilityLabel="Search vulnerability catalog" value={query} onChangeText={setQuery} placeholder="Search CVE, package, product" placeholderTextColor={palette.muted} style={styles.searchInput} /></View>

        <SectionTitle title="Source freshness" />
        <View style={styles.sourceList}>{(view?.snapshot?.sources ?? []).map((source) => <View key={source.sourceId} style={styles.sourceRow}><View style={[styles.sourceMark, { backgroundColor: sourceColor(source) }]} /><View style={styles.sourceText}><Text style={styles.sourceName}>{source.sourceId === "cisa-kev" ? "CISA KEV" : source.sourceId === "android-bulletin" ? "Android Security Bulletin" : source.sourceId.toUpperCase()}</Text><Text style={styles.sourceRole}>{source.role}</Text><Text style={styles.sourceDetail}>{source.status.toUpperCase()}{source.fetchedAt ? ` · fetched ${source.fetchedAt}` : ""}{source.error ? ` · ${source.error}` : ""}</Text></View><Text style={styles.sourceCount}>{source.recordCount}</Text></View>)}</View>

        <View style={styles.sectionHeader}><SectionTitle title="Priority records" /><Text style={styles.sectionMeta}>exploited first</Text></View>
        {searchedRecords.length > RECORD_CARD_LIMIT && <Text style={styles.visibleCount}>Showing the first {RECORD_CARD_LIMIT} of {searchedRecords.length} matching records.</Text>}
        {records.length === 0 ? <EmptyState /> : records.map((record) => <View key={record.id} style={styles.recordCard}><View style={styles.recordTop}><Text style={styles.recordId}>{record.id}</Text>{record.exploited && <Text style={styles.kevBadge}>KNOWN EXPLOITED</Text>}</View><Text style={styles.recordTitle}>{record.title}</Text><Text numberOfLines={2} style={styles.recordSummary}>{record.summary || "No summary supplied by source."}</Text><View style={styles.recordBottom}><Text style={styles.severity}>{record.severity.toUpperCase()}{record.cvssScore !== undefined ? ` · CVSS ${record.cvssScore}` : ""}</Text><Text style={styles.recordSources}>{record.sourceIds.join(" · ")}</Text></View></View>)}

        <View style={styles.sectionHeader}><SectionTitle title="Android patch levels" /><Text style={styles.sectionMeta}>catalog guidance</Text></View>
        {allPatches.length > 5 && <Text style={styles.visibleCount}>Showing the first 5 of {allPatches.length} patch advisories.</Text>}
        {patches.length === 0 ? <Text style={styles.emptyText}>No Android Security Bulletin advisories are cached yet. Refresh when this device has network access.</Text> : patches.map((patch) => <View key={patch.id} style={styles.patchCard}><View style={styles.patchIcon}><IconSymbol name="arrow.down.circle.fill" size={18} color={palette.navy} /></View><View style={styles.patchBody}><Text style={styles.patchTitle}>{patch.title}</Text><Text style={styles.patchMeta}>Security patch level {patch.patchLevel ?? "not specified"} · {patch.fixedCves.length} CVEs · {patch.sourceId}</Text></View></View>)}

        <Pressable accessibilityRole="button" accessibilityLabel="Attempt catalog refresh" accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing} onPress={() => void refreshCatalog()} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}><Text style={styles.refreshText}>{refreshing ? "Refreshing catalog sources…" : "Attempt catalog refresh"}</Text></Pressable>
        {refreshing && <ActivityIndicator color={palette.orange} style={styles.spinner} />}
      </ScrollView>
    </ScreenContainer>
  );
}

function Metric({ value, label, dark = false }: { value: string; label: string; dark?: boolean }) { return <View style={styles.metric}><Text style={[styles.metricValue, dark && styles.darkMetricValue]}>{value}</Text><Text style={[styles.metricLabel, dark && styles.darkMetricLabel]}>{label}</Text></View>; }
function HostRow({ label, value }: { label: string; value: string }) { return <View style={styles.hostRow}><Text style={styles.hostRowLabel}>{label}</Text><Text selectable style={styles.hostRowValue}>{value}</Text></View>; }
function Notice({ title, copy, tone }: { title: string; copy: string; tone: "error" | "warning" }) { return <View style={[styles.notice, tone === "error" ? styles.errorNotice : styles.warningNotice]}><Text style={styles.noticeTitle}>{title}</Text><Text style={styles.noticeCopy}>{copy}</Text></View>; }
function SectionTitle({ title }: { title: string }) { return <Text style={styles.sectionTitle}>{title}</Text>; }
function EmptyState() { return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No matching records</Text><Text style={styles.emptyText}>Try a CVE ID, package name, product, or leave search blank.</Text></View>; }

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 36 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: palette.ink, fontSize: 29, fontWeight: "800", letterSpacing: -1.1, marginTop: 4 },
  subtitle: { color: palette.muted, fontSize: 12, marginTop: 3 },
  stateDot: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statusCard: { backgroundColor: palette.navy, borderRadius: 18, padding: 16, marginTop: 18 },
  statusTop: { flexDirection: "row", justifyContent: "space-between" },
  statusLabel: { color: palette.navyMuted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  statusValue: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  statusCopy: { color: "#D9E5E8", fontSize: 12, lineHeight: 17, marginTop: 8 },
  signatureCopy: { color: palette.navyMuted, fontSize: 10, fontWeight: "800", marginTop: 9, textTransform: "uppercase" },
  metrics: { flexDirection: "row", marginTop: 16, gap: 22 },
  metricValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  darkMetricValue: { color: palette.ink, fontSize: 17 },
  metricLabel: { color: palette.navyMuted, fontSize: 9, marginTop: 2 },
  darkMetricLabel: { color: palette.muted },
  metric: { minWidth: 74 },
  notice: { borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1 },
  errorNotice: { backgroundColor: "#FBE9E7", borderColor: "#EAB9B4" },
  warningNotice: { backgroundColor: palette.yellowSoft, borderColor: "#E7D5A7" },
  noticeTitle: { color: palette.ink, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 },
  noticeCopy: { color: palette.ink, fontSize: 11, lineHeight: 16, marginTop: 4 },
  hostCard: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 9 },
  hostCardTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 6 },
  hostEyebrow: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  hostTitle: { color: palette.ink, fontSize: 15, fontWeight: "900", marginTop: 3, maxWidth: 240 },
  phaseBadge: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, textAlign: "right" },
  hostRow: { borderTopColor: palette.line, borderTopWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 8 },
  hostRowLabel: { color: palette.muted, fontSize: 10, fontWeight: "800", width: 86 },
  hostRowValue: { color: palette.ink, flex: 1, fontSize: 10, fontWeight: "700" },
  assessmentButton: { backgroundColor: palette.navy, borderRadius: 10, alignItems: "center", paddingVertical: 11, marginTop: 8 },
  disabledButton: { backgroundColor: palette.muted },
  assessmentButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  correlationArea: { borderTopColor: palette.line, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  correlationHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  correlationTitle: { color: palette.ink, fontSize: 13, fontWeight: "900" },
  correlationOverall: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, textAlign: "right" },
  correlationMetrics: { flexDirection: "row", gap: 10, marginTop: 12 },
  visibleCount: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
  correlationEmpty: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 10 },
  correlationCard: { backgroundColor: "#F8FAF8", borderColor: palette.line, borderWidth: 1, borderRadius: 12, padding: 11, marginTop: 10 },
  correlationCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  correlationId: { color: palette.orange, flex: 1, fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  findingBadge: { fontSize: 8, fontWeight: "900", letterSpacing: 0.3, textAlign: "right" },
  correlationName: { color: palette.ink, fontSize: 12, fontWeight: "900", marginTop: 4 },
  correlationMeta: { color: palette.muted, fontSize: 9, lineHeight: 14, marginTop: 5 },
  correlationRationale: { color: palette.ink, fontSize: 10, lineHeight: 15, marginTop: 7 },
  correlationLimit: { color: palette.muted, fontSize: 9, lineHeight: 14, marginTop: 7 },
  searchBox: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, marginTop: 16 },
  searchInput: { color: palette.ink, flex: 1, fontSize: 13, paddingVertical: 12, paddingLeft: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 22 },
  sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: "900", marginTop: 22 },
  sectionMeta: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  sourceList: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 14, marginTop: 9, paddingHorizontal: 12 },
  sourceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.line },
  sourceMark: { width: 7, height: 7, borderRadius: 4, marginRight: 10 },
  sourceText: { flex: 1 },
  sourceName: { color: palette.ink, fontSize: 11, fontWeight: "900" },
  sourceRole: { color: palette.muted, fontSize: 9, marginTop: 2 },
  sourceDetail: { color: palette.muted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  sourceCount: { color: palette.ink, fontSize: 11, fontWeight: "900", marginLeft: 8 },
  recordCard: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 9 },
  recordTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recordId: { color: palette.orange, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  kevBadge: { color: palette.red, backgroundColor: "#FBE9E7", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5, fontSize: 8, fontWeight: "900" },
  recordTitle: { color: palette.ink, fontSize: 13, fontWeight: "900", marginTop: 7 },
  recordSummary: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  recordBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 11 },
  severity: { color: palette.navy, fontSize: 9, fontWeight: "900" },
  recordSources: { color: palette.muted, fontSize: 8, fontWeight: "800" },
  patchCard: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 9, flexDirection: "row", alignItems: "center" },
  patchIcon: { width: 34, height: 34, backgroundColor: palette.orangeSoft, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  patchBody: { flex: 1, marginLeft: 10 },
  patchTitle: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  patchMeta: { color: palette.muted, fontSize: 10, marginTop: 3 },
  emptyCard: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 9 },
  emptyTitle: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  emptyText: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  refreshButton: { backgroundColor: palette.orange, borderRadius: 12, alignItems: "center", paddingVertical: 13, marginTop: 22 },
  refreshText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  spinner: { marginTop: 12 },
  pressed: { opacity: 0.82 },
});
