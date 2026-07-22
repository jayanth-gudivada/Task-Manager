import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Snackbar, Alert, Chip } from '@mui/material';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useDispatch, useSelector } from 'react-redux';
import { selectTierColors, updateSettings } from '../store/settingsSlice';
import {
  DEFAULT_PRIORITY_COLOR,
  DEFAULT_IMPORTANT_COLOR,
  GENERAL_DEFAULT,
  isTooSimilar,
} from '../utils/TaskColors';

/**
 * Account Settings - lets the user choose the colors for the fixed
 * Priority and Important task tiers. These feed the dynamic reserved-color
 * guard so general tasks can never mimic them.
 */
const ColorField = ({ label, hint, value, onChange, isDefault }) => (
  <Box sx={{ flex: 1, minWidth: 220 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
      <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
        {label}
      </Typography>
      {/* Shown until the user picks and saves a color of their own. */}
      {isDefault && (
        <Chip
          label="System default"
          size="small"
          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#eef2ff', color: '#4f46e5' }}
        />
      )}
    </Box>
    <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem', mb: 1.5 }}>
      {hint}
    </Typography>
    <Box
      sx={{
        '& .react-colorful': { width: '100%', height: 160 },
        '& .react-colorful__saturation': { borderRadius: '10px 10px 0 0' },
        '& .react-colorful__last-control': { borderRadius: '0 0 10px 10px' },
      }}
    >
      <HexColorPicker color={value} onChange={onChange} />
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
      <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: value, border: '1px solid #e2e8f0', flexShrink: 0 }} />
      <HexColorInput
        color={value}
        onChange={onChange}
        prefixed
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '0.85rem',
          outline: 'none',
          textTransform: 'lowercase',
        }}
      />
    </Box>
  </Box>
);

const AccountSettingsPage = () => {
  const dispatch = useDispatch();
  const tierColors = useSelector(selectTierColors);

  const [priorityColor, setPriorityColor] = useState(tierColors.priorityColor);
  const [importantColor, setImportantColor] = useState(tierColors.importantColor);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { severity, message }

  // Keep local pickers in sync when settings load/refresh.
  useEffect(() => {
    setPriorityColor(tierColors.priorityColor);
    setImportantColor(tierColors.importantColor);
  }, [tierColors.priorityColor, tierColors.importantColor]);

  // Validate the two colors stay distinct from each other and from the
  // general-task default, so all three tiers remain visually separable.
  const validationError =
    isTooSimilar(priorityColor, importantColor)
      ? 'Priority and Important colors are too similar to each other.'
      : isTooSimilar(priorityColor, GENERAL_DEFAULT)
        ? 'Priority color is too close to the general-task color.'
        : isTooSimilar(importantColor, GENERAL_DEFAULT)
          ? 'Important color is too close to the general-task color.'
          : '';

  const isDirty =
    priorityColor.toLowerCase() !== tierColors.priorityColor.toLowerCase() ||
    importantColor.toLowerCase() !== tierColors.importantColor.toLowerCase();

  const handleSave = async () => {
    if (validationError) return;
    setSaving(true);
    try {
      // unwrap() surfaces the thunk's rejectWithValue message as a throw.
      await dispatch(updateSettings({ priorityColor, importantColor })).unwrap();
      setToast({ severity: 'success', message: 'Colors saved.' });
    } catch (err) {
      setToast({ severity: 'error', message: typeof err === 'string' ? err : 'Failed to save colors.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPriorityColor(DEFAULT_PRIORITY_COLOR);
    setImportantColor(DEFAULT_IMPORTANT_COLOR);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: { xs: 'auto', md: 'calc(100vh - 70px)' }, overflowY: 'auto', bgcolor: '#f4f7f9' }}>
      <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, maxWidth: 760, mx: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: 'none' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
          Account Settings
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mb: 3 }}>
          Choose the colors for Priority and Important tasks. General tasks are blocked from using colors that resemble these.
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <ColorField
            label="Priority Color"
            hint="Highest urgency tasks"
            value={priorityColor}
            onChange={setPriorityColor}
            isDefault={priorityColor.toLowerCase() === DEFAULT_PRIORITY_COLOR.toLowerCase()}
          />
          <ColorField
            label="Important Color"
            hint="Next-most urgent tasks"
            value={importantColor}
            onChange={setImportantColor}
            isDefault={importantColor.toLowerCase() === DEFAULT_IMPORTANT_COLOR.toLowerCase()}
          />
        </Box>

        {validationError && (
          <Alert severity="warning" sx={{ mt: 3, borderRadius: '10px', fontSize: '0.8rem' }}>
            {validationError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, mt: 3, justifyContent: 'flex-end' }}>
          <Button
            onClick={handleReset}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b', borderRadius: '10px', px: 2 }}
          >
            Reset to defaults
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !!validationError || !isDirty}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '10px',
              px: 4,
              bgcolor: 'primary.main',
              boxShadow: '0 4px 12px rgba(133, 41, 216, 0.2)',
              '&:hover': { bgcolor: '#7c3aed' },
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ borderRadius: '10px' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default AccountSettingsPage;
