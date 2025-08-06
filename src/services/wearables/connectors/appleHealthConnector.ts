/**
 * Apple Health Connector
 * Integration with Apple HealthKit for iOS devices
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
  ValidationIssue,
  ValidationIssueType,
  IssueSeverity
} from '../../../models/BiometricData';
import { DeviceConnector, ConnectionStatus, ValidationResult } from '../wearableIntegrationService';
import { Platform } from 'react-native';

// Apple HealthKit types (would be imported from react-native-health in production)
interface HealthKitPermissions {
  permissions: {
    read: HealthKitDataType[];
    write?: HealthKitDataType[];
  };
}

enum HealthKitDataType {
  HeartRate = 'HeartRate',
  HeartRateVariability = 'HeartRateVariabilitySDNN',
  Steps = 'StepCount',
  DistanceWalkingRunning = 'DistanceWalkingRunning',
  ActiveEnergyBurned = 'ActiveEnergyBurned',
  AppleExerciseTime = 'AppleExerciseTime',
  SleepAnalysis = 'SleepAnalysis',
  RestingHeartRate = 'RestingHeartRate',
  BloodPressureSystolic = 'BloodPressureSystolic',
  BloodPressureDiastolic = 'BloodPressureDiastolic',
  BodyTemperature = 'BodyTemperature',
  RespiratoryRate = 'RespiratoryRate',
  OxygenSaturation = 'OxygenSaturation',
  BodyMass = 'BodyMass',
  BodyFatPercentage = 'BodyFatPercentage'
}

interface HealthKitSample {
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  metadata?: Record<string, any>;
}

class AppleHealthConnector implements DeviceConnector {
  deviceType = WearableDeviceType.APPLE_WATCH;
  private healthKit: any; // Would be AppleHealthKit instance
  private isHealthKitAvailable = false;

  constructor() {
    this.initializeHealthKit();
  }

  private async initializeHealthKit(): Promise<void> {
    try {
      // In production, this would import and initialize react-native-health
      // For now, we'll simulate the availability check
      this.isHealthKitAvailable = Platform.OS === 'ios';
      
      if (this.isHealthKitAvailable) {
        // Simulate HealthKit initialization
        this.healthKit = {
          isAvailable: () => Promise.resolve(true),
          initHealthKit: (permissions: HealthKitPermissions) => Promise.resolve(true),
          getSamples: (dataType: HealthKitDataType, options: any) => Promise.resolve([]),
          getLatestWeight: () => Promise.resolve({ value: 70, unit: 'kg' }),
          isAuthorized: (dataType: HealthKitDataType) => Promise.resolve(true)
        };
      }
    } catch (error) {
      console.error('Failed to initialize Apple HealthKit:', error);
      this.isHealthKitAvailable = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isHealthKitAvailable) return false;
    
    try {
      return await this.healthKit.isAvailable();
    } catch (error) {
      return false;
    }
  }

  async connect(userId: string): Promise<WearableDevice> {
    if (!this.isHealthKitAvailable) {
      throw new Error('Apple HealthKit is not available on this device');
    }

    try {
      // Request permissions for health data
      const permissions: HealthKitPermissions = {
        permissions: {
          read: [
            HealthKitDataType.HeartRate,
            HealthKitDataType.HeartRateVariability,
            HealthKitDataType.Steps,
            HealthKitDataType.DistanceWalkingRunning,
            HealthKitDataType.ActiveEnergyBurned,
            HealthKitDataType.AppleExerciseTime,
            HealthKitDataType.SleepAnalysis,
            HealthKitDataType.RestingHeartRate,
            HealthKitDataType.BloodPressureSystolic,
            HealthKitDataType.BloodPressureDiastolic,
            HealthKitDataType.BodyTemperature,
            HealthKitDataType.RespiratoryRate,
            HealthKitDataType.OxygenSaturation,
            HealthKitDataType.BodyMass,
            HealthKitDataType.BodyFatPercentage
          ]
        }
      };

      const initialized = await this.healthKit.initHealthKit(permissions);
      if (!initialized) {
        throw new Error('Failed to initialize HealthKit permissions');
      }

      // Create device record
      const device: WearableDevice = {
        id: `apple_health_${userId}_${Date.now()}`,
        userId,
        deviceType: WearableDeviceType.APPLE_WATCH,
        deviceName: 'Apple Health',
        model: await this.getDeviceModel(),
        
        // Connection status
        isConnected: true,
        lastSyncTime: new Date(),
        connectionQuality: ConnectionQuality.EXCELLENT,
        
        // Data capabilities
        supportedDataTypes: this.getSupportedDataTypes(),
        syncFrequency: SyncFrequency.HOURLY,
        dataRetentionDays: 730, // 2 years
        
        // Settings
        isEnabled: true,
        syncEnabled: true,
        notificationsEnabled: true,
        
        // Metadata
        addedDate: new Date(),
        lastUpdated: new Date(),
        firmwareVersion: await this.getFirmwareVersion(),
        appVersion: await this.getAppVersion()
      };

      return device;
    } catch (error) {
      throw new Error(`Failed to connect to Apple Health: ${error.message}`);
    }
  }

  async disconnect(deviceId: string): Promise<void> {
    // Apple HealthKit doesn't require explicit disconnection
    // The connection is managed by iOS permissions
    return Promise.resolve();
  }

  async syncData(device: WearableDevice, dataTypes: BiometricDataType[]): Promise<BiometricReading[]> {
    if (!this.isHealthKitAvailable) {
      throw new Error('Apple HealthKit is not available');
    }

    const readings: BiometricReading[] = [];
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000)); // Last 24 hours

    try {
      for (const dataType of dataTypes) {
        const healthKitType = this.mapToHealthKitType(dataType);
        if (!healthKitType) continue;

        // Check if we have permission for this data type
        const isAuthorized = await this.healthKit.isAuthorized(healthKitType);
        if (!isAuthorized) continue;

        // Get samples from HealthKit
        const samples = await this.healthKit.getSamples(healthKitType, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ascending: false,
          limit: 1000
        });

        // Convert samples to BiometricReading format
        for (const sample of samples) {
          const reading = this.convertSampleToReading(sample, dataType, device);
          if (reading) {
            readings.push(reading);
          }
        }
      }

      return readings;
    } catch (error) {
      throw new Error(`Failed to sync data from Apple Health: ${error.message}`);
    }
  }

  async getDeviceStatus(device: WearableDevice): Promise<ConnectionStatus> {
    try {
      const isAvailable = await this.isAvailable();
      
      return {
        isConnected: isAvailable,
        quality: isAvailable ? ConnectionQuality.EXCELLENT : ConnectionQuality.DISCONNECTED,
        lastSync: device.lastSyncTime,
        errors: isAvailable ? [] : ['Apple HealthKit not available']
      };
    } catch (error) {
      return {
        isConnected: false,
        quality: ConnectionQuality.DISCONNECTED,
        lastSync: device.lastSyncTime,
        errors: [error.message]
      };
    }
  }

  async validateData(readings: BiometricReading[]): Promise<ValidationResult> {
    const validReadings: BiometricReading[] = [];
    const invalidReadings: BiometricReading[] = [];
    const issues: ValidationIssue[] = [];

    for (const reading of readings) {
      const validation = this.validateReading(reading);
      
      if (validation.isValid) {
        validReadings.push(reading);
      } else {
        invalidReadings.push(reading);
        issues.push(...validation.issues);
      }
    }

    // Calculate overall quality score
    const qualityScore = validReadings.length / readings.length;

    // Check for data gaps
    const dataGapIssues = this.detectDataGaps(validReadings);
    issues.push(...dataGapIssues);

    return {
      validReadings,
      invalidReadings,
      issues,
      qualityScore
    };
  }

  /**
   * Private helper methods
   */
  private getSupportedDataTypes(): BiometricDataType[] {
    return [
      BiometricDataType.HEART_RATE,
      BiometricDataType.HEART_RATE_VARIABILITY,
      BiometricDataType.RESTING_HEART_RATE,
      BiometricDataType.STEPS,
      BiometricDataType.DISTANCE,
      BiometricDataType.CALORIES_BURNED,
      BiometricDataType.ACTIVE_MINUTES,
      BiometricDataType.SLEEP_DURATION,
      BiometricDataType.BLOOD_PRESSURE_SYSTOLIC,
      BiometricDataType.BLOOD_PRESSURE_DIASTOLIC,
      BiometricDataType.BODY_TEMPERATURE,
      BiometricDataType.RESPIRATORY_RATE,
      BiometricDataType.OXYGEN_SATURATION,
      BiometricDataType.BODY_WEIGHT,
      BiometricDataType.BODY_FAT_PERCENTAGE
    ];
  }

  private mapToHealthKitType(dataType: BiometricDataType): HealthKitDataType | null {
    const mapping = {
      [BiometricDataType.HEART_RATE]: HealthKitDataType.HeartRate,
      [BiometricDataType.HEART_RATE_VARIABILITY]: HealthKitDataType.HeartRateVariability,
      [BiometricDataType.RESTING_HEART_RATE]: HealthKitDataType.RestingHeartRate,
      [BiometricDataType.STEPS]: HealthKitDataType.Steps,
      [BiometricDataType.DISTANCE]: HealthKitDataType.DistanceWalkingRunning,
      [BiometricDataType.CALORIES_BURNED]: HealthKitDataType.ActiveEnergyBurned,
      [BiometricDataType.ACTIVE_MINUTES]: HealthKitDataType.AppleExerciseTime,
      [BiometricDataType.SLEEP_DURATION]: HealthKitDataType.SleepAnalysis,
      [BiometricDataType.BLOOD_PRESSURE_SYSTOLIC]: HealthKitDataType.BloodPressureSystolic,
      [BiometricDataType.BLOOD_PRESSURE_DIASTOLIC]: HealthKitDataType.BloodPressureDiastolic,
      [BiometricDataType.BODY_TEMPERATURE]: HealthKitDataType.BodyTemperature,
      [BiometricDataType.RESPIRATORY_RATE]: HealthKitDataType.RespiratoryRate,
      [BiometricDataType.OXYGEN_SATURATION]: HealthKitDataType.OxygenSaturation,
      [BiometricDataType.BODY_WEIGHT]: HealthKitDataType.BodyMass,
      [BiometricDataType.BODY_FAT_PERCENTAGE]: HealthKitDataType.BodyFatPercentage
    };

    return mapping[dataType] || null;
  }

  private convertSampleToReading(
    sample: HealthKitSample,
    dataType: BiometricDataType,
    device: WearableDevice
  ): BiometricReading | null {
    try {
      const reading: BiometricReading = {
        id: `apple_health_${dataType}_${sample.startDate}_${Math.random().toString(36).substr(2, 9)}`,
        userId: device.userId,
        deviceId: device.id,
        deviceType: device.deviceType,
        timestamp: new Date(sample.startDate),
        dataType,
        value: sample.value,
        unit: sample.unit,
        quality: this.determineDataQuality(sample, dataType),
        source: DataSource.APPLE_HEALTH,
        metadata: {
          endDate: sample.endDate,
          originalMetadata: sample.metadata
        }
      };

      return reading;
    } catch (error) {
      console.error('Failed to convert HealthKit sample:', error);
      return null;
    }
  }

  private determineDataQuality(sample: HealthKitSample, dataType: BiometricDataType): DataQuality {
    // Basic quality assessment based on data type and value ranges
    const value = sample.value;

    switch (dataType) {
      case BiometricDataType.HEART_RATE:
        if (value < 30 || value > 220) return DataQuality.POOR;
        if (value < 40 || value > 200) return DataQuality.FAIR;
        return DataQuality.GOOD;

      case BiometricDataType.STEPS:
        if (value < 0 || value > 50000) return DataQuality.POOR;
        return DataQuality.GOOD;

      case BiometricDataType.BODY_TEMPERATURE:
        if (value < 35 || value > 42) return DataQuality.POOR;
        if (value < 36 || value > 38) return DataQuality.FAIR;
        return DataQuality.GOOD;

      case BiometricDataType.OXYGEN_SATURATION:
        if (value < 70 || value > 100) return DataQuality.POOR;
        if (value < 90) return DataQuality.FAIR;
        return DataQuality.GOOD;

      default:
        return DataQuality.GOOD;
    }
  }

  private validateReading(reading: BiometricReading): { isValid: boolean; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    // Check for null or undefined values
    if (reading.value == null) {
      issues.push({
        type: ValidationIssueType.MISSING_DATA,
        severity: IssueSeverity.HIGH,
        description: 'Reading has null or undefined value',
        affectedReadings: 1
      });
    }

    // Check for future timestamps
    if (reading.timestamp > new Date()) {
      issues.push({
        type: ValidationIssueType.INCONSISTENT_TIMING,
        severity: IssueSeverity.MEDIUM,
        description: 'Reading timestamp is in the future',
        affectedReadings: 1
      });
    }

    // Check for very old timestamps (older than 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (reading.timestamp < twoYearsAgo) {
      issues.push({
        type: ValidationIssueType.INCONSISTENT_TIMING,
        severity: IssueSeverity.LOW,
        description: 'Reading timestamp is very old',
        affectedReadings: 1
      });
    }

    // Data type specific validation
    const dataTypeValidation = this.validateDataTypeSpecific(reading);
    issues.push(...dataTypeValidation);

    return {
      isValid: issues.filter(issue => issue.severity === IssueSeverity.HIGH).length === 0,
      issues
    };
  }

  private validateDataTypeSpecific(reading: BiometricReading): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const value = reading.value;

    switch (reading.dataType) {
      case BiometricDataType.HEART_RATE:
        if (value < 20 || value > 300) {
          issues.push({
            type: ValidationIssueType.OUTLIER_VALUES,
            severity: IssueSeverity.HIGH,
            description: `Heart rate value ${value} is outside normal range (20-300 bpm)`,
            affectedReadings: 1
          });
        }
        break;

      case BiometricDataType.STEPS:
        if (value < 0 || value > 100000) {
          issues.push({
            type: ValidationIssueType.OUTLIER_VALUES,
            severity: IssueSeverity.MEDIUM,
            description: `Steps value ${value} is outside reasonable range (0-100,000)`,
            affectedReadings: 1
          });
        }
        break;

      case BiometricDataType.BODY_TEMPERATURE:
        if (value < 30 || value > 45) {
          issues.push({
            type: ValidationIssueType.OUTLIER_VALUES,
            severity: IssueSeverity.HIGH,
            description: `Body temperature ${value}°C is outside survivable range`,
            affectedReadings: 1
          });
        }
        break;
    }

    return issues;
  }

  private detectDataGaps(readings: BiometricReading[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (readings.length === 0) return issues;

    // Group readings by data type
    const readingsByType = readings.reduce((groups, reading) => {
      if (!groups[reading.dataType]) {
        groups[reading.dataType] = [];
      }
      groups[reading.dataType].push(reading);
      return groups;
    }, {} as Record<BiometricDataType, BiometricReading[]>);

    // Check for gaps in each data type
    for (const [dataType, typeReadings] of Object.entries(readingsByType)) {
      const sortedReadings = typeReadings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      for (let i = 1; i < sortedReadings.length; i++) {
        const timeDiff = sortedReadings[i].timestamp.getTime() - sortedReadings[i - 1].timestamp.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Check for gaps longer than expected based on data type
        const expectedMaxGap = this.getExpectedMaxGap(dataType as BiometricDataType);
        
        if (hoursDiff > expectedMaxGap) {
          issues.push({
            type: ValidationIssueType.MISSING_DATA,
            severity: IssueSeverity.MEDIUM,
            description: `Data gap of ${hoursDiff.toFixed(1)} hours detected in ${dataType}`,
            affectedReadings: 0,
            suggestedFix: 'Check device connectivity and sync settings'
          });
        }
      }
    }

    return issues;
  }

  private getExpectedMaxGap(dataType: BiometricDataType): number {
    // Expected maximum gap in hours for different data types
    const maxGaps = {
      [BiometricDataType.HEART_RATE]: 2, // Heart rate should be frequent
      [BiometricDataType.STEPS]: 24, // Steps are typically daily summaries
      [BiometricDataType.SLEEP_DURATION]: 48, // Sleep data is daily
      [BiometricDataType.BODY_WEIGHT]: 168, // Weight might be weekly
      [BiometricDataType.BODY_TEMPERATURE]: 24 // Temperature varies
    };

    return maxGaps[dataType] || 24; // Default to 24 hours
  }

  private async getDeviceModel(): Promise<string> {
    // In production, this would get the actual device model
    return 'Apple Watch';
  }

  private async getFirmwareVersion(): Promise<string> {
    // In production, this would get the actual firmware version
    return 'watchOS 10.0';
  }

  private async getAppVersion(): Promise<string> {
    // In production, this would get the actual app version
    return '1.0.0';
  }
}

export const appleHealthConnector = new AppleHealthConnector();