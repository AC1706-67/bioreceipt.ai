/**
 * BioReceipt Types
 * Types specific to BioReceipt functionality
 */

export interface UserEngagement {
  id: string;
  userId: string;
  entityId: string;
  entityType: 'tip' | 'insight' | 'analysis' | 'recommendation';
  action: 'view' | 'like' | 'bookmark' | 'complete' | 'share' | 'dismiss';
  timestamp: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface BioReceiptMetrics {
  totalAnalyses: number;
  totalInsights: number;
  totalRecommendations: number;
  averageRiskScore: number;
  lastAnalysis: Date;
}

export interface AnalysisEngagement extends UserEngagement {
  riskScore?: number;
  confidenceLevel?: number;
  actionTaken?: boolean;
}

export interface InsightEngagement extends UserEngagement {
  insightType: 'pattern' | 'correlation' | 'prediction' | 'recommendation';
  relevanceScore?: number;
  userFeedback?: 'helpful' | 'not_helpful' | 'inaccurate';
}
