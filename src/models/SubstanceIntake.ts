/**
 * Substance Intake Model
 * Represents a logged substance intake entry in BioReceipt.AI
 */

import { SubstanceCategory } from './Substance';

export interface SubstanceIntake {
  id: string;
  userId: string;
  substanceId: string;
  
  // Intake details
  quantity: number;
  unit: string;
  timestamp: Date;
  
  // Context and notes
  notes?: string;
  context?: string;
  location?: string;
  mood?: string;
  
  // Verification and tracking
  verified: boolean;
  source: 'manual' | 'imported' | 'estimated';
  confidence: number; // 0-1 scale
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Cached substance info for quick access
  substanceName: string;
  substanceCategory: SubstanceCategory;
}

export interface IntakeSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  intakes: SubstanceIntake[];
  sessionType: 'social' | 'medical' | 'fitness' | 'recreational' | 'other';
  notes?: string;
}

export interface IntakeAnalysis {
  intakeId: string;
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  riskFactors: string[];
  
  // Interactions
  interactions: {
    withSubstanceId: string;
    interactionType: 'dangerous' | 'caution' | 'synergistic' | 'antagonistic';
    severity: 'low' | 'medium' | 'high' | 'extreme';
    description: string;
  }[];
  
  // Timing analysis
  peakEffectTime?: Date;
  estimatedDuration?: number; // in hours
  clearanceTime?: Date;
  
  // Recommendations
  recommendations: {
    type: 'hydration' | 'nutrition' | 'rest' | 'medical' | 'general';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    message: string;
    actionable: boolean;
  }[];
  
  // Analysis metadata
  analyzedAt: Date;
  confidence: number;
  version: string;
}

export interface IntakePattern {
  userId: string;
  substanceId: string;
  
  // Pattern metrics
  frequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  
  // Dosage patterns
  averageDose: number;
  minDose: number;
  maxDose: number;
  unit: string;
  
  // Timing patterns
  commonTimes: string[]; // hour of day
  commonDays: string[]; // day of week
  
  // Context patterns
  commonContexts: string[];
  commonLocations: string[];
  commonMoods: string[];
  
  // Trend analysis
  trend: 'increasing' | 'decreasing' | 'stable' | 'irregular';
  trendConfidence: number;
  
  // Risk indicators
  riskIndicators: {
    escalatingDose: boolean;
    increasingFrequency: boolean;
    negativeContexts: boolean;
    dangerousPatterns: boolean;
  };
  
  // Analysis period
  periodStart: Date;
  periodEnd: Date;
  lastUpdated: Date;
}

// Utility functions for intake management
export const createIntakeEntry = (
  userId: string,
  substanceId: string,
  substanceName: string,
  substanceCategory: SubstanceCategory,
  quantity: number,
  unit: string,
  timestamp: Date = new Date(),
  notes?: string
): SubstanceIntake => {
  const now = new Date();
  
  return {
    id: generateIntakeId(),
    userId,
    substanceId,
    quantity,
    unit,
    timestamp,
    notes,
    verified: false,
    source: 'manual',
    confidence: 1.0,
    createdAt: now,
    updatedAt: now,
    substanceName,
    substanceCategory
  };
};

export const generateIntakeId = (): string => {
  return `intake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateTotalIntake = (
  intakes: SubstanceIntake[],
  substanceId: string,
  timeWindow: number = 24 // hours
): number => {
  const cutoffTime = new Date(Date.now() - (timeWindow * 60 * 60 * 1000));
  
  return intakes
    .filter(intake => 
      intake.substanceId === substanceId && 
      intake.timestamp >= cutoffTime
    )
    .reduce((total, intake) => total + intake.quantity, 0);
};

export const getIntakesByTimeRange = (
  intakes: SubstanceIntake[],
  startTime: Date,
  endTime: Date
): SubstanceIntake[] => {
  return intakes.filter(intake => 
    intake.timestamp >= startTime && intake.timestamp <= endTime
  );
};

export const groupIntakesBySubstance = (
  intakes: SubstanceIntake[]
): Record<string, SubstanceIntake[]> => {
  return intakes.reduce((groups, intake) => {
    const key = intake.substanceId;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(intake);
    return groups;
  }, {} as Record<string, SubstanceIntake[]>);
};

export const getRecentIntakes = (
  intakes: SubstanceIntake[],
  hours: number = 24
): SubstanceIntake[] => {
  const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return intakes
    .filter(intake => intake.timestamp >= cutoffTime)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const calculateIntakeFrequency = (
  intakes: SubstanceIntake[],
  substanceId: string,
  days: number = 30
): number => {
  const cutoffTime = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  const relevantIntakes = intakes.filter(intake => 
    intake.substanceId === substanceId && 
    intake.timestamp >= cutoffTime
  );
  
  return relevantIntakes.length / days;
};

// Validation functions
export const validateIntakeEntry = (intake: Partial<SubstanceIntake>): string[] => {
  const errors: string[] = [];
  
  if (!intake.userId) {
    errors.push('User ID is required');
  }
  
  if (!intake.substanceId) {
    errors.push('Substance ID is required');
  }
  
  if (!intake.quantity || intake.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (!intake.unit) {
    errors.push('Unit is required');
  }
  
  if (!intake.timestamp) {
    errors.push('Timestamp is required');
  } else if (intake.timestamp > new Date()) {
    errors.push('Timestamp cannot be in the future');
  }
  
  return errors;
};

export const sanitizeIntakeEntry = (intake: SubstanceIntake): SubstanceIntake => {
  return {
    ...intake,
    notes: intake.notes?.trim().substring(0, 500), // Limit notes length
    context: intake.context?.trim().substring(0, 200),
    location: intake.location?.trim().substring(0, 100),
    mood: intake.mood?.trim().substring(0, 50),
    quantity: Math.max(0, intake.quantity), // Ensure positive quantity
    confidence: Math.max(0, Math.min(1, intake.confidence)) // Clamp confidence to 0-1
  };
};
