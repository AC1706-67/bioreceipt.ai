import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Dimensions
} from 'react-native';
import { EngagementTrend } from '../../types/progress';

const { width } = Dimensions.get('window');

interface WeeklyProgressChartProps {
  data: EngagementTrend[];
  title?: string;
  style?: ViewStyle;
}

export const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({
  data,
  title = "Weekly Progress",
  style
}) => {
  const chartWidth = width - 80; // Account for padding
  const chartHeight = 120;
  const maxValue = Math.max(...data.map(d => d.tipsCompleted), 1);
  
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getBarHeight = (value: number) => {
    return (value / maxValue) * chartHeight;
  };

  const getBarColor = (value: number, engagementScore: number) => {
    if (value === 0) return '#E2E8F0';
    if (engagementScore >= 0.8) return '#10B981';
    if (engagementScore >= 0.6) return '#F59E0B';
    if (engagementScore >= 0.4) return '#EF4444';
    return '#64748B';
  };

  const getTodayIndex = () => {
    return new Date().getDay();
  };

  const renderBar = (item: EngagementTrend, index: number) => {
    const barHeight = getBarHeight(item.tipsCompleted);
    const barColor = getBarColor(item.tipsCompleted, item.engagementScore);
    const isToday = index === getTodayIndex();
    const dayLabel = dayLabels[index] || dayLabels[index % 7];

    return (
      <View key={index} style={styles.barContainer}>
        <View style={styles.barWrapper}>
          <View
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: barColor,
                borderWidth: isToday ? 2 : 0,
                borderColor: isToday ? '#4F46E5' : 'transparent'
              }
            ]}
          />
          <Text style={styles.barValue}>
            {item.tipsCompleted > 0 ? item.tipsCompleted : ''}
          </Text>
        </View>
        
        <Text style={[
          styles.dayLabel,
          isToday && styles.todayLabel
        ]}>
          {dayLabel}
        </Text>
        
        {/* Engagement quality indicator */}
        <View style={[
          styles.qualityIndicator,
          { backgroundColor: getBarColor(1, item.engagementScore) }
        ]} />
      </View>
    );
  };

  const calculateWeekStats = () => {
    const totalTips = data.reduce((sum, item) => sum + item.tipsCompleted, 0);
    const totalTime = data.reduce((sum, item) => sum + item.timeSpent, 0);
    const avgEngagement = data.length > 0 
      ? data.reduce((sum, item) => sum + item.engagementScore, 0) / data.length 
      : 0;
    const activeDays = data.filter(item => item.tipsCompleted > 0).length;

    return { totalTips, totalTime, avgEngagement, activeDays };
  };

  const stats = calculateWeekStats();

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalTips}</Text>
            <Text style={styles.statLabel}>Tips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeDays}/7</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(stats.avgEngagement * 100)}%</Text>
            <Text style={styles.statLabel}>Quality</Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {data.slice(0, 7).map(renderBar)}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Excellent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Good</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Fair</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#E2E8F0' }]} />
          <Text style={styles.legendText}>None</Text>
        </View>
      </View>

      {/* Weekly Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {stats.activeDays === 7 
            ? "Perfect week! 🎉 You engaged every day!"
            : stats.activeDays >= 5
            ? `Great consistency! ${stats.activeDays} days active this week 💪`
            : stats.activeDays >= 3
            ? `Good progress! ${stats.activeDays} days active 🌟`
            : stats.activeDays >= 1
            ? `Getting started! ${stats.activeDays} day${stats.activeDays !== 1 ? 's' : ''} active 🌱`
            : "Ready for a fresh start! 🚀"
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B'
  },
  statsContainer: {
    flexDirection: 'row'
  },
  statItem: {
    alignItems: 'center',
    marginLeft: 16
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B'
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2
  },
  chartContainer: {
    marginBottom: 16
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingHorizontal: 4
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 40
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
    marginBottom: 8
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4
  },
  barValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1E293B',
    marginTop: 4,
    minHeight: 12
  },
  dayLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4
  },
  todayLabel: {
    color: '#4F46E5',
    fontWeight: 'bold'
  },
  qualityIndicator: {
    width: 8,
    height: 3,
    borderRadius: 2
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  legendText: {
    fontSize: 10,
    color: '#64748B'
  },
  summary: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5'
  },
  summaryText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default WeeklyProgressChart;