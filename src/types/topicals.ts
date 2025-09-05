/**
 * Topicals Module Types
 * Types for tracking topical products like makeup, skincare, personal care items
 */

export type TopicalCategory = 
  | 'skincare'
  | 'makeup'
  | 'haircare'
  | 'bodycare'
  | 'suncare'
  | 'eyecare'
  | 'oralcare'
  | 'deodorant'
  | 'fragrance'
  | 'other';

export interface TopicalProduct {
  id: string;
  name: string;
  brand?: string;
  category: TopicalCategory;
  photoUri?: string;
  barcode?: string;
  upc?: string;
  ingredients?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface UseEvent {
  id: string;
  productId: string;
  timestamp: string;
  bodyArea?: string[];
  amount?: 'light' | 'moderate' | 'heavy';
  notes?: string;
  photoUri?: string;
  userId: string;
}

export interface EffectCheckin {
  id: string;
  useEventId: string;
  timestamp: string;
  symptoms: {
    itch: number; // 0-3 scale
    redness: number; // 0-3 scale
    dryness: number; // 0-3 scale
    irritation: number; // 0-3 scale
    breakout: number; // 0-3 scale
    headache: number; // 0-3 scale
    sleep: number; // 0-3 scale (0 = no impact, 3 = severe impact)
    mood: number; // 0-3 scale (0 = no impact, 3 = severe negative impact)
  };
  overallRating: number; // 1-5 scale
  notes?: string;
  userId: string;
}

export interface TopicalTimeline {
  useEvent: UseEvent;
  effectCheckins: EffectCheckin[];
}

export interface BarcodeResult {
  data: string;
  type: string;
  bounds?: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
}

export interface ProductSearchResult {
  upc: string;
  name: string;
  brand?: string;
  category?: string;
  ingredients?: string[];
  imageUrl?: string;
}

// Store state interfaces
export interface TopicalsState {
  products: Record<string, TopicalProduct>;
  useEvents: Record<string, UseEvent>;
  effectCheckins: Record<string, EffectCheckin>;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: TopicalCategory | 'all';
  barcodeScanning: boolean;
}

// Action types
export type TopicalsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_CATEGORY'; payload: TopicalCategory | 'all' }
  | { type: 'SET_BARCODE_SCANNING'; payload: boolean }
  | { type: 'ADD_PRODUCT'; payload: TopicalProduct }
  | { type: 'UPDATE_PRODUCT'; payload: TopicalProduct }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_PRODUCTS'; payload: TopicalProduct[] }
  | { type: 'ADD_USE_EVENT'; payload: UseEvent }
  | { type: 'UPDATE_USE_EVENT'; payload: UseEvent }
  | { type: 'DELETE_USE_EVENT'; payload: string }
  | { type: 'SET_USE_EVENTS'; payload: UseEvent[] }
  | { type: 'ADD_EFFECT_CHECKIN'; payload: EffectCheckin }
  | { type: 'UPDATE_EFFECT_CHECKIN'; payload: EffectCheckin }
  | { type: 'DELETE_EFFECT_CHECKIN'; payload: string }
  | { type: 'SET_EFFECT_CHECKINS'; payload: EffectCheckin[] };

// Category metadata
export const TOPICAL_CATEGORIES: Record<TopicalCategory, { 
  label: string; 
  icon: string; 
  color: string;
  commonBodyAreas: string[];
}> = {
  skincare: {
    label: 'Skincare',
    icon: '🧴',
    color: '#E8F5E8',
    commonBodyAreas: ['face', 'neck', 'hands', 'body'],
  },
  makeup: {
    label: 'Makeup',
    icon: '💄',
    color: '#FFE8F5',
    commonBodyAreas: ['face', 'eyes', 'lips'],
  },
  haircare: {
    label: 'Hair Care',
    icon: '🧴',
    color: '#E8F0FF',
    commonBodyAreas: ['scalp', 'hair'],
  },
  bodycare: {
    label: 'Body Care',
    icon: '🧴',
    color: '#FFF8E8',
    commonBodyAreas: ['body', 'hands', 'feet'],
  },
  suncare: {
    label: 'Sun Care',
    icon: '☀️',
    color: '#FFE8E8',
    commonBodyAreas: ['face', 'body', 'arms', 'legs'],
  },
  eyecare: {
    label: 'Eye Care',
    icon: '👁️',
    color: '#E8FFE8',
    commonBodyAreas: ['eyes'],
  },
  oralcare: {
    label: 'Oral Care',
    icon: '🦷',
    color: '#E8F8FF',
    commonBodyAreas: ['mouth', 'teeth', 'gums'],
  },
  deodorant: {
    label: 'Deodorant',
    icon: '🧴',
    color: '#F0E8FF',
    commonBodyAreas: ['underarms', 'feet'],
  },
  fragrance: {
    label: 'Fragrance',
    icon: '🌸',
    color: '#FFE8F0',
    commonBodyAreas: ['wrists', 'neck', 'body'],
  },
  other: {
    label: 'Other',
    icon: '📦',
    color: '#F5F5F5',
    commonBodyAreas: ['body'],
  },
};

// Symptom severity labels
export const SYMPTOM_LABELS = {
  0: 'None',
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe',
};

// Body areas for application tracking
export const BODY_AREAS = [
  'face',
  'forehead',
  'cheeks',
  'nose',
  'chin',
  'eyes',
  'eyelids',
  'lips',
  'neck',
  'scalp',
  'hair',
  'ears',
  'chest',
  'back',
  'shoulders',
  'arms',
  'elbows',
  'wrists',
  'hands',
  'fingers',
  'abdomen',
  'legs',
  'thighs',
  'knees',
  'calves',
  'ankles',
  'feet',
  'toes',
  'underarms',
  'groin',
  'buttocks',
];

// Amount options
export const AMOUNT_OPTIONS = [
  { value: 'light', label: 'Light application', icon: '💧' },
  { value: 'moderate', label: 'Moderate application', icon: '💧💧' },
  { value: 'heavy', label: 'Heavy application', icon: '💧💧💧' },
] as const;