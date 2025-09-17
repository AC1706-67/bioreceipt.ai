// jest.setup.js
import '@testing-library/jest-native/extend-expect';

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