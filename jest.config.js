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
      + ')/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
