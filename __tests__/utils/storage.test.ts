/**
 * Unit tests for storage utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  storeData,
  getData,
  removeData,
  clearAllData,
  hasData,
  storeDataWithExpiration,
  getDataIfNotExpired,
  getStorageInfo,
} from '../../src/utils/storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock crypto
jest.mock('react-native-crypto-js', () => ({
  AES: {
    encrypt: jest.fn(data => ({ toString: () => `encrypted_${data}` })),
    decrypt: jest.fn(data => ({
      toString: () => data.replace('encrypted_', ''),
    })),
  },
  enc: {
    Utf8: {
      stringify: jest.fn(data => data),
    },
  },
}));

describe('Storage Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeData', () => {
    it('should store encrypted data successfully', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      const testData = { name: 'John', age: 30 };
      await storeData('USER_DATA', testData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user_data',
        expect.stringContaining('encrypted_'),
      );
    });

    it('should throw error if storage fails', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const testData = { name: 'John' };
      await expect(storeData('USER_DATA', testData)).rejects.toThrow(
        'Failed to store data for USER_DATA',
      );
    });
  });

  describe('getData', () => {
    it('should retrieve and decrypt data successfully', async () => {
      const testData = { name: 'John', age: 30 };
      mockAsyncStorage.getItem.mockResolvedValue(
        `encrypted_${JSON.stringify(testData)}`,
      );

      const result = await getData<typeof testData>('USER_DATA');

      expect(result).toEqual(testData);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('user_data');
    });

    it('should return null if no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getData('USER_DATA');

      expect(result).toBeNull();
    });

    it('should return null if decryption fails', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid_encrypted_data');

      const result = await getData('USER_DATA');

      expect(result).toBeNull();
    });
  });

  describe('removeData', () => {
    it('should remove data successfully', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();

      await removeData('USER_DATA');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('user_data');
    });

    it('should throw error if removal fails', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Remove error'));

      await expect(removeData('USER_DATA')).rejects.toThrow(
        'Failed to remove data for USER_DATA',
      );
    });
  });

  describe('clearAllData', () => {
    it('should clear all app data', async () => {
      mockAsyncStorage.multiRemove.mockResolvedValue();

      await clearAllData();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['user_data', 'health_tips', 'user_progress']),
      );
    });
  });

  describe('hasData', () => {
    it('should return true if data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('some_data');

      const result = await hasData('USER_DATA');

      expect(result).toBe(true);
    });

    it('should return false if no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await hasData('USER_DATA');

      expect(result).toBe(false);
    });
  });

  describe('storeDataWithExpiration', () => {
    it('should store data with expiration time', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      const testData = { name: 'John' };
      await storeDataWithExpiration('USER_DATA', testData, 60);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user_data',
        expect.stringContaining('encrypted_'),
      );
    });
  });

  describe('getDataIfNotExpired', () => {
    it('should return data if not expired', async () => {
      const futureTime = new Date().getTime() + 3600000; // 1 hour from now
      const testData = {
        data: { name: 'John' },
        expirationTime: futureTime,
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        `encrypted_${JSON.stringify(testData)}`,
      );

      const result = await getDataIfNotExpired('USER_DATA');

      expect(result).toEqual({ name: 'John' });
    });

    it('should return null and remove expired data', async () => {
      const pastTime = new Date().getTime() - 3600000; // 1 hour ago
      const testData = {
        data: { name: 'John' },
        expirationTime: pastTime,
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        `encrypted_${JSON.stringify(testData)}`,
      );
      mockAsyncStorage.removeItem.mockResolvedValue();

      const result = await getDataIfNotExpired('USER_DATA');

      expect(result).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('user_data');
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'user_data',
        'health_tips',
        'other_key',
      ]);
      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === 'user_data') return Promise.resolve('data1');
        if (key === 'health_tips') return Promise.resolve('data2');
        return Promise.resolve(null);
      });

      const result = await getStorageInfo();

      expect(result.totalKeys).toBe(2);
      expect(result.keys).toEqual(['user_data', 'health_tips']);
      expect(result.estimatedSize).toBe(10); // 'data1' + 'data2' = 10 characters
    });
  });
});
