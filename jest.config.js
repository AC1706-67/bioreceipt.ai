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
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
