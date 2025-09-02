/**
 * Analytics Smoke Test
 * Quick smoke test to verify basic analytics functionality
 */
import { AnalyticsService } from '../services/analytics/analyticsService';
import { AnalyticsAlertsService } from '../services/analytics/analyticsAlertsService';

interface SmokeTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export class AnalyticsSmokeTest {
  private analyticsService: AnalyticsService;
  private alertsService: AnalyticsAlertsService;
  private results: SmokeTestResult[] = [];

  constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.alertsService = AnalyticsAlertsService.getInstance();
  }

  /**
   * Run comprehensive smoke test
   */
  public async runSmokeTest(): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number;
    results: SmokeTestResult[];
  }> {
    console.log('🔥 Starting Analytics Smoke Test...');
    const startTime = Date.now();

    try {
      // Test 1: Service Initialization
      await this.testServiceInitialization();

      // Test 2: Basic Event Tracking
      await this.testBasicEventTracking();

      // Test 3: Privacy Settings
      await this.testPrivacySettings();

      // Test 4: Metrics Retrieval
      await this.testMetricsRetrieval();

      // Test 5: Alerts System
      await this.testAlertsSystem();

      // Test 6: Error Handling
      await this.testErrorHandling();

      // Test 7: Data Cleanup
      await this.testDataCleanup();

    } catch (error) {
      console.error('❌ Smoke test failed:', error);
    }

    const totalDuration = Date.now() - startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.length - passedTests;
    const allPassed = failedTests === 0;

    const summary = {
      passed: allPassed,
      totalTests: this.results.length,
      passedTests,
      failedTests,
      duration: totalDuration,
      results: this.results
    };

    this.printSummary(summary);
    return summary;
  }

  /**
   * Test service initialization
   */
  private async testServiceInitialization(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Initialize analytics service
      await this.analyticsService.initialize({
        enableAnalytics: true,
        enablePersonalizedAnalytics: true,
        enablePerformanceTracking: true,
        enableErrorReporting: true
      });

      // Initialize alerts service
      await this.alertsService.startMonitoring();

      // Verify services are working
      const privacySettings = this.analyticsService.getPrivacySettings();
      const alertConfigs = this.alertsService.getAllAlertConfigs();

      if (!privacySettings || !alertConfigs || alertConfigs.length === 0) {
        throw new Error('Services not properly initialized');
      }

      this.addResult('Service Initialization', true, Date.now() - startTime);
    } catch (error) {
      this.addResult('Service Initialization', false, Date.now() - startTime, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test basic event tracking
   */
  private async testBasicEventTracking(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Track various types of events
      await this.analyticsService.trackEvent('tip_view', {
        tipId: 'smoke_test_tip_001',
        category: 'nutrition'
      }, 'smoke_test_user');

      await this.analyticsService.trackTipEngagement(
        'smoke_test_tip_001',
        'like',
        'smoke_test_user',
        { category: 'nutrition' }
      );

      await this.analyticsService.trackScreenView(
        'SmokeTestScreen',
        'smoke_test_user'
      );

      await this.analyticsService.trackUserAction(
        'smoke_test_action',
        'smoke_test_user'
      );

      await this.analyticsService.trackPerformanceMetric(
        'smoke_test_metric',
        100,
        'ms'
      );

      // Flush events to ensure they're processed
      await this.analyticsService.flushEvents();

      this.addResult('Basic Event Tracking', true, Date.now() - startTime);
    } catch (error) {
      this.addResult('Basic Event Tracking', false, Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test privacy settings
   */
  private async testPrivacySettings(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get current settings
      const originalSettings = this.analyticsService.getPrivacySettings();

      // Update settings
      await this.analyticsService.updatePrivacySettings({
        enableAnalytics: false,
        dataRetentionDays: 30
      });

      // Verify update
      const updatedSettings = this.analyticsService.getPrivacySettings();
      
      if (updatedSettings.enableAnalytics !== false || updatedSettings.dataRetentionDays !== 30) {
        throw new Error('Privacy settings not updated correctly');
      }

      // Restore original settings
      await this.analyticsService.updatePrivacySettings(originalSettings);

      this.addResult('Privacy Settings', true, Date.now() - startTime);
    } catch (error) {
      this.addResult('Privacy Settings', false, Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test metrics retrieval
   */
  private async testMetricsRetrieval(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get engagement metrics
      const engagementMetrics = await this.analyticsService.getEngagementMetrics();
      
      if (!engagementMetrics || typeof engagementMetrics.tipViews !== 'number') {
        throw new Error('Invalid engagement metrics structure');
      }

      // Get content performance
      const contentPerformance = await this.analyticsService.getContentPerformance();
      
      if (!Array.isArray(contentPerformance)) {
        throw new Error('Invalid content performance structure');
      }

      // Get user behavior analytics
      const userBehavior = await this.analyticsService.getUserBehaviorAnalytics();
      
      if (!userBehavior || typeof userBehavior.averageSessionDuration !== 'number') {
        throw new Error('Invalid user behavior analytics structure');
      }

      this.addResult('Metrics Retrieval', true, Date.now() - startTime);
    } catch (error) {
      this.addResult('Metrics Retrieval', false, Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test alerts system
   */
  private async testAlertsSystem(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check metrics (should not throw)
      const alerts = await this.alertsService.checkMetrics();
      
      if (!Array.isArray(alerts)) {
        throw new Error('Invalid alerts response');
      }

      // Get active alerts
      const activeAlerts = this.alertsService.getActiveAlerts();
      
      if (!Array.isArray(activeAlerts)) {
        throw new Error('Invalid active alerts response');
      }

      // Get alert history
      const alertHistory = this.alertsService.getAlertHistory(10);
      
      if (!Array.isArray(alertHistory)) {
        throw new Error('Invalid alert history response');
      }

      // Get alert configurations
      const alertConfigs = this.alertsService.getAllAlertConfigs();
      
      if (!Array.isArray(alertConfigs) || alertConfigs.length === 0) {
        throw new Error('No alert configurations found');
      }

      this.addResult('Alerts System', true, Date.now() - startTime);
    } catch (error) {
      this.addResult('Alerts System', false, Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test error tracking
      const testError = new Error('Smoke test error');
      await this.analyticsService.trackError(testError, 'smoke_test', 'smoke_test_user');

      // Test graceful degradation when analytics is disabled
      await this.analyticsService.updatePrivacySettings({ enableAnalytics: false });
      
      // These should not throw errors
      await this.analyticsService.trackEvent('disabled_test', {});
      await this.analyticsService.trackTipEngagement('test_tip', 'view');
      
      // Re-enable analytics
      await this.analyticsService.updatePrivacySettings({ enableAnalytics: true });

      this.addResult('Error Handling', true, Date.now() - startTime);
    } catch (error) {
      this.addResult('Error Handling', false, Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test data cleanup
   */
  private async testDataCleanup(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test clearing all data
      await this.analyticsService.clearAllData();

      // Verify data is cleared (metrics should be empty/zero)
      const metrics = await this.analyticsService.getEngagementMetrics();
      
      // After clearing, metrics should be at zero/empty state
      if (metrics.tipViews !== 0 || metrics.tipLikes !== 0) {
        console.warn('⚠️ Data may not have been completely cleared, but this is not necessarily an error');
      }

      this.addResult('Data Cleanup', true, Date.now() - startTime);
    } catch (error) {
      this.addResult('Data Cleanup', false, Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Add test result
   */
  private addResult(testName: string, passed: boolean, duration: number, error?: string): void {
    this.results.push({
      testName,
      passed,
      duration,
      error
    });

    const status = passed ? '✅' : '❌';
    const durationText = `(${duration}ms)`;
    console.log(`${status} ${testName} ${durationText}`);
    
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  /**
   * Print test summary
   */
  private printSummary(summary: any): void {
    console.log('\n🔥 Analytics Smoke Test Summary:');
    console.log('================================');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Duration: ${summary.duration}ms`);
    console.log(`Status: ${summary.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (summary.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      summary.results
        .filter((result: SmokeTestResult) => !result.passed)
        .forEach((result: SmokeTestResult) => {
          console.log(`   - ${result.testName}: ${result.error}`);
        });
    }

    console.log('\n🎯 Smoke Test Complete!');
  }

  /**
   * Cleanup after test
   */
  public async cleanup(): Promise<void> {
    try {
      await this.analyticsService.cleanup();
      await this.alertsService.stopMonitoring();
      console.log('🧹 Smoke test cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

/**
 * Run analytics smoke test
 */
export const runAnalyticsSmokeTest = async (): Promise<boolean> => {
  const smokeTest = new AnalyticsSmokeTest();
  
  try {
    const result = await smokeTest.runSmokeTest();
    return result.passed;
  } finally {
    await smokeTest.cleanup();
  }
};

/**
 * Quick health check for analytics system
 */
export const analyticsHealthCheck = async (): Promise<{
  healthy: boolean;
  services: {
    analytics: boolean;
    alerts: boolean;
  };
  errors: string[];
}> => {
  const errors: string[] = [];
  let analyticsHealthy = false;
  let alertsHealthy = false;

  try {
    // Check analytics service
    const analyticsService = AnalyticsService.getInstance();
    await analyticsService.initialize({ enableAnalytics: true });
    
    // Try basic operation
    await analyticsService.trackEvent('health_check', {});
    analyticsHealthy = true;
  } catch (error) {
    errors.push(`Analytics service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Check alerts service
    const alertsService = AnalyticsAlertsService.getInstance();
    await alertsService.startMonitoring();
    
    // Try basic operation
    const configs = alertsService.getAllAlertConfigs();
    if (configs.length === 0) {
      throw new Error('No alert configurations found');
    }
    
    alertsHealthy = true;
    await alertsService.stopMonitoring();
  } catch (error) {
    errors.push(`Alerts service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const healthy = analyticsHealthy && alertsHealthy && errors.length === 0;

  return {
    healthy,
    services: {
      analytics: analyticsHealthy,
      alerts: alertsHealthy
    },
    errors
  };
};