/**
 * Toast Context
 * Global toast notification management
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast, { ToastType } from '../components/common/Toast';

interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
  actionText?: string;
  onActionPress?: () => void;
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
  showSuccess: (message: string, actionText?: string, onActionPress?: () => void) => void;
  showError: (message: string, actionText?: string, onActionPress?: () => void) => void;
  showWarning: (message: string, actionText?: string, onActionPress?: () => void) => void;
  showInfo: (message: string, actionText?: string, onActionPress?: () => void) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastConfig, setToastConfig] = useState<ToastConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showToast = (config: ToastConfig) => {
    setToastConfig(config);
    setVisible(true);
  };

  const showSuccess = (message: string, actionText?: string, onActionPress?: () => void) => {
    showToast({
      message,
      type: 'success',
      actionText,
      onActionPress,
    });
  };

  const showError = (message: string, actionText?: string, onActionPress?: () => void) => {
    showToast({
      message,
      type: 'error',
      duration: 6000, // Longer duration for errors
      actionText,
      onActionPress,
    });
  };

  const showWarning = (message: string, actionText?: string, onActionPress?: () => void) => {
    showToast({
      message,
      type: 'warning',
      actionText,
      onActionPress,
    });
  };

  const showInfo = (message: string, actionText?: string, onActionPress?: () => void) => {
    showToast({
      message,
      type: 'info',
      actionText,
      onActionPress,
    });
  };

  const hideToast = () => {
    setVisible(false);
    setTimeout(() => {
      setToastConfig(null);
    }, 300);
  };

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toastConfig && (
        <Toast
          visible={visible}
          message={toastConfig.message}
          type={toastConfig.type}
          duration={toastConfig.duration}
          onHide={hideToast}
          actionText={toastConfig.actionText}
          onActionPress={toastConfig.onActionPress}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};