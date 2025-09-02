/**
 * Network Status Hook
 * Monitors network connectivity and provides real-time status updates
 * Specialized for substance addition operations
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useToast } from '../contexts/ToastContext';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isWifi: boolean;
  isCellular: boolean;
  strength: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  canPerformOperations: boolean;
}

export interface NetworkStatusHook {
  networkStatus: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  checkConnectivity: () => Promise<boolean>;
  waitForConnection: (timeout?: number) => Promise<boolean>;
  showNetworkStatus: () => void;
}

const getConnectionStrength = (state: NetInfoState): NetworkStatus['strength'] => {
  if (!state.isConnected) return 'poor';
  
  // For WiFi connections
  if (state.type === 'wifi' && state.details && 'strength' in state.details) {
    const strength = state.details.strength as number;
    if (strength >= 80) return 'excellent';
    if (strength >= 60) return 'good';
    if (strength >= 40) return 'fair';
    return 'poor';
  }
  
  // For cellular connections
  if (state.type === 'cellular' && state.details && 'cellularGeneration' in state.details) {
    const generation = state.details.cellularGeneration;
    if (generation === '5g') return 'excellent';
    if (generation === '4g') return 'good';
    if (generation === '3g') return 'fair';
    return 'poor';
  }
  
  // Default based on connection type
  if (state.type === 'wifi') return 'good';
  if (state.type === 'cellular') return 'fair';
  
  return 'unknown';
};

const canPerformOperations = (status: NetworkStatus): boolean => {
  if (!status.isConnected) return false;
  if (status.isInternetReachable === false) return false;
  if (status.strength === 'poor') return false;
  return true;
};

export const useNetworkStatus = (): NetworkStatusHook => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
    isWifi: false,
    isCellular: false,
    strength: 'unknown',
    canPerformOperations: true,
  });
  
  const [previousStatus, setPreviousStatus] = useState<NetworkStatus | null>(null);
  const toast = useToast();

  const updateNetworkStatus = useCallback((state: NetInfoState) => {
    const strength = getConnectionStrength(state);
    const newStatus: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isWifi: state.type === 'wifi',
      isCellular: state.type === 'cellular',
      strength,
      canPerformOperations: false, // Will be set below
    };
    
    newStatus.canPerformOperations = canPerformOperations(newStatus);
    
    // Show notifications for significant status changes
    if (previousStatus) {
      // Connection restored
      if (!previousStatus.isConnected && newStatus.isConnected) {
        toast.showSuccess('Connection restored! 🌐', 'Dismiss');
      }
      
      // Connection lost
      if (previousStatus.isConnected && !newStatus.isConnected) {
        toast.showError('Connection lost. Please check your internet.', 'Retry', () => {
          checkConnectivity();
        });
      }
      
      // Internet reachability changed
      if (previousStatus.isInternetReachable === true && newStatus.isInternetReachable === false) {
        toast.showWarning('Internet access limited. Some features may not work.', 'Check');
      }
      
      // Connection quality degraded significantly
      if (previousStatus.canPerformOperations && !newStatus.canPerformOperations && newStatus.isConnected) {
        toast.showWarning('Poor connection quality. Operations may be slow.', 'OK');
      }
    }
    
    setPreviousStatus(networkStatus);
    setNetworkStatus(newStatus);
  }, [networkStatus, previousStatus, toast]);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      updateNetworkStatus(state);
      return state.isConnected ?? false;
    } catch (error) {
      console.error('Error checking connectivity:', error);
      return false;
    }
  }, [updateNetworkStatus]);

  const waitForConnection = useCallback((timeoutMs: number = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok: boolean) => { 
        if (!done) { 
          done = true; 
          unsub(); 
          resolve(ok); 
        } 
      };

      // Check current state first
      NetInfo.fetch().then(s => {
        if (s.isConnected && s.isInternetReachable !== false) finish(true);
      });

      // Listen for network changes
      const unsub = NetInfo.addEventListener(s => {
        if (s.isConnected && s.isInternetReachable !== false) finish(true);
      });

      // Set timeout
      setTimeout(() => finish(false), timeoutMs);
    });
  }, []);

  const showNetworkStatus = useCallback(() => {
    const status = networkStatus;
    let message = '';
    let type: 'success' | 'warning' | 'error' | 'info' = 'info';
    
    if (!status.isConnected) {
      message = 'No internet connection';
      type = 'error';
    } else if (status.isInternetReachable === false) {
      message = 'Connected but no internet access';
      type = 'warning';
    } else if (!status.canPerformOperations) {
      message = `Poor ${status.type} connection (${status.strength})`;
      type = 'warning';
    } else {
      message = `Good ${status.type} connection (${status.strength})`;
      type = 'success';
    }
    
    switch (type) {
      case 'success':
        toast.showSuccess(message);
        break;
      case 'warning':
        toast.showWarning(message);
        break;
      case 'error':
        toast.showError(message);
        break;
      default:
        toast.showInfo(message);
    }
  }, [networkStatus, toast]);

  useEffect(() => {
    // Initial network status check
    NetInfo.fetch().then(updateNetworkStatus);
    
    // Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener(updateNetworkStatus);
    
    return () => {
      unsubscribe();
    };
  }, [updateNetworkStatus]);

  return {
    networkStatus,
    isOnline: networkStatus.isConnected && networkStatus.canPerformOperations,
    isOffline: !networkStatus.isConnected,
    checkConnectivity,
    waitForConnection,
    showNetworkStatus,
  };
};

export default useNetworkStatus;