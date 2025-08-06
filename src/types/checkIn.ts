/**
 * Check-In Types
 * Type definitions for user check-ins and mood tracking
 */

export interface CheckIn {
  id: string;
  userId: string;
  mood: number; // 1-5 scale (1=very bad, 5=excellent)
  notes?: string;
  timestamp: Date;
  // Additional check-in fields
  energyLevel?: number; // 1-5 scale
  stressLevel?: number; // 1-5 scale
  sleepQuality?: number; // 1-5 scale
  tags?: string[];
  location?: CheckInLocation;
  weather?: WeatherData;
  activities?: string[];
  symptoms?: string[];
  medications?: MedicationEntry[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckInLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  timezone?: string;
}

export interface WeatherData {
  temperature?: number;
  humidity?: number;
  condition?: string; // sunny, cloudy, rainy, etc.
  pressure?: number;
}

export interface MedicationEntry {
  name: string;
  dosage?: string;
  time?: string;
  taken: boolean;
  notes?: string;
}

export interface CheckInSummary {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  averageMood: number;
  averageEnergyLevel?: number;
  averageStressLevel?: number;
  averageSleepQuality?: number;
  totalCheckIns: number;
  streakDays: number;
  insights: CheckInInsight[];
}

export interface CheckInInsight {
  type: 'trend' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  relatedData?: any;
}

export interface CheckInReminder {
  id: string;
  userId: string;
  time: string; // HH:MM format
  frequency: 'daily' | 'weekly' | 'custom';
  isActive: boolean;
  customDays?: number[]; // 0-6 (Sunday-Saturday)
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Validation constraints
export const CHECK_IN_CONSTRAINTS = {
  mood: {
    min: 1,
    max: 5,
    required: true,
  },
  energyLevel: {
    min: 1,
    max: 5,
    required: false,
  },
  stressLevel: {
    min: 1,
    max: 5,
    required: false,
  },
  sleepQuality: {
    min: 1,
    max: 5,
    required: false,
  },
  notes: {
    maxLength: 500,
    required: false,
  },
  tags: {
    maxItems: 10,
    maxLength: 30, // per tag
    required: false,
  },
  activities: {
    maxItems: 20,
    maxLength: 50, // per activity
    required: false,
  },
  symptoms: {
    maxItems: 15,
    maxLength: 50, // per symptom
    required: false,
  },
} as const;

// Mood scale definitions
export const MOOD_SCALE = {
  1: { label: 'Very Bad', emoji: '😢', color: '#FF4444' },
  2: { label: 'Bad', emoji: '😞', color: '#FF8800' },
  3: { label: 'Okay', emoji: '😐', color: '#FFBB00' },
  4: { label: 'Good', emoji: '😊', color: '#88CC00' },
  5: { label: 'Excellent', emoji: '😄', color: '#44AA00' },
} as const;

// Energy level scale definitions
export const ENERGY_SCALE = {
  1: { label: 'Exhausted', emoji: '🔋', color: '#FF4444' },
  2: { label: 'Low', emoji: '🔋', color: '#FF8800' },
  3: { label: 'Moderate', emoji: '🔋', color: '#FFBB00' },
  4: { label: 'High', emoji: '🔋', color: '#88CC00' },
  5: { label: 'Energized', emoji: '⚡', color: '#44AA00' },
} as const;