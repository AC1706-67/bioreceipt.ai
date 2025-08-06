import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle
} from 'react-native';
import { Milestone } from '../../types/progress';

interface MilestonesViewProps {
  milestones: Milestone[];
  onMilestonePress?: (milestone: Milestone) => void;
  showProgress?: boolean;
  horizontal?: boolean;
  style?: ViewStyle;
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({
  milestones,
  onMilestonePress,
  showProgress = true,
  horizontal = false,
  style
}) => {
  const getMilestoneIcon = (type: string, difficulty: string) => {
    const icons = {
      streak: '🔥',
      completion: '✅',
      engagement: '⏱️',
      category: '📚',
      time: '🕐',
      quality: '⭐'
    };
    
    const difficultyModifiers = {
      easy: '',
      medium: '💪',
      hard: '🏆',
      expert: '👑'
    };
    
    return `${icons[type as keyof typeof icons] || '🎯'} ${difficultyModifiers[difficulty as keyof typeof difficultyModifiers] || ''}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'hard': return '#EF4444';
      case 'expert': return '#8B5CF6';
      default: return '#64748B';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10B981';
    if (progress >= 60) return '#F59E0B';
    if (progress >= 40) return '#EF4444';
    return '#64748B';
  };

  const renderMilestone = (milestone: Milestone, index: number) => {
    const progress = milestone.targetValue > 0 
      ? (milestone.currentValue / milestone.targetValue) * 100 
      : 0;
    
    const progressColor = getProgressColor(progress);
    const difficultyColor = getDifficultyColor(milestone.difficulty);

    return (
      <TouchableOpacity
        key={milestone.id}
        style={[
          styles.milestoneCard,
          horizontal && styles.horizontalCard,
          milestone.isCompleted && styles.completedCard
        ]}
        onPress={() => onMilestonePress?.(milestone)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.milestoneHeader}>
          <Text style={styles.milestoneIcon}>
            {getMilestoneIcon(milestone.type, milestone.difficulty)}
          </Text>
          <View style={[
            styles.difficultyBadge,
            { backgroundColor: difficultyColor }
          ]}>
            <Text style={styles.difficultyText}>
              {milestone.difficulty.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.milestoneContent}>
          <Text style={[
            styles.milestoneTitle,
            milestone.isCompleted && styles.completedTitle
          ]}>
            {milestone.title}
          </Text>
          
          <Text style={styles.milestoneDescription} numberOfLines={2}>
            {milestone.description}
          </Text>

          {/* Progress */}
          {showProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {milestone.currentValue} / {milestone.targetValue}
                </Text>
                <Text style={[styles.progressPercentage, { color: progressColor }]}>
                  {Math.round(progress)}%
                </Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar,
                    { 
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: progressColor
                    }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Reward Preview */}
          {milestone.reward && (
            <View style={styles.rewardContainer}>
              <Text style={styles.rewardIcon}>
                {milestone.reward.type === 'badge' ? '🏅' :
                 milestone.reward.type === 'streak_freeze' ? '🧊' :
                 milestone.reward.type === 'premium_content' ? '⭐' :
                 '🎨'}
              </Text>
              <Text style={styles.rewardText} numberOfLines={1}>
                {milestone.reward.description}
              </Text>
            </View>
          )}

          {/* AI Generated Badge */}
          {milestone.aiGenerated && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiText}>🤖 AI Personalized</Text>
            </View>
          )}

          {/* Completion Status */}
          {milestone.isCompleted && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✅ Completed!</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (milestones.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyIcon}>🎯</Text>
        <Text style={styles.emptyTitle}>No Active Milestones</Text>
        <Text style={styles.emptyText}>
          Keep engaging with health tips to unlock new milestones!
        </Text>
      </View>
    );
  }

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.horizontalContainer, style]}
        style={styles.horizontalScroll}
      >
        {milestones.map(renderMilestone)}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {milestones.map(renderMilestone)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20
  },
  horizontalScroll: {
    paddingLeft: 20
  },
  horizontalContainer: {
    paddingRight: 20
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  horizontalCard: {
    width: 280,
    marginRight: 12,
    marginBottom: 0
  },
  completedCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981'
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  milestoneIcon: {
    fontSize: 24
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  milestoneContent: {
    flex: 1
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4
  },
  completedTitle: {
    color: '#059669'
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12
  },
  progressContainer: {
    marginBottom: 12
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500'
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: 3
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8
  },
  rewardIcon: {
    fontSize: 16,
    marginRight: 6
  },
  rewardText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    flex: 1
  },
  aiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8
  },
  aiText: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '500'
  },
  completedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  completedText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20
  }
});

export default MilestonesView;