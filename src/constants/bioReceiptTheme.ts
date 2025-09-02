/**
 * BioReceipt Theme Configuration
 * Centralized theme and styling constants for the BioReceipt application
 */

export const BioReceiptTheme = {
  // Primary Brand Colors
  colors: {
    primary: '#00D4FF',        // Electric Blue - main brand color
    primaryDark: '#0099CC',    // Darker blue for pressed states
    secondary: '#FF6B35',      // Energy Orange - accent color
    tertiary: '#7B68EE',       // Neural Purple - AI/tech accent
    
    // Background Colors
    background: '#0A0E1A',     // Deep Space - main background
    surface: '#1A1F2E',       // Dark Surface - cards/panels
    surfaceLight: '#2A2F3E',  // Lighter surface for elevated elements
    
    // Text Colors
    text: '#FFFFFF',           // Pure white for primary text (alias for textPrimary)
    textPrimary: '#FFFFFF',    // Pure white for primary text
    textSecondary: '#B0B8C4',  // Light gray for secondary text
    textTertiary: '#6B7280',   // Medium gray for tertiary text
    textMuted: '#4B5563',      // Dark gray for muted text
    
    // Status Colors
    success: '#10B981',        // Green for success states
    warning: '#F59E0B',        // Amber for warnings
    error: '#EF4444',          // Red for errors
    info: '#3B82F6',           // Blue for info
    
    // Substance Category Colors
    alcohol: '#FF6B6B',        // Red for alcohol
    drugs: '#4ECDC4',          // Teal for drugs
    supplements: '#48CAE4',    // Light blue for supplements
    food: '#FECA57',           // Yellow for food
    steroids: '#FF9FF3',       // Pink for steroids
    hormones: '#5F27CD',       // Purple for hormones
    
    // Utility Colors
    border: '#374151',         // Border color
    borderLight: '#4B5563',    // Lighter border
    shadow: 'rgba(0, 0, 0, 0.3)', // Shadow color
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay
    white: '#FFFFFF',          // Pure white
    disabled: '#6B7280',       // Disabled state color
    errorLight: 'rgba(239, 68, 68, 0.1)', // Light error background
  },
  
  // Typography
  typography: {
    // Font Families
    fontFamily: {
      primary: 'Inter',        // Modern, clean font for UI
      mono: 'JetBrains Mono',  // Monospace for data/code
      display: 'Poppins',      // Display font for headers
    },
    
    // Font Sizes
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    
    // Font Weights
    fontWeight: {
      light: '300' as const,
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    
    // Line Heights
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  
  // Border Radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(0, 212, 255, 0.3)', // BioReceipt glow effect
  },
  
  // Animation Durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

// App Constants
export const BioReceiptConstants = {
  appName: 'BioReceipt',
  appTagline: 'Smart Receipt Tracking',
  appDescription: 'Track, analyze, and optimize your substance intake with intelligent insights',
  
  // Version Info
  version: '2.0.0',
  buildNumber: '2024.1',
  
  // API Endpoints (placeholder)
  api: {
    baseUrl: 'https://api.bioreceipt.ai',
    version: 'v1',
  },
  
  // Feature Flags
  features: {
    intakeLogging: true,
    realTimeAnalysis: false, // Phase 2
    wearableIntegration: false, // Phase 3
    communityFeatures: false, // Future
  },
  
  // Limits
  limits: {
    maxIntakesPerDay: 50,
    maxSubstanceNameLength: 100,
    maxNotesLength: 500,
    maxContextLength: 200,
  },
  
  // Default Values
  defaults: {
    intakeQuantity: 1,
    intakeUnit: 'ml',
    reminderInterval: 24, // hours
  },
};

// Substance Category Icons (using emoji for now, can be replaced with custom icons)
export const SubstanceCategoryIcons = {
  alcohol: '🍺',
  drugs_recreational: '💊',
  drugs_prescription: '💉',
  drugs_otc: '🩹',
  food: '🍎',
  supplements: '💊',
  steroids: '💪',
  nootropics: '🧠',
  hormones: '⚗️',
  other: '❓',
};

// Status Icons
export const StatusIcons = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  loading: '⏳',
  sync: '🔄',
  offline: '📴',
  online: '🌐',
};

// Navigation Icons (placeholder - replace with actual icon library)
export const NavigationIcons = {
  home: '🏠',
  log: '📝',
  insights: '📊',
  profile: '👤',
  community: '👥',
  settings: '⚙️',
  help: '❓',
  search: '🔍',
  add: '➕',
  close: '✕',
  back: '←',
  forward: '→',
  up: '↑',
  down: '↓',
};

// Gradient Definitions
export const BioReceiptGradients = {
  primary: ['#00D4FF', '#0099CC'],
  secondary: ['#FF6B35', '#E55A2B'],
  neural: ['#7B68EE', '#6A5ACD'],
  dark: ['#0A0E1A', '#1A1F2E'],
  success: ['#10B981', '#059669'],
  warning: ['#F59E0B', '#D97706'],
  error: ['#EF4444', '#DC2626'],
};

// Component Variants
export const ComponentVariants = {
  button: {
    primary: {
      backgroundColor: '#00D4FF',
      color: '#FFFFFF',
    },
    secondary: {
      backgroundColor: '#FF6B35',
      color: '#FFFFFF',
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: '#00D4FF',
      color: '#00D4FF',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#B0B8C4',
    },
  },
  
  card: {
    default: {
      backgroundColor: '#1A1F2E',
      borderColor: '#374151',
    },
    elevated: {
      backgroundColor: '#2A2F3E',
      shadowColor: 'rgba(0, 0, 0, 0.3)',
    },
    glow: {
      backgroundColor: '#1A1F2E',
      shadowColor: '#00D4FF',
    },
  },
};

export default BioReceiptTheme;