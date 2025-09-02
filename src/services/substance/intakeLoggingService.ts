/**
 * Intake Logging Service
 * Manages substance intake logging and analysis for BioReceipt.AI
 */

import {
  SubstanceIntake,
  IntakeSession,
  IntakeAnalysis,
  IntakePattern,
  createIntakeEntry,
  validateIntakeEntry,
  sanitizeIntakeEntry,
  calculateTotalIntake,
  getIntakesByTimeRange,
  groupIntakesBySubstance,
  getRecentIntakes
} from '../../models/SubstanceIntake';
import { Substance, SubstanceCategory } from '../../models/Substance';
import { substanceDatabase } from './substanceDatabase';
import { storage } from '../../utils/storage';
import { loggingService } from '../logging/loggingService';

interface IntakeLoggingConfig {
  maxIntakesPerDay: number;
  maxRetentionDays: number;
  enableAnalysis: boolean;
  enablePatternDetection: boolean;
  autoSaveInterval: number; // milliseconds
}

class IntakeLoggingService {
  private static instance: IntakeLoggingService;
  private config: IntakeLoggingConfig;
  private intakes: Map<string, SubstanceIntake[]> = new Map(); // userId -> intakes
  private sessions: Map<string, IntakeSession[]> = new Map(); // userId -> sessions
  private analyses: Map<string, IntakeAnalysis[]> = new Map(); // userId -> analyses
  private patterns: Map<string, IntakePattern[]> = new Map(); // userId -> patterns
  private autoSaveTimer?: NodeJS.Timeout;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): IntakeLoggingService {
    if (!IntakeLoggingService.instance) {
      IntakeLoggingService.instance = new IntakeLoggingService();
    }
    return IntakeLoggingService.instance;
  }

  /**
   * Initialize the intake logging service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load configuration
      const storedConfig = await storage.getData('INTAKE_LOGGING_CONFIG');
      if (storedConfig) {
        this.config = { ...this.config, ...storedConfig };
      }

      // Load existing data
      await this.loadIntakeData();

      // Start auto-save timer
      this.startAutoSave();

      this.isInitialized = true;
      await loggingService.info('Intake logging service initialized');
    } catch (error) {
      console.error('Failed to initialize intake logging service:', error);
      throw error;
    }
  }

  /**
   * Log a new substance intake
   */
  async logIntake(
    userId: string,
    substanceId: string,
    quantity: number,
    unit: string,
    timestamp: Date = new Date(),
    notes?: string,
    context?: string
  ): Promise<SubstanceIntake> {
    try {
      // Get substance information
      const substance = await substanceDatabase.getSubstanceById(substanceId);
      if (!substance) {
        throw new Error(`Substance not found: ${substanceId}`);
      }

      // Create intake entry
      const intake = createIntakeEntry(
        userId,
        substanceId,
        substance.name,
        substance.category,
        quantity,
        unit,
        timestamp,
        notes
      );

      // Add context if provided
      if (context) {
        intake.context = context;
      }

      // Validate intake
      const validationErrors = validateIntakeEntry(intake);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Sanitize intake
      const sanitizedIntake = sanitizeIntakeEntry(intake);

      // Check daily limits
      await this.checkDailyLimits(userId);

      // Store intake
      if (!this.intakes.has(userId)) {
        this.intakes.set(userId, []);
      }
      this.intakes.get(userId)!.push(sanitizedIntake);

      // Sort intakes by timestamp (newest first)
      this.intakes.get(userId)!.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Analyze intake if enabled
      if (this.config.enableAnalysis) {
        await this.analyzeIntake(sanitizedIntake);
      }

      // Update patterns if enabled
      if (this.config.enablePatternDetection) {
        await this.updatePatterns(userId, substanceId);
      }

      // Log the intake
      await loggingService.info('Substance intake logged', {
        userId,
        substanceId,
        substanceName: substance.name,
        quantity,
        unit,
        timestamp: timestamp.toISOString()
      });

      return sanitizedIntake;
    } catch (error) {
      await loggingService.error('Failed to log intake', {
        userId,
        substanceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's intake history
   */
  async getIntakeHistory(
    userId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      substanceId?: string;
      category?: SubstanceCategory;
    }
  ): Promise<SubstanceIntake[]> {
    const userIntakes = this.intakes.get(userId) || [];
    let filteredIntakes = [...userIntakes];

    // Apply filters
    if (options?.startDate || options?.endDate) {
      const startDate = options.startDate || new Date(0);
      const endDate = options.endDate || new Date();
      filteredIntakes = getIntakesByTimeRange(filteredIntakes, startDate, endDate);
    }

    if (options?.substanceId) {
      filteredIntakes = filteredIntakes.filter(intake => 
        intake.substanceId === options.substanceId
      );
    }

    if (options?.category) {
      filteredIntakes = filteredIntakes.filter(intake => 
        intake.substanceCategory === options.category
      );
    }

    // Apply limit
    if (options?.limit) {
      filteredIntakes = filteredIntakes.slice(0, options.limit);
    }

    return filteredIntakes;
  }

  /**
   * Get recent intakes for a user
   */
  async getRecentIntakes(userId: string, hours: number = 24): Promise<SubstanceIntake[]> {
    const userIntakes = this.intakes.get(userId) || [];
    return getRecentIntakes(userIntakes, hours);
  }

  /**
   * Update an existing intake
   */
  async updateIntake(
    userId: string,
    intakeId: string,
    updates: Partial<SubstanceIntake>
  ): Promise<SubstanceIntake | null> {
    const userIntakes = this.intakes.get(userId);
    if (!userIntakes) {
      return null;
    }

    const intakeIndex = userIntakes.findIndex(intake => intake.id === intakeId);
    if (intakeIndex === -1) {
      return null;
    }

    const existingIntake = userIntakes[intakeIndex];
    const updatedIntake: SubstanceIntake = {
      ...existingIntake,
      ...updates,
      id: intakeId, // Ensure ID doesn't change
      userId, // Ensure user ID doesn't change
      updatedAt: new Date()
    };

    // Validate updated intake
    const validationErrors = validateIntakeEntry(updatedIntake);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Sanitize and update
    const sanitizedIntake = sanitizeIntakeEntry(updatedIntake);
    userIntakes[intakeIndex] = sanitizedIntake;

    // Re-sort if timestamp changed
    if (updates.timestamp) {
      userIntakes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    await loggingService.info('Intake updated', {
      userId,
      intakeId,
      updates: Object.keys(updates)
    });

    return sanitizedIntake;
  }

  /**
   * Delete an intake
   */
  async deleteIntake(userId: string, intakeId: string): Promise<boolean> {
    const userIntakes = this.intakes.get(userId);
    if (!userIntakes) {
      return false;
    }

    const intakeIndex = userIntakes.findIndex(intake => intake.id === intakeId);
    if (intakeIndex === -1) {
      return false;
    }

    userIntakes.splice(intakeIndex, 1);

    await loggingService.info('Intake deleted', { userId, intakeId });
    return true;
  }

  /**
   * Get intake statistics for a user
   */
  async getIntakeStatistics(
    userId: string,
    days: number = 30
  ): Promise<{
    totalIntakes: number;
    intakesByCategory: Record<SubstanceCategory, number>;
    intakesByDay: Record<string, number>;
    mostCommonSubstances: Array<{ substanceId: string; name: string; count: number }>;
    averageIntakesPerDay: number;
  }> {
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const recentIntakes = await this.getIntakeHistory(userId, {
      startDate: cutoffDate
    });

    const stats = {
      totalIntakes: recentIntakes.length,
      intakesByCategory: {} as Record<SubstanceCategory, number>,
      intakesByDay: {} as Record<string, number>,
      mostCommonSubstances: [] as Array<{ substanceId: string; name: string; count: number }>,
      averageIntakesPerDay: 0
    };

    // Initialize category counts
    for (const category of Object.values(SubstanceCategory)) {
      stats.intakesByCategory[category] = 0;
    }

    // Count by category and substance
    const substanceCounts = new Map<string, { name: string; count: number }>();

    for (const intake of recentIntakes) {
      // Category count
      stats.intakesByCategory[intake.substanceCategory]++;

      // Daily count
      const dayKey = intake.timestamp.toISOString().split('T')[0];
      stats.intakesByDay[dayKey] = (stats.intakesByDay[dayKey] || 0) + 1;

      // Substance count
      const existing = substanceCounts.get(intake.substanceId);
      if (existing) {
        existing.count++;
      } else {
        substanceCounts.set(intake.substanceId, {
          name: intake.substanceName,
          count: 1
        });
      }
    }

    // Get most common substances
    stats.mostCommonSubstances = Array.from(substanceCounts.entries())
      .map(([substanceId, data]) => ({
        substanceId,
        name: data.name,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average intakes per day
    stats.averageIntakesPerDay = stats.totalIntakes / days;

    return stats;
  }

  /**
   * Analyze an intake for risks and interactions
   */
  private async analyzeIntake(intake: SubstanceIntake): Promise<IntakeAnalysis> {
    const analysis: IntakeAnalysis = {
      intakeId: intake.id,
      riskLevel: 'low',
      riskFactors: [],
      interactions: [],
      recommendations: [],
      analyzedAt: new Date(),
      confidence: 0.8,
      version: '1.0'
    };

    try {
      // Get substance information
      const substance = await substanceDatabase.getSubstanceById(intake.substanceId);
      if (!substance) {
        analysis.confidence = 0.1;
        return analysis;
      }

      // Check recent intakes for interactions
      const recentIntakes = await this.getRecentIntakes(intake.userId, 24);
      const recentSubstanceIds = [...new Set(recentIntakes.map(i => i.substanceId))];

      if (recentSubstanceIds.length > 1) {
        const interactionCheck = await substanceDatabase.checkInteractions(recentSubstanceIds);
        
        // Add dangerous interactions
        for (const dangerous of interactionCheck.dangerous) {
          analysis.interactions.push({
            withSubstanceId: '', // Would need to map back from name
            interactionType: 'dangerous',
            severity: 'high',
            description: dangerous.description
          });
          analysis.riskLevel = 'high';
          analysis.riskFactors.push(`Dangerous interaction: ${dangerous.description}`);
        }

        // Add caution interactions
        for (const caution of interactionCheck.cautions) {
          analysis.interactions.push({
            withSubstanceId: '', // Would need to map back from name
            interactionType: 'caution',
            severity: 'medium',
            description: caution.description
          });
          if (analysis.riskLevel === 'low') {
            analysis.riskLevel = 'medium';
          }
          analysis.riskFactors.push(`Caution: ${caution.description}`);
        }
      }

      // Calculate timing estimates
      if (substance.pharmacology.peakEffect) {
        analysis.peakEffectTime = new Date(
          intake.timestamp.getTime() + (substance.pharmacology.peakEffect * 60 * 60 * 1000)
        );
      }

      if (substance.pharmacology.duration) {
        analysis.estimatedDuration = substance.pharmacology.duration;
        analysis.clearanceTime = new Date(
          intake.timestamp.getTime() + (substance.pharmacology.duration * 60 * 60 * 1000)
        );
      }

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(intake, substance, analysis);

      // Store analysis
      if (!this.analyses.has(intake.userId)) {
        this.analyses.set(intake.userId, []);
      }
      this.analyses.get(intake.userId)!.push(analysis);

    } catch (error) {
      console.error('Failed to analyze intake:', error);
      analysis.confidence = 0.1;
    }

    return analysis;
  }

  /**
   * Generate recommendations based on intake analysis
   */
  private generateRecommendations(
    intake: SubstanceIntake,
    substance: Substance,
    analysis: IntakeAnalysis
  ): IntakeAnalysis['recommendations'] {
    const recommendations: IntakeAnalysis['recommendations'] = [];

    // Hydration recommendations
    if (substance.category === SubstanceCategory.ALCOHOL) {
      recommendations.push({
        type: 'hydration',
        priority: 'medium',
        message: 'Drink water to stay hydrated and reduce hangover risk',
        actionable: true
      });
    }

    // High risk recommendations
    if (analysis.riskLevel === 'high' || analysis.riskLevel === 'extreme') {
      recommendations.push({
        type: 'medical',
        priority: 'urgent',
        message: 'Consider seeking medical advice due to high risk factors',
        actionable: true
      });
    }

    // Rest recommendations for depressants
    if (substance.tags.includes('depressant')) {
      recommendations.push({
        type: 'rest',
        priority: 'medium',
        message: 'Avoid driving or operating machinery',
        actionable: true
      });
    }

    // Nutrition recommendations
    if (substance.category === SubstanceCategory.SUPPLEMENTS) {
      recommendations.push({
        type: 'nutrition',
        priority: 'low',
        message: 'Take with food if stomach upset occurs',
        actionable: true
      });
    }

    return recommendations;
  }

  /**
   * Update intake patterns for a user and substance
   */
  private async updatePatterns(userId: string, substanceId: string): Promise<void> {
    try {
      const userIntakes = this.intakes.get(userId) || [];
      const substanceIntakes = userIntakes.filter(intake => intake.substanceId === substanceId);

      if (substanceIntakes.length < 3) {
        return; // Need at least 3 intakes to detect patterns
      }

      // Calculate pattern metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const recentIntakes = substanceIntakes.filter(intake => intake.timestamp >= thirtyDaysAgo);

      if (recentIntakes.length === 0) {
        return;
      }

      const pattern: IntakePattern = {
        userId,
        substanceId,
        frequency: {
          daily: recentIntakes.length / 30,
          weekly: recentIntakes.length / 4.3,
          monthly: recentIntakes.length
        },
        averageDose: recentIntakes.reduce((sum, intake) => sum + intake.quantity, 0) / recentIntakes.length,
        minDose: Math.min(...recentIntakes.map(intake => intake.quantity)),
        maxDose: Math.max(...recentIntakes.map(intake => intake.quantity)),
        unit: recentIntakes[0].unit,
        commonTimes: this.extractCommonTimes(recentIntakes),
        commonDays: this.extractCommonDays(recentIntakes),
        commonContexts: this.extractCommonContexts(recentIntakes),
        commonLocations: this.extractCommonLocations(recentIntakes),
        commonMoods: this.extractCommonMoods(recentIntakes),
        trend: this.calculateTrend(recentIntakes),
        trendConfidence: 0.7,
        riskIndicators: this.calculateRiskIndicators(recentIntakes),
        periodStart: thirtyDaysAgo,
        periodEnd: now,
        lastUpdated: now
      };

      // Store pattern
      if (!this.patterns.has(userId)) {
        this.patterns.set(userId, []);
      }

      const userPatterns = this.patterns.get(userId)!;
      const existingIndex = userPatterns.findIndex(p => p.substanceId === substanceId);

      if (existingIndex >= 0) {
        userPatterns[existingIndex] = pattern;
      } else {
        userPatterns.push(pattern);
      }

    } catch (error) {
      console.error('Failed to update patterns:', error);
    }
  }

  /**
   * Extract common intake times
   */
  private extractCommonTimes(intakes: SubstanceIntake[]): string[] {
    const hourCounts = new Map<number, number>();
    
    for (const intake of intakes) {
      const hour = intake.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }

  /**
   * Extract common intake days
   */
  private extractCommonDays(intakes: SubstanceIntake[]): string[] {
    const dayCounts = new Map<number, number>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const intake of intakes) {
      const day = intake.timestamp.getDay();
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    return Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => dayNames[day]);
  }

  /**
   * Extract common contexts
   */
  private extractCommonContexts(intakes: SubstanceIntake[]): string[] {
    const contexts = intakes
      .map(intake => intake.context)
      .filter(Boolean) as string[];
    
    return [...new Set(contexts)].slice(0, 5);
  }

  /**
   * Extract common locations
   */
  private extractCommonLocations(intakes: SubstanceIntake[]): string[] {
    const locations = intakes
      .map(intake => intake.location)
      .filter(Boolean) as string[];
    
    return [...new Set(locations)].slice(0, 5);
  }

  /**
   * Extract common moods
   */
  private extractCommonMoods(intakes: SubstanceIntake[]): string[] {
    const moods = intakes
      .map(intake => intake.mood)
      .filter(Boolean) as string[];
    
    return [...new Set(moods)].slice(0, 5);
  }

  /**
   * Calculate intake trend
   */
  private calculateTrend(intakes: SubstanceIntake[]): 'increasing' | 'decreasing' | 'stable' | 'irregular' {
    if (intakes.length < 5) {
      return 'irregular';
    }

    // Sort by timestamp
    const sortedIntakes = [...intakes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate trend in frequency (intakes per week)
    const weeks = Math.ceil(intakes.length / 7);
    const weeklyFrequencies: number[] = [];
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(sortedIntakes[0].timestamp.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const weekIntakes = sortedIntakes.filter(intake => 
        intake.timestamp >= weekStart && intake.timestamp < weekEnd
      );
      
      weeklyFrequencies.push(weekIntakes.length);
    }

    // Simple trend calculation
    const firstHalf = weeklyFrequencies.slice(0, Math.floor(weeklyFrequencies.length / 2));
    const secondHalf = weeklyFrequencies.slice(Math.ceil(weeklyFrequencies.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, freq) => sum + freq, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, freq) => sum + freq, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate risk indicators
   */
  private calculateRiskIndicators(intakes: SubstanceIntake[]): IntakePattern['riskIndicators'] {
    const sortedIntakes = [...intakes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Check for escalating dose
    const firstHalf = sortedIntakes.slice(0, Math.floor(sortedIntakes.length / 2));
    const secondHalf = sortedIntakes.slice(Math.ceil(sortedIntakes.length / 2));
    
    const firstAvgDose = firstHalf.reduce((sum, intake) => sum + intake.quantity, 0) / firstHalf.length;
    const secondAvgDose = secondHalf.reduce((sum, intake) => sum + intake.quantity, 0) / secondHalf.length;
    
    const escalatingDose = (secondAvgDose - firstAvgDose) / firstAvgDose > 0.3;
    
    // Check for increasing frequency
    const increasingFrequency = this.calculateTrend(intakes) === 'increasing';
    
    // Check for negative contexts
    const negativeContexts = intakes.some(intake => 
      intake.context?.toLowerCase().includes('stress') ||
      intake.context?.toLowerCase().includes('sad') ||
      intake.context?.toLowerCase().includes('angry')
    );

    return {
      escalatingDose,
      increasingFrequency,
      negativeContexts,
      dangerousPatterns: escalatingDose && increasingFrequency
    };
  }

  /**
   * Check daily intake limits
   */
  private async checkDailyLimits(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayIntakes = await this.getIntakeHistory(userId, {
      startDate: today,
      endDate: tomorrow
    });

    if (todayIntakes.length >= this.config.maxIntakesPerDay) {
      throw new Error(`Daily intake limit reached (${this.config.maxIntakesPerDay})`);
    }
  }

  /**
   * Load intake data from storage
   */
  private async loadIntakeData(): Promise<void> {
    try {
      const [intakesData, sessionsData, analysesData, patternsData] = await Promise.all([
        storage.getData('USER_INTAKES'),
        storage.getData('USER_SESSIONS'),
        storage.getData('USER_ANALYSES'),
        storage.getData('USER_PATTERNS')
      ]);

      if (intakesData) {
        for (const [userId, intakes] of Object.entries(intakesData)) {
          this.intakes.set(userId, intakes as SubstanceIntake[]);
        }
      }

      if (sessionsData) {
        for (const [userId, sessions] of Object.entries(sessionsData)) {
          this.sessions.set(userId, sessions as IntakeSession[]);
        }
      }

      if (analysesData) {
        for (const [userId, analyses] of Object.entries(analysesData)) {
          this.analyses.set(userId, analyses as IntakeAnalysis[]);
        }
      }

      if (patternsData) {
        for (const [userId, patterns] of Object.entries(patternsData)) {
          this.patterns.set(userId, patterns as IntakePattern[]);
        }
      }
    } catch (error) {
      console.error('Failed to load intake data:', error);
    }
  }

  /**
   * Save intake data to storage
   */
  private async saveIntakeData(): Promise<void> {
    try {
      await Promise.all([
        storage.storeData('USER_INTAKES', Object.fromEntries(this.intakes)),
        storage.storeData('USER_SESSIONS', Object.fromEntries(this.sessions)),
        storage.storeData('USER_ANALYSES', Object.fromEntries(this.analyses)),
        storage.storeData('USER_PATTERNS', Object.fromEntries(this.patterns))
      ]);
    } catch (error) {
      console.error('Failed to save intake data:', error);
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveIntakeData();
    }, this.config.autoSaveInterval);
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): IntakeLoggingConfig {
    return {
      maxIntakesPerDay: 50,
      maxRetentionDays: 365,
      enableAnalysis: true,
      enablePatternDetection: true,
      autoSaveInterval: 30000 // 30 seconds
    };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<IntakeLoggingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await storage.storeData('INTAKE_LOGGING_CONFIG', this.config);
    
    if (newConfig.autoSaveInterval) {
      this.startAutoSave();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): IntakeLoggingConfig {
    return { ...this.config };
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - (this.config.maxRetentionDays * 24 * 60 * 60 * 1000));

    for (const [userId, intakes] of this.intakes.entries()) {
      const filteredIntakes = intakes.filter(intake => intake.timestamp >= cutoffDate);
      this.intakes.set(userId, filteredIntakes);
    }

    await this.saveIntakeData();
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
    
    // Final save
    this.saveIntakeData();
  }
}

export const intakeLoggingService = IntakeLoggingService.getInstance();
