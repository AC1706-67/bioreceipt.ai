/**
 * Metro error message parser for React Native module resolution issues
 */

import { ResolutionIssue } from './types';

export class MetroErrorParser {
  /**
   * Parse Metro error messages to extract module resolution issues
   */
  static parseError(errorMessage: string): ResolutionIssue | null {
    if (!errorMessage) return null;

    // Pattern for "Unable to resolve module" errors
    const moduleResolutionPattern = /Unable to resolve module `([^`]+)`/i;
    const moduleMatch = errorMessage.match(moduleResolutionPattern);

    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      return {
        type: 'MISSING_MODULE',
        module: moduleName,
        severity: this.determineSeverity(moduleName, errorMessage),
        suggestedFixes: this.generateFixSuggestions(moduleName, errorMessage),
        errorMessage,
      };
    }

    // Pattern for Haste module map errors
    const hasteMapPattern = /does not exist in the Haste module map/i;
    if (hasteMapPattern.test(errorMessage)) {
      const moduleMatch = errorMessage.match(/`([^`]+)`/);
      const moduleName = moduleMatch ? moduleMatch[1] : 'unknown';
      
      return {
        type: 'CACHE_CORRUPTION',
        module: moduleName,
        severity: 'HIGH',
        suggestedFixes: [
          'Clear Metro cache: npx react-native start --reset-cache',
          'Delete node_modules and reinstall dependencies',
          'Clear Watchman cache: watchman watch-del-all',
        ],
        errorMessage,
      };
    }

    // Pattern for configuration errors
    const configErrorPattern = /Metro.*config/i;
    if (configErrorPattern.test(errorMessage)) {
      return {
        type: 'CONFIG_ERROR',
        module: 'metro.config.js',
        severity: 'MEDIUM',
        suggestedFixes: [
          'Check metro.config.js syntax',
          'Validate resolver configuration',
          'Reset to default Metro configuration',
        ],
        errorMessage,
      };
    }

    return null;
  }

  /**
   * Determine severity based on module name and error context
   */
  private static determineSeverity(moduleName: string, errorMessage: string): ResolutionIssue['severity'] {
    // Core React Native modules are critical
    if (moduleName.startsWith('react-native') || moduleName.startsWith('@react-native')) {
      return 'CRITICAL';
    }

    // Navigation and core app modules are high priority
    if (moduleName.includes('navigation') || moduleName.includes('redux') || moduleName.includes('expo')) {
      return 'HIGH';
    }

    // Development and testing modules are lower priority
    if (moduleName.includes('test') || moduleName.includes('dev') || moduleName.includes('debug')) {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  /**
   * Generate fix suggestions based on module name and error type
   */
  private static generateFixSuggestions(moduleName: string, errorMessage: string): string[] {
    const suggestions: string[] = [];

    // Common fixes for all module resolution issues
    suggestions.push('Clear Metro cache: npx react-native start --reset-cache');

    // Specific fixes based on module type
    if (moduleName.startsWith('react-native-')) {
      suggestions.push(`Install missing package: npm install ${moduleName}`);
      suggestions.push('Link native dependencies (if using RN < 0.60)');
      suggestions.push('Check if package supports your React Native version');
    }

    if (moduleName.startsWith('@react-native/')) {
      suggestions.push('Update React Native CLI: npm install -g @react-native-community/cli');
      suggestions.push('Reinstall React Native dependencies');
    }

    if (moduleName.includes('gesture-handler')) {
      suggestions.push('Install react-native-gesture-handler: npm install react-native-gesture-handler');
      suggestions.push('Follow platform-specific setup instructions');
      suggestions.push('Add gesture handler import to index.js');
    }

    // Path-related issues
    if (errorMessage.includes('node_modules')) {
      suggestions.push('Delete node_modules and package-lock.json, then npm install');
      suggestions.push('Check for duplicate dependencies in package.json');
    }

    return suggestions;
  }

  /**
   * Extract all module names from error message
   */
  static extractModuleNames(errorMessage: string): string[] {
    const modulePattern = /`([^`]+)`/g;
    const matches = [];
    let match;

    while ((match = modulePattern.exec(errorMessage)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Check if error is related to Metro bundler
   */
  static isMetroError(errorMessage: string): boolean {
    const metroKeywords = [
      'Unable to resolve module',
      'Haste module map',
      'Metro',
      'bundler',
      'react-native start',
    ];

    return metroKeywords.some(keyword => 
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}