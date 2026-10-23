import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  LayoutAnimation,
} from 'react-native';

interface LedgerBlock {
  index: number;
  eventType: string;
  actorId: string;
  status: 'SUCCESS' | 'TAMPER_DETECTED' | 'BLOCKED';
  previousHash: string;
  currentHash: string;
  timestamp: string;
  payload: string;
}

/**
 * Ledger Inspector Screen v2 - Enhanced with Interactive Block Explorer,
 * Hash Verification Scan Lines, and Live Tamper Detection Trigger.
 */
export const LedgerInspectorScreenV2: React.FC = () => {
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(0);
  const [isVerifyingChain, setIsVerifyingChain] = useState<boolean>(false);
  const [chainValid, setChainValid] = useState<boolean>(true);

  const [ledgerBlocks, setLedgerBlocks] = useState<LedgerBlock[]>([
    {
      index: 0,
      eventType: 'GENESIS_BLOCK',
      actorId: 'SYSTEM_BOOT',
      status: 'SUCCESS',
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      currentHash: '000000008f3a21b49e1029c384e5127045a12b3c4d5e6f7a8b9c0d1e2f3a4b5c',
      timestamp: '02:00:00',
      payload: '{"initializer":"DroidCommander_TEE_Root"}',
    },
    {
      index: 1,
      eventType: 'OPERATION_MODE_CHANGED',
      actorId: 'TECH_LEAD_01',
      status: 'SUCCESS',
      previousHash: '000000008f3a21b49e1029c384e5127045a12b3c4d5e6f7a8b9c0d1e2f3a4b5c',
      currentHash: '25adc275cf00c3fec44ee8112cd20bc1ea5a33e7b45f2bf241b48d4b661f904e',
      timestamp: '02:05:12',
      payload: '{"newMode":"LOCAL_HOST_SELF","targetDevice":"Pixel_8_Pro"}',
    },
    {
      index: 2,
      eventType: 'FIRMWARE_INTEGRITY_AUDIT',
      actorId: 'TECH_LEAD_01',
      status: 'SUCCESS',
      previousHash: '25adc275cf00c3fec44ee8112cd20bc1ea5a33e7b45f2bf241b48d4b661f904e',
      currentHash: '73be25c925b9a29cfb69223cb243bcc6c8e4e7f78dedfd7c5daa9f892774ae02',
      timestamp: '02:10:44',
      payload: '{"avbState":"LOCKED_GREEN","score":100}',
    },
    {
      index: 3,
      eventType: 'PASSKEY_ELEVATED_SESSION_ACTIVATED',
      actorId: 'SUPERUSER_ADMIN',
      status: 'SUCCESS',
      previousHash: '73be25c925b9a29cfb69223cb243bcc6c8e4e7f78dedfd7c5daa9f892774ae02',
      currentHash: '99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8',
      timestamp: '02:15:30',
      payload: '{"authMethod":"DEVICE_PASSKEY","scopes":["BYPASS_TWO_PARTY_CONSENT"]}',
    },
  ]);

  // Animated Values
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedBlockIndex(expandedBlockIndex === index ? null : index);
  };

  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    scanLineAnim.setValue(0);

    Animated.timing(scanLineAnim, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start(() => {
      setIsVerifyingChain(false);
      setChainValid(true);
    });
  };

  const simulateTamper = () => {
    setLedgerBlocks((prev) =>
      prev.map((block) =>
        block.index === 2
          ? { ...block, status: 'TAMPER_DETECTED', payload: '{"avbState":"TAMPERED_MODIFIED"}' }
          : block
      )
    );
    setChainValid(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📜 PRIVILEGED ACTION LEDGER</Text>
        <Text style={styles.headerSub}>SHA-256 TAMPER-EVIDENT CRYPTOGRAPHIC HASH CHAIN</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Control Banner */}
        <View style={styles.verifyCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Chain Status:</Text>
            <View
              style={[
                styles.chainBadge,
                { backgroundColor: chainValid ? '#3FB95020' : '#F8514920' },
              ]}
            >
              <Text style={[styles.chainBadgeText, { color: chainValid ? '#3FB950' : '#F85149' }]}>
                {chainValid ? '✓ 100% VALID & INTACT' : '🚨 CRYPTOGRAPHIC TAMPER DETECTED'}
              </Text>
            </View>
          </View>

          {isVerifyingChain && (
            <View style={styles.scanLineTrack}>
              <Animated.View
                style={[
                  styles.scanLineFill,
                  {
                    width: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.verifyBtn} activeOpacity={0.8} onPress={handleVerifyChain}>
              <Text style={styles.verifyBtnText}>
                {isVerifyingChain ? '⏳ VERIFYING HASHES...' : '⚡ RE-VERIFY CHAIN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tamperBtn} activeOpacity={0.8} onPress={simulateTamper}>
              <Text style={styles.tamperBtnText}>⚠️ SIMULATE TAMPER</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ledger Blocks Timeline */}
        <Text style={styles.sectionTitle}>LEDGER BLOCKS ({ledgerBlocks.length})</Text>
        {ledgerBlocks.map((block) => (
          <View key={block.index} style={styles.blockCard}>
            <TouchableOpacity
              style={styles.blockHeader}
              activeOpacity={0.8}
              onPress={() => toggleExpand(block.index)}
            >
              <View style={styles.blockHeaderLeft}>
                <View style={styles.blockIndexBox}>
                  <Text style={styles.blockIndexText}>#{block.index}</Text>
                </View>
                <View style={styles.blockMeta}>
                  <Text style={styles.eventType}>{block.eventType}</Text>
                  <Text style={styles.actorText}>Actor: {block.actorId} • {block.timestamp}</Text>
                </View>
              </View>
              <Text style={styles.chevron}>{expandedBlockIndex === block.index ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {expandedBlockIndex === block.index && (
              <View style={styles.blockBody}>
                <Text style={styles.hashLabel}>Previous Hash Pointer:</Text>
                <Text style={styles.hashText}>{block.previousHash}</Text>

                <Text style={styles.hashLabel}>Current Block SHA-256 Hash:</Text>
                <Text style={styles.hashTextActive}>{block.currentHash}</Text>

                <Text style={styles.hashLabel}>Block Payload (JSON):</Text>
                <Text style={styles.payloadText}>{block.payload}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
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
    paddingBottom: 12,
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
  verifyCard: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: '#8B949E',
  },
  chainBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chainBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  scanLineTrack: {
    height: 6,
    backgroundColor: '#21262D',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  scanLineFill: {
    height: '100%',
    backgroundColor: '#3FB950',
    borderRadius: 3,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verifyBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#388BFD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  verifyBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F0F6FC',
  },
  tamperBtn: {
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#21262D',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tamperBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F0883E',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  blockCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    marginBottom: 12,
    overflow: 'hidden',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  blockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  blockIndexBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#388BFD20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  blockIndexText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#388BFD',
  },
  blockMeta: {
    flex: 1,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F0F6FC',
    marginBottom: 2,
  },
  actorText: {
    fontSize: 10,
    color: '#8B949E',
  },
  chevron: {
    fontSize: 10,
    color: '#8B949E',
  },
  blockBody: {
    padding: 14,
    backgroundColor: '#0D1117',
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },
  hashLabel: {
    fontSize: 10,
    color: '#8B949E',
    marginTop: 6,
    marginBottom: 2,
  },
  hashText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#8B949E',
  },
  hashTextActive: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#58A6FF',
    fontWeight: '700',
  },
  payloadText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#3FB950',
    marginTop: 2,
  },
});
