/**
 * Core types for React Native module resolution diagnostics
 */

export interface ResolutionIssue {
  type: 'MISSING_MODULE' | 'CACHE_CORRUPTION' | 'CONFIG_ERROR' | 'DEPENDENCY_CONFLICT';
  module: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedFixes: string[];
  errorMessage?: string;
  stackTrace?: string;
}

export interface DiagnosticReport {
  timestamp: Date;
  projectPath: string;
  metroVersion: string;
  nodeVersion: string;
  reactNativeVersion: string;
  issues: ResolutionIssue[];
  recommendations: string[];
  systemInfo: SystemInfo;
}

export interface SystemInfo {
  platform: string;
  nodeVersion: string;
  npmVersion: string;
  yarnVersion?: string;
  metroVersion: string;
  reactNativeVersion: string;
  hasWatchman: boolean;
}

export interface ModuleResolutionStatus {
  hasteMapValid: boolean;
  configurationValid: boolean;
  dependenciesIntact: boolean;
  cacheHealthy: boolean;
  overallStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
}

export interface CacheStatus {
  metroCache: {
    exists: boolean;
    size: number;
    lastModified: Date;
    healthy: boolean;
  };
  npmCache: {
    exists: boolean;
    size: number;
    healthy: boolean;
  };
  watchmanCache?: {
    exists: boolean;
    healthy: boolean;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}