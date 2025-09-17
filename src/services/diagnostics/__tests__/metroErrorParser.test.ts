import { MetroErrorParser } from '../metroErrorParser';

describe('MetroErrorParser', () => {
  describe('parseMetroError', () => {
    it('should parse unable to resolve module error', () => {
      const errorMessage = `
        Unable to resolve module \`react-native-vector-icons\` from \`/path/to/file.js\`:
        react-native-vector-icons could not be found within the project or in these directories:
          node_modules
      `;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.moduleName).toBe('react-native-vector-icons');
      expect(result.errorType).toBe('UNABLE_TO_RESOLVE');
      expect(result.originalError).toBe(errorMessage);
    });

    it('should parse module not found error', () => {
      const errorMessage = `Cannot resolve module \`./components/MyComponent\` from \`/path/to/App.js\``;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.moduleName).toBe('./components/MyComponent');
      expect(result.errorType).toBe('MODULE_NOT_FOUND');
    });

    it('should parse Haste module map error', () => {
      const errorMessage = `
        Module \`react-native\` does not exist in the Haste module map
        Haste module map: This might be related to https://github.com/facebook/react-native/issues/4968
      `;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.moduleName).toBe('react-native');
      expect(result.errorType).toBe('HASTE_MODULE_MAP_ERROR');
    });

    it('should parse platform-specific error', () => {
      const errorMessage = `Platform-specific module \`react-native-device-info\` not found for platform \`android\``;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.moduleName).toBe('react-native-device-info');
      expect(result.errorType).toBe('PLATFORM_SPECIFIC_ERROR');
      expect(result.platform).toBe('android');
    });

    it('should extract bundler version when present', () => {
      const errorMessage = `
        Metro v0.72.1
        Unable to resolve module \`test-module\` from \`/path/to/file.js\`
      `;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.bundlerVersion).toBe('0.72.1');
      expect(result.moduleName).toBe('test-module');
    });

    it('should extract platform from command line args', () => {
      const errorMessage = `
        Unable to resolve module \`test-module\` from \`/path/to/file.js\`
        --platform android
      `;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.platform).toBe('android');
    });

    it('should extract stack trace when present', () => {
      const errorMessage = `
        Unable to resolve module \`test-module\` from \`/path/to/file.js\`
            at ModuleResolver.resolveDependency (/path/to/metro/src/node-haste/DependencyGraph/ModuleResolution.js:123:45)
            at ResolutionRequest.resolveDependency (/path/to/metro/src/node-haste/DependencyGraph/ResolutionRequest.js:67:89)
      `;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.stackTrace).toContain('at ModuleResolver.resolveDependency');
      expect(result.stackTrace).toContain('at ResolutionRequest.resolveDependency');
    });

    it('should handle unknown error types', () => {
      const errorMessage = `Some unknown Metro error occurred`;

      const result = MetroErrorParser.parseMetroError(errorMessage);

      expect(result.errorType).toBe('UNKNOWN_ERROR');
      expect(result.moduleName).toBe('unknown');
    });
  });

  describe('extractModuleName', () => {
    it('should extract module name from various quote styles', () => {
      expect(MetroErrorParser.parseMetroError('Unable to resolve module `test-module`').moduleName).toBe('test-module');
      expect(MetroErrorParser.parseMetroError('Unable to resolve module "test-module"').moduleName).toBe('test-module');
      expect(MetroErrorParser.parseMetroError("Unable to resolve module 'test-module'").moduleName).toBe('test-module');
    });

    it('should extract scoped package names', () => {
      const errorMessage = 'Unable to resolve module `@react-native-community/async-storage`';
      const result = MetroErrorParser.parseMetroError(errorMessage);
      expect(result.moduleName).toBe('@react-native-community/async-storage');
    });

    it('should extract relative path imports', () => {
      const errorMessage = 'Unable to resolve module `./components/Button`';
      const result = MetroErrorParser.parseMetroError(errorMessage);
      expect(result.moduleName).toBe('./components/Button');
    });
  });

  describe('hasPattern', () => {
    it('should correctly identify error patterns', () => {
      expect(MetroErrorParser.hasPattern('Unable to resolve module `test`', 'UNABLE_TO_RESOLVE')).toBe(true);
      expect(MetroErrorParser.hasPattern('Cannot resolve module `test`', 'MODULE_NOT_FOUND')).toBe(true);
      expect(MetroErrorParser.hasPattern('Haste module map: error', 'HASTE_MODULE_MAP')).toBe(true);
      expect(MetroErrorParser.hasPattern('Invalid Metro configuration', 'INVALID_CONFIGURATION')).toBe(true);
      expect(MetroErrorParser.hasPattern('Metro cache is corrupted', 'CACHE_CORRUPTION')).toBe(true);
    });

    it('should return false for non-matching patterns', () => {
      expect(MetroErrorParser.hasPattern('Some other error', 'UNABLE_TO_RESOLVE')).toBe(false);
      expect(MetroErrorParser.hasPattern('Different error message', 'HASTE_MODULE_MAP')).toBe(false);
    });
  });

  describe('extractAllModuleReferences', () => {
    it('should extract all module references from error message', () => {
      const errorMessage = `
        Unable to resolve module \`react-native-vector-icons\` from \`./src/components/Icon.js\`:
        react-native-vector-icons could not be found within the project.
        Also tried to import \`@react-native-community/async-storage\`.
      `;

      const modules = MetroErrorParser.extractAllModuleReferences(errorMessage);

      expect(modules).toContain('react-native-vector-icons');
      expect(modules).toContain('./src/components/Icon.js');
      expect(modules).toContain('@react-native-community/async-storage');
    });

    it('should filter out non-module strings', () => {
      const errorMessage = `
        Error occurred at "2023-01-01" with code "404" 
        Unable to resolve module \`real-module\` from path
      `;

      const modules = MetroErrorParser.extractAllModuleReferences(errorMessage);

      expect(modules).toContain('real-module');
      expect(modules).not.toContain('2023-01-01');
      expect(modules).not.toContain('404');
    });

    it('should remove duplicate module references', () => {
      const errorMessage = `
        Unable to resolve module \`test-module\` from \`./src/file.js\`
        test-module could not be found
        Tried to resolve \`test-module\` again
      `;

      const modules = MetroErrorParser.extractAllModuleReferences(errorMessage);

      expect(modules.filter(m => m === 'test-module')).toHaveLength(1);
    });
  });

  describe('isLikelyModuleName', () => {
    it('should identify valid module names', () => {
      expect(MetroErrorParser.isLikelyModuleName('react-native')).toBe(true);
      expect(MetroErrorParser.isLikelyModuleName('@scope/package')).toBe(true);
      expect(MetroErrorParser.isLikelyModuleName('./relative/path')).toBe(true);
      expect(MetroErrorParser.isLikelyModuleName('package-name')).toBe(true);
      expect(MetroErrorParser.isLikelyModuleName('react-native-vector-icons')).toBe(true);
    });

    it('should reject invalid module names', () => {
      expect(MetroErrorParser.isLikelyModuleName('')).toBe(false);
      expect(MetroErrorParser.isLikelyModuleName('a')).toBe(false);
      expect(MetroErrorParser.isLikelyModuleName('has spaces')).toBe(false);
      expect(MetroErrorParser.isLikelyModuleName('http://example.com')).toBe(false);
      expect(MetroErrorParser.isLikelyModuleName('123')).toBe(false);
    });
  });
});