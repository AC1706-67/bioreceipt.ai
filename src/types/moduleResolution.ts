/**
 * Types for React Native module resolution diagnostic system
 */

export interface ResolutionIssue {
  type: 'MISSING_MODULE' | 'CACHE_CORRUPTION' | 'CONFIG_ERROR' | 'DEPENDENCY_CONFLICT' | 'HASTE_MAP_ERROR' | 'PATH_RESOLUTION_ERROR';
  module: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedFixes: string[];
  errorMessage: string;
  stackTrace?: string;
  context?: {
    platform?: 'android' | 'ios';
    bundlerVersion?: string;
    nodeVersion?: string;
    projectPath?: string;
  };
}

export interface MetroErrorInfo {
  originalError: string;
  moduleName: string;
  errorType: string;
  platform?: string;
  stackTrace?: string;
  bundlerVersion?: string;
}

export interface ErrorClassificationResult {
  issue: ResolutionIssue;
  confidence: number;
  additionalContext?: Record<string, any>;
}

export interface ModuleResolutionDiagnostic {
  analyzeResolutionError(error: string): ResolutionIssue;
  classifyError(errorInfo: MetroErrorInfo): ErrorClassificationResult;
  parseMetroError(errorMessage: string): MetroErrorInfo;
}