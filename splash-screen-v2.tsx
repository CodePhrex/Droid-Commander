import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Splash Screen v2 - Enhanced with React Native Animated loops,
 * pulsing circuit rings, spring logo scales, and interactive boot sequence.
 */
export const SplashScreenV2: React.FC<{ onBootComplete?: () => void }> = ({ onBootComplete }) => {
  const [bootStep, setBootStep] = useState<string>('Initializing TEE Hardware...');
  const [progress, setProgress] = useState<number>(0);

  // Animated Values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const pulseGlow = useRef(new Animated.Value(0.4)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance Spring Animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Infinite Rotating Cyber Ring
    Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Infinite Pulsing Circuit Glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseGlow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseGlow, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Boot Step Sequence
    const steps = [
      { text: 'Binding Native USB OTG Driver (bulk_xfer)...', pct: 0.2 },
      { text: 'Verifying Hardware Keymaster Attestation...', pct: 0.4 },
      { text: 'Auditing SHA-256 Privileged Action Ledger...', pct: 0.7 },
      { text: 'Syncing Operation Mode Context (LOCAL_HOST)...', pct: 0.9 },
      { text: 'Droid Commander Engine Ready', pct: 1.0 },
    ];

    let currentStepIndex = 0;
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        const step = steps[currentStepIndex];
        setBootStep(step.text);
        setProgress(step.pct);

        Animated.timing(progressBarWidth, {
          toValue: step.pct,
          duration: 400,
          useNativeDriver: false,
        }).start();

        currentStepIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          if (onBootComplete) onBootComplete();
        }, 500);
      }
    }, 700);

    return () => clearInterval(interval);
  }, []);

  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Pulsing Ambient Background Glow */}
      <Animated.View style={[styles.glowBackdrop, { opacity: pulseGlow }]} />

      {/* Center Logo Container with Rotating Ring */}
      <View style={styles.centerContainer}>
        <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: spin }] }]} />

        <Animated.View
          style={[
            styles.emblemBox,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.emblemText}>DC</Text>
          <Text style={styles.subBadgeText}>CODEPHREX</Text>
        </Animated.View>
      </View>

      <Text style={styles.appTitle}>DROID COMMANDER</Text>
      <Text style={styles.appTagline}>Offline Security & Diagnostic Platform</Text>

      {/* Animated Boot Sequence Panel */}
      <View style={styles.bootPanel}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.statusDot, { opacity: pulseGlow }]} />
          <Text style={styles.bootStepText}>{bootStep}</Text>
          <Text style={styles.pctText}>{Math.round(progress * 100)}%</Text>
        </View>

        {/* Progress Bar Container */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressBarWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Interactive Quick-Skip / Fast Boot Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onBootComplete && onBootComplete()}
      >
        <Animated.View style={[styles.skipButton, { transform: [{ scale: buttonScale }] }]}>
          <Text style={styles.skipButtonText}>⚡ SKIP BOOT INTRO</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  glowBackdrop: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    backgroundColor: '#388BFD15',
    borderWidth: 1,
    borderColor: '#58A6FF20',
  },
  centerContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  rotatingRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#58A6FF',
    borderStyle: 'dashed',
  },
  emblemBox: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: '#161B22',
    borderWidth: 2,
    borderColor: '#58A6FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#58A6FF',
    shadowRadius: 16,
    shadowOpacity: 0.4,
  },
  emblemText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 2,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#58A6FF',
    letterSpacing: 3,
    marginTop: 2,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 3,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 12,
    color: '#8B949E',
    letterSpacing: 1,
    marginBottom: 40,
  },
  bootPanel: {
    width: '100%',
    backgroundColor: '#161B22',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#30363D',
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3FB950',
    marginRight: 8,
  },
  bootStepText: {
    flex: 1,
    fontSize: 12,
    color: '#58A6FF',
    fontFamily: 'monospace',
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F0F6FC',
    marginLeft: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#21262D',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#388BFD',
    borderRadius: 3,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#21262D',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  skipButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1,
  },
});
