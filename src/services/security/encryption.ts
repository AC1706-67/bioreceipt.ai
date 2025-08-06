/**
 * Encryption Service
 * Provides encryption and decryption functionality for sensitive data
 */

import CryptoJS from 'crypto-js';

export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  iterations: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

export class EncryptionService {
  private static instance: EncryptionService;
  private config: EncryptionConfig;

  private constructor() {
    this.config = {
      algorithm: 'AES',
      keySize: 256,
      iterations: 10000
    };
  }

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  public encrypt(data: string, password: string): EncryptedData {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: this.config.keySize/32,
      iterations: this.config.iterations
    });
    
    const iv = CryptoJS.lib.WordArray.random(128/8);
    const encrypted = CryptoJS.AES.encrypt(data, key, { 
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });

    return {
      data: encrypted.toString(),
      iv: iv.toString(),
      salt: salt.toString()
    };
  }

  public decrypt(encryptedData: EncryptedData, password: string): string {
    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: this.config.keySize/32,
      iterations: this.config.iterations
    });

    const decrypted = CryptoJS.AES.decrypt(encryptedData.data, key, { 
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  public generateKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  public hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }
}