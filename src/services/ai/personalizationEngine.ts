/**
 * Advanced Personalization Engine
 * Sophisticated AI-powered personalization with multi-dimensional user modeling
 */

import { kiroAIService } from './kiroAIService';
import { UserProfile } from '../../types/userProfile';
import { HealthTip } from '../../types/healthTip';
import { storage } from '../../utils/storage';
import { cacheService } from '../cache/cacheService';
import { analyticsService } from '../analytics/analyticsService';

interface UserBehaviorVector {
  categoryPreferences: Record<string, number>;
  difficultyPreferences: Record<string, number>;
  timePreferences: Record<string, number>;
  engagementPatterns: Record<string, number>;
  contentTypePreferences: Record<string, number>;
  moodCorrelations: Record<string, number>;
  goalAlignment: Record<string, number>;
}

interface PersonalizationContext {
  currentMood?: 'energetic' | 'calm' | 'stressed' | 'motivated' | 'tired';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  weatherCondition?: 'sunny' | 'rainy' | 'cloudy' | 'snowy';
  location?: 'home' | 'work' | 'gym' | 'outdoors';
  recentActivity?: string[];
  socialContext?: 'alone' | 'with_friends' | 'with_family';
}

interface PersonalizationResult {
  content: HealthTip[];
  personalizationScore: number;
  reasoning: string[];
  adaptations: string[];
  confidence: number;
  learningInsights: string[];
  nextOptimizations: string[];
}

class PersonalizationEngine {
  private static instance: PersonalizationEngine;
  private userVectors: Map<string, UserBehaviorVector>;
  private learningRate: number = 0.1;
  private contextWeights: Record<string, number>;

  private constructor() {
    this.userVectors = new Map();
    this.contextWeights = {
      mood: 0.25,
      timeOfDay: 0.20,
      recentActivity: 0.15,
      goalAlignment: 0.15,
      socialContext: 0.10,
      weather: 0.08,
      location: 0.07
    };
  }

  static getInstance(): PersonalizationEngine {
    if (!PersonalizationEngine.instance) {
      PersonalizationEngine.instance = new PersonalizationEngine();
    }
    return PersonalizationEngine.instance;
  }

  /**
   * Generate highly personalized content recommendations
   */
  async personalizeContent(
    userId: string,
    candidateContent: HealthTip[],
    context: PersonalizationContext,
    options: {
      maxResults?: number;
      diversityFactor?: number;
      explorationRate?: number;
      adaptToMood?: boolean;
    } = {}
  ): Promise<PersonalizationResult> {
    try {
      const {
        maxResults = 5,
        diversityFactor = 0.3,
        explorationRate = 0.1,
        adaptToMood = true
      } = options;

      // Get or build user behavior vector
      const userVector = await this.getUserBehaviorVector(userId);
      
      // Get user profile for additional context
      const userProfile = await this.getUserProfile(userId);
      
      // Calculate personalization scores for each content item
      const scoredContent = await Promise.all(
        candidateContent.map(async (content) => {
          const score = await this.calculatePersonalizationScore(
            content,
            userVector,
            context,
            userProfile,
            adaptToMood
          );
          
          return {
            content,
            score: score.totalScore,
            reasoning: score.reasoning,
            adaptations: score.adaptations,
            confidence: score.confidence
          };
        })
      );

      // Apply diversity and exploration
      const diversifiedContent = this.applyDiversityAndExploration(
        scoredContent,
        diversityFactor,
        explorationRate,
        maxResults
      );

      // Generate learning insights
      const learningInsights = await this.generateLearningInsights(
        userId,
        diversifiedContent,
        context
      );

      // Prepare result
      const result: PersonalizationResult = {
        content: diversifiedContent.map(item => item.content),
        personalizationScore: this.calculateOverallScore(diversifiedContent),
        reasoning: this.aggregateReasoning(diversifiedContent),
        adaptations: this.aggregateAdaptations(diversifiedContent),
        confidence: this.calculateOverallConfidence(diversifiedContent),
        learningInsights,
        nextOptimizations: await this.generateOptimizationSuggestions(userId, userVector)
      };

      // Track personalization analytics
      await this.trackPersonalizationMetrics(userId, result, context);

      return result;

    } catch (error) {
      console.error('Error in personalization engine:', error);
      throw new Error('Failed to personalize content');
    }
  }

  /**
   * Update user behavior vector based on interaction
   */
  async updateUserBehavior(
    userId: string,
    interaction: {
      contentId: string;
      interactionType: 'view' | 'like' | 'bookmark' | 'share' | 'complete' | 'skip';
      timeSpent: number;
      context: PersonalizationContext;
      feedback?: 'positive' | 'negative';
      rating?: number;
    }
  ): Promise<void> {
    try {
      const userVector = await this.getUserBehaviorVector(userId);
      const content = await this.getContentById(interaction.contentId);
      
      if (!content) return;

      // Update category preferences
      const categoryWeight = this.getInteractionWeight(interaction.interactionType);
      userVector.categoryPreferences[content.category] = 
        (userVector.categoryPreferences[content.category] || 0.5) + 
        (categoryWeight * this.learningRate);

      // Update difficulty preferences
      userVector.difficultyPreferences[content.difficulty] = 
        (userVector.difficultyPreferences[content.difficulty] || 0.5) + 
        (categoryWeight * this.learningRate);

      // Update time preferences
      const timeKey = interaction.context.timeOfDay;
      userVector.timePreferences[timeKey] = 
        (userVector.timePreferences[timeKey] || 0.5) + 
        (categoryWeight * this.learningRate);

      // Update engagement patterns
      const engagementScore = this.calculateEngagementScore(interaction);
      userVector.engagementPatterns[interaction.interactionType] = 
        (userVector.engagementPatterns[interaction.interactionType] || 0.5) + 
        (engagementScore * this.learningRate);

      // Update mood correlations if mood is available
      if (interaction.context.currentMood) {
        const moodKey = `${interaction.context.currentMood}_${content.category}`;
        userVector.moodCorrelations[moodKey] = 
          (userVector.moodCorrelations[moodKey] || 0.5) + 
          (categoryWeight * this.learningRate);
      }

      // Normalize vectors to prevent drift
      this.normalizeUserVector(userVector);

      // Save updated vector
      await this.saveUserBehaviorVector(userId, userVector);

      // Update AI service with feedback if available
      if (interaction.feedback) {
        await kiroAIService.recordFeedback(
          userId,
          `personalization-${Date.now()}`,
          interaction.contentId,
          interaction.feedback
        );
      }

    } catch (error) {
      console.error('Error updating user behavior:', error);
    }
  }
}