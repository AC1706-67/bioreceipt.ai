/**
 * Skip Navigation Component
 * Provides "Skip to main content" functionality for keyboard users
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';

interface SkipNavigationProps {
  mainContentRef?: React.RefObject<any>;
  skipText?: string;
  onSkip?: () => void;
}

export const SkipNavigation: React.FC<SkipNavigationProps> = ({
  mainContentRef,
  skipText = 'Skip to main content',
  onSkip,
}) => {
  const skipLinkRef = useRef<TouchableOpacity>(null);

  const handleSkip = () => {
    if (mainContentRef?.current) {
      // Focus the main content area
      AccessibilityInfo.setAccessibilityFocus(mainContentRef.current);
      
      // Announce the skip action
      AccessibilityInfo.announceForAccessibility(
        'Skipped to main content'
      );
    }
    
    onSkip?.();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={skipLinkRef}
        style={styles.skipLink}
        onPress={handleSkip}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={skipText}
        accessibilityHint="Double tap to skip navigation and go to main content"
        onFocus={() => {
          // Make skip link visible when focused
          if (skipLinkRef.current) {
            skipLinkRef.current.setNativeProps({
              style: [styles.skipLink, styles.skipLinkVisible],
            });
          }
        }}
        onBlur={() => {
          // Hide skip link when focus is lost
          if (skipLinkRef.current) {
            skipLinkRef.current.setNativeProps({
              style: styles.skipLink,
            });
          }
        }}
      >
        <Text style={styles.skipText}>{skipText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  skipLink: {
    position: 'absolute',
    top: -100, // Hidden by default
    left: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  skipLinkVisible: {
    top: 16, // Visible when focused
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SkipNavigation;