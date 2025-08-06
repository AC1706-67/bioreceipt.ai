/**
 * Predictive Analytics Engine
 * ML-powered forecasting for health outcomes and risk prediction
 */

import { SubstanceIntake } from '../../models/SubstanceIntake';
import { BiometricReading, BiometricDataType, TrendDirection } from '../../models/BiometricData';
import { intakeLoggingService } from '../substance/intakeLoggingService';
import { wearableIntegrationService } from '../wearables/wearableIntegrationService';
import { loggingService } from '../logging/loggingService';

// Prediction Interfaces
export interface TrendForecast {
  forecastId: string;
  userId: string;
  timestamp: Date;
  
  // Risk Prediction
  riskWindow: Date; // When risk is expected to peak
  riskLevel: number; // 0-100 scale
  riskCategory: RiskCategory;
  confidence: number; // 0-1 scale
  
  // Recommended Actions
  recommendedAction: string;
  preventiveActions: PreventiveAction[];
  optimalTiming: OptimalTiming[];
  
  // Supporting Data
  trendAnalysis: TrendAnalysis;
  correlationFactors: CorrelationFactor[];
  historicalComparison: HistoricalComparison;
  
  // Metadata
  modelVersion: string;
  processingTime: number;
  dataQuality: number;
}

export enum RiskCategory {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface PreventiveAction {
  actionId: string;
  type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string;
  timing: string; // e.g., "2 hours before risk window"
  expectedImpact: number; // 0-100 scale
  difficulty: ActionDifficulty;
}

export enum ActionType {
  INTAKE_ADJUSTMENT = 'intake_adjustment',
  LIFESTYLE_CHANGE = 'lifestyle_change',
  MONITORING = 'monitoring',
  MEDICAL_CONSULTATION = 'medical_consultation',
  ENVIRONMENTAL = 'environmental'
}

export enum ActionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum ActionDifficulty {
  EASY = 'easy',
  MODERATE = 'moderate',
  CHALLENGING = 'challenging'
}

export interface OptimalTiming {
  activityType: string;
  recommendedTime: Date;
  timeWindow: number; // minutes
  reasoning: string;
  expectedBenefit: string;
}

export interface TrendAnalysis {
  direction: TrendDirection;
  strength: number; // 0-1 scale
  duration: number; // days
  volatility: number; // 0-1 scale
  seasonality: SeasonalPattern[];
  breakpoints: TrendBreakpoint[];
}

export interface SeasonalPattern {
  pattern: string; // e.g., "weekly", "monthly"
  strength: number;
  phase: number; // 0-1 representing position in cycle
}

export interface TrendBreakpoint {
  timestamp: Date;
  significance: number;
  description: string;
  cause: string;
}

export interface CorrelationFactor {
  factor: string;
  correlation: number; // -1 to 1
  significance: number; // 0-1
  timeDelay: number; // hours
  description: string;
}

export interface HistoricalComparison {
  similarPeriods: SimilarPeriod[];
  averageOutcome: number;
  bestCaseScenario: number;
  worstCaseScenario: number;
  successRate: number; // 0-1
}

export interface SimilarPeriod {
  startDate: Date;
  endDate: Date;
  similarity: number; // 0-1
  outcome: number;
  keyFactors: string[];
}

// Model Configuration
export interface PredictionConfig {
  userId: string;
  
  // Time horizons
  shortTermHours: number; // Default: 24
  mediumTermDays: number; // Default: 7
  longTermWeeks: number; // Default: 4
  
  // Model parameters
  lookbackDays: number; // Default: 30
  minDataPoints: number; // Default: 10
  confidenceThreshold: number; // Default: 0.7
  
  // Feature weights
  substanceWeight: number; // Default: 0.4
  biometricWeight: number; // Default: 0.4
  temporalWeight: number; // Default: 0.2
  
  // Risk thresholds
  riskThresholds: {
    minimal: number; // 0-20
    low: number; // 20-40
    moderate: number; // 40-60
    high: number; // 60-80
    critical: number; // 80-100
  };
}

// Time Series Data Point
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  quality: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface PredictionFeatures {
  // Substance features
  recentIntakeFrequency: number;
  averageDosage: number;
  substanceDiversity: number;
  interactionRiskScore: number;
  
  // Biometric features
  heartRateVariability: number;
  sleepQuality: number;
  stressLevel: number;
  recoveryScore: number;
  
  // Temporal features
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  seasonality: number; // 0-1
  
  // Historical features
  historicalRisk: number;
  trendMomentum: number;
  volatility: number;
}

class PredictiveAnalyticsEngine {
  private static instance: PredictiveAnalyticsEngine;
  private defaultConfig: PredictionConfig;
  private userConfigs: Map<string, PredictionConfig> = new Map();
  private modelCache: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {
    this.defaultConfig = {
      userId: '',
      shortTermHours: 24,
      mediumTermDays: 7,
      longTermWeeks: 4,
      lookbackDays: 30,
      minDataPoints: 10,
      confidenceThreshold: 0.7,
      substanceWeight: 0.4,
      biometricWeight: 0.4,
      temporalWeight: 0.2,
      riskThresholds: {
        minimal: 20,
        low: 40,
        moderate: 60,
        high: 80,
        critical: 100
      }
    };
  }

  static getInstance(): PredictiveAnalyticsEngine {
    if (!PredictiveAnalyticsEngine.instance) {
      PredictiveAnalyticsEngine.instance = new PredictiveAnalyticsEngine();
    }
    return PredictiveAnalyticsEngine.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize ML models (placeholder for now)
      await this.loadPredictionModels();
      
      this.isInitialized = true;
      await loggingService.info('Predictive Analytics Engine initialized');
    } catch (error) {
      console.error('Failed to initialize predictive analytics engine:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive forecast for user
   */
  async generateForecast(userId: string): Promise<TrendForecast> {
    const startTime = Date.now();
    
    try {
      const config = this.getUserConfig(userId);
      
      // Gather historical data
      const [substanceData, biometricData] = await Promise.all([
        this.getSubstanceData(userId, config.lookbackDays),
        this.getBiometricData(userId, config.lookbackDays)
      ]);

      // Validate data sufficiency
      if (substanceData.length < config.minDataPoints) {
        throw new Error(`Insufficient data: ${substanceData.length} points, minimum ${config.minDataPoints} required`);
      }

      // Extract features
      const features = await this.extractFeatures(substanceData, biometricData, config);
      
      // Generate predictions
      const riskPrediction = await this.predictRisk(features, config);
      const trendAnalysis = await this.analyzeTrends(substanceData, biometricData, config);
      const correlations = await this.findCorrelations(substanceData, biometricData);
      
      // Generate recommendations
      const preventiveActions = await this.generatePreventiveActions(riskPrediction, features, config);
      const optimalTiming = await this.calculateOptimalTiming(features, trendAnalysis);
      
      // Historical comparison
      const historicalComparison = await this.compareWithHistory(userId, features, config);

      const forecast: TrendForecast = {
        forecastId: this.generateForecastId(),
        userId,
        timestamp: new Date(),
        riskWindow: riskPrediction.riskWindow,
        riskLevel: riskPrediction.riskLevel,
        riskCategory: this.categorizeRisk(riskPrediction.riskLevel, config),
        confidence: riskPrediction.confidence,
        recommendedAction: this.generateMainRecommendation(riskPrediction, preventiveActions),
        preventiveActions,
        optimalTiming,
        trendAnalysis,
        correlationFactors: correlations,
        historicalComparison,
        modelVersion: '1.0.0',
        processingTime: Date.now() - startTime,
        dataQuality: this.calculateDataQuality(substanceData, biometricData)
      };

      await loggingService.info('Forecast generated', {
        userId,
        forecastId: forecast.forecastId,
        riskLevel: forecast.riskLevel,
        riskCategory: forecast.riskCategory,
        confidence: forecast.confidence,
        processingTime: forecast.processingTime
      });

      return forecast;
    } catch (error) {
      await loggingService.error('Forecast generation failed', {
        userId,
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Generate quick risk assessment (simplified version)
   */
  async generateQuickForecast(userId: string): Promise<Partial<TrendForecast>> {
    try {
      const config = this.getUserConfig(userId);
      
      // Get recent data (last 7 days)
      const [recentIntakes, recentBiometrics] = await Promise.all([
        this.getSubstanceData(userId, 7),
        this.getBiometricData(userId, 7)
      ]);

      // Simple moving average calculation
      const riskScore = this.calculateSimpleRiskScore(recentIntakes, recentBiometrics);
      const riskWindow = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours from now
      
      return {
        forecastId: this.generateForecastId(),
        userId,
        timestamp: new Date(),
        riskWindow,
        riskLevel: riskScore,
        riskCategory: this.categorizeRisk(riskScore, config),
        confidence: 0.6, // Lower confidence for quick forecast
        recommendedAction: this.getQuickRecommendation(riskScore),
        modelVersion: '1.0.0-quick',
        processingTime: 0
      };
    } catch (error) {
      await loggingService.error('Quick forecast generation failed', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update prediction configuration for user
   */
  async updateUserConfig(userId: string, config: Partial<PredictionConfig>): Promise<void> {
    const currentConfig = this.getUserConfig(userId);
    const updatedConfig = { ...currentConfig, ...config, userId };
    
    this.userConfigs.set(userId, updatedConfig);
    
    await loggingService.info('User prediction config updated', { userId });
  }

  /**
   * Private helper methods
   */
  private async loadPredictionModels(): Promise<void> {
    // In production, this would load actual ML models
    // For now, we'll use statistical methods
    await loggingService.info('Prediction models loaded (statistical methods)');
  }

  private getUserConfig(userId: string): PredictionConfig {
    return this.userConfigs.get(userId) || { ...this.defaultConfig, userId };
  }

  private async getSubstanceData(userId: string, days: number): Promise<SubstanceIntake[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await intakeLoggingService.getIntakeHistory(userId, {
        startDate,
        endDate: new Date(),
        limit: 1000
      });
    } catch (error) {
      await loggingService.error('Failed to get substance data', { userId, error: error.message });
      return [];
    }
  }

  private async getBiometricData(userId: string, days: number): Promise<BiometricReading[]> {
    try {
      // In production, this would query biometric data from storage
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      await loggingService.error('Failed to get biometric data', { userId, error: error.message });
      return [];
    }
  }

  private async extractFeatures(
    substanceData: SubstanceIntake[],
    biometricData: BiometricReading[],
    config: PredictionConfig
  ): Promise<PredictionFeatures> {
    const now = new Date();
    const last24h = substanceData.filter(intake => 
      (now.getTime() - intake.timestamp.getTime()) < (24 * 60 * 60 * 1000)
    );

    return {
      // Substance features
      recentIntakeFrequency: last24h.length,
      averageDosage: last24h.reduce((sum, intake) => sum + intake.quantity, 0) / Math.max(last24h.length, 1),
      substanceDiversity: new Set(substanceData.map(intake => intake.substanceId)).size,
      interactionRiskScore: this.calculateInteractionRisk(last24h),
      
      // Biometric features (placeholder values)
      heartRateVariability: this.getAverageBiometric(biometricData, BiometricDataType.HEART_RATE_VARIABILITY, 50),
      sleepQuality: this.getAverageBiometric(biometricData, BiometricDataType.SLEEP_EFFICIENCY, 75),
      stressLevel: this.getAverageBiometric(biometricData, BiometricDataType.STRESS_LEVEL, 30),
      recoveryScore: this.getAverageBiometric(biometricData, BiometricDataType.RECOVERY_SCORE, 70),
      
      // Temporal features
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      seasonality: this.calculateSeasonality(now),
      
      // Historical features
      historicalRisk: this.calculateHistoricalRisk(substanceData),
      trendMomentum: this.calculateTrendMomentum(substanceData),
      volatility: this.calculateVolatility(substanceData)
    };
  }

  private async predictRisk(
    features: PredictionFeatures,
    config: PredictionConfig
  ): Promise<{ riskLevel: number; riskWindow: Date; confidence: number }> {
    // Simple risk calculation based on features
    let riskScore = 0;
    
    // Substance risk factors
    riskScore += features.recentIntakeFrequency * 5; // Frequency impact
    riskScore += Math.min(features.averageDosage / 100, 1) * 20; // Dosage impact
    riskScore += features.interactionRiskScore * 30; // Interaction impact
    
    // Biometric risk factors
    riskScore += (100 - features.sleepQuality) * 0.2; // Poor sleep increases risk
    riskScore += features.stressLevel * 0.3; // High stress increases risk
    riskScore += (100 - features.recoveryScore) * 0.2; // Poor recovery increases risk
    
    // Temporal factors
    if (features.timeOfDay < 6 || features.timeOfDay > 22) {
      riskScore += 10; // Late night/early morning risk
    }
    
    // Historical factors
    riskScore += features.historicalRisk * 0.4;
    riskScore += features.volatility * 15;
    
    // Normalize to 0-100 scale
    const normalizedRisk = Math.min(100, Math.max(0, riskScore));
    
    // Calculate risk window (when risk is expected to peak)
    const hoursAhead = Math.max(1, Math.min(24, features.recentIntakeFrequency * 2));
    const riskWindow = new Date(Date.now() + (hoursAhead * 60 * 60 * 1000));
    
    // Calculate confidence based on data quality and consistency
    const confidence = Math.min(0.95, 0.5 + (features.recentIntakeFrequency * 0.05));
    
    return {
      riskLevel: normalizedRisk,
      riskWindow,
      confidence
    };
  }

  private calculateSimpleRiskScore(
    recentIntakes: SubstanceIntake[],
    recentBiometrics: BiometricReading[]
  ): number {
    // Simple moving average over last 7 days with threshold check
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Calculate intake frequency
    const recentCount = recentIntakes.filter(intake => 
      intake.timestamp.getTime() > sevenDaysAgo
    ).length;
    
    // Simple risk calculation
    let riskScore = recentCount * 8; // Base risk from frequency
    
    // Add dosage factor
    const totalDosage = recentIntakes.reduce((sum, intake) => sum + intake.quantity, 0);
    const averageDosage = totalDosage / Math.max(recentIntakes.length, 1);
    riskScore += Math.min(averageDosage / 10, 20); // Cap dosage impact at 20
    
    // Add interaction risk
    const uniqueSubstances = new Set(recentIntakes.map(intake => intake.substanceId)).size;
    if (uniqueSubstances > 2) {
      riskScore += (uniqueSubstances - 2) * 5; // Multiple substances increase risk
    }
    
    // Threshold check - if above 60, add extra risk
    if (riskScore > 60) {
      riskScore += 10;
    }
    
    return Math.min(100, Math.max(0, riskScore));
  }

  private async analyzeTrends(
    substanceData: SubstanceIntake[],
    biometricData: BiometricReading[],
    config: PredictionConfig
  ): Promise<TrendAnalysis> {
    // Simple trend analysis
    const dailyCounts = this.groupByDay(substanceData);
    const trend = this.calculateTrendDirection(dailyCounts);
    
    return {
      direction: trend.direction,
      strength: trend.strength,
      duration: Math.min(dailyCounts.length, config.lookbackDays),
      volatility: this.calculateVolatility(substanceData),
      seasonality: [],
      breakpoints: []
    };
  }

  private async findCorrelations(
    substanceData: SubstanceIntake[],
    biometricData: BiometricReading[]
  ): Promise<CorrelationFactor[]> {
    // Placeholder correlation analysis
    return [
      {
        factor: 'Sleep Quality',
        correlation: -0.6,
        significance: 0.8,
        timeDelay: 8,
        description: 'Poor sleep quality correlates with increased substance use'
      },
      {
        factor: 'Stress Level',
        correlation: 0.7,
        significance: 0.9,
        timeDelay: 2,
        description: 'Higher stress levels correlate with increased intake frequency'
      }
    ];
  }

  private async generatePreventiveActions(
    riskPrediction: { riskLevel: number; riskWindow: Date; confidence: number },
    features: PredictionFeatures,
    config: PredictionConfig
  ): Promise<PreventiveAction[]> {
    const actions: PreventiveAction[] = [];
    
    if (riskPrediction.riskLevel > config.riskThresholds.moderate) {
      actions.push({
        actionId: this.generateActionId(),
        type: ActionType.INTAKE_ADJUSTMENT,
        priority: ActionPriority.HIGH,
        title: 'Reduce Intake Frequency',
        description: 'Consider spacing out your next intake to reduce cumulative risk',
        timing: '2 hours before next planned intake',
        expectedImpact: 30,
        difficulty: ActionDifficulty.MODERATE
      });
    }
    
    if (features.stressLevel > 60) {
      actions.push({
        actionId: this.generateActionId(),
        type: ActionType.LIFESTYLE_CHANGE,
        priority: ActionPriority.MEDIUM,
        title: 'Stress Management',
        description: 'Practice stress reduction techniques like deep breathing or meditation',
        timing: 'Next 30 minutes',
        expectedImpact: 25,
        difficulty: ActionDifficulty.EASY
      });
    }
    
    if (features.sleepQuality < 60) {
      actions.push({
        actionId: this.generateActionId(),
        type: ActionType.LIFESTYLE_CHANGE,
        priority: ActionPriority.MEDIUM,
        title: 'Improve Sleep Hygiene',
        description: 'Focus on getting quality sleep to improve recovery and reduce risk',
        timing: 'Tonight',
        expectedImpact: 35,
        difficulty: ActionDifficulty.MODERATE
      });
    }
    
    return actions;
  }

  private async calculateOptimalTiming(
    features: PredictionFeatures,
    trendAnalysis: TrendAnalysis
  ): Promise<OptimalTiming[]> {
    const now = new Date();
    const timings: OptimalTiming[] = [];
    
    // Optimal intake timing based on circadian rhythms
    const optimalHour = features.timeOfDay < 12 ? 14 : 10; // Afternoon or morning
    const optimalTime = new Date(now);
    optimalTime.setHours(optimalHour, 0, 0, 0);
    if (optimalTime < now) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }
    
    timings.push({
      activityType: 'Next Intake',
      recommendedTime: optimalTime,
      timeWindow: 120, // 2 hour window
      reasoning: 'Based on your circadian rhythm and current stress levels',
      expectedBenefit: 'Reduced side effects and improved effectiveness'
    });
    
    return timings;
  }

  private async compareWithHistory(
    userId: string,
    features: PredictionFeatures,
    config: PredictionConfig
  ): Promise<HistoricalComparison> {
    // Placeholder historical comparison
    return {
      similarPeriods: [],
      averageOutcome: 65,
      bestCaseScenario: 85,
      worstCaseScenario: 45,
      successRate: 0.75
    };
  }

  // Utility methods
  private categorizeRisk(riskLevel: number, config: PredictionConfig): RiskCategory {
    if (riskLevel < config.riskThresholds.minimal) return RiskCategory.MINIMAL;
    if (riskLevel < config.riskThresholds.low) return RiskCategory.LOW;
    if (riskLevel < config.riskThresholds.moderate) return RiskCategory.MODERATE;
    if (riskLevel < config.riskThresholds.high) return RiskCategory.HIGH;
    return RiskCategory.CRITICAL;
  }

  private generateMainRecommendation(
    riskPrediction: { riskLevel: number; riskWindow: Date; confidence: number },
    preventiveActions: PreventiveAction[]
  ): string {
    if (riskPrediction.riskLevel > 80) {
      return 'High risk detected. Consider avoiding additional substances and focus on recovery.';
    } else if (riskPrediction.riskLevel > 60) {
      return 'Moderate risk identified. Monitor your response and consider spacing out intake.';
    } else if (riskPrediction.riskLevel > 40) {
      return 'Low-moderate risk. Stay hydrated and maintain awareness of your current state.';
    } else {
      return 'Low risk detected. Continue current approach with standard safety precautions.';
    }
  }

  private getQuickRecommendation(riskScore: number): string {
    if (riskScore > 70) {
      return 'High risk detected - consider avoiding additional substances today';
    } else if (riskScore > 50) {
      return 'Moderate risk - monitor your response and stay hydrated';
    } else {
      return 'Low risk - maintain current approach with standard precautions';
    }
  }

  private calculateInteractionRisk(intakes: SubstanceIntake[]): number {
    const uniqueSubstances = new Set(intakes.map(intake => intake.substanceId));
    if (uniqueSubstances.size <= 1) return 0;
    
    // Simple interaction risk calculation
    return Math.min(1, (uniqueSubstances.size - 1) * 0.3);
  }

  private getAverageBiometric(
    biometricData: BiometricReading[],
    dataType: BiometricDataType,
    defaultValue: number
  ): number {
    const relevantData = biometricData.filter(reading => reading.dataType === dataType);
    if (relevantData.length === 0) return defaultValue;
    
    const sum = relevantData.reduce((total, reading) => total + reading.value, 0);
    return sum / relevantData.length;
  }

  private calculateSeasonality(date: Date): number {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.5 + 0.5;
  }

  private calculateHistoricalRisk(substanceData: SubstanceIntake[]): number {
    // Simple historical risk based on frequency patterns
    const dailyCounts = this.groupByDay(substanceData);
    const averageDaily = dailyCounts.reduce((sum, count) => sum + count, 0) / Math.max(dailyCounts.length, 1);
    return Math.min(100, averageDaily * 10);
  }

  private calculateTrendMomentum(substanceData: SubstanceIntake[]): number {
    const dailyCounts = this.groupByDay(substanceData);
    if (dailyCounts.length < 3) return 0;
    
    const recent = dailyCounts.slice(-3);
    const earlier = dailyCounts.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum, count) => sum + count, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, count) => sum + count, 0) / Math.max(earlier.length, 1);
    
    return (recentAvg - earlierAvg) / Math.max(earlierAvg, 1);
  }

  private calculateVolatility(substanceData: SubstanceIntake[]): number {
    const dailyCounts = this.groupByDay(substanceData);
    if (dailyCounts.length < 2) return 0;
    
    const mean = dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length;
    const variance = dailyCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / dailyCounts.length;
    
    return Math.sqrt(variance) / Math.max(mean, 1);
  }

  private groupByDay(substanceData: SubstanceIntake[]): number[] {
    const dayGroups: Record<string, number> = {};
    
    substanceData.forEach(intake => {
      const day = intake.timestamp.toISOString().split('T')[0];
      dayGroups[day] = (dayGroups[day] || 0) + 1;
    });
    
    return Object.values(dayGroups);
  }

  private calculateTrendDirection(dailyCounts: number[]): { direction: TrendDirection; strength: number } {
    if (dailyCounts.length < 3) {
      return { direction: TrendDirection.STABLE, strength: 0 };
    }
    
    const recent = dailyCounts.slice(-3);
    const earlier = dailyCounts.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum, count) => sum + count, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, count) => sum + count, 0) / Math.max(earlier.length, 1);
    
    const change = (recentAvg - earlierAvg) / Math.max(earlierAvg, 1);
    
    if (Math.abs(change) < 0.1) {
      return { direction: TrendDirection.STABLE, strength: Math.abs(change) };
    } else if (change > 0) {
      return { direction: TrendDirection.INCREASING, strength: Math.min(1, change) };
    } else {
      return { direction: TrendDirection.DECREASING, strength: Math.min(1, Math.abs(change)) };
    }
  }

  private calculateDataQuality(
    substanceData: SubstanceIntake[],
    biometricData: BiometricReading[]
  ): number {
    const totalDataPoints = substanceData.length + biometricData.length;
    const recentDataPoints = substanceData.filter(intake => 
      (Date.now() - intake.timestamp.getTime()) < (7 * 24 * 60 * 60 * 1000)
    ).length;
    
    const recencyScore = Math.min(1, recentDataPoints / 10);
    const volumeScore = Math.min(1, totalDataPoints / 50);
    
    return (recencyScore + volumeScore) / 2;
  }

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const predictiveAnalyticsEngine = PredictiveAnalyticsEngine.getInstance();