/**
 * BioReceipt.AI Service
 * AI-powered natural language generation for personalized insights
 */

import {
  BioReceiptAnalysis,
  ImpactScore,
  InteractionRisk,
  RecoveryTimeline,
  PersonalizedInsight
} from '../analysis/BioReceiptAnalysisEngine';
import { SubstanceIntake } from '../../models/SubstanceIntake';
import { Substance } from '../../models/Substance';
import { substanceDatabase } from '../substance/substanceDatabase';
import { loggingService } from '../logging/loggingService';

// AI Response Interfaces
export interface AIInsightResponse {
  responseId: string;
  userId: string;
  timestamp: Date;
  
  // Generated Content
  summary: string;
  detailedAnalysis: string;
  recommendations: AIRecommendation[];
  warnings: AIWarning[];
  
  // Metadata
  confidence: number;
  processingTime: number;
  modelVersion: string;
}

export interface AIRecommendation {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  reasoning: string;
  actionSteps: string[];
  expectedOutcome: string;
  timeframe: string;
}

export interface AIWarning {
  id: string;
  severity: 'info' | 'caution' | 'warning' | 'critical';
  title: string;
  message: string;
  details: string;
  immediateActions: string[];
  monitoringAdvice: string[];
}

// Prompt Templates
interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: 'analysis' | 'recommendation' | 'warning' | 'summary';
}

class BioReceiptAIService {
  private static instance: BioReceiptAIService;
  private promptTemplates: Map<string, PromptTemplate> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initializePromptTemplates();
  }

  static getInstance(): BioReceiptAIService {
    if (!BioReceiptAIService.instance) {
      BioReceiptAIService.instance = new BioReceiptAIService();
    }
    return BioReceiptAIService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await loggingService.info('BioReceipt AI Service initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive AI insights from analysis data
   */
  async generateInsights(
    analysis: BioReceiptAnalysis,
    recentIntakes: SubstanceIntake[]
  ): Promise<AIInsightResponse> {
    const startTime = Date.now();
    
    try {
      // Generate different types of content
      const [summary, detailedAnalysis, recommendations, warnings] = await Promise.all([
        this.generateSummary(analysis, recentIntakes),
        this.generateDetailedAnalysis(analysis, recentIntakes),
        this.generateRecommendations(analysis, recentIntakes),
        this.generateWarnings(analysis, recentIntakes)
      ]);

      const response: AIInsightResponse = {
        responseId: this.generateResponseId(),
        userId: analysis.userId,
        timestamp: new Date(),
        summary,
        detailedAnalysis,
        recommendations,
        warnings,
        confidence: analysis.confidence,
        processingTime: Date.now() - startTime,
        modelVersion: '2.0.0'
      };

      await loggingService.info('AI insights generated', {
        userId: analysis.userId,
        responseId: response.responseId,
        processingTime: response.processingTime,
        recommendationCount: recommendations.length,
        warningCount: warnings.length
      });

      return response;
    } catch (error) {
      await loggingService.error('AI insight generation failed', {
        userId: analysis.userId,
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Generate executive summary
   */
  private async generateSummary(
    analysis: BioReceiptAnalysis,
    recentIntakes: SubstanceIntake[]
  ): Promise<string> {
    const impactLevel = this.categorizeImpactLevel(analysis.impactScore.overall);
    const riskCount = analysis.interactionRisks.filter(r => r.severity === 'high' || r.severity === 'critical').length;
    const recoveryTime = Math.round(analysis.recoveryTimeline.totalDuration);

    let summary = `Current Status: ${impactLevel} impact level (${analysis.impactScore.overall}/100). `;

    if (riskCount > 0) {
      summary += `⚠️ ${riskCount} high-priority risk${riskCount > 1 ? 's' : ''} detected. `;
    }

    if (recoveryTime > 0) {
      summary += `Recovery expected in ${recoveryTime} hours. `;
    }

    if (analysis.personalizedInsights.length > 0) {
      const actionableInsights = analysis.personalizedInsights.filter(i => i.actionable).length;
      if (actionableInsights > 0) {
        summary += `${actionableInsights} actionable insight${actionableInsights > 1 ? 's' : ''} available.`;
      }
    }

    return summary.trim();
  }

  /**
   * Generate detailed analysis
   */
  private async generateDetailedAnalysis(
    analysis: BioReceiptAnalysis,
    recentIntakes: SubstanceIntake[]
  ): Promise<string> {
    let detailedAnalysis = '';

    // Impact Score Analysis
    detailedAnalysis += `**Impact Analysis:**\n`;
    detailedAnalysis += `Overall impact score: ${analysis.impactScore.overall}/100 (${analysis.impactScore.trend})\n`;
    detailedAnalysis += `• Physical: ${analysis.impactScore.categories.physical}/100\n`;
    detailedAnalysis += `• Cognitive: ${analysis.impactScore.categories.cognitive}/100\n`;
    detailedAnalysis += `• Emotional: ${analysis.impactScore.categories.emotional}/100\n`;
    detailedAnalysis += `• Metabolic: ${analysis.impactScore.categories.metabolic}/100\n\n`;

    // Interaction Analysis
    if (analysis.interactionRisks.length > 0) {
      detailedAnalysis += `**Interaction Analysis:**\n`;
      const criticalRisks = analysis.interactionRisks.filter(r => r.severity === 'critical');
      const highRisks = analysis.interactionRisks.filter(r => r.severity === 'high');
      
      if (criticalRisks.length > 0) {
        detailedAnalysis += `🚨 Critical risks: ${criticalRisks.length}\n`;
        criticalRisks.forEach(risk => {
          detailedAnalysis += `• ${risk.description}\n`;
        });
      }
      
      if (highRisks.length > 0) {
        detailedAnalysis += `⚠️ High risks: ${highRisks.length}\n`;
        highRisks.forEach(risk => {
          detailedAnalysis += `• ${risk.description}\n`;
        });
      }
      detailedAnalysis += '\n';
    }

    // Recovery Timeline
    if (analysis.recoveryTimeline.phases.length > 0) {
      detailedAnalysis += `**Recovery Timeline:**\n`;
      detailedAnalysis += `Total duration: ${Math.round(analysis.recoveryTimeline.totalDuration)} hours\n`;
      detailedAnalysis += `Peak effects: ${Math.round(analysis.recoveryTimeline.peakEffectTime)} hours from now\n`;
      
      analysis.recoveryTimeline.phases.forEach(phase => {
        detailedAnalysis += `• ${phase.name}: ${Math.round(phase.duration)}h (${phase.priority} priority)\n`;
      });
      detailedAnalysis += '\n';
    }

    // Personalized Insights
    if (analysis.personalizedInsights.length > 0) {
      detailedAnalysis += `**Key Insights:**\n`;
      analysis.personalizedInsights.slice(0, 3).forEach(insight => {
        const icon = this.getInsightIcon(insight.type);
        detailedAnalysis += `${icon} ${insight.title}: ${insight.description}\n`;
      });
    }

    return detailedAnalysis;
  }

  /**
   * Generate AI recommendations
   */
  private async generateRecommendations(
    analysis: BioReceiptAnalysis,
    recentIntakes: SubstanceIntake[]
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Immediate safety recommendations
    const criticalRisks = analysis.interactionRisks.filter(r => r.severity === 'critical');
    if (criticalRisks.length > 0) {
      recommendations.push({
        id: this.generateId('rec'),
        type: 'immediate',
        priority: 'urgent',
        title: 'Critical Safety Action Required',
        description: 'Immediate steps needed to address critical interaction risks',
        reasoning: `${criticalRisks.length} critical interaction${criticalRisks.length > 1 ? 's' : ''} detected`,
        actionSteps: [
          'Stop any additional substance intake immediately',
          'Monitor vital signs and symptoms closely',
          'Have emergency contacts readily available',
          'Seek medical attention if experiencing adverse effects'
        ],
        expectedOutcome: 'Reduced risk of serious adverse effects',
        timeframe: 'Immediate (next 30 minutes)'
      });
    }

    // Recovery optimization recommendations
    if (analysis.recoveryTimeline.totalDuration > 0) {
      const recoveryRecs = this.generateRecoveryRecommendations(analysis.recoveryTimeline);
      recommendations.push(...recoveryRecs);
    }

    // Optimization recommendations
    if (analysis.optimizationSuggestions.length > 0) {
      const topOptimizations = analysis.optimizationSuggestions
        .filter(s => s.difficulty === 'easy')
        .slice(0, 2);

      topOptimizations.forEach(opt => {
        recommendations.push({
          id: this.generateId('rec'),
          type: 'short_term',
          priority: 'medium',
          title: opt.title,
          description: opt.description,
          reasoning: opt.evidence,
          actionSteps: [opt.description],
          expectedOutcome: opt.expectedBenefit,
          timeframe: 'Next 24-48 hours'
        });
      });
    }

    // Pattern-based recommendations
    const patternRecs = this.generatePatternRecommendations(analysis);
    recommendations.push(...patternRecs);

    return recommendations.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  /**
   * Generate AI warnings
   */
  private async generateWarnings(
    analysis: BioReceiptAnalysis,
    recentIntakes: SubstanceIntake[]
  ): Promise<AIWarning[]> {
    const warnings: AIWarning[] = [];

    // Critical interaction warnings
    const criticalRisks = analysis.interactionRisks.filter(r => r.severity === 'critical');
    criticalRisks.forEach(risk => {
      warnings.push({
        id: this.generateId('warn'),
        severity: 'critical',
        title: 'Critical Interaction Risk',
        message: risk.description,
        details: `Mechanism: ${risk.mechanism}. Time window: ${risk.timeWindow} hours.`,
        immediateActions: risk.recommendations.slice(0, 3),
        monitoringAdvice: [
          'Monitor for unusual symptoms',
          'Track vital signs if possible',
          'Note any changes in effects'
        ]
      });
    });

    // High impact warnings
    if (analysis.impactScore.overall > 80) {
      warnings.push({
        id: this.generateId('warn'),
        severity: 'warning',
        title: 'High Physiological Impact',
        message: `Current impact score of ${analysis.impactScore.overall}/100 indicates significant physiological stress`,
        details: `Highest impact areas: ${this.getHighestImpactAreas(analysis.impactScore)}`,
        immediateActions: [
          'Avoid additional substances',
          'Stay hydrated',
          'Monitor symptoms closely'
        ],
        monitoringAdvice: [
          'Track how you feel over the next few hours',
          'Note any unusual symptoms',
          'Consider reducing future doses'
        ]
      });
    }

    // Risk factor warnings
    analysis.riskFactors.forEach(factor => {
      if (factor.severity === 'high' || factor.severity === 'critical') {
        warnings.push({
          id: this.generateId('warn'),
          severity: factor.severity === 'critical' ? 'critical' : 'warning',
          title: `${factor.type.charAt(0).toUpperCase() + factor.type.slice(1)} Risk Factor`,
          message: factor.description,
          details: `Type: ${factor.type}. Requires ongoing attention.`,
          immediateActions: factor.mitigation.slice(0, 3),
          monitoringAdvice: factor.monitoring
        });
      }
    });

    return warnings.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  /**
   * Helper methods for generating specific recommendation types
   */
  private generateRecoveryRecommendations(timeline: RecoveryTimeline): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Hydration recommendation
    recommendations.push({
      id: this.generateId('rec'),
      type: 'immediate',
      priority: 'high',
      title: 'Optimize Hydration',
      description: 'Maintain proper hydration to support recovery and substance clearance',
      reasoning: 'Proper hydration supports metabolic processes and reduces recovery time',
      actionSteps: [
        'Drink 8-12 oz of water every hour',
        'Add electrolytes if sweating or active',
        'Avoid excessive caffeine or alcohol'
      ],
      expectedOutcome: 'Faster recovery and reduced side effects',
      timeframe: `Next ${Math.round(timeline.totalDuration)} hours`
    });

    // Rest recommendation
    if (timeline.totalDuration > 6) {
      recommendations.push({
        id: this.generateId('rec'),
        type: 'short_term',
        priority: 'medium',
        title: 'Prioritize Recovery Rest',
        description: 'Quality rest supports natural recovery processes',
        reasoning: 'Extended recovery period benefits from proper rest',
        actionSteps: [
          'Aim for 7-9 hours of sleep',
          'Create a calm environment',
          'Avoid stimulating activities before bed'
        ],
        expectedOutcome: 'Enhanced recovery and better next-day function',
        timeframe: 'Next 24 hours'
      });
    }

    return recommendations;
  }

  private generatePatternRecommendations(analysis: BioReceiptAnalysis): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Check for concerning patterns
    const concerningInsights = analysis.personalizedInsights.filter(
      i => i.type === 'warning' && i.actionable
    );

    concerningInsights.forEach(insight => {
      if (insight.actions && insight.actions.length > 0) {
        recommendations.push({
          id: this.generateId('rec'),
          type: 'long_term',
          priority: 'medium',
          title: insight.title,
          description: insight.description,
          reasoning: `Pattern analysis indicates: ${insight.description}`,
          actionSteps: insight.actions,
          expectedOutcome: 'Improved long-term usage patterns and safety',
          timeframe: 'Next 1-2 weeks'
        });
      }
    });

    return recommendations;
  }

  /**
   * Initialize prompt templates
   */
  private initializePromptTemplates(): void {
    const templates: PromptTemplate[] = [
      {
        id: 'summary_generation',
        name: 'Executive Summary',
        category: 'summary',
        template: 'Generate executive summary for impact {{impactScore}}, {{riskCount}} risks, {{recoveryTime}}h recovery',
        variables: ['impactScore', 'riskCount', 'recoveryTime']
      },
      {
        id: 'detailed_analysis',
        name: 'Detailed Analysis',
        category: 'analysis',
        template: 'Provide detailed analysis of {{categories}} with {{interactionCount}} interactions',
        variables: ['categories', 'interactionCount']
      },
      {
        id: 'safety_recommendations',
        name: 'Safety Recommendations',
        category: 'recommendation',
        template: 'Generate safety recommendations for {{riskLevel}} risk with {{criticalCount}} critical issues',
        variables: ['riskLevel', 'criticalCount']
      },
      {
        id: 'critical_warnings',
        name: 'Critical Warnings',
        category: 'warning',
        template: 'Generate critical warnings for {{severity}} interactions: {{interactions}}',
        variables: ['severity', 'interactions']
      }
    ];

    templates.forEach(template => {
      this.promptTemplates.set(template.id, template);
    });
  }

  /**
   * Utility methods
   */
  private categorizeImpactLevel(score: number): string {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Low-Moderate';
    return 'Low';
  }

  private getInsightIcon(type: string): string {
    const icons = {
      pattern: '📊',
      optimization: '💡',
      warning: '⚠️',
      achievement: '🎯'
    };
    return icons[type] || '•';
  }

  private getHighestImpactAreas(impactScore: ImpactScore): string {
    const categories = Object.entries(impactScore.categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([category, score]) => `${category} (${score})`)
      .join(', ');
    return categories;
  }

  private getPriorityWeight(priority: string): number {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 0;
  }

  private getSeverityWeight(severity: string): number {
    const weights = { critical: 4, warning: 3, caution: 2, info: 1 };
    return weights[severity] || 0;
  }

  private generateResponseId(): string {
    return `ai_response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const BioReceiptAIService = BioReceiptAIService.getInstance();
