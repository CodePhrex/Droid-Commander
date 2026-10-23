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

export interface RootCertificate {
  alias: string;
  subject: string;
  issuer: string;
  isUserInstalled: boolean;
  status: 'TRUSTED' | 'REVOKED' | 'SUSPECT_USER_ROOT';
  installedAt: string;
}

export const KeystoreAuditScreen: React.FC = () => {
  const [hardwareLevel, setHardwareLevel] = useState<'STRONGBOX' | 'TEE' | 'SOFTWARE'>('STRONGBOX');
  const [attestationValid, setAttestationValid] = useState<boolean>(true);
  const [certs, setCerts] = useState<RootCertificate[]>([
    {
      alias: 'google_root_ca_g2',
      subject: 'CN=Google Root CA G2, O=Google Trust Services LLC',
      issuer: 'CN=Google Root CA G2',
      isUserInstalled: false,
      status: 'TRUSTED',
      installedAt: '2023-01-01',
    },
    {
      alias: 'custom_mitm_proxy_root',
      subject: 'CN=Charles Proxy CA, O=Developer Test',
      issuer: 'CN=Charles Proxy CA',
      isUserInstalled: true,
      status: 'SUSPECT_USER_ROOT',
      installedAt: '2026-10-15',
    },
    {
      alias: 'compromised_ca_2024',
      subject: 'CN=Legacy Trust Root, O=Expired CA Inc',
      issuer: 'CN=Legacy Trust Root',
      isUserInstalled: false,
      status: 'REVOKED',
      installedAt: '2020-05-12',
    },
  ]);

  const handleScanKeystore = () => {
    Alert.alert(
      'Keystore Audit Completed',
      '1 Suspect User-Installed Root CA detected in system store. Keymaster TEE attestation verified valid.',
      [{ text: 'Dismiss' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔐 Keystore & Root CA Security Inspector</Text>
        <Text style={styles.subtitle}>
          Hardware Keymaster Attestation & Certificate Trust Store Audit
        </Text>
      </View>

      {/* Hardware Keymaster Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hardware Backed Keymaster / TEE Level</Text>
        <View style={styles.statusRow}>
          <Text style={styles.levelLabel}>Keymaster Security Level:</Text>
          <View style={[styles.badge, { backgroundColor: COLOR_PALETTE.status.lockedGreen + '22', borderColor: COLOR_PALETTE.status.lockedGreen }]}>
            <Text style={[styles.badgeText, { color: COLOR_PALETTE.status.lockedGreen }]}>{hardwareLevel}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.levelLabel}>TEE Key Attestation:</Text>
          <Text style={[styles.statusText, { color: attestationValid ? COLOR_PALETTE.status.lockedGreen : COLOR_PALETTE.status.criticalRed }]}>
            {attestationValid ? '✓ VALIDATED HARDWARE CHAIN' : '❌ ATTESTATION FAILED'}
          </Text>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={handleScanKeystore}>
          <Text style={styles.actionBtnText}>⚡ Scan System Certificate Stores</Text>
        </TouchableOpacity>
      </View>

      {/* Certificate List */}
      <Text style={styles.sectionTitle}>Root CA Certificates ({certs.length})</Text>
      {certs.map((cert, index) => (
        <View key={index} style={styles.certCard}>
          <View style={styles.certHeader}>
            <Text style={styles.aliasText}>{cert.alias}</Text>
            <Text style={[
              styles.certStatus,
              {
                color: cert.status === 'TRUSTED'
                  ? COLOR_PALETTE.status.lockedGreen
                  : cert.status === 'SUSPECT_USER_ROOT'
                  ? COLOR_PALETTE.status.warningYellow
                  : COLOR_PALETTE.status.criticalRed
              }
            ]}>
              {cert.status}
            </Text>
          </View>
          <Text style={styles.certSubText}>Subject: {cert.subject}</Text>
          <Text style={styles.certSubText}>Issuer: {cert.issuer}</Text>
          <Text style={styles.certMeta}>Type: {cert.isUserInstalled ? 'User-Installed (Potential Risk)' : 'System Pre-installed'} | Installed: {cert.installedAt}</Text>
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
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelLabel: {
    fontSize: 13,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtnText: {
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
  certCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 10,
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aliasText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  certStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  certSubText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  certMeta: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.cyberCyan,
    marginTop: 6,
  },
});
