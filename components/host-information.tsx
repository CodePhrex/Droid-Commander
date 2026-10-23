import { StyleSheet, Text, View } from "react-native";

import { palette } from "../constants/commander";
import { hostInformationRows, type LocalAssessmentReport } from "../lib/local-assessment";

export function HostInformation({ report }: { report: LocalAssessmentReport | null }) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>LOCAL HOST // ACTUAL READINGS</Text>
      <Text style={styles.title}>System & firmware</Text>
      {report ? hostInformationRows(report).map((row) => (
        <View style={styles.row} key={row.label}>
          <Text style={styles.label}>{row.label}</Text>
          <Text selectable style={styles.value}>{row.value}</Text>
        </View>
      )) : <Text style={styles.note}>Run a host scan to read this device. No example model, firmware, or security result is substituted.</Text>}
      <Text style={styles.note}>Source: Android APIs on the device running Droid Commander. A connected target is not required. Root availability is not a root grant.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 20 },
  kicker: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  title: { color: palette.ink, fontSize: 19, fontWeight: "800", marginTop: 5, marginBottom: 10 },
  row: { borderTopWidth: 1, borderTopColor: palette.line, paddingVertical: 9 },
  label: { color: palette.muted, fontSize: 11, marginBottom: 4 },
  value: { color: palette.ink, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  note: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
});
