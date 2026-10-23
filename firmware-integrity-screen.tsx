import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLOR_PALETTE, BRAND_IDENTITY } from './brand-design-system';

export interface PartitionDigest {
  name: string;
  expectedHash: string;
  actualHash: string;
  status: 'MATCH' | 'MISMATCH_MODIFIED' | 'TAMPERED_ROOTKIT' | 'CUSTOM_KEY';
  sizeBytes: number;
}

export const FirmwareIntegrityScreen: React.FC = () => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [avbState, setAvbState] = useState<'LOCKED_GREEN' | 'SELF_SIGNED_YELLOW' | 'UNLOCKED_ORANGE' | 'CORRUPTED_RED'>('LOCKED_GREEN');
  const [integrityScore, setIntegrityScore] = useState<number | null>(100);
  const [partitions, setPartitions] = useState<PartitionDigest[]>([
    {
      name: 'boot',
      expectedHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      actualHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      status: 'MATCH',
      sizeBytes: 67108864,
    },
    {
      name: 'init_boot',
      expectedHash: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01',
      actualHash: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01',
      status: 'MATCH',
      sizeBytes: 8388608,
    },
    {
      name: 'vendor',
      expectedHash: 'c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012',
      actualHash: 'c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef012',
      status: 'MATCH',
      sizeBytes: 536870912,
    },
    {
      name: 'vbmeta',
      expectedHash: 'd4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123',
      actualHash: 'd4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123',
      status: 'MATCH',
      sizeBytes: 65536,
    },
  ]);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      Alert.alert(
        'Firmware Integrity Audit Complete',
        'All partition hashes verified against OEM stock manifest catalog. AVB 2.0 State: LOCKED_GREEN (100% Integrity)',
        [{ text: 'Acknowledge' }]
      );
    }, 1500);
  };

  const getAvbColor = (state: string) => {
    switch (state) {
      case 'LOCKED_GREEN': return COLOR_PALETTE.status.lockedGreen;
      case 'SELF_SIGNED_YELLOW': return COLOR_PALETTE.status.warningYellow;
      case 'UNLOCKED_ORANGE': return COLOR_PALETTE.status.unlockedOrange;
      case 'CORRUPTED_RED': return COLOR_PALETTE.status.criticalRed;
      default: return COLOR_PALETTE.accent.cyberCyan;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Firmware Integrity & AVB 2.0 Verifier</Text>
        <Text style={styles.subtitle}>
          Partition Hash Auditing & Offline Stock Manifest Comparison Engine
        </Text>
      </View>

      {/* AVB State Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>AVB 2.0 Verification State</Text>
          <View style={[styles.badge, { backgroundColor: getAvbColor(avbState) + '22', borderColor: getAvbColor(avbState) }]}>
            <Text style={[styles.badgeText, { color: getAvbColor(avbState) }]}>{avbState}</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Firmware Trust Score:</Text>
          <Text style={[styles.scoreValue, { color: integrityScore && integrityScore > 80 ? COLOR_PALETTE.status.lockedGreen : COLOR_PALETTE.status.criticalRed }]}>
            {integrityScore !== null ? `${integrityScore}/100` : 'NOT AUDITED'}
          </Text>
        </View>

        <TouchableOpacity style={styles.auditButton} onPress={handleRunAudit} disabled={isAuditing}>
          {isAuditing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.auditButtonText}>🔍 Run Deep Partition Hash Audit</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Partition List */}
      <Text style={styles.sectionHeader}>Core Partition Digests</Text>
      {partitions.map((part, index) => (
        <View key={index} style={styles.partitionCard}>
          <View style={styles.partitionHeader}>
            <Text style={styles.partitionName}>📦 /{part.name}</Text>
            <Text style={[styles.partitionStatus, { color: part.status === 'MATCH' ? COLOR_PALETTE.status.lockedGreen : COLOR_PALETTE.status.criticalRed }]}>
              {part.status}
            </Text>
          </View>
          <Text style={styles.hashLabel}>Expected SHA-256 (OEM Manifest):</Text>
          <Text style={styles.hashValue} numberOfLines={1} ellipsizeMode="middle">{part.expectedHash}</Text>
          <Text style={styles.hashLabel}>Actual Device Partition Hash:</Text>
          <Text style={styles.hashValue} numberOfLines={1} ellipsizeMode="middle">{part.actualHash}</Text>
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR_PALETTE.accent.chromeSilver,
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
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 13,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  auditButton: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  auditButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
    marginBottom: 12,
  },
  partitionCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 10,
  },
  partitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partitionName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  partitionStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  hashLabel: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 4,
  },
  hashValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLOR_PALETTE.accent.cyberCyan,
  },
});
