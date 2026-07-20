import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsService } from '../services/api';
import {
  configureTierColors,
  DEFAULT_PRIORITY_COLOR,
  DEFAULT_IMPORTANT_COLOR,
} from '../utils/TaskColors';

// Owns the user's tier colors (priority / important). On every change it also
// pushes the values into the shared color engine (configureTierColors) so the
// calendar renders with the right colors immediately.

export const fetchSettings = createAsyncThunk('settings/fetch', async (_, { rejectWithValue }) => {
  try {
    return await settingsService.getSettings();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load settings');
  }
});

export const updateSettings = createAsyncThunk('settings/update', async (colors, { rejectWithValue }) => {
  try {
    return await settingsService.updateSettings(colors);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save settings');
  }
});

function applyColors({ priorityColor, importantColor }) {
  configureTierColors({ priority: priorityColor, important: importantColor });
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    priorityColor: DEFAULT_PRIORITY_COLOR,
    importantColor: DEFAULT_IMPORTANT_COLOR,
    status: 'idle',
    error: null,
  },
  reducers: {
    // Reset to project-base defaults on logout so the next user doesn't inherit
    // the previous user's colors before their settings load.
    resetSettings(state) {
      state.priorityColor = DEFAULT_PRIORITY_COLOR;
      state.importantColor = DEFAULT_IMPORTANT_COLOR;
      state.status = 'idle';
      applyColors(state);
    },
  },
  extraReducers: (builder) => {
    const store = (state, { payload }) => {
      state.priorityColor = payload.priorityColor;
      state.importantColor = payload.importantColor;
      state.status = 'loaded';
      state.error = null;
      applyColors(state);
    };
    builder
      .addCase(fetchSettings.fulfilled, store)
      .addCase(fetchSettings.rejected, (s, a) => { s.error = a.payload; })
      .addCase(updateSettings.fulfilled, store)
      .addCase(updateSettings.rejected, (s, a) => { s.error = a.payload; });
  },
});

export const { resetSettings } = settingsSlice.actions;

export const selectTierColors = (state) => ({
  priorityColor: state.settings.priorityColor,
  importantColor: state.settings.importantColor,
});
export const selectSettingsError = (state) => state.settings.error;

export default settingsSlice.reducer;
