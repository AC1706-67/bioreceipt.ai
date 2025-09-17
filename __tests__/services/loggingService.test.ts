/**
 * Unit tests for Logging Service
 */

import { LoggingService } from '../../src/services/logging/loggingService';
import { LogEntry } from '../../src/types/analytics';
import * as storage from '../../src/utils/storage';

// Mock dependencies
jest.mock('../../src/utils/storage');
jest.mock('../../src/services/sync/syncService');

const mockStorage = storage as jest.Mocked<typeof storage>;

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;

describe('LoggingService', () => {
  let loggingService: LoggingService;

  beforeEach(() => {
    loggingService = LoggingService.getInstance();
    jest.clearAllMocks();
    mockStorage.getData.mockResolvedValue([]);
    mockStorage.storeData.mockResolvedValue();

    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await loggingService.initialize();

      const config = loggingService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.enableConsoleOutput).toBe(__DEV__);
      expect(config.enableRemoteLogging).toBe(!__DEV__);
    });

    it('should initialize with custom configuration', async () => {
      await loggingService.initialize({
        logLevel: 'warn',
        maxLogEntries: 500,
        retentionDays: 14,
      });

      const config = loggingService.getConfig();
      expect(config.logLevel).toBe('warn');
      expect(config.maxLogEntries).toBe(500);
      expect(config.retentionDays).toBe(14);
    });

    it('should load saved configuration', async () => {
      const savedConfig = {
        logLevel: 'info' as const,
        maxLogEntries: 2000,
      };
      mockStorage.getData.mockResolvedValueOnce(savedConfig);

      await loggingService.initialize();

      const config = loggingService.getConfig();
      expect(config.logLevel).toBe('info');
      expect(config.maxLogEntries).toBe(2000);
    });
  });

  describe('error logging', () => {
    beforeEach(async () => {
      await loggingService.initialize({ enableConsoleOutput: true });
    });

    it('should log errors with context', async () => {
      const error = new Error('Test error');
      const context = { module: 'testModule', method: 'testMethod' };

      await loggingService.logError(error, context);

      // Should output to console
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Test error'),
        context,
        error.stack,
      );

      // Should store the log entry
      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'LOG_ENTRIES',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            message: 'Test error',
            metadata: context,
            stackTrace: error.stack,
          }),
        ]),
      );
    });

    it('should log string errors', async () => {
      await loggingService.logError('String error message');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] String error message'),
        undefined,
        expect.any(String),
      );
    });

    it('should not log errors when disabled', async () => {
      await loggingService.initialize({ enabled: false });

      await loggingService.logError(new Error('Test error'));

      expect(console.error).not.toHaveBeenCalled();
      expect(mockStorage.storeData).not.toHaveBeenCalled();
    });

    it('should respect log level filtering', async () => {
      await loggingService.initialize({ logLevel: 'error' });

      await loggingService.logDebug('Debug message');
      await loggingService.logInfo('Info message');
      await loggingService.logWarn('Warn message');
      await loggingService.logError(new Error('Error message'));

      // Only error should be logged
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('info logging', () => {
    beforeEach(async () => {
      await loggingService.initialize({
        enableConsoleOutput: true,
        logLevel: 'info',
      });
    });

    it('should log info messages with data', async () => {
      const data = { detail: true, count: 5 };

      await loggingService.logInfo('Test info message', data);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test info message'),
        data,
      );

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'LOG_ENTRIES',
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: 'Test info message',
            metadata: data,
          }),
        ]),
      );
    });
  });

  describe('warn logging', () => {
    beforeEach(async () => {
      await loggingService.initialize({
        enableConsoleOutput: true,
        logLevel: 'warn',
      });
    });

    it('should log warning messages', async () => {
      const data = { warning: 'performance issue' };

      await loggingService.logWarn('Test warning', data);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Test warning'),
        data,
      );
    });
  });

  describe('debug logging', () => {
    beforeEach(async () => {
      await loggingService.initialize({
        enableConsoleOutput: true,
        logLevel: 'debug',
      });
    });

    it('should log debug messages', async () => {
      const data = { debugInfo: 'detailed info' };

      await loggingService.logDebug('Test debug message', data);

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Test debug message'),
        data,
      );
    });
  });

  describe('specialized logging methods', () => {
    beforeEach(async () => {
      await loggingService.initialize({ enableConsoleOutput: true });
    });

    it('should log API errors', async () => {
      await loggingService.logApiError(
        '/api/test',
        404,
        'Not found',
        { param: 'value' },
        { error: 'Resource not found' },
      );

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] API Error: Not found'),
        expect.objectContaining({
          module: 'api',
          method: '/api/test',
          statusCode: 404,
          requestData: { param: 'value' },
          responseData: { error: 'Resource not found' },
        }),
        expect.any(String),
      );
    });

    it('should log component errors', async () => {
      const error = new Error('Component error');
      const errorInfo = { componentStack: 'Component stack trace' };

      await loggingService.logComponentError(error, errorInfo, 'TestComponent');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Component error'),
        expect.objectContaining({
          module: 'component',
          component: 'TestComponent',
          componentStack: 'Component stack trace',
        }),
        error.stack,
      );
    });

    it('should log validation errors', async () => {
      await loggingService.logValidationError(
        'email',
        'invalid-email',
        'email format',
        'Invalid email format',
      );

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '[ERROR] Validation Error: Invalid email format',
        ),
        expect.objectContaining({
          module: 'validation',
          fieldName: 'email',
          value: 'invalid-email',
          validationRule: 'email format',
        }),
        expect.any(String),
      );
    });

    it('should log performance issues', async () => {
      await loggingService.logPerformanceIssue('data_load', 3000, 2000, {
        recordCount: 1000,
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[WARN] Performance issue: data_load took 3000ms (threshold: 2000ms)',
        ),
        expect.objectContaining({
          module: 'performance',
          operation: 'data_load',
          duration: 3000,
          threshold: 2000,
          recordCount: 1000,
        }),
      );
    });
  });

  describe('log retrieval', () => {
    const mockLogs: LogEntry[] = [
      {
        id: 'log1',
        level: 'error',
        message: 'Error 1',
        timestamp: new Date('2024-01-01'),
        correlationId: 'corr1',
        sessionId: 'session1',
      },
      {
        id: 'log2',
        level: 'warn',
        message: 'Warning 1',
        timestamp: new Date('2024-01-02'),
        correlationId: 'corr2',
        sessionId: 'session1',
      },
      {
        id: 'log3',
        level: 'info',
        message: 'Info 1',
        timestamp: new Date('2024-01-03'),
        correlationId: 'corr3',
        sessionId: 'session2',
      },
    ];

    beforeEach(() => {
      mockStorage.getData.mockResolvedValue(mockLogs);
    });

    it('should get all logs', async () => {
      const logs = await loggingService.getAllLogs();

      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Error 1');
    });

    it('should get logs by level', async () => {
      const errorLogs = await loggingService.getLogsByLevel('error');

      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
      expect(errorLogs[0].message).toBe('Error 1');
    });

    it('should get logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const logs = await loggingService.getLogsByDateRange(startDate, endDate);

      expect(logs).toHaveLength(2);
      expect(logs.map(l => l.message)).toEqual(['Error 1', 'Warning 1']);
    });

    it('should get logs by correlation ID', async () => {
      const logs = await loggingService.getLogsByCorrelationId('corr1');

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Error 1');
    });
  });

  describe('log management', () => {
    beforeEach(async () => {
      await loggingService.initialize();
    });

    it('should clear all logs', async () => {
      await loggingService.clearAllLogs();

      expect(mockStorage.storeData).toHaveBeenCalledWith('LOG_ENTRIES', []);
    });

    it('should export logs', async () => {
      const mockLogs = [
        {
          id: 'log1',
          level: 'error',
          message: 'Test error',
          timestamp: new Date(),
          correlationId: 'corr1',
          sessionId: 'session1',
        },
      ];
      mockStorage.getData.mockResolvedValue(mockLogs);

      const exportData = await loggingService.exportLogs();

      expect(exportData).toBe(JSON.stringify(mockLogs, null, 2));
    });

    it('should limit stored logs to maxLogEntries', async () => {
      await loggingService.initialize({ maxLogEntries: 2 });

      // Mock existing logs at the limit
      const existingLogs = [
        { id: 'log1', level: 'info', message: 'Old log 1' },
        { id: 'log2', level: 'info', message: 'Old log 2' },
      ];
      mockStorage.getData.mockResolvedValue(existingLogs);

      await loggingService.logInfo('New log');

      // Should remove oldest log and add new one
      const storedLogs = mockStorage.storeData.mock.calls[0][1] as LogEntry[];
      expect(storedLogs).toHaveLength(2);
      expect(storedLogs[0].message).toBe('Old log 2');
      expect(storedLogs[1].message).toBe('New log');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', async () => {
      await loggingService.updateConfig({
        logLevel: 'warn',
        maxLogEntries: 500,
      });

      const config = loggingService.getConfig();
      expect(config.logLevel).toBe('warn');
      expect(config.maxLogEntries).toBe(500);

      expect(mockStorage.storeData).toHaveBeenCalledWith(
        'LOGGING_CONFIG',
        expect.objectContaining({
          logLevel: 'warn',
          maxLogEntries: 500,
        }),
      );
    });

    it('should get current configuration', () => {
      const config = loggingService.getConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('maxLogEntries');
      expect(config).toHaveProperty('retentionDays');
    });
  });

  describe('session management', () => {
    it('should start new session', () => {
      const originalSessionId = (loggingService as any).sessionId;

      loggingService.startNewSession();

      const newSessionId = (loggingService as any).sessionId;
      expect(newSessionId).not.toBe(originalSessionId);
      expect((loggingService as any).correlationIdCounter).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorage.storeData.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(
        loggingService.logError(new Error('Test error')),
      ).resolves.not.toThrow();
    });

    it('should handle retrieval errors gracefully', async () => {
      mockStorage.getData.mockRejectedValue(new Error('Retrieval error'));

      const logs = await loggingService.getAllLogs();
      expect(logs).toEqual([]);
    });
  });
});
