import { ErrorClassificationService } from '../errorClassificationService';
import { MetroErrorInfo } from '../../../types/moduleResolution';

describe('ErrorClassificationService', () => {
  describe('classifyError', () => {
    it('should classify unable to resolve module error correctly', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Unable to resolve module `react-native-vector-icons`',
        moduleName: 'react-native-vector-icons',
        errorType: 'UNABLE_TO_RESOLVE',
        platform: 'android',
        bundlerVersion: '0.72.1',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.issue.type).toBe('MISSING_MODULE');
      expect(result.issue.severity).toBe('HIGH');
      expect(result.issue.module).toBe('react-native-vector-icons');
      expect(result.issue.suggestedFixes).toContain('Clear Metro cache: npx react-native start --reset-cache');
      expect(result.issue.suggestedFixes).toContain('Install React Native module: npm install react-native-vector-icons');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify Haste module map error correctly', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Module `react-native` does not exist in the Haste module map',
        moduleName: 'react-native',
        errorType: 'HASTE_MODULE_MAP_ERROR',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.issue.type).toBe('HASTE_MAP_ERROR');
      expect(result.issue.severity).toBe('HIGH');
      expect(result.issue.suggestedFixes).toContain('Clear Metro cache: npx react-native start --reset-cache');
      expect(result.issue.suggestedFixes).toContain('Clear Watchman cache: watchman watch-del-all');
    });

    it('should classify cache corruption error correctly', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Metro cache is corrupted',
        moduleName: 'unknown',
        errorType: 'CACHE_CORRUPTION',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.issue.type).toBe('CACHE_CORRUPTION');
      expect(result.issue.severity).toBe('MEDIUM');
      expect(result.issue.suggestedFixes).toContain('Clear Metro cache: npx react-native start --reset-cache');
      expect(result.issue.suggestedFixes).toContain('Clear npm cache: npm cache clean --force');
    });

    it('should classify configuration error correctly', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Invalid Metro configuration',
        moduleName: 'unknown',
        errorType: 'INVALID_CONFIGURATION',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.issue.type).toBe('CONFIG_ERROR');
      expect(result.issue.severity).toBe('HIGH');
      expect(result.issue.suggestedFixes).toContain('Validate metro.config.js syntax');
      expect(result.issue.suggestedFixes).toContain('Check resolver configuration in metro.config.js');
    });

    it('should classify platform-specific error correctly', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Platform-specific module not found for platform android',
        moduleName: 'test-module',
        errorType: 'PLATFORM_SPECIFIC_ERROR',
        platform: 'android',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.issue.type).toBe('PATH_RESOLUTION_ERROR');
      expect(result.issue.severity).toBe('MEDIUM');
      expect(result.issue.suggestedFixes).toContain('Check platform-specific file extensions (.android.js, .ios.js)');
      expect(result.issue.suggestedFixes).toContain('Clean Android build: cd android && ./gradlew clean');
    });

    it('should classify dependency conflict error correctly', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'package.json not found in node_modules',
        moduleName: 'test-package',
        errorType: 'PACKAGE_JSON_ERROR',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.issue.type).toBe('DEPENDENCY_CONFLICT');
      expect(result.issue.severity).toBe('HIGH');
      expect(result.issue.suggestedFixes).toContain('Reinstall dependencies: rm -rf node_modules && npm install');
      expect(result.issue.suggestedFixes).toContain('Check package.json for missing dependencies');
    });
  });

  describe('analyzeResolutionError', () => {
    it('should analyze error message and return resolution issue', () => {
      const errorMessage = 'Unable to resolve module `@react-native-community/async-storage` from `/path/to/file.js`';

      const result = ErrorClassificationService.analyzeResolutionError(errorMessage);

      expect(result.type).toBe('MISSING_MODULE');
      expect(result.module).toBe('@react-native-community/async-storage');
      expect(result.severity).toBe('HIGH');
      expect(result.suggestedFixes.length).toBeGreaterThan(0);
    });

    it('should handle relative import errors', () => {
      const errorMessage = 'Unable to resolve module `./components/Button` from `/path/to/file.js`';

      const result = ErrorClassificationService.analyzeResolutionError(errorMessage);

      expect(result.module).toBe('./components/Button');
      expect(result.suggestedFixes).toContain('Verify the relative path exists: ./components/Button');
      expect(result.suggestedFixes).toContain('Check file extension (.js, .ts, .tsx)');
    });

    it('should handle scoped package errors', () => {
      const errorMessage = 'Unable to resolve module `@scope/package-name` from `/path/to/file.js`';

      const result = ErrorClassificationService.analyzeResolutionError(errorMessage);

      expect(result.module).toBe('@scope/package-name');
      expect(result.suggestedFixes).toContain('Install package: npm install @scope/package-name');
    });
  });

  describe('confidence calculation', () => {
    it('should calculate higher confidence for well-known error patterns', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Unable to resolve module `react-native-vector-icons` from `/path/file.js`',
        moduleName: 'react-native-vector-icons',
        errorType: 'UNABLE_TO_RESOLVE',
        platform: 'android',
        bundlerVersion: '0.72.1',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate lower confidence for unknown errors', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Some unknown error occurred',
        moduleName: 'unknown',
        errorType: 'UNKNOWN_ERROR',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should increase confidence when module name is identified', () => {
      const errorInfoWithModule: MetroErrorInfo = {
        originalError: 'Unable to resolve module `test-module`',
        moduleName: 'test-module',
        errorType: 'UNABLE_TO_RESOLVE',
      };

      const errorInfoWithoutModule: MetroErrorInfo = {
        originalError: 'Unable to resolve module',
        moduleName: 'unknown',
        errorType: 'UNABLE_TO_RESOLVE',
      };

      const resultWithModule = ErrorClassificationService.classifyError(errorInfoWithModule);
      const resultWithoutModule = ErrorClassificationService.classifyError(errorInfoWithoutModule);

      expect(resultWithModule.confidence).toBeGreaterThan(resultWithoutModule.confidence);
    });
  });

  describe('additional context gathering', () => {
    it('should identify React Native core modules', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Unable to resolve module `react-native`',
        moduleName: 'react-native',
        errorType: 'UNABLE_TO_RESOLVE',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.additionalContext?.isReactNativeCore).toBe(true);
    });

    it('should identify third-party packages', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Unable to resolve module `lodash`',
        moduleName: 'lodash',
        errorType: 'UNABLE_TO_RESOLVE',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.additionalContext?.isThirdPartyPackage).toBe(true);
    });

    it('should identify relative imports', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Unable to resolve module `./components/Button`',
        moduleName: './components/Button',
        errorType: 'UNABLE_TO_RESOLVE',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.additionalContext?.isRelativeImport).toBe(true);
    });

    it('should extract related modules from error message', () => {
      const errorInfo: MetroErrorInfo = {
        originalError: 'Unable to resolve module `main-module` from `./src/file.js`. Also tried `backup-module`.',
        moduleName: 'main-module',
        errorType: 'UNABLE_TO_RESOLVE',
      };

      const result = ErrorClassificationService.classifyError(errorInfo);

      expect(result.additionalContext?.relatedModules).toContain('main-module');
      expect(result.additionalContext?.relatedModules).toContain('./src/file.js');
      expect(result.additionalContext?.relatedModules).toContain('backup-module');
    });
  });
});