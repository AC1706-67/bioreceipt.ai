/**
 * Biometric Data Models
 * Comprehensive models for wearable device data integration
 */

// Core Biometric Data Types
export interface BiometricReading {
  id: string;
  userId: string;
  deviceId: string;
  deviceType: WearableDeviceType;
  timestamp: Date;
  dataType: BiometricDataType;
  value: number;
  unit: string;
  quality: DataQuality;
  source: DataSource;
  metadata?: BiometricMetadata;
}

export interface BiometricMetadata {
  accuracy?: number;
  confidence?: number;
  context?: string;
  activity?: ActivityContext;
  environment?: EnvironmentContext;
  calibration?: CalibrationData;
}

// Device and Source Types
export enum WearableDeviceType {
  APPLE_WATCH = 'apple_watch',
  FITBIT = 'fitbit',
  OURA_RING = 'oura_ring',
  GARMIN = 'garmin',
  SAMSUNG_HEALTH = 'samsung_health',
  GOOGLE_FIT = 'google_fit',
  MANUAL_ENTRY = 'manual_entry',
  UNKNOWN = 'unknown'
}

export enum DataSource {
  APPLE_HEALTH = 'apple_health',
  GOOGLE_FIT = 'google_fit',
  FITBIT_API = 'fitbit_api',
  OURA_API = 'oura_api',
  GARMIN_CONNECT = 'garmin_connect',
  SAMSUNG_HEALTH = 'samsung_health',
  MANUAL = 'manual',
  IMPORTED = 'imported'
}

export enum BiometricDataType {
  // Cardiovascular
  HEART_RATE = 'heart_rate',
  HEART_RATE_VARIABILITY = 'heart_rate_variability',
  BLOOD_PRESSURE_SYSTOLIC = 'blood_pressure_systolic',
  BLOOD_PRESSURE_DIASTOLIC = 'blood_pressure_diastolic',
  RESTING_HEART_RATE = 'resting_heart_rate',
  
  // Sleep
  SLEEP_DURATION = 'sleep_duration',
  SLEEP_EFFICIENCY = 'sleep_efficiency',
  DEEP_SLEEP = 'deep_sleep',
  REM_SLEEP = 'rem_sleep',
  LIGHT_SLEEP = 'light_sleep',
  SLEEP_SCORE = 'sleep_score',
  
  // Activity
  STEPS = 'steps',
  DISTANCE = 'distance',
  CALORIES_BURNED = 'calories_burned',
  ACTIVE_MINUTES = 'active_minutes',
  EXERCISE_MINUTES = 'exercise_minutes',
  FLOORS_CLIMBED = 'floors_climbed',
  
  // Stress & Recovery
  STRESS_LEVEL = 'stress_level',
  RECOVERY_SCORE = 'recovery_score',
  READINESS_SCORE = 'readiness_score',
  ENERGY_LEVEL = 'energy_level',
  
  // Body Metrics
  BODY_TEMPERATURE = 'body_temperature',
  SKIN_TEMPERATURE = 'skin_temperature',
  RESPIRATORY_RATE = 'respiratory_rate',
  OXYGEN_SATURATION = 'oxygen_saturation',
  BODY_WEIGHT = 'body_weight',
  BODY_FAT_PERCENTAGE = 'body_fat_percentage',
  
  // Environmental
  AMBIENT_TEMPERATURE = 'ambient_temperature',
  HUMIDITY = 'humidity',
  UV_INDEX = 'uv_index'
}

export enum DataQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  INVALID = 'invalid'
}

// Context Information
export interface ActivityContext {
  activityType: ActivityType;
  intensity: ActivityIntensity;
  duration?: number; // minutes
  location?: string;
}

export enum ActivityType {
  RESTING = 'resting',
  WALKING = 'walking',
  RUNNING = 'running',
  CYCLING = 'cycling',
  SWIMMING = 'swimming',
  STRENGTH_TRAINING = 'strength_training',
  YOGA = 'yoga',
  MEDITATION = 'meditation',
  SLEEP = 'sleep',
  WORK = 'work',
  OTHER = 'other'
}

export enum ActivityIntensity {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  VIGOROUS = 'vigorous',
  MAXIMUM = 'maximum'
}

export interface EnvironmentContext {
  temperature?: number;
  humidity?: number;
  altitude?: number;
  airQuality?: number;
  noiseLevel?: number;
}

export interface CalibrationData {
  lastCalibrated: Date;
  calibrationAccuracy: number;
  calibrationMethod: string;
}

// Aggregated Data Types
export interface BiometricSummary {
  userId: string;
  date: Date;
  dataType: BiometricDataType;
  
  // Statistical measures
  average: number;
  minimum: number;
  maximum: number;
  median: number;
  standardDeviation: number;
  
  // Data quality
  totalReadings: number;
  validReadings: number;
  dataQualityScore: number;
  
  // Trends
  trend: TrendDirection;
  trendStrength: number;
  comparisonToPrevious: number; // percentage change
  
  // Context
  primaryActivity: ActivityType;
  averageStressLevel?: number;
  sleepQuality?: number;
}

export enum TrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

// Device Connection and Status
export interface WearableDevice {
  id: string;
  userId: string;
  deviceType: WearableDeviceType;
  deviceName: string;
  model?: string;
  serialNumber?: string;
  
  // Connection status
  isConnected: boolean;
  lastSyncTime: Date;
  connectionQuality: ConnectionQuality;
  batteryLevel?: number;
  
  // Data capabilities
  supportedDataTypes: BiometricDataType[];
  syncFrequency: SyncFrequency;
  dataRetentionDays: number;
  
  // Authentication
  authToken?: string;
  authExpiry?: Date;
  refreshToken?: string;
  
  // Settings
  isEnabled: boolean;
  syncEnabled: boolean;
  notificationsEnabled: boolean;
  
  // Metadata
  addedDate: Date;
  lastUpdated: Date;
  firmwareVersion?: string;
  appVersion?: string;
}

export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  DISCONNECTED = 'disconnected'
}

export enum SyncFrequency {
  REAL_TIME = 'real_time',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  HOURLY = 'hourly',
  DAILY = 'daily',
  MANUAL = 'manual'
}

// Health Insights from Biometric Data
export interface BiometricInsight {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Insight details
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  
  // Supporting data
  relatedDataTypes: BiometricDataType[];
  timeRange: TimeRange;
  confidence: number;
  
  // Recommendations
  recommendations: BiometricRecommendation[];
  
  // Correlations
  correlations: DataCorrelation[];
  
  // Status
  isActionable: boolean;
  priority: InsightPriority;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export enum InsightType {
  TREND_ANALYSIS = 'trend_analysis',
  ANOMALY_DETECTION = 'anomaly_detection',
  CORRELATION_DISCOVERY = 'correlation_discovery',
  PATTERN_RECOGNITION = 'pattern_recognition',
  THRESHOLD_ALERT = 'threshold_alert',
  PREDICTION = 'prediction'
}

export enum InsightCategory {
  CARDIOVASCULAR = 'cardiovascular',
  SLEEP_RECOVERY = 'sleep_recovery',
  ACTIVITY_FITNESS = 'activity_fitness',
  STRESS_WELLNESS = 'stress_wellness',
  BODY_COMPOSITION = 'body_composition',
  ENVIRONMENTAL = 'environmental'
}

export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface BiometricRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  actionSteps: string[];
  expectedOutcome: string;
  timeframe: string;
  difficulty: DifficultyLevel;
}

export enum RecommendationType {
  LIFESTYLE_CHANGE = 'lifestyle_change',
  ACTIVITY_ADJUSTMENT = 'activity_adjustment',
  SLEEP_OPTIMIZATION = 'sleep_optimization',
  STRESS_MANAGEMENT = 'stress_management',
  MEDICAL_CONSULTATION = 'medical_consultation',
  DEVICE_CALIBRATION = 'device_calibration'
}

export enum DifficultyLevel {
  EASY = 'easy',
  MODERATE = 'moderate',
  CHALLENGING = 'challenging',
  EXPERT = 'expert'
}

export interface DataCorrelation {
  primaryDataType: BiometricDataType;
  secondaryDataType: BiometricDataType;
  correlationStrength: number; // -1 to 1
  correlationType: CorrelationType;
  timeDelay?: number; // minutes
  confidence: number;
}

export enum CorrelationType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  COMPLEX = 'complex'
}

export interface TimeRange {
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  granularity: TimeGranularity;
}

export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

// Data Validation and Quality
export interface DataValidationResult {
  isValid: boolean;
  quality: DataQuality;
  issues: ValidationIssue[];
  confidence: number;
  suggestedActions: string[];
}

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: IssueSeverity;
  description: string;
  affectedReadings: number;
  suggestedFix?: string;
}

export enum ValidationIssueType {
  MISSING_DATA = 'missing_data',
  OUTLIER_VALUES = 'outlier_values',
  INCONSISTENT_TIMING = 'inconsistent_timing',
  DEVICE_MALFUNCTION = 'device_malfunction',
  CALIBRATION_NEEDED = 'calibration_needed',
  SYNC_ISSUES = 'sync_issues'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Export utility types
export type BiometricDataPoint = {
  timestamp: Date;
  value: number;
  quality: DataQuality;
};

export type BiometricTimeSeries = {
  dataType: BiometricDataType;
  unit: string;
  data: BiometricDataPoint[];
  summary: BiometricSummary;
};

export type DeviceCapabilities = {
  deviceType: WearableDeviceType;
  supportedDataTypes: BiometricDataType[];
  maxSyncFrequency: SyncFrequency;
  batteryLife: number; // hours
  waterResistance: boolean;
  gpsCapable: boolean;
};

// Health Score Calculation
export interface HealthScore {
  userId: string;
  timestamp: Date;
  
  // Overall scores
  overallScore: number; // 0-100
  cardiovascularScore: number;
  sleepScore: number;
  activityScore: number;
  recoveryScore: number;
  
  // Contributing factors
  factors: HealthScoreFactor[];
  
  // Trends
  trend: TrendDirection;
  weeklyChange: number;
  monthlyChange: number;
  
  // Recommendations
  topRecommendations: BiometricRecommendation[];
}

export interface HealthScoreFactor {
  category: InsightCategory;
  weight: number; // 0-1
  score: number; // 0-100
  impact: FactorImpact;
  description: string;
}

export enum FactorImpact {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative'
}