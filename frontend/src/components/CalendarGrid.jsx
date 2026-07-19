import React from 'react';
import { Box, Paper, Typography, Tooltip } from '@mui/material';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, format,
  isSameDay, parseISO, startOfDay, isWithinInterval
} from 'date-fns';
import { getTaskColor } from '../utils/TaskColors';

const CalendarGrid = ({ currentDate, tasks = [] }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = 'd';
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const weekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  // A task shows a dot on every day of its startDate–endDate range;
  // tasks without a startDate (or with startDate after endDate) dot only the endDate.
  const getTasksForDay = (day) =>
    tasks?.filter(task => {
      if (task?.status !== 1 || !task?.endDate) return false;
      const end = startOfDay(parseISO(task.endDate));
      if (!task?.startDate) return isSameDay(day, end);
      const start = startOfDay(parseISO(task.startDate));
      if (start > end) return isSameDay(day, end);
      return isWithinInterval(day, { start, end });
    }) || [];

  // Helper functions removed in favor of shared utility

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Week Header */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 3 }}>
        {weekDays.map(day => (
          <Typography 
            key={day} 
            align="center" 
            variant="caption" 
            sx={{ 
              fontWeight: 900, 
              color: '#94a3b8', 
              letterSpacing: '0.05em',
              fontSize: '0.7rem'
            }}
          >
            {day}
          </Typography>
        ))}
      </Box>

      {/* Grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, 1fr)`,
        columnGap: 1,
        rowGap: 3,
        flexGrow: 1,
        minHeight: 0
      }}>
        {days.map((day) => {
          const isCurrentMonthDate = isSameMonth(day, monthStart);
          const isTodayDate = isToday(day);
          const dayTasks = getTasksForDay(day);

          return (
            <Box
              key={day.toString()}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: '60px',
                position: 'relative'
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: isTodayDate ? 'white' : (isCurrentMonthDate ? '#1e293b' : '#cbd5e1'),
                  bgcolor: isTodayDate ? '#8529d8' : 'transparent',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  mb: 0.5,
                  boxShadow: isTodayDate ? '0 8px 16px rgba(133, 41, 216, 0.3)' : 'none',
                  cursor: 'default',
                  transition: 'all 0.2s ease'
                }}
              >
                {format(day, dateFormat)}
              </Typography>
              
              {/* Deadline Dots */}
              <Box sx={{ 
                display: 'flex', 
                gap: 0.5, 
                justifyContent: 'center',
                flexWrap: 'wrap',
                maxWidth: '100%',
                mt: 0.5
              }}>
                {dayTasks.map((task) => (
                  <Tooltip 
                    key={task._id} 
                    title={task.title} 
                    arrow 
                    placement="top"
                  >
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.onEditTask) window.onEditTask(task);
                      }}
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor: getTaskColor(task.title, task.priority),
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.5)'
                        }
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default CalendarGrid;
