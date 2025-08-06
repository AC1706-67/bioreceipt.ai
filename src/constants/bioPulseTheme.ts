/**
 * BioPulse.AI Brand Theme & Constants
 * Central theme configuration for the BioPulse.AI rebrand
 */

export const BioPulseTheme = {
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
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
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
    glow: '0 0 20px rgba(0, 212, 255, 0.3)', // BioPulse glow effect
  },
  
  // Animation Durations
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

// App Constants
export const BioPulseConstants = {
  appName: 'BioPulse.AI',
  appTagline: 'AI-Powered Biohacking Platform',
  appDescription: 'Track, analyze, and optimize your substance intake with intelligent insights',
  
  // Version Info
  version: '2.0.0',
  buildNumber: '2024.1',
  
  // API Endpoints (placeholder)
  api: {
    baseUrl: 'https://api.biopulse.ai',
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
export const BioPulseGradients = {
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
      backgroundColor: BioPulseTheme.colors.primary,
      color: BioPulseTheme.colors.textPrimary,
    },
    secondary: {
      backgroundColor: BioPulseTheme.colors.secondary,
      color: BioPulseTheme.colors.textPrimary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: BioPulseTheme.colors.primary,
      color: BioPulseTheme.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: BioPulseTheme.colors.textSecondary,
    },
  },
  
  card: {
    default: {
      backgroundColor: BioPulseTheme.colors.surface,
      borderColor: BioPulseTheme.colors.border,
    },
    elevated: {
      backgroundColor: BioPulseTheme.colors.surfaceLight,
      shadowColor: BioPulseTheme.colors.shadow,
    },
    glow: {
      backgroundColor: BioPulseTheme.colors.surface,
      shadowColor: BioPulseTheme.colors.primary,
    },
  },
};

export default BioPulseTheme;