import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Alert,
  FlatList,
} from 'react-native';
import { COLOR_PALETTE, BRAND_IDENTITY } from './brand-design-system';
import { BrandHeaderBanner } from './brand-header-banner';
import { OperationModeManager } from './operation-mode-manager';

export interface PreloadedCommand {
  id: string;
  category: 'DIAGNOSTIC' | 'SECURITY' | 'POWER' | 'PACKAGES';
  label: string;
  command: string;
  description: string;
  requiresElevated?: boolean;
}

export interface TerminalEntry {
  id: string;
  timestamp: string;
  type: 'INPUT' | 'STDOUT' | 'STDERR' | 'SYSTEM_NOTICE' | 'WARNING';
  content: string;
}

export interface NotificationEvent {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  title: string;
  message: string;
  read: boolean;
}

const PRELOADED_COMMANDS: PreloadedCommand[] = [
  {
    id: 'cmd-1',
    category: 'SECURITY',
    label: 'AVB Boot State',
    command: 'getprop ro.boot.verifiedbootstate',
    description: 'Queries Android Verified Boot state (green/yellow/orange/red)',
  },
  {
    id: 'cmd-2',
    category: 'DIAGNOSTIC',
    label: 'Build Fingerprint',
    command: 'getprop ro.build.fingerprint',
    description: 'Retrieves OS build ID and patch level info',
  },
  {
    id: 'cmd-3',
    category: 'SECURITY',
    label: 'SELinux Mode',
    command: 'getenforce',
    description: 'Checks if SELinux is Enforcing, Permissive, or Disabled',
  },
  {
    id: 'cmd-4',
    category: 'POWER',
    label: 'Battery Telemetry',
    command: 'dumpsys battery',
    description: 'Polls BMS voltage, temperature, and charging status',
  },
  {
    id: 'cmd-5',
    category: 'PACKAGES',
    label: 'Third-Party Apps',
    command: 'pm list packages -3',
    description: 'Lists user-installed app package identifiers',
  },
  {
    id: 'cmd-6',
    category: 'SECURITY',
    label: 'User CA Certs',
    command: 'ls -la /data/misc/user_0/cacerts-added',
    description: 'Inspects user-installed root CAs in trust store',
    requiresElevated: true,
  },
  {
    id: 'cmd-7',
    category: 'DIAGNOSTIC',
    label: 'USB Config State',
    command: 'getprop sys.usb.config',
    description: 'Queries active USB OTG function modes',
  },
  {
    id: 'cmd-8',
    category: 'DIAGNOSTIC',
    label: 'Error Logcat',
    command: 'logcat -d -t 30 *:E',
    description: 'Fetches recent system error logs from buffer',
  },
];

export const AdbShellScreen: React.FC = () => {
  const modeManager = OperationModeManager.getInstance();
  const activeMode = modeManager.getActiveMode();

  const [inputCommand, setInputCommand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM_NOTICE',
      content: `[SYSTEM] Droid Commander Host ADB Shell Daemon (${BRAND_IDENTITY.version}) Initialized.`,
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM_NOTICE',
      content: `[TRANSPORT] Connected to target over ${activeMode === 'LOCAL_HOST_SELF' ? 'Local Host OS (Self)' : 'USB OTG Command Bridge (VID:0x04e8 PID:0x6860)'}.`,
    },
    {
      id: 'init-3',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYSTEM_NOTICE',
      content: 'Type a command or select a preloaded diagnostic macro below to execute.',
    },
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationEvent[]>([
    {
      id: 'notif-1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'SUCCESS',
      title: 'ADB OTG Bridge Connected',
      message: 'Fail-closed two-party consent session established.',
      read: false,
    },
    {
      id: 'notif-2',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      title: 'Ledger Audit Active',
      message: 'All shell executions bound to SHA-256 Privileged Action Ledger.',
      read: false,
    },
  ]);

  const [showNotificationPanel, setShowNotificationPanel] = useState<boolean>(true);

  // Animations
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const pulseGlow = useRef(new Animated.Value(0.3)).current;
  const notifSlide = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Pulsing Terminal Cursor
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse Glow for Active Connection Badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseGlow, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseGlow, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [cursorOpacity, pulseGlow]);

  const toggleNotificationPanel = () => {
    Animated.timing(notifSlide, {
      toValue: showNotificationPanel ? 1 : 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
    setShowNotificationPanel(!showNotificationPanel);
  };

  const handleExecuteCommand = (cmdToRun?: string) => {
    const targetCmd = cmdToRun || inputCommand;
    if (!targetCmd.trim() || isExecuting) return;

    setIsExecuting(true);
    const timeStr = new Date().toLocaleTimeString();

    // Append Command Entry
    const userEntry: TerminalEntry = {
      id: `cmd-${Date.now()}`,
      timestamp: timeStr,
      type: 'INPUT',
      content: `$ adb shell ${targetCmd}`,
    };

    setTerminalLogs((prev) => [...prev, userEntry]);
    setInputCommand('');

    // Simulate Execution Latency & Standard Output
    setTimeout(() => {
      let outputContent = '';
      let isError = false;

      // Command Output Simulation Engine
      if (targetCmd.includes('verifiedbootstate')) {
        outputContent = activeMode === 'LOCAL_HOST_SELF' ? 'green' : 'orange';
      } else if (targetCmd.includes('fingerprint')) {
        outputContent =
          activeMode === 'LOCAL_HOST_SELF'
            ? 'google/cheetah/cheetah:14/UP1A.231105.003/11010452:user/release-keys'
            : 'samsung/dm1qxxx/dm1q:14/UP1A.231005.007/S911BXXU3BWJM:user/release-keys';
      } else if (targetCmd.includes('getenforce')) {
        outputContent = 'Enforcing';
      } else if (targetCmd.includes('battery')) {
        outputContent = `Current Battery Service state:\n  AC powered: false\n  USB powered: true\n  Wireless powered: false\n  status: 2 (Charging)\n  health: 2 (Good)\n  present: true\n  level: 88\n  voltage: 4210 mV\n  temperature: 312 (31.2°C)\n  technology: Li-ion`;
      } else if (targetCmd.includes('packages -3')) {
        outputContent = `package:com.codephrex.droidcommander\npackage:org.thoughtcrime.securesms\npackage:com.termux\npackage:io.github.mousetrap`;
      } else if (targetCmd.includes('cacerts-added')) {
        outputContent = activeMode === 'LOCAL_HOST_SELF'
          ? 'total 0 (No user CA certificates installed)'
          : '-rw-r--r-- 1 root root 1420 Oct 21 14:02 9a5ba575.0 (Burp Suite Interception Proxy Root)';
      } else if (targetCmd.includes('sys.usb.config')) {
        outputContent = 'adb,accessory';
      } else if (targetCmd.includes('logcat')) {
        outputContent = `10-23 02:14:02.112 E/DroidCommanderUsb( 4120): OTG wire packet checksum verified [0x9F]\n10-23 02:14:05.882 E/KeymasterTEE(  820): StrongBox hardware attestation verified for operator TECH_LEAD_01`;
      } else {
        outputContent = `[stdout] Command executed successfully: '${targetCmd}'\n[return code]: 0 (0x00)`;
      }

      const stdoutEntry: TerminalEntry = {
        id: `out-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: isError ? 'STDERR' : 'STDOUT',
        content: outputContent,
      };

      setTerminalLogs((prev) => [...prev, stdoutEntry]);
      setIsExecuting(false);

      // Trigger Event Notification
      const newNotif: NotificationEvent = {
        id: `event-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: isError ? 'ALERT' : 'INFO',
        title: `Executed: adb shell ${targetCmd.slice(0, 20)}...`,
        message: `Command completed with return code 0. Action logged to Privileged Action Ledger.`,
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // Scroll terminal to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 600);
  };

  const clearTerminal = () => {
    setTerminalLogs([
      {
        id: `clear-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'SYSTEM_NOTICE',
        content: '[SYSTEM] Terminal screen cleared. Session state preserved.',
      },
    ]);
  };

  const filteredCommands =
    selectedCategory === 'ALL'
      ? PRELOADED_COMMANDS
      : PRELOADED_COMMANDS.filter((cmd) => cmd.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <BrandHeaderBanner
        activeMode={activeMode}
        onOpenSettings={() => Alert.alert('Settings', 'Host ADB Daemon Configuration')}
      />

      {/* Target Status Bar */}
      <View style={styles.targetStatusBar}>
        <View style={styles.targetInfoCol}>
          <Text style={styles.targetLabel}>TARGET OTG SESSION</Text>
          <Text style={styles.targetValue}>
            {activeMode === 'LOCAL_HOST_SELF' ? '📱 LOCAL HOST (Pixel 8 Pro)' : '🔌 REMOTE TARGET (Galaxy S23)'}
          </Text>
        </View>
        <Animated.View style={[styles.statusBadge, { opacity: pulseGlow }]}>
          <View style={styles.greenDot} />
          <Text style={styles.statusBadgeText}>ADB WIRE ACTIVE</Text>
        </Animated.View>
      </View>

      {/* Notification / Event Relay Bar */}
      <View style={styles.notificationHeader}>
        <TouchableOpacity
          style={styles.notificationToggleBtn}
          onPress={toggleNotificationPanel}
          activeOpacity={0.8}
        >
          <Text style={styles.notificationToggleTitle}>
            🔔 EVENT NOTIFICATION RELAY ({notifications.length})
          </Text>
          <Text style={styles.notificationToggleIcon}>
            {showNotificationPanel ? '▲ HIDE' : '▼ SHOW'}
          </Text>
        </TouchableOpacity>

        {showNotificationPanel && (
          <ScrollView style={styles.notificationScroll} nestedScrollEnabled>
            {notifications.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.notifCard,
                  item.level === 'ALERT'
                    ? styles.notifAlert
                    : item.level === 'SUCCESS'
                    ? styles.notifSuccess
                    : styles.notifInfo,
                ]}
              >
                <View style={styles.notifHeaderRow}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifTime}>{item.timestamp}</Text>
                </View>
                <Text style={styles.notifMessage}>{item.message}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Preloaded Command Categories */}
      <View style={styles.macroHeaderRow}>
        <Text style={styles.macroSectionTitle}>⚡ PRELOADED ADB MACROS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPills}>
          {['ALL', 'DIAGNOSTIC', 'SECURITY', 'POWER', 'PACKAGES'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Preloaded Command Pills */}
      <View style={styles.macroContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filteredCommands.map((cmd) => (
            <TouchableOpacity
              key={cmd.id}
              style={styles.macroButton}
              onPress={() => {
                setInputCommand(cmd.command);
                handleExecuteCommand(cmd.command);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.macroTopRow}>
                <Text style={styles.macroBadge}>{cmd.category}</Text>
                {cmd.requiresElevated && <Text style={styles.elevatedBadge}>ROOT/TEE</Text>}
              </View>
              <Text style={styles.macroLabel}>{cmd.label}</Text>
              <Text style={styles.macroCommand}>adb shell {cmd.command}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Terminal Output Display */}
      <View style={styles.terminalContainer}>
        <View style={styles.terminalHeader}>
          <Text style={styles.terminalHeaderTitle}>🖥️ HOST TERMINAL OUTPUT ($ adb shell)</Text>
          <TouchableOpacity onPress={clearTerminal} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>CLEAR</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.terminalScroll}
          contentContainerStyle={styles.terminalContent}
        >
          {terminalLogs.map((log) => (
            <View key={log.id} style={styles.terminalLineRow}>
              {log.type === 'INPUT' ? (
                <Text style={styles.termInputText}>
                  <Text style={styles.promptSymbol}>$ </Text>
                  {log.content}
                </Text>
              ) : log.type === 'SYSTEM_NOTICE' ? (
                <Text style={styles.termNoticeText}>{log.content}</Text>
              ) : log.type === 'STDERR' ? (
                <Text style={styles.termErrorText}>{log.content}</Text>
              ) : (
                <Text style={styles.termStdoutText}>{log.content}</Text>
              )}
            </View>
          ))}

          {/* Animated Cursor */}
          <View style={styles.cursorRow}>
            <Text style={styles.promptSymbol}>$ </Text>
            <Animated.Text style={[styles.cursorText, { opacity: cursorOpacity }]}>
              ▋
            </Animated.Text>
          </View>
        </ScrollView>
      </View>

      {/* Interactive Command Input Bar */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputPromptPrefix}>$ adb shell</Text>
        <TextInput
          style={styles.textInput}
          value={inputCommand}
          onChangeText={setInputCommand}
          placeholder="enter adb command..."
          placeholderTextColor={COLOR_PALETTE.accent.metallicSteel}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => handleExecuteCommand()}
        />
        <TouchableOpacity
          style={[styles.executeBtn, isExecuting && styles.executeBtnDisabled]}
          onPress={() => handleExecuteCommand()}
          disabled={isExecuting}
        >
          <Text style={styles.executeBtnText}>{isExecuting ? '...' : 'RUN'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
  },
  targetStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_PALETTE.background.borderOutline,
  },
  targetInfoCol: {
    flex: 1,
  },
  targetLabel: {
    color: COLOR_PALETTE.accent.metallicSteel,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetValue: {
    color: COLOR_PALETTE.accent.chromeSilver,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(63, 185, 80, 0.15)',
    borderColor: COLOR_PALETTE.status.lockedGreen,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLOR_PALETTE.status.lockedGreen,
    marginRight: 6,
  },
  statusBadgeText: {
    color: COLOR_PALETTE.status.lockedGreen,
    fontSize: 10,
    fontWeight: '800',
  },
  notificationHeader: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_PALETTE.background.borderOutline,
  },
  notificationToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLOR_PALETTE.background.elevatedSurface,
  },
  notificationToggleTitle: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  notificationToggleIcon: {
    color: COLOR_PALETTE.accent.metallicSteel,
    fontSize: 10,
    fontWeight: '700',
  },
  notificationScroll: {
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  notifCard: {
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  notifSuccess: {
    backgroundColor: '#111C15',
    borderLeftColor: COLOR_PALETTE.status.lockedGreen,
  },
  notifAlert: {
    backgroundColor: '#251214',
    borderLeftColor: COLOR_PALETTE.status.criticalRed,
  },
  notifInfo: {
    backgroundColor: '#121A24',
    borderLeftColor: COLOR_PALETTE.accent.cyberCyan,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notifTitle: {
    color: COLOR_PALETTE.accent.chromeSilver,
    fontSize: 11,
    fontWeight: '700',
  },
  notifTime: {
    color: COLOR_PALETTE.accent.metallicSteel,
    fontSize: 9,
  },
  notifMessage: {
    color: '#C9D1D9',
    fontSize: 10,
    marginTop: 2,
  },
  macroHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  macroSectionTitle: {
    color: COLOR_PALETTE.accent.chromeSilver,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  categoryPills: {
    marginTop: 6,
    flexDirection: 'row',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginRight: 6,
  },
  categoryPillActive: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    borderColor: COLOR_PALETTE.accent.cyberCyan,
  },
  categoryPillText: {
    color: COLOR_PALETTE.accent.metallicSteel,
    fontSize: 10,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  macroContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  macroButton: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderColor: COLOR_PALETTE.background.borderOutline,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    width: 170,
  },
  macroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroBadge: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontSize: 9,
    fontWeight: '800',
  },
  elevatedBadge: {
    color: COLOR_PALETTE.status.warningYellow,
    fontSize: 8,
    fontWeight: '800',
  },
  macroLabel: {
    color: COLOR_PALETTE.accent.chromeSilver,
    fontSize: 12,
    fontWeight: '700',
  },
  macroCommand: {
    color: COLOR_PALETTE.accent.metallicSteel,
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#05080C',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLOR_PALETTE.background.borderOutline,
  },
  terminalHeaderTitle: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  clearBtn: {
    backgroundColor: COLOR_PALETTE.background.elevatedSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clearBtnText: {
    color: COLOR_PALETTE.accent.metallicSteel,
    fontSize: 9,
    fontWeight: '700',
  },
  terminalScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  terminalContent: {
    paddingBottom: 20,
  },
  terminalLineRow: {
    marginBottom: 4,
  },
  promptSymbol: {
    color: COLOR_PALETTE.status.lockedGreen,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  termInputText: {
    color: COLOR_PALETTE.accent.chromeSilver,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  termStdoutText: {
    color: '#88C0D0',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  termNoticeText: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  termErrorText: {
    color: COLOR_PALETTE.status.criticalRed,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  cursorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cursorText: {
    color: COLOR_PALETTE.status.lockedGreen,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLOR_PALETTE.background.borderOutline,
  },
  inputPromptPrefix: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: COLOR_PALETTE.accent.chromeSilver,
    fontSize: 12,
    fontFamily: 'monospace',
    paddingVertical: 4,
  },
  executeBtn: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  executeBtnDisabled: {
    backgroundColor: COLOR_PALETTE.background.borderOutline,
  },
  executeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
