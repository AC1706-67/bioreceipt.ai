/**
 * Secure Storage Service
 * Provides encrypted storage functionality for sensitive data
 */

import EncryptedStorage from 'react-native-encrypted-storage';
import { EncryptionService } from './encryption';

export interface SecureStorageConfig {
  encryptionEnabled: boolean;
  keyPrefix: string;
}

export class SecureStorageService {
  private static instance: SecureStorageService;
  private encryptionService: EncryptionService;
  private config: SecureStorageConfig;

  private constructor() {
    this.encryptionService = EncryptionService.getInstance();
    this.config = {
      encryptionEnabled: true,
      keyPrefix: 'BioReceipt_secure_'
    };
  }

  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  public async setItem(key: string, value: string): Promise<void> {
    const prefixedKey = this.config.keyPrefix + key;
    
    if (this.config.encryptionEnabled) {
      const encrypted = this.encryptionService.encrypt(value, key);
      await EncryptedStorage.setItem(prefixedKey, JSON.stringify(encrypted));
    } else {
      await EncryptedStorage.setItem(prefixedKey, value);
    }
  }

  public async getItem(key: string): Promise<string | null> {
    const prefixedKey = this.config.keyPrefix + key;
    const stored = await EncryptedStorage.getItem(prefixedKey);
    
    if (!stored) {
      return null;
    }

    if (this.config.encryptionEnabled) {
      try {
        const encrypted = JSON.parse(stored);
        return this.encryptionService.decrypt(encrypted, key);
      } catch (error) {
        console.error('Failed to decrypt stored data:', error);
        return null;
      }
    }

    return stored;
  }

  public async removeItem(key: string): Promise<void> {
    const prefixedKey = this.config.keyPrefix + key;
    await EncryptedStorage.removeItem(prefixedKey);
  }

  public async clear(): Promise<void> {
    await EncryptedStorage.clear();
  }

  public async getAllKeys(): Promise<string[]> {
    const keys = await EncryptedStorage.getAllKeys();
    return keys
      .filter(key => key.startsWith(this.config.keyPrefix))
      .map(key => key.replace(this.config.keyPrefix, ''));
  }
}
