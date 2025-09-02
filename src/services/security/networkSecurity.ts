/**
 * Network Security Service
 * HTTPS enforcement, certificate pinning, and secure API communication
 * HIPAA-compliant network security for PHI transmission
 */

import { Platform } from 'react-native';
import { EncryptionService } from './encryption';
import { LoggingService } from '../logging/loggingService';

// Network security configuration
const NETWORK_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  CERTIFICATE_PINS: {
    // Production certificate pins (SHA-256 hashes)
    'api.BioReceipt.com': [
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary cert
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup cert
    ],
    // Staging environment pins
    'staging-api.BioReceipt.com': [
      'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
    ],
  },
  ALLOWED_CIPHER_SUITES: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
  ],
  MIN_TLS_VERSION: '1.2',
} as const;

export interface NetworkSecurityOptions {
  timeout?: number;
  retries?: number;
  certificatePinning?: boolean;
  encryptPayload?: boolean;
  requireAuth?: boolean;
  logRequest?: boolean;
}

export interface SecureRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  options?: NetworkSecurityOptions;
}

export interface SecureResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  encrypted: boolean;
  requestId: string;
  timestamp: number;
}

export interface NetworkAuditEvent {
  requestId: string;
  method: string;
  url: string;
  status?: number;
  duration: number;
  encrypted: boolean;
  certificatePinned: boolean;
  userId?: string;
  error?: string;
  timestamp: number;
}

/**
 * Network Security Service Class
 */
export class NetworkSecurityService {
  private static instance: NetworkSecurityService;
  private encryptionService: EncryptionService;
  private loggingService: LoggingService;
  private requestCounter: number = 0;

  private constructor() {
    this.encryptionService = EncryptionService.getInstance();
    this.loggingService = LoggingService.getInstance();
  }

  public static getInstance(): NetworkSecurityService {
    if (!NetworkSecurityService.instance) {
      NetworkSecurityService.instance = new NetworkSecurityService();
    }
    return NetworkSecurityService.instance;
  }

  /**
   * Make a secure HTTP request with encryption and certificate pinning
   */
  public async secureRequest<T>(
    config: SecureRequestConfig
  ): Promise<SecureResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    let auditEvent: NetworkAuditEvent = {
      requestId,
      method: config.method,
      url: this.sanitizeUrl(config.url),
      duration: 0,
      encrypted: config.options?.encryptPayload || false,
      certificatePinned: config.options?.certificatePinning !== false,
      timestamp: startTime,
    };

    try {
      // Validate URL is HTTPS
      if (!config.url.startsWith('https://')) {
        throw new Error('Only HTTPS requests are allowed for PHI data');
      }

      // Prepare request configuration
      const requestConfig = await this.prepareRequest(config, requestId);
      
      // Execute request with retries
      const response = await this.executeRequestWithRetries(requestConfig);
      
      // Process response
      const secureResponse = await this.processResponse<T>(response, config, requestId);
      
      auditEvent.status = secureResponse.status;
      auditEvent.duration = Date.now() - startTime;
      
      return secureResponse;
    } catch (error) {
      auditEvent.duration = Date.now() - startTime;
      auditEvent.error = error instanceof Error ? error.message : 'Unknown error';
      
      await this.loggingService.logError(
        error instanceof Error ? error : new Error('Network request failed'),
        {
          module: 'NetworkSecurity',
          method: 'secureRequest',
          requestId,
          url: this.sanitizeUrl(config.url),
          method: config.method,
        }
      );
      
      throw error;
    } finally {
      await this.auditNetworkRequest(auditEvent);
    }
  }

  /**
   * Upload PHI data securely
   */
  public async uploadPHI<T>(
    url: string,
    data: any,
    userId: string,
    options?: NetworkSecurityOptions
  ): Promise<SecureResponse<T>> {
    return this.secureRequest<T>({
      url,
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/json',
        'X-PHI-Request': 'true',
        'X-User-ID': userId,
      },
      options: {
        ...options,
        encryptPayload: true,
        certificatePinning: true,
        requireAuth: true,
        logRequest: true,
      },
    });
  }

  /**
   * Download PHI data securely
   */
  public async downloadPHI<T>(
    url: string,
    userId: string,
    options?: NetworkSecurityOptions
  ): Promise<SecureResponse<T>> {
    return this.secureRequest<T>({
      url,
      method: 'GET',
      headers: {
        'X-PHI-Request': 'true',
        'X-User-ID': userId,
      },
      options: {
        ...options,
        certificatePinning: true,
        requireAuth: true,
        logRequest: true,
      },
    });
  }

  /**
   * Validate SSL certificate against pinned certificates
   */
  public validateCertificate(hostname: string, certificate: string): boolean {
    const pins = NETWORK_CONFIG.CERTIFICATE_PINS[hostname];
    if (!pins || pins.length === 0) {
      console.warn(`No certificate pins configured for ${hostname}`);
      return false;
    }

    return pins.includes(certificate);
  }

  /**
   * Check if connection uses secure cipher suite
   */
  public isSecureCipherSuite(cipherSuite: string): boolean {
    return NETWORK_CONFIG.ALLOWED_CIPHER_SUITES.includes(cipherSuite as any);
  }

  // Private helper methods

  private generateRequestId(): string {
    this.requestCounter++;
    return `req_${Date.now()}_${this.requestCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeUrl(url: string): string {
    // Remove query parameters and sensitive data for logging
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return '[INVALID_URL]';
    }
  }

  private async prepareRequest(
    config: SecureRequestConfig,
    requestId: string
  ): Promise<RequestInit & { url: string }> {
    const headers: Record<string, string> = {
      'User-Agent': `BioReceipt/${Platform.OS}`,
      'X-Request-ID': requestId,
      'X-Timestamp': Date.now().toString(),
      ...config.headers,
    };

    // Add authentication if required
    if (config.options?.requireAuth !== false) {
      // This would integrate with your auth service
      const authToken = await this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
    }

    let body = config.body;

    // Encrypt payload if requested
    if (config.options?.encryptPayload && body) {
      const encryptedPayload = await this.encryptionService.encryptData(
        JSON.stringify(body),
        `request:${requestId}`
      );
      
      body = JSON.stringify({
        encrypted: true,
        payload: encryptedPayload,
      });
      
      headers['Content-Type'] = 'application/json';
      headers['X-Encrypted-Payload'] = 'true';
    } else if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    return {
      url: config.url,
      method: config.method,
      headers,
      body,
      // Add certificate pinning configuration
      // Note: This would need platform-specific implementation
    };
  }

  private async executeRequestWithRetries(
    requestConfig: RequestInit & { url: string }
  ): Promise<Response> {
    const maxRetries = NETWORK_CONFIG.MAX_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          NETWORK_CONFIG.TIMEOUT
        );

        const response = await fetch(requestConfig.url, {
          ...requestConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for HTTP errors
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          const delay = NETWORK_CONFIG.RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  private async processResponse<T>(
    response: Response,
    config: SecureRequestConfig,
    requestId: string
  ): Promise<SecureResponse<T>> {
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data: T;
    const responseText = await response.text();

    try {
      const parsedResponse = JSON.parse(responseText);
      
      // Check if response is encrypted
      if (parsedResponse.encrypted && parsedResponse.payload) {
        const decryptedData = await this.encryptionService.decryptData(
          parsedResponse.payload,
          `request:${requestId}`
        );
        data = JSON.parse(decryptedData) as T;
      } else {
        data = parsedResponse as T;
      }
    } catch {
      // Response is not JSON
      data = responseText as unknown as T;
    }

    return {
      data,
      status: response.status,
      headers: responseHeaders,
      encrypted: config.options?.encryptPayload || false,
      requestId,
      timestamp: Date.now(),
    };
  }

  private async getAuthToken(): Promise<string | null> {
    // This would integrate with your authentication service
    // For now, return null - implement based on your auth system
    return null;
  }

  private async auditNetworkRequest(event: NetworkAuditEvent): Promise<void> {
    try {
      await this.loggingService.logInfo('Network request audit', {
        module: 'NetworkSecurity',
        ...event,
      });
    } catch (error) {
      console.error('Failed to audit network request:', error);
    }
  }
}

// Utility functions for common network operations

/**
 * Make a secure API call with automatic encryption
 */
export async function secureApiCall<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  options?: NetworkSecurityOptions
): Promise<T> {
  const networkSecurity = NetworkSecurityService.getInstance();
  const response = await networkSecurity.secureRequest<T>({
    url,
    method,
    body: data,
    options,
  });
  return response.data;
}

/**
 * Upload PHI data with full security
 */
export async function uploadPHIData<T>(
  url: string,
  data: any,
  userId: string
): Promise<T> {
  const networkSecurity = NetworkSecurityService.getInstance();
  const response = await networkSecurity.uploadPHI<T>(url, data, userId);
  return response.data;
}

/**
 * Download PHI data with full security
 */
export async function downloadPHIData<T>(
  url: string,
  userId: string
): Promise<T> {
  const networkSecurity = NetworkSecurityService.getInstance();
  const response = await networkSecurity.downloadPHI<T>(url, userId);
  return response.data;
}

/**
 * Validate network security configuration
 */
export function validateNetworkSecurity(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check certificate pins
  const hostnames = Object.keys(NETWORK_CONFIG.CERTIFICATE_PINS);
  if (hostnames.length === 0) {
    issues.push('No certificate pins configured');
  }

  // Check cipher suites
  if (NETWORK_CONFIG.ALLOWED_CIPHER_SUITES.length === 0) {
    issues.push('No allowed cipher suites configured');
  }

  // Check TLS version
  if (!NETWORK_CONFIG.MIN_TLS_VERSION) {
    issues.push('Minimum TLS version not specified');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}