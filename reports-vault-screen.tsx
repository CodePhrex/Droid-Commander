import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLOR_PALETTE } from './brand-design-system';

export interface SavedReport {
  id: string;
  title: string;
  timestamp: string;
  targetDevice: string;
  type: 'COMPLIANCE_AUDIT' | 'CVE_ASSESSMENT' | 'FIRMWARE_INTEGRITY';
  sizeKb: number;
}

export const ReportsVaultScreen: React.FC = () => {
  const [reports, setReports] = useState<SavedReport[]>([
    {
      id: 'REP_20261023_01',
      title: 'Droid Commander Compliance Audit Report',
      timestamp: '2026-10-23 02:22',
      targetDevice: 'Google Pixel 8 Pro (Local Host)',
      type: 'COMPLIANCE_AUDIT',
      sizeKb: 142,
    },
    {
      id: 'REP_20261023_02',
      title: 'Galaxy S23 Remote Target CVE & AVB Audit',
      timestamp: '2026-10-23 02:20',
      targetDevice: 'Samsung Galaxy S23 (USB OTG Target)',
      type: 'CVE_ASSESSMENT',
      sizeKb: 98,
    },
    {
      id: 'REP_20261023_03',
      title: 'Core Partition Firmware Hash Verification',
      timestamp: '2026-10-23 02:18',
      targetDevice: 'Google Pixel 8 Pro (Local Host)',
      type: 'FIRMWARE_INTEGRITY',
      sizeKb: 64,
    },
  ]);

  const handleExportReport = (report: SavedReport) => {
    Alert.alert(
      'Export Report',
      `Exporting ${report.title} (.PDF / .JSON) from offline telemetry vault.`,
      [
        { text: 'Export JSON Payload', onPress: () => {} },
        { text: 'Export PDF Document', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleGenerateNewReport = () => {
    Alert.alert(
      'Generating New Compliance Audit',
      'Compiled current live host metrics and ledger chain into a new offline audit report.',
      [{ text: 'Acknowledge' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📁 Offline Telemetry & Compliance Vault</Text>
        <Text style={styles.subtitle}>
          Encrypted Offline Session History, Audit Reports & Export Vault
        </Text>
      </View>

      {/* Generate Report Action Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Audit Report Generator</Text>
        <Text style={styles.cardDesc}>
          Compile live CVE assessments, AVB firmware digests, and Privileged Action Ledger records into a portable compliance artifact.
        </Text>
        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateNewReport}>
          <Text style={styles.generateBtnText}>📄 Generate New Compliance Audit Report</Text>
        </TouchableOpacity>
      </View>

      {/* Vault File List */}
      <Text style={styles.sectionTitle}>Archived Vault Reports ({reports.length})</Text>
      {reports.map((report) => (
        <View key={report.id} style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportType}>{report.type}</Text>
          </View>
          <Text style={styles.reportMeta}>Device: {report.targetDevice}</Text>
          <Text style={styles.reportMeta}>Generated: {report.timestamp} | File Size: {report.sizeKb} KB</Text>

          <TouchableOpacity style={styles.exportBtn} onPress={() => handleExportReport(report)}>
            <Text style={styles.exportBtnText}>📥 Export Report Artifact</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  subtitle: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR_PALETTE.accent.chromeSilver,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginBottom: 14,
  },
  generateBtn: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
    marginBottom: 12,
  },
  reportCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
    flex: 1,
    marginRight: 8,
  },
  reportType: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
  },
  reportMeta: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginBottom: 2,
  },
  exportBtn: {
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  exportBtnText: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
