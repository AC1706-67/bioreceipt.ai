// jest.setup.js
import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Add TextEncoder/TextDecoder polyfills for Node.js environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// AsyncStorage (official mock)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// NetInfo mock
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ type: 'wifi', isConnected: true })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Silence NativeEventEmitter warning in tests
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock TurboModuleRegistry to prevent DevMenu errors
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn(() => ({
    getConstants: jest.fn(() => ({})),
  })),
  get: jest.fn(() => ({
    getConstants: jest.fn(() => ({})),
  })),
}));

// Mock NativeDeviceInfo
jest.mock('react-native/src/private/specs_DEPRECATED/modules/NativeDeviceInfo', () => ({
  getConstants: jest.fn(() => ({
    Dimensions: {
      window: { width: 375, height: 667, scale: 2, fontScale: 1 },
      screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
    },
  })),
}));

// Mock Dimensions
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 667, scale: 2, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getConstants: jest.fn(() => ({
    window: { width: 375, height: 667, scale: 2, fontScale: 1 },
    screen: { width: 375, height: 667, scale: 2, fontScale: 1 },
  })),
}));

// Platform mocks
import { Platform } from 'react-native';
Object.defineProperty(Platform, 'OS', { value: 'android' });
Object.defineProperty(Platform, 'Version', { value: 33 }); // Android 13