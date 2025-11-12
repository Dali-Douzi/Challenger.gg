import api from './apiClient';

/**
 * Notification Service
 * Handles all HTTP API calls for notification operations
 */

/**
 * Get all notifications for the current user's teams
 * @param {boolean} unreadOnly - Fetch only unread notifications
 * @param {number} limit - Number of notifications to fetch
 * @param {number} skip - Number of notifications to skip
 * @returns {Promise<Object>} Notifications response
 */
export const getNotifications = async (unreadOnly = false, limit = 50, skip = 0) => {
  try {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unreadOnly', 'true');
    params.append('limit', limit);
    params.append('skip', skip);

    const response = await api.get(`/api/notifications?${params.toString()}`);
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadCount = async () => {
  try {
    const response = await api.get('/api/notifications/unread-count');
    return response.data?.unreadCount || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response;
  } catch (error) {
    console.error(`Error marking notification ${notificationId} as read:`, error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} Response with count
 */
export const markAllAsRead = async () => {
  try {
    const response = await api.put('/api/notifications/mark-all-read');
    return response;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Mark multiple notifications as read (batch)
 * @param {Array<string>} notificationIds - Array of notification IDs
 * @returns {Promise<Object>} Response with count
 */
export const markBatchAsRead = async (notificationIds) => {
  try {
    const response = await api.put('/api/notifications/batch/read', {
      notificationIds,
    });
    return response;
  } catch (error) {
    console.error('Error marking batch notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Response
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response;
  } catch (error) {
    console.error(`Error deleting notification ${notificationId}:`, error);
    throw error;
  }
};

/**
 * Delete all read notifications
 * @returns {Promise<Object>} Response with count
 */
export const deleteAllRead = async () => {
  try {
    const response = await api.delete('/api/notifications/read/all');
    return response;
  } catch (error) {
    console.error('Error deleting all read notifications:', error);
    throw error;
  }
};

/**
 * Format notification for display
 * @param {Object} notification - Raw notification object
 * @returns {Object} Formatted notification
 */
export const formatNotification = (notification) => {
  const timeAgo = getTimeAgo(new Date(notification.createdAt));
  
  return {
    ...notification,
    timeAgo,
    formattedDate: new Date(notification.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

/**
 * Get time ago string (e.g., "2m ago", "1h ago", "3d ago")
 * @param {Date} date - Date to compare
 * @returns {string} Time ago string
 */
export const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
};

/**
 * Group notifications by type
 * @param {Array} notifications - Array of notifications
 * @returns {Object} Notifications grouped by type
 */
export const groupNotificationsByType = (notifications) => {
  const grouped = {
    message: [],
    request: [],
    accept: [],
    decline: [],
    other: [],
  };

  notifications.forEach(notification => {
    const type = notification.type || 'other';
    if (grouped[type]) {
      grouped[type].push(notification);
    } else {
      grouped.other.push(notification);
    }
  });

  return grouped;
};

/**
 * Filter notifications by read status
 * @param {Array} notifications - Array of notifications
 * @param {boolean} unreadOnly - Return only unread notifications
 * @returns {Array} Filtered notifications
 */
export const filterNotifications = (notifications, unreadOnly = false) => {
  if (!unreadOnly) return notifications;
  return notifications.filter(n => !n.read);
};

/**
 * Sort notifications by date (newest first)
 * @param {Array} notifications - Array of notifications
 * @returns {Array} Sorted notifications
 */
export const sortNotifications = (notifications) => {
  return [...notifications].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
 * @returns {string} Icon emoji
 */
export const getNotificationIcon = (type) => {
  const icons = {
    message: '💬',
    request: '📩',
    accept: '✅',
    decline: '❌',
    'accept-feedback': '✅',
  };

  return icons[type] || '🔔';
};

/**
 * Play notification sound (optional)
 */
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.log('Could not play notification sound:', err);
    });
  } catch (error) {
    // Silently fail if sound not available
  }
};

/**
 * Show browser notification (if permission granted)
 * @param {Object} notification - Notification object
 */
export const showBrowserNotification = (notification) => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    const icon = getNotificationIcon(notification.type);
    
    new Notification(`${icon} Challenger`, {
      body: notification.message,
      icon: '/logo.png', // Your app logo
      badge: '/badge.png', // Small icon
      tag: notification._id, // Prevent duplicates
      requireInteraction: false,
      silent: false,
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markBatchAsRead,
  deleteNotification,
  deleteAllRead,
  formatNotification,
  getTimeAgo,
  groupNotificationsByType,
  filterNotifications,
  sortNotifications,
  getNotificationIcon,
  playNotificationSound,
  showBrowserNotification,
};