import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Popover
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { GENERAL_DEFAULT, isColorReserved, getPriorityColor, getImportantColor } from '../utils/TaskColors';

const TaskDialog = ({ open, onClose, onSave, onDelete, task, initialDate = null, viewOnly = false }) => {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [priority, setPriority] = useState('general');
  const [color, setColor] = useState(GENERAL_DEFAULT);
  const [colorError, setColorError] = useState('');
  const [colorAnchor, setColorAnchor] = useState(null);
  const [error, setError] = useState('');

  const isEditMode = !!task;

  // Pre-fill form if editing
  useEffect(() => {
    if (task) {
      setTaskName(task.title || '');
      setDescription(task.description || '');
      setStartDate(task.startDate ? parseISO(task.startDate) : new Date());
      setEndDate(task.endDate ? parseISO(task.endDate) : new Date());
      setPriority(task.priority || 'general');
      setColor(task.color || GENERAL_DEFAULT);
      setColorError('');
    } else {
      resetForm();
      // Creating from a clicked calendar day: prefill the date selection.
      if (initialDate) {
        setStartDate(initialDate);
        setEndDate(initialDate);
      }
    }
  }, [task, open, initialDate]);

  const resetForm = () => {
    setTaskName('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(new Date());
    setPriority('general');
    setColor(GENERAL_DEFAULT);
    setColorError('');
    setError('');
  };

  // Apply a color from the spectrum picker / hex input, guarding against
  // mimicking the reserved priority (red) / important (amber) tiers.
  const applyColor = (next) => {
    setColor(next); // reflect the live selection on the swatch/field
    setColorError(isColorReserved(next)
      ? 'Color reserved for priority/important tasks. Pick another.'
      : '');
  };

  const handleSave = () => {
    // Validation
    if (!taskName.trim()) return setError('Task Name is required');
    if (startDate && endDate && isBefore(startOfDay(endDate), startOfDay(startDate))) return setError('End Date cannot be before Start Date');
    if (priority === 'general' && colorError) return setError('Fix the task color before saving');

    const taskData = {
      title: taskName,
      description,
      startDate: startDate?.toISOString() || null,
      endDate: endDate?.toISOString() || null,
      priority,
      // Custom color only applies to general tasks; other tiers use fixed defaults.
      color: priority === 'general' ? color : null,
      ...(isEditMode ? { _id: task?._id } : {})
    };

    onSave(taskData);
    onClose();
  };

  const handleComplete = () => {
    onSave({ ...task, status: 0 }); // Status 0 = Completed
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs" // Smaller width for compressed look
      fullWidth
      disableScrollLock
      PaperProps={{
        sx: { borderRadius: '16px', boxShadow: '0 12px 40px rgba(133, 41, 216, 0.1)' }
      }}
    >
      <DialogTitle sx={{
        fontWeight: 600,
        color: '#8529d8',
        fontSize: '1.1rem',
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {viewOnly ? 'Task Details' : isEditMode ? 'Edit Task' : 'Create New Task'}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#94a3b8',
            '&:hover': { color: 'primary.main', bgcolor: 'primary.light' }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 0, px: 3, pb: viewOnly ? 4 : 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
          <TextField
            label="Task Name"
            fullWidth
            size="small" // Compressing scale
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            disabled={viewOnly}
            variant="outlined"
            placeholder="e.g., Weekly Sync"
            autoFocus
            InputLabelProps={{ sx: { fontSize: '0.75rem', fontWeight: 500 } }}
            InputProps={{ sx: { fontSize: '0.8rem' } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2} // Reduced rows
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={viewOnly}
            variant="outlined"
            placeholder="What needs to be done?"
            InputLabelProps={{ sx: { fontSize: '0.75rem', fontWeight: 500 } }}
            InputProps={{ sx: { fontSize: '0.8rem' } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'row' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ mb: 0.8, display: 'block', fontWeight: 600, color: '#94a3b8', fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                START DATE
              </Typography>
              <ReactDatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                dateFormat="dd/MM/yyyy"
                disabled={viewOnly}
                customInput={<TextField fullWidth size="small" disabled={viewOnly} sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.8rem' },
                  '& .MuiInputBase-input': { py: 0.8 }
                }} />}
                portalId="root-datepicker"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ mb: 0.8, display: 'block', fontWeight: 600, color: '#94a3b8', fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                END DATE
              </Typography>
              <ReactDatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                dateFormat="dd/MM/yyyy"
                minDate={startDate}
                disabled={viewOnly}
                customInput={<TextField fullWidth size="small" disabled={viewOnly} sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.8rem' },
                  '& .MuiInputBase-input': { py: 0.8 }
                }} />}
                portalId="root-datepicker"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 500 }}>Priority Level</InputLabel>
              <Select
                value={priority}
                label="Priority Level"
                onChange={(e) => setPriority(e.target.value)}
                disabled={viewOnly}
                sx={{ borderRadius: '10px', fontSize: '0.8rem' }}
              >
                <MenuItem value="general" sx={{ fontSize: '0.8rem' }}>General</MenuItem>
                <MenuItem value="important" sx={{ fontSize: '0.8rem', fontWeight: 600, color: getImportantColor() }}>Important</MenuItem>
                <MenuItem value="priority" sx={{ fontSize: '0.8rem', fontWeight: 600, color: getPriorityColor() }}>Priority</MenuItem>
              </Select>
            </FormControl>

            {/* Color picker: general tasks only. Priority/Important use fixed colors. */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <Box
                onClick={(e) => {
                  if (viewOnly || priority !== 'general') return;
                  setColorAnchor(e.currentTarget);
                }}
                title={priority === 'general' ? 'Pick a color for this task' : 'Color is fixed for priority/important tasks'}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  bgcolor: priority === 'priority' ? getPriorityColor() : priority === 'important' ? getImportantColor() : color,
                  cursor: (viewOnly || priority !== 'general') ? 'not-allowed' : 'pointer',
                  opacity: (viewOnly || priority !== 'general') ? 0.6 : 1,
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: (viewOnly || priority !== 'general') ? 'none' : 'scale(1.05)' }
                }}
              />
            </Box>
          </Box>

          <Popover
            open={Boolean(colorAnchor)}
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            PaperProps={{ sx: { p: 1.5, borderRadius: '12px' } }}
          >
            {/* Full spectrum picker (hex-only, no RGB) */}
            <Box
              sx={{
                '& .react-colorful': { width: 180, height: 150 },
                '& .react-colorful__saturation': { borderRadius: '8px 8px 0 0' },
                '& .react-colorful__last-control': { borderRadius: '0 0 8px 8px' },
              }}
            >
              <HexColorPicker color={color} onChange={applyColor} />
            </Box>
            <Box sx={{ mt: 1 }}>
              <HexColorInput
                color={color}
                onChange={applyColor}
                prefixed
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                  outline: 'none',
                  textTransform: 'lowercase',
                }}
              />
            </Box>
          </Popover>

          {colorError && (
            <Typography color="error" variant="caption" sx={{ mt: -1, fontWeight: 500, fontSize: '0.72rem' }}>
              {colorError}
            </Typography>
          )}

          {error && !error.includes('Name') && (
            <Typography color="error" variant="caption" sx={{ mt: 0, fontWeight: 500, fontSize: '0.75rem' }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>

      {!viewOnly && (
        <DialogActions sx={{ p: 4, pt: 2, gap: 2, justifyContent: 'center' }}>
          {isEditMode && (
            <>
              <Button
                onClick={() =>
                  window.confirm('Delete this task?')
                    ? (onDelete(task?._id), onClose())
                    : null
                }
                sx={{
                  fontWeight: 600,
                  color: '#ef4444',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  bgcolor: '#fff1f2',
                  px: 2,
                  borderRadius: '10px',
                  minWidth: '80px',
                  '&:hover': { bgcolor: '#ffe4e6' }
                }}
              >
                Delete
              </Button>
              <Button
                onClick={handleComplete}
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  color: '#16a34a',
                  borderColor: '#bcf0da',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  px: 2,
                  borderRadius: '10px',
                  minWidth: '100px',
                  '&:hover': { bgcolor: '#f0fdf4', borderColor: '#86efac' }
                }}
              >
                Complete
              </Button>
            </>
          )}

          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              fontWeight: 600,
              borderRadius: '10px',
              px: 5,
              textTransform: 'none',
              fontSize: '0.85rem',
              bgcolor: 'primary.main',
              minWidth: '100px',
              boxShadow: '0 4px 12px rgba(133, 41, 216, 0.2)',
              '&:hover': {
                bgcolor: '#7c3aed',
                boxShadow: '0 8px 20px rgba(133, 41, 216, 0.3)'
              }
            }}
          >
            {isEditMode ? 'Update' : 'Submit'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default TaskDialog;
