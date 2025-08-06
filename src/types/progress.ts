export interface UserProgress {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalTipsCompleted: number;
  totalEngagementTime: number;
  lastActivityDate: Date;
  streakFreezeUsed: number;
  streakFreezeRemaining: number;
  categoryProgress: CategoryProgress[];
  weeklyGoals: WeeklyGoal[];
  monthlyGoals: MonthlyGoal[];
  achievements: Achievement[];
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryProgress {
  category: HealthCategory;
  completedTips: number;
  totalTimeSpent: number;
  currentStreak: number;
  longestStreak: number;
  averageEngagementScore: number;
  lastActivityDate: Date;
  progressPercentage: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface StreakData {
  id: string;
  userId: string;
  streakType: StreakType;
  currentCount: number;
  longestCount: number;
  startDate: Date;
  lastActivityDate: Date;
  isActive: boolean;
  freezeCount: number;
  freezeEndDate?: Date;
  streakHistory: StreakHistoryEntry[];
  qualityScore: number;
  consistencyScore: number;
  metadata: StreakMetadata;
}

export interface StreakHistoryEntry {
  date: Date;
  engaged: boolean;
  engagementScore: number;
  tipIds: string[];
  totalTimeSpent: number;
  qualityMetrics: EngagementQuality;
}

export interface StreakMetadata {
  averageEngagementTime: number;
  preferredEngagementTime: string;
  categoryDistribution: Record<HealthCategory, number>;
  difficultyDistribution: Record<string, number>;
  seasonalPatterns: SeasonalPattern[];
}

export interface SeasonalPattern {
  period: 'weekly' | 'monthly' | 'seasonal';
  pattern: number[];
  confidence: number;
  lastUpdated: Date;
}

export interface EngagementQuality {
  readingTime: number;
  interactionCount: number;
  completionRate: number;
  retentionScore: number;
  applicationAttempted: boolean;
  feedbackProvided: boolean;
}

export interface Milestone {
  id: string;
  userId: string;
  type: MilestoneType;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  completedAt?: Date;
  category?: HealthCategory;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  reward: MilestoneReward;
  aiGenerated: boolean;
  personalizedMessage?: string;
  celebrationShown: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface MilestoneReward {
  type: 'badge' | 'streak_freeze' | 'premium_content' | 'customization';
  value: string | number;
  description: string;
  imageUrl?: string;
}

export interface Achievement {
  id: string;
  userId: string;
  badgeId: string;
  title: string;
  description: string;
  category: HealthCategory | 'general';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  progress: number;
  maxProgress: number;
  isVisible: boolean;
  shareableMessage?: string;
  imageUrl: string;
  animationUrl?: string;
}

export interface WeeklyGoal {
  id: string;
  userId: string;
  week: string; // ISO week format: 2024-W01
  targetTips: number;
  completedTips: number;
  targetCategories: HealthCategory[];
  completedCategories: HealthCategory[];
  targetEngagementTime: number;
  actualEngagementTime: number;
  isCompleted: boolean;
  completedAt?: Date;
  aiAdjusted: boolean;
  difficultyLevel: number;
}

export interface MonthlyGoal {
  id: string;
  userId: string;
  month: string; // Format: 2024-01
  targetStreak: number;
  actualStreak: number;
  targetMilestones: number;
  completedMilestones: number;
  targetCategoryMastery: HealthCategory[];
  achievedCategoryMastery: HealthCategory[];
  isCompleted: boolean;
  completedAt?: Date;
  progressScore: number;
}

export interface ProgressInsight {
  id: string;
  userId: string;
  type: InsightType;
  title: string;
  description: string;
  actionable: boolean;
  actionText?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: HealthCategory | 'general';
  confidence: number;
  generatedAt: Date;
  expiresAt?: Date;
  isRead: boolean;
  isActedUpon: boolean;
  metadata: InsightMetadata;
}

export interface InsightMetadata {
  dataPoints: string[];
  correlations: CorrelationData[];
  predictions: PredictionData[];
  recommendations: RecommendationData[];
  visualizationData?: any;
}

export interface CorrelationData {
  factor: string;
  correlation: number;
  significance: number;
  description: string;
}

export interface PredictionData {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  factors: string[];
}

export interface RecommendationData {
  action: string;
  expectedImpact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeToImplement: string;
  category: HealthCategory;
}

export interface ProgressAnalytics {
  userId: string;
  timeframe: AnalyticsTimeframe;
  engagementTrends: EngagementTrend[];
  categoryBreakdown: CategoryBreakdown[];
  streakAnalysis: StreakAnalysis;
  goalProgress: GoalProgressAnalysis;
  behaviorPatterns: BehaviorPattern[];
  predictions: ProgressPrediction[];
  recommendations: ProgressRecommendation[];
  generatedAt: Date;
}

export interface EngagementTrend {
  date: Date;
  tipsCompleted: number;
  timeSpent: number;
  engagementScore: number;
  qualityScore: number;
  categories: HealthCategory[];
}

export interface CategoryBreakdown {
  category: HealthCategory;
  completionRate: number;
  averageEngagementTime: number;
  streakDays: number;
  progressLevel: number;
  trendsUp: boolean;
  lastActivity: Date;
}

export interface StreakAnalysis {
  currentStreakHealth: number;
  streakStability: number;
  riskOfBreaking: number;
  optimalEngagementTime: string;
  streakQualityTrend: 'improving' | 'stable' | 'declining';
  recommendedActions: string[];
}

export interface GoalProgressAnalysis {
  weeklyGoalCompletion: number;
  monthlyGoalCompletion: number;
  goalAchievementTrend: 'improving' | 'stable' | 'declining';
  averageGoalDifficulty: number;
  recommendedGoalAdjustments: GoalAdjustment[];
}

export interface GoalAdjustment {
  goalType: 'weekly' | 'monthly';
  currentTarget: number;
  recommendedTarget: number;
  reason: string;
  confidence: number;
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  strength: number;
  category: HealthCategory | 'general';
  timeOfDay?: string;
  dayOfWeek?: string;
  seasonality?: string;
  description: string;
}

export interface ProgressPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  confidence: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface ProgressRecommendation {
  id: string;
  type: 'streak' | 'goal' | 'engagement' | 'category' | 'timing';
  title: string;
  description: string;
  expectedImpact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeToImplement: string;
  priority: number;
  actionSteps: string[];
}

export type StreakType = 'daily' | 'category' | 'goal' | 'quality' | 'consistency';
export type MilestoneType = 'streak' | 'completion' | 'engagement' | 'category' | 'time' | 'quality';
export type InsightType = 'pattern' | 'prediction' | 'recommendation' | 'achievement' | 'warning';
export type AnalyticsTimeframe = 'week' | 'month' | 'quarter' | 'year' | 'all';
export type HealthCategory = 'nutrition' | 'mental_wellness' | 'fitness' | 'sleep' | 'recovery' | 'hygiene';

export interface ProgressChartData {
  labels: string[];
  datasets: ProgressDataset[];
  options: ChartOptions;
}

export interface ProgressDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip: {
      enabled: boolean;
      mode: string;
    };
  };
  scales?: {
    x?: ScaleOptions;
    y?: ScaleOptions;
  };
}

export interface ScaleOptions {
  display: boolean;
  title?: {
    display: boolean;
    text: string;
  };
  min?: number;
  max?: number;
  ticks?: {
    stepSize?: number;
    callback?: (value: any) => string;
  };
}

export interface ProgressNotificationData {
  type: 'milestone' | 'achievement' | 'streak' | 'goal' | 'insight';
  title: string;
  message: string;
  data: any;
  priority: 'low' | 'medium' | 'high';
  scheduledFor?: Date;
  userId: string;
}

export interface ProgressExportData {
  userId: string;
  exportDate: Date;
  timeframe: AnalyticsTimeframe;
  progress: UserProgress;
  analytics: ProgressAnalytics;
  achievements: Achievement[];
  milestones: Milestone[];
  insights: ProgressInsight[];
  format: 'json' | 'csv' | 'pdf';
}