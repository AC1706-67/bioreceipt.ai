/**
 * NetInfo Mock for Testing
 * Provides controllable network state for testing offline/online scenarios
 */

interface NetInfoState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

class MockNetInfo {
  private listeners: Array<(state: NetInfoState) => void> = [];
  private currentState: NetInfoState = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  };

  addEventListener = jest.fn((listener: (state: NetInfoState) => void) => {
    this.listeners.push(listener);
    return jest.fn(() => {
      this.listeners = this.listeners.filter(l => l !== listener);
    });
  });

  fetch = jest.fn(() => Promise.resolve(this.currentState));

  // Test utilities
  setNetworkState(state: Partial<NetInfoState>) {
    this.currentState = { ...this.currentState, ...state };
    this.listeners.forEach(listener => listener(this.currentState));
  }

  goOffline() {
    this.setNetworkState({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });
  }

  goOnline() {
    this.setNetworkState({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
  }

  reset() {
    this.listeners = [];
    this.currentState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    };
    jest.clearAllMocks();
  }
}

export const mockNetInfo = new MockNetInfo();

export default mockNetInfo;