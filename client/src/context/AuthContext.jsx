import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';
import { hasAuthCookies } from '../services/apiClient';

const AuthContext = createContext(null);

const authReducer = (state, action) => {
  console.log('ðŸ”„ [AUTH] Reducer action:', action.type, action.payload);
  
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
    console.log('ðŸ”„ [AUTH] AuthProvider mounted, checking auth status...');
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (retryCount = 0) => {
    const maxRetries = 1;
    
    console.log('ðŸ” [AUTH] checkAuthStatus called, retry:', retryCount);
    console.log('ðŸ” [AUTH] Cookies:', document.cookie);
    console.log('ðŸ” [AUTH] hasAuthCookies():', hasAuthCookies());

    try {
      const data = await authService.checkAuth();
      console.log('âœ… [AUTH] Auth check response:', data);

      if (data.success) {
        console.log('âœ… [AUTH] User authenticated:', data.user);
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
        return;
      }

      console.log('âŒ [AUTH] Auth check failed, logging out');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('âŒ [AUTH] Auth check error:', error);
      
      if (retryCount < maxRetries && error.status !== 401) {
        console.log('ðŸ”„ [AUTH] Retrying auth check in 1s...');
        setTimeout(() => checkAuthStatus(retryCount + 1), 1000);
        return;
      }

      console.log('âŒ [AUTH] Max retries reached or 401, logging out');
      dispatch({ type: 'LOGOUT' });
    } finally {
      if (retryCount >= maxRetries || retryCount === 0) {
        console.log('âœ… [AUTH] Setting loading to false');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const login = async (identifier, password, rememberMe = false) => {
    console.log('ðŸ” [AUTH] Login attempt for:', identifier);
    
    try {
      const data = await authService.login(identifier, password, rememberMe);
      console.log('âœ… [AUTH] Login response:', data);

      if (data.success) {
        console.log('âœ… [AUTH] Login successful, updating context');
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
      } else {
        console.log('âŒ [AUTH] Login failed:', data.message);
      }

      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed. Please try again.',
      };
    }
  };

  const signup = async (formData) => {
    console.log('ðŸ“ [AUTH] Signup attempt');
    
    try {
      const data = await authService.signup(formData);
      console.log('âœ… [AUTH] Signup response:', data);

      if (data.success) {
        console.log('âœ… [AUTH] Signup successful, updating context');
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
      }

      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Signup error:', error);
      return {
        success: false,
        message: error.message || 'Signup failed. Please try again.',
      };
    }
  };

  const logout = async () => {
    console.log('ðŸšª [AUTH] Logout called');
    
    try {
      await authService.logout();
      console.log('âœ… [AUTH] Logout successful');
    } catch (error) {
      console.error('âŒ [AUTH] Logout error:', error);
    } finally {
      console.log('ðŸ”„ [AUTH] Dispatching LOGOUT action');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshToken = async () => {
    console.log('ðŸ”„ [AUTH] Refresh token called');
    console.log('ðŸ” [AUTH] hasAuthCookies():', hasAuthCookies());
    
    try {
      if (!hasAuthCookies()) {
        console.log('âŒ [AUTH] No auth cookies, cannot refresh');
        return { success: false, reason: 'No auth cookies' };
      }

      const data = await authService.refreshToken();
      console.log('âœ… [AUTH] Refresh response:', data);

      if (data.success) {
        console.log('âœ… [AUTH] Token refreshed, updating context');
        dispatch({
          type: 'SET_AUTH_DATA',
          payload: { user: data.user },
        });
        return { success: true };
      }

      console.log('âŒ [AUTH] Token refresh failed');
      return { success: false, reason: 'Refresh failed' };
    } catch (error) {
      console.error('âŒ [AUTH] Refresh error:', error);
      return { success: false, reason: error.message };
    }
  };

  const updateUsername = async (newUsername) => {
    console.log('ðŸ“ [AUTH] Update username called');
    
    try {
      const data = await authService.updateUsername(newUsername);
      console.log('âœ… [AUTH] Update username response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Update username error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update username.',
      };
    }
  };

  const updateEmail = async (newEmail) => {
    console.log('ðŸ“ [AUTH] Update email called');
    
    try {
      const data = await authService.updateEmail(newEmail);
      console.log('âœ… [AUTH] Update email response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Update email error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update email.',
      };
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    console.log('ðŸ“ [AUTH] Update password called');
    
    try {
      const data = await authService.updatePassword(currentPassword, newPassword);
      console.log('âœ… [AUTH] Update password response:', data);
      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Update password error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update password.',
      };
    }
  };

  const updateAvatar = async (avatarFile) => {
    console.log('ðŸ“ [AUTH] Update avatar called');
    
    try {
      const data = await authService.updateAvatar(avatarFile);
      console.log('âœ… [AUTH] Update avatar response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Update avatar error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update avatar.',
      };
    }
  };

  const deleteAvatar = async () => {
    console.log('ðŸ—‘ï¸ [AUTH] Delete avatar called');
    
    try {
      const data = await authService.deleteAvatar();
      console.log('âœ… [AUTH] Delete avatar response:', data);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Delete avatar error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete avatar.',
      };
    }
  };

  const deleteAccount = async (currentPassword) => {
    console.log('ðŸ—‘ï¸ [AUTH] Delete account called');
    
    try {
      const data = await authService.deleteAccount(currentPassword);
      console.log('âœ… [AUTH] Delete account response:', data);

      if (data.success) {
        dispatch({ type: 'LOGOUT' });
      }

      return data;
    } catch (error) {
      console.error('âŒ [AUTH] Delete account error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete account.',
      };
    }
  };

  const updateUser = (updatedUser) => {
    console.log('ðŸ”„ [AUTH] Update user called:', updatedUser);
    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
  };

  const setAuthData = (userData) => {
    console.log('ðŸ”„ [AUTH] Set auth data called:', userData);
    dispatch({
      type: 'SET_AUTH_DATA',
      payload: { user: userData },
    });
  };

  const hasPermission = (permission) => {
    const result = state.isAuthenticated && state.user;
    console.log('ðŸ” [AUTH] hasPermission check:', permission, 'â†’', result);
    return result;
  };

  // âœ… CRITICAL FIX: Compute token dynamically
  const tokenValue = hasAuthCookies();
  console.log('ðŸ” [AUTH] Token value computed:', tokenValue);
  console.log('ðŸ” [AUTH] Current cookies:', document.cookie);

  const value = {
    user: state.user,
    loading: state.isLoading,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    token: tokenValue, // âœ… Dynamically computed from cookies
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

  console.log('ðŸ“Š [AUTH] Context value:', {
    hasUser: !!value.user,
    isLoading: value.isLoading,
    isAuthenticated: value.isAuthenticated,
    token: value.token,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;