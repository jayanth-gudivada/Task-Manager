import React from 'react';
import { Box, Typography, Chip, Paper, Skeleton } from '@mui/material';
import { differenceInDays, parseISO, startOfDay, format, isAfter, differenceInHours, isSameDay } from 'date-fns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import EngineeringIcon from '@mui/icons-material/Engineering';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { getTaskColor } from '../utils/TaskColors';

const UpcomingPanel = ({ tasks = [], loading }) => {
  const today = new Date();
  const startOfToday = startOfDay(today);

  // Robustly filter and sort tasks
  const upcomingTasks = (Array.isArray(tasks) ? tasks : [])
    .filter(task => {
      if (!task.endDate || task.status === 0) return false;
      try {
        const date = parseISO(task.endDate);
        if (isNaN(date.getTime())) return false; 
        return isAfter(date, startOfToday) || isSameDay(date, startOfToday);
      } catch (e) {
        return false;
      }
    })
    .sort((a, b) => {
      // 1. Priority tasks first
      if (a.priority === 'priority' && b.priority !== 'priority') return -1;
      if (a.priority !== 'priority' && b.priority === 'priority') return 1;
      
      // 2. Then by deadline
      try {
        return parseISO(a.endDate) - parseISO(b.endDate);
      } catch (e) {
        return 0;
      }
    });

  const getUrgencyData = (task) => {
    const end = parseISO(task.endDate);
    const todayEnd = startOfDay(new Date());
    const diffDays = differenceInDays(startOfDay(end), todayEnd);
    
    // Icon based on priority
    const icon = task?.priority === 'priority' ? <RocketLaunchIcon /> : <EngineeringIcon />;

    return diffDays === 0 
      ? { label: 'Due Today', color: '#7c3aed', icon, bg: '#f5f0ff', border: '#7c3aed' }
      : diffDays === 1 
        ? { label: 'Due Tomorrow', color: '#8b5cf6', icon, bg: '#f5f0ff', border: '#8b5cf6' }
        : { label: `Due in ${diffDays} days`, color: '#6366f1', icon, bg: '#f0f4ff', border: '#6366f1' };
  };

  const getCategory = (task) => {
    if (task.priority === 'priority') return 'Priority';
    const title = (task.title || '').toLowerCase();
    if (title.includes('review') || title.includes('payroll')) return 'Finance';
    if (title.includes('ux') || title.includes('onboarding') || title.includes('senior')) return 'Recruitment';
    if (title.includes('policy') || title.includes('remote')) return 'Legal';
    return 'General';
  };

  return (
    <Box sx={{ 
      height: { xs: 'auto', md: '100%' }, 
      minHeight: { xs: '300px', md: '100%' },
      display: 'flex', 
      flexDirection: 'column', 
      p: 1, 
      width: '100%', 
      minWidth: 0, 
      overflow: 'hidden' 
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
          Up Next
        </Typography>
        <Box sx={{ 
          px: 1, 
          py: 0.4, 
          bgcolor: '#f5f0ff', 
          borderRadius: '6px',
          border: '1px solid #e9d5ff'
        }}>
          <Typography sx={{ 
            fontWeight: 700, 
            fontSize: '0.6rem', 
            color: '#8529d8', 
            letterSpacing: '0.05em'
          }}>
            URGENT FOCUS
          </Typography>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1.5, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          px: 1,
          pb: 2
        }}>
          {Array.from(new Array(4)).map((_, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                display: 'flex',
                height: 120,
                width: '100%',
                borderRadius: '12px',
                bgcolor: 'white',
                border: '1px solid #f1f5f9',
                p: 1.5,
                gap: 1.5
              }}
            >
              <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: '8px' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="90%" height={20} />
                <Skeleton variant="text" width="70%" height={20} />
                <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                  <Skeleton variant="circular" width={12} height={12} />
                  <Skeleton variant="text" width={80} height={16} />
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : upcomingTasks.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No upcoming deadlines.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1.5, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          px: 1, 
          pb: 2,
          minWidth: 0,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'transparent' },
          '&:hover::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '10px' }
        }}>
          {upcomingTasks.map((task) => {
            const urgency = getUrgencyData(task);
            const category = getCategory(task);
            const taskColor = getTaskColor(task.title, task.priority);
            const isPriority = task.priority === 'priority';
            
            return (
              <Paper
                key={task._id}
                elevation={0}
                onClick={() => window.onEditTask && window.onEditTask(task)}
                sx={{
                  display: 'flex',
                  height: 120, // RIGID FIXED HEIGHT
                  width: '100%',
                  minWidth: 0,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  bgcolor: 'white',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  border: isPriority ? '1px solid #fee2e2' : '1px solid #f1f5f9',
                  '&:hover': {
                    boxShadow: isPriority ? '0 8px 16px rgba(239, 68, 68, 0.08)' : `0 8px 16px ${taskColor}15`,
                    transform: 'translateY(-2px)',
                    bgcolor: isPriority ? '#fffafb' : 'white'
                  }
                }}
              >
                {/* Visual Left Accent (Synced with Calendar Dot) */}
                <Box sx={{ width: 4, bgcolor: taskColor, flexShrink: 0 }} />
                
                <Box sx={{ p: 1.5, flexGrow: 1, display: 'flex', gap: 1.5, overflow: 'hidden', minWidth: 0 }}>
                  {/* Icon Box (Fixed Position) */}
                  <Box sx={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '8px', 
                    bgcolor: `${taskColor}15`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.2
                  }}>
                    {React.cloneElement(urgency.icon, { sx: { fontSize: 18, color: taskColor } })}
                  </Box>

                  {/* Structured Content Area */}
                  <Box sx={{ 
                    flexGrow: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%', 
                    overflow: 'hidden',
                    minWidth: 0,
                    alignItems: 'flex-start' // Ensure all internal content aligns left
                  }}>
                    
                    {/* 1. HEADER (Fixed) */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, flexShrink: 0, width: '100%', minWidth: 0 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: '#1e293b', 
                          lineHeight: 1.2, 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          flexGrow: 1,
                          minWidth: 0,
                          mr: 1,
                          textAlign: 'left'
                        }}
                      >
                        {task.title}
                      </Typography>
                      <Chip 
                        label={category} 
                        size="small" 
                        sx={{ 
                          height: 16, 
                          fontSize: '0.55rem', 
                          fontWeight: 700, 
                          color: category === 'Priority' ? '#ef4444' : '#64748b', 
                          bgcolor: category === 'Priority' ? '#fee2e2' : '#f1f5f9',
                          borderRadius: '4px',
                          flexShrink: 0
                        }} 
                      />
                    </Box>

                    {/* 2. BODY (Scrollable on hover) */}
                    <Box 
                      sx={{ 
                        flexGrow: 1, 
                        overflowY: 'auto', 
                        mb: 0.5,
                        pr: 0.5,
                        width: '100%',
                        '&::-webkit-scrollbar': { width: '2px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'transparent' },
                        '&:hover::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '10px' }
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#64748b', 
                          lineHeight: 1.3, 
                          fontSize: '0.68rem',
                          wordBreak: 'break-word',
                          textAlign: 'left' // Explicit left align
                        }}
                      >
                        {task.description || 'No description provided.'}
                      </Typography>
                    </Box>

                    {/* 3. FOOTER (Fixed) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 'auto', width: '100%', justifyContent: 'flex-start' }}>
                      <AccessTimeIcon sx={{ fontSize: 12, color: urgency.color }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: urgency.color, fontSize: '0.62rem', textAlign: 'left' }}>
                        {urgency.label}
                      </Typography>
                    </Box>

                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default UpcomingPanel;
