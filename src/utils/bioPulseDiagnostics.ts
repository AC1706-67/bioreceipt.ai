/**
 * BioPulse System Diagnostics
 * Comprehensive health check and system validation
 */

import { predictiveAnalyticsEngine } from '../services/analytics/predictiveAnalyticsEngine';
import { wearableIntegrationService } from '../services/wearables/wearableIntegrationService';
import { bioPulseIntegrationService } from '../services/integration/bioPulseIntegrationService';
import { bioPulseAnalysisEngine } from '../services/analysis/bioPulseAnalysisEngine';
import { bioPulseAIService } from '../services/ai/bioPulseAIService';
import { bioPulseSafetyAlertService } from '../services/alerts/bioPulseSafetyAlertService';
import { intakeLoggingService } from '../services/substance/intakeLoggingService';
import { substanceDatabase } from '../services/substance/substanceDatabase';

interface DiagnosticResult {
  component: string;
  status: 'HEALTHY' | 'WARNING' | 'ERROR' | 'UNKNOWN';
  message: string;
  details?: string;
  performance?: {
    responseTime?: number;
    memoryUsage?: number;
    errorRate?: number;
  };
  recommendations?: string[];
}

interface SystemDiagnostics {
  timestamp: Date;
  overallStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
  results: DiagnosticResult[];
  summary: {
    totalComponents: number;
    healthyComponents: number;
    warningComponents: number;
    errorComponents: number;
  };
  systemMetrics: {
    totalMemoryUsage: number;
    averageResponseTime: number;
    overallErrorRate: number;
  };
}

class BioPulseDiagnostics {
  private static instance: BioPulseDiagnostics;

  private constructor() {}

  static getInstance(): BioPulseDiagnostics {
    if (!BioPulseDiagnostics.instance) {
      BioPulseDiagnostics.instance = new BioPulseDiagnostics();
    }
    return BioPulseDiagnostics.instance;
  }

  async runFullDiagnostics(): Promise<SystemDiagnostics> {
    console.log('🔍 Starting BioPulse System Diagnostics...\n');
    
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    // Run all diagnostic checks
    results.push(await this.checkPredictiveAnalyticsEngine());
    results.push(await this.checkWearableIntegration());
    results.push(await this.checkAnalysisEngine());
    results.push(await this.checkAIService());
    results.push(await this.checkSafetyAlerts());
    results.push(await this.checkIntegrationService());
    results.push(await this.checkSubstanceDatabase());
    results.push(await this.checkIntakeLogging());
    results.push(await this.checkSystemResources());
    results.push(await this.checkDataIntegrity());

    // Calculate summary
    const summary = {
      totalComponents: results.length,
      healthyComponents: results.filter(r => r.status === 'HEALTHY').length,
      warningComponents: results.filter(r => r.status === 'WARNING').length,
      errorComponents: results.filter(r => r.status === 'ERROR').length
    };

    // Calculate system metrics
    const systemMetrics = {
      totalMemoryUsage: this.calculateTotalMemoryUsage(results),
      averageResponseTime: this.calculateAverageResponseTime(results),
      overallErrorRate: this.calculateOverallErrorRate(results)
    };

    // Determine overall status
    const overallStatus = this.determineOverallStatus(results);

    const diagnostics: SystemDiagnostics = {
      timestamp: new Date(),
      overallStatus,
      results,
      summary,
      systemMetrics
    };

    this.printDiagnosticsReport(diagnostics);
    
    return diagnostics;
  }

  private async checkPredictiveAnalyticsEngine(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      // Test initialization
      await predictiveAnalyticsEngine.initialize();
      
      // Test basic functionality
      const testUserId = 'diagnostic_test_user';
      const quickForecast = await predictiveAnalyticsEngine.generateQuickForecast(testUserId);
      
      const responseTime = Date.now() - startTime;
      
      if (!quickForecast) {
        return {
          component: 'Predictive Analytics Engine',
          status: 'ERROR',
          message: 'Failed to generate forecast',
          performance: { responseTime }
        };
      }

      if (responseTime > 5000) {
        return {
          component: 'Predictive Analytics Engine',
          status: 'WARNING',
          message: 'Slow response time detected',
          details: `Response time: ${responseTime}ms (target: <3000ms)`,
          performance: { responseTime },
          recommendations: ['Consider optimizing prediction algorithms', 'Check data processing efficiency']
        };
      }

      return {
        component: 'Predictive Analytics Engine',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `Quick forecast generated successfully in ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'Predictive Analytics Engine',
        status: 'ERROR',
        message: 'Service failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime },
        recommendations: ['Check service initialization', 'Verify dependencies']
      };
    }
  }

  private async checkWearableIntegration(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      await wearableIntegrationService.initialize();
      
      // Test device discovery
      const discovery = await wearableIntegrationService.discoverDevices();
      const responseTime = Date.now() - startTime;
      
      if (!discovery || !Array.isArray(discovery.availableDevices)) {
        return {
          component: 'Wearable Integration Service',
          status: 'ERROR',
          message: 'Device discovery failed',
          performance: { responseTime }
        };
      }

      const availableDevices = discovery.availableDevices.length;
      const compatibilityIssues = discovery.compatibilityIssues.length;

      if (compatibilityIssues > 0) {
        return {
          component: 'Wearable Integration Service',
          status: 'WARNING',
          message: 'Compatibility issues detected',
          details: `${availableDevices} devices available, ${compatibilityIssues} compatibility issues`,
          performance: { responseTime },
          recommendations: ['Review device compatibility', 'Update device connectors']
        };
      }

      return {
        component: 'Wearable Integration Service',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `${availableDevices} devices available, no compatibility issues`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'Wearable Integration Service',
        status: 'ERROR',
        message: 'Service failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkAnalysisEngine(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      await bioPulseAnalysisEngine.initialize();
      
      // Test basic analysis
      const testUserId = 'diagnostic_test_user';
      const analysis = await bioPulseAnalysisEngine.analyzeCurrentState(testUserId);
      
      const responseTime = Date.now() - startTime;
      
      if (!analysis) {
        return {
          component: 'BioPulse Analysis Engine',
          status: 'ERROR',
          message: 'Analysis generation failed',
          performance: { responseTime }
        };
      }

      if (responseTime > 8000) {
        return {
          component: 'BioPulse Analysis Engine',
          status: 'WARNING',
          message: 'Slow analysis performance',
          details: `Analysis time: ${responseTime}ms (target: <5000ms)`,
          performance: { responseTime },
          recommendations: ['Optimize analysis algorithms', 'Check data processing pipeline']
        };
      }

      return {
        component: 'BioPulse Analysis Engine',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `Analysis completed in ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'BioPulse Analysis Engine',
        status: 'ERROR',
        message: 'Service failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkAIService(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      await bioPulseAIService.initialize();
      
      // Create mock analysis for AI service test
      const mockAnalysis = {
        analysisId: 'diagnostic_test',
        userId: 'diagnostic_test_user',
        timestamp: new Date(),
        impactScore: { overall: 50, categories: { physical: 50, cognitive: 50, emotional: 50, metabolic: 50 }, trend: 'stable' as any, factors: [] },
        interactionRisks: [],
        recoveryTimeline: { phases: [], totalDuration: 0, peakEffectTime: 0, clearanceTime: 0, recommendations: [] },
        personalizedInsights: [],
        optimizationSuggestions: [],
        riskFactors: [],
        confidence: 0.8,
        analysisVersion: '2.0.0',
        processingTime: 1000
      };

      const insights = await bioPulseAIService.generateInsights(mockAnalysis, []);
      const responseTime = Date.now() - startTime;
      
      if (!insights) {
        return {
          component: 'BioPulse AI Service',
          status: 'ERROR',
          message: 'AI insight generation failed',
          performance: { responseTime }
        };
      }

      if (responseTime > 5000) {
        return {
          component: 'BioPulse AI Service',
          status: 'WARNING',
          message: 'Slow AI processing',
          details: `AI processing time: ${responseTime}ms (target: <3000ms)`,
          performance: { responseTime },
          recommendations: ['Optimize AI models', 'Check prompt processing efficiency']
        };
      }

      return {
        component: 'BioPulse AI Service',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `AI insights generated in ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'BioPulse AI Service',
        status: 'ERROR',
        message: 'Service failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkSafetyAlerts(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      await bioPulseSafetyAlertService.initialize();
      
      // Test alert retrieval
      const testUserId = 'diagnostic_test_user';
      const activeAlerts = await bioPulseSafetyAlertService.getActiveAlerts(testUserId);
      
      const responseTime = Date.now() - startTime;
      
      if (!Array.isArray(activeAlerts)) {
        return {
          component: 'BioPulse Safety Alert Service',
          status: 'ERROR',
          message: 'Alert retrieval failed',
          performance: { responseTime }
        };
      }

      return {
        component: 'BioPulse Safety Alert Service',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `Alert system responsive in ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'BioPulse Safety Alert Service',
        status: 'ERROR',
        message: 'Service failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkIntegrationService(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      await bioPulseIntegrationService.initialize();
      
      // Test monitoring status
      const testUserId = 'diagnostic_test_user';
      const monitoringStatus = bioPulseIntegrationService.getMonitoringStatus(testUserId);
      
      const responseTime = Date.now() - startTime;
      
      if (!monitoringStatus) {
        return {
          component: 'BioPulse Integration Service',
          status: 'ERROR',
          message: 'Integration service not responding',
          performance: { responseTime }
        };
      }

      return {
        component: 'BioPulse Integration Service',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `Integration service responsive in ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'BioPulse Integration Service',
        status: 'ERROR',
        message: 'Service failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkSubstanceDatabase(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      await substanceDatabase.initialize();
      
      // Test database operations
      const substances = await substanceDatabase.getAllSubstances();
      const responseTime = Date.now() - startTime;
      
      if (!Array.isArray(substances)) {
        return {
          component: 'Substance Database',
          status: 'ERROR',
          message: 'Database query failed',
          performance: { responseTime }
        };
      }

      if (substances.length === 0) {
        return {
          component: 'Substance Database',
          status: 'WARNING',
          message: 'Database appears empty',
          details: 'No substances found in database',
          performance: { responseTime },
          recommendations: ['Verify database initialization', 'Check data seeding']
        };
      }

      return {
        component: 'Substance Database',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `${substances.length} substances available, query time: ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'Substance Database',
        status: 'ERROR',
        message: 'Database failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkIntakeLogging(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      // Test intake logging functionality
      const testUserId = 'diagnostic_test_user';
      const recentIntakes = await intakeLoggingService.getRecentIntakes(testUserId, 24);
      
      const responseTime = Date.now() - startTime;
      
      if (!Array.isArray(recentIntakes)) {
        return {
          component: 'Intake Logging Service',
          status: 'ERROR',
          message: 'Intake retrieval failed',
          performance: { responseTime }
        };
      }

      return {
        component: 'Intake Logging Service',
        status: 'HEALTHY',
        message: 'Operating normally',
        details: `Intake logging responsive in ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'Intake Logging Service',
        status: 'ERROR',
        message: 'Service failure',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkSystemResources(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const responseTime = Date.now() - startTime;

      if (heapUsedMB > 500) {
        return {
          component: 'System Resources',
          status: 'WARNING',
          message: 'High memory usage detected',
          details: `Heap used: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`,
          performance: { memoryUsage: heapUsedMB, responseTime },
          recommendations: ['Monitor memory leaks', 'Consider garbage collection optimization']
        };
      }

      return {
        component: 'System Resources',
        status: 'HEALTHY',
        message: 'Resource usage normal',
        details: `Heap used: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`,
        performance: { memoryUsage: heapUsedMB, responseTime }
      };

    } catch (error) {
      return {
        component: 'System Resources',
        status: 'ERROR',
        message: 'Resource check failed',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private async checkDataIntegrity(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      // Check for data consistency across services
      const testUserId = 'diagnostic_test_user';
      
      // Verify service interconnections
      const intakeData = await intakeLoggingService.getRecentIntakes(testUserId, 24);
      const substances = await substanceDatabase.getAllSubstances();
      
      const responseTime = Date.now() - startTime;
      
      // Check for orphaned data
      let orphanedIntakes = 0;
      for (const intake of intakeData) {
        const substanceExists = substances.some(s => s.id === intake.substanceId);
        if (!substanceExists) {
          orphanedIntakes++;
        }
      }

      if (orphanedIntakes > 0) {
        return {
          component: 'Data Integrity',
          status: 'WARNING',
          message: 'Data consistency issues detected',
          details: `${orphanedIntakes} orphaned intake records found`,
          performance: { responseTime },
          recommendations: ['Clean up orphaned data', 'Implement referential integrity checks']
        };
      }

      return {
        component: 'Data Integrity',
        status: 'HEALTHY',
        message: 'Data consistency verified',
        details: `All data relationships intact, check completed in ${responseTime}ms`,
        performance: { responseTime }
      };

    } catch (error) {
      return {
        component: 'Data Integrity',
        status: 'ERROR',
        message: 'Data integrity check failed',
        details: error.message,
        performance: { responseTime: Date.now() - startTime }
      };
    }
  }

  private determineOverallStatus(results: DiagnosticResult[]): 'HEALTHY' | 'WARNING' | 'ERROR' {
    const hasErrors = results.some(r => r.status === 'ERROR');
    const hasWarnings = results.some(r => r.status === 'WARNING');
    
    if (hasErrors) return 'ERROR';
    if (hasWarnings) return 'WARNING';
    return 'HEALTHY';
  }

  private calculateTotalMemoryUsage(results: DiagnosticResult[]): number {
    const memoryResults = results.filter(r => r.performance?.memoryUsage);
    if (memoryResults.length === 0) return 0;
    
    return memoryResults.reduce((sum, r) => sum + (r.performance?.memoryUsage || 0), 0);
  }

  private calculateAverageResponseTime(results: DiagnosticResult[]): number {
    const responseTimeResults = results.filter(r => r.performance?.responseTime);
    if (responseTimeResults.length === 0) return 0;
    
    const totalTime = responseTimeResults.reduce((sum, r) => sum + (r.performance?.responseTime || 0), 0);
    return totalTime / responseTimeResults.length;
  }

  private calculateOverallErrorRate(results: DiagnosticResult[]): number {
    const errorCount = results.filter(r => r.status === 'ERROR').length;
    return (errorCount / results.length) * 100;
  }

  private printDiagnosticsReport(diagnostics: SystemDiagnostics): void {
    console.log('\n🏥 BIOPULSE SYSTEM DIAGNOSTICS REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${diagnostics.timestamp.toISOString()}`);
    console.log(`Overall Status: ${this.getStatusIcon(diagnostics.overallStatus)} ${diagnostics.overallStatus}`);
    console.log('');

    // Summary
    console.log('📊 SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total Components: ${diagnostics.summary.totalComponents}`);
    console.log(`✅ Healthy: ${diagnostics.summary.healthyComponents}`);
    console.log(`⚠️  Warning: ${diagnostics.summary.warningComponents}`);
    console.log(`❌ Error: ${diagnostics.summary.errorComponents}`);
    console.log('');

    // System Metrics
    console.log('📈 SYSTEM METRICS');
    console.log('-'.repeat(30));
    console.log(`Memory Usage: ${diagnostics.systemMetrics.totalMemoryUsage.toFixed(2)}MB`);
    console.log(`Avg Response Time: ${diagnostics.systemMetrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`Error Rate: ${diagnostics.systemMetrics.overallErrorRate.toFixed(1)}%`);
    console.log('');

    // Component Details
    console.log('🔍 COMPONENT STATUS');
    console.log('-'.repeat(30));
    
    diagnostics.results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      console.log(`${icon} ${result.component}: ${result.message}`);
      
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      
      if (result.performance) {
        const perf = result.performance;
        if (perf.responseTime) console.log(`   Response Time: ${perf.responseTime}ms`);
        if (perf.memoryUsage) console.log(`   Memory: ${perf.memoryUsage.toFixed(2)}MB`);
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        console.log(`   Recommendations:`);
        result.recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
      
      console.log('');
    });

    // Overall Assessment
    console.log('🎯 OVERALL ASSESSMENT');
    console.log('-'.repeat(30));
    
    if (diagnostics.overallStatus === 'HEALTHY') {
      console.log('✅ System is operating normally. All components are healthy.');
    } else if (diagnostics.overallStatus === 'WARNING') {
      console.log('⚠️  System has some issues that should be addressed but is still functional.');
    } else {
      console.log('❌ System has critical issues that require immediate attention.');
    }
    
    console.log('='.repeat(60));
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'HEALTHY': return '✅';
      case 'WARNING': return '⚠️';
      case 'ERROR': return '❌';
      default: return '❓';
    }
  }
}

// Export diagnostics runner
export const runBioPulseDiagnostics = async (): Promise<SystemDiagnostics> => {
  const diagnostics = BioPulseDiagnostics.getInstance();
  return await diagnostics.runFullDiagnostics();
};

// Auto-run if called directly
if (require.main === module) {
  runBioPulseDiagnostics().catch(console.error);
}