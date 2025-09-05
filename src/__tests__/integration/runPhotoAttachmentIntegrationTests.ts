/**
 * Photo Attachment UI Integration Test Runner
 * Orchestrates and runs all integration tests for the photo attachment system
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
}

interface TestSuite {
  name: string;
  description: string;
  testFiles: string[];
  requirements: string[];
}

/**
 * Photo Attachment Integration Test Suites
 */
const TEST_SUITES: TestSuite[] = [
  {
    name: 'Complete Photo Capture Flow',
    description: 'Tests the entire photo capture to storage workflow',
    testFiles: [
      'photoAttachmentComplete.integration.test.tsx',
    ],
    requirements: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '2.4', '2.5'],
  },
  {
    name: 'Photo Display in Intake History',
    description: 'Tests photo display and gallery functionality in intake history',
    testFiles: [
      'photoAttachmentComplete.integration.test.tsx',
    ],
    requirements: ['3.1', '3.2', '3.3', '3.4', '3.5'],
  },
  {
    name: 'Photo Deletion and UI Updates',
    description: 'Tests photo deletion workflow and immediate UI updates',
    testFiles: [
      'photoDeletionUIUpdates.integration.test.tsx',
    ],
    requirements: ['4.1', '4.2', '4.3', '4.4', '4.5'],
  },
  {
    name: 'Offline Functionality and Sync',
    description: 'Tests offline photo queue management and synchronization',
    testFiles: [
      'offlinePhotoQueue.integration.test.ts',
      'photoAttachmentComplete.integration.test.tsx',
    ],
    requirements: ['5.1', '5.2', '5.5'],
  },
  {
    name: 'Error Scenarios and Recovery',
    description: 'Tests comprehensive error handling and recovery mechanisms',
    testFiles: [
      'photoErrorHandling.integration.test.tsx',
      'photoAttachmentComplete.integration.test.tsx',
    ],
    requirements: ['5.3', '5.4', '5.5'],
  },
  {
    name: 'Accessibility Compliance',
    description: 'Tests WCAG 2.1 AA compliance across all photo components',
    testFiles: [
      'photoAccessibilityCompliance.integration.test.tsx',
    ],
    requirements: ['All requirements - accessibility compliance'],
  },
  {
    name: 'Photo Management Utilities',
    description: 'Tests photo processing, compression, and management utilities',
    testFiles: [
      'photoManagementUtilities.integration.test.tsx',
    ],
    requirements: ['5.1', '5.2', '5.5'],
  },
];

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds per test
  retries: 2,
  coverage: {
    threshold: 80, // Minimum 80% coverage
    includePatterns: [
      'src/components/photo/**/*.tsx',
      'src/services/photo/**/*.ts',
      'src/hooks/useImagePicker.ts',
      'src/hooks/usePhotoOptimization.ts',
      'src/hooks/useOfflinePhotoQueue.ts',
      'src/utils/photoManagementUtils.ts',
      'src/features/photos/**/*.ts',
    ],
  },
  parallel: true,
  maxWorkers: 4,
};

/**
 * Photo Attachment Integration Test Runner
 */
export class PhotoAttachmentTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Photo Attachment UI Integration Tests...\n');
    
    this.startTime = Date.now();
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run test suites
      for (const suite of TEST_SUITES) {
        console.log(`📋 Running Test Suite: ${suite.name}`);
        console.log(`   Description: ${suite.description}`);
        console.log(`   Requirements: ${suite.requirements.join(', ')}\n`);
        
        await this.runTestSuite(suite);
      }
      
      // Generate comprehensive report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    } finally {
      this.endTime = Date.now();
      await this.cleanup();
    }
  }

  /**
   * Setup test environment
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    try {
      // Install test dependencies
      execSync('npm install --silent', { stdio: 'pipe' });
      
      // Setup test database
      execSync('npm run test:setup-db --silent', { stdio: 'pipe' });
      
      // Clear previous test artifacts
      const testArtifactsDir = path.join(process.cwd(), 'test-artifacts');
      if (fs.existsSync(testArtifactsDir)) {
        fs.rmSync(testArtifactsDir, { recursive: true });
      }
      fs.mkdirSync(testArtifactsDir, { recursive: true });
      
      console.log('✅ Test environment setup complete\n');
    } catch (error) {
      throw new Error(`Failed to setup test environment: ${error.message}`);
    }
  }

  /**
   * Run a specific test suite
   */
  private async runTestSuite(suite: TestSuite): Promise<void> {
    for (const testFile of suite.testFiles) {
      const testPath = path.join(__dirname, testFile);
      
      if (!fs.existsSync(testPath)) {
        console.warn(`⚠️  Test file not found: ${testFile}`);
        continue;
      }
      
      console.log(`   🧪 Running: ${testFile}`);
      
      const result = await this.runSingleTest(testFile);
      this.results.push(result);
      
      if (result.passed) {
        console.log(`   ✅ Passed (${result.duration}ms)`);
      } else {
        console.log(`   ❌ Failed (${result.duration}ms)`);
        if (result.errors) {
          result.errors.forEach(error => console.log(`      Error: ${error}`));
        }
      }
    }
    
    console.log(''); // Empty line for readability
  }

  /**
   * Run a single test file
   */
  private async runSingleTest(testFile: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const jestCommand = [
        'npx jest',
        `--testPathPattern="${testFile}"`,
        '--verbose',
        '--coverage',
        '--coverageReporters=json',
        `--testTimeout=${TEST_CONFIG.timeout}`,
        TEST_CONFIG.parallel ? `--maxWorkers=${TEST_CONFIG.maxWorkers}` : '--runInBand',
        '--silent',
      ].join(' ');
      
      const output = execSync(jestCommand, { 
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: TEST_CONFIG.timeout + 10000, // Add buffer time
      });
      
      const duration = Date.now() - startTime;
      const coverage = this.extractCoverage(output);
      
      return {
        testFile,
        passed: true,
        duration,
        coverage,
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errors = this.extractErrors(error.stdout || error.message);
      
      // Retry failed tests
      if (TEST_CONFIG.retries > 0) {
        console.log(`   🔄 Retrying ${testFile}...`);
        
        for (let retry = 1; retry <= TEST_CONFIG.retries; retry++) {
          try {
            const retryResult = await this.runSingleTest(testFile);
            if (retryResult.passed) {
              console.log(`   ✅ Passed on retry ${retry}`);
              return retryResult;
            }
          } catch (retryError) {
            if (retry === TEST_CONFIG.retries) {
              console.log(`   ❌ Failed after ${TEST_CONFIG.retries} retries`);
            }
          }
        }
      }
      
      return {
        testFile,
        passed: false,
        duration,
        errors,
      };
    }
  }

  /**
   * Extract coverage information from test output
   */
  private extractCoverage(output: string): number {
    try {
      const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
      return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Extract error messages from test output
   */
  private extractErrors(output: string): string[] {
    const errors: string[] = [];
    
    try {
      const lines = output.split('\n');
      let inErrorSection = false;
      
      for (const line of lines) {
        if (line.includes('FAIL') || line.includes('Error:') || line.includes('Failed:')) {
          inErrorSection = true;
        }
        
        if (inErrorSection && line.trim()) {
          errors.push(line.trim());
        }
        
        if (line.includes('Test Suites:') || line.includes('Tests:')) {
          inErrorSection = false;
        }
      }
    } catch {
      errors.push('Unable to parse error details');
    }
    
    return errors;
  }

  /**
   * Generate comprehensive test report
   */
  private async generateReport(): Promise<void> {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.endTime - this.startTime;
    const averageCoverage = this.results.reduce((sum, r) => sum + (r.coverage || 0), 0) / totalTests;

    console.log('\n📊 PHOTO ATTACHMENT UI INTEGRATION TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Average Coverage: ${averageCoverage.toFixed(1)}%`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('');

    // Test Suite Results
    console.log('📋 TEST SUITE RESULTS:');
    console.log('-'.repeat(40));
    
    for (const suite of TEST_SUITES) {
      const suiteResults = this.results.filter(r => 
        suite.testFiles.some(file => r.testFile.includes(file))
      );
      
      const suitePassed = suiteResults.filter(r => r.passed).length;
      const suiteTotal = suiteResults.length;
      const suiteStatus = suitePassed === suiteTotal ? '✅' : '❌';
      
      console.log(`${suiteStatus} ${suite.name}: ${suitePassed}/${suiteTotal}`);
      console.log(`   Requirements: ${suite.requirements.join(', ')}`);
      
      if (suitePassed < suiteTotal) {
        const failedFiles = suiteResults.filter(r => !r.passed);
        failedFiles.forEach(result => {
          console.log(`   ❌ ${result.testFile}`);
          if (result.errors) {
            result.errors.slice(0, 2).forEach(error => {
              console.log(`      ${error}`);
            });
          }
        });
      }
      console.log('');
    }

    // Coverage Report
    console.log('📈 COVERAGE REPORT:');
    console.log('-'.repeat(40));
    
    this.results.forEach(result => {
      const coverageStatus = (result.coverage || 0) >= TEST_CONFIG.coverage.threshold ? '✅' : '⚠️';
      console.log(`${coverageStatus} ${result.testFile}: ${(result.coverage || 0).toFixed(1)}%`);
    });
    
    console.log('');

    // Requirements Coverage
    console.log('📋 REQUIREMENTS COVERAGE:');
    console.log('-'.repeat(40));
    
    const allRequirements = new Set<string>();
    const coveredRequirements = new Set<string>();
    
    TEST_SUITES.forEach(suite => {
      suite.requirements.forEach(req => allRequirements.add(req));
      
      const suiteResults = this.results.filter(r => 
        suite.testFiles.some(file => r.testFile.includes(file))
      );
      
      if (suiteResults.every(r => r.passed)) {
        suite.requirements.forEach(req => coveredRequirements.add(req));
      }
    });
    
    const requirementsCoverage = (coveredRequirements.size / allRequirements.size) * 100;
    console.log(`Requirements Coverage: ${requirementsCoverage.toFixed(1)}%`);
    console.log(`Covered: ${coveredRequirements.size}/${allRequirements.size}`);
    
    if (coveredRequirements.size < allRequirements.size) {
      const uncoveredRequirements = Array.from(allRequirements).filter(req => 
        !coveredRequirements.has(req)
      );
      console.log(`Uncovered: ${uncoveredRequirements.join(', ')}`);
    }
    
    console.log('');

    // Save detailed report
    await this.saveDetailedReport({
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: (passedTests / totalTests) * 100,
        averageCoverage,
        totalDuration,
        requirementsCoverage,
      },
      results: this.results,
      suites: TEST_SUITES,
      timestamp: new Date().toISOString(),
    });

    // Final status
    if (failedTests === 0 && averageCoverage >= TEST_CONFIG.coverage.threshold) {
      console.log('🎉 ALL PHOTO ATTACHMENT INTEGRATION TESTS PASSED!');
      console.log('✅ Photo Attachment UI is ready for production deployment.');
    } else {
      console.log('❌ Some tests failed or coverage is below threshold.');
      console.log('🔧 Please review and fix the issues before deployment.');
      process.exit(1);
    }
  }

  /**
   * Save detailed report to file
   */
  private async saveDetailedReport(report: any): Promise<void> {
    const reportPath = path.join(process.cwd(), 'test-artifacts', 'photo-attachment-integration-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save detailed report: ${error.message}`);
    }
  }

  /**
   * Cleanup test environment
   */
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Clean up test database
      execSync('npm run test:cleanup-db --silent', { stdio: 'pipe' });
      
      // Clean up temporary files
      const tempDir = path.join(process.cwd(), 'temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.warn(`⚠️  Cleanup warning: ${error.message}`);
    }
  }
}

/**
 * Run integration tests if called directly
 */
if (require.main === module) {
  const runner = new PhotoAttachmentTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default PhotoAttachmentTestRunner;