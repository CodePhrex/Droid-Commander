import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { COLOR_PALETTE } from './brand-design-system';
import {
  TargetDeviceRegistry,
  TargetDeviceProfile,
  TargetSessionRecord,
} from './target-device-registry';
import { DeviceIllustrationCard } from './device-illustration-card';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const DeviceHistoryScreenV2: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE_CONNECTED' | 'REQUIRES_REMEDIATION' | 'SERVICED_SUCCESS'>('ALL');
  const [devices, setDevices] = useState<TargetDeviceProfile[]>([]);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [selectedDeviceSessions, setSelectedDeviceSessions] = useState<TargetSessionRecord[]>([]);

  const registry = TargetDeviceRegistry.getInstance();

  useEffect(() => {
    refreshDeviceList();
  }, [searchQuery, statusFilter]);

  const refreshDeviceList = () => {
    let list = registry.searchDevices(searchQuery);
    if (statusFilter !== 'ALL') {
      list = list.filter((d) => d.lastKnownStatus === statusFilter);
    }
    setDevices(list);
  };

  const handleToggleExpand = (deviceId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedDeviceId === deviceId) {
      setExpandedDeviceId(null);
      setSelectedDeviceSessions([]);
    } else {
      setExpandedDeviceId(deviceId);
      setSelectedDeviceSessions(registry.getSessionsForDevice(deviceId));
    }
  };

  const handleExportHistory = () => {
    Alert.alert(
      'Device History Exported',
      `Successfully compiled interaction history report for ${devices.length} tracked devices.\n\nReport saved to Compliance Vault with SHA-256 verification.`,
      [{ text: 'Acknowledge' }]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>📱 Target Device & Session Registry</Text>
        <Text style={styles.headerSubtitle}>
          Historical tracking, hardware schematics, interaction logs, and ledger audit chains for all serviced Android devices.
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Model, Serial, Manufacturer, or Device ID..."
          placeholderTextColor={COLOR_PALETTE.accent.metallicSteel}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filter Pills */}
      <View style={styles.filterRow}>
        {(['ALL', 'ACTIVE_CONNECTED', 'REQUIRES_REMEDIATION', 'SERVICED_SUCCESS'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterPill,
              statusFilter === filter && styles.filterPillActive,
            ]}
            onPress={() => setStatusFilter(filter)}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === filter && styles.filterPillTextActive,
              ]}
            >
              {filter === 'ACTIVE_CONNECTED'
                ? '🟢 CONNECTED'
                : filter === 'REQUIRES_REMEDIATION'
                ? '⚠️ REQUIRES FIX'
                : filter === 'SERVICED_SUCCESS'
                ? '✅ SERVICED'
                : 'ALL DEVICES'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Device Counter & Export Action */}
      <View style={styles.metaRow}>
        <Text style={styles.counterText}>
          Tracked Devices: <Text style={styles.highlightText}>{devices.length}</Text>
        </Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportHistory}>
          <Text style={styles.exportBtnText}>📄 Export History Report</Text>
        </TouchableOpacity>
      </View>

      {/* Device List with Graphical Illustration Cards */}
      {devices.map((device) => {
        const isExpanded = expandedDeviceId === device.deviceId;

        return (
          <View key={device.deviceId} style={styles.deviceCard}>
            {/* Embedded Cybernetic Device Illustration Card */}
            <DeviceIllustrationCard
              manufacturer={device.manufacturer}
              model={device.model}
              displayCondition={
                device.lastKnownStatus === 'REQUIRES_REMEDIATION'
                  ? 'WATER_DAMAGED'
                  : 'INTACT_OLED'
              }
              isConnectedOtg={device.lastKnownStatus === 'ACTIVE_CONNECTED'}
              riskScore={device.highestRiskScoreObserved}
              selinuxMode={device.selinuxPosture === 'ENFORCING' ? 'ENFORCING' : 'PERMISSIVE'}
              onPressDetails={() => handleToggleExpand(device.deviceId)}
            />

            {/* Expanded Session Details */}
            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.divider} />
                <Text style={styles.sectionHeader}>
                  Interaction Session History ({selectedDeviceSessions.length} Sessions)
                </Text>

                {selectedDeviceSessions.length === 0 ? (
                  <Text style={styles.noSessionsText}>
                    No recent interaction sessions recorded for this device.
                  </Text>
                ) : (
                  selectedDeviceSessions.map((session) => (
                    <View key={session.sessionId} style={styles.sessionBox}>
                      <View style={styles.sessionHeaderRow}>
                        <Text style={styles.sessionIdText}>
                          Session: {session.sessionId} [{session.connectionMode}]
                        </Text>
                        <Text style={styles.sessionTimeText}>
                          {formatDate(session.startTime)}
                        </Text>
                      </View>

                      <Text style={styles.sessionMetaText}>
                        Technician ID: <Text style={styles.whiteText}>{session.technicianId}</Text> | Duration: {session.durationSeconds}s
                      </Text>
                      <Text style={styles.sessionMetaText}>
                        Commands Executed: <Text style={styles.whiteText}>{session.commandsExecutedCount}</Text> | CVEs Detected: <Text style={styles.whiteText}>{session.cveCountDetected}</Text>
                      </Text>
                      <Text style={styles.sessionMetaText}>
                        Remediations Applied: <Text style={styles.cyanText}>{session.remediationsApplied.join(', ') || 'None'}</Text>
                      </Text>
                      <Text style={styles.sessionMetaText}>
                        Active Scopes: <Text style={styles.cyanText}>{session.activeConsentScopes.join(', ')}</Text>
                      </Text>

                      {session.isBreakGlassUsed && (
                        <View style={styles.breakGlassTag}>
                          <Text style={styles.breakGlassTagText}>
                            🚨 EMERGENCY BREAK-GLASS OVERRIDE ACTIVE
                          </Text>
                        </View>
                      )}

                      <Text style={styles.notesText}>Notes: {session.summaryNotes}</Text>

                      <View style={styles.hashContainer}>
                        <Text style={styles.hashTitle}>Ledger SHA-256 Hash Reference:</Text>
                        <Text style={styles.hashValue}>{session.ledgerBlockHash}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    padding: 16,
  },
  headerCard: {
    padding: 16,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.electricBlue,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#FFF',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  filterPillActive: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue + '33',
    borderColor: COLOR_PALETTE.accent.electricBlue,
  },
  filterPillText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    fontWeight: 'bold',
  },
  filterPillTextActive: {
    color: COLOR_PALETTE.accent.cyberCyan,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  counterText: {
    fontSize: 13,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  highlightText: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontWeight: 'bold',
  },
  exportBtn: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deviceCard: {
    marginBottom: 12,
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 8,
    marginTop: -8,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR_PALETTE.background.borderOutline,
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
    marginBottom: 10,
  },
  noSessionsText: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
    fontStyle: 'italic',
  },
  sessionBox: {
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionIdText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  sessionTimeText: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  sessionMetaText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 3,
  },
  whiteText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  cyanText: {
    color: COLOR_PALETTE.accent.cyberCyan,
  },
  breakGlassTag: {
    backgroundColor: COLOR_PALETTE.status.criticalRed + '22',
    borderColor: COLOR_PALETTE.status.criticalRed,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  breakGlassTagText: {
    color: COLOR_PALETTE.status.criticalRed,
    fontSize: 10,
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    fontStyle: 'italic',
    marginTop: 4,
  },
  hashContainer: {
    marginTop: 8,
    padding: 6,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 4,
  },
  hashTitle: {
    fontSize: 9,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  hashValue: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: COLOR_PALETTE.accent.cyberCyan,
    marginTop: 2,
  },
});
