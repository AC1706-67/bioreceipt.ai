/**
 * BioReceipt.AI Analysis Service
 * Advanced AI-powered analysis engine for substance intake insights
 */

import {
  SubstanceIntake,
  IntakeAnalysis,
  IntakePattern
} from '../../models/SubstanceIntake';
import { Substance, SubstanceCategory } from '../../models/Substance';
import { substanceDatabase } from '../substance/substanceDatabase';
import { intakeLoggingService } from '../substance/intakeLoggingService';
import { storage } from '../../utils/storage';
import { loggingService } from '../logging/loggingService';

// Enhanced analysis interfaces
export interface BioReceiptAnalysis {
  analysisId: string;
  userId: string;
  timestamp: Date;
  
  // Core metrics
  impactScore: number; // 0-100 overall impact score
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  
  // Detailed analysis
  interactionRisks: InteractionRisk[];
  recoveryTimeline: RecoveryTimeline;
  optimizationSuggestions: OptimizationSuggestion[];
  
  // Physiological insights
  physiologicalImpact: PhysiologicalImpact;
  metabolicLoad: MetabolicLoad;
  
  // Behavioral patterns
  usagePatterns: UsagePattern[];
  riskIndicators: RiskIndicator[];
  
  // Confidence and reliability
  confidence: number; // 0-1 confidence in analysis
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  
  // AI insights
  aiInsights: AIInsight[];
  personalizedRecommendations: PersonalizedRecommendation[];
}

export interface InteractionRisk {
  riskId: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  type: 'synergistic' | 'antagonistic' | 'dangerous' | 'unknown';
  substances: string[]; // substance IDs
  description: string;
  mechanism: string;
  timeWindow: number; // hours
  mitigation: string[];
  emergencyAction?: string;
}

export interface RecoveryTimeline {
  phases: RecoveryPhase[];
  totalDuration: number; // hours
  peakRecoveryTime: number; // hours
  fullRecoveryTime: number; // hours
  criticalPeriods: CriticalPeriod[];
}

export interface RecoveryPhase {
  phase: 'onset' | 'peak' | 'plateau' | 'decline' | 'recovery';
  startTime: number; // hours from intake
  duration: number; // hours
  intensity: number; // 0-100
  symptoms: string[];
  recommendations: string[];
}

export interface CriticalPeriod {
  startTime: number;
  endTime: number;
  reason: string;
  precautions: string[];
}

export interface OptimizationSuggestion {
  suggestionId: string;
  category: 'timing' | 'dosage' | 'combination' | 'lifestyle' | 'supplementation';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedBenefit: string;
  implementation: string[];
  evidence: string;
}

export interface PhysiologicalImpact {
  cardiovascular: ImpactMetric;
  neurological: ImpactMetric;
  hepatic: ImpactMetric;
  renal: ImpactMetric;
  endocrine: ImpactMetric;
  gastrointestinal: ImpactMetric;
  respiratory: ImpactMetric;
}

export interface ImpactMetric {
  impact: number; // -100 to +100 (negative = harmful, positive = beneficial)
  confidence: number; // 0-1
  timeToOnset: number; // hours
  duration: number; // hours
  description: string;
}

export interface MetabolicLoad {
  totalLoad: number; // 0-100
  liverLoad: number; // 0-100
  kidneyLoad: number; // 0-100
  detoxificationCapacity: number; // 0-100
  estimatedClearanceTime: number; // hours
  bottlenecks: string[];
}

export interface UsagePattern {
  patternId: string;
  type: 'escalation' | 'tolerance' | 'dependency' | 'cycling' | 'stacking';
  severity: 'mild' | 'moderate' | 'concerning' | 'severe';
  description: string;
  timeframe: number; // days
  confidence: number;
  interventions: string[];
}

export interface RiskIndicator {
  indicatorId: string;
  type: 'behavioral' | 'physiological' | 'psychological' | 'social';
  level: 'green' | 'yellow' | 'orange' | 'red';
  description: string;
  trend: 'improving' | 'stable' | 'worsening';
  recommendations: string[];
}

export interface AIInsight {
  insightId: string;
  type: 'pattern' | 'prediction' | 'optimization' | 'warning' | 'education';
  confidence: number;
  title: string;
  description: string;
  evidence: string[];
  actionable: boolean;
  actions?: string[];
}

export interface PersonalizedRecommendation {
  recommendationId: string;
  category: 'safety' | 'optimization' | 'recovery' | 'lifestyle' | 'monitoring';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  rationale: string;
  implementation: RecommendationStep[];
  expectedOutcome: string;
  timeframe: string;
  trackingMetrics: string[];
}

export interface RecommendationStep {
  step: number;
  action: string;
  timing: string;
  resources?: string[];
}

class BioReceiptAnalysisService {
  private static instance: BioReceiptAnalysisService;
  private analysisCache: Map<string, BioReceiptAnalysis> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): BioReceiptAnalysisService {
    if (!BioReceiptAnalysisService.instance) {
      BioReceiptAnalysisService.instance = new BioReceiptAnalysisService();
    }
    return BioReceiptAnalysisService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadAnalysisCache();
      this.isInitialized = true;
      await loggingService.info('BioReceipt Analysis Service initialized');
    } catch (error) {
      console.error('Failed to initialize analysis service:', error);
      throw error;
    }
  }  /*
*
   * Analyze current user state and recent intakes
   */
  async analyzeCurrentState(userId: string): Promise<BioReceiptAnalysis> {
    try {
      // Get recent intakes (last 48 hours)
      const recentIntakes = await intakeLoggingService.getRecentIntakes(userId, 48);
      
      // Get user patterns
      const userStats = await intakeLoggingService.getIntakeStatistics(userId, 30);
      
      // Create comprehensive analysis
      const analysis: BioReceiptAnalysis = {
        analysisId: this.generateAnalysisId(),
        userId,
        timestamp: new Date(),
        impactScore: await this.calculateImpactScore(recentIntakes),
        riskLevel: await this.assessRiskLevel(recentIntakes),
        interactionRisks: await this.analyzeInteractionRisks(recentIntakes),
        recoveryTimeline: await this.generateRecoveryTimeline(recentIntakes),
        optimizationSuggestions: await this.generateOptimizationSuggestions(recentIntakes, userStats),
        physiologicalImpact: await this.assessPhysiologicalImpact(recentIntakes),
        metabolicLoad: await this.calculateMetabolicLoad(recentIntakes),
        usagePatterns: await this.identifyUsagePatterns(userId),
        riskIndicators: await this.assessRiskIndicators(userId),
        confidence: this.calculateAnalysisConfidence(recentIntakes),
        dataQuality: this.assessDataQuality(recentIntakes),
        aiInsights: await this.generateAIInsights(recentIntakes, userStats),
        personalizedRecommendations: await this.generatePersonalizedRecommendations(userId, recentIntakes)
      };

      // Cache the analysis
      this.analysisCache.set(userId, analysis);
      await this.persistAnalysis(analysis);

      return analysis;
    } catch (error) {
      await loggingService.error('Analysis failed', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Calculate overall impact score (0-100)
   */
  private async calculateImpactScore(intakes: SubstanceIntake[]): Promise<number> {
    if (intakes.length === 0) return 0;

    let totalImpact = 0;
    let weightedSum = 0;

    for (const intake of intakes) {
      const substance = await substanceDatabase.getSubstanceById(intake.substanceId);
      if (!substance) continue;

      // Calculate time-weighted impact
      const hoursAgo = (Date.now() - intake.timestamp.getTime()) / (1000 * 60 * 60);
      const timeWeight = Math.max(0, 1 - (hoursAgo / 48)); // Decay over 48 hours

      // Base impact from substance properties
      let substanceImpact = this.getSubstanceBaseImpact(substance, intake.quantity);
      
      // Apply time weighting
      totalImpact += substanceImpact * timeWeight;
      weightedSum += timeWeight;
    }

    return weightedSum > 0 ? Math.min(100, totalImpact / weightedSum) : 0;
  }

  private getSubstanceBaseImpact(substance: Substance, quantity: number): number {
    // Base impact calculation based on substance properties
    let impact = 0;

    // Toxicity contribution
    switch (substance.safetyProfile.toxicityLevel) {
      case 'extreme': impact += 40; break;
      case 'high': impact += 25; break;
      case 'medium': impact += 15; break;
      case 'low': impact += 5; break;
      default: impact += 2;
    }

    // Addiction potential contribution
    switch (substance.safetyProfile.addictionPotential) {
      case 'extreme': impact += 20; break;
      case 'high': impact += 15; break;
      case 'medium': impact += 10; break;
      case 'low': impact += 5; break;
      default: impact += 0;
    }

    // Dosage factor (simplified)
    if (substance.dosageInfo.length > 0) {
      const dosageInfo = substance.dosageInfo[0];
      if (dosageInfo.dangerous && quantity >= dosageInfo.dangerous) {
        impact *= 2;
      } else if (dosageInfo.heavy && quantity >= dosageInfo.heavy) {
        impact *= 1.5;
      }
    }

    return Math.min(100, impact);
  }

  private async assessRiskLevel(intakes: SubstanceIntake[]): Promise<BioReceiptAnalysis['riskLevel']> {
    const impactScore = await this.calculateImpactScore(intakes);
    const interactionRisks = await this.analyzeInteractionRisks(intakes);
    
    // Check for critical interactions
    const hasCriticalRisk = interactionRisks.some(risk => risk.severity === 'critical');
    if (hasCriticalRisk) return 'critical';
    
    // Check for high-risk combinations
    const hasHighRisk = interactionRisks.some(risk => risk.severity === 'high');
    if (hasHighRisk || impactScore > 70) return 'high';
    
    // Check for moderate risk
    const hasModerateRisk = interactionRisks.some(risk => risk.severity === 'moderate');
    if (hasModerateRisk || impactScore > 40) return 'moderate';
    
    // Check for low risk
    if (impactScore > 15) return 'low';
    
    return 'minimal';
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadAnalysisCache(): Promise<void> {
    try {
      const cached = await storage.getData('ANALYSIS_CACHE');
      if (cached) {
        this.analysisCache = new Map(Object.entries(cached));
      }
    } catch (error) {
      console.error('Failed to load analysis cache:', error);
    }
  }

  private async persistAnalysis(analysis: BioReceiptAnalysis): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.analysisCache);
      await storage.storeData('ANALYSIS_CACHE', cacheData);
    } catch (error) {
      console.error('Failed to persist analysis:', error);
    }
  }
}

export const BioReceiptAnalysisService = BioReceiptAnalysisService.getInstance();
