/**
 * Security Services Index
 * HIPAA-compliant security services for the Healthy Tip App
 */

// Core security services
export { EncryptionService } from './encryption';
export { SecureStorageService } from './secureStorage';
export { NetworkSecurityService } from './networkSecurity';
export { AuditService } from './auditService';
export { ConsentService } from './consentService';
export { DataRetentionService } from './dataRetentionService';

// Types and interfaces
export type {
  EncryptionResult,
  DecryptionInput,
  KeyDerivationOptions,
} from './encryption';

export type {
  PHIDataType,
  SecureStorageOptions,
  StoredData,
  StorageAuditEvent,
} from './secureStorage';

export type {
  NetworkSecurityOptions,
  SecureRequestConfig,
  SecureResponse,
  NetworkAuditEvent,
} from './networkSecurity';

export type {
  AuditEventType,
  AuditSeverity,
  AuditEvent,
  AuditQuery,
  AuditSummary,
} from './auditService';

export type {
  ConsentType,
  ConsentStatus,
  ConsentRecord,
  ConsentRequirement,
  ConsentSummary,
} from './consentService';

export type {
  DataCategory,
  RetentionPolicy,
  DataRecord,
  RetentionJob,
  RetentionReport,
} from './dataRetentionService';

// Convenience functions
export {
  encryptString,
  decryptString,
  generateSecureRandom,
  secureCompare,
  secureMemoryWipe,
} from './encryption';

export {
  storePHI,
  retrievePHI,
  removePHI,
} from './secureStorage';

export {
  secureApiCall,
  uploadPHIData,
  downloadPHIData,
  validateNetworkSecurity,
} from './networkSecurity';

export {
  auditPHIAccess,
  auditAuthEvent,
  auditConsentEvent,
  auditSecurityEvent,
} from './auditService';

export {
  hasUserConsent,
  grantUserConsent,
  withdrawUserConsent,
} from './consentService';

export {
  scheduleDataRetention,
  runDataRetention,
  generateRetentionReport,
  deleteAllUserData,
} from './dataRetentionService';

/**
 * Initialize all security services
 */
export async function initializeSecurityServices(masterPassword: string): Promise<void> {
  try {
    // Initialize encryption service
    const encryptionService = EncryptionService.getInstance();
    await encryptionService.initialize(masterPassword);

    // Initialize secure storage
    const secureStorage = SecureStorageService.getInstance();
    await secureStorage.initialize(masterPassword);

    console.log('Security services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize security services:', error);
    throw error;
  }
}

/**
 * Validate security configuration
 */
export function validateSecurityConfiguration(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Validate network security
  const networkValidation = validateNetworkSecurity();
  if (!networkValidation.valid) {
    issues.push(...networkValidation.issues.map(issue => `Network: ${issue}`));
  }

  // Add other validation checks as needed
  // This could include checking encryption settings, storage configuration, etc.

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Security health check
 */
export async function performSecurityHealthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }>;
}> {
  const checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }> = [];

  // Check encryption service
  try {
    const encryptionService = EncryptionService.getInstance();
    const testData = 'test-data';
    const encrypted = await encryptionService.encryptData(testData);
    const decrypted = await encryptionService.decryptData(encrypted);
    
    if (decrypted === testData) {
      checks.push({
        name: 'Encryption Service',
        status: 'pass',
        message: 'Encryption/decryption working correctly',
      });
    } else {
      checks.push({
        name: 'Encryption Service',
        status: 'fail',
        message: 'Encryption/decryption test failed',
      });
    }
  } catch (error) {
    checks.push({
      name: 'Encryption Service',
      status: 'fail',
      message: `Encryption service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Check secure storage
  try {
    const secureStorage = SecureStorageService.getInstance();
    const testKey = 'health-check-test';
    const testValue = { test: true, timestamp: Date.now() };
    
    await secureStorage.setItem(testKey, testValue, { encrypt: true });
    const retrieved = await secureStorage.getItem(testKey);
    await secureStorage.removeItem(testKey);
    
    if (retrieved && JSON.stringify(retrieved) === JSON.stringify(testValue)) {
      checks.push({
        name: 'Secure Storage',
        status: 'pass',
        message: 'Secure storage working correctly',
      });
    } else {
      checks.push({
        name: 'Secure Storage',
        status: 'fail',
        message: 'Secure storage test failed',
      });
    }
  } catch (error) {
    checks.push({
      name: 'Secure Storage',
      status: 'fail',
      message: `Secure storage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Check audit service
  try {
    const auditService = AuditService.getInstance();
    await auditService.logEvent(
      'system_event',
      'HEALTH_CHECK',
      'success',
      { timestamp: Date.now() },
      { severity: 'low' }
    );
    
    checks.push({
      name: 'Audit Service',
      status: 'pass',
      message: 'Audit logging working correctly',
    });
  } catch (error) {
    checks.push({
      name: 'Audit Service',
      status: 'fail',
      message: `Audit service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Determine overall status
  const failedChecks = checks.filter(check => check.status === 'fail');
  const warningChecks = checks.filter(check => check.status === 'warn');
  
  let status: 'healthy' | 'warning' | 'critical';
  if (failedChecks.length > 0) {
    status = 'critical';
  } else if (warningChecks.length > 0) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  return { status, checks };
}