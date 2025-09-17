/**
 * Jest Setup Configuration
 * Global test setup and mocks
 */

const fs = require('fs');
const childProcess = require('child_process');

// If you were writing to `global.something`, do it via globalThis safely:
const g = globalThis;

/**
 * Fix 1: fs.symlink mock signature
 * TS was complaining because the third param can be `fs.symlink.Type | undefined`,
 * and some mocks were passing `null`. We normalize & invoke the callback correctly.
 */
if (jest.isMockFunction(fs.symlink) || fs.symlink) {
  // If you already mocked it elsewhere, reset and reapply a safe impl.
  try { 
    if (fs.symlink && fs.symlink.mockReset) {
      fs.symlink.mockReset(); 
    }
  } catch (e) {
    // Ignore reset errors
  }
}

jest.spyOn(fs, 'symlink').mockImplementation((target, path, typeOrCb, maybeCb) => {
  // Support both overloads: (target, path, cb) and (target, path, type, cb)
  const cb = (typeof typeOrCb === 'function' ? typeOrCb : maybeCb);
  
  // Never pass `null` as the "type" — use `undefined` instead.
  // We just call back success asynchronously to mimic Node.
  queueMicrotask(() => {
    if (cb) cb(null);
  });
  return undefined;
});

/**
 * Fix 2: child_process.execSync type & "Cannot find name 'execSync'"
 * Import from child_process and re-export to wherever your setup expects it.
 * If your code referenced a global `execSync`, define it on globalThis.
 */
g.execSync = function(...args) {
  return childProcess.execSync(args[0], args[1]);
};

/**
 * Fix 3: Generic Jest "(...args: unknown[]) => any" signature errors
 * If you mock functions like exec/spawn/etc, prefer a rest-args signature.
 * Example helpers you can use in this file:
 */
const anyFn = jest.fn((..._args) => undefined);

/**
 * Fix 4: "Element implicitly has an 'any' type because type 'typeof globalThis' has no index signature."
 * Always use `globalThis` (alias `g` above) when you need ad-hoc globals:
 *   g.__MY_TEST_FLAG__ = true
 */

// --- RN DevMenu / TurboModuleRegistry ---
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: () => ({}),
}));

// --- React Native core (StyleSheet.flatten + NativeModules.DevMenu) ---
jest.mock('react-native', () => {
  // Create a safe flatten function without accessing real RN
  const safeFlatten = (input) => {
    if (Array.isArray(input)) {
      return input.reduce((acc, s) => ({ ...acc, ...(typeof s === 'object' ? s : {}) }), {});
    }
    return typeof input === 'object' ? input : {};
  };
  
  return {
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
      flatten: safeFlatten,
    },
    NativeModules: {
      DevMenu: {}, // silence DevMenu invariant
      RNKeychainManager: {},
      RNEncryptedStorage: {},
      BlobModule: {},
    },
    TurboModuleRegistry: {
      getEnforcing: jest.fn(() => ({})),
      get: jest.fn(() => ({})),
    },
  };
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

// --- NetInfo mock (stable, event-driven) ---
jest.mock('@react-native-community/netinfo', () => {
  const listeners = new Set();
  let state = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: { isConnectionExpensive: false },
  };
  return {
    fetch: jest.fn(async () => state),
    addEventListener: jest.fn((handler) => {
      listeners.add(handler);
      // fire immediately like real NetInfo
      handler(state);
      return () => listeners.delete(handler);
    }),
    // test-only helper your tests can call:
    __setState: (next) => {
      state = { ...state, ...next };
      listeners.forEach((cb) => cb(state));
    },
  };
});

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

// --- Expo modules used in tests ---
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'test://photo.jpg' }] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'test://photo.jpg' }] }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'test://manipulated.jpg', width: 100, height: 100 }),
}));

// --- Fix USER_PROFILE_CONSTRAINTS undefined ---
// Mock the constants directly in global scope
g.USER_PROFILE_CONSTRAINTS = {
  name: {
    minLength: 2,
    maxLength: 50,
    required: true,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: true,
  },
  phoneNumber: {
    pattern: /^\+?[\d\s\-\(\)]+$/,
    required: false,
  },
  age: {
    min: 13,
    max: 120,
    required: false,
  },
  healthInterests: {
    minItems: 1,
    maxItems: 6,
    required: true,
  },
  goals: {
    minItems: 1,
    maxItems: 5,
    required: true,
  },
  timezone: {
    required: true,
    default: 'UTC',
  },
  language: {
    required: true,
    default: 'en',
  },
};

// Global test timeout
// Ensure DOM globals are available (jsdom should provide these)
if (typeof global.window === 'undefined') {
  global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    location: { href: 'http://localhost' },
    navigator: { userAgent: 'test' },
  };
}

if (typeof global.document === 'undefined') {
  global.document = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
}

// Don't override global timers - let Jest handle them
// The testing library needs real timers to work properly

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Additional mocks for test stability
jest.mock('expo-modules-core', () => ({
  CodedError: class extends Error { constructor(name, msg){ super(msg); this.name=name; } },
  UnavailabilityError: class extends Error {},
  EventEmitter: class { addListener(){return {remove(){}}} removeAllListeners(){} },
}));

// Mock React Native Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(true),
  canOpenURL: jest.fn().mockResolvedValue(true),
  openSettings: jest.fn().mockResolvedValue(true),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock requestAnimationFrame and setImmediate for better timer control
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (cb, ...args) => setTimeout(cb, 0, ...args);
}

// Global test timeout
jest.setTimeout(10000);