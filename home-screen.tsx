import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';

// Interfaces for UI State
interface UsbDeviceStatus {
  connected: boolean;
  deviceName: string | null;
  vendorId: number | null;
  productId: number | null;
  state: 'DISCONNECTED' | 'HANDSHAKE' | 'READY' | 'FAIL_CLOSED_LOCKOUT';
}

interface ActiveLicense {
  technicianId: string;
  licensedScope: string[];
  expiresAt: number;
  isValid: boolean;
}

interface TelemetrySummary {
  lastAssessedAt: number | null;
  compositeRiskScore: number;
  detectedCvesCount: number;
  seLinuxEnforcing: boolean;
  bootloaderUnlocked: boolean;
}

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [usbStatus, setUsbStatus] = useState<UsbDeviceStatus>({
    connected: true,
    deviceName: 'Pixel 8 Pro (USB OTG)',
    vendorId: 0x18d1,
    productId: 0x4ee1,
    state: 'READY',
  });

  const [activeLicense, setActiveLicense] = useState<ActiveLicense>({
    technicianId: 'TECH-8842-SEC',
    licensedScope: ['READ_DIAGNOSTICS', 'EXECUTE_ASSESSMENT', 'APPLY_REMEDIATION'],
    expiresAt: Date.now() + 8 * 3600 * 1000, // 8 hours remaining
    isValid: true,
  });

  const [telemetry, setTelemetry] = useState<TelemetrySummary>({
    lastAssessedAt: Date.now() - 15 * 60 * 1000,
    compositeRiskScore: 3.4,
    detectedCvesCount: 2,
    seLinuxEnforcing: true,
    bootloaderUnlocked: false,
  });

  const [isBreakGlassActive, setIsBreakGlassActive] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate telemetry and status refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'Never';
    const mins = Math.floor((Date.now() - ts) / 60000);
    return mins === 0 ? 'Just now' : `${mins} min ago`;
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 7.0) return 'bg-red-900/80 text-red-200 border-red-700';
    if (score >= 4.0) return 'bg-amber-900/80 text-amber-200 border-amber-700';
    return 'bg-emerald-900/80 text-emerald-200 border-emerald-700';
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950 text-slate-100">
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38bdf8" />
        }
      >
        {/* Header Title */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-slate-50 tracking-wider">
              DROID COMMANDER
            </Text>
            <Text className="text-xs text-slate-400">
              Security Operations & Diagnostic Control
            </Text>
          </View>
          <View className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
            <Text className="text-xs font-mono text-cyan-400">v2.4.0-OFFLINE</Text>
          </View>
        </View>

        {/* Emergency Break-Glass Alert Banner (if active) */}
        {isBreakGlassActive && (
          <View className="mb-4 p-4 rounded-xl bg-red-950/90 border border-red-600 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-red-200 font-bold text-sm uppercase tracking-wide">
                ⚠️ Superuser Emergency Override Active
              </Text>
              <Text className="text-red-300 text-xs mt-0.5">
                Privileged Action Ledger active logging enforced.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('BreakGlassEmergency')}
              className="bg-red-600 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white text-xs font-bold">Manage</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section 1: USB Hardware OTG Channel */}
        <View className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider">
              USB Hardware Session Channel
            </Text>
            <View
              className={`px-2 py-0.5 rounded-full border ${
                usbStatus.state === 'READY'
                  ? 'bg-emerald-950 border-emerald-500/50'
                  : usbStatus.state === 'FAIL_CLOSED_LOCKOUT'
                  ? 'bg-red-950 border-red-500/50'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase ${
                  usbStatus.state === 'READY'
                    ? 'text-emerald-400'
                    : usbStatus.state === 'FAIL_CLOSED_LOCKOUT'
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {usbStatus.state}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3">
            <View>
              <Text className="text-slate-200 font-semibold text-sm">
                {usbStatus.deviceName || 'No USB OTG Device Connected'}
              </Text>
              <Text className="text-slate-400 text-xs font-mono mt-0.5">
                {usbStatus.vendorId
                  ? `VID: 0x${usbStatus.vendorId.toString(16)} | PID: 0x${usbStatus.productId?.toString(16)}`
                  : 'Awaiting Hardware Handshake'}
              </Text>
            </View>
            <View
              className={`w-3 h-3 rounded-full ${
                usbStatus.connected ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => Alert.alert('USB OTG', 'Initiating hardware packet handshake...')}
              className="flex-1 bg-cyan-600 active:bg-cyan-700 py-2.5 rounded-xl items-center"
            >
              <Text className="text-white font-semibold text-xs">Sync Hardware Session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('UsbDiagnostics')}
              className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 items-center justify-center"
            >
              <Text className="text-slate-300 font-semibold text-xs">Diagnostics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: Active Authorization & Scope */}
        <View className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider">
              Authorization & Two-Party Scope
            </Text>
            <Text className="text-cyan-400 text-xs font-mono">
              ID: {activeLicense.technicianId}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {activeLicense.licensedScope.map((scope) => (
              <View
                key={scope}
                className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800"
              >
                <Text className="text-slate-300 font-mono text-[11px]">{scope}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <Text className="text-slate-400 text-xs">Two-Party Consent Gate:</Text>
            <Text className="text-emerald-400 text-xs font-semibold">VERIFIED & SIGNED</Text>
          </View>
        </View>

        {/* Section 3: Telemetry & Vulnerability Summary */}
        <View className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 mb-6 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-slate-300 text-xs font-bold uppercase tracking-wider">
              Host Security Assessment
            </Text>
            <Text className="text-slate-500 text-xs">
              {formatTimestamp(telemetry.lastAssessedAt)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-slate-400 text-xs mb-1">Composite Risk Rating</Text>
              <View className="flex-row items-baseline gap-2">
                <Text className="text-2xl font-bold text-slate-100">
                  {telemetry.compositeRiskScore.toFixed(1)}
                </Text>
                <Text className="text-slate-500 text-xs">/ 10.0</Text>
              </View>
            </View>

            <View className={`px-3 py-1.5 rounded-xl border ${getRiskBadgeColor(telemetry.compositeRiskScore)}`}>
              <Text className="text-xs font-bold uppercase tracking-wide">
                {telemetry.compositeRiskScore >= 7.0
                  ? 'CRITICAL'
                  : telemetry.compositeRiskScore >= 4.0
                  ? 'MODERATE'
                  : 'LOW RISK'}
              </Text>
            </View>
          </View>

          <View className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3">
            <View className="mb-2">
              <Text className="text-slate-500 text-[11px]">Detected CVE Correlations</Text>
              <Text className="text-slate-200 font-semibold text-sm">
                {telemetry.detectedCvesCount} Match(es)
              </Text>
            </View>
            <View className="mb-2">
              <Text className="text-slate-500 text-[11px]">SELinux State</Text>
              <Text
                className={`font-semibold text-sm ${
                  telemetry.seLinuxEnforcing ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {telemetry.seLinuxEnforcing ? 'Enforcing' : 'Permissive (Warning)'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('HostAssessment')}
            className="bg-slate-800 active:bg-slate-700 py-2.5 rounded-xl border border-slate-700 items-center"
          >
            <Text className="text-slate-200 font-semibold text-xs">Run Live Telemetry Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Section 4: Operations & Governance Hub */}
        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 px-1">
          Governance & Administrative Tools
        </Text>

        <View className="gap-2 mb-8">
          <TouchableOpacity
            onPress={() => navigation.navigate('PrivilegedLedger')}
            className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex-row justify-between items-center active:bg-slate-800"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800/50 items-center justify-center">
                <Text className="text-blue-400 font-bold text-xs">📜</Text>
              </View>
              <View>
                <Text className="text-slate-200 font-semibold text-sm">
                  Privileged Action Ledger
                </Text>
                <Text className="text-slate-400 text-xs">
                  Inspect tamper-evident SHA-256 audit chain
                </Text>
              </View>
            </View>
            <Text className="text-slate-500 text-base">›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('BreakGlassEmergency')}
            className="bg-slate-900/90 p-3.5 rounded-xl border border-red-950/60 flex-row justify-between items-center active:bg-slate-800"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-800/50 items-center justify-center">
                <Text className="text-red-400 font-bold text-xs">🚨</Text>
              </View>
              <View>
                <Text className="text-slate-200 font-semibold text-sm">
                  Emergency Break-Glass
                </Text>
                <Text className="text-slate-400 text-xs">
                  Superuser cryptographic override controls
                </Text>
              </View>
            </View>
            <Text className="text-slate-500 text-base">›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
