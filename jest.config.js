module.exports = { 
  preset: 'react-native', 
  testEnvironment: 'jsdom', 
  transform: { 
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest' 
  }, 
  transformIgnorePatterns: [ 
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|react-clone-referenced-element|@testing-library/jest-native|@testing-library/react-native|react-native-gesture-handler)/)' 
  ], 
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'], 
  moduleNameMapper: { 
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js' 
  } 
};
