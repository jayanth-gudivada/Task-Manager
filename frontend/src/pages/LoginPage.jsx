import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Paper, TextField, Button, Typography, Alert, CircularProgress, Link,
} from '@mui/material';
import { login, clearError, selectAuthStatus, selectAuthError } from '../store/authSlice';

// Login screen. On success the route guard in App swaps to the app shell.
const LoginPage = ({ onSwitchToRegister }) => {
  const dispatch = useDispatch();
  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const loading = status === 'loading';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Clear any stale error when arriving on this screen.
  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(login({ email, password }));
  };

  return (
    <AuthShell subtitle="Sign in to your workspace">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Email" type="email" value={email} autoComplete="email" autoFocus
          onChange={(e) => setEmail(e.target.value)} fullWidth size="small" required
        />
        <TextField
          label="Password" type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)} fullWidth size="small" required
        />
        <Button
          type="submit" variant="contained" size="large" disabled={loading}
          sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
        </Button>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          New here?{' '}
          <Link component="button" type="button" onClick={onSwitchToRegister} sx={{ fontWeight: 600 }}>
            Create an account
          </Link>
        </Typography>
      </Box>
    </AuthShell>
  );
};

// Shared centered card used by both auth screens.
export const AuthShell = ({ subtitle, children }) => (
  <Box sx={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    bgcolor: 'background.default', p: 2,
  }}>
    <Paper elevation={0} sx={{
      width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 }, borderRadius: 4,
      border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 40px rgba(133,41,216,0.08)',
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Box sx={{
          width: 48, height: 48, bgcolor: 'primary.main', borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, mb: 1.5,
          boxShadow: '0 4px 12px rgba(133,41,216,0.25)',
        }}>TM</Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Task Manager</Typography>
        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
      </Box>
      {children}
    </Paper>
  </Box>
);

export default LoginPage;
