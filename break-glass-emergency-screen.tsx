import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  BreakGlassAuthService,
  BreakGlassToken,
  ActiveEmergencySession,
} from './break-glass-auth-service';

/**
 * BreakGlassEmergencyScreen
 * 
 * Superuser Emergency Break-Glass Override Dashboard for Droid Commander.
 * Allows authorized administrators to inspect, verify, and activate time-bounded
 * emergency override tokens with fail-closed audit logging to the Privileged Action Ledger.
 */
export const BreakGlassEmergencyScreen: React.FC = () => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [parsedToken, setParsedToken] = useState<BreakGlassToken | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveEmergencySession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const authService = BreakGlassAuthService.getInstance();

  // Periodically refresh active session and countdown timer
  const refreshSessionState = useCallback(() => {
    const session = authService.getActiveSession();
    setActiveSession(session);

    if (session && session.active) {
      const remainingSec = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setTimeRemaining(remainingSec);
    } else {
      setTimeRemaining(0);
    }
  }, [authService]);

  useEffect(() => {
    refreshSessionState();
    const interval = setInterval(refreshSessionState, 1000);
    return () => clearInterval(interval);
  }, [refreshSessionState]);

  // Parse JSON or QR Code Payload
  const handleParseToken = (rawJson: string) => {
    setTokenInput(rawJson);
    if (!rawJson.trim()) {
      setParsedToken(null);
      return;
    }

    try {
      const json = JSON.parse(rawJson);
      if (!json.adminId || !json.requestedScopes || !json.signature || !json.nonce) {
        setParsedToken(null);
        return;
      }
      setParsedToken(json as BreakGlassToken);
    } catch {
      setParsedToken(null);
    }
  };

  // Trigger Emergency Activation
  const handleActivateBreakGlass = async () => {
    if (!parsedToken) return;
    setIsLoading(true);
    setShowConfirmModal(false);

    try {
      const success = await authService.activateEmergencyOverride(parsedToken);
      if (success) {
        Alert.alert(
          'Emergency Override Activated',
          `Break-glass session activated for Admin: ${parsedToken.adminId}. All operations will be strictly recorded in the Privileged Action Ledger.`,
          [{ text: 'Acknowledge' }]
        );
        setTokenInput('');
        setParsedToken(null);
        refreshSessionState();
      }
    } catch (error: any) {
      Alert.alert(
        'Activation Failed (Fail-Closed)',
        error.message || 'Verification error. Emergency override rejected.',
        [{ text: 'Dismiss' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Deactivation / Revocation
  const handleDeactivate = async () => {
    Alert.alert(
      'Deactivate Override',
      'Are you sure you want to revoke the active break-glass session and return to strict fail-closed enforcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Immediately',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            await authService.revokeActiveSession('USER_MANUAL_TERMINATION');
            refreshSessionState();
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Superuser Emergency Governance</Text>
      <Text style={styles.headerSubtitle}>
        Break-Glass Privilege Elevation & Bypass Console
      </Text>

      {/* ACTIVE EMERGENCY SESSION BANNER */}
      {activeSession && activeSession.active ? (
        <View style={styles.activeCard}>
          <View style={styles.statusHeader}>
            <View style={styles.activeBadge} />
            <Text style={styles.activeCardTitle}>EMERGENCY OVERRIDE ACTIVE</Text>
          </View>

          <Text style={styles.timerText}>{formatCountdown(timeRemaining)}</Text>
          <Text style={styles.timerSubtext}>Time remaining before automatic privilege revocation</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Superuser ID:</Text>
            <Text style={styles.infoValue}>{activeSession.adminId}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session Nonce:</Text>
            <Text style={styles.infoValueMonospace}>{activeSession.sessionNonce.substring(0, 16)}...</Text>
          </View>

          <Text style={styles.scopesTitle}>Active Emergency Scopes:</Text>
          <View style={styles.scopesContainer}>
            {Array.from(activeSession.scopes).map((scope) => (
              <View key={scope} style={styles.scopePillActive}>
                <Text style={styles.scopePillTextActive}>{scope}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.revokeButton}
            onPress={handleDeactivate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.revokeButtonText}>Revoke Break-Glass Session</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inactiveCard}>
          <Text style={styles.inactiveCardTitle}>System Normal (Fail-Closed)</Text>
          <Text style={styles.inactiveCardText}>
            All security gates, two-party consent checks, and USB hardware execution contracts are fully enforced.
          </Text>
        </View>
      )}

      {/* BREAK-GLASS TOKEN INGESTION SECTION */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Inject Emergency Break-Glass Token</Text>
        <Text style={styles.sectionDescription}>
          Paste a cryptographically signed superuser token JSON or scan an authorized admin QR payload.
        </Text>

        <TextInput
          style={styles.tokenInput}
          multiline
          numberOfLines={6}
          placeholder='{"adminId": "admin-01", "requestedScopes": ["BYPASS_TWO_PARTY_CONSENT"], ...}'
          placeholderTextColor="#6B7280"
          value={tokenInput}
          onChangeText={handleParseToken}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {parsedToken ? (
          <View style={styles.tokenPreview}>
            <Text style={styles.previewTitle}>Valid Token Structure Detected</Text>
            <Text style={styles.previewDetail}>Admin: {parsedToken.adminId}</Text>
            <Text style={styles.previewDetail}>
              Requested Scopes: {parsedToken.requestedScopes.join(', ')}
            </Text>
            <Text style={styles.previewDetail}>
              Expires In:{' '}
              {Math.max(0, Math.floor((parsedToken.expiresAt - Date.now()) / 1000))} seconds
            </Text>

            <TouchableOpacity
              style={styles.activateButton}
              onPress={() => setShowConfirmModal(true)}
            >
              <Text style={styles.activateButtonText}>Verify & Execute Override</Text>
            </TouchableOpacity>
          </View>
        ) : tokenInput.trim().length > 0 ? (
          <Text style={styles.errorText}>
            Invalid token format. Ensure JSON contains adminId, requestedScopes, timestamp, nonce, and signature.
          </Text>
        ) : null}
      </View>

      {/* CONFIRMATION SAFETY MODAL */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ HIGH RISK: EMERGENCY OVERRIDE</Text>
            <Text style={styles.modalBody}>
              You are about to activate superuser override privileges. This action will bypass standard operational safety controls.
            </Text>
            <Text style={styles.modalWarningText}>
              • This event is PERMANENTLY logged in the Privileged Action Ledger.
              {'\n'}• Session will automatically expire in 15 minutes.
              {'\n'}• Tampering or unauthorized activation constitutes a compliance breach.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalButton}
                onPress={handleActivateBreakGlass}
              >
                <Text style={styles.confirmModalText}>Confirm Activation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  activeCard: {
    backgroundColor: '#1E1B4B',
    borderColor: '#6366F1',
    borderWidth: 2,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  activeCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F43F5E',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginVertical: 4,
  },
  timerSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  infoValue: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 13,
  },
  infoValueMonospace: {
    color: '#38BDF8',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  scopesTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  scopesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  scopePillActive: {
    backgroundColor: '#312E81',
    borderColor: '#4F46E5',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scopePillTextActive: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  revokeButton: {
    backgroundColor: '#E11D48',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  revokeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inactiveCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inactiveCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  inactiveCardText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 14,
    lineHeight: 18,
  },
  tokenInput: {
    backgroundColor: '#0F172A',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    fontFamily: 'monospace',
    fontSize: 12,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  tokenPreview: {
    backgroundColor: '#0F2942',
    borderColor: '#0284C7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
  },
  previewTitle: {
    color: '#38BDF8',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 6,
  },
  previewDetail: {
    color: '#E0F2FE',
    fontSize: 12,
    marginBottom: 2,
  },
  activateButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: '#F43F5E',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderColor: '#E11D48',
    borderWidth: 2,
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F43F5E',
    marginBottom: 10,
  },
  modalBody: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  modalWarningText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 6,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelModalText: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  confirmModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E11D48',
  },
  confirmModalText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
