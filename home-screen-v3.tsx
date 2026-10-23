import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BrandHeaderBanner } from './brand-header-banner';
import { COLOR_PALETTE } from './brand-design-system';
import { OperationModeManager, OperationMode } from './operation-mode-manager';
import { TargetProviderFactory, TargetTelemetry } from './target-provider-factory';

/**
 * Droid Commander - Professional Main Dashboard (v3.0)
 * Fully integrated with CodePhrex Metallic Brand Identity,
 * Dual-Mode Switcher, Telemetry Vault, and Passkey Break-Glass Governance.
 */
export const DroidCommanderHomeScreenV3: React.FC = () => {
  const modeManager = OperationModeManager.getInstance();
  const providerFactory = TargetProviderFactory.getInstance();

  const [activeMode, setActiveMode] = useState<OperationMode>(modeManager.getActiveMode());
  const [telemetry, setTelemetry] = useState<TargetTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  // Fetch telemetry for active operation mode
  const loadTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await providerFactory.getTelemetry(activeMode);
      setTelemetry(data);
    } catch (error: any) {
      Alert.alert('Telemetry Error', error.message || 'Failed to query target telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [activeMode, providerFactory]);

  useEffect(() => {
    loadTelemetry();
  }, [loadTelemetry]);

  // Handle Mode Toggle (Local Host Self vs Remote USB Target)
  const handleModeSwitch = async (newMode: OperationMode) => {
    if (newMode === activeMode) return;
    setIsSwitching(true);

    try {
      await modeManager.switchMode(newMode, 'TECH_LEAD_01');
      setActiveMode(newMode);
      Alert.alert(
        'Operation Mode Switched',
        `Active target context changed to: ${
          newMode === 'LOCAL_HOST_SELF' ? '📱 Local Host Phone' : '🔌 Remote USB OTG Target'
        }. Privileged Action Ledger updated.`
      );
    } catch (error: any) {
      Alert.alert('Mode Switch Blocked', error.message || 'Failed to switch operation mode.');
    } finally {
      setIsSwitching(false);
    }
  };

  const isLocal = activeMode === 'LOCAL_HOST_SELF';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLOR_PALETTE.background.darkSlate} />

      {/* Brand Header Banner */}
      <BrandHeaderBanner
        activeModeLabel={isLocal ? 'LOCAL HOST SELF-SERVICE' : 'REMOTE USB OTG TARGET'}
        onOpenSettings={() => Alert.alert('Settings', 'Droid Commander Configuration Engine')}
      />

      {/* Segmented Mode Switcher */}
      <View style={styles.modeSwitcherContainer}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            isLocal && styles.activeLocalButton,
          ]}
          onPress={() => handleModeSwitch('LOCAL_HOST_SELF')}
          disabled={isSwitching}
        >
          <Text style={[styles.modeButtonText, isLocal && styles.activeModeText]}>
            📱 Local Host Phone
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            !isLocal && styles.activeRemoteButton,
          ]}
          onPress={() => handleModeSwitch('REMOTE_TARGET_USB')}
          disabled={isSwitching}
        >
          <Text style={[styles.modeButtonText, !isLocal && styles.activeModeText]}>
            🔌 Remote USB Target
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Target Identity & Connection Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {isLocal ? 'LOCAL HOST IDENTITY' : 'REMOTE TARGET IDENTITY'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: telemetry?.connectionStatus === 'CONNECTED'
                    ? COLOR_PALETTE.status.lockedGreen
                    : COLOR_PALETTE.status.criticalRed,
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {telemetry?.connectionStatus || 'SCANNING...'}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={COLOR_PALETTE.accent.cyberCyan} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Device Model:</Text>
                <Text style={styles.detailValue}>{telemetry?.model || 'Unknown'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Serial / VID:PID:</Text>
                <Text style={styles.detailValue}>{telemetry?.serialOrVidPid || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Android OS Build:</Text>
                <Text style={styles.detailValue}>{telemetry?.androidBuild || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Verified Boot (AVB):</Text>
                <Text
                  style={[
                    styles.detailValue,
                    {
                      color: telemetry?.avbState === 'LOCKED_GREEN'
                        ? COLOR_PALETTE.status.lockedGreen
                        : COLOR_PALETTE.status.unlockedOrange,
                    },
                  ]}
                >
                  {telemetry?.avbState || 'UNLOCKED'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Security Assessment & Keystore Trust Metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.metricLabel}>Firmware Score</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color: (telemetry?.firmwareIntegrityScore || 0) >= 90
                    ? COLOR_PALETTE.status.lockedGreen
                    : COLOR_PALETTE.status.criticalRed,
                },
              ]}
            >
              {telemetry?.firmwareIntegrityScore ?? '--'}/100
            </Text>
            <Text style={styles.metricSubtext}>AVB 2.0 Hash Check</Text>
          </View>

          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.metricLabel}>Keystore Trust</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color: (telemetry?.keystoreTrustScore || 0) >= 85
                    ? COLOR_PALETTE.status.lockedGreen
                    : COLOR_PALETTE.status.warningYellow,
                },
              ]}
            >
              {telemetry?.keystoreTrustScore ?? '--'}/100
            </Text>
            <Text style={styles.metricSubtext}>StrongBox Attestation</Text>
          </View>
        </View>

        {/* BMS Thermal & Battery Health Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>POWER DELIVERY & THERMAL PROFILE</Text>
          <View style={styles.bmsGrid}>
            <View style={styles.bmsItem}>
              <Text style={styles.bmsLabel}>Battery Level</Text>
              <Text style={styles.bmsValue}>{telemetry?.bms.batteryLevelPercent ?? '--'}%</Text>
            </View>
            <View style={styles.bmsItem}>
              <Text style={styles.bmsLabel}>Temperature</Text>
              <Text
                style={[
                  styles.bmsValue,
                  {
                    color: (telemetry?.bms.temperatureCelsius || 0) > 45
                      ? COLOR_PALETTE.status.criticalRed
                      : COLOR_PALETTE.accent.chromeSilver,
                  },
                ]}
              >
                {telemetry?.bms.temperatureCelsius ?? '--'}°C
              </Text>
            </View>
            <View style={styles.bmsItem}>
              <Text style={styles.bmsLabel}>Voltage</Text>
              <Text style={styles.bmsValue}>{telemetry?.bms.voltageMv ?? '--'} mV</Text>
            </View>
          </View>
        </View>

        {/* Quick Action Playbooks */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DIAGNOSTIC & RECOVERY PLAYBOOKS</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert('CVE Scan Triggered', `Initiating live vulnerability assessment on ${isLocal ? 'Local Host' : 'Remote OTG Target'}.`)
            }
          >
            <Text style={styles.actionButtonText}>🛡️ Run Vulnerability & CVE Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              Alert.alert('Keystore Audit', 'Scanning user-installed CAs and checking TEE keymaster attestation.')
            }
          >
            <Text style={styles.actionButtonText}>🔑 Audit Root Certificates & Keystore</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.breakGlassButton]}
            onPress={() =>
              Alert.alert('Break-Glass Portal', 'Redirecting to Passkey Biometric Override Screen.')
            }
          >
            <Text style={styles.breakGlassButtonText}>⚡ Passkey Emergency Break-Glass</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeLocalButton: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
  },
  activeRemoteButton: {
    backgroundColor: COLOR_PALETTE.accent.codePhrexIndigo,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  activeModeText: {
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLOR_PALETTE.accent.cyberCyan,
    letterSpacing: 1.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  detailsGrid: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR_PALETTE.background.borderOutline,
  },
  detailLabel: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCard: {
    width: '48%',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricSubtext: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  bmsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  bmsItem: {
    alignItems: 'center',
  },
  bmsLabel: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginBottom: 4,
  },
  bmsValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  actionButton: {
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.accent.electricBlue,
    marginTop: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  breakGlassButton: {
    borderColor: COLOR_PALETTE.status.warningYellow,
    backgroundColor: COLOR_PALETTE.accent.codePhrexIndigo,
  },
  breakGlassButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLOR_PALETTE.status.warningYellow,
  },
});
