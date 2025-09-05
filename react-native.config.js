module.exports = {
  dependencies: {
    '@react-native-picker/picker': {
      platforms: {
        android: null, // disable Android platform auto linking
        ios: null, // disable iOS platform auto linking
      },
    },
    'react-native-fs': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-fs/android',
          packageImportPath: 'import com.rnfs.RNFSPackage;',
        },
        ios: {
          podspecPath: '../node_modules/react-native-fs/RNFS.podspec',
        },
      },
    },
  },
};