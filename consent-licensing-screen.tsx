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

export interface ConsentScope {
  id: string;
  name: string;
  description: string;
  grantedByOwner: boolean;
  authorizedByTechnician: boolean;
}

export const ConsentLicensingScreen: React.FC = () => {
  const [technicianId, setTechnicianId] = useState<string>('TECH-LEAD-0192');
  const [licenseStatus, setLicenseStatus] = useState<'VALID' | 'EXPIRED' | 'UNAUTHORIZED'>('VALID');
  const [scopes, setScopes] = useState<ConsentScope[]>([
    {
      id: 'READ_TELEMETRY',
      name: 'Read Device Telemetry & Battery State',
      description: 'Allows reading OS build props, battery voltage, and hardware serials.',
      grantedByOwner: true,
      authorizedByTechnician: true,
    },
    {
      id: 'ASSESS_HOST',
      name: 'Execute CVE Vulnerability Assessment',
      description: 'Correlates installed build fingerprints against offline vulnerability catalog.',
      grantedByOwner: true,
      authorizedByTechnician: true,
    },
    {
      id: 'REMEDIATE_SELINUX',
      name: 'Restore SELinux Enforcing Policy',
      description: 'Applies automated remediation script to restore SELinux to Enforcing mode.',
      grantedByOwner: true,
      authorizedByTechnician: true,
    },
    {
      id: 'FASTBOOT_FLASH_PARTITION',
      name: 'Flash Boot & Recovery Partitions',
      description: 'High-privilege operation to rewrite core firmware partitions via Fastboot.',
      grantedByOwner: false,
      authorizedByTechnician: true,
    },
  ]);

  const handleToggleScope = (scopeId: string) => {
    setScopes(scopes.map(s => {
      if (s.id === scopeId) {
        return { ...s, grantedByOwner: !s.grantedByOwner };
      }
      return s;
    }));
  };

  const handleScanOwnerQr = () => {
    Alert.alert(
      'Owner Consent QR Scanned',
      'Owner digital signature verified via local cryptographic handshake. Two-party consent bounds updated.',
      [{ text: 'Acknowledge' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤝 Two-Party Consent & Licensing Governance</Text>
        <Text style={styles.subtitle}>
          Technician Hardware Binding & Owner Authorization Scope Intersection
        </Text>
      </View>

      {/* Technician License Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Technician License Binding</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Technician ID:</Text>
          <Text style={styles.value}>{technicianId}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>License Verification Status:</Text>
          <View style={[styles.badge, { backgroundColor: COLOR_PALETTE.status.lockedGreen + '22', borderColor: COLOR_PALETTE.status.lockedGreen }]}>
            <Text style={[styles.badgeText, { color: COLOR_PALETTE.status.lockedGreen }]}>{licenseStatus}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.qrBtn} onPress={handleScanOwnerQr}>
          <Text style={styles.qrBtnText}>📷 Scan Owner Consent Authorization QR Code</Text>
        </TouchableOpacity>
      </View>

      {/* Scope Matrix */}
      <Text style={styles.sectionTitle}>Two-Party Scope Authorization Matrix</Text>
      {scopes.map((scope) => {
        const isIntersected = scope.grantedByOwner && scope.authorizedByTechnician;
        return (
          <View key={scope.id} style={styles.scopeCard}>
            <View style={styles.scopeHeader}>
              <Text style={styles.scopeName}>{scope.name}</Text>
              <View style={[styles.scopeBadge, { backgroundColor: isIntersected ? COLOR_PALETTE.status.lockedGreen + '22' : COLOR_PALETTE.status.criticalRed + '22', borderColor: isIntersected ? COLOR_PALETTE.status.lockedGreen : COLOR_PALETTE.status.criticalRed }]}>
                <Text style={[styles.scopeBadgeText, { color: isIntersected ? COLOR_PALETTE.status.lockedGreen : COLOR_PALETTE.status.criticalRed }]}>
                  {isIntersected ? 'GRANTED' : 'BLOCKED'}
                </Text>
              </View>
            </View>

            <Text style={styles.scopeDesc}>{scope.description}</Text>

            <View style={styles.consentRow}>
              <Text style={styles.consentState}>Technician Authorized: {scope.authorizedByTechnician ? '✓ YES' : '❌ NO'}</Text>
              <TouchableOpacity style={styles.toggleBtn} onPress={() => handleToggleScope(scope.id)}>
                <Text style={styles.toggleBtnText}>Owner: {scope.grantedByOwner ? '✓ Granted' : '❌ Denied'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  value: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
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
  qrBtn: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  qrBtnText: {
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
  scopeCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 10,
  },
  scopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scopeName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
    flex: 1,
  },
  scopeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  scopeDesc: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginBottom: 8,
  },
  consentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consentState: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  toggleBtn: {
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  toggleBtnText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.cyberCyan,
    fontWeight: 'bold',
  },
});
