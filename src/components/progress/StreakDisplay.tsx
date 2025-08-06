import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Alert,
  Animated
} from 'react-native';
import { StreakData } from '../../types/progress';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  streakData: StreakData;
  streakFreezesRemaining: number;
  onUseStreakFreeze?: () => void;
  style?: ViewStyle;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  longestStreak,
  streakData,
  streakFreezesRemaining,
  onUseStreakFreeze,
  style
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    // Pulse animation for current streak
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    );

    if (currentStreak > 0) {
      pulse.start();
    }

    return () => pulse.stop();
  }, [currentStreak, pulseAnim]);

  const getStreakEmoji = (streak: number) => {
    if (streak >= 100) return '🏆';
    if (streak >= 50) return '🔥';
    if (streak >= 30) return '⚡';
    if (streak >= 14) return '💪';
    if (streak >= 7) return '🌟';
    if (streak >= 3) return '🎯';
    return '🌱';
  };

  const getStreakMessage = (streak: number) => {
    if (streak >= 100) return 'Legendary Streak!';
    if (streak >= 50) return 'On Fire!';
    if (streak >= 30) return 'Unstoppable!';
    if (streak >= 14) return 'Strong Momentum!';
    if (streak >= 7) return 'Great Consistency!';
    if (streak >= 3) return 'Building Habits!';
    if (streak >= 1) return 'Getting Started!';
    return 'Ready to Begin!';
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return '#10B981';
    if (health >= 60) return '#F59E0B';
    if (health >= 40) return '#EF4444';
    return '#64748B';
  };

  const handleStreakFreezePress = () => {
    if (streakFreezesRemaining <= 0) {
      Alert.alert(
        'No Streak Freezes Available',
        'You don\'t have any streak freezes remaining. Complete milestones to earn more!',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Use Streak Freeze?',
      `This will protect your ${currentStreak}-day streak for 24 hours. You have ${streakFreezesRemaining} freeze${streakFreezesRemaining !== 1 ? 's' : ''} remaining.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Use Freeze', 
          onPress: onUseStreakFreeze,
          style: 'default'
        }
      ]
    );
  };

  const renderStreakHistory = () => {
    const recentHistory = streakData.streakHistory.slice(-7);
    
    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Last 7 Days</Text>
        <View style={styles.historyDots}>
          {recentHistory.map((entry, index) => (
            <View
              key={index}
              style={[
                styles.historyDot,
                {
                  backgroundColor: entry.engaged 
                    ? entry.engagementScore > 0.7 
                      ? '#10B981' 
                      : '#F59E0B'
                    : '#E2E8F0'
                }
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Main Streak Display */}
      <View style={styles.mainContainer}>
        <Animated.View 
          style={[
            styles.streakCircle,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text style={styles.streakEmoji}>
            {getStreakEmoji(currentStreak)}
          </Text>
          <Text style={styles.streakNumber}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </Animated.View>

        <View style={styles.streakInfo}>
          <Text style={styles.streakMessage}>
            {getStreakMessage(currentStreak)}
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue, 
                { color: getHealthColor(streakData.qualityScore * 100) }
              ]}>
                {Math.round(streakData.qualityScore * 100)}%
              </Text>
              <Text style={styles.statLabel}>Quality</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                { color: getHealthColor(streakData.consistencyScore * 100) }
              ]}>
                {Math.round(streakData.consistencyScore * 100)}%
              </Text>
              <Text style={styles.statLabel}>Consistency</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Streak History */}
      {renderStreakHistory()}

      {/* Streak Freeze Section */}
      <View style={styles.freezeSection}>
        <View style={styles.freezeInfo}>
          <Text style={styles.freezeTitle}>🧊 Streak Freezes</Text>
          <Text style={styles.freezeCount}>
            {streakFreezesRemaining} remaining
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.freezeButton,
            { opacity: streakFreezesRemaining > 0 ? 1 : 0.5 }
          ]}
          onPress={handleStreakFreezePress}
          disabled={streakFreezesRemaining <= 0}
        >
          <Text style={styles.freezeButtonText}>Use Freeze</Text>
        </TouchableOpacity>
      </View>

      {/* Streak Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 Streak Tips</Text>
        <Text style={styles.tipsText}>
          {streakData.consistencyScore < 0.7
            ? 'Try engaging at the same time each day to build consistency'
            : streakData.qualityScore < 0.7
            ? 'Spend more quality time with each tip to improve your streak health'
            : currentStreak < 7
            ? 'Focus on daily consistency to build a strong habit'
            : 'Great job! Keep up the excellent work!'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  mainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  streakCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#4F46E5'
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 4
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  streakLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500'
  },
  streakInfo: {
    flex: 1
  },
  streakMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  historyContainer: {
    marginBottom: 20
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8
  },
  historyDots: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 2
  },
  freezeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  freezeInfo: {
    flex: 1
  },
  freezeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2
  },
  freezeCount: {
    fontSize: 12,
    color: '#64748B'
  },
  freezeButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  freezeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500'
  },
  tipsSection: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B'
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    marginBottom: 4
  },
  tipsText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16
  }
});

export default StreakDisplay;