import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { BRAND_IDENTITY, COLOR_PALETTE } from './brand-design-system';

export interface BrandHeaderBannerProps {
  [key: string]: any;

  subTitle?: string;
  activeModeLabel?: string;
  showQuickModeToggle?: boolean;
  onModeToggle?: () => void;
  onOpenSettings?: () => void;
  activeModeLabel?: string;
  subTitle?: string;
  activeModeLabel?: string;
  subTitle?: string;
  activeModeLabel?: string;
  subTitle?: string;
  compact?: boolean;
  activeMode?: string;
  onOpenSettings?: () => void;
}

/**
 * BrandHeaderBanner
 * 
 * Reusable header component incorporating the official CodePhrex 3D metallic DC logo,
 * circuit board background texture, and metallic typography derived from 1000001971.jpg.
 */
export const BrandHeaderBanner: React.FC<BrandHeaderBannerProps> = ({ 
  compact = false,
  activeMode,
  onOpenSettings,
}) => {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Background Circuit Grid Texture Overlay */}
      <View style={styles.gridOverlay}>
        <View style={styles.glowCenter} />
      </View>

      {/* Main Brand Logo & Monogram Badge */}
      <View style={styles.logoWrapper}>
        <View style={styles.outerRingBevel}>
          <View style={styles.innerEmblemDisk}>
            <Text style={styles.emblemText}>{BRAND_IDENTITY.monogram}</Text>
          </View>
        </View>
      </View>

      {/* Brand Typography */}
      <View style={styles.textWrapper}>
        <Text style={styles.titleText}>{BRAND_IDENTITY.appName.toUpperCase()}</Text>
        <Text style={styles.subtitleText}>
          {activeMode ? `${BRAND_IDENTITY.developer.toUpperCase()} • ${activeMode}` : BRAND_IDENTITY.developer.toUpperCase()}
        </Text>
      </View>

      {/* Optional Settings Action */}
      {onOpenSettings && (
        <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 10,
  },
  containerCompact: {
    paddingVertical: 12,
    borderRadius: 12,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0D1117',
    opacity: 0.9,
  },
  glowCenter: {
    position: 'absolute',
    top: '20%',
    left: '25%',
    width: '50%',
    height: '60%',
    borderRadius: 100,
    backgroundColor: COLOR_PALETTE.accent.cyberCyan,
    opacity: 0.12,
  },
  logoWrapper: {
    marginRight: 14,
    zIndex: 2,
  },
  outerRingBevel: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLOR_PALETTE.accent.metallicSilver,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerEmblemDisk: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emblemText: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  textWrapper: {
    flex: 1,
    zIndex: 2,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  subtitleText: {
    color: COLOR_PALETTE.accent.cyberCyan,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
    zIndex: 2,
  },
  settingsIcon: {
    fontSize: 18,
  },
});
