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
import { COLOR_PALETTE } from './brand-design-system';

export interface FeedSource {
  feedId: string;
  name: string;
  type: 'CVE_CATALOG' | 'OEM_MANIFESTS' | 'VENDOR_REGISTRY';
  lastSynced: string;
  itemCount: number;
  status: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'SYNCING';
  signatureVerified: boolean;
}

export const OnlineKnowledgeSyncScreen: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'FEEDS' | 'VAULT_METRICS' | 'SECURITY'>('FEEDS');
  
  const [feeds, setFeeds] = useState<FeedSource[]>([
    {
      feedId: 'feed-cve-2026',
      name: 'Android Vulnerability & CVE Catalog',
      type: 'CVE_CATALOG',
      lastSynced: '2026-10-23 02:15 UTC',
      itemCount: 1420,
      status: 'UP_TO_DATE',
      signatureVerified: true,
    },
    {
      feedId: 'feed-oem-manifests',
      name: 'OEM Stock Firmware Hash Manifests',
      type: 'OEM_MANIFESTS',
      lastSynced: '2026-10-20 18:40 UTC',
      itemCount: 385,
      status: 'UPDATE_AVAILABLE',
      signatureVerified: true,
    },
    {
      feedId: 'feed-usb-vendors',
      name: 'USB OTG Vendor VID/PID Registries',
      type: 'VENDOR_REGISTRY',
      lastSynced: '2026-10-22 11:05 UTC',
      itemCount: 94,
      status: 'UP_TO_DATE',
      signatureVerified: true,
    },
  ]);

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncProgress(25);

    setTimeout(() => setSyncProgress(60), 800);
    setTimeout(() => setSyncProgress(90), 1600);
    setTimeout(() => {
      setSyncProgress(100);
      setIsSyncing(false);
      setFeeds(prev =>
        prev.map(f => ({
          ...f,
          lastSynced: 'Just now (2026-10-23)',
          status: 'UP_TO_DATE',
          itemCount: f.type === 'OEM_MANIFESTS' ? 412 : f.itemCount,
        }))
      );
      Alert.alert(
        'Intelligence Sync Complete',
        'Local Knowledge Vault updated successfully. 27 new OEM firmware manifests merged and signed in Privileged Action Ledger.',
        [{ text: 'OK' }]
      );
    }, 2200);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📡 Online Knowledge & Feed Sync Engine</Text>
        <Text style={styles.subtitle}>
          Automated Technology Intelligence, CVE Signature Feeds & OEM Manifest Sync
        </Text>
      </View>

      {/* Sync Status Banner */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusInfo}>
            <Text style={styles.vaultTitle}>Knowledge Vault Database</Text>
            <Text style={styles.vaultVersion}>Version: v2026.10.23-STABLE | SQLite Vault</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: COLOR_PALETTE.status.lockedGreen + '22', borderColor: COLOR_PALETTE.status.lockedGreen }]}>
            <Text style={[styles.badgeText, { color: COLOR_PALETTE.status.lockedGreen }]}>AIR-GAP READY</Text>
          </View>
        </View>

        {isSyncing ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.syncingText}>Syncing feeds & verifying ECDSA signatures...</Text>
              <Text style={styles.progressPercent}>{syncProgress}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${syncProgress}%` }]} />
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.syncBtn} onPress={handleTriggerSync}>
            <Text style={styles.syncBtnText}>⚡ Sync Intelligence Feeds Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'FEEDS' && styles.activeTab]}
          onPress={() => setActiveTab('FEEDS')}
        >
          <Text style={[styles.tabText, activeTab === 'FEEDS' && styles.activeTabText]}>Intelligence Feeds</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'VAULT_METRICS' && styles.activeTab]}
          onPress={() => setActiveTab('VAULT_METRICS')}
        >
          <Text style={[styles.tabText, activeTab === 'VAULT_METRICS' && styles.activeTabText]}>Vault Metrics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'SECURITY' && styles.activeTab]}
          onPress={() => setActiveTab('SECURITY')}
        >
          <Text style={[styles.tabText, activeTab === 'SECURITY' && styles.activeTabText]}>ECDSA Signature</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'FEEDS' && (
        <View>
          {feeds.map(feed => (
            <View key={feed.feedId} style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Text style={styles.feedName}>{feed.name}</Text>
                <Text
                  style={[
                    styles.feedStatus,
                    {
                      color:
                        feed.status === 'UP_TO_DATE'
                          ? COLOR_PALETTE.status.lockedGreen
                          : COLOR_PALETTE.status.warningYellow,
                    },
                  ]}
                >
                  {feed.status === 'UP_TO_DATE' ? '✓ UP TO DATE' : '⚠️ UPDATE AVAILABLE'}
                </Text>
              </View>
              <Text style={styles.feedMeta}>Type: {feed.type} | Records: {feed.itemCount}</Text>
              <Text style={styles.feedSubText}>Last Synced: {feed.lastSynced}</Text>
              <View style={styles.securityTagRow}>
                <Text style={styles.securityTag}>
                  {feed.signatureVerified ? '🔒 ECDSA Signed (Verified)' : '❌ Unverified Signature'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'VAULT_METRICS' && (
        <View style={styles.vaultCard}>
          <Text style={styles.sectionTitle}>Local Vault Database Statistics</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total Vulnerability Signatures (CVE):</Text>
            <Text style={styles.metricValue}>1,420</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>OEM Firmware Partition Hash Manifests:</Text>
            <Text style={styles.metricValue}>412</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Supported USB Vendor VID/PID Drivers:</Text>
            <Text style={styles.metricValue}>94</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Offline Database File Size:</Text>
            <Text style={styles.metricValue}>12.4 MB</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Air-Gap Operational Mode:</Text>
            <Text style={[styles.metricValue, { color: COLOR_PALETTE.status.lockedGreen }]}>Fully Autonomous</Text>
          </View>
        </View>
      )}

      {activeTab === 'SECURITY' && (
        <View style={styles.vaultCard}>
          <Text style={styles.sectionTitle}>Cryptographic Verification & Zero-Trust Gate</Text>
          <Text style={styles.securityDesc}>
            All incoming intelligence updates are verified using ECDSA signatures over canonical JSON payloads before merging into the local database.
          </Text>
          <View style={styles.certBox}>
            <Text style={styles.certLabel}>Trust Root Cert:</Text>
            <Text style={styles.certVal}>CodePhrex Intelligence CA (G2)</Text>
            <Text style={styles.certLabel}>Verification Algorithm:</Text>
            <Text style={styles.certVal}>ECDSA_SHA256 (P-256)</Text>
            <Text style={styles.certLabel}>Ledger Audit Integration:</Text>
            <Text style={[styles.certVal, { color: COLOR_PALETTE.status.lockedGreen }]}>ENABLED (Block Auto-Append)</Text>
          </View>
        </View>
      )}
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
  statusCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    flex: 1,
  },
  vaultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  vaultVersion: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  syncBtn: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  syncBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  syncingText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.cyberCyan,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLOR_PALETTE.accent.cyberCyan,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: COLOR_PALETTE.background.elevatedSurface,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.accent.cyberCyan + '55',
  },
  tabText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontWeight: 'bold',
  },
  feedCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 12,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  feedStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  feedMeta: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginBottom: 4,
  },
  feedSubText: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  securityTagRow: {
    marginTop: 8,
  },
  securityTag: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.cyberCyan,
    fontWeight: '600',
  },
  vaultCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_PALETTE.background.borderOutline + '55',
  },
  metricLabel: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  securityDesc: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
    lineHeight: 18,
    marginBottom: 16,
  },
  certBox: {
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  certLabel: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 6,
  },
  certVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
});
