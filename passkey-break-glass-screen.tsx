import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { PasskeyEmergencyService, ElevatedPasskeySession } from './passkey-emergency-service';
import { PasskeyAuthProvider } from './passkey-auth-provider';

/**
 * PasskeyBreakGlassScreen
 *
 * Emergency Break-Glass UI for Droid Commander using host phone passkey / biometric prompt.
 * Enables 1-tap activation of elevated administrative scopes while preserving 100%
 * cryptographic hash-chain continuity in the Privileged Action Ledger.
 */
export const PasskeyBreakGlassScreen: React.FC = () => {
  const [adminId, setAdminId] = useState<string>('TECH_ADMIN_01');
  const [activeSession, setActiveSession] = useState<ElevatedPasskeySession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [hwInfo, setHwInfo] = useState<{ available: boolean; securityLevel: string } | null>(null);

  // Selected scope toggles
  const [scopeConsentBypass, setScopeConsentBypass] = useState<boolean>(true);
  const [scopeForceUsb, setScopeForceUsb] = useState<boolean>(true);
  const [scopeImmunityOverride, setScopeImmunityOverride] = useState<boolean>(true);

  const passkeyService = PasskeyEmergencyService.getInstance();
  const passkeyProvider = PasskeyAuthProvider.getInstance();

  useEffect(() => {
    // Query hardware availability
    passkeyProvider.isPasskeyHardwareAvailable().then((res) => {
      setHwInfo({ available: res.available, securityLevel: res.securityLevel });
    });

    // Refresh active session countdown
    const interval = setInterval(() => {
      const sess = passkeyService.getActiveSession();
      setActiveSession(sess);
      if (sess && sess.active) {
        const remaining = Math.max(0, Math.floor((sess.expiresAt - Date.now()) / 1000));
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAuthenticatePasskey = async () => {
    setIsLoading(true);
    const scopes: string[] = [];
    if (scopeConsentBypass) scopes.push('BYPASS_TWO_PARTY_CONSENT');
    if (scopeForceUsb) scopes.push('FORCE_USB_EXECUTION');
    if (scopeImmunityOverride) scopes.push('ELEVATED_PASSKEY_IMMUNITY_OVERRIDE');

    try {
      const session = await passkeyService.activatePasskeyElevatedSession(adminId, scopes);
      setActiveSession(session);
      Alert.alert(
        '🔑 Passkey Session Activated',
        `Authenticated via StrongBox Passkey.\nScopes: ${session.grantedScopes.join(', ')}\n\nLedger Hash: ${session.ledgerBlockHash.substring(0, 16)}...`,
        [{ text: 'Acknowledge' }]
      );
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Passkey authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = () => {
    passkeyService.revokeSession('MANUAL_TERMINATION');
    setActiveSession(null);
    Alert.alert('Session Terminated', 'Passkey elevated scopes revoked. Baseline ledger enforcement restored.');
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>🔑 Passkey Break-Glass Override</Text>
        <Text style={styles.headerSubtitle}>
          Authenticate using your physical host phone credential (Fingerprint / Face Unlock / Passkey) to grant elevated scopes.
        </Text>
      </View>

      {/* Hardware Status Badge */}
      <View style={styles.statusBadge}>
        <Text style={styles.badgeLabel}>Hardware Keystore:</Text>
        <Text style={styles.badgeValue}>
          {hwInfo ? `✅ ${hwInfo.securityLevel} (Passkey Ready)` : 'Querying Hardware...'}
        </Text>
      </View>

      {/* Active Session Display */}
      {activeSession && activeSession.active ? (
        <View style={styles.activeSessionCard}>
          <View style={styles.activeHeader}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.activeSessionTitle}>ELEVATED PASSKEY SESSION ACTIVE</Text>
          </View>

          <Text style={styles.timerText}>{formatCountdown(timeRemaining)}</Text>
          <Text style={styles.sessionMetaText}>
            Operator: <Text style={styles.bold}>{activeSession.adminId}</Text>
          </Text>
          <Text style={styles.sessionMetaText}>
            Security: <Text style={styles.bold}>{activeSession.hardwareSecurityLevel} ({activeSession.biometricType})</Text>
          </Text>
          <Text style={styles.sessionMetaText}>
            Active Scopes: <Text style={styles.bold}>{activeSession.grantedScopes.join(', ')}</Text>
          </Text>

          <View style={styles.hashBox}>
            <Text style={styles.hashLabel}>Immutable Ledger Block SHA-256:</Text>
            <Text style={styles.hashCode}>{activeSession.ledgerBlockHash}</Text>
          </View>

          <TouchableOpacity style={styles.revokeButton} onPress={handleTerminateSession}>
            <Text style={styles.revokeButtonText}>🛑 Terminate Elevated Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Passkey Authentication Setup */
        <View style={styles.setupCard}>
          <Text style={styles.sectionTitle}>Select Elevated Emergency Scopes:</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Bypass Two-Party Consent</Text>
            <Switch value={scopeConsentBypass} onValueChange={setScopeConsentBypass} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Force USB OTG Execution</Text>
            <Switch value={scopeForceUsb} onValueChange={setScopeForceUsb} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Elevated Passkey Scope Override</Text>
            <Switch value={scopeImmunityOverride} onValueChange={setScopeImmunityOverride} />
          </View>

          <TouchableOpacity
            style={styles.passkeyButton}
            onPress={handleAuthenticatePasskey}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.passkeyButtonText}>🔑 Authenticate with Device Passkey</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117', padding: 16 },
  headerCard: { padding: 16, backgroundColor: '#161B22', borderRadius: 12, marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#58A6FF', marginBottom: 6 },
  headerSubtitle: { fontSize: 13, color: '#8B949E', lineHeight: 18 },
  statusBadge: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#21262D', borderRadius: 8, marginBottom: 16 },
  badgeLabel: { color: '#8B949E', fontSize: 13 },
  badgeValue: { color: '#3FB950', fontSize: 13, fontWeight: 'bold' },
  setupCard: { padding: 16, backgroundColor: '#161B22', borderRadius: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#F0F6FC', marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  switchLabel: { color: '#C9D1D9', fontSize: 14 },
  passkeyButton: { backgroundColor: '#238636', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  passkeyButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  activeSessionCard: { padding: 16, backgroundColor: '#161B22', borderRadius: 12, borderWidth: 1, borderColor: '#238636' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  greenPulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3FB950', marginRight: 8 },
  activeSessionTitle: { color: '#3FB950', fontWeight: 'bold', fontSize: 14 },
  timerText: { fontSize: 36, fontWeight: 'bold', color: '#F0F6FC', textAlign: 'center', marginVertical: 12 },
  sessionMetaText: { color: '#8B949E', fontSize: 13, marginBottom: 4 },
  bold: { color: '#F0F6FC', fontWeight: 'bold' },
  hashBox: { marginTop: 12, padding: 10, backgroundColor: '#0D1117', borderRadius: 6 },
  hashLabel: { color: '#8B949E', fontSize: 11 },
  hashCode: { color: '#58A6FF', fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  revokeButton: { backgroundColor: '#DA3633', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  revokeButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
