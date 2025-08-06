import { 
  StreakData, 
  StreakHistoryEntry, 
  EngagementQuality, 
  StreakType, 
  HealthCategory,
  SeasonalPattern,
  StreakMetadata
} from '../../types/progress';
import { UserEngagement } from '../../types/bioPulse';
import { kiroAIService } from '../ai/kiroAIService';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';

class StreakCalculationService {
  private readonly QUALITY_WEIGHTS = {
    readingTime: 0.3,
    interactionCount: 0.2,
    completionRate: 0.25,
    retentionScore: 0.15,
    applicationAttempted: 0.1
  };

  private readonly CONSISTENCY_FACTORS = {
    timeOfDay: 0.4,
    dayOfWeek: 0.3,
    categoryDiversity: 0.2,
    engagementDepth: 0.1
  };

  /**
   * Calculate comprehensive streak metrics
   */
  async calculateStreakMetrics(
    userId: string, 
    streakType: StreakType, 
    engagement: UserEngagement, 
    quality: EngagementQuality
  ): Promise<StreakData> {
    try {
      const streakData = await this.getOrCreateStreakData(userId, streakType);
      const today = new Date();
      const todayString = today.toDateString();

      // Update streak history
      await this.updateStreakHistory(streakData, engagement, quality, today);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(quality);
      
      // Calculate consistency score
      const consistencyScore = await this.calculateConsistencyScore(streakData, today);

      // Update streak count
      await this.updateStreakCount(streakData, today, qualityScore);

      // Update metadata
      await this.updateStreakMetadata(streakData, engagement, quality, today);

      // Apply AI-enhanced streak analysis
      await this.applyAIStreakAnalysis(streakData);

      streakData.qualityScore = qualityScore;
      streakData.consistencyScore = consistencyScore;
      streakData.lastActivityDate = today;

      await this.saveStreakData(streakData);
      return streakData;

    } catch (error) {
      console.error('Error calculating streak metrics:', error);
      throw new Error('Failed to calculate streak metrics');
    }
  }

  /**
   * Predict streak continuation probability
   */
  async predictStreakContinuation(userId: string, streakType: StreakType): Promise<{
    probability: number;
    riskFactors: string[];
    recommendations: string[];
    optimalEngagementTime: string;
  }> {
    try {
      const streakData = await this.getOrCreateStreakData(userId, streakType);
      
      // Analyze historical patterns
      const patterns = this.analyzeStreakPatterns(streakData);
      
      // Calculate base probability from consistency
      let probability = streakData.consistencyScore * 0.6 + streakData.qualityScore * 0.4;
      
      // Adjust for recent trends
      const recentTrend = this.calculateRecentTrend(streakData);
      probability = probability * (1 + recentTrend * 0.2);
      
      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(streakData, patterns);
      
      // Generate AI-powered recommendations
      const recommendations = await this.generateStreakRecommendations(streakData, patterns);
      
      // Determine optimal engagement time
      const optimalTime = this.calculateOptimalEngagementTime(streakData);

      return {
        probability: Math.max(0, Math.min(1, probability)),
        riskFactors,
        recommendations,
        optimalEngagementTime: optimalTime
      };

    } catch (error) {
      console.error('Error predicting streak continuation:', error);
      throw new Error('Failed to predict streak continuation');
    }
  }

  /**
   * Calculate streak recovery suggestions
   */
  async calculateStreakRecovery(userId: string, streakType: StreakType): Promise<{
    canRecover: boolean;
    recoveryPlan: string[];
    motivationalMessage: string;
    incentives: string[];
  }> {
    try {
      const streakData = await this.getOrCreateStreakData(userId, streakType);
      const daysSinceLastActivity = this.getDaysSinceLastActivity(streakData);
      
      // Determine if recovery is possible (within grace period)
      const canRecover = daysSinceLastActivity <= 2 && streakData.freezeCount < 3;
      
      if (!canRecover) {
        return {
          canRecover: false,
          recoveryPlan: ['Start a new streak today!'],
          motivationalMessage: 'Every expert was once a beginner. Your fresh start begins now!',
          incentives: ['New streak bonus', 'Fresh start achievement']
        };
      }

      // Generate personalized recovery plan
      const recoveryPlan = await this.generateRecoveryPlan(streakData, daysSinceLastActivity);
      
      // Create motivational message using AI
      const motivationalMessage = await this.generateMotivationalMessage(streakData);
      
      // Determine incentives
      const incentives = this.calculateRecoveryIncentives(streakData);

      return {
        canRecover,
        recoveryPlan,
        motivationalMessage,
        incentives
      };

    } catch (error) {
      console.error('Error calculating streak recovery:', error);
      throw new Error('Failed to calculate streak recovery');
    }
  }

  /**
   * Analyze streak patterns for insights
   */
  async analyzeStreakPatterns(streakData: StreakData): Promise<{
    weeklyPattern: number[];
    dailyPattern: number[];
    seasonalTrends: SeasonalPattern[];
    categoryPreferences: Record<HealthCategory, number>;
    optimalConditions: string[];
  }> {
    try {
      const history = streakData.streakHistory;
      
      // Calculate weekly pattern (0 = Sunday, 6 = Saturday)
      const weeklyPattern = new Array(7).fill(0);
      const dailyPattern = new Array(24).fill(0);
      
      history.forEach(entry => {
        const date = new Date(entry.date);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        
        weeklyPattern[dayOfWeek] += entry.engagementScore;
        dailyPattern[hour] += entry.engagementScore;
      });

      // Normalize patterns
      const maxWeekly = Math.max(...weeklyPattern);
      const maxDaily = Math.max(...dailyPattern);
      
      if (maxWeekly > 0) {
        weeklyPattern.forEach((val, idx) => weeklyPattern[idx] = val / maxWeekly);
      }
      
      if (maxDaily > 0) {
        dailyPattern.forEach((val, idx) => dailyPattern[idx] = val / maxDaily);
      }

      // Analyze seasonal trends
      const seasonalTrends = this.calculateSeasonalTrends(history);
      
      // Calculate category preferences
      const categoryPreferences = streakData.metadata.categoryDistribution;
      
      // Identify optimal conditions
      const optimalConditions = this.identifyOptimalConditions(weeklyPattern, dailyPattern, seasonalTrends);

      return {
        weeklyPattern,
        dailyPattern,
        seasonalTrends,
        categoryPreferences,
        optimalConditions
      };

    } catch (error) {
      console.error('Error analyzing streak patterns:', error);
      throw new Error('Failed to analyze streak patterns');
    }
  }

  /**
   * Calculate advanced streak statistics
   */
  async calculateAdvancedStats(userId: string, streakType: StreakType): Promise<{
    averageStreakLength: number;
    streakStability: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
    consistencyRating: number;
    predictedNextBreak: Date | null;
    strengthScore: number;
  }> {
    try {
      const streakData = await this.getOrCreateStreakData(userId, streakType);
      const history = streakData.streakHistory;
      
      // Calculate average streak length from historical data
      const streakLengths = this.extractStreakLengths(history);
      const averageStreakLength = streakLengths.length > 0 
        ? streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length 
        : 0;

      // Calculate streak stability (variance in streak lengths)
      const streakStability = this.calculateStreakStability(streakLengths);
      
      // Determine quality trend
      const qualityTrend = this.calculateQualityTrend(history);
      
      // Calculate consistency rating
      const consistencyRating = streakData.consistencyScore * 100;
      
      // Predict next potential break using AI
      const predictedNextBreak = await this.predictNextStreakBreak(streakData);
      
      // Calculate overall strength score
      const strengthScore = this.calculateStreakStrength(streakData, averageStreakLength, streakStability);

      return {
        averageStreakLength,
        streakStability,
        qualityTrend,
        consistencyRating,
        predictedNextBreak,
        strengthScore
      };

    } catch (error) {
      console.error('Error calculating advanced stats:', error);
      throw new Error('Failed to calculate advanced stats');
    }
  }

  /**
   * Private helper methods
   */
  private async getOrCreateStreakData(userId: string, streakType: StreakType): Promise<StreakData> {
    const cacheKey = `streak_${userId}_${streakType}`;
    let streakData = await cacheService.get<StreakData>(cacheKey);
    
    if (!streakData) {
      const stored = await storage.getItem(cacheKey);
      if (stored) {
        streakData = JSON.parse(stored);
      } else {
        streakData = this.createInitialStreakData(userId, streakType);
      }
    }
    
    return streakData;
  }

  private createInitialStreakData(userId: string, streakType: StreakType): StreakData {
    return {
      id: `streak_${userId}_${streakType}`,
      userId,
      streakType,
      currentCount: 0,
      longestCount: 0,
      startDate: new Date(),
      lastActivityDate: new Date(),
      isActive: true,
      freezeCount: 0,
      streakHistory: [],
      qualityScore: 0,
      consistencyScore: 0,
      metadata: {
        averageEngagementTime: 0,
        preferredEngagementTime: '09:00',
        categoryDistribution: {} as Record<HealthCategory, number>,
        difficultyDistribution: {},
        seasonalPatterns: []
      }
    };
  }

  private async updateStreakHistory(
    streakData: StreakData, 
    engagement: UserEngagement, 
    quality: EngagementQuality, 
    date: Date
  ): Promise<void> {
    const todayString = date.toDateString();
    
    // Check if we already have an entry for today
    const existingEntryIndex = streakData.streakHistory.findIndex(
      entry => new Date(entry.date).toDateString() === todayString
    );

    const historyEntry: StreakHistoryEntry = {
      date,
      engaged: true,
      engagementScore: this.calculateQualityScore(quality),
      tipIds: [engagement.tipId],
      totalTimeSpent: quality.readingTime,
      qualityMetrics: quality
    };

    if (existingEntryIndex >= 0) {
      // Update existing entry
      const existing = streakData.streakHistory[existingEntryIndex];
      existing.tipIds.push(engagement.tipId);
      existing.totalTimeSpent += quality.readingTime;
      existing.engagementScore = Math.max(existing.engagementScore, historyEntry.engagementScore);
    } else {
      // Add new entry
      streakData.streakHistory.push(historyEntry);
    }

    // Keep only last 90 days of history for performance
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    streakData.streakHistory = streakData.streakHistory.filter(
      entry => new Date(entry.date) >= ninetyDaysAgo
    );
  }

  private calculateQualityScore(quality: EngagementQuality): number {
    const normalizedReadingTime = Math.min(quality.readingTime / 300, 1); // Normalize to 5 minutes max
    const normalizedInteractions = Math.min(quality.interactionCount / 10, 1); // Normalize to 10 interactions max
    
    return (
      normalizedReadingTime * this.QUALITY_WEIGHTS.readingTime +
      normalizedInteractions * this.QUALITY_WEIGHTS.interactionCount +
      quality.completionRate * this.QUALITY_WEIGHTS.completionRate +
      quality.retentionScore * this.QUALITY_WEIGHTS.retentionScore +
      (quality.applicationAttempted ? 1 : 0) * this.QUALITY_WEIGHTS.applicationAttempted
    );
  }

  private async calculateConsistencyScore(streakData: StreakData, currentDate: Date): Promise<number> {
    const history = streakData.streakHistory;
    if (history.length < 2) return 0;

    // Calculate time consistency
    const engagementTimes = history.map(entry => new Date(entry.date).getHours());
    const timeConsistency = this.calculateTimeConsistency(engagementTimes);
    
    // Calculate day-of-week consistency
    const dayConsistency = this.calculateDayConsistency(history);
    
    // Calculate category diversity (balanced engagement across categories)
    const categoryDiversity = this.calculateCategoryDiversity(streakData.metadata.categoryDistribution);
    
    // Calculate engagement depth consistency
    const depthConsistency = this.calculateDepthConsistency(history);

    return (
      timeConsistency * this.CONSISTENCY_FACTORS.timeOfDay +
      dayConsistency * this.CONSISTENCY_FACTORS.dayOfWeek +
      categoryDiversity * this.CONSISTENCY_FACTORS.categoryDiversity +
      depthConsistency * this.CONSISTENCY_FACTORS.engagementDepth
    );
  }

  private calculateTimeConsistency(engagementTimes: number[]): number {
    if (engagementTimes.length < 2) return 0;
    
    const mean = engagementTimes.reduce((a, b) => a + b, 0) / engagementTimes.length;
    const variance = engagementTimes.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / engagementTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    // Normalize to 0-1 scale (assuming max std dev of 12 hours)
    return Math.max(0, 1 - (standardDeviation / 12));
  }

  private calculateDayConsistency(history: StreakHistoryEntry[]): number {
    const dayFrequency = new Array(7).fill(0);
    
    history.forEach(entry => {
      const dayOfWeek = new Date(entry.date).getDay();
      dayFrequency[dayOfWeek]++;
    });

    // Calculate entropy to measure distribution evenness
    const total = history.length;
    const entropy = dayFrequency.reduce((acc, freq) => {
      if (freq === 0) return acc;
      const probability = freq / total;
      return acc - probability * Math.log2(probability);
    }, 0);

    // Normalize entropy (max entropy for 7 days is log2(7) ≈ 2.807)
    return entropy / 2.807;
  }

  private calculateCategoryDiversity(categoryDistribution: Record<HealthCategory, number>): number {
    const values = Object.values(categoryDistribution);
    if (values.length === 0) return 0;
    
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    
    // Calculate entropy for category distribution
    const entropy = values.reduce((acc, count) => {
      if (count === 0) return acc;
      const probability = count / total;
      return acc - probability * Math.log2(probability);
    }, 0);

    // Normalize by max possible entropy for 6 categories
    return entropy / Math.log2(6);
  }

  private calculateDepthConsistency(history: StreakHistoryEntry[]): number {
    if (history.length < 2) return 0;
    
    const engagementScores = history.map(entry => entry.engagementScore);
    const mean = engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length;
    const variance = engagementScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / engagementScores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower variance in engagement quality = higher consistency
    return Math.max(0, 1 - standardDeviation);
  }

  private async updateStreakCount(streakData: StreakData, currentDate: Date, qualityScore: number): Promise<void> {
    const today = currentDate.toDateString();
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    const lastActivityString = streakData.lastActivityDate.toDateString();
    
    // Check if this is a continuation of the streak
    if (lastActivityString === yesterdayString || lastActivityString === today) {
      // Continue streak (only increment if it's a new day)
      if (lastActivityString !== today) {
        streakData.currentCount++;
      }
    } else if (streakData.freezeEndDate && new Date() <= streakData.freezeEndDate) {
      // Streak is frozen, continue counting
      streakData.currentCount++;
    } else {
      // Streak broken, start new streak
      streakData.currentCount = 1;
      streakData.startDate = currentDate;
    }

    // Update longest streak if current is longer
    if (streakData.currentCount > streakData.longestCount) {
      streakData.longestCount = streakData.currentCount;
    }

    // Deactivate streak if quality is consistently low
    if (qualityScore < 0.3 && streakData.currentCount > 7) {
      const recentQuality = this.calculateRecentQualityAverage(streakData, 7);
      if (recentQuality < 0.4) {
        streakData.isActive = false;
      }
    }
  }

  private calculateRecentQualityAverage(streakData: StreakData, days: number): number {
    const recentEntries = streakData.streakHistory.slice(-days);
    if (recentEntries.length === 0) return 0;
    
    const totalQuality = recentEntries.reduce((sum, entry) => sum + entry.engagementScore, 0);
    return totalQuality / recentEntries.length;
  }

  private async updateStreakMetadata(
    streakData: StreakData, 
    engagement: UserEngagement, 
    quality: EngagementQuality, 
    date: Date
  ): Promise<void> {
    const metadata = streakData.metadata;
    
    // Update average engagement time
    const totalEntries = streakData.streakHistory.length;
    metadata.averageEngagementTime = (
      (metadata.averageEngagementTime * (totalEntries - 1) + quality.readingTime) / totalEntries
    );

    // Update preferred engagement time based on most frequent hour
    const currentHour = date.getHours();
    const hourKey = `${currentHour}:00`;
    
    // This would be more sophisticated in a real implementation
    if (Math.random() > 0.5) { // Simplified logic
      metadata.preferredEngagementTime = hourKey;
    }

    // Update category distribution (would need tip category from engagement)
    // For now, we'll randomly update a category
    const categories: HealthCategory[] = ['nutrition', 'mental_wellness', 'fitness', 'sleep', 'recovery', 'hygiene'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    metadata.categoryDistribution[randomCategory] = (metadata.categoryDistribution[randomCategory] || 0) + 1;

    // Update difficulty distribution (would need tip difficulty from engagement)
    const difficulties = ['easy', 'medium', 'hard'];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    metadata.difficultyDistribution[randomDifficulty] = (metadata.difficultyDistribution[randomDifficulty] || 0) + 1;
  }

  private async applyAIStreakAnalysis(streakData: StreakData): Promise<void> {
    try {
      // Use AI to analyze patterns and provide insights
      const analysisPrompt = `
        Analyze streak data for user with ${streakData.currentCount} day current streak.
        Quality score: ${streakData.qualityScore}
        Consistency score: ${streakData.consistencyScore}
        History entries: ${streakData.streakHistory.length}
        
        Provide insights on streak health and recommendations.
      `;

      const aiAnalysis = await kiroAIService.generateInsights(analysisPrompt, {
        streakData: {
          currentCount: streakData.currentCount,
          qualityScore: streakData.qualityScore,
          consistencyScore: streakData.consistencyScore,
          historyLength: streakData.streakHistory.length
        }
      });

      // Apply AI insights to streak metadata
      if (aiAnalysis.seasonalPatterns) {
        streakData.metadata.seasonalPatterns = aiAnalysis.seasonalPatterns;
      }

    } catch (error) {
      console.error('Error applying AI streak analysis:', error);
      // Continue without AI analysis if it fails
    }
  }

  private analyzeStreakPatterns(streakData: StreakData): any {
    // Analyze patterns in the streak data
    return {
      weeklyPattern: this.calculateWeeklyPattern(streakData.streakHistory),
      timeOfDayPattern: this.calculateTimeOfDayPattern(streakData.streakHistory),
      qualityTrends: this.calculateQualityTrends(streakData.streakHistory)
    };
  }

  private calculateWeeklyPattern(history: StreakHistoryEntry[]): number[] {
    const pattern = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    
    history.forEach(entry => {
      const dayOfWeek = new Date(entry.date).getDay();
      pattern[dayOfWeek] += entry.engagementScore;
      counts[dayOfWeek]++;
    });

    // Calculate averages
    return pattern.map((sum, idx) => counts[idx] > 0 ? sum / counts[idx] : 0);
  }

  private calculateTimeOfDayPattern(history: StreakHistoryEntry[]): number[] {
    const pattern = new Array(24).fill(0);
    const counts = new Array(24).fill(0);
    
    history.forEach(entry => {
      const hour = new Date(entry.date).getHours();
      pattern[hour] += entry.engagementScore;
      counts[hour]++;
    });

    return pattern.map((sum, idx) => counts[idx] > 0 ? sum / counts[idx] : 0);
  }

  private calculateQualityTrends(history: StreakHistoryEntry[]): any {
    if (history.length < 7) return { trend: 'insufficient_data' };
    
    const recent = history.slice(-7);
    const older = history.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.engagementScore, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, entry) => sum + entry.engagementScore, 0) / older.length : recentAvg;
    
    const change = recentAvg - olderAvg;
    
    if (change > 0.1) return { trend: 'improving', change };
    if (change < -0.1) return { trend: 'declining', change };
    return { trend: 'stable', change };
  }

  private calculateRecentTrend(streakData: StreakData): number {
    const history = streakData.streakHistory;
    if (history.length < 7) return 0;
    
    const recent = history.slice(-7);
    const scores = recent.map(entry => entry.engagementScore);
    
    // Simple linear regression to find trend
    const n = scores.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices 0,1,2...n-1
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = scores.reduce((sum, score, idx) => sum + idx * score, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope; // Positive = improving, negative = declining
  }

  private identifyRiskFactors(streakData: StreakData, patterns: any): string[] {
    const riskFactors = [];
    
    if (streakData.qualityScore < 0.5) {
      riskFactors.push('Low engagement quality');
    }
    
    if (streakData.consistencyScore < 0.6) {
      riskFactors.push('Inconsistent timing');
    }
    
    if (patterns.qualityTrends.trend === 'declining') {
      riskFactors.push('Declining engagement trend');
    }
    
    if (streakData.freezeCount > 2) {
      riskFactors.push('Frequent streak freezes used');
    }
    
    const daysSinceStart = Math.floor((new Date().getTime() - new Date(streakData.startDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceStart > 30 && streakData.currentCount < daysSinceStart * 0.7) {
      riskFactors.push('Low completion rate over time');
    }
    
    return riskFactors;
  }

  private async generateStreakRecommendations(streakData: StreakData, patterns: any): Promise<string[]> {
    try {
      const recommendationPrompt = `
        Generate personalized streak recommendations based on:
        - Current streak: ${streakData.currentCount} days
        - Quality score: ${streakData.qualityScore}
        - Consistency score: ${streakData.consistencyScore}
        - Quality trend: ${patterns.qualityTrends.trend}
        
        Provide 3-5 actionable recommendations to improve streak sustainability.
      `;

      const aiRecommendations = await kiroAIService.generateInsights(recommendationPrompt, {
        streakData: {
          currentCount: streakData.currentCount,
          qualityScore: streakData.qualityScore,
          consistencyScore: streakData.consistencyScore
        },
        patterns
      });

      return aiRecommendations.recommendations || this.getDefaultRecommendations(streakData);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return this.getDefaultRecommendations(streakData);
    }
  }

  private getDefaultRecommendations(streakData: StreakData): string[] {
    const recommendations = [];
    
    if (streakData.qualityScore < 0.5) {
      recommendations.push('Spend more time engaging deeply with each tip');
    }
    
    if (streakData.consistencyScore < 0.6) {
      recommendations.push('Try to engage at the same time each day');
    }
    
    if (streakData.currentCount > 7) {
      recommendations.push('Set weekly mini-goals to maintain motivation');
    }
    
    recommendations.push('Celebrate your progress - you\'re doing great!');
    
    return recommendations;
  }

  private calculateOptimalEngagementTime(streakData: StreakData): string {
    const history = streakData.streakHistory;
    if (history.length === 0) return '09:00';
    
    // Find the hour with highest average engagement score
    const hourScores: { [hour: number]: { total: number; count: number } } = {};
    
    history.forEach(entry => {
      const hour = new Date(entry.date).getHours();
      if (!hourScores[hour]) {
        hourScores[hour] = { total: 0, count: 0 };
      }
      hourScores[hour].total += entry.engagementScore;
      hourScores[hour].count++;
    });

    let bestHour = 9; // Default to 9 AM
    let bestScore = 0;
    
    Object.entries(hourScores).forEach(([hour, data]) => {
      const avgScore = data.total / data.count;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestHour = parseInt(hour);
      }
    });

    return `${bestHour.toString().padStart(2, '0')}:00`;
  }

  private getDaysSinceLastActivity(streakData: StreakData): number {
    const now = new Date();
    const lastActivity = new Date(streakData.lastActivityDate);
    return Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async generateRecoveryPlan(streakData: StreakData, daysSinceLastActivity: number): Promise<string[]> {
    const plan = [];
    
    if (daysSinceLastActivity === 1) {
      plan.push('Complete a quick 2-minute tip right now');
      plan.push('Set a reminder for tomorrow at your optimal time');
    } else if (daysSinceLastActivity === 2) {
      plan.push('Start with an easy tip to rebuild momentum');
      plan.push('Use a streak freeze if available');
      plan.push('Plan your next 3 days of engagement');
    }
    
    plan.push('Focus on consistency over perfection');
    plan.push('Celebrate getting back on track');
    
    return plan;
  }

  private async generateMotivationalMessage(streakData: StreakData): Promise<string> {
    try {
      const motivationPrompt = `
        Generate a personalized, encouraging message for someone who had a ${streakData.longestCount}-day streak 
        and is trying to recover. Keep it positive and motivating.
      `;

      const aiMessage = await kiroAIService.generateInsights(motivationPrompt, {
        longestStreak: streakData.longestCount,
        currentStreak: streakData.currentCount
      });

      return aiMessage.motivationalMessage || 'You\'ve done this before, and you can do it again. Every step forward counts!';
    } catch (error) {
      return 'You\'ve done this before, and you can do it again. Every step forward counts!';
    }
  }

  private calculateRecoveryIncentives(streakData: StreakData): string[] {
    const incentives = [];
    
    if (streakData.longestCount >= 7) {
      incentives.push('Comeback Champion badge');
    }
    
    if (streakData.freezeCount < 2) {
      incentives.push('Extra streak freeze reward');
    }
    
    incentives.push('Fresh start bonus points');
    incentives.push('Resilience achievement progress');
    
    return incentives;
  }

  private calculateSeasonalTrends(history: StreakHistoryEntry[]): SeasonalPattern[] {
    // This would analyze seasonal patterns in engagement
    // For now, return empty array
    return [];
  }

  private identifyOptimalConditions(weeklyPattern: number[], dailyPattern: number[], seasonalTrends: SeasonalPattern[]): string[] {
    const conditions = [];
    
    // Find best day of week
    const bestDayIndex = weeklyPattern.indexOf(Math.max(...weeklyPattern));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    conditions.push(`Best day: ${days[bestDayIndex]}`);
    
    // Find best hour
    const bestHourIndex = dailyPattern.indexOf(Math.max(...dailyPattern));
    conditions.push(`Best time: ${bestHourIndex}:00`);
    
    return conditions;
  }

  private extractStreakLengths(history: StreakHistoryEntry[]): number[] {
    // Extract individual streak lengths from history
    const streakLengths = [];
    let currentStreak = 0;
    
    for (let i = 0; i < history.length; i++) {
      if (history[i].engaged) {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streakLengths.push(currentStreak);
          currentStreak = 0;
        }
      }
    }
    
    if (currentStreak > 0) {
      streakLengths.push(currentStreak);
    }
    
    return streakLengths;
  }

  private calculateStreakStability(streakLengths: number[]): number {
    if (streakLengths.length < 2) return 1;
    
    const mean = streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length;
    const variance = streakLengths.reduce((acc, length) => acc + Math.pow(length - mean, 2), 0) / streakLengths.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Lower coefficient of variation = higher stability
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private calculateQualityTrend(history: StreakHistoryEntry[]): 'improving' | 'stable' | 'declining' {
    if (history.length < 14) return 'stable';
    
    const recent = history.slice(-7);
    const older = history.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.engagementScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, entry) => sum + entry.engagementScore, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private async predictNextStreakBreak(streakData: StreakData): Promise<Date | null> {
    try {
      // Use AI to predict when the streak might break
      const predictionPrompt = `
        Predict when a user's streak might break based on:
        - Current streak: ${streakData.currentCount} days
        - Quality score: ${streakData.qualityScore}
        - Consistency score: ${streakData.consistencyScore}
        - Recent trend: ${this.calculateRecentTrend(streakData)}
        
        Provide a prediction in days from now, or null if streak looks stable.
      `;

      const aiPrediction = await kiroAIService.generateInsights(predictionPrompt, {
        streakData: {
          currentCount: streakData.currentCount,
          qualityScore: streakData.qualityScore,
          consistencyScore: streakData.consistencyScore
        }
      });

      if (aiPrediction.predictedBreakDays && aiPrediction.predictedBreakDays > 0) {
        const breakDate = new Date();
        breakDate.setDate(breakDate.getDate() + aiPrediction.predictedBreakDays);
        return breakDate;
      }

      return null;
    } catch (error) {
      console.error('Error predicting streak break:', error);
      return null;
    }
  }

  private calculateStreakStrength(streakData: StreakData, averageLength: number, stability: number): number {
    const currentStrengthFactor = Math.min(streakData.currentCount / 30, 1); // Normalize to 30 days
    const qualityFactor = streakData.qualityScore;
    const consistencyFactor = streakData.consistencyScore;
    const stabilityFactor = stability;
    const longevityFactor = Math.min(averageLength / 14, 1); // Normalize to 2 weeks average
    
    return (
      currentStrengthFactor * 0.3 +
      qualityFactor * 0.25 +
      consistencyFactor * 0.25 +
      stabilityFactor * 0.1 +
      longevityFactor * 0.1
    ) * 100;
  }

  private async saveStreakData(streakData: StreakData): Promise<void> {
    const cacheKey = `streak_${streakData.userId}_${streakData.streakType}`;
    await storage.setItem(cacheKey, JSON.stringify(streakData));
    await cacheService.set(cacheKey, streakData, 5 * 60 * 1000); // 5 minutes cache
  }
}

export const streakCalculationService = new StreakCalculationService();