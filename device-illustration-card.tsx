import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { DeviceGraphicsManager, DisplayCondition, DeviceIllustrationSpec } from './device-graphics-manager';
import { COLOR_PALETTE } from './brand-design-system';

export interface DeviceIllustrationCardProps {
  manufacturer: string;
  model: string;
  displayCondition?: DisplayCondition;
  isConnectedOtg?: boolean;
  riskScore?: number;
  selinuxMode?: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED';
  onPressDetails?: () => void;
}

export const DeviceIllustrationCard: React.FC<DeviceIllustrationCardProps> = ({
  manufacturer,
  model,
  displayCondition = 'INTACT_OLED',
  isConnectedOtg = true,
  riskScore = 0.0,
  selinuxMode = 'ENFORCING',
  onPressDetails,
}) => {
  const graphicsManager = DeviceGraphicsManager.getInstance();
  const spec: DeviceIllustrationSpec = graphicsManager.resolveDeviceIllustration({
    manufacturer,
    model,
    displayCondition,
    isConnectedOtg,
    riskScore,
  });

  const getConditionLabel = (cond: DisplayCondition) => {
    switch (cond) {
      case 'SHATTERED_SCREEN':
        return '💥 SHATTERED SCREEN (HEADLESS OTG)';
      case 'HEADLESS_NO_DISPLAY':
        return '🖥️ HEADLESS / DISPLAYLESS TARGET';
      case 'WATER_DAMAGED':
        return '💧 LIQUID CORROSION DETECTED';
      default:
        return '📱 INTACT OLED DISPLAY';
    }
  };

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPressDetails} activeOpacity={0.85}>
      {/* Device Schematic / Graphical Header */}
      <View style={styles.graphicHeader}>
        <View style={styles.deviceFrameBox}>
          {/* Outer Glow Halo */}
          <View
            style={[
              styles.deviceChassisHalo,
              {
                borderColor: isConnectedOtg ? COLOR_PALETTE.accent.cyberCyan : COLOR_PALETTE.accent.metallicSteel,
                shadowColor: isConnectedOtg ? COLOR_PALETTE.accent.cyberCyan : '#000',
              },
            ]}
          >
            {/* Screen Inner Display Area */}
            <View
              style={[
                styles.screenDisplayArea,
                {
                  backgroundColor:
                    displayCondition === 'HEADLESS_NO_DISPLAY'
                      ? '#090D16'
                      : displayCondition === 'WATER_DAMAGED'
                      ? '#0F2027'
                      : '#020617',
                },
              ]}
            >
              {/* Camera Notch / Visor */}
              <View style={styles.cameraVisorBar}>
                <View style={styles.lensDot} />
                <View style={[styles.lensDot, { backgroundColor: COLOR_PALETTE.accent.electricBlue }]} />
              </View>

              {/* Status HUD Text inside Illustration */}
              <View style={styles.hudOverlay}>
                <Text style={styles.hudText}>{spec.manufacturer.toUpperCase()}</Text>
                <Text style={styles.hudModelText}>{spec.model}</Text>

                <View style={styles.hudBadgeRow}>
                  <View
                    style={[
                      styles.hudBadge,
                      {
                        backgroundColor:
                          riskScore >= 7.0
                            ? COLOR_PALETTE.status.criticalRed + '33'
                            : COLOR_PALETTE.status.lockedGreen + '33',
                        borderColor:
                          riskScore >= 7.0
                            ? COLOR_PALETTE.status.criticalRed
                            : COLOR_PALETTE.status.lockedGreen,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hudBadgeText,
                        {
                          color:
                            riskScore >= 7.0
                              ? COLOR_PALETTE.status.criticalRed
                              : COLOR_PALETTE.status.lockedGreen,
                        },
                      ]}
                    >
                      RISK {riskScore.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* USB Port Glow Indicator */}
              <View style={styles.otgPortGlow}>
                <View
                  style={[
                    styles.portLED,
                    {
                      backgroundColor: isConnectedOtg
                        ? COLOR_PALETTE.accent.cyberCyan
                        : COLOR_PALETTE.accent.metallicSteel,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Right Details Panel */}
        <View style={styles.detailsColumn}>
          <Text style={styles.mfgTitle}>{spec.manufacturer}</Text>
          <Text style={styles.modelSubtitle}>{spec.model}</Text>

          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>{getConditionLabel(displayCondition)}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>USB OTG Bus:</Text>
            <Text
              style={[
                styles.metaValue,
                { color: isConnectedOtg ? COLOR_PALETTE.accent.cyberCyan : COLOR_PALETTE.status.warningYellow },
              ]}
            >
              {isConnectedOtg ? '⚡ ACTIVE (5V / BULK)' : '🔌 DISCONNECTED'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>SELinux Mode:</Text>
            <Text
              style={[
                styles.metaValue,
                {
                  color:
                    selinuxMode === 'ENFORCING'
                      ? COLOR_PALETTE.status.lockedGreen
                      : COLOR_PALETTE.status.criticalRed,
                },
              ]}
            >
              {selinuxMode}
            </Text>
          </View>

          {onPressDetails && (
            <TouchableOpacity style={styles.inspectBtn} onPress={onPressDetails}>
              <Text style={styles.inspectBtnText}>📐 Inspect Device Illustration & Schematics</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    marginBottom: 14,
  },
  graphicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceFrameBox: {
    width: 100,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deviceChassisHalo: {
    width: 92,
    height: 152,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    padding: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  screenDisplayArea: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.accent.electricBlue + '44',
    padding: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraVisorBar: {
    flexDirection: 'row',
    width: '80%',
    height: 12,
    backgroundColor: '#020617',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  lensDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR_PALETTE.accent.cyberCyan,
    marginHorizontal: 3,
  },
  hudOverlay: {
    alignItems: 'center',
    marginVertical: 10,
  },
  hudText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
    letterSpacing: 1,
  },
  hudModelText: {
    fontSize: 8,
    color: COLOR_PALETTE.accent.metallicSteel,
    marginTop: 2,
    textAlign: 'center',
  },
  hudBadgeRow: {
    marginTop: 6,
  },
  hudBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  hudBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  otgPortGlow: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  portLED: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  detailsColumn: {
    flex: 1,
  },
  mfgTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  modelSubtitle: {
    fontSize: 13,
    color: COLOR_PALETTE.accent.cyberCyan,
    marginBottom: 6,
  },
  tagBadge: {
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLOR_PALETTE.accent.chromeSilver,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.metallicSteel,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  inspectBtn: {
    backgroundColor: COLOR_PALETTE.accent.electricBlue + '22',
    borderWidth: 1,
    borderColor: COLOR_PALETTE.accent.electricBlue,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  inspectBtnText: {
    color: COLOR_PALETTE.accent.chromeSilver,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
