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
  Platform,
  UIManager,
} from 'react-native';
import { DeviceIllustrationCard } from './device-illustration-card';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Home Screen v5 - Interactive Operations Dashboard with Device Illustrations
 * Features animated segmented mode switches, graphic device schematic cards,
 * collapsible telemetry metrics, and spring-animated diagnostic action tiles.
 */
export const HomeScreenV5: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'LOCAL_HOST_SELF' | 'REMOTE_TARGET_USB'>('LOCAL_HOST_SELF');
  const [expandedCard, setExpandedCard] = useState<string | null>('TARGET_INFO');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Animated Values
  const modeSwitchAnim = useRef(new Animated.Value(0)).current; // 0 for LOCAL, 1 for REMOTE
  const pulseDot = useRef(new Animated.Value(0.3)).current;
  const syncRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseDot, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseDot, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleModeSwitch = (mode: 'LOCAL_HOST_SELF' | 'REMOTE_TARGET_USB') => {
    setActiveMode(mode);
    Animated.spring(modeSwitchAnim, {
      toValue: mode === 'LOCAL_HOST_SELF' ? 0 : 1,
      friction: 7,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  const toggleExpand = (cardId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleRefreshSync = () => {
    setIsSyncing(true);
    Animated.timing(syncRotation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      syncRotation.setValue(0);
      setIsSyncing(false);
    });
  };

  const spinSync = syncRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Header Banner */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>DC</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>DROID COMMANDER</Text>
            <Text style={styles.headerSubtitle}>CODEPHREX ORCHESTRATION ENGINE</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleRefreshSync} activeOpacity={0.7} style={styles.syncButton}>
          <Animated.Text style={[styles.syncIcon, { transform: [{ rotate: spinSync }] }]}>
            🔄
          </Animated.Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Dual-Mode Switcher */}
        <View style={styles.modeSwitchContainer}>
          <Animated.View
            style={[
              styles.activeModeIndicator,
              {
                left: modeSwitchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['2%', '50%'],
                }),
              },
            ]}
          />
          <TouchableOpacity
            style={styles.modeTab}
            activeOpacity={0.9}
            onPress={() => handleModeSwitch('LOCAL_HOST_SELF')}
          >
            <Text style={[styles.modeTabText, activeMode === 'LOCAL_HOST_SELF' && styles.modeTabTextActive]}>
              📱 LOCAL HOST
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeTab}
            activeOpacity={0.9}
            onPress={() => handleModeSwitch('REMOTE_TARGET_USB')}
          >
            <Text style={[styles.modeTabText, activeMode === 'REMOTE_TARGET_USB' && styles.modeTabTextActive]}>
              🔌 REMOTE OTG
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Graphic Device Illustration Banner */}
        <DeviceIllustrationCard
          manufacturer={activeMode === 'LOCAL_HOST_SELF' ? 'Google' : 'Samsung'}
          model={activeMode === 'LOCAL_HOST_SELF' ? 'Pixel 8 Pro' : 'Galaxy S24 Ultra'}
          displayCondition={activeMode === 'LOCAL_HOST_SELF' ? 'INTACT_OLED' : 'SHATTERED_SCREEN'}
          isConnectedOtg={activeMode === 'REMOTE_TARGET_USB'}
          riskScore={activeMode === 'LOCAL_HOST_SELF' ? 0.0 : 8.8}
          selinuxMode={activeMode === 'LOCAL_HOST_SELF' ? 'ENFORCING' : 'PERMISSIVE'}
        />

        {/* Target Identity & State Overview */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            activeOpacity={0.8}
            onPress={() => toggleExpand('TARGET_INFO')}
          >
            <View style={styles.cardHeaderLeft}>
              <Animated.View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: activeMode === 'LOCAL_HOST_SELF' ? '#3FB950' : '#F0883E',
                    opacity: pulseDot,
                  },
                ]}
              />
              <Text style={styles.cardTitle}>
                {activeMode === 'LOCAL_HOST_SELF' ? 'Pixel 8 Pro (Host Phone)' : 'Galaxy S24 Ultra (USB OTG Target)'}
              </Text>
            </View>
            <Text style={styles.expandChevron}>{expandedCard === 'TARGET_INFO' ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {expandedCard === 'TARGET_INFO' && (
            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hardware Serial:</Text>
                <Text style={styles.infoValueMonospace}>
                  {activeMode === 'LOCAL_HOST_SELF' ? 'DC-HOST-99218-P8' : 'USB-OTG-88219-S24U'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>AVB Verified Boot:</Text>
                <View
                  style={[
                    styles.avbBadge,
                    { backgroundColor: activeMode === 'LOCAL_HOST_SELF' ? '#3FB95020' : '#F0883E20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.avbText,
                      { color: activeMode === 'LOCAL_HOST_SELF' ? '#3FB950' : '#F0883E' },
                    ]}
                  >
                    {activeMode === 'LOCAL_HOST_SELF' ? 'LOCKED_GREEN (100% Trust)' : 'UNLOCKED_ORANGE (Custom)'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Firmware Integrity Score:</Text>
                <Text style={styles.infoValueBold}>
                  {activeMode === 'LOCAL_HOST_SELF' ? '100 / 100 (Pass)' : '35 / 100 (Tampered)'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Diagnostic Action Grid */}
        <Text style={styles.sectionHeader}>QUICK DIAGNOSTIC MODULES</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridTile} activeOpacity={0.8}>
            <Text style={styles.tileIcon}>🛡️</Text>
            <Text style={styles.tileTitle}>CVE Vulnerability Scanner</Text>
            <Text style={styles.tileSub}>Assess Host & OTG Risks</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridTile} activeOpacity={0.8}>
            <Text style={styles.tileIcon}>💻</Text>
            <Text style={styles.tileTitle}>Host ADB Shell</Text>
            <Text style={styles.tileSub}>Preloaded Macros & Terminal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridTile} activeOpacity={0.8}>
            <Text style={styles.tileIcon}>🔑</Text>
            <Text style={styles.tileTitle}>Passkey Break-Glass</Text>
            <Text style={styles.tileSub}>Elevate Emergency Scopes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridTile} activeOpacity={0.8}>
            <Text style={styles.tileIcon}>📜</Text>
            <Text style={styles.tileTitle}>Ledger Inspector</Text>
            <Text style={styles.tileSub}>SHA-256 Hash Chain</Text>
          </TouchableOpacity>
        </View>

        {/* Live Power & BMS Metrics */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            activeOpacity={0.8}
            onPress={() => toggleExpand('POWER_INFO')}
          >
            <Text style={styles.cardTitle}>⚡ BMS Power & OTG VBUS Rail</Text>
            <Text style={styles.expandChevron}>{expandedCard === 'POWER_INFO' ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {expandedCard === 'POWER_INFO' && (
            <View style={styles.cardBody}>
              <View style={styles.metricGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricVal}>4.12 V</Text>
                  <Text style={styles.metricLbl}>Battery Voltage</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricVal}>31.4 °C</Text>
                  <Text style={styles.metricLbl}>Thermal Gauge</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricVal}>5.00 V</Text>
                  <Text style={styles.metricLbl}>OTG VBUS Rail</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#388BFD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoBadgeText: { fontSize: 18, fontWeight: '900', color: '#F0F6FC' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#F0F6FC', letterSpacing: 1.5 },
  headerSubtitle: { fontSize: 9, fontWeight: '700', color: '#58A6FF', letterSpacing: 1 },
  syncButton: { padding: 8 },
  syncIcon: { fontSize: 18 },
  scrollContent: { padding: 20 },
  modeSwitchContainer: {
    height: 48,
    backgroundColor: '#161B22',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#30363D',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  activeModeIndicator: {
    position: 'absolute',
    width: '48%',
    height: 40,
    borderRadius: 20,
    backgroundColor: '#388BFD',
  },
  modeTab: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  modeTabText: { fontSize: 12, fontWeight: '800', color: '#8B949E', letterSpacing: 1 },
  modeTabTextActive: { color: '#F0F6FC' },
  card: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#21262D',
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#F0F6FC' },
  expandChevron: { fontSize: 12, color: '#8B949E' },
  cardBody: { padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 12, color: '#8B949E' },
  infoValueMonospace: { fontSize: 12, fontFamily: 'monospace', color: '#58A6FF' },
  infoValueBold: { fontSize: 12, fontWeight: '800', color: '#F0F6FC' },
  avbBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  avbText: { fontSize: 11, fontWeight: '800' },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#8B949E', letterSpacing: 1.5, marginTop: 8, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  gridTile: {
    width: '48%',
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 14,
    marginBottom: 12,
  },
  tileIcon: { fontSize: 22, marginBottom: 8 },
  tileTitle: { fontSize: 12, fontWeight: '800', color: '#F0F6FC', marginBottom: 4 },
  tileSub: { fontSize: 10, color: '#8B949E' },
  metricGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metricBox: { flex: 1, alignItems: 'center', padding: 10, backgroundColor: '#0D1117', borderRadius: 8, marginHorizontal: 4 },
  metricVal: { fontSize: 14, fontWeight: '900', color: '#388BFD', marginBottom: 2 },
  metricLbl: { fontSize: 9, color: '#8B949E' },
});
