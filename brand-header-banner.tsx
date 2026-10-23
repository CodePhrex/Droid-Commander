import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { BRAND_IDENTITY, COLOR_PALETTE } from './brand-design-system';

/**
 * BrandHeaderBanner
 * 
 * Reusable header component incorporating the official CodePhrex 3D metallic DC logo,
 * circuit board background texture, and metallic typography derived from 1000001971.jpg.
 */
export const BrandHeaderBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
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
        <Text style={styles.subtitleText}>{BRAND_IDENTITY.developer.toUpperCase()}</Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 10,
  },
  containerCompact: {
    paddingVertical: 12,
    borderRadius: 12,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    marginBottom: 10,
    alignItems: 'center',
  },
  outerRingBevel: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3A4B5C',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLOR_PALETTE.accent.cyberCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  innerEmblemDisk: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: '#16202C',
    borderWidth: 1.5,
    borderColor: '#79C0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emblemText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 2,
    textShadowColor: 'rgba(88, 166, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  textWrapper: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F0F6FC',
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B949E',
    letterSpacing: 4,
  },
});
