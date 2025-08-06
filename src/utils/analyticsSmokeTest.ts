/**
 * Analytics Smoke Test
 * Simple script to verify analytics events are working in development
 */

import { analyticsService } from '../services/analytics/analyticsService';

export const runAnalyticsSmokeTest = async () => {
  console.log('🔍 Starting Analytics Smoke Test...');
  
  try {
    // Initialize analytics
    await analyticsService.initialize(true, 'standard');
    console.log('✅ Analytics initialized');

    // Test basic event tracking
    await analyticsService.trackEvent('smoke_test_start', {
      testId: 'smoke_test_' + Date.now(),
      environment: 'development'
    });
    console.log('✅ Basic event tracked');

    // Test tip interaction tracking
    await analyticsService.trackTipInteraction('view', 'test-tip-123', {
      title: 'Test Health Tip',
      category: 'nutrition'
    }, 'test-user-456');
    console.log('✅ Tip interaction tracked');

    // Test search tracking
    await analyticsService.trackSearch('healthy eating', 5, 'test-user-456');
    console.log('✅ Search event tracked');

    // Test screen view tracking
    await analyticsService.trackScreenView('SmokeTestScreen', 'test-user-456');
    console.log('✅ Screen view tracked');

    // Test performance tracking
    await analyticsService.trackPerformance('smoke_test_duration', 100, {
      testType: 'automated'
    });
    console.log('✅ Performance metric tracked');

    // Test session tracking
    await analyticsService.trackSessionEnd('test-user-456');
    console.log('✅ Session end tracked');

    // Test error tracking
    await analyticsService.trackEvent('error_occurred', {
      errorMessage: 'Test error for smoke test',
      context: 'smoke_test',
      userId: 'test-user-456'
    });
    console.log('✅ Error event tracked');

    console.log('🎉 Analytics Smoke Test Completed Successfully!');
    console.log('📊 Check the console logs above to verify events were tracked');
    
    return {
      success: true,
      message: 'All analytics events tracked successfully'
    };

  } catch (error) {
    console.error('❌ Analytics Smoke Test Failed:', error);
    return {
      success: false,
      message: `Smoke test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Export for use in development
if (__DEV__) {
  (global as any).runAnalyticsSmokeTest = runAnalyticsSmokeTest;
  console.log('🔧 Analytics smoke test available: runAnalyticsSmokeTest()');
}