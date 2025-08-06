/**
 * Integration Test Runner
 * Orchestrates and runs all integration tests for custom substance addition
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testSuite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  success: boolean;
}

interface IntegrationTestReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  overallSuccess: boolean;
  testResults: TestResult[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

class IntegrationTestRunner {
  private testSuites = [
    {
      name: 'Custom Substance Flow',
      path: 'src/__tests__/integration/customSubstanceFlow.integration.test.tsx',
      description: 'End-to-end user flow testing with enhanced error handling'
    },
    {
      name: 'Enhanced Error Handling',
      path: 'src/__tests__/integration/enhancedErrorHandling.integration.test.tsx',
      description: 'Comprehensive error handling and recovery testing'
    },
    {
      name: 'RLS Policy Enforcement',
      path: 'src/__tests__/integration/rlsPolicyEnforcement.integration.test.ts',
      description: 'Database security policy testing'
    },
    {
      name: 'End-to-End Flow',
      path: 'src/__tests__/integration/endToEndFlow.integration.test.tsx',
      description: 'Complete user journey testing'
    },
    {
      name: 'Substance Addition Flow',
      path: 'src/__tests__/integration/substanceAdditionFlow.integration.test.ts',
      description: 'Service-level integration testing'
    }
  ];

  async runAllTests(): Promise<IntegrationTestReport> {
    console.log('🚀 Starting Integration Test Suite for Custom Substance Addition');
    console.log('=' .repeat(80));

    const startTime = Date.now();
    const testResults: TestResult[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const testSuite of this.testSuites) {
      console.log(`\n📋 Running: ${testSuite.name}`);
      console.log(`📄 Description: ${testSuite.description}`);
      console.log(`📁 Path: ${testSuite.path}`);
      console.log('-'.repeat(60));

      const result = await this.runTestSuite(testSuite.path, testSuite.name);
      testResults.push(result);

      totalPassed += result.passed;
      totalFailed += result.failed;
      totalSkipped += result.skipped;

      if (result.success) {
        console.log(`✅ ${testSuite.name}: PASSED (${result.passed} tests, ${result.duration}ms)`);
      } else {
        console.log(`❌ ${testSuite.name}: FAILED (${result.failed} failures, ${result.duration}ms)`);
      }
    }

    const totalDuration = Date.now() - startTime;
    const overallSuccess = testResults.every(result => result.success);

    // Generate coverage report
    const coverage = await this.generateCoverageReport();

    const report: IntegrationTestReport = {
      timestamp: new Date().toISOString(),
      totalTests: totalPassed + totalFailed + totalSkipped,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      overallSuccess,
      testResults,
      coverage
    };

    this.printSummary(report);
    this.saveReport(report);

    return report;
  }

  private async runTestSuite(testPath: string, suiteName: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check if test file exists
      if (!existsSync(testPath)) {
        throw new Error(`Test file not found: ${testPath}`);
      }

      // Run the specific test suite
      const command = `npx jest "${testPath}" --verbose --no-cache --testTimeout=30000`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      const result = this.parseJestOutput(output);

      return {
        testSuite: suiteName,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        duration,
        success: result.failed === 0
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Parse error output for test results
      const errorOutput = error.stdout || error.message || '';
      const result = this.parseJestOutput(errorOutput);

      return {
        testSuite: suiteName,
        passed: result.passed,
        failed: result.failed || 1, // At least 1 failure if we caught an error
        skipped: result.skipped,
        duration,
        success: false
      };
    }
  }

  private parseJestOutput(output: string): { passed: number; failed: number; skipped: number } {
    // Parse Jest output to extract test counts
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0
    };
  }

  private async generateCoverageReport(): Promise<IntegrationTestReport['coverage']> {
    try {
      // Run coverage for integration tests
      const command = 'npx jest src/__tests__/integration --coverage --coverageReporters=json-summary --silent';
      execSync(command, { stdio: 'pipe' });

      // Read coverage summary
      const coveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (existsSync(coveragePath)) {
        const coverageData = JSON.parse(require('fs').readFileSync(coveragePath, 'utf8'));
        const total = coverageData.total;

        return {
          statements: total.statements.pct,
          branches: total.branches.pct,
          functions: total.functions.pct,
          lines: total.lines.pct
        };
      }
    } catch (error) {
      console.warn('⚠️  Could not generate coverage report:', error);
    }

    return undefined;
  }

  private printSummary(report: IntegrationTestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(80));

    console.log(`⏱️  Total Duration: ${report.totalDuration}ms`);
    console.log(`📈 Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.totalPassed}`);
    console.log(`❌ Failed: ${report.totalFailed}`);
    console.log(`⏭️  Skipped: ${report.totalSkipped}`);

    if (report.coverage) {
      console.log('\n📋 Coverage Report:');
      console.log(`   Statements: ${report.coverage.statements}%`);
      console.log(`   Branches: ${report.coverage.branches}%`);
      console.log(`   Functions: ${report.coverage.functions}%`);
      console.log(`   Lines: ${report.coverage.lines}%`);
    }

    console.log('\n📝 Test Suite Results:');
    report.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.testSuite}: ${result.passed}/${result.passed + result.failed} (${result.duration}ms)`);
    });

    console.log('\n' + '='.repeat(80));
    if (report.overallSuccess) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED!');
    } else {
      console.log('💥 SOME INTEGRATION TESTS FAILED!');
    }
    console.log('='.repeat(80));
  }

  private saveReport(report: IntegrationTestReport): void {
    const reportPath = join(process.cwd(), 'integration-test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  
  runner.runAllTests()
    .then(report => {
      process.exit(report.overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Integration test runner failed:', error);
      process.exit(1);
    });
}

export { IntegrationTestRunner };
export type { IntegrationTestReport, TestResult };