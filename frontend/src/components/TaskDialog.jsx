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
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, isBefore, startOfDay, parseISO } from 'date-fns';

const TaskDialog = ({ open, onClose, onSave, onDelete, task, viewOnly = false }) => {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [priority, setPriority] = useState('general');
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
    } else {
      resetForm();
    }
  }, [task, open]);

  const resetForm = () => {
    setTaskName('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(new Date());
    setPriority('general');
    setError('');
  };

  const handleSave = () => {
    // Validation
    if (!taskName.trim()) return setError('Task Name is required');
    if (startDate && endDate && isBefore(startOfDay(endDate), startOfDay(startDate))) return setError('End Date cannot be before Start Date');

    const taskData = {
      title: taskName,
      description,
      startDate: startDate?.toISOString() || null,
      endDate: endDate?.toISOString() || null,
      priority,
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

          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 500 }}>Priority Level</InputLabel>
            <Select
              value={priority}
              label="Priority Level"
              onChange={(e) => setPriority(e.target.value)}
              disabled={viewOnly}
              sx={{ borderRadius: '10px', fontSize: '0.8rem' }}
            >
              <MenuItem value="general" sx={{ fontSize: '0.8rem' }}>General</MenuItem>
              <MenuItem value="priority" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>Priority</MenuItem>
            </Select>
          </FormControl>

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
