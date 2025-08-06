/**
 * KIRO AI Service
 * Enhanced AI integration with OpenAI and robust error handling
 */

import OpenAI from 'openai';
import { HealthTip, HealthTipCategory, DifficultyLevel } from '../../models/HealthTip';
import { loggingService } from '../logging/loggingService';
import { cacheService } from '../cache/cacheService';

export interface KiroAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retryAttempts: number;
  fallbackEnabled: boolean;
}

export interface AICallMetrics {
  requestId: string;
  userId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTime: number;
  model: string;
  success: boolean;
  fallbackUsed: boolean;
  errorType?: string;
}

export interface AIResponse {
  tips: HealthTip[];
  personalizationScore: number;
  reasoning: string;
  adaptationStrategy: string;
  followUpSuggestions: string[];
  confidence: number;
  metrics: AICallMetrics;
}

class KiroAIService {
  private static instance: KiroAIService;
  private config: KiroAIConfig;
  private openai: OpenAI | null = null;
  private requestQueue: Map<string, Promise<AIResponse>> = new Map();
  private isInitialized = false;

  private constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2500'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.OPENAI_RETRY_ATTEMPTS || '3'),
      fallbackEnabled: process.env.OPENAI_FALLBACK_ENABLED !== 'false',
    };
    
    this.initializeOpenAI();
  }

  private initializeOpenAI(): void {
    try {
      if (!this.config.apiKey) {
        console.warn('OpenAI API key not found. AI features will use fallback mode.');
        return;
      }

      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
      });
      
      this.isInitialized = true;
      console.log('OpenAI client initialized successfully for KIRO AI Service');
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.openai = null;
      this.isInitialized = false;
    }
  }

  public static getInstance(): KiroAIService {
    if (!KiroAIService.instance) {
      KiroAIService.instance = new KiroAIService();
    }
    return KiroAIService.instance;
  }

  /**
   * Generate personalized health tips using OpenAI
   */
  async generatePersonalizedTips(
    userId: string,
    profile: any,
    engagementData: any,
    recentActivity: any,
    options: {
      count?: number;
      category?: string;
      mood?: string;
      urgency?: 'low' | 'medium' | 'high';
      forceRefresh?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Check cache first (unless force refresh)
      if (!options.forceRefresh) {
        const cacheKey = this.buildCacheKey(userId, options);
        const cachedResponse = await cacheService.get<AIResponse>(cacheKey);
        if (cachedResponse) {
          await loggingService.logInfo('Returned cached AI response', {
            userId,
            requestId,
            cacheHit: true,
          });
          return cachedResponse;
        }
      }

      // Check if similar request is already in progress
      const queueKey = `${userId}-${JSON.stringify(options)}`;
      if (this.requestQueue.has(queueKey)) {
        await loggingService.logInfo('Returning queued AI request', { userId, requestId });
        return await this.requestQueue.get(queueKey)!;
      }

      // Create and queue the request
      const requestPromise = this.executeAIRequest(userId, profile, engagementData, recentActivity, options, requestId, startTime);
      this.requestQueue.set(queueKey, requestPromise);

      try {
        const response = await requestPromise;
        return response;
      } finally {
        this.requestQueue.delete(queueKey);
      }
    } catch (error) {
      await loggingService.logError('AI personalization request failed', error as Error, {
        userId,
        requestId,
        options,
      });
      throw error;
    }
  }

  /**
   * Execute AI request with comprehensive error handling
   */
  private async executeAIRequest(
    userId: string,
    profile: any,
    engagementData: any,
    recentActivity: any,
    options: any,
    requestId: string,
    startTime: number
  ): Promise<AIResponse> {
    let attempt = 0;
    let lastError: Error | null = null;

    // Check if OpenAI is available
    if (!this.isInitialized || !this.openai) {
      if (this.config.fallbackEnabled) {
        return await this.generateFallbackResponse(userId, profile, engagementData, options, requestId, startTime);
      }
      throw new Error('OpenAI service not available and fallback disabled');
    }

    while (attempt < this.config.retryAttempts) {
      attempt++;
      
      try {
        // Build prompts
        const systemPrompt = this.buildSystemPrompt(profile, options);
        const userPrompt = this.buildUserPrompt(userId, profile, engagementData, recentActivity, options);

        // Make OpenAI API call
        const completion = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: 'json_object' }
        });

        // Process and validate response
        const processedResponse = await this.processAIResponse(
          completion,
          requestId,
          startTime
        );

        // Cache successful response
        const cacheKey = this.buildCacheKey(userId, options);
        const cacheTTL = this.calculateCacheTTL(processedResponse.confidence);
        await cacheService.set(cacheKey, processedResponse, cacheTTL);

        await loggingService.logInfo('AI personalization successful', {
          userId,
          requestId,
          attempt,
          personalizationScore: processedResponse.personalizationScore,
          confidence: processedResponse.confidence,
          responseTime: Date.now() - startTime,
        });

        return processedResponse;

      } catch (error) {
        lastError = error as Error;
        
        await loggingService.logWarning(`AI request attempt ${attempt} failed`, {
          userId,
          requestId,
          attempt,
          error: lastError.message,
          willRetry: attempt < this.config.retryAttempts,
        });

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All attempts failed, try fallback if enabled
    if (this.config.fallbackEnabled) {
      await loggingService.logWarning('All AI attempts failed, using fallback', {
        userId,
        requestId,
        lastError: lastError?.message,
      });

      return await this.generateFallbackResponse(userId, profile, engagementData, options, requestId, startTime);
    }

    throw lastError || new Error('AI request failed after all attempts');
  }

  /**
   * Build system prompt for OpenAI
   */
  private buildSystemPrompt(profile: any, options: any): string {
    return `You are a personalized health and wellness AI assistant. Generate personalized health tips based on user profile and preferences.

IMPORTANT: Respond with valid JSON in this exact format:
{
  "tips": [
    {
      "id": "unique_id",
      "title": "Tip Title",
      "content": "Detailed tip content (50-150 words)",
      "category": "nutrition|fitness|mental_wellness|sleep|recovery|hygiene|general",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedReadTime": 3,
      "tags": ["tag1", "tag2"],
      "personalizedReason": "Why this tip is personalized for this user",
      "confidenceScore": 0.8,
      "actionItems": ["action 1", "action 2"],
      "motivationalHook": "Motivational message"
    }
  ],
  "personalizationScore": 0.85,
  "reasoning": "Overall explanation of personalization approach",
  "adaptationStrategy": "How tips were adapted for this user",
  "followUpSuggestions": ["suggestion 1", "suggestion 2"]
}

Guidelines:
- Provide practical, actionable health tips
- Consider user's profile and preferences
- Ensure tips are appropriate for their level
- Include specific personalization reasons
- Focus on evidence-based health advice
- Keep content concise but informative`;
  }

  /**
   * Build user prompt for OpenAI
   */
  private buildUserPrompt(
    userId: string,
    profile: any,
    engagementData: any,
    recentActivity: any,
    options: any
  ): string {
    const count = options.count || 3;
    const category = options.category ? ` in the ${options.category} category` : '';
    const mood = options.mood ? ` considering the user's current mood: ${options.mood}` : '';
    const urgency = options.urgency ? ` with ${options.urgency} urgency` : '';

    return `Generate ${count} personalized health tips${category}${mood}${urgency} for this user:

User Profile: ${JSON.stringify(profile, null, 2)}

Recent Engagement: ${JSON.stringify(engagementData, null, 2)}

Recent Activity: ${JSON.stringify(recentActivity, null, 2)}

Please provide highly personalized, actionable health tips that match their interests and current situation.`;
  }

  /**
   * Process and validate AI response
   */
  private async processAIResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    requestId: string,
    startTime: number
  ): Promise<AIResponse> {
    const responseTime = Date.now() - startTime;
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from OpenAI service');
    }

    let content: any;
    try {
      content = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Invalid JSON response from AI service');
    }

    // Validate response structure
    if (!content.tips || !Array.isArray(content.tips)) {
      throw new Error('Invalid AI response: missing or invalid tips array');
    }

    // Process tips into HealthTip format
    const processedTips: HealthTip[] = content.tips.map((tip: any, index: number) => ({
      id: `ai-${requestId}-${index}`,
      title: tip.title || 'Untitled Tip',
      content: tip.content || 'No content provided',
      category: this.mapCategory(tip.category) || HealthTipCategory.GENERAL,
      difficulty: this.mapDifficulty(tip.difficulty) || DifficultyLevel.BEGINNER,
      estimatedReadTime: tip.estimatedReadTime || 3,
      tags: Array.isArray(tip.tags) ? tip.tags : ['health'],
      imageUrl: null,
      author: 'ai-assistant',
      isActive: true,
      priority: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        views: 0,
        likes: 0,
        bookmarks: 0,
        completions: 0,
        shares: 0,
        averageRating: 0,
        ratingCount: 0,
        engagementScore: 0
      },
      viewCount: 0,
      shareCount: 0,
      // AI-specific fields
      personalizedReason: tip.personalizedReason || 'Personalized for you',
      confidenceScore: tip.confidenceScore || 0.8,
      actionItems: tip.actionItems || [],
      motivationalHook: tip.motivationalHook || '',
    }));

    // Calculate overall confidence
    const avgConfidence = processedTips.reduce((sum, tip) => sum + (tip.confidenceScore || 0.8), 0) / processedTips.length;

    // Build metrics
    const metrics: AICallMetrics = {
      requestId,
      userId: 'unknown', // Will be set by caller
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      responseTime,
      model: completion.model || this.config.model,
      success: true,
      fallbackUsed: false,
    };

    return {
      tips: processedTips,
      personalizationScore: content.personalizationScore || 0.8,
      reasoning: content.reasoning || 'Personalized based on your profile and preferences',
      adaptationStrategy: content.adaptationStrategy || 'Adapted to your communication style and preferences',
      followUpSuggestions: content.followUpSuggestions || [],
      confidence: avgConfidence,
      metrics,
    };
  }

  /**
   * Map category string to HealthTipCategory enum
   */
  private mapCategory(category: string): HealthTipCategory {
    const categoryMap: Record<string, HealthTipCategory> = {
      'nutrition': HealthTipCategory.NUTRITION,
      'fitness': HealthTipCategory.FITNESS,
      'mental_wellness': HealthTipCategory.MENTAL_WELLNESS,
      'sleep': HealthTipCategory.SLEEP,
      'recovery': HealthTipCategory.RECOVERY,
      'hygiene': HealthTipCategory.HYGIENE,
      'general': HealthTipCategory.GENERAL
    };
    
    return categoryMap[category?.toLowerCase()] || HealthTipCategory.GENERAL;
  }

  /**
   * Map difficulty string to DifficultyLevel enum
   */
  private mapDifficulty(difficulty: string): DifficultyLevel {
    const difficultyMap: Record<string, DifficultyLevel> = {
      'beginner': DifficultyLevel.BEGINNER,
      'intermediate': DifficultyLevel.INTERMEDIATE,
      'advanced': DifficultyLevel.ADVANCED
    };
    
    return difficultyMap[difficulty?.toLowerCase()] || DifficultyLevel.BEGINNER;
  }

  /**
   * Generate fallback response when AI fails
   */
  private async generateFallbackResponse(
    userId: string,
    profile: any,
    engagementData: any,
    options: any,
    requestId: string,
    startTime: number
  ): Promise<AIResponse> {
    try {
      const count = options.count || 3;
      
      // Generate rule-based tips
      const fallbackTips = this.generateGenericTips(count, options.category);

      const metrics: AICallMetrics = {
        requestId,
        userId,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        responseTime: Date.now() - startTime,
        model: 'fallback-rule-based',
        success: true,
        fallbackUsed: true,
      };

      return {
        tips: fallbackTips,
        personalizationScore: 0.6,
        reasoning: 'Generated using rule-based fallback system due to AI service unavailability',
        adaptationStrategy: 'Basic filtering based on user interests and preferences',
        followUpSuggestions: ['Try refreshing for AI-powered recommendations', 'Update your profile for better personalization'],
        confidence: 0.6,
        metrics,
      };

    } catch (fallbackError) {
      await loggingService.logError('Fallback generation failed', fallbackError as Error, {
        userId,
        requestId,
      });

      // Ultimate fallback - return generic tips
      return this.generateGenericFallback(userId, requestId, startTime);
    }
  }

  /**
   * Generate generic tips for fallback
   */
  private generateGenericTips(count: number, category?: string): HealthTip[] {
    const allTips = [
      {
        id: 'fallback-hydration',
        title: 'Stay Hydrated Throughout the Day',
        content: 'Drinking adequate water is essential for maintaining good health. Aim for 8 glasses of water daily to keep your body properly hydrated and support optimal organ function.',
        category: HealthTipCategory.NUTRITION,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        tags: ['hydration', 'health', 'daily'],
        personalizedReason: 'Hydration is fundamental for everyone',
        confidenceScore: 0.9,
        actionItems: ['Set water reminders', 'Carry a water bottle']
      },
      {
        id: 'fallback-walking',
        title: 'Take a Post-Meal Walk',
        content: 'Take a 10-minute walk after meals to aid digestion and regulate blood sugar levels. This simple habit can significantly improve your metabolic health.',
        category: HealthTipCategory.FITNESS,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        tags: ['walking', 'exercise', 'digestion'],
        personalizedReason: 'Light exercise benefits everyone',
        confidenceScore: 0.8,
        actionItems: ['Set post-meal reminders', 'Find walking routes']
      },
      {
        id: 'fallback-breathing',
        title: 'Practice Deep Breathing',
        content: 'Practice deep breathing for 5 minutes before bed to activate your parasympathetic nervous system and improve sleep quality.',
        category: HealthTipCategory.MENTAL_WELLNESS,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 3,
        tags: ['breathing', 'stress', 'mindfulness'],
        personalizedReason: 'Stress reduction is universally beneficial',
        confidenceScore: 0.85,
        actionItems: ['Learn 4-7-8 breathing technique', 'Create bedtime routine']
      },
      {
        id: 'fallback-sleep',
        title: 'Maintain a Sleep Schedule',
        content: 'Aim for 7-9 hours of quality sleep each night. Consistent sleep schedule supports immune function, mental clarity, and emotional regulation.',
        category: HealthTipCategory.SLEEP,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        tags: ['sleep', 'schedule', 'health'],
        personalizedReason: 'Sleep is essential for health',
        confidenceScore: 0.9,
        actionItems: ['Set consistent bedtime', 'Create sleep-friendly environment']
      },
      {
        id: 'fallback-stretching',
        title: 'Morning Stretching Routine',
        content: 'Stretch for 5 minutes when you wake up to improve circulation, reduce stiffness, and energize your body for the day ahead.',
        category: HealthTipCategory.RECOVERY,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        tags: ['stretching', 'morning', 'flexibility'],
        personalizedReason: 'Movement helps everyone start the day',
        confidenceScore: 0.75,
        actionItems: ['Learn basic stretches', 'Set morning routine']
      }
    ];

    // Filter by category if specified
    let filteredTips = category ? 
      allTips.filter(tip => tip.category.toLowerCase() === category.toLowerCase()) : 
      allTips;

    // If no tips match the category, use all tips
    if (filteredTips.length === 0) {
      filteredTips = allTips;
    }

    // Convert to full HealthTip format and return requested count
    return filteredTips.slice(0, count).map(tip => ({
      ...tip,
      imageUrl: null,
      author: 'fallback-system',
      isActive: true,
      priority: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        views: 0,
        likes: 0,
        bookmarks: 0,
        completions: 0,
        shares: 0,
        averageRating: 0,
        ratingCount: 0,
        engagementScore: 0
      },
      viewCount: 0,
      shareCount: 0,
      motivationalHook: 'Take a small step towards better health today!'
    }));
  }

  /**
   * Generate generic fallback when everything fails
   */
  private generateGenericFallback(userId: string, requestId: string, startTime: number): AIResponse {
    const genericTips: HealthTip[] = [
      {
        id: `generic-${requestId}-1`,
        title: 'Stay Hydrated Throughout the Day',
        content: 'Drinking adequate water is essential for maintaining good health. Aim for 8 glasses of water daily to keep your body properly hydrated and support optimal organ function.',
        category: HealthTipCategory.NUTRITION,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        tags: ['hydration', 'health', 'daily'],
        imageUrl: null,
        author: 'system-fallback',
        isActive: true,
        priority: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
        viewCount: 0,
        shareCount: 0,
        confidenceScore: 0.8,
      },
      {
        id: `generic-${requestId}-2`,
        title: 'Take Deep Breaths for Stress Relief',
        content: 'Practice deep breathing exercises for 5 minutes daily. Inhale slowly for 4 counts, hold for 4 counts, then exhale for 6 counts. This simple technique can significantly reduce stress and anxiety.',
        category: HealthTipCategory.MENTAL_WELLNESS,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 3,
        tags: ['breathing', 'stress', 'mindfulness'],
        imageUrl: null,
        author: 'system-fallback',
        isActive: true,
        priority: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
        viewCount: 0,
        shareCount: 0,
        confidenceScore: 0.8,
      },
      {
        id: `generic-${requestId}-3`,
        title: 'Get Moving with a Short Walk',
        content: 'Take a 10-minute walk after meals to improve digestion and boost energy. Even light physical activity can have significant benefits for your overall health and wellbeing.',
        category: HealthTipCategory.FITNESS,
        difficulty: DifficultyLevel.BEGINNER,
        estimatedReadTime: 2,
        tags: ['walking', 'exercise', 'energy'],
        imageUrl: null,
        author: 'system-fallback',
        isActive: true,
        priority: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          views: 0,
          likes: 0,
          bookmarks: 0,
          completions: 0,
          shares: 0,
          averageRating: 0,
          ratingCount: 0,
          engagementScore: 0
        },
        viewCount: 0,
        shareCount: 0,
        confidenceScore: 0.8,
      },
    ];

    const metrics: AICallMetrics = {
      requestId,
      userId,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      responseTime: Date.now() - startTime,
      model: 'generic-fallback',
      success: true,
      fallbackUsed: true,
      errorType: 'complete_system_failure',
    };

    return {
      tips: genericTips,
      personalizationScore: 0.3,
      reasoning: 'Generic recommendations due to system limitations',
      adaptationStrategy: 'Basic health tips suitable for all users',
      followUpSuggestions: ['Check your internet connection', 'Try again later', 'Contact support if issues persist'],
      confidence: 0.3,
      metrics,
    };
  }

  /**
   * Record AI feedback for model improvement
   */
  async recordFeedback(
    userId: string,
    requestId: string,
    tipId: string,
    feedback: 'positive' | 'negative',
    reason?: string
  ): Promise<void> {
    try {
      // For now, just log the feedback locally
      // In a production system, this would be sent to a feedback collection service
      await loggingService.logInfo('AI feedback recorded', {
        userId,
        requestId,
        tipId,
        feedback,
        reason,
        timestamp: new Date().toISOString(),
        context: 'health-tips-personalization-openai',
      });

      // TODO: Implement feedback collection service integration
      // This could be sent to a database or analytics service for model improvement

    } catch (error) {
      await loggingService.logWarning('Failed to record AI feedback', {
        userId,
        requestId,
        tipId,
        feedback,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get AI service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastError?: string;
    uptime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.healthCheck();
      const responseTime = Date.now() - startTime;

      if (isHealthy) {
        return {
          status: 'healthy',
          responseTime,
          uptime: 1, // OpenAI uptime is managed by OpenAI
        };
      } else {
        return {
          status: this.isInitialized ? 'degraded' : 'unhealthy',
          responseTime,
          lastError: this.isInitialized ? 'Health check failed' : 'OpenAI not initialized',
          uptime: 0,
        };
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastError: (error as Error).message,
        uptime: 0,
      };
    }
  }

  // Helper methods

  private generateRequestId(): string {
    return `kiro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildCacheKey(userId: string, options: any): string {
    const optionsHash = JSON.stringify(options);
    return `ai-personalized-tips:${userId}:${Buffer.from(optionsHash).toString('base64')}`;
  }

  private calculateCacheTTL(confidence: number): number {
    // Higher confidence = longer cache time
    let baseTTL = 1800; // 30 minutes

    if (confidence > 0.9) baseTTL *= 2;
    if (confidence < 0.6) baseTTL /= 2;

    // Shorter cache during peak hours
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 10) baseTTL /= 2; // Morning rush
    if (hour >= 17 && hour <= 20) baseTTL /= 2; // Evening rush

    return baseTTL;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(aiInput: any, limit: number): Promise<any> {
    try {
      if (!this.isInitialized || !this.openai) {
        return { recommendations: [] };
      }

      const systemPrompt = `You are a health AI assistant. Analyze user data and provide personalized health tip recommendations.

Respond with JSON in this format:
{
  "recommendations": [
    {
      "tipId": "unique_id",
      "score": 0.8,
      "confidence": 0.9,
      "reasoning": ["reason 1", "reason 2"]
    }
  ]
}`;

      const userPrompt = `Analyze this user data and recommend health tips: ${JSON.stringify(aiInput)}`;

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        return JSON.parse(response);
      }

      return { recommendations: [] };
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return { recommendations: [] };
    }
  }

  /**
   * Identify behavior patterns
   */
  async identifyBehaviorPatterns(aiInput: any): Promise<any> {
    try {
      if (!this.isInitialized || !this.openai) {
        return { patterns: [] };
      }

      const systemPrompt = `You are a behavioral analysis AI. Identify patterns in user health interactions.

Respond with JSON in this format:
{
  "patterns": [
    {
      "description": "Pattern description",
      "frequency": 0.8,
      "confidence": 0.9,
      "context": "Pattern context"
    }
  ]
}`;

      const userPrompt = `Analyze these user interactions for behavioral patterns: ${JSON.stringify(aiInput)}`;

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        return JSON.parse(response);
      }

      return { patterns: [] };
    } catch (error) {
      console.error('Error identifying behavior patterns:', error);
      return { patterns: [] };
    }
  }

  /**
   * Generate AI insights based on provided data
   */
  public async generateInsights(
    prompt: string,
    options: {
      userId?: string;
      context?: Record<string, any>;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<any> {
    const requestId = this.generateRequestId();
    
    try {
      if (!this.isInitialized || !this.openai) {
        // Return fallback insights
        return {
          analysis: 'Based on the provided data, patterns suggest monitoring current trends.',
          recommendations: [
            'Consider adjusting intake timing',
            'Monitor for potential interactions',
            'Track mood and energy levels'
          ],
          confidence: 0.6,
          timestamp: new Date().toISOString(),
          requestId,
          fallback: true
        };
      }

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a health AI assistant. Analyze the provided data and generate actionable insights.' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500
      });

      const response = completion.choices[0]?.message?.content;
      
      if (response) {
        const insights = {
          analysis: response,
          recommendations: [
            'Consider adjusting intake timing',
            'Monitor for potential interactions',
            'Track mood and energy levels'
          ],
          confidence: 0.8,
          timestamp: new Date().toISOString(),
          requestId
        };

        await loggingService.logInfo('Generated AI insights', {
          userId: options.userId,
          requestId,
          promptLength: prompt.length
        });

        return insights;
      }

      throw new Error('No response from AI service');
    } catch (error) {
      await loggingService.logError('Failed to generate AI insights', error as Error, {
        userId: options.userId,
        requestId,
        prompt: prompt.substring(0, 100) + '...'
      });
      
      // Return fallback insights
      return {
        analysis: 'Unable to generate AI insights at this time. Please try again later.',
        recommendations: [
          'Review your recent intake patterns',
          'Consider consulting with a healthcare provider',
          'Monitor how you feel after intake'
        ],
        confidence: 0.3,
        timestamp: new Date().toISOString(),
        requestId,
        fallback: true,
        error: (error as Error).message
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.openai) {
        return false;
      }

      // Simple test call to verify OpenAI is working
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'user', content: 'Respond with "OK" if you can hear me.' }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const response = completion.choices[0]?.message?.content;
      return response?.toLowerCase().includes('ok') || false;
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  }
}

export const kiroAIService = KiroAIService.getInstance();