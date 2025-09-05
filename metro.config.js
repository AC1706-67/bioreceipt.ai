const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced configuration for better debugging
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true, // Keep function names for better stack traces
  },
};

// Enable source maps for debugging
config.serializer = {
  ...config.serializer,
  createModuleIdFactory: () => (path) => {
    // Use relative paths for better debugging
    return path.replace(__dirname, '.');
  },
};

module.exports = config;