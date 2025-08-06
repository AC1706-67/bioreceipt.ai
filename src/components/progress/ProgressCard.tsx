import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle
} from 'react-native';

interface ProgressCardProps {
  title: string;
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: {
    consistency: number;
    engagement: number;
    diversity: number;
    growth: number;
  };
  onPress?: () => void;
  style?: ViewStyle;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  score,
  trend,
  factors,
  onPress,
  style
}) => {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#10B981';
      case 'declining': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#EF4444';
    return '#64748B';
  };

  const renderFactorBar = (label: string, value: number, color: string) => (
    <View key={label} style={styles.factorRow}>
      <Text style={styles.factorLabel}>{label}</Text>
      <View style={styles.factorBarContainer}>
        <View 
          style={[
            styles.factorBar, 
            { width: `${value}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={styles.factorValue}>{value}%</Text>
    </View>
  );

  const CardContent = () => (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.trendContainer}>
          <Text style={styles.trendIcon}>{getTrendIcon(trend)}</Text>
          <Text style={[styles.trendText, { color: getTrendColor(trend) }]}>
            {trend.charAt(0).toUpperCase() + trend.slice(1)}
          </Text>
        </View>
      </View>

      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreText, { color: getScoreColor(score) }]}>
            {score}
          </Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
        
        <View style={styles.factorsContainer}>
          {renderFactorBar('Consistency', factors.consistency, '#4F46E5')}
          {renderFactorBar('Engagement', factors.engagement, '#10B981')}
          {renderFactorBar('Diversity', factors.diversity, '#F59E0B')}
          {renderFactorBar('Growth', factors.growth, '#8B5CF6')}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {score >= 80 
            ? 'Excellent progress! Keep it up! 🌟'
            : score >= 60
            ? 'Good progress! Room for improvement 💪'
            : score >= 40
            ? 'Making progress! Stay consistent 🎯'
            : 'Just getting started! You got this! 🚀'
          }
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  trendIcon: {
    fontSize: 14,
    marginRight: 4
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500'
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#E2E8F0'
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  factorsContainer: {
    flex: 1
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  factorLabel: {
    fontSize: 12,
    color: '#64748B',
    width: 70,
    fontWeight: '500'
  },
  factorBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden'
  },
  factorBar: {
    height: '100%',
    borderRadius: 3
  },
  factorValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
    width: 30,
    textAlign: 'right'
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default ProgressCard;