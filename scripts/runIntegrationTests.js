#!/usr/bin/env node

/**
 * Integration Test Execution Script
 * Runs comprehensive integration tests for the custom substance addition feature
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader() {
  console.log(colorize('=' .repeat(80), 'cyan'));
  console.log(colorize('🧪 CUSTOM SUBSTANCE ADDITION - INTEGRATION TESTS', 'bright'));
  console.log(colorize('=' .repeat(80), 'cyan'));
  console.log();
}

function printSection(title) {
  console.log(colorize(`\n📋 ${title}`, 'blue'));
  console.log(colorize('-'.repeat(60), 'blue'));
}

async function runTestSuite(suiteName, testPath, description) {
  console.log(`\n${colorize('🔍', 'yellow')} Running: ${colorize(suiteName, 'bright')}`);
  console.log(`   ${description}`);
  console.log(`   Path: ${testPath}`);
  
  const startTime = Date.now();
  
  try {
    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      throw new Error(`Test file not found: ${testPath}`);
    }

    // Run the test suite
    const command = `npx jest "${testPath}" --verbose --no-cache --testTimeout=30000 --detectOpenHandles`;
    
    console.log(`   ${colorize('⚡', 'yellow')} Executing tests...`);
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    });

    const duration = Date.now() - startTime;
    
    // Parse Jest output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
    
    if (failed === 0) {
      console.log(`   ${colorize('✅', 'green')} PASSED: ${passed} tests (${duration}ms)`);
      return { success: true, passed, failed, skipped, duration };
    } else {
      console.log(`   ${colorize('❌', 'red')} FAILED: ${failed} failures, ${passed} passed (${duration}ms)`);
      return { success: false, passed, failed, skipped, duration };
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ${colorize('💥', 'red')} ERROR: ${error.message} (${duration}ms)`);
    
    // Try to parse error output for test results
    const errorOutput = error.stdout || error.stderr || '';
    const passedMatch = errorOutput.match(/(\d+) passed/);
    const failedMatch = errorOutput.match(/(\d+) failed/);
    const skippedMatch = errorOutput.match(/(\d+) skipped/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 1; // At least 1 failure
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
    
    return { success: false, passed, failed, skipped, duration, error: error.message };
  }
}

async function generateCoverageReport() {
  printSection('Generating Coverage Report');
  
  try {
    console.log(`   ${colorize('📊', 'yellow')} Running coverage analysis...`);
    
    const command = 'npx jest src/__tests__/integration --coverage --coverageReporters=json-summary --coverageReporters=text --silent';
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    
    // Read coverage summary
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverageData.total;
      
      console.log(`   ${colorize('📈', 'green')} Coverage Results:`);
      console.log(`      Statements: ${total.statements.pct}%`);
      console.log(`      Branches: ${total.branches.pct}%`);
      console.log(`      Functions: ${total.functions.pct}%`);
      console.log(`      Lines: ${total.lines.pct}%`);
      
      return {
        statements: total.statements.pct,
        branches: total.branches.pct,
        functions: total.functions.pct,
        lines: total.lines.pct
      };
    }
  } catch (error) {
    console.log(`   ${colorize('⚠️', 'yellow')} Could not generate coverage report: ${error.message}`);
  }
  
  return null;
}

async function runAllTests() {
  printHeader();
  
  const testSuites = [
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
      name: 'End-to-End Flow',
      path: 'src/__tests__/integration/endToEndFlow.integration.test.tsx',
      description: 'Complete user journey testing'
    },
    {
      name: 'RLS Policy Enforcement',
      path: 'src/__tests__/integration/rlsPolicyEnforcement.integration.test.ts',
      description: 'Database security policy testing'
    },
    {
      name: 'Substance Addition Flow',
      path: 'src/__tests__/integration/substanceAdditionFlow.integration.test.ts',
      description: 'Service-level integration testing'
    }
  ];
  
  const startTime = Date.now();
  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  // Run each test suite
  for (const suite of testSuites) {
    const result = await runTestSuite(suite.name, suite.path, suite.description);
    results.push({ ...result, name: suite.name });
    
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
  }
  
  // Generate coverage report
  const coverage = await generateCoverageReport();
  
  // Print summary
  const totalDuration = Date.now() - startTime;
  const overallSuccess = results.every(r => r.success);
  
  printSection('Test Summary');
  
  console.log(`   ${colorize('⏱️', 'blue')} Total Duration: ${totalDuration}ms`);
  console.log(`   ${colorize('📊', 'blue')} Total Tests: ${totalPassed + totalFailed + totalSkipped}`);
  console.log(`   ${colorize('✅', 'green')} Passed: ${totalPassed}`);
  console.log(`   ${colorize('❌', 'red')} Failed: ${totalFailed}`);
  console.log(`   ${colorize('⏭️', 'yellow')} Skipped: ${totalSkipped}`);
  
  console.log(`\n   ${colorize('📝', 'blue')} Test Suite Results:`);
  results.forEach(result => {
    const status = result.success ? colorize('✅', 'green') : colorize('❌', 'red');
    const ratio = `${result.passed}/${result.passed + result.failed}`;
    console.log(`      ${status} ${result.name}: ${ratio} (${result.duration}ms)`);
    
    if (result.error) {
      console.log(`         ${colorize('💥', 'red')} Error: ${result.error}`);
    }
  });
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: totalPassed + totalFailed + totalSkipped,
    totalPassed,
    totalFailed,
    totalSkipped,
    totalDuration,
    overallSuccess,
    testResults: results,
    coverage
  };
  
  const reportPath = path.join(process.cwd(), 'integration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n   ${colorize('📄', 'blue')} Detailed report saved to: ${reportPath}`);
  
  // Final result
  console.log(colorize('\n' + '='.repeat(80), 'cyan'));
  if (overallSuccess) {
    console.log(colorize('🎉 ALL INTEGRATION TESTS PASSED!', 'green'));
  } else {
    console.log(colorize('💥 SOME INTEGRATION TESTS FAILED!', 'red'));
  }
  console.log(colorize('='.repeat(80), 'cyan'));
  
  return overallSuccess;
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(colorize(`💥 Integration test runner failed: ${error.message}`, 'red'));
      process.exit(1);
    });
}

module.exports = { runAllTests };