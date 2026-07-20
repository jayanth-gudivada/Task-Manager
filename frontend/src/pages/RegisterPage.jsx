import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, TextField, Button, Typography, Alert, CircularProgress, Link,
} from '@mui/material';
import { register, clearError, selectAuthStatus, selectAuthError } from '../store/authSlice';
import { AuthShell } from './LoginPage';

// Open self-registration. On success the user is auto-logged-in (the thunk
// returns a token) and the route guard swaps to the app shell.
const RegisterPage = ({ onSwitchToLogin }) => {
  const dispatch = useDispatch();
  const status = useSelector(selectAuthStatus);
  const serverError = useSelector(selectAuthError);
  const loading = status === 'loading';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (!name.trim()) return setLocalError('Please enter your name');
    if (password.length < 6) return setLocalError('Password must be at least 6 characters');
    dispatch(register({ name: name.trim(), email, password }));
  };

  return (
    <AuthShell subtitle="Create your account">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(localError || serverError) && <Alert severity="error">{localError || serverError}</Alert>}
        <TextField
          label="Full name" value={name} autoComplete="name" autoFocus
          onChange={(e) => setName(e.target.value)} fullWidth size="small" required
        />
        <TextField
          label="Email" type="email" value={email} autoComplete="email"
          onChange={(e) => setEmail(e.target.value)} fullWidth size="small" required
        />
        <TextField
          label="Password" type="password" value={password} autoComplete="new-password"
          helperText="At least 6 characters"
          onChange={(e) => setPassword(e.target.value)} fullWidth size="small" required
        />
        <Button
          type="submit" variant="contained" size="large" disabled={loading}
          sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
        </Button>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          Already have an account?{' '}
          <Link component="button" type="button" onClick={onSwitchToLogin} sx={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </Typography>
      </Box>
    </AuthShell>
  );
};

export default RegisterPage;
