/**
 * Loading Screen - MVP Authentication Loading UI
 * Accessible loading screen with BioReceipt branding
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { BioReceiptTheme } from '../../constants/BioReceiptTheme';

const LoadingScreen: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      rotateAnimation.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Loading Animation */}
      <View style={styles.animationContainer}>
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rotateCircle,
            {
              transform: [{ rotate }],
            },
          ]}
        >
          <View style={styles.rotateIndicator} />
        </Animated.View>
        <View style={styles.centerLogo}>
          <Text style={styles.logoText}>BP</Text>
        </View>
      </View>

      {/* App Name */}
      <Text 
        style={styles.appName}
        accessible={true}
        accessibilityLabel="BioReceipt.AI"
        accessibilityRole="header"
      >
        BioReceipt.AI
      </Text>

      {/* Tagline */}
      <Text 
        style={styles.tagline}
        accessible={true}
        accessibilityLabel="AI-Powered Biohacking"
      >
        AI-Powered Biohacking
      </Text>

      {/* Loading Text */}
      <Text 
        style={styles.loadingText}
        accessible={true}
        accessibilityLabel="Loading application"
        accessibilityRole="status"
        accessibilityLiveRegion="polite"
      >
        Loading...
      </Text>

      {/* Version */}
      <Text style={styles.version}>v3.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BioReceiptTheme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: BioReceiptTheme.spacing.xl,
  },
  animationContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: BioReceiptTheme.spacing.xl * 2,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BioReceiptTheme.colors.primary + '20', // 20% opacity
    borderWidth: 2,
    borderColor: BioReceiptTheme.colors.primary + '40', // 40% opacity
  },
  rotateCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: BioReceiptTheme.colors.primary,
  },
  rotateIndicator: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BioReceiptTheme.colors.primary,
  },
  centerLogo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BioReceiptTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: BioReceiptTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoText: {
    fontSize: 20,
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.white,
    letterSpacing: 1,
  },
  appName: {
    fontSize: BioReceiptTheme.typography.fontSize['4xl'],
    fontWeight: BioReceiptTheme.typography.fontWeight.bold,
    color: BioReceiptTheme.colors.primary,
    marginBottom: BioReceiptTheme.spacing.sm,
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: BioReceiptTheme.typography.fontSize.lg,
    color: BioReceiptTheme.colors.textSecondary,
    marginBottom: BioReceiptTheme.spacing.xl * 2,
    textAlign: 'center',
    fontWeight: BioReceiptTheme.typography.fontWeight.medium,
  },
  loadingText: {
    fontSize: BioReceiptTheme.typography.fontSize.md,
    color: BioReceiptTheme.colors.textTertiary,
    marginBottom: BioReceiptTheme.spacing.xl,
    textAlign: 'center',
  },
  version: {
    position: 'absolute',
    bottom: BioReceiptTheme.spacing.xl,
    fontSize: BioReceiptTheme.typography.fontSize.sm,
    color: BioReceiptTheme.colors.textTertiary,
    textAlign: 'center',
  },
});

export default LoadingScreen;
