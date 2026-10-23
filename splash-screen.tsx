import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
} from 'react-native';
import { BRAND_IDENTITY, COLOR_PALETTE } from './brand-design-system';

interface SplashScreenProps {
  onInitializationComplete?: () => void;
}

const { width } = Dimensions.get('window');

/**
 * Droid Commander - Professional Animated Splash Screen
 * Incorporates the 3D Metallic DC Emblem, Circuit PCB Glow,
 * and Fail-Closed Security Initialization Sequence.
 */
export const DroidCommanderSplashScreen: React.FC<SplashScreenProps> = ({
  onInitializationComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [initStage, setInitStage] = useState<string>('Initializing Secure TEE Runtime...');
  const [percent, setPercent] = useState<number>(0);

  useEffect(() => {
    // 1. Entrance Fade & Scale
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous Pulse Glow on Circuit Emblem
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Simulated Telemetry Boot Sequence
    const stages = [
      { progress: 0.2, text: 'Initializing Secure TEE Runtime...' },
      { progress: 0.45, text: 'Verifying Hardware Keymaster & Attestation...' },
      { progress: 0.7, text: 'Checking Privileged Action Ledger Hash Chain...' },
      { progress: 0.9, text: 'Binding Native USB OTG Host Drivers...' },
      { progress: 1.0, text: 'Initialization Complete. System Ready.' },
    ];

    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < stages.length) {
        const stage = stages[currentStep];
        setInitStage(stage.text);
        setPercent(Math.round(stage.progress * 100));

        Animated.timing(progressAnim, {
          toValue: stage.progress,
          duration: 400,
          useNativeDriver: false,
        }).start();

        currentStep++;
      } else {
        clearInterval(stepInterval);
        setTimeout(() => {
          if (onInitializationComplete) {
            onInitializationComplete();
          }
        }, 500);
      }
    }, 600);

    return () => clearInterval(stepInterval);
  }, [fadeAnim, scaleAnim, glowAnim, progressAnim, onInitializationComplete]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.9],
  });

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLOR_PALETTE.background.darkSlate} />

      {/* Circuit PCB Background Texture */}
      <View style={styles.circuitBackdrop}>
        <Animated.View style={[styles.glowCircle, { opacity: glowOpacity }]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Metallic Beveled Badge Container */}
        <View style={styles.emblemBezel}>
          <View style={styles.emblemInner}>
            <Text style={styles.emblemMonogram}>{BRAND_IDENTITY.monogram}</Text>
            {/* PCB Circuit Accent Lines */}
            <View style={styles.pcbTraceHorizontal} />
            <View style={styles.pcbTraceVertical} />
          </View>
          {/* Sub-badge Monogram */}
          <View style={styles.subBadge}>
            <Text style={styles.subBadgeText}>{BRAND_IDENTITY.badgeMonogram}</Text>
          </View>
        </View>

        {/* Brand Titles */}
        <Text style={styles.appTitle}>{BRAND_IDENTITY.appName.toUpperCase()}</Text>
        <View style={styles.developerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.developerText}>{BRAND_IDENTITY.developer.toUpperCase()}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.tagline}>{BRAND_IDENTITY.tagline}</Text>

        {/* Progress & Telemetry Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.stageText}>{initStage}</Text>
            <Text style={styles.percentText}>{percent}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressBarWidth }]} />
          </View>
        </View>
      </Animated.View>

      {/* Footer Version Label */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          FAIL-CLOSED OPERATIONAL ENGINE • {BRAND_IDENTITY.version}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circuitBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: COLOR_PALETTE.accent.cyberCyan,
    position: 'absolute',
    opacity: 0.3,
    filter: 'blur(40px)', // Web/Modern React Native fallback
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  emblemBezel: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    borderWidth: 3,
    borderColor: COLOR_PALETTE.accent.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLOR_PALETTE.accent.cyberCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
    position: 'relative',
  },
  emblemInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    borderWidth: 1.5,
    borderColor: COLOR_PALETTE.background.borderOutline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emblemMonogram: {
    fontSize: 44,
    fontWeight: '900',
    color: COLOR_PALETTE.accent.chromeSilver,
    letterSpacing: 2,
  },
  pcbTraceHorizontal: {
    position: 'absolute',
    width: 80,
    height: 2,
    backgroundColor: COLOR_PALETTE.accent.cyberCyan,
    opacity: 0.4,
  },
  pcbTraceVertical: {
    position: 'absolute',
    width: 2,
    height: 80,
    backgroundColor: COLOR_PALETTE.accent.cyberCyan,
    opacity: 0.4,
  },
  subBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: COLOR_PALETTE.accent.codePhrexIndigo,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.accent.cyberCyan,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLOR_PALETTE.accent.chromeSilver,
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLOR_PALETTE.accent.chromeSilver,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 6,
  },
  developerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    width: 24,
    height: 1.5,
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    marginHorizontal: 8,
  },
  developerText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLOR_PALETTE.accent.cyberCyan,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 12,
    color: COLOR_PALETTE.accent.metallicSteel,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLOR_PALETTE.background.charcoalSurface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR_PALETTE.background.borderOutline,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stageText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.chromeSilver,
    fontWeight: '600',
    flex: 1,
  },
  percentText: {
    fontSize: 11,
    color: COLOR_PALETTE.accent.cyberCyan,
    fontWeight: '800',
    marginLeft: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: COLOR_PALETTE.background.darkSlate,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLOR_PALETTE.accent.electricBlue,
    borderRadius: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLOR_PALETTE.accent.metallicSteel,
    letterSpacing: 1,
  },
});
