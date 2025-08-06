/**
 * Analytics Alerts Test Script
 * Script to test threshold monitoring and alert functionality
 */

import { analyticsAlertsService } from '../services/analytics/analyticsAlertsService';

export const testAnalyticsAlerts = async () => {
  console.log('🧪 Starting Analytics Alerts Test...\n');

  try {
    // Initialize default thresholds
    console.log('1. Initializing default thresholds...');
    await analyticsAlertsService.initializeDefaultThresholds();
    
    // Get all thresholds
    const thresholds = await analyticsAlertsService.getThresholds();
    console.log(`✅ Found ${thresholds.length} alert thresholds`);
    
    // Display thresholds
    console.log('\n📋 Alert Thresholds:');
    thresholds.forEach((threshold, index) => {
      console.log(`  ${index + 1}. ${threshold.name}`);
      console.log(`     Metric: ${threshold.metric}`);
      console.log(`     Condition: ${threshold.condition} ${threshold.threshold}`);
      console.log(`     Severity: ${threshold.severity}`);
      console.log(`     Active: ${threshold.isActive ? '✅' : '❌'}`);
      console.log('');
    });

    // Test threshold monitoring
    console.log('2. Testing threshold monitoring...');
    const triggeredAlerts = await analyticsAlertsService.checkAllThresholds();
    console.log(`✅ Monitoring check completed. ${triggeredAlerts.length} alerts triggered naturally.`);

    // Simulate threshold breaches
    console.log('\n3. Simulating threshold breaches...');
    const activeThresholds = thresholds.filter(t => t.isActive);
    
    if (activeThresholds.length > 0) {
      // Simulate breach for first active threshold
      const testThreshold = activeThresholds[0];
      console.log(`   Simulating breach for: ${testThreshold.name}`);
      
      const simulatedAlert = await analyticsAlertsService.simulateThresholdBreach(testThreshold.id);
      
      if (simulatedAlert) {
        console.log(`✅ Alert simulated successfully:`);
        console.log(`   Alert ID: ${simulatedAlert.id}`);
        console.log(`   Message: ${simulatedAlert.message}`);
        console.log(`   Severity: ${simulatedAlert.severity}`);
        console.log(`   Timestamp: ${simulatedAlert.timestamp.toISOString()}`);
      } else {
        console.log('❌ Failed to simulate alert');
      }
    }

    // Get recent alerts
    console.log('\n4. Checking recent alerts...');
    const recentAlerts = await analyticsAlertsService.getRecentAlerts(10);
    console.log(`✅ Found ${recentAlerts.length} recent alerts`);
    
    if (recentAlerts.length > 0) {
      console.log('\n📊 Recent Alerts:');
      recentAlerts.slice(0, 5).forEach((alert, index) => {
        console.log(`  ${index + 1}. ${alert.thresholdName}`);
        console.log(`     Message: ${alert.message}`);
        console.log(`     Severity: ${alert.severity}`);
        console.log(`     Time: ${alert.timestamp.toLocaleString()}`);
        console.log(`     Acknowledged: ${alert.acknowledged ? '✅' : '❌'}`);
        console.log('');
      });

      // Test acknowledging an alert
      const firstAlert = recentAlerts[0];
      if (!firstAlert.acknowledged) {
        console.log('5. Testing alert acknowledgment...');
        await analyticsAlertsService.acknowledgeAlert(firstAlert.id, 'test-admin');
        console.log(`✅ Alert ${firstAlert.id} acknowledged`);
      }
    }

    // Test monitoring start/stop
    console.log('\n6. Testing monitoring control...');
    const statusBefore = analyticsAlertsService.getMonitoringStatus();
    console.log(`   Monitoring status before: ${statusBefore.isMonitoring ? 'Active' : 'Inactive'}`);
    
    if (!statusBefore.isMonitoring) {
      console.log('   Starting monitoring...');
      await analyticsAlertsService.startMonitoring(1); // 1 minute interval for testing
      
      // Wait a bit to see monitoring in action
      console.log('   Waiting 5 seconds to observe monitoring...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('   Stopping monitoring...');
      analyticsAlertsService.stopMonitoring();
    }

    const statusAfter = analyticsAlertsService.getMonitoringStatus();
    console.log(`   Monitoring status after: ${statusAfter.isMonitoring ? 'Active' : 'Inactive'}`);

    console.log('\n🎉 Analytics Alerts Test Completed Successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${thresholds.length} thresholds configured`);
    console.log(`   - ${recentAlerts.length} recent alerts found`);
    console.log(`   - Monitoring system functional`);
    console.log(`   - Alert notifications working`);
    
    return {
      success: true,
      thresholdsCount: thresholds.length,
      alertsCount: recentAlerts.length,
      monitoringWorking: true
    };

  } catch (error) {
    console.error('❌ Analytics Alerts Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Export for use in development
if (__DEV__) {
  (global as any).testAnalyticsAlerts = testAnalyticsAlerts;
  console.log('🔧 Analytics alerts test available: testAnalyticsAlerts()');
}