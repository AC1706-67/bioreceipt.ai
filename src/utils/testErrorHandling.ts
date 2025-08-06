/**
 * Error Handling Verification Script
 * Tests the comprehensive error handling implementation
 */

import { getErrorRecoveryStrategy, smartRetry, checkNetworkConnectivity } from './substanceErrorRecovery';
import { SubstanceError } from '../services/error/substanceErrorHandler';

/**
 * Test error recovery strategies
 */
export const testErrorRecoveryStrategies = () => {
  console.log('🧪 Testing Error Recovery Strategies...\n');

  const testCases: Array<{
    name: string;
    error: SubstanceError;
    expectedActions: number;
  }> = [
    {
      name: 'Network Error',
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'Unable to connect to the server',
        retryable: true,
      },
      expectedActions: 2,
    },
    {
      name: 'Duplicate Name Error',
      error: {
        code: 'DUPLICATE_NAME',
        message: 'Substance name already exists',
        userMessage: 'A substance with this name already exists',
        retryable: false,
      },
      expectedActions: 2,
    },
    {
      name: 'Validation Error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        userMessage: 'Please check the information you entered',
        retryable: false,
      },
      expectedActions: 1,
    },
    {
      name: 'Permission Denied',
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Access denied',
        userMessage: 'You don\'t have permission to perform this action',
        retryable: false,
      },
      expectedActions: 2,
    },
    {
      name: 'Rate Limited',
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        userMessage: 'You\'re making requests too quickly',
        retryable: true,
      },
      expectedActions: 1,
    },
  ];

  testCases.forEach(({ name, error, expectedActions }) => {
    console.log(`Testing ${name}:`);
    
    const strategy = getErrorRecoveryStrategy(error, {
      retryAction: () => console.log('  → Retry action called'),
      clearFormAction: () => console.log('  → Clear form action called'),
      refreshAction: () => console.log('  → Refresh action called'),
      loginAction: () => console.log('  → Login action called'),
    });

    console.log(`  Title: ${strategy.title}`);
    console.log(`  Message: ${strategy.message}`);
    console.log(`  Actions: ${strategy.actions.length} (expected: ${expectedActions})`);
    console.log(`  Toast Type: ${strategy.toastType}`);
    
    const primaryAction = strategy.actions.find(action => action.isPrimary);
    if (primaryAction) {
      console.log(`  Primary Action: ${primaryAction.label}`);
    }
    
    console.log(`  ✅ ${strategy.actions.length === expectedActions ? 'PASS' : 'FAIL'}\n`);
  });
};

/**
 * Test smart retry functionality
 */
export const testSmartRetry = async () => {
  console.log('🔄 Testing Smart Retry Functionality...\n');

  // Test successful operation
  console.log('Test 1: Successful operation');
  try {
    const result = await smartRetry(async () => {
      console.log('  → Operation executed successfully');
      return { success: true, data: 'test data' };
    }, 3, false); // Skip connectivity check for test
    
    console.log(`  Result: ${JSON.stringify(result)}`);
    console.log('  ✅ PASS\n');
  } catch (error) {
    console.log(`  ❌ FAIL: ${error}\n`);
  }

  // Test operation that fails then succeeds
  console.log('Test 2: Operation that fails then succeeds');
  let attemptCount = 0;
  try {
    const result = await smartRetry(async () => {
      attemptCount++;
      console.log(`  → Attempt ${attemptCount}`);
      
      if (attemptCount < 2) {
        throw new Error('Temporary failure');
      }
      
      return { success: true, data: 'success after retry' };
    }, 3, false);
    
    console.log(`  Result: ${JSON.stringify(result)}`);
    console.log(`  Attempts: ${attemptCount}`);
    console.log('  ✅ PASS\n');
  } catch (error) {
    console.log(`  ❌ FAIL: ${error}\n`);
  }

  // Test operation that always fails
  console.log('Test 3: Operation that always fails');
  let failAttemptCount = 0;
  try {
    await smartRetry(async () => {
      failAttemptCount++;
      console.log(`  → Attempt ${failAttemptCount}`);
      throw new Error('Persistent failure');
    }, 3, false);
    
    console.log('  ❌ FAIL: Should have thrown error\n');
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    console.log(`  Attempts: ${failAttemptCount}`);
    console.log('  ✅ PASS\n');
  }
};

/**
 * Test network connectivity checker
 */
export const testNetworkConnectivity = async () => {
  console.log('🌐 Testing Network Connectivity Checker...\n');

  try {
    console.log('Checking network connectivity...');
    const isConnected = await checkNetworkConnectivity();
    console.log(`Network Status: ${isConnected ? 'Connected' : 'Disconnected'}`);
    console.log('✅ PASS\n');
  } catch (error) {
    console.log(`❌ FAIL: ${error}\n`);
  }
};

/**
 * Run all error handling tests
 */
export const runErrorHandlingTests = async () => {
  console.log('🚀 Starting Error Handling Tests\n');
  console.log('=' .repeat(50) + '\n');

  testErrorRecoveryStrategies();
  await testSmartRetry();
  await testNetworkConnectivity();

  console.log('=' .repeat(50));
  console.log('✅ Error Handling Tests Complete');
};

// Export for use in development/testing
if (typeof window === 'undefined' && require.main === module) {
  runErrorHandlingTests().catch(console.error);
}