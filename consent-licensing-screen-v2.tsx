import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Animated,
  StatusBar,
  Easing,
} from 'react-native';

interface ScopePermission {
  key: string;
  label: string;
  granted: boolean;
  requiresTwoParty: boolean;
}

/**
 * Two-Party Consent & Licensing Screen v2 - Enhanced with Animated QR Scanner,
 * Interactive Scope Permission Matrix, and License Binding Badges.
 */
export const ConsentLicensingScreenV2: React.FC = () => {
  const [isScanningQR, setIsScanningQR] = useState<boolean>(false);
  const [licenseBound, setLicenseBound] = useState<boolean>(true);

  const [scopes, setScopes] = useState<ScopePermission[]>([
    { key: 'READ_TELEMETRY', label: 'Read System & BMS Telemetry', granted: true, requiresTwoParty: false },
    { key: 'ASSESS_HOST', label: 'Execute Live CVE Assessments', granted: true, requiresTwoParty: false },
    { key: 'REMEDIATE_SELINUX', label: 'Remediate SELinux Enforcing Policy', granted: true, requiresTwoParty: true },
    { key: 'FLASH_PARTITION', label: 'Fastboot Partition Flashing', granted: false, requiresTwoParty: true },
  ]);

  // Animated Values
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const startScanQR = () => {
    setIsScanningQR(true);
    scanLineAnim.setValue(0);

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();

    setTimeout(() => {
      setIsScanningQR(false);
      scanLineAnim.stopAnimation();
    }, 3000);
  };

  const toggleScope = (key: string) => {
    setScopes((prev) =>
      prev.map((s) => (s.key === key ? { ...s, granted: !s.granted } : s))
    );
  };

  const scanTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📜 TWO-PARTY CONSENT & LICENSING</Text>
        <Text style={styles.headerSub}>GOVERNANCE BOUNDARIES & TECHNICIAN AUTHORIZATION</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* QR Consent Scanner Card */}
        <View style={styles.qrCard}>
          <Text style={styles.cardTitle}>OWNER CONSENT QR SCANNER</Text>

          <View style={styles.qrFrame}>
            {isScanningQR ? (
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]} />
            ) : (
              <Text style={styles.qrPlaceholderIcon}>📷</Text>
            )}
          </View>

          <Text style={styles.qrSub}>
            {isScanningQR ? 'Scanning Owner Consent Token...' : 'Scan Owner Consent QR code to validate session scopes'}
          </Text>

          <TouchableOpacity style={styles.scanBtn} activeOpacity={0.8} onPress={startScanQR}>
            <Text style={styles.scanBtnText}>
              {isScanningQR ? '⏳ SCANNING TOKEN...' : '⚡ SCAN OWNER CONSENT QR'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Technician License Card */}
        <View style={styles.licenseCard}>
          <View style={styles.licHeader}>
            <Text style={styles.licTitle}>Technician License Binding</Text>
            <View style={styles.licBadge}>
              <Text style={styles.licBadgeText}>✓ HARDWARE MATCH</Text>
            </View>
          </View>
          <Text style={styles.licText}>Operator ID: TECH_LEAD_01 (Level 3 Certified)</Text>
          <Text style={styles.licText}>Hardware Key Binding: Pixel_8_Pro_Keymaster_HW01</Text>
        </View>

        {/* Scope Permission Toggles */}
        <Text style={styles.sectionTitle}>GRANTED VS. BLOCKED SCOPES</Text>
        {scopes.map((item) => (
          <View key={item.key} style={styles.scopeRow}>
            <View style={styles.scopeLeft}>
              <Text style={styles.scopeLabel}>{item.label}</Text>
              <Text style={styles.scopeSub}>
                {item.requiresTwoParty ? '🔒 Requires Two-Party Owner Consent' : '🔓 Unilateral Technician Scope'}
              </Text>
            </View>
            <Switch
              value={item.granted}
              onValueChange={() => toggleScope(item.key)}
              trackColor={{ false: '#21262D', true: '#388BFD' }}
              thumbColor={item.granted ? '#F0F6FC' : '#8B949E'}
            />
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
  qrCard: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1,
    marginBottom: 16,
  },
  qrFrame: {
    width: 130,
    height: 130,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#388BFD',
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  scanLine: {
    width: '100%',
    height: 3,
    backgroundColor: '#58A6FF',
    shadowColor: '#58A6FF',
    shadowRadius: 8,
    shadowOpacity: 0.8,
  },
  qrPlaceholderIcon: {
    fontSize: 36,
  },
  qrSub: {
    fontSize: 11,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 16,
  },
  scanBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#388BFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 1,
  },
  licenseCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 16,
    marginBottom: 20,
  },
  licHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  licTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F0F6FC',
  },
  licBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#3FB95020',
  },
  licBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3FB950',
  },
  licText: {
    fontSize: 11,
    color: '#8B949E',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161B22',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    marginBottom: 10,
  },
  scopeLeft: {
    flex: 1,
    marginRight: 10,
  },
  scopeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F0F6FC',
    marginBottom: 2,
  },
  scopeSub: {
    fontSize: 10,
    color: '#8B949E',
  },
});
