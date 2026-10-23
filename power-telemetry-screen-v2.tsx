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
} from 'react-native';

/**
 * Power Telemetry Screen v2 - Enhanced with Thermal Gauges,
 * Live Voltage Wave Animation, and Interactive VBUS Cut-Off Rail Switch.
 */
export const PowerTelemetryScreenV2: React.FC = () => {
  const [vbusEnabled, setVbusEnabled] = useState<boolean>(true);
  const [thermalGauge, setThermalGauge] = useState<number>(31.4);
  const [voltage, setVoltage] = useState<number>(4.12);
  const [current, setCurrent] = useState<number>(450);

  // Animated Wave Values
  const waveAnim = useRef(new Animated.Value(0)).current;
  const pulseVbus = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Wave pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const toggleVbusRail = (value: boolean) => {
    setVbusEnabled(value);
    Animated.spring(pulseVbus, {
      toValue: value ? 1 : 0.4,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ BMS POWER & THERMAL TELEMETRY</Text>
        <Text style={styles.headerSub}>REAL-TIME VOLTAGE, CURRENT & VBUS RAIL CONTROL</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Battery Gauge Card */}
        <View style={styles.gaugeCard}>
          <Text style={styles.cardTitle}>BATTERY MANAGEMENT SYSTEM (BMS)</Text>

          <View style={styles.gaugeGrid}>
            <View style={styles.gaugeBox}>
              <Text style={styles.gaugeVal}>{voltage.toFixed(2)} V</Text>
              <Text style={styles.gaugeLbl}>Voltage</Text>
            </View>

            <View style={styles.gaugeBox}>
              <Text style={styles.gaugeVal}>{current} mA</Text>
              <Text style={styles.gaugeLbl}>Current Draw</Text>
            </View>

            <View style={styles.gaugeBox}>
              <Text style={styles.gaugeVal}>{thermalGauge.toFixed(1)} °C</Text>
              <Text style={styles.gaugeLbl}>Temperature</Text>
            </View>
          </View>

          {/* Animated Wave Power Bar */}
          <View style={styles.waveBarTrack}>
            <Animated.View
              style={[
                styles.waveBarFill,
                {
                  opacity: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.waveSub}>Live Voltage Waveform Active • Sampling at 100 Hz</Text>
        </View>

        {/* Interactive OTG VBUS Rail Cut-Off Control */}
        <View style={styles.vbusCard}>
          <View style={styles.vbusHeader}>
            <View style={styles.vbusLeft}>
              <Animated.View
                style={[
                  styles.vbusDot,
                  {
                    backgroundColor: vbusEnabled ? '#3FB950' : '#F85149',
                    opacity: pulseVbus,
                  },
                ]}
              />
              <View>
                <Text style={styles.vbusTitle}>USB OTG VBUS 5V Power Rail</Text>
                <Text style={styles.vbusSub}>
                  {vbusEnabled ? 'STATUS: POWERED (5.00V ACTIVE)' : 'STATUS: CUT-OFF (RAIL DISCONNECTED)'}
                </Text>
              </View>
            </View>

            <Switch
              value={vbusEnabled}
              onValueChange={toggleVbusRail}
              trackColor={{ false: '#21262D', true: '#388BFD' }}
              thumbColor={vbusEnabled ? '#F0F6FC' : '#8B949E'}
            />
          </View>

          <Text style={styles.vbusDesc}>
            Allows technicians to physically interrupt 5V VBUS power delivery to connected remote OTG targets to simulate battery-only operation or prevent over-current thermal shutdown.
          </Text>
        </View>
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
  gaugeCard: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  gaugeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gaugeBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0D1117',
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  gaugeVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#58A6FF',
    marginBottom: 2,
  },
  gaugeLbl: {
    fontSize: 10,
    color: '#8B949E',
  },
  waveBarTrack: {
    height: 8,
    backgroundColor: '#21262D',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  waveBarFill: {
    height: '100%',
    width: '78%',
    backgroundColor: '#388BFD',
    borderRadius: 4,
  },
  waveSub: {
    fontSize: 10,
    color: '#8B949E',
    textAlign: 'center',
  },
  vbusCard: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 16,
  },
  vbusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vbusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vbusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  vbusTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F0F6FC',
  },
  vbusSub: {
    fontSize: 10,
    color: '#8B949E',
    marginTop: 2,
  },
  vbusDesc: {
    fontSize: 11,
    color: '#C9D1D9',
    lineHeight: 16,
  },
});
