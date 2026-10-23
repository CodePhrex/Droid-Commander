import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  LayoutAnimation,
} from 'react-native';

interface CommandLog {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  type: 'stdout' | 'stderr' | 'sys';
}

/**
 * Host ADB Shell Screen v2 - Enhanced with Pulsing Cursor Animations,
 * Collapsible Status Relay Drawer, Macro Filters, and Interactive Input.
 */
export const AdbShellScreenV2: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(true);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([
    {
      id: '1',
      command: 'adb devices',
      output: 'List of devices attached\nDC-HW-SN-882194    device (USB OTG)',
      timestamp: '02:30:11',
      type: 'stdout',
    },
    {
      id: '2',
      command: 'getprop ro.boot.verifiedbootstate',
      output: 'orange',
      timestamp: '02:30:15',
      type: 'stdout',
    },
  ]);

  // Animated Values
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const drawerHeightAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing Terminal Cursor
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
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
  }, []);

  const handleExecuteCommand = (cmdToRun?: string) => {
    const targetCmd = cmdToRun || inputText;
    if (!targetCmd.trim()) return;

    const time = new Date().toLocaleTimeString();
    let sampleOut = `Executing: ${targetCmd}\nCommand finished with exit_code: 0`;

    if (targetCmd.includes('verifiedbootstate')) {
      sampleOut = 'orange\n[AVB 2.0 WARNING]: Bootloader is unlocked.';
    } else if (targetCmd.includes('dumpsys battery')) {
      sampleOut = 'Current Battery Service State:\n  AC powered: false\n  USB powered: true\n  level: 88%\n  voltage: 4120mV\n  temperature: 314 (31.4°C)';
    } else if (targetCmd.includes('getenforce')) {
      sampleOut = 'Enforcing';
    }

    const newLog: CommandLog = {
      id: Date.now().toString(),
      command: targetCmd,
      output: sampleOut,
      timestamp: time,
      type: 'stdout',
    };

    setCommandLogs((prev) => [...prev, newLog]);
    setInputText('');
  };

  const toggleNotificationDrawer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowNotificationDrawer(!showNotificationDrawer);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#05080C" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💻 HOST ADB SHELL</Text>
          <Text style={styles.headerSub}>TARGET: GALAXY S23 (USB OTG BULK_XFER)</Text>
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={() => setCommandLogs([])}>
          <Text style={styles.clearBtnText}>CLEAR</Text>
        </TouchableOpacity>
      </View>

      {/* Collapsible Notification & Status Relay Drawer */}
      <View style={styles.drawerCard}>
        <TouchableOpacity style={styles.drawerHeader} onPress={toggleNotificationDrawer}>
          <View style={styles.drawerHeaderLeft}>
            <View style={styles.greenPulse} />
            <Text style={styles.drawerTitle}>REAL-TIME USB STATUS RELAY</Text>
          </View>
          <Text style={styles.chevron}>{showNotificationDrawer ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showNotificationDrawer && (
          <View style={styles.drawerBody}>
            <Text style={styles.statusText}>• USB OTG Connection: ESTABLISHED (VID:0x04e8 PID:0x6860)</Text>
            <Text style={styles.statusText}>• ADB Protocol Handshake: OK (CNXN 01000000 maxdata 4096)</Text>
            <Text style={styles.statusTextAlert}>• Security Notice: AVB Orange state active on remote target.</Text>
          </View>
        )}
      </View>

      {/* Preloaded Diagnostic Macro Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.macroScroll}>
        <TouchableOpacity style={styles.macroPill} onPress={() => handleExecuteCommand('getprop ro.boot.verifiedbootstate')}>
          <Text style={styles.macroText}>🛡️ AVB State</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.macroPill} onPress={() => handleExecuteCommand('dumpsys battery')}>
          <Text style={styles.macroText}>⚡ Battery Telemetry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.macroPill} onPress={() => handleExecuteCommand('getenforce')}>
          <Text style={styles.macroText}>🔒 SELinux Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.macroPill} onPress={() => handleExecuteCommand('getprop ro.build.fingerprint')}>
          <Text style={styles.macroText}>📋 Build Fingerprint</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Terminal Output Window */}
      <ScrollView style={styles.terminalContainer} contentContainerStyle={styles.terminalContent}>
        {commandLogs.map((log) => (
          <View key={log.id} style={styles.logBlock}>
            <Text style={styles.promptLine}>
              <Text style={styles.promptSymbol}>shell@droid-commander:~$ </Text>
              <Text style={styles.commandText}>{log.command}</Text>
            </Text>
            <Text style={styles.outputText}>{log.output}</Text>
          </View>
        ))}

        {/* Live Active Prompt Row with Cursor */}
        <View style={styles.activePromptRow}>
          <Text style={styles.promptSymbol}>shell@droid-commander:~$ </Text>
          <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>▋</Animated.Text>
        </View>
      </ScrollView>

      {/* Command Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Enter shell command (e.g. pm list packages)..."
          placeholderTextColor="#484F58"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleExecuteCommand()}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => handleExecuteCommand()}>
          <Text style={styles.sendBtnText}>RUN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05080C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#0D1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
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
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#21262D',
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B949E',
  },
  drawerCard: {
    backgroundColor: '#0D1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3FB950',
    marginRight: 8,
  },
  drawerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#58A6FF',
    letterSpacing: 1,
  },
  chevron: {
    fontSize: 10,
    color: '#8B949E',
  },
  drawerBody: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#8B949E',
    marginBottom: 4,
  },
  statusTextAlert: {
    fontSize: 11,
    color: '#F0883E',
    fontWeight: '700',
  },
  macroScroll: {
    maxHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0A0E14',
  },
  macroPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    marginRight: 8,
  },
  macroText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#58A6FF',
  },
  terminalContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  terminalContent: {
    paddingBottom: 20,
  },
  logBlock: {
    marginBottom: 14,
  },
  promptLine: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  promptSymbol: {
    color: '#388BFD',
    fontWeight: '700',
  },
  commandText: {
    color: '#F0F6FC',
  },
  outputText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#8B949E',
    lineHeight: 18,
    paddingLeft: 12,
  },
  activePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cursor: {
    fontSize: 12,
    color: '#58A6FF',
    fontFamily: 'monospace',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0D1117',
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#161B22',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#F0F6FC',
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#30363D',
    marginRight: 10,
  },
  sendBtn: {
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: '#388BFD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F0F6FC',
  },
});
