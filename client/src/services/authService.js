import api from './apiClient';

export const authService = {
  checkAuth: async () => {
    try {
      return await api.get('/api/auth/me');
    } catch (error) {
      throw error;
    }
  },

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

  signup: async (formData) => {
    try {
      return await api.post('/api/auth/signup', formData);
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      return await api.post('/api/auth/logout');
    } catch (error) {
      throw error;
    }
  },

  refreshToken: async () => {
    try {
      return await api.post('/api/auth/refresh');
    } catch (error) {
      throw error;
    }
  },

  updateUsername: async (newUsername) => {
    try {
      return await api.put('/api/auth/update-username', { username: newUsername });
    } catch (error) {
      throw error;
    }
  },

  updateEmail: async (newEmail) => {
    try {
      return await api.put('/api/auth/update-email', { email: newEmail });
    } catch (error) {
      throw error;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    try {
      return await api.put('/api/auth/update-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      throw error;
    }
  },

  updateAvatar: async (avatarFile) => {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      return await api.put('/api/auth/update-avatar', formData);
    } catch (error) {
      throw error;
    }
  },

  deleteAvatar: async () => {
    try {
      return await api.delete('/api/auth/delete-avatar');
    } catch (error) {
      throw error;
    }
  },

  deleteAccount: async (currentPassword) => {
    try {
      return await api.delete('/api/auth/delete-account', {
        data: { password: currentPassword },
      });
    } catch (error) {
      throw error;
    }
  },
};

export default authService;