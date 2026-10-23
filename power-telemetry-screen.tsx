import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLOR_PALETTE } from './brand-design-system';

export const PowerTelemetryScreen: React.FC = () => {
  const [voltage, setVoltage] = useState<number>(4180); // mV
  const [temperature, setTemperature] = useState<number>(31.5); // °C
  const [currentDraw, setCurrentDraw] = useState<number>(-420); // mA
  const [otgPowerSupply, setOtgPowerSupply] = useState<boolean>(true);
  const [otgVoltageOutput, setOtgVoltageOutput] = useState<number>(5.05); // V
  const [otgCurrentOutput, setOtgCurrentOutput] = useState<number>(850); // mA
  const [thermalState, setThermalState] = useState<'NOMINAL' | 'ELEVATED' | 'CRITICAL_THROTTLE'>('NOMINAL');

  const handleToggleOtgPower = () => {
    setOtgPowerSupply(!otgPowerSupply);
    Alert.alert(
      'OTG Power Rail Toggled',
      `USB OTG VBUS 5V power output is now ${!otgPowerSupply ? 'ENABLED (5.05V / 850mA)' : 'DISABLED (0.0V)'}`,
      [{ text: 'Acknowledge' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚡ BMS Battery & OTG Power Profiler</Text>
        <Text style={styles.subtitle}>
          Real-time Host Power Draw, Thermal Throttling & VBUS Supply Profiling
        </Text>
      </View>

      {/* Main Thermal & Health Gauge */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Host Battery Management System (BMS)</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{(voltage / 1000).toFixed(2)} V</Text>
            <Text style={styles.metricLabel}>Cell Voltage</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricValue, { color: temperature > 40 ? COLOR_PALETTE.status.criticalRed : COLOR_PALETTE.status.lockedGreen }]}>
              {temperature.toFixed(1)} °C
            </Text>
            <Text style={styles.metricLabel}>Thermal Sensor</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{currentDraw} mA</Text>
            <Text style={styles.metricLabel}>Current Draw</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Thermal Throttling State:</Text>
          <View style={[styles.badge, { backgroundColor: COLOR_PALETTE.status.lockedGreen + '22', borderColor: COLOR_PALETTE.status.lockedGreen }]}>
            <Text style={[styles.badgeText, { color: COLOR_PALETTE.status.lockedGreen }]}>{thermalState}</Text>
          </View>
        </View>
      </View>

      {/* USB OTG VBUS Power Rail Control */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>USB OTG VBUS Target Power Output</Text>
        <View style={styles.otgRow}>
          <View>
            <Text style={styles.otgValue}>{otgPowerSupply ? `${otgVoltageOutput} V @ ${otgCurrentOutput} mA` : '0.0 V (OFF)'}</Text>
            <Text style={styles.otgSubText}>VBUS Rail Status: {otgPowerSupply ? 'ACTIVE SUPPLY' : 'SUSPENDED'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: otgPowerSupply ? COLOR_PALETTE.status.criticalRed : COLOR_PALETTE.status.lockedGreen }]}
            onPress={handleToggleOtgPower}
          >
            <Text style={styles.toggleBtnText}>{otgPowerSupply ? 'Cut VBUS' : 'Enable VBUS'}</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR_PALETTE.accent.chromeSilver,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricBox: {
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.cyberCyan,
  },
  metricLabel: {
    fontSize: 10,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  otgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otgValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  otgSubText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
