// jest.config.js
module.exports = {
  preset: 'react-native',
  testEnvironment: 'jsdom',
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native'
      + '|@react-native'
      + '|react-native-.*'
      + '|@react-native-.*'
      + '|@react-navigation'
      + '|expo|expo-.*|@expo'         // Expo libs
      + '|@supabase/.*'               // ESM packages that need transform
      + ')/)',
  ],
  moduleNameMapper: {
    // Assets
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Env module used like: import { SUPABASE_URL } from '@env'
    '^@env$': '<rootDir>/__mocks__/envMock.js',
    // Native modules
    '^react-native-encrypted-storage$': '<rootDir>/__mocks__/react-native-encrypted-storage.ts',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.ts',
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/react-native-gesture-handler.js',
    // Expo modules
    '^expo-image-picker$': '<rootDir>/__mocks__/expo-image-picker.js',
    '^expo-image-manipulator$': '<rootDir>/__mocks__/expo-image-manipulator.js',
    '^expo-modules-core$': '<rootDir>/__mocks__/expo-modules-core.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
