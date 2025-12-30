import api from './apiClient';

export const notificationService = {
  getNotifications: async (unreadOnly = false) => {
    try {
      const params = unreadOnly ? '?unreadOnly=true' : '';
      return await api.get(`/api/notifications${params}`);
    } catch (error) {
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get('/api/notifications/count');
      return response.unreadCount || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      return await api.put(`/api/notifications/${notificationId}/read`);
    } catch (error) {
      throw error;
    }
  },

  markAllAsRead: async () => {
    try {
      return await api.put('/api/notifications/mark-all-read');
    } catch (error) {
      throw error;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      return await api.delete(`/api/notifications/${notificationId}`);
    } catch (error) {
      throw error;
    }
  },

  deleteAllRead: async () => {
    try {
      return await api.delete('/api/notifications/read');
    } catch (error) {
      throw error;
    }
  },

  formatNotification: (notification) => {
    return {
      ...notification,
      timeAgo: getTimeAgo(new Date(notification.createdAt)),
      icon: getNotificationIcon(notification.type),
      color: getNotificationColor(notification.type),
    };
  },

  showBrowserNotification: (notification) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification('Challenger', {
        body: notification.message,
        icon: '/logo.png',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Challenger', {
            body: notification.message,
            icon: '/logo.png',
          });
        }
      });
    }
  },
};

const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return 'Just now';
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'request': return '📨';
    case 'accept': return '✅';
    case 'decline': return '❌';
    case 'message': return '💬';
    default: return '🔔';
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'request': return 'info';
    case 'accept': return 'success';
    case 'decline': return 'error';
    case 'message': return 'primary';
    default: return 'default';
  }
};

export default notificationService;