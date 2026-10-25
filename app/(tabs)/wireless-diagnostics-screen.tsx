import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { WirelessManager, WiFiNetwork, BluetoothDevice } from "../../lib/wireless-manager";

export default function WirelessDiagnosticsScreen() {
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);
  const [btDevices, setBtDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [adbStatus, setAdbStatus] = useState<string>("Inactive");
  const [securityScore, setSecurityScore] = useState<number | null>(null);

  const manager = WirelessManager.getInstance();

  const handleRunDiagnostics = async () => {
    setLoading(true);
    try {
      const wifi = await manager.scanWiFiNetworks();
      const bt = await manager.scanBluetoothDevices();
      setWifiNetworks(wifi);
      setBtDevices(bt);

      const report = manager.generateSecurityReport(wifi, bt);
      setSecurityScore(report.securityPostureScore);
    } catch (err) {
      console.error("Failed wireless diagnostics scan", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableAdbWifi = async () => {
    const res = await manager.enableWirelessDebugging(5555);
    setAdbStatus(`Active on ${res.ipAddress}:${res.port}`);
  };

  useEffect(() => {
    handleRunDiagnostics();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Wireless & Network Diagnostics</Text>
      <Text style={styles.subtitle}>Wi-Fi Posture, BLE Scanning & Wireless ADB Channel</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Controls</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleRunDiagnostics} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Scan Network</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleEnableAdbWifi}>
            <Text style={styles.secondaryButtonText}>Enable ADB over Wi-Fi</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.adbText}>Wireless ADB Status: {adbStatus}</Text>
        {securityScore !== null && (
          <Text style={[styles.scoreText, { color: securityScore > 75 ? "#4CAF50" : "#FF9800" }]}>
            Security Posture Score: {securityScore}/100
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Wi-Fi Networks ({wifiNetworks.length})</Text>
        {wifiNetworks.map((net, idx) => (
          <View key={idx} style={styles.listItem}>
            <View>
              <Text style={styles.itemTitle}>{net.ssid} {net.isConnected ? "(Connected)" : ""}</Text>
              <Text style={styles.itemSub}>BSSID: {net.bssid} | {net.security}</Text>
            </View>
            <Text style={styles.rssiText}>{net.rssi} dBm</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bluetooth & BLE Devices ({btDevices.length})</Text>
        {btDevices.map((dev, idx) => (
          <View key={idx} style={styles.listItem}>
            <View>
              <Text style={styles.itemSub}>{dev.address} | {dev.type} | {dev.isPaired ? "Paired" : "Unpaired"}</Text>
            </View>
            <Text style={styles.rssiText}>{dev.rssi} dBm</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E17" },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#E2E8F0", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#94A3B8", marginBottom: 16 },
  card: { backgroundColor: "#1E293B", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#334155" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#38BDF8", marginBottom: 12 },
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  primaryButton: { flex: 1, backgroundColor: "#0284C7", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  secondaryButton: { flex: 1, backgroundColor: "#334155", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
  secondaryButtonText: { color: "#38BDF8", fontWeight: "600" },
  adbText: { color: "#CBD5E1", fontSize: 13, marginTop: 4 },
  scoreText: { fontSize: 14, fontWeight: "bold", marginTop: 8 },
  listItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#334155" },
  itemTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "500" },
  itemSub: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  rssiText: { color: "#38BDF8", fontWeight: "bold", fontSize: 13 },
});
