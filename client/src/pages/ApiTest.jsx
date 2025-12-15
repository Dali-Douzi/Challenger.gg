import React, { useState } from 'react';
import { Box, Button, Paper, Typography, Alert } from '@mui/material';
import api, { getApiBaseUrl } from '../services/apiClient';

/**
 * Simple API Test Page
 * Use this to isolate the scrims API issue
 * 
 * Place in: client/src/pages/ApiTest.jsx
 * Add route in App.jsx: <Route path="/api-test" element={<ApiTest />} />
 */
const ApiTest = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = getApiBaseUrl();

  const addResult = (test, success, data) => {
    const result = {
      test,
      success,
      data,
      timestamp: new Date().toISOString(),
    };
    console.log(`🧪 [TEST] ${test}:`, result);
    setResults(prev => [result, ...prev]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Test 1: Direct fetch to /health
  const testHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      addResult('Health Check', response.ok, data);
    } catch (error) {
      addResult('Health Check', false, { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Direct fetch to /api/scrims (no api client)
  const testScrimsDirect = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/scrims`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      console.log('🧪 Content-Type:', contentType);
      console.log('🧪 Response OK:', response.ok);
      console.log('🧪 Response Status:', response.status);

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        addResult('Scrims Direct Fetch', response.ok, {
          status: response.status,
          dataType: typeof data,
          isArray: Array.isArray(data),
          hasSuccess: 'success' in data,
          hasData: 'data' in data,
          keys: Object.keys(data),
          data: data,
        });
      } else {
        const text = await response.text();
        addResult('Scrims Direct Fetch', false, {
          status: response.status,
          contentType,
          responseText: text,
        });
      }
    } catch (error) {
      addResult('Scrims Direct Fetch', false, {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Using api.get (your API client)
  const testScrimsApiClient = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/scrims');
      addResult('Scrims via API Client', true, {
        dataType: typeof data,
        isArray: Array.isArray(data),
        hasSuccess: 'success' in data,
        hasData: 'data' in data,
        keys: Object.keys(data),
        count: data?.count || data?.data?.length || 0,
        data: data,
      });
    } catch (error) {
      addResult('Scrims via API Client', false, {
        error: error.message,
        status: error.status,
        response: error.response,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 4: With filters
  const testScrimsWithFilters = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/scrims?game=League of Legends');
      addResult('Scrims with Game Filter', true, {
        dataType: typeof data,
        count: data?.count || data?.data?.length || 0,
        data: data,
      });
    } catch (error) {
      addResult('Scrims with Game Filter', false, {
        error: error.message,
        status: error.status,
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 5: Auth check
  const testAuth = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/auth/me');
      addResult('Auth Check', true, {
        authenticated: !!data.user,
        user: data.user,
      });
    } catch (error) {
      addResult('Auth Check', false, {
        error: error.message,
        status: error.status,
      });
    } finally {
      setLoading(false);
    }
  };

  // Test 6: Teams check
  const testTeams = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/teams/my');
      addResult('Get My Teams', true, {
        dataType: typeof data,
        count: data?.count || data?.data?.length || 0,
        data: data,
      });
    } catch (error) {
      addResult('Get My Teams', false, {
        error: error.message,
        status: error.status,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        API Test Page
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Run these tests to diagnose the scrims API issue
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Run Tests
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={testHealth}
            disabled={loading}
            size="small"
          >
            1. Health Check
          </Button>

          <Button
            variant="contained"
            onClick={testAuth}
            disabled={loading}
            size="small"
          >
            2. Auth Check
          </Button>

          <Button
            variant="contained"
            onClick={testTeams}
            disabled={loading}
            size="small"
          >
            3. Get Teams
          </Button>

          <Button
            variant="contained"
            onClick={testScrimsDirect}
            disabled={loading}
            size="small"
            color="warning"
          >
            4. Scrims (Direct)
          </Button>

          <Button
            variant="contained"
            onClick={testScrimsApiClient}
            disabled={loading}
            size="small"
            color="error"
          >
            5. Scrims (API Client)
          </Button>

          <Button
            variant="contained"
            onClick={testScrimsWithFilters}
            disabled={loading}
            size="small"
            color="secondary"
          >
            6. Scrims (Filtered)
          </Button>

          <Button
            variant="outlined"
            onClick={clearResults}
            size="small"
          >
            Clear Results
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Results ({results.length})
        </Typography>

        {results.length === 0 ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No tests run yet. Click a button above to start.
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            {results.map((result, index) => (
              <Alert
                key={index}
                severity={result.success ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {result.test}
                </Typography>
                
                <Typography variant="caption" display="block" sx={{ mb: 1, opacity: 0.7 }}>
                  {result.timestamp}
                </Typography>

                <Paper
                  sx={{
                    p: 1,
                    bgcolor: 'rgba(0,0,0,0.1)',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 300,
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </Paper>
              </Alert>
            ))}
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          💡 <strong>Tip:</strong> Open browser console (F12) to see detailed logs
        </Typography>
      </Box>
    </Box>
  );
};

export default ApiTest;