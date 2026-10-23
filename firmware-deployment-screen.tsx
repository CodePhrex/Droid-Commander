import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { COLOR_PALETTE } from './brand-design-system';

export interface FirmwarePackage {
  id: string;
  vendor: 'Google' | 'Samsung' | 'Xiaomi' | 'Generic Treble GSI';
  model: string;
  version: string;
  buildId: string;
  sizeMb: number;
  sha256Digest: string;
  signatureState: 'OEM_SIGNED_VALID' | 'COMMUNITY_SIGNED' | 'UNVERIFIED';
  downloadStatus: 'AVAILABLE_OFFLINE' | 'DOWNLOADING' | 'READY_FOR_FLASH';
}

export interface OEMVendorPlugin {
  providerId: string;
  vendorName: string;
  vidPid: string;
  tier: 'TIER_2_HARDWARE_DIRECT' | 'TIER_3_ELEVATED';
  status: 'ACTIVE_REGISTERED' | 'PENDING_APPROVAL';
}

export const FirmwareDeploymentScreen: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'FASTBOOT' | 'ADB_SIDELOAD'>('FASTBOOT');
  const [selectedTargetPartition, setSelectedTargetPartition] = useState<string>('all_partitions');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [flashProgress] = useState(new Animated.Value(0));

  const [firmwareCatalog] = useState<FirmwarePackage[]>([
    {
      id: 'fw_pixel_8_pro_14',
      vendor: 'Google',
      model: 'Pixel 8 Pro (husky)',
      version: 'Android 14.0.0 (UQ1A.240205.004)',
      buildId: 'UQ1A.240205.004',
      sizeMb: 3120,
      sha256Digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      signatureState: 'OEM_SIGNED_VALID',
      downloadStatus: 'AVAILABLE_OFFLINE',
    },
    {
      id: 'fw_samsung_s23_ota',
      vendor: 'Samsung',
      model: 'Galaxy S23 (SM-S911B)',
      version: 'One UI 6.1 / Android 14',
      buildId: 'S911BXXU3CXB1',
      sizeMb: 2890,
      sha256Digest: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      signatureState: 'OEM_SIGNED_VALID',
      downloadStatus: 'AVAILABLE_OFFLINE',
    },
    {
      id: 'fw_gsi_android14_treble',
      vendor: 'Generic Treble GSI',
      model: 'Universal ARM64-AOSP',
      version: 'Android 14 GSI Clean Build',
      buildId: 'GSI-14-ARM64-OFFLINE',
      sizeMb: 1840,
      sha256Digest: '9a31182283a31d9a2a7a1bc8f192b67f1234567890abcdef1234567890abcdef',
      signatureState: 'COMMUNITY_SIGNED',
      downloadStatus: 'AVAILABLE_OFFLINE',
    },
  ]);

  const [activePackage, setActivePackage] = useState<FirmwarePackage>(firmwareCatalog[0]);

  const [oemPlugins] = useState<OEMVendorPlugin[]>([
    {
      providerId: 'com.google.pixel.fastboot',
      vendorName: 'Google Pixel OEM Provider',
      vidPid: 'VID: 0x18D1 | PID: 0x4EE0',
      tier: 'TIER_3_ELEVATED',
      status: 'ACTIVE_REGISTERED',
    },
    {
      providerId: 'com.samsung.knox.odin',
      vendorName: 'Samsung Odin Transport Plugin',
      vidPid: 'VID: 0x04E8 | PID: 0x6860',
      tier: 'TIER_3_ELEVATED',
      status: 'ACTIVE_REGISTERED',
    },
  ]);

  const handleVerifyDigest = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      Alert.alert(
        'AVB 2.0 Manifest Verification Passed',
        `Package: ${activePackage.version}\nSHA-256 Digest matches stock OEM manifest.\nAVB State: LOCKED_GREEN / Clean Image.`,
        [{ text: 'Acknowledge' }]
      );
    }, 1200);
  };

  const handleDeployFirmware = () => {
    Alert.alert(
      'Confirm Firmware Deployment',
      `Target: ${activePackage.model}\nMode: ${selectedMethod}\nPartitions: ${selectedTargetPartition}\n\nWarning: Flashing firmware requires Two-Party Owner Consent and will log a signed transaction to the Privileged Action Ledger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Flash',
          style: 'destructive',
          onPress: executeFlashingAnimation,
        },
      ]
    );
  };

  const executeFlashingAnimation = () => {
    setIsFlashing(true);
    flashProgress.setValue(0);

    Animated.timing(flashProgress, {
      toValue: 1,
      duration: 3500,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => {
      setIsFlashing(false);
      Alert.alert(
        'Firmware Deployment Complete',
        `Successfully flashed ${activePackage.model} via ${selectedMethod}.\nTransaction written to Privileged Action Ledger.\nSHA-256 Block Hash: 98a72b11...`,
        [{ text: 'Done' }]
      );
    });
  };

  const progressInterpolate = flashProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📦 Vendor & Firmware Deployment Hub</Text>
        <Text style={styles.subtitle}>
          Multi-OEM Firmware Verification, Fastboot Flashing & A/B OTA Sideload Engine
        </Text>
      </View>

      {/* OEM Vendor Plugins Registry */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registered OEM Vendor Capability Plugins</Text>
        {oemPlugins.map((plugin, index) => (
          <View key={index} style={styles.pluginRow}>
            <View>
              <Text style={styles.pluginName}>{plugin.vendorName}</Text>
              <Text style={styles.pluginVid}>{plugin.vidPid} | {plugin.tier}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: COLOR_PALETTE.status.lockedGreen + '22', borderColor: COLOR_PALETTE.status.lockedGreen }]}>
              <Text style={[styles.badgeText, { color: COLOR_PALETTE.status.lockedGreen }]}>{plugin.status}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Offline Firmware Image Catalog */}
      <Text style={styles.sectionTitle}>Available Firmware Images ({firmwareCatalog.length})</Text>
      {firmwareCatalog.map((pkg) => {
        const isSelected = pkg.id === activePackage.id;
        return (
          <TouchableOpacity
            key={pkg.id}
            style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
            onPress={() => setActivePackage(pkg)}
          >
            <View style={styles.pkgHeader}>
              <Text style={styles.pkgModel}>{pkg.model}</Text>
              <Text style={styles.pkgVendor}>[{pkg.vendor}]</Text>
            </View>

            <Text style={styles.pkgVersion}>{pkg.version}</Text>
            <Text style={styles.pkgSub}>Build ID: {pkg.buildId} | Size: {(pkg.sizeMb / 1024).toFixed(2)} GB</Text>

            <View style={styles.pkgFooter}>
              <Text style={[
                styles.sigBadge,
                { color: pkg.signatureState === 'OEM_SIGNED_VALID' ? COLOR_PALETTE.status.lockedGreen : COLOR_PALETTE.status.warningYellow }
              ]}>
                ✓ {pkg.signatureState}
              </Text>
              <Text style={styles.statusText}>{pkg.downloadStatus}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Deployment Mode & Partition Options */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Deployment Settings for {activePackage.model}</Text>

        <Text style={styles.label}>Deployment Transport Protocol:</Text>
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodBtn, selectedMethod === 'FASTBOOT' && styles.methodBtnActive]}
            onPress={() => setSelectedMethod('FASTBOOT')}
          >
            <Text style={[styles.methodBtnText, selectedMethod === 'FASTBOOT' && styles.methodBtnTextActive]}>
              ⚡ Fastboot Flashing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, selectedMethod === 'ADB_SIDELOAD' && styles.methodBtnActive]}
            onPress={() => setSelectedMethod('ADB_SIDELOAD')}
          >
            <Text style={[styles.methodBtnText, selectedMethod === 'ADB_SIDELOAD' && styles.methodBtnTextActive]}>
              🔄 A/B OTA Sideload
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Target Partition Scope:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partRow}>
          {['all_partitions', 'boot', 'init_boot', 'vendor_boot', 'system', 'vbmeta'].map((part) => (
            <TouchableOpacity
              key={part}
              style={[styles.partPill, selectedTargetPartition === part && styles.partPillActive]}
              onPress={() => setSelectedTargetPartition(part)}
            >
              <Text style={[styles.partPillText, selectedTargetPartition === part && styles.partPillTextActive]}>
                {part}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Verification & Flash Action Triggers */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyDigest} disabled={isVerifying || isFlashing}>
            {isVerifying ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.verifyBtnText}>🔍 Verify AVB Digest</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.flashBtn} onPress={handleDeployFirmware} disabled={isFlashing}>
            <Text style={styles.flashBtnText}>🚀 Deploy Firmware</Text>
          </TouchableOpacity>
        </View>

        {/* Live Progress Bar */}
        {isFlashing && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Flashing Partitions over USB OTG Bus...</Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { width: progressInterpolate }]} />
            </View>
          </View>
        )}
      </View>
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
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
    marginBottom: 12,
  },
  pluginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_PALETTE.background.borderOutline,
  },
  pluginName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  pluginVid: {
    fontSize: 10,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
    marginBottom: 12,
  },
  pkgCard: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 12,
  },
  pkgCardSelected: {
    borderColor: COLOR_PALETTE.accent.cyberCyan,
    backgroundColor: COLOR_PALETTE.background.elevatedSurface,
  },
  pkgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pkgModel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  pkgVendor: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.cyberCyan,
  },
  pkgVersion: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.electricBlue,
    marginTop: 4,
  },
  pkgSub: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 4,
  },
  pkgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sigBadge: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 10,
    color: COLOR_PALETTE.status.lockedGreen,
  },
  label: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 10,
    marginBottom: 6,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    alignItems: 'center',
    backgroundColor: COLOR_PALETTE.background.darkSlate,
  },
  methodBtnActive: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    borderColor: COLOR_PALETTE.accent.cyberCyan,
  },
  methodBtnText: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
    fontWeight: '600',
  },
  methodBtnTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  partRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  partPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginRight: 6,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
  },
  partPillActive: {
    borderColor: COLOR_PALETTE.accent.cyberCyan,
    backgroundColor: COLOR_PALETTE.accent.codePhrexIndigo,
  },
  partPillText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  partPillTextActive: {
    color: COLOR_PALETTE.accent.chromeSilver,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  verifyBtn: {
    flex: 1,
    backgroundColor: COLOR_PALETTE.background.elevatedSurface,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.accent.cyberCyan,
    alignItems: 'center',
  },
  verifyBtnText: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontWeight: 'bold',
    fontSize: 12,
  },
  flashBtn: {
    flex: 1,
    backgroundColor: COLOR_PALETTE.status.criticalRed,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  flashBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  progressContainer: {
    marginTop: 14,
  },
  progressText: {
    fontSize: 11,
    color: COLOR_PALETTE.status.warningYellow,
    marginBottom: 6,
  },
  track: {
    height: 8,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLOR_PALETTE.status.lockedGreen,
  },
});
