// src/services/apiClient.js

/**
 * Centralized API client for all HTTP requests
 * Handles base URL configuration, credentials, and common headers
 */

// Get the API base URL based on environment
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (import.meta.env.MODE === 'production') {
    return window.location.origin;
  }
  
  return 'http://localhost:4444';
};

/**
 * Make an API request with automatic token refresh
 * @param {string} url - API endpoint (can be relative or absolute)
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const apiRequest = async (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;
  
  const defaultOptions = {
    credentials: 'include', // Always include cookies
    headers: {
      ...options.headers,
    },
  };

  // Don't set Content-Type for FormData - browser will set it with boundary
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      ...defaultOptions,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    // Handle 401 - token expired, try refresh
    if (response.status === 401) {
      const errorData = await response.clone().json();
      
      if (
        errorData.code === 'TOKEN_EXPIRED' ||
        errorData.code === 'NO_ACCESS_TOKEN'
      ) {
        console.log('Token expired, attempting refresh...');
        
        const refreshed = await refreshAccessToken();
        
        if (refreshed) {
          // Retry original request
          return fetch(fullUrl, {
            ...options,
            ...defaultOptions,
            headers: {
              ...defaultOptions.headers,
              ...options.headers,
            },
          });
        }
      }
      
      // Refresh failed or other auth error
      throw new ApiError('Authentication failed', 401);
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error', 0);
  }
};

/**
 * Refresh the access token
 * @returns {Promise<boolean>} - True if refresh successful
 */
const refreshAccessToken = async () => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return data.success;
    }

    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

/**
 * Parse API response
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>}
 */
export const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP ${response.status}`,
        response.status,
        data
      );
    }
    
    return data;
  }
  
  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }
  
  return response;
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Check if auth cookies exist
 * @returns {boolean}
 */
export const hasAuthCookies = () => {
  return (
    document.cookie.includes('accessToken') ||
    document.cookie.includes('refreshToken')
  );
};

/**
 * Common request methods
 */
export const api = {
  get: async (url, options = {}) => {
    const response = await apiRequest(url, {
      ...options,
      method: 'GET',
    });
    return parseResponse(response);
  },

  post: async (url, data, options = {}) => {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    
    const response = await apiRequest(url, {
      ...options,
      method: 'POST',
      body,
    });
    return parseResponse(response);
  },

  put: async (url, data, options = {}) => {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    
    const response = await apiRequest(url, {
      ...options,
      method: 'PUT',
      body,
    });
    return parseResponse(response);
  },

  delete: async (url, options = {}) => {
    const response = await apiRequest(url, {
      ...options,
      method: 'DELETE',
    });
    return parseResponse(response);
  },

  patch: async (url, data, options = {}) => {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    
    const response = await apiRequest(url, {
      ...options,
      method: 'PATCH',
      body,
    });
    return parseResponse(response);
  },
};

export default api;