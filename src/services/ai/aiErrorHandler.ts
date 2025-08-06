/**
 * AI Error Handler
 * Comprehensive error handling for AI service failures with fallback mechanisms
 */

import { healthTipService } from '../content/healthTipService';
import { contentCategorizationService } from '../content/contentCategorizationService';
import { HealthTip, HealthTipCategory } from '../../models/HealthTip';
import { storage } from '../../utils/storage';
import { analyticsService } from '../analytics/analyticsService';

export enum AIErrorType {
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  INVALID_RESPONSE = 'invalid_response',
  AUTHENTICATION_ERROR = 'authentication_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface AIError {
  type: AIErrorType;
  message: string;
  originalError?: Error;
  timestamp: Date;
  retryable: boolean;
  fallbackUsed: boolean;
}

export interface FallbackStrategy {
  name: string;
  priority: number;
  execute: (context: any) => Promise<any>;
  isAvailable: () => Promise<boolean>;
}

class AIErrorHandler {
  private static instance: AIErrorHandler;
  private errorHistory: Map<string, AIError[]>;
  private fallbackStrategies: Map<string, FallbackStrategy[]>;
  private circuitBreaker: Map<string, { failures: number; lastFailure: Date; isOpen: boolean }>;

  private readonly MAX_RETRIES = 3;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly ERROR_HISTORY_LIMIT = 100;

  private constructor() {
    this.errorHistory = new Map();
    this.fallbackStrategies = new Map();
    this.circuitBreaker = new Map();
    this.initializeFallbackStrategies();
  }

  static getInstance(): AIErrorHandler {
    if (!AIErrorHandler.instance) {
      AIErrorHandler.instance = new AIErrorHandler();
    }
    return AIErrorHandler.instance;
  }

  /**
   * Handle AI service error with fallback mechanisms
   */
  async handleError<T>(
    operation: string,
    error: Error,
    context: any,
    fallbackContext?: any
  ): Promise<{ result: T | null; error: AIError; fallbackUsed: boolean }> {
    try {
      // Classify error
      const aiError = this.classifyError(error);
      
      // Record error
      this.recordError(operation, aiError);
      
      // Update circuit breaker
      this.updateCircuitBreaker(operation);
      
      // Check if we should attempt fallback
      if (this.shouldUseFallback(operation, aiError)) {
        const fallbackResult = await this.executeFallback<T>(operation, context, fallbackContext);
        
        if (fallbackResult !== null) {
          aiError.fallbackUsed = true;
          
          // Track successful fallback
          analyticsService.trackEvent('ai_fallback_success', {
            operation,
            errorType: aiError.type,
            fallbackStrategy: 'content_based'
          });
          
          return {
            result: fallbackResult,
            error: aiError,
            fallbackUsed: true
          };
        }
      }

      // Track failed operation
      analyticsService.trackEvent('ai_operation_failed', {
        operation,
        errorType: aiError.type,
        retryable: aiError.retryable
      });

      return {
        result: null,
        error: aiError,
        fallbackUsed: false
      };
    } catch (fallbackError) {
      console.error('Error in AI error handler:', fallbackError);
      
      const criticalError: AIError = {
        type: AIErrorType.UNKNOWN_ERROR,
        message: 'Critical error in AI error handling',
        originalError: fallbackError as Error,
        timestamp: new Date(),
        retryable: false,
        fallbackUsed: false
      };

      return {
        result: null,
        error: criticalError,
        fallbackUsed: false
      };
    }
  }

  /**
   * Execute operation with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: string,
    aiOperation: () => Promise<T>,
    context: any,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(operation)) {
      throw new Error(`Circuit breaker is open for operation: ${operation}`);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await aiOperation();
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(operation);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        const aiError = this.classifyError(lastError);
        
        // Don't retry if error is not retryable
        if (!aiError.retryable) {
          break;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await this.delay(delay);
        
        console.warn(`AI operation ${operation} failed, retrying (${attempt}/${maxRetries})`, error);
      }
    }

    // All retries failed, handle error
    const errorResult = await this.handleError(operation, lastError!, context);
    
    if (errorResult.fallbackUsed && errorResult.result !== null) {
      return errorResult.result;
    }
    
    throw lastError;
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(operation?: string): {
    totalErrors: number;
    errorsByType: Record<AIErrorType, number>;
    recentErrors: AIError[];
    circuitBreakerStatus: Record<string, boolean>;
    fallbackSuccessRate: number;
  } {
    let allErrors: AIError[] = [];
    
    if (operation) {
      allErrors = this.errorHistory.get(operation) || [];
    } else {
      for (const errors of this.errorHistory.values()) {
        allErrors.push(...errors);
      }
    }

    // Count errors by type
    const errorsByType: Record<AIErrorType, number> = {} as Record<AIErrorType, number>;
    Object.values(AIErrorType).forEach(type => {
      errorsByType[type] = 0;
    });
    
    allErrors.forEach(error => {
      errorsByType[error.type]++;
    });

    // Get recent errors (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = allErrors.filter(error => error.timestamp >= oneDayAgo);

    // Calculate fallback success rate
    const errorsWithFallback = allErrors.filter(error => error.fallbackUsed);
    const fallbackSuccessRate = allErrors.length > 0 
      ? errorsWithFallback.length / allErrors.length 
      : 0;

    // Get circuit breaker status
    const circuitBreakerStatus: Record<string, boolean> = {};
    for (const [op, status] of this.circuitBreaker.entries()) {
      circuitBreakerStatus[op] = status.isOpen;
    }

    return {
      totalErrors: allErrors.length,
      errorsByType,
      recentErrors: recentErrors.slice(-10), // Last 10 recent errors
      circuitBreakerStatus,
      fallbackSuccessRate
    };
  }

  /**
   * Reset error history and circuit breakers
   */
  reset(operation?: string): void {
    if (operation) {
      this.errorHistory.delete(operation);
      this.circuitBreaker.delete(operation);
    } else {
      this.errorHistory.clear();
      this.circuitBreaker.clear();
    }
  }  // Pr
// private helper methods
  private classifyError(error: Error): AIError {
    const message = error.message.toLowerCase();
    let type: AIErrorType;
    let retryable = false;

    if (message.includes('timeout') || message.includes('timed out')) {
      type = AIErrorType.TIMEOUT;
      retryable = true;
    } else if (message.includes('rate limit') || message.includes('too many requests')) {
      type = AIErrorType.RATE_LIMIT;
      retryable = true;
    } else if (message.includes('network') || message.includes('connection')) {
      type = AIErrorType.NETWORK_ERROR;
      retryable = true;
    } else if (message.includes('unauthorized') || message.includes('authentication')) {
      type = AIErrorType.AUTHENTICATION_ERROR;
      retryable = false;
    } else if (message.includes('service unavailable') || message.includes('503')) {
      type = AIErrorType.SERVICE_UNAVAILABLE;
      retryable = true;
    } else if (message.includes('invalid') || message.includes('malformed')) {
      type = AIErrorType.INVALID_RESPONSE;
      retryable = false;
    } else {
      type = AIErrorType.UNKNOWN_ERROR;
      retryable = true;
    }

    return {
      type,
      message: error.message,
      originalError: error,
      timestamp: new Date(),
      retryable,
      fallbackUsed: false
    };
  }

  private recordError(operation: string, error: AIError): void {
    const operationErrors = this.errorHistory.get(operation) || [];
    operationErrors.push(error);

    // Keep only recent errors
    if (operationErrors.length > this.ERROR_HISTORY_LIMIT) {
      operationErrors.splice(0, operationErrors.length - this.ERROR_HISTORY_LIMIT);
    }

    this.errorHistory.set(operation, operationErrors);
  }

  private updateCircuitBreaker(operation: string): void {
    const status = this.circuitBreaker.get(operation) || {
      failures: 0,
      lastFailure: new Date(),
      isOpen: false
    };

    status.failures++;
    status.lastFailure = new Date();

    if (status.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      status.isOpen = true;
    }

    this.circuitBreaker.set(operation, status);
  }

  private isCircuitBreakerOpen(operation: string): boolean {
    const status = this.circuitBreaker.get(operation);
    
    if (!status || !status.isOpen) {
      return false;
    }

    // Check if timeout has passed
    const timeSinceLastFailure = Date.now() - status.lastFailure.getTime();
    if (timeSinceLastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
      // Reset circuit breaker
      status.isOpen = false;
      status.failures = 0;
      this.circuitBreaker.set(operation, status);
      return false;
    }

    return true;
  }

  private resetCircuitBreaker(operation: string): void {
    const status = this.circuitBreaker.get(operation);
    if (status) {
      status.failures = 0;
      status.isOpen = false;
      this.circuitBreaker.set(operation, status);
    }
  }

  private shouldUseFallback(operation: string, error: AIError): boolean {
    // Always use fallback for certain error types
    if ([
      AIErrorType.SERVICE_UNAVAILABLE,
      AIErrorType.TIMEOUT,
      AIErrorType.NETWORK_ERROR
    ].includes(error.type)) {
      return true;
    }

    // Use fallback if circuit breaker is open
    if (this.isCircuitBreakerOpen(operation)) {
      return true;
    }

    // Use fallback for unknown errors
    if (error.type === AIErrorType.UNKNOWN_ERROR) {
      return true;
    }

    return false;
  }

  private async executeFallback<T>(
    operation: string,
    context: any,
    fallbackContext?: any
  ): Promise<T | null> {
    const strategies = this.fallbackStrategies.get(operation) || [];
    
    // Sort strategies by priority
    const sortedStrategies = strategies.sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      try {
        // Check if strategy is available
        const isAvailable = await strategy.isAvailable();
        if (!isAvailable) {
          continue;
        }

        // Execute fallback strategy
        const result = await strategy.execute(fallbackContext || context);
        
        if (result !== null) {
          console.log(`Fallback strategy '${strategy.name}' succeeded for operation '${operation}'`);
          return result;
        }
      } catch (fallbackError) {
        console.warn(`Fallback strategy '${strategy.name}' failed:`, fallbackError);
        continue;
      }
    }

    return null;
  }

  private initializeFallbackStrategies(): void {
    // Personalized recommendations fallback
    this.fallbackStrategies.set('getPersonalizedRecommendations', [
      {
        name: 'trending_content',
        priority: 1,
        execute: async (context) => {
          const { userId, limit } = context;
          const trendingTips = await healthTipService.getTrendingTips(limit);
          
          // Convert to PersonalizationRecommendation format
          return trendingTips.map((tip, index) => ({
            tipId: tip.id,
            score: 0.7 - (index * 0.05),
            confidence: 0.6,
            reasoning: ['Trending content'],
            category: tip.category,
            personalizedRank: index + 1
          }));
        },
        isAvailable: async () => true
      },
      {
        name: 'category_based',
        priority: 2,
        execute: async (context) => {
          const { userId, limit } = context;
          const recommendations = await contentCategorizationService.getRecommendedCategories(userId);
          
          if (recommendations.length === 0) return null;
          
          const topCategory = recommendations[0].category;
          const categoryTips = await healthTipService.getTipsByCategory(topCategory, limit);
          
          return categoryTips.map((tip, index) => ({
            tipId: tip.id,
            score: 0.6 - (index * 0.03),
            confidence: 0.5,
            reasoning: [`Popular in ${topCategory}`],
            category: tip.category,
            personalizedRank: index + 1
          }));
        },
        isAvailable: async () => true
      },
      {
        name: 'general_recommendations',
        priority: 3,
        execute: async (context) => {
          const { userId, limit } = context;
          const generalTips = await healthTipService.getRecommendedTips(userId, limit);
          
          return generalTips.map((tip, index) => ({
            tipId: tip.id,
            score: 0.5 - (index * 0.02),
            confidence: 0.4,
            reasoning: ['General recommendation'],
            category: tip.category,
            personalizedRank: index + 1
          }));
        },
        isAvailable: async () => true
      }
    ]);

    // Behavior pattern identification fallback
    this.fallbackStrategies.set('identifyBehaviorPatterns', [
      {
        name: 'simple_pattern_analysis',
        priority: 1,
        execute: async (context) => {
          const { interactions } = context;
          
          if (!interactions || interactions.length < 5) {
            return { patterns: [] };
          }

          // Simple pattern analysis
          const patterns = [];
          
          // Time-based patterns
          const hourCounts: Record<number, number> = {};
          interactions.forEach((interaction: any) => {
            const hour = new Date(interaction.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          });

          const peakHour = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)[0];

          if (peakHour && parseInt(peakHour[1] as string) >= 3) {
            patterns.push({
              description: `Most active around ${peakHour[0]}:00`,
              frequency: parseInt(peakHour[1] as string),
              confidence: 0.7,
              context: 'time_based'
            });
          }

          // Interaction type patterns
          const typeCounts: Record<string, number> = {};
          interactions.forEach((interaction: any) => {
            typeCounts[interaction.interactionType] = 
              (typeCounts[interaction.interactionType] || 0) + 1;
          });

          const dominantType = Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)[0];

          if (dominantType && parseInt(dominantType[1] as string) >= interactions.length * 0.4) {
            patterns.push({
              description: `Prefers ${dominantType[0]} interactions`,
              frequency: parseInt(dominantType[1] as string),
              confidence: 0.6,
              context: 'interaction_type'
            });
          }

          return { patterns };
        },
        isAvailable: async () => true
      }
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiErrorHandler = AIErrorHandler.getInstance();