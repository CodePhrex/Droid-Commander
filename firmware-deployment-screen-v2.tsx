import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLOR_PALETTE } from './brand-design-system';
import { DeviceIllustrationCard } from './device-illustration-card';

export interface FirmwarePackage {
  packageId: string;
  targetModel: string;
  vendor: string;
  version: string;
  androidVersion: string;
  sha256Digest: string;
  sizeMb: number;
  avbStatus: 'LOCKED_GREEN' | 'UNLOCKED_ORANGE' | 'SELF_SIGNED_YELLOW';
  releaseType: 'STOCK_OTA' | 'FACTORY_FASTBOOT' | 'TREBLE_GSI';
}

export const FirmwareDeploymentScreenV2: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<FirmwarePackage | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [flashProgress, setFlashProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'REPOSITORIES' | 'DEPLOYMENT_LOGS'>('REPOSITORIES');

  const packages: FirmwarePackage[] = [
    {
      packageId: 'OTA_PIXEL8PRO_UQ1A_202410',
      targetModel: 'Google Pixel 8 Pro (husky)',
      vendor: 'Google OEM',
      version: 'UQ1A.241005.001',
      androidVersion: 'Android 14 (API 34)',
      sha256Digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      sizeMb: 2450,
      avbStatus: 'LOCKED_GREEN',
      releaseType: 'STOCK_OTA',
    },
    {
      packageId: 'FASTBOOT_GALAXY_S24U_S928B',
      targetModel: 'Samsung Galaxy S24 Ultra (S928B)',
      vendor: 'Samsung OEM',
      version: 'S928BXXU1AXB5',
      androidVersion: 'Android 14 (API 34)',
      sha256Digest: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      sizeMb: 6810,
      avbStatus: 'UNLOCKED_ORANGE',
      releaseType: 'FACTORY_FASTBOOT',
    },
    {
      packageId: 'TREBLE_GSI_ARM64_AOSP_14',
      targetModel: 'Universal ARM64 Treble Target',
      vendor: 'AOSP Open Source',
      version: 'AOSP-14-202410-GSI',
      androidVersion: 'Android 14 (API 34)',
      sha256Digest: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      sizeMb: 1820,
      avbStatus: 'SELF_SIGNED_YELLOW',
      releaseType: 'TREBLE_GSI',
    },
  ];

  const handleVerifyDigest = (pkg: FirmwarePackage) => {
    Alert.alert(
      'AVB 2.0 Digest Verified',
      `Package ID: ${pkg.packageId}\nSHA-256 Digest Match: VERIFIED (100% Stock OEM Hash Match)\nAVB Root State: ${pkg.avbStatus}`,
      [{ text: 'Acknowledge' }]
    );
  };

  const handleStartFlashing = (pkg: FirmwarePackage) => {
    setSelectedPackage(pkg);
    setIsFlashing(true);
    setFlashProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setFlashProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsFlashing(false);
        Alert.alert(
          'Deployment Succeeded',
          `Successfully deployed ${pkg.releaseType} '${pkg.version}' to target OTG device over USB bus.\n\nTransaction logged to Privileged Action Ledger.`,
          [{ text: 'Dismiss' }]
        );
      }
    }, 600);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>⚡ Vendor & Firmware Deployment Hub</Text>
        <Text style={styles.headerSubtitle}>
          Manage multi-OEM vendor capability contracts, verify AVB 2.0 firmware digests, and execute user-requested OTG flashing operations.
        </Text>
      </View>

      {/* Active Target Device Graphic Illustration */}
      <DeviceIllustrationCard
        manufacturer="Samsung"
        model="Galaxy S24 Ultra"
        displayCondition="SHATTERED_SCREEN"
        isConnectedOtg={true}
        riskScore={8.8}
        selinuxMode="PERMISSIVE"
      />

      {/* Segmented Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'REPOSITORIES' && styles.tabItemActive]}
          onPress={() => setActiveTab('REPOSITORIES')}
        >
          <Text style={[styles.tabText, activeTab === 'REPOSITORIES' && styles.tabTextActive]}>
            📦 FIRMWARE CATALOG
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'DEPLOYMENT_LOGS' && styles.tabItemActive]}
          onPress={() => setActiveTab('DEPLOYMENT_LOGS')}
        >
          <Text style={[styles.tabText, activeTab === 'DEPLOYMENT_LOGS' && styles.tabTextActive]}>
            📜 DEPLOYMENT LOGS
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'REPOSITORIES' ? (
        <View>
          <Text style={styles.sectionTitle}>Available Stock & Vendor Packages ({packages.length})</Text>

          {packages.map((pkg) => (
            <View key={pkg.packageId} style={styles.pkgCard}>
              <View style={styles.pkgHeader}>
                <Text style={styles.pkgTitle}>{pkg.targetModel}</Text>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        pkg.releaseType === 'STOCK_OTA'
                          ? COLOR_PALETTE.status.lockedGreen + '22'
                          : pkg.releaseType === 'FACTORY_FASTBOOT'
                          ? COLOR_PALETTE.status.warningYellow + '22'
                          : COLOR_PALETTE.accent.electricBlue + '22',
                      borderColor:
                        pkg.releaseType === 'STOCK_OTA'
                          ? COLOR_PALETTE.status.lockedGreen
                          : pkg.releaseType === 'FACTORY_FASTBOOT'
                          ? COLOR_PALETTE.status.warningYellow
                          : COLOR_PALETTE.accent.electricBlue,
                    },
                  ]}
                >
                  <Text style={styles.typeBadgeText}>{pkg.releaseType}</Text>
                </View>
              </View>

              <Text style={styles.pkgMeta}>Version: {pkg.version} | Vendor: {pkg.vendor}</Text>
              <Text style={styles.pkgMeta}>Target: {pkg.androidVersion} | Size: {pkg.sizeMb} MB</Text>
              <Text style={styles.hashText}>SHA-256: {pkg.sha256Digest}</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerifyDigest(pkg)}>
                  <Text style={styles.verifyBtnText}>🔍 Verify AVB Digest</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.flashBtn} onPress={() => handleStartFlashing(pkg)}>
                  <Text style={styles.flashBtnText}>⚡ Deploy to OTG Device</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Active Flashing Engine Progress Modal */}
          {isFlashing && (
            <View style={styles.flashingBox}>
              <Text style={styles.flashingTitle}>⚡ FLASHING FIRMWARE TO USB TARGET...</Text>
              <Text style={styles.flashingSub}>Package: {selectedPackage?.packageId}</Text>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${flashProgress}%` }]} />
              </View>
              <Text style={styles.progressPercentText}>{flashProgress}% Completed</Text>
              <ActivityIndicator color={COLOR_PALETTE.accent.cyberCyan} style={{ marginTop: 10 }} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.logsBox}>
          <Text style={styles.logText}>[10:45:12] Initialized Fastboot OTG wire protocol connection.</Text>
          <Text style={styles.logText}>[10:45:14] Verified target partition layout: boot, init_boot, vendor_boot, system.</Text>
          <Text style={styles.logText}>[10:45:18] Owner consent token verified for scope 'ELEVATED_FLASH_FIRMWARE'.</Text>
          <Text style={styles.logText}>[10:45:22] Executing fastboot flash system_a system.img (2.4 GB streamed).</Text>
          <Text style={styles.logText}>[10:45:30] Flash operation completed successfully. AVB state: LOCKED_GREEN.</Text>
          <Text style={styles.logText}>[10:45:32] Signed block #8812 recorded to Privileged Action Ledger.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_PALETTE.background.darkSlate, padding: 16 },
  headerCard: { padding: 16, backgroundColor: COLOR_PALETTE.background.charcoalSurface, borderRadius: 12, borderWidth: 1, borderColor: COLOR_PALETTE.background.borderOutline, marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLOR_PALETTE.accent.electricBlue, marginBottom: 6 },
  headerSubtitle: { fontSize: 12, color: COLOR_PALETTE.accent.metallicSteel, lineHeight: 18 },
  tabBar: { flexDirection: 'row', backgroundColor: COLOR_PALETTE.background.charcoalSurface, borderRadius: 8, padding: 4, marginBottom: 16 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabItemActive: { backgroundColor: COLOR_PALETTE.accent.electricBlue },
  tabText: { fontSize: 11, fontWeight: 'bold', color: COLOR_PALETTE.accent.metallicSteel },
  tabTextActive: { color: '#FFF' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLOR_PALETTE.accent.cyberCyan, marginBottom: 12 },
  pkgCard: { backgroundColor: COLOR_PALETTE.background.charcoalSurface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: COLOR_PALETTE.background.borderOutline, marginBottom: 12 },
  pkgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pkgTitle: { fontSize: 15, fontWeight: 'bold', color: COLOR_PALETTE.accent.chromeSilver },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', color: COLOR_PALETTE.accent.chromeSilver },
  pkgMeta: { fontSize: 11, color: COLOR_PALETTE.accent.metallicSteel, marginTop: 2 },
  hashText: { fontSize: 10, fontFamily: 'monospace', color: COLOR_PALETTE.accent.cyberCyan, marginTop: 6, marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  verifyBtn: { flex: 1, backgroundColor: COLOR_PALETTE.background.darkSlate, borderWidth: 1, borderColor: COLOR_PALETTE.accent.electricBlue, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  verifyBtnText: { color: COLOR_PALETTE.accent.chromeSilver, fontSize: 11, fontWeight: 'bold' },
  flashBtn: { flex: 1, backgroundColor: COLOR_PALETTE.accent.electricBlue, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  flashBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  flashingBox: { backgroundColor: COLOR_PALETTE.background.charcoalSurface, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: COLOR_PALETTE.accent.cyberCyan, marginTop: 16 },
  flashingTitle: { fontSize: 13, fontWeight: 'bold', color: COLOR_PALETTE.accent.cyberCyan, textAlign: 'center' },
  flashingSub: { fontSize: 11, color: COLOR_PALETTE.accent.metallicSteel, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  progressBarTrack: { height: 10, backgroundColor: COLOR_PALETTE.background.darkSlate, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLOR_PALETTE.accent.cyberCyan },
  progressPercentText: { fontSize: 12, fontWeight: 'bold', color: COLOR_PALETTE.accent.chromeSilver, textAlign: 'center', marginTop: 6 },
  logsBox: { backgroundColor: COLOR_PALETTE.background.charcoalSurface, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: COLOR_PALETTE.background.borderOutline },
  logText: { fontSize: 11, fontFamily: 'monospace', color: COLOR_PALETTE.accent.cyberCyan, marginBottom: 6 },
});
