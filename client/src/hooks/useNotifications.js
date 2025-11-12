import { useContext } from 'react';
import NotificationContext from '../context/NotificationContext';

/**
 * useNotifications Hook
 * Convenience wrapper for NotificationContext
 * Provides notification state and operations
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};

export default useNotifications;