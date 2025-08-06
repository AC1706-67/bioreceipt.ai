/**
 * Encryption Service Tests
 * Tests for HIPAA-compliant encryption functionality
 */

import { EncryptionService } from '../../../src/services/security/encryption';

// Mock crypto-js for testing
jest.mock('crypto-js', () => ({
  lib: {
    WordArray: {
      random: jest.fn(() => ({
        toString: () => 'mock-random-string',
      })),
    },
  },
  AES: {
    encrypt: jest.fn(() => ({
      toString: () => 'mock-encrypted-data',
    })),
    decrypt: jest.fn(() => ({
      toString: () => 'test-plaintext',
    })),
  },
  PBKDF2: jest.fn(() => ({
    toString: () => 'mock-derived-key',
  })),
  HmacSHA256: jest.fn(() => ({
    toString: () => 'mock-hmac',
  })),
  SHA256: jest.fn(() => ({
    toString: () => 'mock-hash',
    substring: () => 'mock-salt',
  })),
  mode: { CBC: 'CBC' },
  pad: { Pkcs7: 'Pkcs7' },
  enc: {
    Hex: {
      parse: jest.fn(() => 'mock-parsed-hex'),
    },
    Utf8: 'Utf8',
  },
  algo: { SHA256: 'SHA256' },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testPassword = 'test-master-password-123';

  beforeEach(async () => {
    encryptionService = EncryptionService.getInstance();
    await encryptionService.initialize(testPassword);
  });

  afterEach(() => {
    encryptionService.secureWipe();
  });

  describe('Initialization', () => {
    it('should initialize successfully with master password', async () => {
      const newService = EncryptionService.getInstance();
      await expect(newService.initialize(testPassword)).resolves.not.toThrow();
    });

    it('should throw error for empty master password', async () => {
      const newService = EncryptionService.getInstance();
      await expect(newService.initialize('')).rejects.toThrow();
    });

    it('should be singleton', () => {
      const service1 = EncryptionService.getInstance();
      const service2 = EncryptionService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt data successfully', async () => {
      const plaintext = 'sensitive health data';
      const result = await encryptionService.encryptData(plaintext);

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('hmac');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
      expect(result.version).toBe('1.0');
      expect(typeof result.timestamp).toBe('number');
    });

    it('should encrypt data with context', async () => {
      const plaintext = 'health data with context';
      const context = 'user-123-health-data';
      const result = await encryptionService.encryptData(plaintext, context);

      expect(result).toHaveProperty('encryptedData');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = EncryptionService.getInstance();
      uninitializedService.secureWipe(); // Clear initialization

      await expect(
        uninitializedService.encryptData('test')
      ).rejects.toThrow('Encryption service not initialized');
    });
  });

  describe('Data Decryption', () => {
    it('should decrypt data successfully', async () => {
      const plaintext = 'test decryption data';
      const encrypted = await encryptionService.encryptData(plaintext);
      const decrypted = await encryptionService.decryptData(encrypted);

      expect(decrypted).toBe('test-plaintext'); // Mocked return value
    });

    it('should decrypt data with context', async () => {
      const plaintext = 'test data with context';
      const context = 'test-context';
      const encrypted = await encryptionService.encryptData(plaintext, context);
      const decrypted = await encryptionService.decryptData(encrypted, context);

      expect(decrypted).toBe('test-plaintext');
    });

    it('should throw error for invalid version', async () => {
      const invalidInput = {
        encryptedData: 'test',
        iv: 'test',
        salt: 'test',
        hmac: 'test',
        version: '2.0', // Invalid version
        timestamp: Date.now(),
      };

      await expect(
        encryptionService.decryptData(invalidInput)
      ).rejects.toThrow('Unsupported encryption version: 2.0');
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = EncryptionService.getInstance();
      uninitializedService.secureWipe();

      const mockInput = {
        encryptedData: 'test',
        iv: 'test',
        salt: 'test',
        hmac: 'test',
        version: '1.0',
        timestamp: Date.now(),
      };

      await expect(
        uninitializedService.decryptData(mockInput)
      ).rejects.toThrow('Encryption service not initialized');
    });
  });

  describe('PHI Encryption', () => {
    it('should encrypt PHI data with user context', async () => {
      const phiData = {
        patientId: 'patient-123',
        diagnosis: 'hypertension',
        medications: ['lisinopril', 'metformin'],
      };
      const userId = 'user-123';
      const dataType = 'medical_history';

      const result = await encryptionService.encryptPHI(phiData, userId, dataType);

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('timestamp');
    });

    it('should decrypt PHI data with user context', async () => {
      const phiData = { patientId: 'test', condition: 'diabetes' };
      const userId = 'user-123';
      const dataType = 'health_data';

      const encrypted = await encryptionService.encryptPHI(phiData, userId, dataType);
      const decrypted = await encryptionService.decryptPHI(encrypted, userId, dataType);

      // Note: This will return the mocked JSON.parse result
      expect(typeof decrypted).toBe('object');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password with salt', () => {
      const password = 'user-password-123';
      const result = encryptionService.hashPassword(password);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
    });

    it('should hash password with provided salt', () => {
      const password = 'user-password-123';
      const salt = 'provided-salt';
      const result = encryptionService.hashPassword(password, salt);

      expect(result.salt).toBe(salt);
    });

    it('should verify password correctly', () => {
      const password = 'test-password';
      const { hash, salt } = encryptionService.hashPassword(password);
      const isValid = encryptionService.verifyPassword(password, hash, salt);

      expect(isValid).toBe(true);
    });

    it('should reject invalid password', () => {
      const password = 'test-password';
      const wrongPassword = 'wrong-password';
      const { hash, salt } = encryptionService.hashPassword(password);
      const isValid = encryptionService.verifyPassword(wrongPassword, hash, salt);

      expect(isValid).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should generate secure random key', () => {
      const key = encryptionService.generateSecureKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate secure random key with custom length', () => {
      const length = 16;
      const key = encryptionService.generateSecureKey(length);
      expect(typeof key).toBe('string');
    });

    it('should return encryption info', () => {
      const info = encryptionService.getEncryptionInfo();

      expect(info).toHaveProperty('algorithm');
      expect(info).toHaveProperty('keySize');
      expect(info).toHaveProperty('iterations');
      expect(info).toHaveProperty('version');
      expect(info.algorithm).toBe('AES-256');
      expect(info.keySize).toBe(256);
      expect(info.version).toBe('1.0');
    });

    it('should securely wipe data', () => {
      encryptionService.secureWipe();
      // After wipe, service should not be able to encrypt without re-initialization
      expect(async () => {
        await encryptionService.encryptData('test');
      }).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', async () => {
      // Mock crypto to throw error
      const CryptoJS = require('crypto-js');
      CryptoJS.AES.encrypt.mockImplementationOnce(() => {
        throw new Error('Encryption failed');
      });

      await expect(
        encryptionService.encryptData('test')
      ).rejects.toThrow('Data encryption failed');
    });

    it('should handle decryption errors gracefully', async () => {
      const CryptoJS = require('crypto-js');
      CryptoJS.AES.decrypt.mockImplementationOnce(() => ({
        toString: () => '', // Empty result indicates failure
      }));

      const mockInput = {
        encryptedData: 'test',
        iv: 'test',
        salt: 'test',
        hmac: 'valid-hmac',
        version: '1.0',
        timestamp: Date.now(),
      };

      await expect(
        encryptionService.decryptData(mockInput)
      ).rejects.toThrow('Data decryption failed');
    });
  });

  describe('Security Features', () => {
    it('should validate HMAC integrity', async () => {
      const mockInput = {
        encryptedData: 'test',
        iv: 'test',
        salt: 'test',
        hmac: 'invalid-hmac',
        version: '1.0',
        timestamp: Date.now(),
      };

      // Mock HMAC validation to fail
      const CryptoJS = require('crypto-js');
      CryptoJS.HmacSHA256.mockReturnValueOnce({
        toString: () => 'different-hmac',
      });

      await expect(
        encryptionService.decryptData(mockInput)
      ).rejects.toThrow('Data integrity verification failed');
    });

    it('should use proper key derivation', async () => {
      const CryptoJS = require('crypto-js');
      await encryptionService.encryptData('test');

      // Verify PBKDF2 was called with correct parameters
      expect(CryptoJS.PBKDF2).toHaveBeenCalled();
    });
  });
});