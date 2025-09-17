import { ModuleResolutionDiagnosticService } from '../moduleResolutionDiagnosticService';

describe('ModuleResolutionDiagnosticService', () => {
  let service: ModuleResolutionDiagnosticService;

  beforeEach(() => {
    service = new ModuleResolutionDiagnosticService();
  });

  describe('analyzeResolutionError', () => {
    it('should analyze a simple resolution error', () => {
      const errorMessage = 'Unable to resolve module `react-native-vector-icons` from `/path/to/file.js`';

      const result = service.analyzeResolutionError(errorMessage);

      expect(result.type).toBe('MISSING_MODULE');
      expect(result.module).toBe('react-native-vector-icons');
      expect(result.severity).toBe('HIGH');
      expect(result.suggestedFixes.length).toBeGreaterThan(0);
      expect(result.errorMessage).toBe(errorMessage);
    });

    it('should include context information', () => {
      const errorMessage = 'Unable to resolve module `test-module` from `/path/to/file.js`';

      const result = service.analyzeResolutionError(errorMessage);

      expect(result.context).toBeDefined();
      expect(result.context?.nodeVersion).toBe(process.version);
    });
  });

  describe('parseMetroError', () => {
    it('should parse Metro error message', () => {
      const errorMessage = 'Unable to resolve module `test-module` from `/path/to/file.js`';

      const result = service.parseMetroError(errorMessage);

      expect(result.originalError).toBe(errorMessage);
      expect(result.moduleName).toBe('test-module');
      expect(result.errorType).toBe('UNABLE_TO_RESOLVE');
    });
  });

  describe('classifyError', () => {
    it('should classify error with confidence score', () => {
      const errorInfo = {
        originalError: 'Unable to resolve module `react-native-vector-icons`',
        moduleName: 'react-native-vector-icons',
        errorType: 'UNABLE_TO_RESOLVE',
        platform: 'android',
        bundlerVersion: '0.72.1',
      };

      const result = service.classifyError(errorInfo);

      expect(result.issue).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.additionalContext).toBeDefined();
    });
  });

  describe('analyzeMultipleErrors', () => {
    it('should analyze multiple errors and prioritize by severity', () => {
      const errors = [
        'Unable to resolve module `low-priority-module`',
        'Invalid Metro configuration detected',
        'Metro cache is corrupted',
        'Unable to resolve module `react-native`',
      ];

      const results = service.analyzeMultipleErrors(errors);

      expect(results).toHaveLength(4);
      
      // Should prioritize HIGH severity issues first
      const highSeverityCount = results.filter(r => r.severity === 'HIGH').length;
      const mediumSeverityCount = results.filter(r => r.severity === 'MEDIUM').length;
      
      expect(highSeverityCount).toBeGreaterThan(0);
      expect(mediumSeverityCount).toBeGreaterThan(0);
      
      // First few results should be high severity
      expect(results[0].severity).toBe('HIGH');
    });

    it('should prioritize React Native core modules', () => {
      const errors = [
        'Unable to resolve module `third-party-package`',
        'Unable to resolve module `react-native`',
      ];

      const results = service.analyzeMultipleErrors(errors);

      expect(results[0].module).toBe('react-native');
      expect(results[1].module).toBe('third-party-package');
    });

    it('should handle empty error array', () => {
      const results = service.analyzeMultipleErrors([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getQuickDiagnostic', () => {
    it('should provide quick diagnostic summary', () => {
      const errorMessage = 'Unable to resolve module `react-native-vector-icons` from `/path/to/file.js`';

      const result = service.getQuickDiagnostic(errorMessage);

      expect(result.module).toBe('react-native-vector-icons');
      expect(result.type).toBe('MISSING_MODULE');
      expect(result.severity).toBe('HIGH');
      expect(result.primaryFix).toContain('Clear Metro cache');
    });

    it('should handle errors without specific fixes', () => {
      const errorMessage = 'Some unknown error occurred';

      const result = service.getQuickDiagnostic(errorMessage);

      expect(result.module).toBe('unknown');
      expect(result.primaryFix).toBeDefined();
    });
  });

  describe('isCommonMetroIssue', () => {
    it('should identify common Metro issues', () => {
      const commonErrors = [
        'Unable to resolve module `test-module`',
        'Cannot resolve module `test-module`',
        'Haste module map error occurred',
        'Metro cache is corrupted',
        'node_modules/test-package not found',
      ];

      commonErrors.forEach(error => {
        expect(service.isCommonMetroIssue(error)).toBe(true);
      });
    });

    it('should not identify non-Metro issues as common', () => {
      const nonMetroErrors = [
        'Syntax error in JavaScript code',
        'Network connection failed',
        'Database connection error',
        'Authentication failed',
      ];

      nonMetroErrors.forEach(error => {
        expect(service.isCommonMetroIssue(error)).toBe(false);
      });
    });
  });

  describe('extractActionableInfo', () => {
    it('should identify auto-fixable cache corruption', () => {
      const errorMessage = 'Metro cache is corrupted';

      const result = service.extractActionableInfo(errorMessage);

      expect(result.canAutoFix).toBe(true);
      expect(result.requiresManualIntervention).toBe(false);
      expect(result.estimatedFixTime).toBe('quick');
      expect(result.riskLevel).toBe('low');
    });

    it('should identify auto-fixable missing packages', () => {
      const errorMessage = 'Unable to resolve module `lodash`';

      const result = service.extractActionableInfo(errorMessage);

      expect(result.canAutoFix).toBe(true);
      expect(result.requiresManualIntervention).toBe(false);
      expect(result.estimatedFixTime).toBe('medium');
      expect(result.riskLevel).toBe('low');
    });

    it('should identify manual intervention needed for relative imports', () => {
      const errorMessage = 'Unable to resolve module `./components/Button`';

      const result = service.extractActionableInfo(errorMessage);

      expect(result.canAutoFix).toBe(false);
      expect(result.requiresManualIntervention).toBe(true);
      expect(result.estimatedFixTime).toBe('medium');
      expect(result.riskLevel).toBe('medium');
    });

    it('should identify high-risk configuration errors', () => {
      const errorMessage = 'Invalid Metro configuration detected';

      const result = service.extractActionableInfo(errorMessage);

      expect(result.canAutoFix).toBe(false);
      expect(result.requiresManualIntervention).toBe(true);
      expect(result.estimatedFixTime).toBe('long');
      expect(result.riskLevel).toBe('high');
    });

    it('should identify auto-fixable Haste map errors', () => {
      const errorMessage = 'Module `test-module` does not exist in the Haste module map';

      const result = service.extractActionableInfo(errorMessage);

      expect(result.canAutoFix).toBe(true);
      expect(result.requiresManualIntervention).toBe(false);
      expect(result.estimatedFixTime).toBe('quick');
      expect(result.riskLevel).toBe('low');
    });

    it('should identify high-risk dependency conflicts', () => {
      const errorMessage = 'package.json not found in node_modules';

      const result = service.extractActionableInfo(errorMessage);

      expect(result.canAutoFix).toBe(false);
      expect(result.requiresManualIntervention).toBe(true);
      expect(result.estimatedFixTime).toBe('long');
      expect(result.riskLevel).toBe('high');
    });
  });

  describe('integration tests', () => {
    it('should handle complex error messages with multiple issues', () => {
      const complexError = `
        Metro v0.72.1
        Unable to resolve module \`react-native-vector-icons\` from \`/path/to/App.js\`:
        react-native-vector-icons could not be found within the project or in these directories:
          node_modules
          ../../node_modules
        
        Platform: android
        
            at ModuleResolver.resolveDependency (/path/to/metro/src/node-haste/DependencyGraph/ModuleResolution.js:123:45)
            at ResolutionRequest.resolveDependency (/path/to/metro/src/node-haste/DependencyGraph/ResolutionRequest.js:67:89)
      `;

      const issue = service.analyzeResolutionError(complexError);
      const errorInfo = service.parseMetroError(complexError);
      const actionableInfo = service.extractActionableInfo(complexError);

      expect(issue.module).toBe('react-native-vector-icons');
      expect(issue.type).toBe('MISSING_MODULE');
      expect(issue.context?.platform).toBe('android');
      expect(issue.context?.bundlerVersion).toBe('0.72.1');
      expect(issue.stackTrace).toContain('at ModuleResolver.resolveDependency');

      expect(errorInfo.bundlerVersion).toBe('0.72.1');
      expect(errorInfo.platform).toBe('android');
      expect(errorInfo.stackTrace).toBeDefined();

      expect(actionableInfo.canAutoFix).toBe(true);
      expect(actionableInfo.estimatedFixTime).toBe('medium');
    });

    it('should provide consistent results across different methods', () => {
      const errorMessage = 'Unable to resolve module `test-module` from `/path/to/file.js`';

      const directAnalysis = service.analyzeResolutionError(errorMessage);
      const parsedError = service.parseMetroError(errorMessage);
      const classifiedError = service.classifyError(parsedError);

      expect(directAnalysis.module).toBe(classifiedError.issue.module);
      expect(directAnalysis.type).toBe(classifiedError.issue.type);
      expect(directAnalysis.severity).toBe(classifiedError.issue.severity);
    });
  });
});