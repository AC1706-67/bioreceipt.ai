/**
 * Wearable Integration Service
 * Unified service for connecting and managing wearable devices
 */

import {
  WearableDevice,
  BiometricReading,
  WearableDeviceType,
  DataSource,
  BiometricDataType,
  ConnectionQuality,
  SyncFrequency,
  DataQuality,
  ValidationIssue
} from '../../models/BiometricData';
import { appleHealthConnector } from './connectors/appleHealthConnector';
import { googleFitConnector } from './connectors/googleFitConnector';
import { fitbitConnector } from './connectors/fitbitConnector';
import { ouraConnector } from './connectors/ouraConnector';
import { predictiveAnalyticsEngine } from '../analytics/predictiveAnalyticsEngine';
import { loggingService } from '../logging/loggingService';

// Device Connector Interface
export interface DeviceConnector {
  deviceType: WearableDeviceType;
  isAvailable(): Promise<boolean>;
  connect(userId: string): Promise<WearableDevice>;
  disconnect(deviceId: string): Promise<void>;
  syncData(device: WearableDevice, dataTypes: BiometricDataType[]): Promise<BiometricReading[]>;
  getDeviceStatus(device: WearableDevice): Promise<ConnectionStatus>;
  validateData(readings: BiometricReading[]): Promise<ValidationResult>;
}

export interface ConnectionStatus {
  isConnected: boolean;
  quality: ConnectionQuality;
  lastSync: Date;
  batteryLevel?: number;
  signalStrength?: number;
  errors: string[];
}

export interface ValidationResult {
  validReadings: BiometricReading[];
  invalidReadings: BiometricReading[];
  issues: ValidationIssue[];
  qualityScore: number;
}

export interface SyncResult {
  deviceId: string;
  success: boolean;
  readingsCount: number;
  newReadingsCount: number;
  errors: string[];
  duration: number;
  quality: DataQuality;
}

export interface DeviceDiscoveryResult {
  availableDevices: DiscoveredDevice[];
  recommendedDevices: DiscoveredDevice[];
  compatibilityIssues: string[];
}

export interface DiscoveredDevice {
  deviceType: WearableDeviceType;
  name: string;
  isAvailable: boolean;
  capabilities: BiometricDataType[];
  estimatedSetupTime: number; // minutes
  requiresApp: boolean;
  appStoreUrl?: string;
}

class WearableIntegrationService {
  private static instance: WearableIntegrationService;
  private connectors: Map<WearableDeviceType, DeviceConnector> = new Map();
  private connectedDevices: Map<string, WearableDevice> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): WearableIntegrationService {
    if (!WearableIntegrationService.instance) {
      WearableIntegrationService.instance = new WearableIntegrationService();
    }
    return WearableIntegrationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize device connectors
      this.connectors.set(WearableDeviceType.APPLE_WATCH, appleHealthConnector);
      this.connectors.set(WearableDeviceType.GOOGLE_FIT, googleFitConnector);
      this.connectors.set(WearableDeviceType.FITBIT, fitbitConnector);
      this.connectors.set(WearableDeviceType.OURA_RING, ouraConnector);

      // Initialize predictive analytics engine
      await predictiveAnalyticsEngine.initialize();

      // Initialize each connector
      for (const [deviceType, connector] of this.connectors.entries()) {
        try {
          const isAvailable = await connector.isAvailable();
          await loggingService.info('Device connector initialized', {
            deviceType,
            available: isAvailable
          });
        } catch (error) {
          await loggingService.error('Device connector initialization failed', {
            deviceType,
            error: error.message
          });
        }
      }

      this.isInitialized = true;
      await loggingService.info('Wearable Integration Service initialized');
    } catch (error) {
      console.error('Failed to initialize wearable integration service:', error);
      throw error;
    }
  }

  /**
   * Discover available wearable devices
   */
  async discoverDevices(): Promise<DeviceDiscoveryResult> {
    const availableDevices: DiscoveredDevice[] = [];
    const compatibilityIssues: string[] = [];

    for (const [deviceType, connector] of this.connectors.entries()) {
      try {
        const isAvailable = await connector.isAvailable();
        
        if (isAvailable) {
          availableDevices.push({
            deviceType,
            name: this.getDeviceName(deviceType),
            isAvailable: true,
            capabilities: this.getDeviceCapabilities(deviceType),
            estimatedSetupTime: this.getSetupTime(deviceType),
            requiresApp: this.requiresApp(deviceType),
            appStoreUrl: this.getAppStoreUrl(deviceType)
          });
        } else {
          compatibilityIssues.push(`${this.getDeviceName(deviceType)} is not available on this platform`);
        }
      } catch (error) {
        compatibilityIssues.push(`Error checking ${this.getDeviceName(deviceType)}: ${error.message}`);
      }
    }

    // Recommend devices based on platform and capabilities
    const recommendedDevices = this.getRecommendedDevices(availableDevices);

    return {
      availableDevices,
      recommendedDevices,
      compatibilityIssues
    };
  }

  /**
   * Connect a wearable device
   */
  async connectDevice(userId: string, deviceType: WearableDeviceType): Promise<WearableDevice> {
    const connector = this.connectors.get(deviceType);
    if (!connector) {
      throw new Error(`No connector available for device type: ${deviceType}`);
    }

    try {
      await loggingService.info('Connecting device', { userId, deviceType });

      const device = await connector.connect(userId);
      this.connectedDevices.set(device.id, device);

      // Start automatic sync if enabled
      if (device.syncEnabled && device.syncFrequency !== SyncFrequency.MANUAL) {
        await this.startAutoSync(device);
      }

      await loggingService.info('Device connected successfully', {
        userId,
        deviceId: device.id,
        deviceType: device.deviceType
      });

      return device;
    } catch (error) {
      await loggingService.error('Device connection failed', {
        userId,
        deviceType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Disconnect a wearable device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const connector = this.connectors.get(device.deviceType);
    if (!connector) {
      throw new Error(`No connector available for device type: ${device.deviceType}`);
    }

    try {
      await loggingService.info('Disconnecting device', {
        deviceId,
        deviceType: device.deviceType
      });

      // Stop auto sync
      await this.stopAutoSync(deviceId);

      // Disconnect from device
      await connector.disconnect(deviceId);

      // Remove from connected devices
      this.connectedDevices.delete(deviceId);

      await loggingService.info('Device disconnected successfully', { deviceId });
    } catch (error) {
      await loggingService.error('Device disconnection failed', {
        deviceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync data from a specific device
   */
  async syncDevice(deviceId: string, dataTypes?: BiometricDataType[]): Promise<SyncResult> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const connector = this.connectors.get(device.deviceType);
    if (!connector) {
      throw new Error(`No connector available for device type: ${device.deviceType}`);
    }

    const startTime = Date.now();
    const syncDataTypes = dataTypes || device.supportedDataTypes;

    try {
      await loggingService.info('Starting device sync', {
        deviceId,
        deviceType: device.deviceType,
        dataTypes: syncDataTypes
      });

      // Sync data from device
      const readings = await connector.syncData(device, syncDataTypes);

      // Validate data quality
      const validation = await connector.validateData(readings);

      // Store valid readings
      const newReadingsCount = await this.storeReadings(validation.validReadings);

      // Update device last sync time
      device.lastSyncTime = new Date();
      this.connectedDevices.set(deviceId, device);

      const duration = Date.now() - startTime;

      const result: SyncResult = {
        deviceId,
        success: true,
        readingsCount: readings.length,
        newReadingsCount,
        errors: validation.issues.map(issue => issue.description),
        duration,
        quality: this.calculateOverallQuality(validation.validReadings)
      };

      await loggingService.info('Device sync completed', {
        deviceId,
        readingsCount: result.readingsCount,
        newReadingsCount: result.newReadingsCount,
        duration: result.duration,
        quality: result.quality
      });

      // Trigger predictive analysis if significant new data
      if (result.newReadingsCount > 5) {
        try {
          await predictiveAnalyticsEngine.generateQuickForecast(device.userId);
          await loggingService.info('Predictive analysis triggered after sync', {
            deviceId,
            userId: device.userId,
            newReadingsCount: result.newReadingsCount
          });
        } catch (error) {
          await loggingService.error('Predictive analysis failed after sync', {
            deviceId,
            error: error.message
          });
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      await loggingService.error('Device sync failed', {
        deviceId,
        error: error.message,
        duration
      });

      return {
        deviceId,
        success: false,
        readingsCount: 0,
        newReadingsCount: 0,
        errors: [error.message],
        duration,
        quality: DataQuality.INVALID
      };
    }
  }

  /**
   * Sync all connected devices
   */
  async syncAllDevices(userId: string): Promise<SyncResult[]> {
    const userDevices = Array.from(this.connectedDevices.values())
      .filter(device => device.userId === userId && device.isEnabled);

    const syncPromises = userDevices.map(device => 
      this.syncDevice(device.id).catch(error => ({
        deviceId: device.id,
        success: false,
        readingsCount: 0,
        newReadingsCount: 0,
        errors: [error.message],
        duration: 0,
        quality: DataQuality.INVALID
      }))
    );

    const results = await Promise.all(syncPromises);

    await loggingService.info('All devices sync completed', {
      userId,
      deviceCount: userDevices.length,
      successfulSyncs: results.filter(r => r.success).length,
      totalReadings: results.reduce((sum, r) => sum + r.readingsCount, 0)
    });

    return results;
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<ConnectionStatus> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const connector = this.connectors.get(device.deviceType);
    if (!connector) {
      throw new Error(`No connector available for device type: ${device.deviceType}`);
    }

    try {
      const status = await connector.getDeviceStatus(device);
      
      // Update device connection quality
      device.connectionQuality = status.quality;
      device.batteryLevel = status.batteryLevel;
      this.connectedDevices.set(deviceId, device);

      return status;
    } catch (error) {
      await loggingService.error('Failed to get device status', {
        deviceId,
        error: error.message
      });

      return {
        isConnected: false,
        quality: ConnectionQuality.DISCONNECTED,
        lastSync: device.lastSyncTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Get all connected devices for a user
   */
  getConnectedDevices(userId: string): WearableDevice[] {
    return Array.from(this.connectedDevices.values())
      .filter(device => device.userId === userId);
  }

  /**
   * Update device settings
   */
  async updateDeviceSettings(
    deviceId: string, 
    settings: Partial<WearableDevice>
  ): Promise<WearableDevice> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Update device settings
    const updatedDevice = { ...device, ...settings, lastUpdated: new Date() };
    this.connectedDevices.set(deviceId, updatedDevice);

    // Restart auto sync if sync settings changed
    if (settings.syncEnabled !== undefined || settings.syncFrequency !== undefined) {
      await this.stopAutoSync(deviceId);
      if (updatedDevice.syncEnabled && updatedDevice.syncFrequency !== SyncFrequency.MANUAL) {
        await this.startAutoSync(updatedDevice);
      }
    }

    await loggingService.info('Device settings updated', {
      deviceId,
      settings: Object.keys(settings)
    });

    return updatedDevice;
  }

  /**
   * Private helper methods
   */
  private async startAutoSync(device: WearableDevice): Promise<void> {
    const intervalMs = this.getSyncIntervalMs(device.syncFrequency);
    
    const interval = setInterval(async () => {
      try {
        await this.syncDevice(device.id);
      } catch (error) {
        await loggingService.error('Auto sync failed', {
          deviceId: device.id,
          error: error.message
        });
      }
    }, intervalMs);

    this.syncIntervals.set(device.id, interval);

    await loggingService.info('Auto sync started', {
      deviceId: device.id,
      frequency: device.syncFrequency,
      intervalMs
    });
  }

  private async stopAutoSync(deviceId: string): Promise<void> {
    const interval = this.syncIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(deviceId);
      
      await loggingService.info('Auto sync stopped', { deviceId });
    }
  }

  private getSyncIntervalMs(frequency: SyncFrequency): number {
    switch (frequency) {
      case SyncFrequency.REAL_TIME:
        return 30 * 1000; // 30 seconds
      case SyncFrequency.EVERY_5_MINUTES:
        return 5 * 60 * 1000;
      case SyncFrequency.EVERY_15_MINUTES:
        return 15 * 60 * 1000;
      case SyncFrequency.HOURLY:
        return 60 * 60 * 1000;
      case SyncFrequency.DAILY:
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // Default to hourly
    }
  }

  private async storeReadings(readings: BiometricReading[]): Promise<number> {
    // In production, this would store readings in database
    // For now, we'll simulate storage and return count of new readings
    
    let newReadingsCount = 0;
    for (const reading of readings) {
      // Simulate duplicate check and storage
      const isDuplicate = Math.random() < 0.1; // 10% chance of duplicate
      if (!isDuplicate) {
        newReadingsCount++;
      }
    }

    return newReadingsCount;
  }

  private calculateOverallQuality(readings: BiometricReading[]): DataQuality {
    if (readings.length === 0) return DataQuality.INVALID;

    const qualityScores = {
      [DataQuality.EXCELLENT]: 4,
      [DataQuality.GOOD]: 3,
      [DataQuality.FAIR]: 2,
      [DataQuality.POOR]: 1,
      [DataQuality.INVALID]: 0
    };

    const averageScore = readings.reduce((sum, reading) => 
      sum + qualityScores[reading.quality], 0) / readings.length;

    if (averageScore >= 3.5) return DataQuality.EXCELLENT;
    if (averageScore >= 2.5) return DataQuality.GOOD;
    if (averageScore >= 1.5) return DataQuality.FAIR;
    if (averageScore >= 0.5) return DataQuality.POOR;
    return DataQuality.INVALID;
  }

  private getDeviceName(deviceType: WearableDeviceType): string {
    const names = {
      [WearableDeviceType.APPLE_WATCH]: 'Apple Watch',
      [WearableDeviceType.FITBIT]: 'Fitbit',
      [WearableDeviceType.OURA_RING]: 'Oura Ring',
      [WearableDeviceType.GARMIN]: 'Garmin',
      [WearableDeviceType.SAMSUNG_HEALTH]: 'Samsung Health',
      [WearableDeviceType.GOOGLE_FIT]: 'Google Fit',
      [WearableDeviceType.MANUAL_ENTRY]: 'Manual Entry',
      [WearableDeviceType.UNKNOWN]: 'Unknown Device'
    };
    return names[deviceType] || 'Unknown Device';
  }

  private getDeviceCapabilities(deviceType: WearableDeviceType): BiometricDataType[] {
    const capabilities = {
      [WearableDeviceType.APPLE_WATCH]: [
        BiometricDataType.HEART_RATE,
        BiometricDataType.HEART_RATE_VARIABILITY,
        BiometricDataType.STEPS,
        BiometricDataType.CALORIES_BURNED,
        BiometricDataType.ACTIVE_MINUTES,
        BiometricDataType.SLEEP_DURATION
      ],
      [WearableDeviceType.FITBIT]: [
        BiometricDataType.HEART_RATE,
        BiometricDataType.STEPS,
        BiometricDataType.CALORIES_BURNED,
        BiometricDataType.SLEEP_DURATION,
        BiometricDataType.SLEEP_EFFICIENCY,
        BiometricDataType.STRESS_LEVEL
      ],
      [WearableDeviceType.OURA_RING]: [
        BiometricDataType.HEART_RATE,
        BiometricDataType.HEART_RATE_VARIABILITY,
        BiometricDataType.BODY_TEMPERATURE,
        BiometricDataType.SLEEP_DURATION,
        BiometricDataType.DEEP_SLEEP,
        BiometricDataType.REM_SLEEP,
        BiometricDataType.READINESS_SCORE,
        BiometricDataType.RECOVERY_SCORE
      ],
      [WearableDeviceType.GOOGLE_FIT]: [
        BiometricDataType.STEPS,
        BiometricDataType.CALORIES_BURNED,
        BiometricDataType.DISTANCE,
        BiometricDataType.ACTIVE_MINUTES,
        BiometricDataType.HEART_RATE
      ]
    };
    return capabilities[deviceType] || [];
  }

  private getSetupTime(deviceType: WearableDeviceType): number {
    const setupTimes = {
      [WearableDeviceType.APPLE_WATCH]: 2,
      [WearableDeviceType.FITBIT]: 5,
      [WearableDeviceType.OURA_RING]: 3,
      [WearableDeviceType.GARMIN]: 5,
      [WearableDeviceType.SAMSUNG_HEALTH]: 3,
      [WearableDeviceType.GOOGLE_FIT]: 2,
      [WearableDeviceType.MANUAL_ENTRY]: 1,
      [WearableDeviceType.UNKNOWN]: 10
    };
    return setupTimes[deviceType] || 5;
  }

  private requiresApp(deviceType: WearableDeviceType): boolean {
    return deviceType !== WearableDeviceType.MANUAL_ENTRY;
  }

  private getAppStoreUrl(deviceType: WearableDeviceType): string | undefined {
    const urls = {
      [WearableDeviceType.FITBIT]: 'https://apps.apple.com/app/fitbit/id462638897',
      [WearableDeviceType.OURA_RING]: 'https://apps.apple.com/app/oura/id1043837948',
      [WearableDeviceType.GARMIN]: 'https://apps.apple.com/app/garmin-connect/id583446403'
    };
    return urls[deviceType];
  }

  private getRecommendedDevices(availableDevices: DiscoveredDevice[]): DiscoveredDevice[] {
    // Sort by capabilities and ease of setup
    return availableDevices
      .sort((a, b) => {
        const scoreA = a.capabilities.length * 10 - a.estimatedSetupTime;
        const scoreB = b.capabilities.length * 10 - b.estimatedSetupTime;
        return scoreB - scoreA;
      })
      .slice(0, 3); // Top 3 recommendations
  }
}

export const wearableIntegrationService = WearableIntegrationService.getInstance();