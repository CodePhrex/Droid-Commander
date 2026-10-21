import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { palette } from "@/constants/commander";
import { createNativeVulnerabilityCatalog } from "@/lib/native-vulnerability-catalog";
import type { CatalogView } from "@/lib/vulnerability-catalog";

const catalog = createNativeVulnerabilityCatalog();

export default function CatalogScreen() {
  const [view, setView] = useState<CatalogView | null>(null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const refreshCatalog = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await catalog.sync();
      setView(result);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    catalog.loadCached().then((result) => {
      if (mounted) setView(result);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const records = catalog.search(query).slice(0, 12);
  const patches = view?.snapshot?.patches.slice(0, 5) ?? [];
  const state = view?.dataState ?? "empty";
  const stateColor = state === "current" ? palette.green : state === "stale" ? palette.orange : state === "cached" ? palette.yellow : palette.red;

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="px-4">
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshCatalog()} tintColor={palette.orange} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View><Text style={styles.eyebrow}>LOCAL THREAT INTELLIGENCE</Text><Text style={styles.title}>CVE + patch library</Text><Text style={styles.subtitle}>Offline-first reference data for authorized assessment.</Text></View>
          <View style={[styles.stateDot, { backgroundColor: stateColor }]}><IconSymbol name="book.closed.fill" size={20} color="#FFFFFF" /></View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTop}><Text style={styles.statusLabel}>CATALOG STATUS</Text><Text style={[styles.statusValue, { color: stateColor }]}>{state.toUpperCase()}</Text></View>
          <Text style={styles.statusCopy}>{view?.online ? "Refresh completed against configured feeds." : view?.offlineUsable ? "Showing the last locally verified snapshot. Refresh when connected." : "No catalog snapshot is available yet. Connect to refresh authoritative feeds."}</Text>
          <View style={styles.metrics}><Metric value={String(view?.snapshot?.records.length ?? 0)} label="records" /><Metric value={String(view?.snapshot?.patches.length ?? 0)} label="patch advisories" /><Metric value={String(view?.staleSources.length ?? 0)} label="stale sources" /></View>
        </View>

        <View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={18} color={palette.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search CVE, package, product" placeholderTextColor={palette.muted} style={styles.searchInput} /></View>

        <SectionTitle title="Source freshness" />
        <View style={styles.sourceList}>{(view?.snapshot?.sources ?? []).map((source) => <View key={source.sourceId} style={styles.sourceRow}><View style={[styles.sourceMark, { backgroundColor: source.status === "fresh" ? palette.green : source.status === "stale" ? palette.orange : palette.muted }]} /><View style={styles.sourceText}><Text style={styles.sourceName}>{source.sourceId === "cisa-kev" ? "CISA KEV" : source.sourceId === "android-bulletin" ? "Android Security Bulletin" : source.sourceId.toUpperCase()}</Text><Text style={styles.sourceRole}>{source.role}</Text></View><Text style={styles.sourceCount}>{source.recordCount}</Text></View>)}</View>

        <View style={styles.sectionHeader}><SectionTitle title="Priority records" /><Text style={styles.sectionMeta}>exploited first</Text></View>
        {records.length === 0 ? <EmptyState /> : records.map((record) => <View key={record.id} style={styles.recordCard}><View style={styles.recordTop}><Text style={styles.recordId}>{record.id}</Text>{record.exploited && <Text style={styles.kevBadge}>KNOWN EXPLOITED</Text>}</View><Text style={styles.recordTitle}>{record.title}</Text><Text numberOfLines={2} style={styles.recordSummary}>{record.summary || "No summary supplied by source."}</Text><View style={styles.recordBottom}><Text style={styles.severity}>{record.severity.toUpperCase()}{record.cvssScore !== undefined ? ` · CVSS ${record.cvssScore}` : ""}</Text><Text style={styles.recordSources}>{record.sourceIds.join(" · ")}</Text></View></View>)}

        <View style={styles.sectionHeader}><SectionTitle title="Android patch levels" /><Text style={styles.sectionMeta}>vendor update guidance</Text></View>
        {patches.length === 0 ? <Text style={styles.emptyText}>No Android bulletin manifest is cached. Refresh the catalog or configure the organization’s signed bulletin mirror.</Text> : patches.map((patch) => <View key={patch.id} style={styles.patchCard}><View style={styles.patchIcon}><IconSymbol name="arrow.down.circle.fill" size={18} color={palette.navy} /></View><View style={styles.patchBody}><Text style={styles.patchTitle}>{patch.title}</Text><Text style={styles.patchMeta}>Security patch level {patch.patchLevel ?? "not specified"} · {patch.fixedCves.length} CVEs</Text></View></View>)}

        <Pressable onPress={() => void refreshCatalog()} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}><Text style={styles.refreshText}>{refreshing ? "Refreshing feeds…" : "Refresh authoritative feeds"}</Text></Pressable>
        {refreshing && <ActivityIndicator color={palette.orange} style={styles.spinner} />}
      </ScrollView>
    </ScreenContainer>
  );
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
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
  metrics: { flexDirection: "row", marginTop: 16, gap: 22 },
  metricValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  metricLabel: { color: palette.navyMuted, fontSize: 9, marginTop: 2 },
  metric: { minWidth: 74 },
  searchBox: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, marginTop: 16 },
  searchInput: { color: palette.ink, flex: 1, fontSize: 13, paddingVertical: 12, paddingLeft: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 22 },
  sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: "900" },
  sectionMeta: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  sourceList: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 14, marginTop: 9, paddingHorizontal: 12 },
  sourceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.line },
  sourceMark: { width: 7, height: 7, borderRadius: 4, marginRight: 10 },
  sourceText: { flex: 1 },
  sourceName: { color: palette.ink, fontSize: 11, fontWeight: "900" },
  sourceRole: { color: palette.muted, fontSize: 9, marginTop: 2 },
  sourceCount: { color: palette.ink, fontSize: 11, fontWeight: "900" },
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
