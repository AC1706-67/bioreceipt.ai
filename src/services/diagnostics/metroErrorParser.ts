import { MetroErrorInfo } from '../../types/moduleResolution';

/**
 * Metro Error Message Parser
 * Extracts module names and error types from Metro bundler error messages
 */
export class MetroErrorParser {
  private static readonly ERROR_PATTERNS = {
    UNABLE_TO_RESOLVE: /Unable to resolve module `([^`]+)`/,
    MODULE_NOT_FOUND: /Cannot resolve module `([^`]+)`/,
    HASTE_MODULE_MAP: /Haste module map: (.+)/,
    DEPENDENCY_NOT_FOUND: /Module `([^`]+)` does not exist in the Haste module map/,
    INVALID_CONFIGURATION: /Invalid Metro configuration/,
    CACHE_CORRUPTION: /Metro cache is corrupted/,
    PLATFORM_SPECIFIC: /Platform-specific module `([^`]+)` not found for platform `([^`]+)`/,
    PACKAGE_JSON_ERROR: /package\.json.*not found/,
    NODE_MODULES_ERROR: /node_modules.*not found/,
  };

  private static readonly BUNDLER_VERSION_PATTERN = /Metro.*v?(\d+\.\d+\.\d+)/;
  private static readonly PLATFORM_PATTERN = /--platform\s+(\w+)|Platform:\s*(\w+)|for platform `([^`]+)`/;

  /**
   * Parse Metro error message and extract relevant information
   */
  public static parseMetroError(errorMessage: string): MetroErrorInfo {
    const moduleName = this.extractModuleName(errorMessage);
    const errorType = this.classifyErrorType(errorMessage);
    const platform = this.extractPlatform(errorMessage);
    const bundlerVersion = this.extractBundlerVersion(errorMessage);
    const stackTrace = this.extractStackTrace(errorMessage);

    return {
      originalError: errorMessage,
      moduleName,
      errorType,
      platform,
      bundlerVersion,
      stackTrace,
    };
  }

  /**
   * Extract module name from error message
   */
  private static extractModuleName(errorMessage: string): string {
    // Try different patterns to extract module name
    for (const pattern of [
      this.ERROR_PATTERNS.UNABLE_TO_RESOLVE,
      this.ERROR_PATTERNS.MODULE_NOT_FOUND,
      this.ERROR_PATTERNS.DEPENDENCY_NOT_FOUND,
      this.ERROR_PATTERNS.PLATFORM_SPECIFIC,
    ]) {
      const match = errorMessage.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback: try to extract any module-like string
    const fallbackPattern = /['"`]([^'"`]+)['"`]/;
    const fallbackMatch = errorMessage.match(fallbackPattern);
    return fallbackMatch ? fallbackMatch[1] : 'unknown';
  }

  /**
   * Classify the type of error based on error message patterns
   */
  private static classifyErrorType(errorMessage: string): string {
    if (this.ERROR_PATTERNS.UNABLE_TO_RESOLVE.test(errorMessage)) {
      return 'UNABLE_TO_RESOLVE';
    }
    if (this.ERROR_PATTERNS.MODULE_NOT_FOUND.test(errorMessage)) {
      return 'MODULE_NOT_FOUND';
    }
    if (this.ERROR_PATTERNS.HASTE_MODULE_MAP.test(errorMessage)) {
      return 'HASTE_MODULE_MAP_ERROR';
    }
    if (this.ERROR_PATTERNS.DEPENDENCY_NOT_FOUND.test(errorMessage)) {
      return 'DEPENDENCY_NOT_FOUND';
    }
    if (this.ERROR_PATTERNS.INVALID_CONFIGURATION.test(errorMessage)) {
      return 'INVALID_CONFIGURATION';
    }
    if (this.ERROR_PATTERNS.CACHE_CORRUPTION.test(errorMessage)) {
      return 'CACHE_CORRUPTION';
    }
    if (this.ERROR_PATTERNS.PLATFORM_SPECIFIC.test(errorMessage)) {
      return 'PLATFORM_SPECIFIC_ERROR';
    }
    if (this.ERROR_PATTERNS.PACKAGE_JSON_ERROR.test(errorMessage)) {
      return 'PACKAGE_JSON_ERROR';
    }
    if (this.ERROR_PATTERNS.NODE_MODULES_ERROR.test(errorMessage)) {
      return 'NODE_MODULES_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Extract platform information from error message
   */
  private static extractPlatform(errorMessage: string): string | undefined {
    const match = errorMessage.match(this.PLATFORM_PATTERN);
    return match ? (match[1] || match[2] || match[3]) : undefined;
  }

  /**
   * Extract Metro bundler version from error message
   */
  private static extractBundlerVersion(errorMessage: string): string | undefined {
    const match = errorMessage.match(this.BUNDLER_VERSION_PATTERN);
    return match ? match[1] : undefined;
  }

  /**
   * Extract stack trace from error message
   */
  private static extractStackTrace(errorMessage: string): string | undefined {
    // Look for stack trace patterns
    const stackTraceStart = errorMessage.indexOf('    at ');
    if (stackTraceStart !== -1) {
      return errorMessage.substring(stackTraceStart);
    }

    // Alternative stack trace pattern
    const altStackTrace = errorMessage.match(/\n\s+at .+/g);
    if (altStackTrace) {
      return altStackTrace.join('\n');
    }

    return undefined;
  }

  /**
   * Check if error message indicates a specific error pattern
   */
  public static hasPattern(errorMessage: string, patternName: keyof typeof MetroErrorParser.ERROR_PATTERNS): boolean {
    const pattern = this.ERROR_PATTERNS[patternName];
    return pattern.test(errorMessage);
  }

  /**
   * Extract all module references from error message
   */
  public static extractAllModuleReferences(errorMessage: string): string[] {
    const modules: string[] = [];
    const modulePattern = /['"`]([^'"`/]+(?:\/[^'"`]+)*)['"`]/g;
    let match;

    while ((match = modulePattern.exec(errorMessage)) !== null) {
      const moduleName = match[1];
      // Filter out obvious non-module strings
      if (this.isLikelyModuleName(moduleName)) {
        modules.push(moduleName);
      }
    }

    return [...new Set(modules)]; // Remove duplicates
  }

  /**
   * Determine if a string is likely a module name
   */
  public static isLikelyModuleName(str: string): boolean {
    // Basic heuristics for module names
    if (str.length < 2) return false;
    if (str.includes(' ')) return false;
    if (str.startsWith('http')) return false;
    if (str.match(/^\d+$/)) return false; // Pure numbers
    
    // Common module patterns
    return (
      str.includes('/') || // Path-like
      str.includes('@') || // Scoped packages
      !!str.match(/^[a-z][a-z0-9-_]*$/i) || // Standard package names
      str.startsWith('react') ||
      str.startsWith('.')  // Relative imports
    );
  }
}