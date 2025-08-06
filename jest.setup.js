/**
 * Jest Setup Configuration
 * Global test setup and mocks
 */

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Alert: {
    alert: jest.fn(),
  },
  AsyncStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ScrollView: 'ScrollView',
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
  RefreshControl: 'RefreshControl',
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted' })),
    decrypt: jest.fn(() => ({ toString: () => 'decrypted' })),
  },
  enc: {
    Utf8: {
      parse: jest.fn(),
      stringify: jest.fn(() => 'utf8-string'),
    },
  },
  lib: {
    WordArray: {
      random: jest.fn(() => ({ toString: () => 'random-key' })),
    },
  },
  SHA256: jest.fn(() => ({ toString: () => 'hashed-value' })),
}));

// Mock @react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  NavigationContainer: ({ children }) => children,
  DefaultTheme: {},
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: 'Navigator',
    Screen: 'Screen',
  }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: 'Navigator',
    Screen: 'Screen',
  }),
}));

// Mock analytics service
jest.mock('./src/services/analytics/analyticsService', () => ({
  analyticsService: {
    trackEvent: jest.fn(),
    trackScreenView: jest.fn(),
    trackTipInteraction: jest.fn(),
    trackSearch: jest.fn(),
    trackPerformance: jest.fn(),
    trackSessionEnd: jest.fn(),
    initialize: jest.fn(),
    getUserEngagementMetrics: jest.fn(),
    getAppUsageMetrics: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};