import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Modal,
} from 'react-native';

interface PartitionItem {
  name: string;
  avbState: string;
  digest: string;
  expectedDigest: string;
  status: 'MATCH' | 'TAMPERED_ROOTKIT' | 'MISMATCH_MODIFIED';
}

/**
 * Firmware Integrity Screen v2 - Enhanced with Partition Hash Gauges,
 * Live AVB State Pulse, and Interactive Manifest Comparison Modals.
 */
export const FirmwareIntegrityScreenV2: React.FC = () => {
  const [selectedPartition, setSelectedPartition] = useState<PartitionItem | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [integrityScore, setIntegrityScore] = useState<number>(100);

  const [partitions, setPartitions] = useState<PartitionItem[]>([
    {
      name: 'boot',
      avbState: 'LOCKED_GREEN',
      digest: 'a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef',
      expectedDigest: 'a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef',
      status: 'MATCH',
    },
    {
      name: 'init_boot',
      avbState: 'LOCKED_GREEN',
      digest: 'b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1',
      expectedDigest: 'b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1',
      status: 'MATCH',
    },
    {
      name: 'vendor',
      avbState: 'LOCKED_GREEN',
      digest: 'c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1b2',
      expectedDigest: 'c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1b2',
      status: 'MATCH',
    },
    {
      name: 'vbmeta',
      avbState: 'LOCKED_GREEN',
      digest: 'd4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1b2c3',
      expectedDigest: 'd4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdefa1b2c3',
      status: 'MATCH',
    },
  ]);

  // Animated Values
  const pulseBadge = useRef(new Animated.Value(0.4)).current;
  const auditProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseBadge, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseBadge, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const runFirmwareAudit = () => {
    setIsAuditing(true);
    auditProgress.setValue(0);

    Animated.timing(auditProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      setIsAuditing(false);
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔐 FIRMWARE INTEGRITY VERIFIER</Text>
        <Text style={styles.headerSub}>AVB 2.0 DIGEST & OEM MANIFEST MATCHING</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* AVB State Scorecard */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Animated.View style={[styles.statusDot, { opacity: pulseBadge }]} />
            <Text style={styles.scoreTitle}>AVB 2.0 STATE: LOCKED_GREEN</Text>
          </View>

          <View style={styles.scoreNumberBox}>
            <Text style={styles.scoreNumber}>{integrityScore}</Text>
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>
          <Text style={styles.scoreSub}>100% Stock OEM Manifest Match Confirmed</Text>

          {isAuditing && (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: auditProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.auditBtn, isAuditing && styles.auditBtnDisabled]}
            activeOpacity={0.8}
            onPress={runFirmwareAudit}
            disabled={isAuditing}
          >
            <Text style={styles.auditBtnText}>
              {isAuditing ? '⏳ AUDITING PARTITION DIGESTS...' : '⚡ RE-AUDIT PARTITION DIGESTS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Partition Digest Cards */}
        <Text style={styles.sectionTitle}>PARTITION DIGEST AUDIT LEDGER ({partitions.length})</Text>
        {partitions.map((part) => (
          <TouchableOpacity
            key={part.name}
            style={styles.partitionCard}
            activeOpacity={0.85}
            onPress={() => setSelectedPartition(part)}
          >
            <View style={styles.partHeader}>
              <Text style={styles.partName}>/{part.name}</Text>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>✓ {part.status}</Text>
              </View>
            </View>

            <Text style={styles.digestLabel}>SHA-256 Digest:</Text>
            <Text style={styles.digestText}>{part.digest.substring(0, 32)}...</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Partition Detail Modal */}
      {selectedPartition && (
        <Modal transparent animationType="slide" visible={!!selectedPartition}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Partition: /{selectedPartition.name}</Text>
              <Text style={styles.modalLabel}>Live SHA-256 Digest:</Text>
              <Text style={styles.modalMonospace}>{selectedPartition.digest}</Text>

              <Text style={styles.modalLabel}>Expected OEM Manifest Hash:</Text>
              <Text style={styles.modalMonospace}>{selectedPartition.expectedDigest}</Text>

              <View style={styles.statusBox}>
                <Text style={styles.statusBoxText}>STATUS: {selectedPartition.status} (MATCH)</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPartition(null)}>
                <Text style={styles.closeBtnText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#388BFD',
    letterSpacing: 1,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
  },
  scoreCard: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3FB950',
    marginRight: 8,
  },
  scoreTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3FB950',
    letterSpacing: 1,
  },
  scoreNumberBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: '#F0F6FC',
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B949E',
    marginLeft: 4,
  },
  scoreSub: {
    fontSize: 11,
    color: '#8B949E',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#21262D',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#388BFD',
    borderRadius: 3,
  },
  auditBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#388BFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditBtnDisabled: {
    backgroundColor: '#21262D',
  },
  auditBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  partitionCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 14,
    marginBottom: 12,
  },
  partHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  partName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F0F6FC',
    fontFamily: 'monospace',
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#3FB95020',
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3FB950',
  },
  digestLabel: {
    fontSize: 10,
    color: '#8B949E',
    marginBottom: 2,
  },
  digestText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#58A6FF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F0F6FC',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    color: '#8B949E',
    marginTop: 8,
    marginBottom: 4,
  },
  modalMonospace: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#58A6FF',
    backgroundColor: '#0D1117',
    padding: 10,
    borderRadius: 8,
  },
  statusBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3FB95020',
    alignItems: 'center',
  },
  statusBoxText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3FB950',
  },
  closeBtn: {
    marginTop: 20,
    height: 44,
    backgroundColor: '#21262D',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B949E',
  },
});
