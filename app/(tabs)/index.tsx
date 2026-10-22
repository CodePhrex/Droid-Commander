import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { assessments, palette, type AssessmentStatus } from "@/constants/commander";

const statusColors: Record<AssessmentStatus, { text: string; fill: string }> = {
  critical: { text: palette.red, fill: "#FCECEB" },
  review: { text: palette.yellow, fill: palette.yellowSoft },
  clear: { text: palette.green, fill: palette.greenSoft },
  limited: { text: palette.muted, fill: "#EEF1F1" },
};

export default function CommandCenterScreen() {
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [expandedFinding, setExpandedFinding] = useState<string | null>("security-patch");
  const [usbExpanded, setUsbExpanded] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeName, setScopeName] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [sessionAuthorized, setSessionAuthorized] = useState(false);

  const posture = useMemo(() => (assessmentComplete ? 78 : 72), [assessmentComplete]);
  const canCreateScope = scopeName.trim().length > 2 && authorizedBy.trim().length > 2;

  return (
    <ScreenContainer containerClassName="bg-[#F5F3EE]" safeAreaClassName="bg-[#F5F3EE]">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>DROID COMMANDER // LOCAL MODE</Text>
            <Text style={styles.wordmark}>Droid Commander</Text>
          </View>
          <View style={styles.offlinePill}>
            <View style={styles.greenDot} />
            <Text style={styles.offlineText}>OFFLINE READY</Text>
          </View>
        </View>

        <View style={styles.introRow}>
          <View style={styles.introCopy}>
            <Text style={styles.title}>Evidence before action.</Text>
            <Text style={styles.subtitle}>
              A consent-first field instrument for learning how device posture can be measured and improved.
            </Text>
          </View>
          <Text style={styles.buildTag}>FIELD BUILD{`\n`}0.1
