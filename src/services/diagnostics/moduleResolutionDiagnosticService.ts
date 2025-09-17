import { ResolutionIssue, MetroErrorInfo, ErrorClassificationResult, ModuleResolutionDiagnostic } from '../../types/moduleResolution';
import { MetroErrorParser } from './metroErrorParser';
import { ErrorClassificationService } from './errorClassificationService';

/**
 * Module Resolution Diagnostic Service
 * Main service for analyzing and diagnosing Metro module resolution issues
 */
export class ModuleResolutionDiagnosticService implements ModuleResolutionDiagnostic {
  /**
   * Analyze a resolution error and return issue details
   */
  public analyzeResolutionError(error: string): ResolutionIssue {
    return ErrorClassificationService.analyzeResolutionError(error);
  }

  /**
   * Classify an error with detailed analysis
   */
  public classifyError(errorInfo: MetroErrorInfo): ErrorClassificationResult {
    return ErrorClassificationService.classifyError(errorInfo);
  }

  /**
   * Parse Metro error message into structured information
   */
  public parseMetroError(errorMessage: string): MetroErrorInfo {
    return MetroErrorParser.parseMetroError(errorMessage);
  }

  /**
   * Analyze multiple errors and return prioritized issues
   */
  public analyzeMultipleErrors(errors: string[]): ResolutionIssue[] {
    const issues = errors.map(error => this.analyzeResolutionError(error));
    
    // Sort by severity and confidence
    return issues.sort((a, b) => {
      const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) {
        return severityDiff;
      }
      
      // If same severity, prioritize by module type
      const aIsCore = a.module.startsWith('react-native');
      const bIsCore = b.module.startsWith('react-native');
      
      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      
      return 0;
    });
  }

  /**
   * Get quick diagnostic summary for an error
   */
  public getQuickDiagnostic(errorMessage: string): {
    module: string;
    type: string;
    severity: string;
    primaryFix: string;
  } {
    const issue = this.analyzeResolutionError(errorMessage);
    
    return {
      module: issue.module,
      type: issue.type,
      severity: issue.severity,
      primaryFix: issue.suggestedFixes[0] || 'No specific fix available',
    };
  }

  /**
   * Check if error is likely a common Metro issue
   */
  public isCommonMetroIssue(errorMessage: string): boolean {
    const commonPatterns = [
      /Unable to resolve module/,
      /Cannot resolve module/,
      /Haste module map/,
      /Metro cache/,
      /node_modules.*not found/,
    ];

    return commonPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Extract actionable information from error
   */
  public extractActionableInfo(errorMessage: string): {
    canAutoFix: boolean;
    requiresManualIntervention: boolean;
    estimatedFixTime: 'quick' | 'medium' | 'long';
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const issue = this.analyzeResolutionError(errorMessage);
    
    let canAutoFix = false;
    let requiresManualIntervention = true;
    let estimatedFixTime: 'quick' | 'medium' | 'long' = 'medium';
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';

    switch (issue.type) {
      case 'CACHE_CORRUPTION':
        canAutoFix = true;
        requiresManualIntervention = false;
        estimatedFixTime = 'quick';
        riskLevel = 'low';
        break;
        
      case 'MISSING_MODULE':
        if (issue.module.startsWith('./') || issue.module.startsWith('../')) {
          // Relative imports need manual verification
          canAutoFix = false;
          requiresManualIntervention = true;
          estimatedFixTime = 'medium';
          riskLevel = 'medium';
        } else {
          // Package installations can be automated
          canAutoFix = true;
          requiresManualIntervention = false;
          estimatedFixTime = 'medium';
          riskLevel = 'low';
        }
        break;
        
      case 'CONFIG_ERROR':
        canAutoFix = false;
        requiresManualIntervention = true;
        estimatedFixTime = 'long';
        riskLevel = 'high';
        break;
        
      case 'HASTE_MAP_ERROR':
        canAutoFix = true;
        requiresManualIntervention = false;
        estimatedFixTime = 'quick';
        riskLevel = 'low';
        break;
        
      case 'DEPENDENCY_CONFLICT':
        canAutoFix = false;
        requiresManualIntervention = true;
        estimatedFixTime = 'long';
        riskLevel = 'high';
        break;
        
      default:
        canAutoFix = false;
        requiresManualIntervention = true;
        estimatedFixTime = 'medium';
        riskLevel = 'medium';
    }

    return {
      canAutoFix,
      requiresManualIntervention,
      estimatedFixTime,
      riskLevel,
    };
  }
}