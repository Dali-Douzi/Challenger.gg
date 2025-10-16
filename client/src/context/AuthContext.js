import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';
import { hasAuthCookies } from '../services/apiClient';

const AuthContext = createContext(null);

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    case 'SET_AUTH_DATA':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (retryCount = 0) => {
    const maxRetries = 1;

    try {
      if (!hasAuthCookies() && retryCount === 0) {
        dispatch({ type: 'LOGOUT' });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const data = await authService.checkAuth();

      if (data.success) {
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
        return;
      }

      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      if (hasAuthCookies() && retryCount < maxRetries && error.status !== 401) {
        setTimeout(() => checkAuthStatus(retryCount + 1), 1000);
        return;
      }

      dispatch({ type: 'LOGOUT' });
    } finally {
      if (retryCount >= maxRetries || retryCount === 0) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const login = async (identifier, password, rememberMe = false) => {
    try {
      const data = await authService.login(identifier, password, rememberMe);

      if (data.success) {
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed. Please try again.',
      };
    }
  };

  const signup = async (formData) => {
    try {
      const data = await authService.signup(formData);

      if (data.success) {
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Signup failed. Please try again.',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshToken = async () => {
    try {
      if (!hasAuthCookies()) {
        return { success: false, reason: 'No auth cookies' };
      }

      const data = await authService.refreshToken();

      if (data.success) {
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
        return { success: true };
      }

      return { success: false, reason: 'Refresh failed' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  };

  const updateUsername = async (newUsername, currentPassword) => {
    try {
      const data = await authService.updateUsername(newUsername, currentPassword);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update username.',
      };
    }
  };

  const updateEmail = async (newEmail, currentPassword) => {
    try {
      const data = await authService.updateEmail(newEmail, currentPassword);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update email.',
      };
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const data = await authService.updatePassword(currentPassword, newPassword);
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update password.',
      };
    }
  };

  const updateAvatar = async (avatarFile, currentPassword) => {
    try {
      const data = await authService.updateAvatar(avatarFile, currentPassword);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update avatar.',
      };
    }
  };

  const deleteAvatar = async () => {
    try {
      const data = await authService.deleteAvatar();

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete avatar.',
      };
    }
  };

  const deleteAccount = async (currentPassword) => {
    try {
      const data = await authService.deleteAccount(currentPassword);

      if (data.success) {
        dispatch({ type: 'LOGOUT' });
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete account.',
      };
    }
  };

  const updateUser = (updatedUser) => {
    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
  };

  const setAuthData = (userData) => {
    dispatch({
      type: 'SET_AUTH_DATA',
      payload: { user: userData },
    });
  };

  const hasPermission = (permission) => {
    return state.isAuthenticated && state.user;
  };

  const value = {
    user: state.user,
    loading: state.isLoading,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    signup,
    logout,
    updateUser,
    updateUsername,
    updateEmail,
    updatePassword,
    updateAvatar,
    deleteAvatar,
    deleteAccount,
    refreshToken,
    checkAuthStatus,
    setAuthData,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;