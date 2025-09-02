/**
 * Notification Badge
 * Component for displaying notification count badge
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'medium',
  color = '#dc3545'
}) => {
  if (count <= 0) {
    return (
      <View style={[styles.container, styles[`${size}Container`]]}>
        <Text style={[styles.icon, styles[`${size}Icon`]]}>🔔</Text>
      </View>
    );
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const badgeSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  const fontSize = size === 'small' ? 10 : size === 'large' ? 14 : 12;

  return (
    <View style={[styles.container, styles[`${size}Container`]]}>
      <Text style={[styles.icon, styles[`${size}Icon`]]}>🔔</Text>
      <View 
        style={[
          styles.badge,
          {
            backgroundColor: color,
            minWidth: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2
          }
        ]}
      >
        <Text 
          style={[
            styles.badgeText,
            { fontSize }
          ]}
        >
          {displayCount}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  smallContainer: {
    width: 20,
    height: 20
  },
  mediumContainer: {
    width: 24,
    height: 24
  },
  largeContainer: {
    width: 28,
    height: 28
  },
  icon: {
    textAlign: 'center'
  },
  smallIcon: {
    fontSize: 16
  },
  mediumIcon: {
    fontSize: 20
  },
  largeIcon: {
    fontSize: 24
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white'
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false
  }
});