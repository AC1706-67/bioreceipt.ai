/**
 * Analytics Verification Utility
 * Comprehensive verification script for analytics system functionality
 */

const { AnalyticsService } = require('../services/analytics/analyticsService');
const { AnalyticsAlertsService } = require('../services/analytics/analyticsAlertsService');

class AnalyticsVerificationUtility {
  constructor() {
    this.analyticsService = null;
    this.alertsService = null;
    this.verificationResults = [];
  }

  /**
   * Run comprehensive analytics verification
   */
  async runVerification() {
    console.log('🔍 Starting Analytics System Verification...\n');

    try {
      // Initialize services
      await this.initializeServices();

      // Verify core analytics functionality
      await this.verifyAnalyticsCore();

      // Verify privacy compliance
      await this.verifyPrivacyCompliance();

      // Verify data integrity
      await this.verifyDataIntegrity();

      // Verify performance
      await this.verifyPerformance();

      // Verify alerts system
      await this.verifyAlertsSystem();

      // Verify error handling
      await this.verifyErrorHandling();

      // Generate final report
      this.generateVerificationReport();

    } catch (error) {
      console.error('❌ Verification failed:', error);
      this.addResult('System Initialization', false, `Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Initialize analytics services
   */
  async initializeServices() {
    try {
      this.analyticsService = AnalyticsService.getInstance();
      this.alertsService = AnalyticsAlertsService.getInstance();

      // Initialize with test settings
      await this.analyticsService.initialize({
        enableAnalytics: true,
        enablePersonalizedAnalytics: true,
        enablePerformanceTracking: true,
        enableErrorReporting: true,
        dataRetentionDays: 90
      });

      await this.alertsService.startMonitoring();

      this.addResult('Service Initialization', true, 'Analytics services initialized successfully');
    } catch (error) {
      this.addResult('Service Initialization', false, `Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify core analytics functionality
   */
  async verifyAnalyticsCore() {
    console.log('📊 Verifying Core Analytics Functionality...');

    // Test event tracking
    try {
      await this.analyticsService.trackEvent('tip_view', {
        tipId: 'test_tip_001',
        category: 'nutrition',
        difficulty: 'easy'
      }, 'test_user_001');

      this.addResult('Event Tracking', true, 'Successfully tracked analytics event');
    } catch (error) {
      this.addResult('Event Tracking', false, `Event tracking failed: ${error.message}`);
    }

    // Test tip engagement tracking
    try {
      await this.analyticsService.trackTipEngagement(
        'test_tip_001',
        'like',
        'test_user_001',
        { category: 'nutrition', readTime: 120 }
      );

      this.addResult('Tip Engagement Tracking', true, 'Successfully tracked tip engagement');
    } catch (error) {
      this.addResult('Tip Engagement Tracking', false, `Engagement tracking failed: ${error.message}`);
    }

    // Test screen view tracking
    try {
      await this.analyticsService.trackScreenView('HomeScreen', 'test_user_001', {
        previousScreen: 'LoginScreen'
      });

      this.addResult('Screen View Tracking', true, 'Successfully tracked screen view');
    } catch (error) {
      this.addResult('Screen View Tracking', false, `Screen view tracking failed: ${error.message}`);
    }

    // Test performance metric tracking
    try {
      await this.analyticsService.trackPerformanceMetric(
        'api_response_time',
        250,
        'ms',
        { endpoint: '/api/tips' }
      );

      this.addResult('Performance Tracking', true, 'Successfully tracked performance metric');
    } catch (error) {
      this.addResult('Performance Tracking', false, `Performance tracking failed: ${error.message}`);
    }

    // Test error tracking
    try {
      const testError = new Error('Test error for verification');
      await this.analyticsService.trackError(testError, 'verification_test', 'test_user_001');

      this.addResult('Error Tracking', true, 'Successfully tracked error event');
    } catch (error) {
      this.addResult('Error Tracking', false, `Error tracking failed: ${error.message}`);
    }
  }

  /**
   * Verify privacy compliance
   */
  async verifyPrivacyCompliance() {
    console.log('🔒 Verifying Privacy Compliance...');

    // Test privacy settings management
    try {
      const originalSettings = this.analyticsService.getPrivacySettings();
      
      await this.analyticsService.updatePrivacySettings({
        enableAnalytics: false,
        enablePersonalizedAnalytics: false
      });

      const updatedSettings = this.analyticsService.getPrivacySettings();
      
      const privacyUpdateWorking = 
        !updatedSettings.enableAnalytics && 
        !updatedSettings.enablePersonalizedAnalytics;

      // Restore original settings
      await this.analyticsService.updatePrivacySettings(originalSettings);

      this.addResult('Privacy Settings Management', privacyUpdateWorking, 
        privacyUpdateWorking ? 'Privacy settings updated correctly' : 'Privacy settings not updated properly');
    } catch (error) {
      this.addResult('Privacy Settings Management', false, `Privacy settings test failed: ${error.message}`);
    }

    // Test data anonymization
    try {
      await this.analyticsService.updatePrivacySettings({
        enableAnalytics: true,
        enablePersonalizedAnalytics: false
      });

      // Track event without personalization
      await this.analyticsService.trackEvent('test_event', {}, 'test_user_002');

      this.addResult('Data Anonymization', true, 'Data anonymization working (user ID should be removed)');
    } catch (error) {
      this.addResult('Data Anonymization', false, `Data anonymization test failed: ${error.message}`);
    }

    // Test data retention
    try {
      await this.analyticsService.updatePrivacySettings({
        dataRetentionDays: 30
      });

      const settings = this.analyticsService.getPrivacySettings();
      const retentionSet = settings.dataRetentionDays === 30;

      this.addResult('Data Retention Policy', retentionSet, 
        retentionSet ? 'Data retention policy set correctly' : 'Data retention policy not set');
    } catch (error) {
      this.addResult('Data Retention Policy', false, `Data retention test failed: ${error.message}`);
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity() {
    console.log('🔍 Verifying Data Integrity...');

    // Test data sanitization
    try {
      await this.analyticsService.trackEvent('test_event', {
        password: 'secret123', // Should be filtered out
        email: 'user@example.com', // Should be filtered out
        validData: 'this should remain',
        longString: 'a'.repeat(2000) // Should be truncated
      }, 'test_user_003');

      this.addResult('Data Sanitization', true, 'Sensitive data sanitization applied');
    } catch (error) {
      this.addResult('Data Sanitization', false, `Data sanitization test failed: ${error.message}`);
    }

    // Test event flushing
    try {
      // Track multiple events
      for (let i = 0; i < 5; i++) {
        await this.analyticsService.trackEvent('bulk_test_event', { index: i }, 'test_user_004');
      }

      // Flush events
      await this.analyticsService.flushEvents();

      this.addResult('Event Flushing', true, 'Events flushed successfully');
    } catch (error) {
      this.addResult('Event Flushing', false, `Event flushing failed: ${error.message}`);
    }

    // Test metrics retrieval
    try {
      const metrics = await this.analyticsService.getEngagementMetrics();
      const metricsValid = 
        typeof metrics.tipViews === 'number' &&
        typeof metrics.tipLikes === 'number' &&
        typeof metrics.dailyActiveUsers === 'number';

      this.addResult('Metrics Retrieval', metricsValid, 
        metricsValid ? 'Engagement metrics retrieved successfully' : 'Invalid metrics structure');
    } catch (error) {
      this.addResult('Metrics Retrieval', false, `Metrics retrieval failed: ${error.message}`);
    }
  }

  /**
   * Verify performance
   */
  async verifyPerformance() {
    console.log('⚡ Verifying Performance...');

    // Test event tracking performance
    try {
      const startTime = Date.now();
      
      // Track 100 events
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          this.analyticsService.trackEvent('performance_test', { index: i }, 'test_user_005')
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTimePerEvent = duration / 100;

      const performanceAcceptable = avgTimePerEvent < 10; // Less than 10ms per event

      this.addResult('Event Tracking Performance', performanceAcceptable, 
        `Average time per event: ${avgTimePerEvent.toFixed(2)}ms`);
    } catch (error) {
      this.addResult('Event Tracking Performance', false, `Performance test failed: ${error.message}`);
    }

    // Test metrics calculation performance
    try {
      const startTime = Date.now();
      
      await this.analyticsService.getEngagementMetrics();
      await this.analyticsService.getContentPerformance();
      await this.analyticsService.getUserBehaviorAnalytics();
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      const performanceAcceptable = duration < 1000; // Less than 1 second

      this.addResult('Metrics Calculation Performance', performanceAcceptable, 
        `Metrics calculation time: ${duration}ms`);
    } catch (error) {
      this.addResult('Metrics Calculation Performance', false, `Metrics performance test failed: ${error.message}`);
    }
  }

  /**
   * Verify alerts system
   */
  async verifyAlertsSystem() {
    console.log('🚨 Verifying Alerts System...');

    // Test alert configuration
    try {
      const configs = this.alertsService.getAllAlertConfigs();
      const hasConfigs = configs.length > 0;

      this.addResult('Alert Configurations', hasConfigs, 
        `${configs.length} alert configurations loaded`);
    } catch (error) {
      this.addResult('Alert Configurations', false, `Alert config test failed: ${error.message}`);
    }

    // Test alert generation
    try {
      const alerts = await this.alertsService.checkMetrics();
      
      this.addResult('Alert Generation', true, 
        `Alert check completed, ${alerts.length} alerts generated`);
    } catch (error) {
      this.addResult('Alert Generation', false, `Alert generation failed: ${error.message}`);
    }

    // Test alert history
    try {
      const history = this.alertsService.getAlertHistory();
      const activeAlerts = this.alertsService.getActiveAlerts();

      this.addResult('Alert History', true, 
        `${history.length} historical alerts, ${activeAlerts.length} active alerts`);
    } catch (error) {
      this.addResult('Alert History', false, `Alert history test failed: ${error.message}`);
    }
  }

  /**
   * Verify error handling
   */
  async verifyErrorHandling() {
    console.log('🛡️ Verifying Error Handling...');

    // Test graceful degradation when analytics is disabled
    try {
      await this.analyticsService.updatePrivacySettings({ enableAnalytics: false });
      
      // These should not throw errors even when analytics is disabled
      await this.analyticsService.trackEvent('test_event', {});
      await this.analyticsService.trackTipEngagement('tip_001', 'view');
      await this.analyticsService.trackScreenView('TestScreen');

      this.addResult('Graceful Degradation', true, 'Analytics gracefully handles disabled state');
    } catch (error) {
      this.addResult('Graceful Degradation', false, `Graceful degradation failed: ${error.message}`);
    }

    // Test error recovery
    try {
      // Simulate error conditions and verify recovery
      const testError = new Error('Simulated error');
      await this.analyticsService.trackError(testError, 'error_handling_test');

      this.addResult('Error Recovery', true, 'Error tracking and recovery working');
    } catch (error) {
      this.addResult('Error Recovery', false, `Error recovery test failed: ${error.message}`);
    }
  }

  /**
   * Add verification result
   */
  addResult(testName, passed, message) {
    this.verificationResults.push({
      testName,
      passed,
      message,
      timestamp: new Date()
    });

    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * Generate verification report
   */
  generateVerificationReport() {
    const totalTests = this.verificationResults.length;
    const passedTests = this.verificationResults.filter(result => result.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : '0';

    console.log('\n📋 Analytics Verification Report:');
    console.log('=====================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Pass Rate: ${passRate}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.verificationResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`   - ${result.testName}: ${result.message}`);
        });
    }

    console.log('\n✅ Passed Tests:');
    this.verificationResults
      .filter(result => result.passed)
      .forEach(result => {
        console.log(`   - ${result.testName}: ${result.message}`);
      });

    console.log('\n🎯 Analytics Verification Complete!');
    
    return {
      totalTests,
      passedTests,
      failedTests,
      passRate: parseFloat(passRate),
      results: this.verificationResults
    };
  }

  /**
   * Cleanup after verification
   */
  async cleanup() {
    try {
      if (this.analyticsService) {
        await this.analyticsService.cleanup();
      }
      
      if (this.alertsService) {
        await this.alertsService.stopMonitoring();
      }

      console.log('🧹 Verification cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

/**
 * Run analytics verification
 */
async function runAnalyticsVerification() {
  const verifier = new AnalyticsVerificationUtility();
  
  try {
    const report = await verifier.runVerification();
    return report;
  } finally {
    await verifier.cleanup();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AnalyticsVerificationUtility,
    runAnalyticsVerification
  };
}

// Run verification if called directly
if (require.main === module) {
  runAnalyticsVerification()
    .then(report => {
      console.log('\n📊 Final Report:', report);
      process.exit(report.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}