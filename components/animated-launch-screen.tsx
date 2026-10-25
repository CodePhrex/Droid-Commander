import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { design } from "@/constants/design-system";

/**
 * Lightweight in-app launch animation shown after the native Android splash.
 * Uses React Native Animated only; no additional dependency is required.
 */
export function AnimatedLaunchScreen() {
  const [visible, setVisible] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const ring = useRef(new Animated.Value(0.35)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 0.35,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 150,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    pulse.start();

    const finish = setTimeout(() => {
      pulse.stop();
      Animated.timing(fade, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, 1850);

    return () => {
      clearTimeout(finish);
      pulse.stop();
    };
  }, [fade, progress, ring, scale]);

  if (!visible) return null;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Droid Commander is starting"
      style={[styles.overlay, { opacity: fade }]}
    >
      <View style={styles.topLine} />
      <View style={styles.center}>
        <View style={styles.markStage}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ring.interpolate({
                  inputRange: [0.35, 1],
                  outputRange: [0.2, 0.75],
                }),
                transform: [
                  {
                    scale: ring.interpolate({
                      inputRange: [0.35, 1],
                      outputRange: [0.85, 1.35],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View style={[styles.mark, { transform: [{ scale }] }]}>
            <Text style={styles.markText}>DC</Text>
          </Animated.View>
        </View>
        <Text style={styles.title}>DROID COMMANDER</Text>
        <Text style={styles.subtitle}>DEVICE CONTROL  /  DIAGNOSTICS</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.status}>INITIALIZING SECURE WORKSPACE</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.statusDot} />
        <Text style={styles.footerText}>COMMAND CENTER</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: design.color.navy,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 38,
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: design.color.orange,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  markStage: {
    width: 124,
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  ring: {
    position: "absolute",
    width: 98,
    height: 98,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: design.color.orange,
  },
  mark: {
    width: 82,
    height: 82,
    borderRadius: 23,
    backgroundColor: design.color.orange,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFBE83",
  },
  markText: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2.1,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    color: "#B9C6D2",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    textAlign: "center",
  },
  progressTrack: {
    width: 164,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#33485D",
    overflow: "hidden",
    marginTop: 36,
  },
  progressFill: {
    height: "100%",
    backgroundColor: design.color.orange,
    borderRadius: 999,
  },
  status: {
    marginTop: 13,
    color: "#AAB8C5",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.15,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: design.color.orange,
  },
  footerText: {
    color: "#B9C6D2",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
});
