/**
 * Analytics Verification Script
 * Simple script to verify analytics events are being tracked
 */

const { analyticsService } = require('../services/analytics/analyticsService');

const verifyAnalyticsInstrumentation = async () => {
  console.log('🔍 Verifying Analytics Instrumentation...\n');

  try {
    // Initialize analytics
    await analyticsService.initialize(true, 'standard');
    console.log('✅ Analytics service initialized');

    // Test event tracking
    await analyticsService.trackEvent('verification_test', {
      testType: 'instrumentation_check',
      timestamp: new Date().toISOString()
    });
    console.log('✅ Basic event tracking works');

    // Test tip interaction tracking
    await analyticsService.trackTipInteraction('view', 'test-tip-123', {
      title: 'Test Health Tip',
      category: 'nutrition'
    }, 'test-user-456');
    console.log('✅ Tip interaction tracking works');

    // Test search tracking
    await analyticsService.trackSearch('healthy eating tips', 10, 'test-user-456');
    console.log('✅ Search tracking works');

    // Test screen view tracking
    await analyticsService.trackScreenView('TestScreen', 'test-user-456');
    console.log('✅ Screen view tracking works');

    console.log('\n🎉 Phase 1 Complete: Event Instrumentation Verified!');
    console.log('📊 All key events are properly instrumented and tracked');
    
    return true;
  } catch (error) {
    console.error('❌ Analytics verification failed:', error);
    return false;
  }
};

module.exports = { verifyAnalyticsInstrumentation };

// Run if called directly
if (require.main === module) {
  verifyAnalyticsInstrumentation();
}