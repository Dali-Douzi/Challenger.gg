import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';
import { hasAuthCookies } from '../services/apiClient';

const AuthContext = createContext(null);

const authReducer = (state, action) => {
  console.log('🔄 [AUTH] Reducer action:', action.type, action.payload);
  
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
    console.log('🔄 [AUTH] AuthProvider mounted, checking auth status...');
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (retryCount = 0) => {
    const maxRetries = 1;
    
    console.log('🔍 [AUTH] checkAuthStatus called, retry:', retryCount);
    console.log('🔍 [AUTH] Cookies:', document.cookie);
    console.log('🔍 [AUTH] hasAuthCookies():', hasAuthCookies());

    try {
      const data = await authService.checkAuth();
      console.log('✅ [AUTH] Auth check response:', data);

      if (data.success) {
        console.log('✅ [AUTH] User authenticated:', data.user);
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
        return;
      }

      console.log('❌ [AUTH] Auth check failed, logging out');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('❌ [AUTH] Auth check error:', error);
      
      if (retryCount < maxRetries && error.status !== 401) {
        console.log('🔄 [AUTH] Retrying auth check in 1s...');
        setTimeout(() => checkAuthStatus(retryCount + 1), 1000);
        return;
      }

      console.log('❌ [AUTH] Max retries reached or 401, logging out');
      dispatch({ type: 'LOGOUT' });
    } finally {
      if (retryCount >= maxRetries || retryCount === 0) {
        console.log('✅ [AUTH] Setting loading to false');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const login = async (identifier, password, rememberMe = false) => {
    console.log('🔐 [AUTH] Login attempt for:', identifier);
    
    try {
      const data = await authService.login(identifier, password, rememberMe);
      console.log('✅ [AUTH] Login response:', data);

      if (data.success) {
        console.log('✅ [AUTH] Login successful, updating context');
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
      } else {
        console.log('❌ [AUTH] Login failed:', data.message);
      }

      return data;
    } catch (error) {
      console.error('❌ [AUTH] Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed. Please try again.',
      };
    }
  };

  const signup = async (formData) => {
    console.log('📝 [AUTH] Signup attempt');
    
    try {
      const data = await authService.signup(formData);
      console.log('✅ [AUTH] Signup response:', data);

      if (data.success) {
        console.log('✅ [AUTH] Signup successful, updating context');
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
      }

      return data;
    } catch (error) {
      console.error('❌ [AUTH] Signup error:', error);
      return {
        success: false,
        message: error.message || 'Signup failed. Please try again.',
      };
    }
  };

  const logout = async () => {
    console.log('🚪 [AUTH] Logout called');
    
    try {
      await authService.logout();
      console.log('✅ [AUTH] Logout successful');
    } catch (error) {
      console.error('❌ [AUTH] Logout error:', error);
    } finally {
      console.log('🔄 [AUTH] Dispatching LOGOUT action');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshToken = async () => {
    console.log('🔄 [AUTH] Refresh token called');
    console.log('🔍 [AUTH] hasAuthCookies():', hasAuthCookies());
    
    try {
      if (!hasAuthCookies()) {
        console.log('❌ [AUTH] No auth cookies, cannot refresh');
        return { success: false, reason: 'No auth cookies' };
      }

      const data = await authService.refreshToken();
      console.log('✅ [AUTH] Refresh response:', data);

      if (data.success) {
        console.log('✅ [AUTH] Token refreshed, updating context');
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
        return { success: true };
      }

      console.log('❌ [AUTH] Token refresh failed');
      return { success: false, reason: 'Refresh failed' };
    } catch (error) {
      console.error('❌ [AUTH] Refresh error:', error);
      return { success: false, reason: error.message };
    }
  };

  const updateUsername = async (newUsername, currentPassword) => {
    console.log('📝 [AUTH] Update username called');
    
    try {
      const data = await authService.updateUsername(newUsername, currentPassword);
      console.log('✅ [AUTH] Update username response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('❌ [AUTH] Update username error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update username.',
      };
    }
  };

  const updateEmail = async (newEmail, currentPassword) => {
    console.log('📝 [AUTH] Update email called');
    
    try {
      const data = await authService.updateEmail(newEmail, currentPassword);
      console.log('✅ [AUTH] Update email response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('❌ [AUTH] Update email error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update email.',
      };
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    console.log('📝 [AUTH] Update password called');
    
    try {
      const data = await authService.updatePassword(currentPassword, newPassword);
      console.log('✅ [AUTH] Update password response:', data);
      return data;
    } catch (error) {
      console.error('❌ [AUTH] Update password error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update password.',
      };
    }
  };

  const updateAvatar = async (avatarFile, currentPassword) => {
    console.log('📝 [AUTH] Update avatar called');
    
    try {
      const data = await authService.updateAvatar(avatarFile, currentPassword);
      console.log('✅ [AUTH] Update avatar response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('❌ [AUTH] Update avatar error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update avatar.',
      };
    }
  };

  const deleteAvatar = async () => {
    console.log('🗑️ [AUTH] Delete avatar called');
    
    try {
      const data = await authService.deleteAvatar();
      console.log('✅ [AUTH] Delete avatar response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('❌ [AUTH] Delete avatar error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete avatar.',
      };
    }
  };

  const deleteAccount = async (currentPassword) => {
    console.log('🗑️ [AUTH] Delete account called');
    
    try {
      const data = await authService.deleteAccount(currentPassword);
      console.log('✅ [AUTH] Delete account response:', data);

      if (data.success) {
        dispatch({ type: 'LOGOUT' });
      }

      return data;
    } catch (error) {
      console.error('❌ [AUTH] Delete account error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete account.',
      };
    }
  };

  const updateUser = (updatedUser) => {
    console.log('🔄 [AUTH] Update user called:', updatedUser);
    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
  };

  const setAuthData = (userData) => {
    console.log('🔄 [AUTH] Set auth data called:', userData);
    dispatch({
      type: 'SET_AUTH_DATA',
      payload: { user: userData },
    });
  };

  const hasPermission = (permission) => {
    const result = state.isAuthenticated && state.user;
    console.log('🔐 [AUTH] hasPermission check:', permission, '→', result);
    return result;
  };

  // ✅ CRITICAL FIX: Compute token dynamically
  const tokenValue = hasAuthCookies();
  console.log('🔍 [AUTH] Token value computed:', tokenValue);
  console.log('🔍 [AUTH] Current cookies:', document.cookie);

  const value = {
    user: state.user,
    loading: state.isLoading,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    token: tokenValue, // ✅ Dynamically computed from cookies
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

  console.log('📊 [AUTH] Context value:', {
    hasUser: !!value.user,
    isLoading: value.isLoading,
    isAuthenticated: value.isAuthenticated,
    token: value.token,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;