import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hasAuthCookies } from '../services/apiClient';
import { Box, Paper, Typography, Button } from '@mui/material';

/**
 * Comprehensive Auth Diagnostic Component
 * Add this to your ScrimDashboard or any page to debug auth issues
 */
const AuthDiagnostic = () => {
  const auth = useAuth();

  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('🔍 COMPREHENSIVE AUTH DIAGNOSTIC');
    console.log('═══════════════════════════════════════════');
    
    // 1. Check Cookies
    console.log('\n1️⃣ COOKIE CHECK');
    console.log('─────────────────────────────────────────');
    const cookies = document.cookie;
    console.log('Raw cookies:', cookies);
    console.log('Has accessToken:', cookies.includes('accessToken'));
    console.log('Has refreshToken:', cookies.includes('refreshToken'));
    console.log('hasAuthCookies() result:', hasAuthCookies());
    
    // Parse cookies
    const cookieObj = {};
    cookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookieObj[name] = value;
    });
    console.log('Parsed cookies:', cookieObj);

    // 2. Check Auth Context
    console.log('\n2️⃣ AUTH CONTEXT CHECK');
    console.log('─────────────────────────────────────────');
    console.log('auth.user:', auth.user);
    console.log('auth.token:', auth.token);
    console.log('auth.isAuthenticated:', auth.isAuthenticated);
    console.log('auth.isLoading:', auth.isLoading);

    // 3. Test Auth API
    console.log('\n3️⃣ AUTH API TEST');
    console.log('─────────────────────────────────────────');
    try {
      const authRes = await fetch('/api/auth/me', { credentials: 'include' });
      console.log('Auth API status:', authRes.status, authRes.statusText);
      
      if (authRes.ok) {
        const authData = await authRes.json();
        console.log('Auth API response:', authData);
      } else {
        const errorText = await authRes.text();
        console.log('Auth API error:', errorText);
      }
    } catch (error) {
      console.error('Auth API fetch error:', error);
    }

    // 4. Test Teams API
    console.log('\n4️⃣ TEAMS API TEST');
    console.log('─────────────────────────────────────────');
    try {
      const teamsRes = await fetch('/api/teams/my', { credentials: 'include' });
      console.log('Teams API status:', teamsRes.status, teamsRes.statusText);
      
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        console.log('Teams API response:', teamsData);
        console.log('Teams count:', Array.isArray(teamsData?.data) ? teamsData.data.length : 'N/A');
      } else {
        const errorText = await teamsRes.text();
        console.log('Teams API error:', errorText);
      }
    } catch (error) {
      console.error('Teams API fetch error:', error);
    }

    // 5. Check Local Storage
    console.log('\n5️⃣ LOCAL STORAGE CHECK');
    console.log('─────────────────────────────────────────');
    console.log('localStorage items:', Object.keys(localStorage));
    Object.keys(localStorage).forEach(key => {
      console.log(`  ${key}:`, localStorage.getItem(key));
    });

    // 6. Check Session Storage
    console.log('\n6️⃣ SESSION STORAGE CHECK');
    console.log('─────────────────────────────────────────');
    console.log('sessionStorage items:', Object.keys(sessionStorage));
    Object.keys(sessionStorage).forEach(key => {
      console.log(`  ${key}:`, sessionStorage.getItem(key));
    });

    // 7. Network Tab Reminder
    console.log('\n7️⃣ NEXT STEPS');
    console.log('─────────────────────────────────────────');
    console.log('✅ Check Network tab (F12) for:');
    console.log('   - Request headers (look for Cookie)');
    console.log('   - Response headers (look for Set-Cookie)');
    console.log('   - Status codes');
    console.log('✅ Check Application tab (F12) for:');
    console.log('   - Cookies section');
    console.log('   - Verify accessToken and refreshToken exist');
    
    console.log('\n═══════════════════════════════════════════');
    console.log('🔍 DIAGNOSTIC COMPLETE');
    console.log('═══════════════════════════════════════════\n');
  };

  const handleManualTest = () => {
    console.clear();
    runDiagnostic();
  };

  const handleClearCookies = () => {
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    console.log('✅ All cookies cleared');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ All storage cleared');
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mt: 3,
        bgcolor: '#f5f5f5',
        border: '2px solid #ff9800',
      }}
    >
      <Typography variant="h6" gutterBottom color="warning.main">
        🔍 Auth Diagnostic Panel
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Cookie Check:</strong> {hasAuthCookies() ? '✅ Found' : '❌ Not Found'}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Context Token:</strong> {auth.token ? '✅ True' : '❌ False'}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>Is Authenticated:</strong> {auth.isAuthenticated ? '✅ True' : '❌ False'}
        </Typography>
        <Typography variant="body2" gutterBottom>
          <strong>User Object:</strong> {auth.user ? '✅ Present' : '❌ Null'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleManualTest}
          color="info"
        >
          Run Diagnostic
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          onClick={handleClearCookies}
          color="warning"
        >
          Clear Cookies
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          onClick={handleClearStorage}
          color="warning"
        >
          Clear Storage
        </Button>
        
        <Button
          variant="outlined"
          size="small"
          onClick={() => window.location.reload()}
          color="secondary"
        >
          Reload Page
        </Button>
      </Box>

      <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
        💡 Check browser console (F12) for detailed diagnostic output
      </Typography>
    </Paper>
  );
};

export default AuthDiagnostic;