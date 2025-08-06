import { multiProviderAIService } from './ai/MultiProviderAIService';
import { AIMessage } from './ai/providers/AIProvider';
import { userPreferencesService } from './preferences/userPreferencesService';
import { substanceDatabase } from './substance/substanceDatabase';

export interface Personalization {
  id: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  model: string;
  created_at: Date;
}

export class AIServiceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// AI Service configuration interface
interface AIConfig {
  fallbackEnabled: boolean;
  cacheEnabled: boolean;
  retryAttempts: number;
}

class AIPersonalizationService {
  private cache = new Map<string, { data: Personalization[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 2;
  private config: AIConfig;

  constructor() {
    this.config = {
      fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== 'false',
      cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
      retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '2')
    };
  }

  async getUserPersonalizations(userId: string, limit = 10): Promise<Personalization[]> {
    const cacheKey = `${userId}_${limit}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.fetchPersonalizations(userId, limit);
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.MAX_RETRIES && this.isRetryableError(error)) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }

    throw new AIServiceError(
      `Failed to get personalizations after ${this.MAX_RETRIES + 1} attempts`,
      lastError || undefined
    );
  }

  private async fetchPersonalizations(userId: string, limit: number): Promise<Personalization[]> {
    // Check if any AI provider is available
    if (!multiProviderAIService.isAnyProviderAvailable()) {
      console.warn('No AI providers available, using fallback recommendations');
      return this.generateFallbackPersonalizations(userId, limit);
    }

    try {
      // Get user preferences and recent intakes
      const [preferences, recentIntakes] = await Promise.all([
        userPreferencesService.getUserPreferences(userId),
        substanceDatabase.getRecentIntakes(userId, 10)
      ]);

      const inputData = {
        userId,
        preferences: {
          categories: preferences.content.categories,
          difficulty: preferences.content.difficulty,
          personalizedContent: preferences.content.personalizedContent
        },
        recentIntakes: recentIntakes.map(intake => ({
          substance: intake.substance_name,
          category: intake.category,
          timestamp: intake.logged_at
        })),
        requestedCount: limit
      };

      // Create personalized prompts
      const systemPrompt = this.buildSystemPrompt(preferences, recentIntakes);
      const userPrompt = this.buildUserPrompt(inputData, limit);

      // Prepare messages for AI providers
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];

      // Call AI service (will automatically select best available provider)
      const aiResponse = await multiProviderAIService.generateCompletion(messages);

      if (!aiResponse.content) {
        throw new Error('No response from AI service');
      }

      let outputData: any;
      try {
        outputData = JSON.parse(aiResponse.content);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Fallback to text response
        outputData = { 
          recommendations: [{ 
            tip: aiResponse.content, 
            category: 'general', 
            confidence: 0.7 
          }], 
          raw: true 
        };
      }

      // Create personalization records
      const personalizations: Personalization[] = [];
      const basePersonalization = {
        id: this.generateId(),
        input_data: inputData,
        output_data: outputData,
        model: aiResponse.model,
        created_at: new Date()
      };

      // Process recommendations
      if (outputData.recommendations && Array.isArray(outputData.recommendations)) {
        outputData.recommendations.slice(0, limit).forEach((recommendation: any, index: number) => {
          personalizations.push({
            ...basePersonalization,
            id: this.generateId(),
            output_data: { 
              recommendation: {
                ...recommendation,
                personalizedReason: recommendation.reason || 'Personalized based on your profile',
                confidence: recommendation.confidence || 0.8
              }, 
              index 
            }
          });
        });
      } else {
        personalizations.push(basePersonalization);
      }

      return personalizations;

    } catch (error) {
      console.error('AI API call failed:', error);
      // Fallback to mock recommendations if enabled
      if (this.config.fallbackEnabled) {
        return this.generateFallbackPersonalizations(userId, limit);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, rate limits, and temporary server errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND') {
      return true;
    }
    
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    if (error?.status === 429) { // Rate limit
      return true;
    }
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `pers_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildSystemPrompt(preferences: any, recentIntakes: any[]): string {
    return `You are a personalized health and wellness AI assistant. Your role is to provide tailored health tips based on user preferences and recent activities.

IMPORTANT: You must respond with valid JSON in the following format:
{
  "recommendations": [
    {
      "tip": "Specific health tip text",
      "title": "Brief title for the tip",
      "category": "nutrition|fitness|mentalWellness|sleep|recovery|hygiene|general",
      "difficulty": "beginner|intermediate|advanced",
      "reason": "Why this tip is personalized for this user",
      "confidence": 0.8,
      "actionItems": ["specific action 1", "specific action 2"],
      "estimatedTime": "5 minutes"
    }
  ],
  "personalizationScore": 0.85,
  "reasoning": "Overall explanation of personalization approach"
}

Guidelines:
- Provide practical, actionable health tips
- Consider user's recent activities and preferences
- Ensure tips are appropriate for their stated difficulty level
- Include specific reasons for personalization
- Focus on evidence-based health advice
- Keep tips concise but informative (50-150 words)
- Assign confidence scores based on how well the tip matches the user's profile`;
  }

  private buildUserPrompt(inputData: any, limit: number): string {
    const preferencesText = inputData.preferences ? 
      `User preferences: ${JSON.stringify(inputData.preferences, null, 2)}` : 
      'No specific preferences provided';
    
    const intakesText = inputData.recentIntakes && inputData.recentIntakes.length > 0 ?
      `Recent activities: ${inputData.recentIntakes.map((intake: any) => 
        `${intake.substance} (${intake.category}) on ${intake.timestamp}`
      ).join(', ')}` :
      'No recent activities logged';

    return `Generate ${limit} personalized health tips for this user:

${preferencesText}

${intakesText}

Please provide ${limit} highly personalized health tips that take into account their preferences and recent activities. Focus on actionable advice that fits their lifestyle and interests.`;
  }

  private async generateFallbackPersonalizations(userId: string, limit: number): Promise<Personalization[]> {
    // Generate fallback recommendations when OpenAI is not available
    const fallbackTips = [
      { 
        tip: 'Stay hydrated by drinking 8 glasses of water daily. Proper hydration supports all bodily functions and can improve energy levels and cognitive performance.',
        title: 'Daily Hydration Goal',
        category: 'nutrition', 
        confidence: 0.9,
        reason: 'Hydration is fundamental for everyone',
        actionItems: ['Set water reminders', 'Carry a water bottle'],
        estimatedTime: 'Throughout the day'
      },
      { 
        tip: 'Take a 10-minute walk after meals to aid digestion and regulate blood sugar levels. This simple habit can significantly improve your metabolic health.',
        title: 'Post-Meal Walking',
        category: 'fitness', 
        confidence: 0.8,
        reason: 'Light exercise benefits everyone',
        actionItems: ['Set post-meal reminders', 'Find walking routes'],
        estimatedTime: '10 minutes'
      },
      { 
        tip: 'Practice deep breathing for 5 minutes before bed to activate your parasympathetic nervous system and improve sleep quality.',
        title: 'Bedtime Breathing',
        category: 'mentalWellness', 
        confidence: 0.85,
        reason: 'Stress reduction is universally beneficial',
        actionItems: ['Learn 4-7-8 breathing technique', 'Create bedtime routine'],
        estimatedTime: '5 minutes'
      },
      { 
        tip: 'Aim for 7-9 hours of quality sleep each night. Consistent sleep schedule supports immune function, mental clarity, and emotional regulation.',
        title: 'Quality Sleep Schedule',
        category: 'sleep', 
        confidence: 0.9,
        reason: 'Sleep is essential for health',
        actionItems: ['Set consistent bedtime', 'Create sleep-friendly environment'],
        estimatedTime: '7-9 hours'
      },
      { 
        tip: 'Stretch for 5 minutes when you wake up to improve circulation, reduce stiffness, and energize your body for the day ahead.',
        title: 'Morning Stretching',
        category: 'recovery', 
        confidence: 0.75,
        reason: 'Movement helps everyone start the day',
        actionItems: ['Learn basic stretches', 'Set morning routine'],
        estimatedTime: '5 minutes'
      }
    ];

    const selectedTips = fallbackTips.slice(0, Math.min(limit, fallbackTips.length));
    
    return selectedTips.map((tip, index) => ({
      id: this.generateId(),
      input_data: { userId, fallback: true, requestedCount: limit },
      output_data: { 
        recommendation: tip, 
        index,
        fallbackUsed: true
      },
      model: 'fallback-v1',
      created_at: new Date()
    }));
  }

  // Clear cache for testing
  clearCache(): void {
    this.cache.clear();
  }

  // Method to inject AI client for testing (backward compatibility)
  setOpenAIClient(client: any): void {
    // For backward compatibility with tests
    console.warn('setOpenAIClient is deprecated. Use multiProviderAIService.addProvider instead.');
  }

  // Method to update AI configuration
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Method to check if any AI provider is configured
  isConfigured(): boolean {
    return multiProviderAIService.isAnyProviderAvailable();
  }

  // Method to get current configuration
  getConfig(): AIConfig {
    return { ...this.config };
  }

  // Method to get available AI providers
  getAvailableProviders(): string[] {
    return multiProviderAIService.getAvailableProviderNames();
  }

  // Method to get AI provider usage statistics
  getUsageStats() {
    return multiProviderAIService.getUsageStats();
  }

  // Method to perform health check on all providers
  async healthCheck() {
    return await multiProviderAIService.healthCheck();
  }
}

export const aiPersonalizationService = new AIPersonalizationService();