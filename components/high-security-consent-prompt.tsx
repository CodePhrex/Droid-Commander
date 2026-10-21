import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { palette } from "@/constants/commander";
import type { HighSecurityRequest } from "@/lib/two-party-consent";

type Props = {
  visible: boolean;
  request: HighSecurityRequest | null;
  onConfirm: (challengeResponse: string) => void;
  onDeny: () => void;
};

export function HighSecurityConsentPrompt({ visible, request, onConfirm, onDeny }: Props) {
  const [challengeResponse, setChallengeResponse] = useState("");
  const challengeMatches = useMemo(() => Boolean(request && challengeResponse === request.challenge), [request, challengeResponse]);
  if (!request) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDeny}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.handle} />
          <Text style={styles.kicker}>CLIENT CONSENT // HIGH SECURITY</Text>
          <Text style={styles.title}>Confirm this exact operation.</Text>
          <Text style={styles.warning}>Your confirmation is recorded and can authorize one execution only. It does not grant broader device access.</Text>

          <View style={styles.summary}>
            <SummaryRow label="OPERATION" value={request.operation} />
            <SummaryRow label="TARGET" value={request.targetLabel} />
            <SummaryRow label="PURPOSE" value={request.purpose} />
            <SummaryRow label="RISK" value={request.riskSummary} />
            <SummaryRow label="OPERATOR" value={request.operatorId} />
          </View>

          <Text style={styles.confirmLabel}>TYPE THE ONE-TIME CHALLENGE</Text>
          <Text style={styles.challenge}>{request.challenge}</Text>
          <TextInput
            value={challengeResponse}
            onChangeText={setChallengeResponse}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Enter challenge"
            placeholderTextColor="#9AA5A7"
            style={styles.input}
          />

          <View style={styles.actions}>
            <Pressable onPress={onDeny} style={({ pressed }) => [styles.denyButton, pressed && styles.pressed]}><Text style={styles.denyText}>Deny</Text></Pressable>
            <Pressable disabled={!challengeMatches} onPress={() => onConfirm(challengeResponse)} style={({ pressed }) => [styles.confirmButton, !challengeMatches && styles.disabled, pressed && styles.pressed]}><Text style={styles.confirmText}>Confirm once</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(14, 30, 38, 0.62)", justifyContent: "flex-end" },
  card: { backgroundColor: "#F5F3EE", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  handle: { width: 38, height: 4, borderRadius: 3, backgroundColor: "#CBD1CE", alignSelf: "center", marginBottom: 18 },
  kicker: { color: palette.orange, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  title: { color: palette.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  warning: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 7 },
  summary: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, borderRadius: 14, padding: 13, marginTop: 16 },
  summaryRow: { flexDirection: "row", marginBottom: 8 },
  summaryLabel: { width: 74, color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  summaryValue: { flex: 1, color: palette.ink, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  confirmLabel: { color: palette.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.9, marginTop: 16 },
  challenge: { color: palette.navy, fontSize: 20, fontWeight: "900", letterSpacing: 2, marginTop: 6 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, color: palette.ink, fontSize: 14, marginTop: 8 },
  actions: { flexDirection: "row", marginTop: 14 },
  denyButton: { flex: 1, borderWidth: 1, borderColor: palette.line, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingVertical: 12, marginRight: 8 },
  denyText: { color: palette.muted, fontSize: 13, fontWeight: "900" },
  confirmButton: { flex: 1, backgroundColor: palette.orange, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  confirmText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
