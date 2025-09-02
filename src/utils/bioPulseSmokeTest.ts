/**
 * BioReceipt.AI Smoke Test
 * Comprehensive testing of core functionality after rebrand
 */

import { substanceDatabase } from '../services/substance/substanceDatabase';
import { intakeLoggingService } from '../services/substance/intakeLoggingService';
import { SubstanceCategory } from '../models/Substance';
import { loggingService } from '../services/logging/loggingService';

interface SmokeTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  error?: string;
}

interface SmokeTestSuite {
  suiteName: string;
  results: SmokeTestResult[];
  overallPassed: boolean;
  totalDuration: number;
}

class BioReceiptSmokeTest {
  private testUserId = 'smoke_test_user_' + Date.now();

  async runAllTests(): Promise<SmokeTestSuite> {
    const startTime = Date.now();
    const results: SmokeTestResult[] = [];

    console.log('🧪 Starting BioReceipt.AI Smoke Tests...');

    // Test 1: Substance Database Initialization
    results.push(await this.testSubstanceDatabaseInit());

    // Test 2: Intake Logging Service Initialization
    results.push(await this.testIntakeLoggingInit());

    // Test 3: Substance Search Functionality
    results.push(await this.testSubstanceSearch());

    // Test 4: Intake Logging Functionality
    results.push(await this.testIntakeLogging());

    // Test 5: Intake History Retrieval
    results.push(await this.testIntakeHistory());

    // Test 6: Intake Statistics
    results.push(await this.testIntakeStatistics());

    // Test 7: Data Persistence
    results.push(await this.testDataPersistence());

    // Test 8: Error Handling
    results.push(await this.testErrorHandling());

    // Test 9: Theme Constants
    results.push(await this.testThemeConstants());

    // Test 10: Service Integration
    results.push(await this.testServiceIntegration());

    const totalDuration = Date.now() - startTime;
    const overallPassed = results.every(result => result.passed);

    const suite: SmokeTestSuite = {
      suiteName: 'BioReceipt.AI Core Functionality',
      results,
      overallPassed,
      totalDuration
    };

    // Log results
    await this.logTestResults(suite);

    // Cleanup
    await this.cleanup();

    return suite;
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<void>
  ): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      return {
        testName,
        passed: true,
        message: 'Test passed successfully',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        testName,
        passed: false,
        message: 'Test failed',
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testSubstanceDatabaseInit(): Promise<SmokeTestResult> {
    return this.runTest('Substance Database Initialization', async () => {
      await substanceDatabase.initialize();
      
      const stats = substanceDatabase.getStatistics();
      if (stats.totalSubstances === 0) {
        throw new Error('No substances found in database');
      }
      
      console.log(`✅ Database initialized with ${stats.totalSubstances} substances`);
    });
  }

  private async testIntakeLoggingInit(): Promise<SmokeTestResult> {
    return this.runTest('Intake Logging Service Initialization', async () => {
      await intakeLoggingService.initialize();
      
      const config = intakeLoggingService.getConfig();
      if (!config.enableAnalysis) {
        console.warn('⚠️ Analysis is disabled in config');
      }
      
      console.log('✅ Intake logging service initialized');
    });
  }

  private async testSubstanceSearch(): Promise<SmokeTestResult> {
    return this.runTest('Substance Search Functionality', async () => {
      // Test search by name
      const beerResults = substanceDatabase.searchSubstances('beer');
      if (beerResults.length === 0) {
        throw new Error('No results found for "beer" search');
      }
      
      // Test search by category
      const alcoholResults = substanceDatabase.searchSubstances('', SubstanceCategory.ALCOHOL);
      if (alcoholResults.length === 0) {
        throw new Error('No alcohol substances found');
      }
      
      // Test popular substances
      const popular = substanceDatabase.getPopularSubstances();
      if (popular.length === 0) {
        throw new Error('No popular substances found');
      }
      
      console.log(`✅ Search working: ${beerResults.length} beer results, ${alcoholResults.length} alcohol substances`);
    });
  }

  private async testIntakeLogging(): Promise<SmokeTestResult> {
    return this.runTest('Intake Logging Functionality', async () => {
      // Get a test substance
      const substances = substanceDatabase.searchSubstances('beer');
      if (substances.length === 0) {
        throw new Error('No test substance available');
      }
      
      const testSubstance = substances[0];
      
      // Log an intake
      const intake = await intakeLoggingService.logIntake(
        this.testUserId,
        testSubstance.id,
        500,
        'ml',
        new Date(),
        'Smoke test intake'
      );
      
      if (!intake.id) {
        throw new Error('Intake was not created properly');
      }
      
      console.log(`✅ Logged intake: ${intake.quantity} ${intake.unit} of ${intake.substanceName}`);
    });
  }

  private async testIntakeHistory(): Promise<SmokeTestResult> {
    return this.runTest('Intake History Retrieval', async () => {
      const history = await intakeLoggingService.getIntakeHistory(this.testUserId);
      
      if (history.length === 0) {
        throw new Error('No intake history found');
      }
      
      const recentIntakes = await intakeLoggingService.getRecentIntakes(this.testUserId, 24);
      
      if (recentIntakes.length === 0) {
        throw new Error('No recent intakes found');
      }
      
      console.log(`✅ Retrieved ${history.length} total intakes, ${recentIntakes.length} recent`);
    });
  }

  private async testIntakeStatistics(): Promise<SmokeTestResult> {
    return this.runTest('Intake Statistics', async () => {
      const stats = await intakeLoggingService.getIntakeStatistics(this.testUserId, 7);
      
      if (stats.totalIntakes === 0) {
        throw new Error('No intake statistics generated');
      }
      
      if (typeof stats.averageIntakesPerDay !== 'number') {
        throw new Error('Invalid statistics format');
      }
      
      console.log(`✅ Statistics: ${stats.totalIntakes} intakes, ${stats.averageIntakesPerDay.toFixed(2)} avg/day`);
    });
  }

  private async testDataPersistence(): Promise<SmokeTestResult> {
    return this.runTest('Data Persistence', async () => {
      // Log another intake
      const substances = substanceDatabase.searchSubstances('caffeine');
      if (substances.length === 0) {
        throw new Error('No caffeine substance found for persistence test');
      }
      
      const intake = await intakeLoggingService.logIntake(
        this.testUserId,
        substances[0].id,
        100,
        'mg',
        new Date(),
        'Persistence test'
      );
      
      // Retrieve and verify
      const history = await intakeLoggingService.getIntakeHistory(this.testUserId);
      const foundIntake = history.find(h => h.id === intake.id);
      
      if (!foundIntake) {
        throw new Error('Intake was not persisted properly');
      }
      
      console.log('✅ Data persistence working correctly');
    });
  }

  private async testErrorHandling(): Promise<SmokeTestResult> {
    return this.runTest('Error Handling', async () => {
      try {
        // Test invalid substance ID
        await intakeLoggingService.logIntake(
          this.testUserId,
          'invalid_substance_id',
          100,
          'mg'
        );
        throw new Error('Should have thrown error for invalid substance ID');
      } catch (error) {
        if (error.message.includes('Should have thrown')) {
          throw error;
        }
        // Expected error, test passed
      }
      
      try {
        // Test invalid quantity
        const substances = substanceDatabase.searchSubstances('beer');
        await intakeLoggingService.logIntake(
          this.testUserId,
          substances[0].id,
          -100,
          'ml'
        );
        throw new Error('Should have thrown error for negative quantity');
      } catch (error) {
        if (error.message.includes('Should have thrown')) {
          throw error;
        }
        // Expected error, test passed
      }
      
      console.log('✅ Error handling working correctly');
    });
  }

  private async testThemeConstants(): Promise<SmokeTestResult> {
    return this.runTest('Theme Constants', async () => {
      const { BioReceiptTheme, BioReceiptConstants } = await import('../constants/BioReceiptTheme');
      
      if (!BioReceiptTheme.colors.primary) {
        throw new Error('Primary color not defined in theme');
      }
      
      if (BioReceiptConstants.appName !== 'BioReceipt.AI') {
        throw new Error('App name not updated to BioReceipt.AI');
      }
      
      if (!BioReceiptConstants.features.intakeLogging) {
        throw new Error('Intake logging feature not enabled');
      }
      
      console.log('✅ Theme constants properly configured');
    });
  }

  private async testServiceIntegration(): Promise<SmokeTestResult> {
    return this.runTest('Service Integration', async () => {
      // Test that services can work together
      const substances = substanceDatabase.searchSubstances('protein');
      if (substances.length === 0) {
        throw new Error('No protein substances found');
      }
      
      const intake = await intakeLoggingService.logIntake(
        this.testUserId,
        substances[0].id,
        25,
        'g'
      );
      
      // Test interaction checking
      const interactions = substanceDatabase.checkInteractions([substances[0].id]);
      
      // Test statistics after logging
      const stats = await intakeLoggingService.getIntakeStatistics(this.testUserId);
      
      if (stats.totalIntakes < 3) { // Should have at least 3 from previous tests
        throw new Error('Service integration not working properly');
      }
      
      console.log('✅ Service integration working correctly');
    });
  }

  private async logTestResults(suite: SmokeTestSuite): Promise<void> {
    try {
      await loggingService.info('BioReceipt.AI Smoke Test Results', {
        suiteName: suite.suiteName,
        overallPassed: suite.overallPassed,
        totalDuration: suite.totalDuration,
        totalTests: suite.results.length,
        passedTests: suite.results.filter(r => r.passed).length,
        failedTests: suite.results.filter(r => !r.passed).length,
        results: suite.results
      });
    } catch (error) {
      console.error('Failed to log test results:', error);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Clean up test data
      const history = await intakeLoggingService.getIntakeHistory(this.testUserId);
      for (const intake of history) {
        await intakeLoggingService.deleteIntake(this.testUserId, intake.id);
      }
      
      console.log('🧹 Test cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }

  // Utility method to run smoke test and display results
  static async runAndDisplay(): Promise<boolean> {
    const smokeTest = new BioReceiptSmokeTest();
    const results = await smokeTest.runAllTests();
    
    console.log('\n🧪 BioReceipt.AI Smoke Test Results');
    console.log('================================');
    console.log(`Suite: ${results.suiteName}`);
    console.log(`Overall: ${results.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Duration: ${results.totalDuration}ms`);
    console.log(`Tests: ${results.results.length} total, ${results.results.filter(r => r.passed).length} passed, ${results.results.filter(r => !r.passed).length} failed`);
    
    console.log('\nDetailed Results:');
    results.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.testName} (${result.duration}ms)`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (!results.overallPassed) {
      console.log('\n❌ Some tests failed. Please check the errors above.');
    } else {
      console.log('\n✅ All tests passed! BioReceipt.AI is ready to go.');
    }
    
    return results.overallPassed;
  }
}

export default BioReceiptSmokeTest;
