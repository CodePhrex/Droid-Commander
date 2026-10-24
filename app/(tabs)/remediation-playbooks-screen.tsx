import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { AutomatedRemediationEngine, PlaybookExecutionResult } from '../../lib/automated-remediation-playbooks';

export default function RemediationPlaybooksScreen() {
  const [engine] = useState(() => new AutomatedRemediationEngine());
  const [history, setHistory] = useState<PlaybookExecutionResult[]>([]);
  const [running, setRunning] = useState(false);
  const [pukInput, setPukInput] = useState('');

  const executeCvePatch = async () => {
    setRunning(true);
    await new Promise((res) => setTimeout(res, 600));
    await engine.runCveKernelRemediation('CVE-2024-21443', 'local-host-android');
    setHistory(engine.getHistory());
    setRunning(false);
  };

  const executeSimUnlock = async () => {
    if (!pukInput) return;
    setRunning(true);
    await new Promise((res) => setTimeout(res, 600));
    await engine.runSimPukRecoveryPlaybook('8901410321111851001', pukInput);
    setHistory(engine.getHistory());
    setRunning(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Automated Remediation Playbooks</Text>
      <Text style={styles.subTitle}>Fail-Closed Mitigation & SIM Recovery Engine</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>CVE-2024-21443 Kernel Guard</Text>
        <Text style={styles.cardDesc}>Applies live memory safeguards for USB OTG kernel boundary vulnerabilities.</Text>
        <TouchableOpacity style={styles.actionButton} onPress={executeCvePatch} disabled={running}>
          <Text style={styles.buttonText}>{running ? 'Executing...' : 'Run Kernel Playbook'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SIM Lock & PUK Recovery</Text>
        <Text style={styles.cardDesc}>Executes carrier contract reset and slot un-locking via verified PUK key.</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 8-digit PUK"
          placeholderTextColor="#64748B"
          keyboardType="numeric"
          maxLength={8}
          value={pukInput}
          onChangeText={setPukInput}
        />
        <TouchableOpacity style={styles.actionButton} onPress={executeSimUnlock} disabled={running || pukInput.length !== 8}>
          <Text style={styles.buttonText}>{running ? 'Executing...' : 'Run SIM Unlocking Playbook'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Execution Audit History</Text>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>No playbooks executed yet.</Text>
      ) : (
        history.map((item) => (
          <View key={item.playbookId} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={item.status === 'COMPLETED' ? styles.badgeSuccess : styles.badgeDanger}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.historyMeta}>Target: {item.targetIdentifier}</Text>
            {item.ledgerRecordHash && (
              <Text style={styles.historyHash}>Ledger: {item.ledgerRecordHash}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#38BDF8', marginBottom: 4 },
  subTitle: { fontSize: 13, color: '#94A3B8', marginBottom: 20 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#94A3B8', marginBottom: 14 },
  input: { backgroundColor: '#0F172A', color: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  actionButton: { backgroundColor: '#0284C7', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#E2E8F0', marginTop: 12, marginBottom: 10 },
  emptyText: { color: '#64748B', fontStyle: 'italic' },
  historyCard: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyTitle: { fontSize: 14, fontWeight: 'bold', color: '#F1F5F9' },
  historyMeta: { fontSize: 12, color: '#94A3B8' },
  historyHash: { fontSize: 11, color: '#38BDF8', marginTop: 4 },
  badgeSuccess: { backgroundColor: '#065F46', color: '#34D399', fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' },
  badgeDanger: { backgroundColor: '#991B1B', color: '#FCA5A5', fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' }
});
