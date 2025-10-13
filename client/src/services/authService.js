import api, { getApiBaseUrl } from './apiClient';

/**
 * Authentication Service
 * Handles all auth-related API calls
 */

export const authService = {
  /**
   * Check current authentication status
   */
  checkAuth: async () => {
    try {
      return await api.get('/api/auth/me');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Login with username/email and password
   */
  login: async (identifier, password, rememberMe = false) => {
    try {
      return await api.post('/api/auth/login', {
        identifier,
        password,
        rememberMe,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Sign up new user
   * @param {FormData} formData - Form data with username, email, password, and optional avatar
   */
  signup: async (formData) => {
    try {
      return await api.post('/api/auth/signup', formData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout current user
   */
  logout: async () => {
    try {
      return await api.post('/api/auth/logout', {});
    } catch (error) {
      throw error;
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async () => {
    try {
      return await api.post('/api/auth/refresh', {});
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user profile
   */
  getProfile: async () => {
    try {
      return await api.get('/api/auth/profile');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update username
   */
  updateUsername: async (newUsername, currentPassword) => {
    try {
      return await api.put('/api/auth/change-username', {
        newUsername,
        currentPassword,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update email
   */
  updateEmail: async (newEmail, currentPassword) => {
    try {
      return await api.put('/api/auth/change-email', {
        newEmail,
        currentPassword,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update password
   */
  updatePassword: async (currentPassword, newPassword) => {
    try {
      return await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update avatar
   * @param {File} avatarFile - Image file
   * @param {string} currentPassword - Current password for verification
   */
  updateAvatar: async (avatarFile, currentPassword) => {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      formData.append('currentPassword', currentPassword);
      
      return await api.put('/api/auth/change-avatar', formData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete avatar
   */
  deleteAvatar: async () => {
    try {
      return await api.delete('/api/auth/delete-avatar');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete account
   */
  deleteAccount: async (currentPassword) => {
    try {
      return await api.delete('/api/auth/delete-account', {
        body: JSON.stringify({ currentPassword }),
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get linked OAuth accounts
   */
  getLinkedAccounts: async () => {
    try {
      return await api.get('/api/auth/linked-accounts');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Unlink OAuth provider
   */
  unlinkProvider: async (provider) => {
    try {
      return await api.delete(`/api/auth/unlink/${provider}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get OAuth login URL
   */
  getOAuthUrl: (provider) => {
    return `${getApiBaseUrl()}/api/auth/${provider}`;
  },
};

export default authService;