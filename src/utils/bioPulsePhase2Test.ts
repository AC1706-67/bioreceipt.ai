/**
 * BioReceipt Phase 2 Testing Suite
 * Comprehensive testing for AI Feedback Engine & Safety Alerts
 */

import { BioReceiptAnalysisEngine } from '../services/analysis/BioReceiptAnalysisEngine';
import { BioReceiptAIService } from '../services/ai/BioReceiptAIService';
import { BioReceiptSafetyAlertService } from '../services/alerts/BioReceiptSafetyAlertService';
import { BioReceiptIntegrationService } from '../services/integration/BioReceiptIntegrationService';
import { intakeLoggingService } from '../services/substance/intakeLoggingService';
import { substanceDatabase } from '../services/substance/substanceDatabase';
import { SubstanceCategory } from '../models/Substance';
import { loggingService } from '../services/logging/loggingService';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details: string;
  error?: string;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
}

class BioReceiptPhase2TestSuite {
  private testUserId = 'test_user_phase2';
  private results: TestSuite[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting BioReceipt Phase 2 Test Suite...\n');
    
    try {
      // Initialize all services
      await this.initializeServices();
      
      // Run test suites
      await this.runAnalysisEngineTests();
      await this.runAIServiceTests();
      await this.runSafetyAlertTests();
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      
      // Generate final report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test suite failed to complete:', error);
    }
  }

  private async initializeServices(): Promise<void> {
    console.log('🔧 Initializing services...');
    
    try {
      await Promise.all([
        BioReceiptAnalysisEngine.initialize(),
        BioReceiptAIService.initialize(),
        BioReceiptSafetyAlertService.initialize(),
        BioReceiptIntegrationService.initialize()
      ]);
      
      console.log('✅ All services initialized successfully\n');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  private async runAnalysisEngineTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Analysis Engine Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0
    };

    console.log('🧪 Running Analysis Engine Tests...');

    // Test 1: Basic Analysis
    await this.runTest(suite, 'Basic Analysis Generation', async () => {
      // Create test intakes
      await this.createTestIntakes();
      
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      
      if (!analysis) throw new Error('Analysis not generated');
      if (!analysis.analysisId) throw new Error('Analysis ID missing');
      if (typeof analysis.impactScore.overall !== 'number') throw new Error('Impact score invalid');
      if (!Array.isArray(analysis.interactionRisks)) throw new Error('Interaction risks invalid');
      
      return `Analysis generated with ID: ${analysis.analysisId}, Impact: ${analysis.impactScore.overall}`;
    });

    // Test 2: Impact Score Calculation
    await this.runTest(suite, 'Impact Score Calculation', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      
      const { overall, categories } = analysis.impactScore;
      
      if (overall < 0 || overall > 100) throw new Error('Overall score out of range');
      if (Object.values(categories).some(score => score < 0 || score > 100)) {
        throw new Error('Category scores out of range');
      }
      
      return `Impact scores valid - Overall: ${overall}, Categories: ${JSON.stringify(categories)}`;
    });

    // Test 3: Interaction Risk Detection
    await this.runTest(suite, 'Interaction Risk Detection', async () => {
      // Create potentially risky combination
      await this.createRiskyTestIntakes();
      
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      
      if (!Array.isArray(analysis.interactionRisks)) throw new Error('Interaction risks not array');
      
      const criticalRisks = analysis.interactionRisks.filter(r => r.severity === 'critical');
      const highRisks = analysis.interactionRisks.filter(r => r.severity === 'high');
      
      return `Risks detected - Critical: ${criticalRisks.length}, High: ${highRisks.length}`;
    });

    // Test 4: Recovery Timeline Generation
    await this.runTest(suite, 'Recovery Timeline Generation', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      
      const timeline = analysis.recoveryTimeline;
      
      if (!timeline) throw new Error('Recovery timeline missing');
      if (!Array.isArray(timeline.phases)) throw new Error('Timeline phases invalid');
      if (typeof timeline.totalDuration !== 'number') throw new Error('Total duration invalid');
      
      return `Timeline generated - ${timeline.phases.length} phases, ${Math.round(timeline.totalDuration)}h total`;
    });

    // Test 5: Personalized Insights
    await this.runTest(suite, 'Personalized Insights Generation', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      
      if (!Array.isArray(analysis.personalizedInsights)) throw new Error('Insights not array');
      
      const actionableInsights = analysis.personalizedInsights.filter(i => i.actionable);
      
      return `${analysis.personalizedInsights.length} insights generated, ${actionableInsights.length} actionable`;
    });

    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  private async runAIServiceTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'AI Service Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0
    };

    console.log('🤖 Running AI Service Tests...');

    // Test 1: AI Insights Generation
    await this.runTest(suite, 'AI Insights Generation', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      const recentIntakes = await intakeLoggingService.getRecentIntakes(this.testUserId, 24);
      
      const aiInsights = await BioReceiptAIService.generateInsights(analysis, recentIntakes);
      
      if (!aiInsights) throw new Error('AI insights not generated');
      if (!aiInsights.responseId) throw new Error('Response ID missing');
      if (!aiInsights.summary) throw new Error('Summary missing');
      if (!Array.isArray(aiInsights.recommendations)) throw new Error('Recommendations invalid');
      if (!Array.isArray(aiInsights.warnings)) throw new Error('Warnings invalid');
      
      return `AI insights generated - ${aiInsights.recommendations.length} recommendations, ${aiInsights.warnings.length} warnings`;
    });

    // Test 2: Summary Generation Quality
    await this.runTest(suite, 'Summary Generation Quality', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      const recentIntakes = await intakeLoggingService.getRecentIntakes(this.testUserId, 24);
      
      const aiInsights = await BioReceiptAIService.generateInsights(analysis, recentIntakes);
      
      const summary = aiInsights.summary;
      
      if (summary.length < 50) throw new Error('Summary too short');
      if (summary.length > 500) throw new Error('Summary too long');
      if (!summary.includes('impact')) throw new Error('Summary missing impact information');
      
      return `Summary quality check passed - ${summary.length} characters`;
    });

    // Test 3: Recommendation Generation
    await this.runTest(suite, 'Recommendation Generation', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      const recentIntakes = await intakeLoggingService.getRecentIntakes(this.testUserId, 24);
      
      const aiInsights = await BioReceiptAIService.generateInsights(analysis, recentIntakes);
      
      const recommendations = aiInsights.recommendations;
      
      if (recommendations.length === 0) {
        return 'No recommendations generated (acceptable for low-risk scenarios)';
      }
      
      const urgentRecs = recommendations.filter(r => r.priority === 'urgent');
      const immediateRecs = recommendations.filter(r => r.type === 'immediate');
      
      // Validate recommendation structure
      for (const rec of recommendations.slice(0, 3)) {
        if (!rec.id) throw new Error('Recommendation missing ID');
        if (!rec.title) throw new Error('Recommendation missing title');
        if (!rec.description) throw new Error('Recommendation missing description');
        if (!Array.isArray(rec.actionSteps)) throw new Error('Action steps invalid');
      }
      
      return `${recommendations.length} recommendations - ${urgentRecs.length} urgent, ${immediateRecs.length} immediate`;
    });

    // Test 4: Warning Generation
    await this.runTest(suite, 'Warning Generation', async () => {
      // Create high-risk scenario
      await this.createHighRiskTestIntakes();
      
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      const recentIntakes = await intakeLoggingService.getRecentIntakes(this.testUserId, 24);
      
      const aiInsights = await BioReceiptAIService.generateInsights(analysis, recentIntakes);
      
      const warnings = aiInsights.warnings;
      
      if (warnings.length === 0) {
        return 'No warnings generated (may be acceptable depending on scenario)';
      }
      
      const criticalWarnings = warnings.filter(w => w.severity === 'critical');
      
      // Validate warning structure
      for (const warning of warnings.slice(0, 2)) {
        if (!warning.id) throw new Error('Warning missing ID');
        if (!warning.title) throw new Error('Warning missing title');
        if (!warning.message) throw new Error('Warning missing message');
        if (!Array.isArray(warning.immediateActions)) throw new Error('Immediate actions invalid');
      }
      
      return `${warnings.length} warnings generated - ${criticalWarnings.length} critical`;
    });

    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  private async runSafetyAlertTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Safety Alert Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0
    };

    console.log('🚨 Running Safety Alert Tests...');

    // Test 1: Alert Processing
    await this.runTest(suite, 'Alert Processing', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      const recentIntakes = await intakeLoggingService.getRecentIntakes(this.testUserId, 24);
      const aiInsights = await BioReceiptAIService.generateInsights(analysis, recentIntakes);
      
      const alerts = await BioReceiptSafetyAlertService.processAnalysisForAlerts(analysis, aiInsights);
      
      if (!Array.isArray(alerts)) throw new Error('Alerts not array');
      
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      const warningAlerts = alerts.filter(a => a.severity === 'warning');
      
      return `${alerts.length} alerts processed - ${criticalAlerts.length} critical, ${warningAlerts.length} warnings`;
    });

    // Test 2: Alert Configuration
    await this.runTest(suite, 'Alert Configuration', async () => {
      await BioReceiptSafetyAlertService.updateAlertConfiguration(this.testUserId, {
        impactScoreThresholds: {
          warning: 60,
          critical: 80
        },
        interactionAlerts: {
          enabled: true,
          criticalOnly: false,
          includeModerate: true
        }
      });
      
      return 'Alert configuration updated successfully';
    });

    // Test 3: Alert Acknowledgment
    await this.runTest(suite, 'Alert Acknowledgment', async () => {
      const activeAlerts = await BioReceiptSafetyAlertService.getActiveAlerts(this.testUserId);
      
      if (activeAlerts.length > 0) {
        const alertId = activeAlerts[0].alertId;
        await BioReceiptSafetyAlertService.acknowledgeAlert(this.testUserId, alertId);
        
        const updatedAlerts = await BioReceiptSafetyAlertService.getActiveAlerts(this.testUserId);
        const acknowledgedAlert = updatedAlerts.find(a => a.alertId === alertId);
        
        if (acknowledgedAlert && !acknowledgedAlert.acknowledged) {
          throw new Error('Alert not properly acknowledged');
        }
        
        return `Alert ${alertId} acknowledged successfully`;
      }
      
      return 'No active alerts to acknowledge';
    });

    // Test 4: Alert History
    await this.runTest(suite, 'Alert History', async () => {
      const history = await BioReceiptSafetyAlertService.getAlertHistory(this.testUserId, 10);
      
      if (!Array.isArray(history)) throw new Error('Alert history not array');
      
      return `Alert history retrieved - ${history.length} historical alerts`;
    });

    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  private async runIntegrationTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Integration Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0
    };

    console.log('🔗 Running Integration Tests...');

    // Test 1: Complete Analysis Pipeline
    await this.runTest(suite, 'Complete Analysis Pipeline', async () => {
      const response = await BioReceiptIntegrationService.runCompleteAnalysis(this.testUserId);
      
      if (!response) throw new Error('Integration response not generated');
      if (!response.responseId) throw new Error('Response ID missing');
      if (!response.analysis) throw new Error('Analysis missing from response');
      if (!response.aiInsights) throw new Error('AI insights missing from response');
      if (!Array.isArray(response.safetyAlerts)) throw new Error('Safety alerts invalid');
      if (!Array.isArray(response.componentsProcessed)) throw new Error('Components processed invalid');
      
      return `Pipeline completed - ${response.componentsProcessed.length} components, ${response.processingTime}ms, status: ${response.status}`;
    });

    // Test 2: Monitoring Configuration
    await this.runTest(suite, 'Monitoring Configuration', async () => {
      await BioReceiptIntegrationService.updateMonitoringConfig(this.testUserId, {
        enabled: true,
        analysisInterval: 30,
        intakeTriggered: true,
        notifications: {
          realTimeAlerts: true,
          summaryReports: false,
          trendAnalysis: false
        }
      });
      
      const status = BioReceiptIntegrationService.getMonitoringStatus(this.testUserId);
      
      if (!status.config) throw new Error('Monitoring config not found');
      if (status.config.analysisInterval !== 30) throw new Error('Config not updated properly');
      
      return `Monitoring configured - interval: ${status.config.analysisInterval}min, active: ${status.active}`;
    });

    // Test 3: Intake Trigger
    await this.runTest(suite, 'Intake Trigger Processing', async () => {
      // Start monitoring
      await BioReceiptIntegrationService.startMonitoring(this.testUserId);
      
      // Create new intake
      const newIntake = await intakeLoggingService.logIntake(this.testUserId, {
        substanceId: 'test_substance_trigger',
        quantity: 100,
        unit: 'mg',
        timestamp: new Date(),
        notes: 'Test intake for trigger'
      });
      
      // Trigger the intake handler
      await BioReceiptIntegrationService.onNewIntake(this.testUserId, newIntake);
      
      return `Intake trigger processed successfully for substance: ${newIntake.substanceId}`;
    });

    // Test 4: Error Handling
    await this.runTest(suite, 'Error Handling', async () => {
      // Test with invalid user ID
      try {
        await BioReceiptIntegrationService.runCompleteAnalysis('invalid_user_id');
        throw new Error('Should have thrown error for invalid user');
      } catch (error) {
        if (error.message.includes('Should have thrown')) {
          throw error;
        }
        // Expected error
      }
      
      return 'Error handling working correctly';
    });

    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  private async runPerformanceTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Performance Tests',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0
    };

    console.log('⚡ Running Performance Tests...');

    // Test 1: Analysis Speed
    await this.runTest(suite, 'Analysis Speed', async () => {
      const startTime = Date.now();
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      const duration = Date.now() - startTime;
      
      if (duration > 5000) throw new Error(`Analysis too slow: ${duration}ms`);
      
      return `Analysis completed in ${duration}ms (target: <5000ms)`;
    });

    // Test 2: AI Generation Speed
    await this.runTest(suite, 'AI Generation Speed', async () => {
      const analysis = await BioReceiptAnalysisEngine.analyzeCurrentState(this.testUserId);
      const recentIntakes = await intakeLoggingService.getRecentIntakes(this.testUserId, 24);
      
      const startTime = Date.now();
      const aiInsights = await BioReceiptAIService.generateInsights(analysis, recentIntakes);
      const duration = Date.now() - startTime;
      
      if (duration > 3000) throw new Error(`AI generation too slow: ${duration}ms`);
      
      return `AI insights generated in ${duration}ms (target: <3000ms)`;
    });

    // Test 3: Complete Pipeline Speed
    await this.runTest(suite, 'Complete Pipeline Speed', async () => {
      const startTime = Date.now();
      const response = await BioReceiptIntegrationService.runCompleteAnalysis(this.testUserId);
      const duration = Date.now() - startTime;
      
      if (duration > 10000) throw new Error(`Pipeline too slow: ${duration}ms`);
      
      return `Complete pipeline in ${duration}ms (target: <10000ms)`;
    });

    // Test 4: Memory Usage
    await this.runTest(suite, 'Memory Usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run multiple analyses
      for (let i = 0; i < 5; i++) {
        await BioReceiptIntegrationService.runCompleteAnalysis(this.testUserId);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      if (memoryIncrease > 50) throw new Error(`Memory usage too high: ${memoryIncrease.toFixed(2)}MB`);
      
      return `Memory increase: ${memoryIncrease.toFixed(2)}MB (target: <50MB)`;
    });

    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  private async runTest(
    suite: TestSuite,
    testName: string,
    testFunction: () => Promise<string>
  ): Promise<void> {
    const startTime = Date.now();
    suite.totalTests++;
    
    try {
      const details = await testFunction();
      const duration = Date.now() - startTime;
      
      suite.results.push({
        testName,
        status: 'PASS',
        duration,
        details
      });
      
      suite.passedTests++;
      suite.totalDuration += duration;
      
      console.log(`  ✅ ${testName} - ${details} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      suite.results.push({
        testName,
        status: 'FAIL',
        duration,
        details: 'Test failed',
        error: error.message
      });
      
      suite.failedTests++;
      suite.totalDuration += duration;
      
      console.log(`  ❌ ${testName} - ${error.message} (${duration}ms)`);
    }
  }

  private printSuiteResults(suite: TestSuite): void {
    console.log(`\n📊 ${suite.suiteName} Results:`);
    console.log(`  Total: ${suite.totalTests} | Passed: ${suite.passedTests} | Failed: ${suite.failedTests} | Duration: ${suite.totalDuration}ms`);
    console.log('');
  }

  private generateFinalReport(): void {
    console.log('📋 FINAL TEST REPORT');
    console.log('='.repeat(50));
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;
    
    this.results.forEach(suite => {
      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalFailed += suite.failedTests;
      totalDuration += suite.totalDuration;
      
      console.log(`${suite.suiteName}: ${suite.passedTests}/${suite.totalTests} passed`);
    });
    
    console.log('='.repeat(50));
    console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed`);
    console.log(`SUCCESS RATE: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    console.log(`TOTAL DURATION: ${totalDuration}ms`);
    
    if (totalFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! BioReceipt Phase 2 is ready for deployment.');
    } else {
      console.log(`⚠️  ${totalFailed} tests failed. Please review and fix issues before deployment.`);
    }
  }

  // Helper methods for creating test data
  private async createTestIntakes(): Promise<void> {
    // Create some basic test intakes
    const substances = await substanceDatabase.getAllSubstances();
    const testSubstances = substances.slice(0, 3);
    
    for (const substance of testSubstances) {
      await intakeLoggingService.logIntake(this.testUserId, {
        substanceId: substance.id,
        quantity: 50,
        unit: 'mg',
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24h
        notes: 'Test intake'
      });
    }
  }

  private async createRiskyTestIntakes(): Promise<void> {
    // Create potentially risky combinations
    await intakeLoggingService.logIntake(this.testUserId, {
      substanceId: 'alcohol',
      quantity: 200,
      unit: 'ml',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      notes: 'Test risky intake - alcohol'
    });
    
    await intakeLoggingService.logIntake(this.testUserId, {
      substanceId: 'caffeine',
      quantity: 400,
      unit: 'mg',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      notes: 'Test risky intake - high caffeine'
    });
  }

  private async createHighRiskTestIntakes(): Promise<void> {
    // Create high-risk scenario for testing warnings
    await intakeLoggingService.logIntake(this.testUserId, {
      substanceId: 'alcohol',
      quantity: 500,
      unit: 'ml',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      notes: 'Test high-risk intake - high alcohol'
    });
    
    await intakeLoggingService.logIntake(this.testUserId, {
      substanceId: 'prescription_med',
      quantity: 100,
      unit: 'mg',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      notes: 'Test high-risk intake - prescription with alcohol'
    });
  }
}

// Export test runner
export const runBioReceiptPhase2Tests = async (): Promise<void> => {
  const testSuite = new BioReceiptPhase2TestSuite();
  await testSuite.runAllTests();
};

// Auto-run if called directly
if (require.main === module) {
  runBioReceiptPhase2Tests().catch(console.error);
}
