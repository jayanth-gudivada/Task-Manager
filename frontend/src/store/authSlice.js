import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../services/api';

const TOKEN_KEY = 'tm_token';

// Hydrate the session from localStorage so a refresh keeps the user logged in.
const savedToken = localStorage.getItem(TOKEN_KEY) || null;

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    return await authService.login(creds);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    return await authService.register(data);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

// Validate a persisted token on app boot; if it's stale, the 401 interceptor
// clears it and this simply resolves to logged-out.
export const loadMe = createAsyncThunk('auth/loadMe', async (_, { rejectWithValue }) => {
  try {
    return await authService.me();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Session expired');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: savedToken,
    // 'idle' until we know; 'checking' while validating a persisted token.
    status: savedToken ? 'checking' : 'idle',
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem(TOKEN_KEY);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const authed = (state, { payload }) => {
      state.user = payload.user;
      state.token = payload.token;
      state.status = 'authenticated';
      state.error = null;
      localStorage.setItem(TOKEN_KEY, payload.token);
    };

    builder
      .addCase(login.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(login.fulfilled, authed)
      .addCase(login.rejected, (s, a) => { s.status = 'idle'; s.error = a.payload; })

      .addCase(register.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(register.fulfilled, authed)
      .addCase(register.rejected, (s, a) => { s.status = 'idle'; s.error = a.payload; })

      // loadMe validates an existing token; it returns { user } only.
      .addCase(loadMe.fulfilled, (s, { payload }) => {
        s.user = payload.user;
        s.status = 'authenticated';
      })
      .addCase(loadMe.rejected, (s) => {
        s.user = null;
        s.token = null;
        s.status = 'idle';
        localStorage.removeItem(TOKEN_KEY);
      });
  },
});

export const { logout, clearError } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectIsAuthed = (state) => state.auth.status === 'authenticated';
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
