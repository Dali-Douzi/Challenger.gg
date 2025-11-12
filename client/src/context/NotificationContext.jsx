import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';
import { getSocket, onNewNotification, offNewNotification } from '../services/socket';

/**
 * NotificationContext
 * Manages global notification state and real-time updates
 */

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  /**
   * Fetch all notifications from API
   */
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const response = await notificationService.getNotifications(unreadOnly);
      
      if (response.success) {
        const formatted = response.data.map(notif => 
          notificationService.formatNotification(notif)
        );
        setNotifications(formatted);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Fetch unread count only
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [isAuthenticated]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      setNotifications(prev => {
        const wasUnread = prev.find(n => n._id === notificationId)?.read === false;
        if (wasUnread) {
          setUnreadCount(count => Math.max(0, count - 1));
        }
        return prev.filter(notif => notif._id !== notificationId);
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  /**
   * Delete all read notifications
   */
  const deleteAllRead = useCallback(async () => {
    try {
      await notificationService.deleteAllRead();
      
      setNotifications(prev =>
        prev.filter(notif => !notif.read)
      );
    } catch (error) {
      console.error('Error deleting all read notifications:', error);
    }
  }, []);

  /**
   * Add a new notification (from socket)
   */
  const addNotification = useCallback((notification) => {
    const formatted = notificationService.formatNotification(notification);
    
    setNotifications(prev => [formatted, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Play sound if enabled
    // notificationService.playNotificationSound();
    
    // Show browser notification if enabled
    notificationService.showBrowserNotification(notification);
  }, []);

  /**
   * Toggle notification dropdown
   */
  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  /**
   * Close notification dropdown
   */
  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  /**
   * Open notification dropdown
   */
  const openDropdown = useCallback(() => {
    setShowDropdown(true);
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = (data) => {
      console.log('🔔 Real-time notification received:', data);
      
      if (data.notification) {
        addNotification(data.notification);
      }
    };

    onNewNotification(handleNewNotification);

    return () => {
      offNewNotification(handleNewNotification);
    };
  }, [isAuthenticated, addNotification]);

  // Periodically refresh unread count (fallback)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    showDropdown,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    addNotification,
    toggleDropdown,
    closeDropdown,
    openDropdown,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;