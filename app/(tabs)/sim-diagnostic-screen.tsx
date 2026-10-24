import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  CellularTelemetryEngine,
  SimSlotTelemetry,
  SimSlotIndex,
} from "../../lib/cellular-telemetry-engine";

export default function SimDiagnosticScreen() {
  const [engine] = useState(() => new CellularTelemetryEngine());
  const [slots, setSlots] = useState<SimSlotTelemetry[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<SimSlotIndex>(1);
  const [carrierKeyInput, setCarrierKeyInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const refreshDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await engine.executeDiagnostics();
      setSlots(res);
    } catch (e) {
      console.error("Diagnostic error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const handleCarrierKeySubmit = async () => {
    if (!carrierKeyInput.trim()) {
      Alert.alert("Input Error", "Please enter a valid carrier network token.");
      return;
    }

    setLoading(true);
    setStatusMessage("");

    try {
      const res = await engine.submitCarrierToken(selectedSlotIndex, carrierKeyInput);
      setStatusMessage(res.statusMessage);
      if (res.success) {
        setCarrierKeyInput("");
      }
      await refreshDiagnostics();
    } catch (e) {
      Alert.alert("Verification Error", "Failed to submit network token to modem.");
    } finally {
      setLoading(false);
    }
  };

  const selectedSlot = slots.find((s) => s.slotIndex === selectedSlotIndex);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Cellular SIM & Network Diagnostics</Text>
        <Text style={styles.subtitle}>
          Dual-SIM Telemetry, Carrier Profile Classification & Token Interface
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={refreshDiagnostics} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>⚡ Refresh Cellular Telemetry</Text>}
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SIM Slot Selection & Status</Text>
        <View style={styles.slotTabContainer}>
          {slots.map((slot) => (
            <TouchableOpacity
              key={slot.slotIndex}
              style={[
                styles.slotTab,
                selectedSlotIndex === slot.slotIndex && styles.slotTabActive,
              ]}
              onPress={() => setSelectedSlotIndex(slot.slotIndex)}
            >
              <Text style={styles.slotTabText}>Slot {slot.slotIndex + 1}</Text>
              <Text
                style={[
                  styles.slotStateBadge,
                  {
                    color:
                      slot.slotState === "READY"
                        ? "#10B981"
                        : slot.slotState === "CARRIER_LOCKED"
                        ? "#EF4444"
                        : "#FBBF24",
                  },
                ]}
              >
                {slot.slotState}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedSlot && (
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Carrier Name:</Text>
              <Text style={styles.metaValue}>{selectedSlot.carrier?.carrierName || "Unknown"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>MCC/MNC Pair:</Text>
              <Text style={styles.metaValue}>{selectedSlot.carrier?.mccMnc || "N/A"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Network Gen:</Text>
              <Text style={styles.metaValue}>{selectedSlot.networkGeneration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Carrier Entitlement:</Text>
              <Text
                style={[
                  styles.metaValue,
                  { color: selectedSlot.carrierEntitlementType === "UNLOCKED" ? "#10B981" : "#EF4444" },
                ]}
              >
                {selectedSlot.carrierEntitlementType}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Card Identifier:</Text>
              <Text style={styles.metaValueSmall}>{selectedSlot.cardIdentifierMasked}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>RSRP Signal Strength:</Text>
              <Text style={styles.metaValue}>{selectedSlot.signalMetrics.rsrpDbm} dBm ({selectedSlot.signalMetrics.signalBars} Bars)</Text>
            </View>
          </View>
        )}
      </View>

      {selectedSlot && selectedSlot.slotState === "CARRIER_LOCKED" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Official Carrier Network Key Submission</Text>
          <Text style={styles.warningText}>
            Remaining modem attempts: {selectedSlot.attemptsRemaining} / 10
          </Text>

          <TextInput
            style={styles.textInput}
            placeholder="Enter 8 to 16 digit carrier network key..."
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            value={carrierKeyInput}
            onChangeText={setCarrierKeyInput}
            editable={!selectedSlot.isCounterExhausted && !loading}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              (selectedSlot.isCounterExhausted || loading) && styles.buttonDisabled,
            ]}
            onPress={handleCarrierKeySubmit}
            disabled={selectedSlot.isCounterExhausted || loading}
          >
            <Text style={styles.buttonText}>Submit Carrier Network Key</Text>
          </TouchableOpacity>

          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E17" },
  content: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#F8FAFC" },
  subtitle: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  primaryButton: {
    backgroundColor: "#0284C7",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: { backgroundColor: "#475569" },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#38BDF8", marginBottom: 12 },
  slotTabContainer: { flexDirection: "row", gap: 12, marginBottom: 16 },
  slotTab: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  slotTabActive: { borderColor: "#38BDF8", backgroundColor: "#1E293B" },
  slotTabText: { color: "#F8FAFC", fontWeight: "bold", fontSize: 14 },
  slotStateBadge: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metaItem: { width: "48%", marginBottom: 10 },
  metaLabel: { fontSize: 12, color: "#64748B" },
  metaValue: { fontSize: 13, fontWeight: "600", color: "#F1F5F9", marginTop: 2 },
  metaValueSmall: { fontSize: 11, fontWeight: "500", color: "#CBD5E1", marginTop: 2 },
  warningText: { fontSize: 12, color: "#F97316", marginBottom: 8 },
  textInput: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: "#F8FAFC",
    fontSize: 14,
  },
  statusText: { fontSize: 13, color: "#38BDF8", marginTop: 10, textAlign: "center" },
});
