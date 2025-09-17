import { ResolutionIssue, MetroErrorInfo, ErrorClassificationResult } from '../../types/moduleResolution';
import { MetroErrorParser } from './metroErrorParser';

/**
 * Error Classification Service
 * Classifies Metro resolution errors and provides suggested fixes
 */
export class ErrorClassificationService {
  /**
   * Classify a Metro error and provide resolution suggestions
   */
  public static classifyError(errorInfo: MetroErrorInfo): ErrorClassificationResult {
    const issue = this.createResolutionIssue(errorInfo);
    const confidence = this.calculateConfidence(errorInfo);
    const additionalContext = this.gatherAdditionalContext(errorInfo);

    return {
      issue,
      confidence,
      additionalContext,
    };
  }

  /**
   * Create a ResolutionIssue from MetroErrorInfo
   */
  private static createResolutionIssue(errorInfo: MetroErrorInfo): ResolutionIssue {
    const { errorType, moduleName, originalError, platform, bundlerVersion } = errorInfo;

    let issueType: ResolutionIssue['type'];
    let severity: ResolutionIssue['severity'];
    let suggestedFixes: string[];

    switch (errorType) {
      case 'UNABLE_TO_RESOLVE':
      case 'MODULE_NOT_FOUND':
        issueType = 'MISSING_MODULE';
        severity = 'HIGH';
        suggestedFixes = this.getMissingModuleFixes(moduleName);
        break;

      case 'HASTE_MODULE_MAP_ERROR':
      case 'DEPENDENCY_NOT_FOUND':
        issueType = 'HASTE_MAP_ERROR';
        severity = 'HIGH';
        suggestedFixes = this.getHasteMapFixes();
        break;

      case 'CACHE_CORRUPTION':
        issueType = 'CACHE_CORRUPTION';
        severity = 'MEDIUM';
        suggestedFixes = this.getCacheCorruptionFixes();
        break;

      case 'INVALID_CONFIGURATION':
        issueType = 'CONFIG_ERROR';
        severity = 'HIGH';
        suggestedFixes = this.getConfigurationFixes();
        break;

      case 'PLATFORM_SPECIFIC_ERROR':
        issueType = 'PATH_RESOLUTION_ERROR';
        severity = 'MEDIUM';
        suggestedFixes = this.getPlatformSpecificFixes(platform);
        break;

      case 'PACKAGE_JSON_ERROR':
      case 'NODE_MODULES_ERROR':
        issueType = 'DEPENDENCY_CONFLICT';
        severity = 'HIGH';
        suggestedFixes = this.getDependencyFixes();
        break;

      default:
        issueType = 'MISSING_MODULE';
        severity = 'MEDIUM';
        suggestedFixes = this.getGenericFixes();
    }

    return {
      type: issueType,
      module: moduleName,
      severity,
      suggestedFixes,
      errorMessage: originalError,
      stackTrace: errorInfo.stackTrace,
      context: {
        platform: platform as 'android' | 'ios',
        bundlerVersion,
        nodeVersion: process.version,
      },
    };
  }

  /**
   * Get suggested fixes for missing module errors
   */
  private static getMissingModuleFixes(moduleName: string): string[] {
    const fixes = [
      'Clear Metro cache: npx react-native start --reset-cache',
      'Reinstall node modules: rm -rf node_modules && npm install',
      'Check if the module is installed: npm list ' + moduleName,
    ];

    // Add module-specific fixes
    if (moduleName.startsWith('react-native')) {
      fixes.push('Install React Native module: npm install ' + moduleName);
    } else if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
      fixes.push('Verify the relative path exists: ' + moduleName);
      fixes.push('Check file extension (.js, .ts, .tsx)');
    } else if (moduleName.startsWith('@') && moduleName.includes('/')) {
      // Scoped package - install the full scoped package name
      fixes.push('Install package: npm install ' + moduleName);
    } else if (moduleName.includes('/')) {
      fixes.push('Install package: npm install ' + moduleName.split('/')[0]);
    } else {
      fixes.push('Install missing package: npm install ' + moduleName);
    }

    return fixes;
  }

  /**
   * Get suggested fixes for Haste module map errors
   */
  private static getHasteMapFixes(): string[] {
    return [
      'Clear Metro cache: npx react-native start --reset-cache',
      'Reset Metro bundler: npx react-native start --reset-cache --verbose',
      'Clear Watchman cache: watchman watch-del-all',
      'Restart Metro bundler completely',
      'Check Metro configuration for resolver settings',
    ];
  }

  /**
   * Get suggested fixes for cache corruption
   */
  private static getCacheCorruptionFixes(): string[] {
    return [
      'Clear Metro cache: npx react-native start --reset-cache',
      'Clear npm cache: npm cache clean --force',
      'Clear Watchman cache: watchman watch-del-all',
      'Remove temporary files: rm -rf /tmp/metro-*',
      'Restart development server',
    ];
  }

  /**
   * Get suggested fixes for configuration errors
   */
  private static getConfigurationFixes(): string[] {
    return [
      'Validate metro.config.js syntax',
      'Check resolver configuration in metro.config.js',
      'Verify platforms array includes target platform',
      'Check sourceExts and assetExts configuration',
      'Reset to default Metro configuration',
    ];
  }

  /**
   * Get suggested fixes for platform-specific errors
   */
  private static getPlatformSpecificFixes(platform?: string): string[] {
    const fixes = [
      'Check platform-specific file extensions (.android.js, .ios.js)',
      'Verify platform is specified correctly: --platform ' + (platform || 'android'),
      'Check Metro resolver configuration for platform extensions',
    ];

    if (platform === 'android') {
      fixes.push('Clean Android build: cd android && ./gradlew clean');
    } else if (platform === 'ios') {
      fixes.push('Clean iOS build: cd ios && xcodebuild clean');
    }

    return fixes;
  }

  /**
   * Get suggested fixes for dependency errors
   */
  private static getDependencyFixes(): string[] {
    return [
      'Reinstall dependencies: rm -rf node_modules && npm install',
      'Check package.json for missing dependencies',
      'Verify package-lock.json is not corrupted',
      'Run npm audit to check for issues',
      'Clear npm cache: npm cache clean --force',
    ];
  }

  /**
   * Get generic fixes for unknown errors
   */
  private static getGenericFixes(): string[] {
    return [
      'Clear Metro cache: npx react-native start --reset-cache',
      'Reinstall node modules: rm -rf node_modules && npm install',
      'Restart Metro bundler',
      'Check Metro configuration',
      'Verify file paths and imports',
    ];
  }

  /**
   * Calculate confidence level for error classification
   */
  private static calculateConfidence(errorInfo: MetroErrorInfo): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on specific patterns
    if (MetroErrorParser.hasPattern(errorInfo.originalError, 'UNABLE_TO_RESOLVE')) {
      confidence += 0.3;
    }
    if (MetroErrorParser.hasPattern(errorInfo.originalError, 'MODULE_NOT_FOUND')) {
      confidence += 0.3;
    }
    if (MetroErrorParser.hasPattern(errorInfo.originalError, 'HASTE_MODULE_MAP')) {
      confidence += 0.4;
    }

    // Increase confidence if module name is clearly identified
    if (errorInfo.moduleName && errorInfo.moduleName !== 'unknown') {
      confidence += 0.2;
    }

    // Increase confidence if platform is identified
    if (errorInfo.platform) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Gather additional context for error classification
   */
  private static gatherAdditionalContext(errorInfo: MetroErrorInfo): Record<string, any> {
    const context: Record<string, any> = {};

    // Extract all module references
    const allModules = MetroErrorParser.extractAllModuleReferences(errorInfo.originalError);
    if (allModules.length > 0) {
      context.relatedModules = allModules;
    }

    // Detect if it's a React Native core module
    if (errorInfo.moduleName.startsWith('react-native')) {
      context.isReactNativeCore = true;
    }

    // Detect if it's a third-party package
    if (!errorInfo.moduleName.startsWith('.') && !errorInfo.moduleName.startsWith('/')) {
      context.isThirdPartyPackage = true;
    }

    // Detect if it's a relative import
    if (errorInfo.moduleName.startsWith('./') || errorInfo.moduleName.startsWith('../')) {
      context.isRelativeImport = true;
    }

    return context;
  }

  /**
   * Analyze error message and return classification result
   */
  public static analyzeResolutionError(errorMessage: string): ResolutionIssue {
    const errorInfo = MetroErrorParser.parseMetroError(errorMessage);
    const classification = this.classifyError(errorInfo);
    return classification.issue;
  }
}