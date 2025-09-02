/**
 * Jest Setup Configuration
 * Global test setup and mocks
 */

// Mock React Native Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return Object.setPrototypeOf(
    {
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
      StatusBar: {
        currentHeight: 44,
        setBarStyle: jest.fn(),
        setBackgroundColor: jest.fn(),
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
      Animated: {
        ...RN.Animated,
        timing: jest.fn(() => ({
          start: jest.fn(),
        })),
        Value: jest.fn(() => ({
          setValue: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      },
      StyleSheet: {
        create: jest.fn((styles) => styles),
      },
      NativeModules: {
        ...RN.NativeModules,
        RNKeychainManager: {},
        RNEncryptedStorage: {},
        BlobModule: {},
      },
      TurboModuleRegistry: {
        getEnforcing: jest.fn(() => ({})),
      },
    },
    RN
  );
});

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

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => require('./src/__mocks__/netinfo').default);

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() => Promise.resolve({ username: 'test', password: 'test' })),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('FaceID')),
}));

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve('mock-data')),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => {});

// Mock RNFS
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({ size: 1024 })),
  readFile: jest.fn(() => Promise.resolve('mock-file-data')),
}));

// Mock Supabase
jest.mock('./src/config/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'mock-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://mock-url.com' } })),
      })),
    },
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: 'PanGestureHandler',
  State: {
    END: 5,
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