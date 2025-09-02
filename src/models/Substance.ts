/**
 * Substance Model
 * Core data model for substances that can be logged in BioReceipt.AI
 */

export enum SubstanceCategory {
  ALCOHOL = 'alcohol',
  DRUGS_RECREATIONAL = 'drugs_recreational',
  DRUGS_PRESCRIPTION = 'drugs_prescription',
  DRUGS_OTC = 'drugs_otc',
  FOOD = 'food',
  SUPPLEMENTS = 'supplements',
  STEROIDS = 'steroids',
  NOOTROPICS = 'nootropics',
  HORMONES = 'hormones',
  OTHER = 'other'
}

export enum ToxicityLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export enum AddictionPotential {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export enum LegalStatus {
  LEGAL = 'legal',
  PRESCRIPTION_ONLY = 'prescription_only',
  CONTROLLED_SUBSTANCE = 'controlled_substance',
  ILLEGAL = 'illegal',
  VARIES_BY_LOCATION = 'varies_by_location'
}

export interface SafetyProfile {
  toxicityLevel: ToxicityLevel;
  addictionPotential: AddictionPotential;
  legalStatus: LegalStatus;
  commonSideEffects: string[];
  dangerousInteractions: string[];
  contraindications: string[];
  pregnancySafety: 'safe' | 'caution' | 'avoid' | 'unknown';
  breastfeedingSafety: 'safe' | 'caution' | 'avoid' | 'unknown';
}

export interface PharmacologyProfile {
  halfLife?: number; // in hours
  peakEffect?: number; // in hours
  duration?: number; // in hours
  onsetTime?: number; // in hours
  bioavailability?: number; // percentage
  metabolism: string[];
  excretion: string[];
}

export interface DosageInfo {
  unit: string;
  threshold?: number;
  light?: number;
  common?: number;
  strong?: number;
  heavy?: number;
  dangerous?: number;
}

export interface Substance {
  id: string;
  name: string;
  commonNames: string[];
  category: SubstanceCategory;
  subcategory?: string;
  description: string;
  
  // Dosage and units
  commonUnits: string[];
  dosageInfo: DosageInfo[];
  
  // Safety information
  safetyProfile: SafetyProfile;
  pharmacology: PharmacologyProfile;
  
  // Interactions
  interactions: {
    substanceId: string;
    interactionType: 'dangerous' | 'caution' | 'synergistic' | 'antagonistic';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'extreme';
  }[];
  
  // Additional metadata
  tags: string[];
  verified: boolean;
  lastUpdated: Date;
  sources: string[];
}

// Predefined common substances
export const COMMON_SUBSTANCES: Partial<Substance>[] = [
  // Alcohol
  {
    name: 'Beer',
    commonNames: ['beer', 'lager', 'ale', 'stout'],
    category: SubstanceCategory.ALCOHOL,
    commonUnits: ['ml', 'oz', 'pint', 'bottle', 'can'],
    dosageInfo: [
      {
        unit: 'ml',
        light: 250,
        common: 500,
        strong: 750,
        heavy: 1000,
        dangerous: 2000
      }
    ]
  },
  {
    name: 'Wine',
    commonNames: ['wine', 'red wine', 'white wine', 'rosé'],
    category: SubstanceCategory.ALCOHOL,
    commonUnits: ['ml', 'oz', 'glass', 'bottle'],
    dosageInfo: [
      {
        unit: 'ml',
        light: 125,
        common: 250,
        strong: 375,
        heavy: 500,
        dangerous: 1000
      }
    ]
  },
  {
    name: 'Spirits',
    commonNames: ['vodka', 'whiskey', 'rum', 'gin', 'tequila'],
    category: SubstanceCategory.ALCOHOL,
    commonUnits: ['ml', 'oz', 'shot'],
    dosageInfo: [
      {
        unit: 'ml',
        light: 25,
        common: 50,
        strong: 100,
        heavy: 200,
        dangerous: 400
      }
    ]
  },
  
  // Supplements
  {
    name: 'Caffeine',
    commonNames: ['caffeine', 'coffee', 'energy drink'],
    category: SubstanceCategory.SUPPLEMENTS,
    commonUnits: ['mg', 'cup', 'tablet'],
    dosageInfo: [
      {
        unit: 'mg',
        threshold: 20,
        light: 50,
        common: 100,
        strong: 200,
        heavy: 400,
        dangerous: 800
      }
    ]
  },
  {
    name: 'Creatine',
    commonNames: ['creatine', 'creatine monohydrate'],
    category: SubstanceCategory.SUPPLEMENTS,
    commonUnits: ['g', 'scoop', 'tablet'],
    dosageInfo: [
      {
        unit: 'g',
        common: 3,
        strong: 5,
        heavy: 10
      }
    ]
  },
  {
    name: 'Protein Powder',
    commonNames: ['whey protein', 'casein protein', 'protein powder'],
    category: SubstanceCategory.SUPPLEMENTS,
    commonUnits: ['g', 'scoop', 'serving'],
    dosageInfo: [
      {
        unit: 'g',
        light: 15,
        common: 25,
        strong: 50,
        heavy: 100
      }
    ]
  },
  
  // Common medications
  {
    name: 'Ibuprofen',
    commonNames: ['ibuprofen', 'advil', 'motrin'],
    category: SubstanceCategory.DRUGS_OTC,
    commonUnits: ['mg', 'tablet', 'capsule'],
    dosageInfo: [
      {
        unit: 'mg',
        light: 200,
        common: 400,
        strong: 600,
        heavy: 800,
        dangerous: 1200
      }
    ]
  },
  {
    name: 'Acetaminophen',
    commonNames: ['acetaminophen', 'tylenol', 'paracetamol'],
    category: SubstanceCategory.DRUGS_OTC,
    commonUnits: ['mg', 'tablet', 'capsule'],
    dosageInfo: [
      {
        unit: 'mg',
        light: 325,
        common: 500,
        strong: 650,
        heavy: 1000,
        dangerous: 4000
      }
    ]
  }
];

// Unit conversion utilities
export const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  volume: {
    'ml': 1,
    'l': 1000,
    'oz': 29.5735,
    'cup': 236.588,
    'pint': 473.176,
    'shot': 44.3603
  },
  weight: {
    'mg': 1,
    'g': 1000,
    'kg': 1000000,
    'oz': 28349.5,
    'lb': 453592
  }
};

export const convertUnits = (value: number, fromUnit: string, toUnit: string): number => {
  // Find the conversion category
  for (const category of Object.values(UNIT_CONVERSIONS)) {
    if (category[fromUnit] && category[toUnit]) {
      return (value * category[fromUnit]) / category[toUnit];
    }
  }
  
  // If no conversion found, return original value
  return value;
};

export const getUnitCategory = (unit: string): string | null => {
  for (const [category, units] of Object.entries(UNIT_CONVERSIONS)) {
    if (units[unit]) {
      return category;
    }
  }
  return null;
};
