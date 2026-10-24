/**
 * Droid Commander - SIM Diagnostic & Carrier Provisioning Screen
 * File: app/(tabs)/sim-diagnostic-screen.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CellularTelemetryEngine,
  HostCellularTelemetry,
  SimSlotTelemetry,
} from '../../lib/cellular-telemetry-engine';

export default function SimDiagnosticScreen() {
  const [engine] = useState(() => new CellularTelemetryEngine());
  const [telemetry, setTelemetry] = useState<HostCellularTelemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlockToken, setUnlockToken] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number>(1);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const data = await engine.getTelemetry();
      setTelemetry(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to read SIM telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleUnlockSubmit = async () => {
    if (!unlockToken.trim()) {
      Alert.alert('Input Error', 'Please enter an 8 to 16 digit subsidy unlock key.');
      return;
    }
    setLoading(true);
    try {
      const result = await engine.submitCarrierToken(selectedSlot, unlockToken.trim());
      Alert.alert(result.success ? 'Unlock Success' : 'Unlock Failed', result.message);
      setUnlockToken('');
      await fetchTelemetry();
    } catch (err) {
      Alert.alert('Error', 'Failed to process token submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Cellular & SIM Diagnostics</Text>
        <Text style={styles.subtitle}>Dual-SIM Telemetry & Subsidy Key Provisioning</Text>
      </View>

      {loading && <ActivityIndicator size="large" color="#38BDF8" style={{ marginVertical: 12 }} />}

      {telemetry &&
        telemetry.slots.map((slot: SimSlotTelemetry) => (
          <View key={slot.slotId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.slotTitle}>SIM Slot {slot.slotId}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: slot.slotState === 'READY' ? '#10B98120' : '#EF444420' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: slot.slotState === 'READY' ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {slot.slotState}
                </Text>
              </View>
            </View>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Carrier Name:</Text>
                <Text style={styles.value}>{slot.carrierName}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>MCC / MNC:</Text>
                <Text style={styles.value}>{slot.mccMnc}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Network Gen:</Text>
                <Text style={styles.value}>{slot.networkGeneration}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>ICCID (Masked):</Text>
                <Text style={styles.value}>{slot.iccidMasked}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>RSRP / Signal:</Text>
                <Text style={styles.value}>
                  {slot.signalQuality.rsrpDbm} dBm ({slot.signalQuality.signalLevelBars}/4 Bars)
                </Text>
              </View>
            </View>

            {slot.carrierLockInfo?.isLocked && (
              <View style={styles.unlockBox}>
                <Text style={styles.unlockTitle}>Carrier Subsidy Key Submission (Slot {slot.slotId})</Text>
                <Text style={styles.unlockSub}>
                  Lock Type: {slot.carrierLockInfo.lockType} | Attempts Remaining:{' '}
                  {slot.carrierLockInfo.attemptsRemaining}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter NCK/MCK Key (e.g. 12345678)"
                  placeholderTextColor="#64748B"
                  value={selectedSlot === slot.slotId ? unlockToken : ''}
                  onChangeText={(text) => {
                    setSelectedSlot(slot.slotId);
                    setUnlockToken(text);
                  }}
                  keyboardType="numeric"
                />

                <TouchableOpacity style={styles.unlockButton} onPress={handleUnlockSubmit}>
                  <Text style={styles.buttonText}>Submit Carrier Key</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  content: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotTitle: { fontSize: 16, fontWeight: 'bold', color: '#38BDF8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  grid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '50%', marginBottom: 8 },
  label: { fontSize: 11, color: '#64748B' },
  value: { fontSize: 13, fontWeight: '600', color: '#F1F5F9', marginTop: 2 },
  unlockBox: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  unlockTitle: { fontSize: 13, fontWeight: 'bold', color: '#FBBF24' },
  unlockSub: { fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 8 },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 8,
  },
  unlockButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});
