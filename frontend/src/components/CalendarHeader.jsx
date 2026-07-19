import React from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';

const CalendarHeader = ({ currentDate, setCurrentDate, onOpenTaskDialog }) => {
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', letterSpacing: '-0.02em' }}>
        Schedule
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Navigation Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <IconButton onClick={handlePrevMonth} size="small" sx={{ color: '#64748b' }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>

          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', minWidth: 100, textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy')}
          </Typography>

          <IconButton onClick={handleNextMonth} size="small" sx={{ color: '#64748b' }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>

        <Button
          variant="contained"
          onClick={onOpenTaskDialog}
          startIcon={<AddIcon />}
          sx={{
            bgcolor: '#8529d8',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '0.75rem',
            px: 3,
            textTransform: 'none',
            '&:hover': { bgcolor: '#7c3aed' },
            boxShadow: '0 4px 12px rgba(133, 41, 216, 0.15)'
          }}
        >
          Create Task
        </Button>
      </Box>
    </Box>
  );
};

export default CalendarHeader;
