const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration with TS/TSX and CJS support
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs', 'ts', 'tsx'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
