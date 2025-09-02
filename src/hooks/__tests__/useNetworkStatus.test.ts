/**
 * Network Status Hook Tests
 * Tests for network connectivity monitoring and status reporting
 */

import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '../useNetworkStatus';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

// Mock ToastContext
const mockToast = {
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
  hideToast: jest.fn(),
};

jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

describe('useNetworkStatus', () => {
  const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  describe('Initial State', () => {
    it('should initialize with default network status', () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 80 }
      } as any);

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.networkStatus).toBeDefined();
      expect(result.current.isOnline).toBeDefined();
      expect(result.current.isOffline).toBeDefined();
    });
  });

  describe('Network Status Updates', () => {
    it('should update status when network changes', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 90 }
      };

      mockNetInfo.fetch.mockResolvedValue(mockState as any);

      const { result } = renderHook(() => useNetworkStatus());

      await act(async () => {
        // Simulate network status update
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener(mockState as any);
        jest.advanceTimersByTime(100);
      });

      expect(result.current.networkStatus.isConnected).toBe(true);
      expect(result.current.networkStatus.type).toBe('wifi');
      expect(result.current.networkStatus.isWifi).toBe(true);
      expect(result.current.networkStatus.isCellular).toBe(false);
    });

    it('should detect cellular connections', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: { cellularGeneration: '4g' }
      };

      mockNetInfo.fetch.mockResolvedValue(mockState as any);

      const { result } = renderHook(() => useNetworkStatus());

      await act(async () => {
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener(mockState as any);
        jest.advanceTimersByTime(100);
      });

      expect(result.current.networkStatus.isCellular).toBe(true);
      expect(result.current.networkStatus.isWifi).toBe(false);
      expect(result.current.networkStatus.strength).toBe('good');
    });

    it('should detect connection loss', async () => {
      const connectedState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      };

      const disconnectedState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      };

      mockNetInfo.fetch.mockResolvedValue(connectedState as any);

      const { result } = renderHook(() => useNetworkStatus());

      // First update - connected
      await act(async () => {
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener(connectedState as any);
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isOnline).toBe(true);

      // Second update - disconnected
      await act(async () => {
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener(disconnectedState as any);
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isOffline).toBe(true);
      expect(mockToast.showError).toHaveBeenCalledWith(
        expect.stringContaining('Connection lost'),
        'Retry',
        expect.any(Function)
      );
    });

    it('should detect connection restoration', async () => {
      const disconnectedState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      };

      const connectedState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      };

      mockNetInfo.fetch.mockResolvedValue(disconnectedState as any);

      const { result } = renderHook(() => useNetworkStatus());

      // First update - disconnected
      await act(async () => {
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener(disconnectedState as any);
        jest.advanceTimersByTime(100);
      });

      // Second update - connected
      await act(async () => {
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener(connectedState as any);
        jest.advanceTimersByTime(100);
      });

      expect(mockToast.showSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Connection restored'),
        'Dismiss'
      );
    });
  });

  describe('Connection Strength Assessment', () => {
    it('should assess WiFi connection strength correctly', async () => {
      const testCases = [
        { strength: 90, expected: 'excellent' },
        { strength: 70, expected: 'good' },
        { strength: 50, expected: 'fair' },
        { strength: 20, expected: 'poor' }
      ];

      for (const testCase of testCases) {
        const mockState = {
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { strength: testCase.strength }
        };

        const { result } = renderHook(() => useNetworkStatus());

        await act(async () => {
          const listener = mockNetInfo.addEventListener.mock.calls[0][0];
          listener(mockState as any);
          jest.advanceTimersByTime(100);
        });

        expect(result.current.networkStatus.strength).toBe(testCase.expected);
      }
    });

    it('should assess cellular connection strength correctly', async () => {
      const testCases = [
        { generation: '5g', expected: 'excellent' },
        { generation: '4g', expected: 'good' },
        { generation: '3g', expected: 'fair' },
        { generation: '2g', expected: 'poor' }
      ];

      for (const testCase of testCases) {
        const mockState = {
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
          details: { cellularGeneration: testCase.generation }
        };

        const { result } = renderHook(() => useNetworkStatus());

        await act(async () => {
          const listener = mockNetInfo.addEventListener.mock.calls[0][0];
          listener(mockState as any);
          jest.advanceTimersByTime(100);
        });

        expect(result.current.networkStatus.strength).toBe(testCase.expected);
      }
    });
  });

  describe('Operation Capability Assessment', () => {
    it('should determine if operations can be performed', async () => {
      const testCases = [
        {
          state: { isConnected: true, isInternetReachable: true, type: 'wifi', details: { strength: 80 } },
          canPerform: true
        },
        {
          state: { isConnected: false, isInternetReachable: false, type: 'none' },
          canPerform: false
        },
        {
          state: { isConnected: true, isInternetReachable: false, type: 'wifi' },
          canPerform: false
        },
        {
          state: { isConnected: true, isInternetReachable: true, type: 'wifi', details: { strength: 10 } },
          canPerform: false // Poor connection
        }
      ];

      for (const testCase of testCases) {
        const { result } = renderHook(() => useNetworkStatus());

        await act(async () => {
          const listener = mockNetInfo.addEventListener.mock.calls[0][0];
          listener(testCase.state as any);
          jest.advanceTimersByTime(100);
        });

        expect(result.current.networkStatus.canPerformOperations).toBe(testCase.canPerform);
      }
    });
  });

  describe('Connectivity Checking', () => {
    it('should check connectivity on demand', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi'
      };

      mockNetInfo.fetch.mockResolvedValue(mockState as any);

      const { result } = renderHook(() => useNetworkStatus());

      await act(async () => {
        const isConnected = await result.current.checkConnectivity();
        jest.advanceTimersByTime(100);
        expect(isConnected).toBe(true);
      });

      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('should handle connectivity check errors', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network check failed'));

      const { result } = renderHook(() => useNetworkStatus());

      await act(async () => {
        const isConnected = await result.current.checkConnectivity();
        expect(isConnected).toBe(false);
      });
    });
  });

  describe('Connection Waiting', () => {
    it('should wait for connection with timeout', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 80 }
      };

      mockNetInfo.fetch.mockResolvedValue(mockState as any);

      const { result } = renderHook(() => useNetworkStatus());

      await act(async () => {
        const waitPromise = result.current.waitForConnection(5000);
        // Emit online event immediately
        const listener = mockNetInfo.addEventListener.mock.calls[0][0];
        listener(mockState as any);
        jest.advanceTimersByTime(100);
        
        const connected = await waitPromise;
        expect(connected).toBe(true);
      });
    });

    it('should timeout when waiting for connection', async () => {
      const mockState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none'
      };

      mockNetInfo.fetch.mockResolvedValue(mockState as any);

      const { result } = renderHook(() => useNetworkStatus());

      await act(async () => {
        const waitPromise = result.current.waitForConnection(2000);
        // Advance timers to trigger timeout
        jest.advanceTimersByTime(2000);
        
        const connected = await waitPromise;
        expect(connected).toBe(false);
      });
    });
  });

  describe('Network Status Display', () => {
    it('should show appropriate status messages', async () => {
      const testCases = [
        {
          state: { isConnected: false, isInternetReachable: false, type: 'none' },
          expectedToast: 'showError',
          expectedMessage: 'No internet connection'
        },
        {
          state: { isConnected: true, isInternetReachable: false, type: 'wifi' },
          expectedToast: 'showWarning',
          expectedMessage: 'Connected but no internet access'
        },
        {
          state: { isConnected: true, isInternetReachable: true, type: 'wifi', details: { strength: 90 } },
          expectedToast: 'showSuccess',
          expectedMessage: 'Good wifi connection'
        }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        
        const { result } = renderHook(() => useNetworkStatus());

        await act(async () => {
          const listener = mockNetInfo.addEventListener.mock.calls[0][0];
          listener(testCase.state as any);
          jest.advanceTimersByTime(100);
        });

        await act(async () => {
          result.current.showNetworkStatus();
        });

        expect(mockToast[testCase.expectedToast as keyof typeof mockToast])
          .toHaveBeenCalledWith(expect.stringContaining(testCase.expectedMessage));
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const unsubscribe = jest.fn();
      mockNetInfo.addEventListener.mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useNetworkStatus());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});