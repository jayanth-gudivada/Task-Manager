import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid } from '@mui/material';
import CalendarHeader from '../components/CalendarHeader';
import CalendarGrid from '../components/CalendarGrid';
import TaskDialog from '../components/TaskDialog';
import UpcomingPanel from '../components/UpcomingPanel';
import { taskService } from '../services/api';

import { useTasks } from '../context/TaskContext';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const { tasks, loadingTasks: loading, fetchTasks, refreshAll } = useTasks();

  // Fetch tasks on initial load (Context handles first time check)
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Expose edit handler to window so CalendarGrid and UpcomingPanel can trigger it
  useEffect(() => {
    window.onEditTask = (task) => {
      setSelectedTask(task);
      setIsTaskDialogOpen(true);
    };
    return () => delete window.onEditTask;
  }, []);

  const handleSaveTask = async (taskData) => {
    try {
      selectedTask
        ? await taskService.updateTask(selectedTask?._id, taskData)
        : await taskService.createTask(taskData);

      // Refresh the global cache
      await refreshAll();
      setIsTaskDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to save task:", error);
      await refreshAll();
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await taskService.deleteTask(id);
      await refreshAll();
      setIsTaskDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to delete task:", error);
      await refreshAll();
    }
  };

  return (
    <Box sx={{
      flexGrow: 1,
      p: { xs: 1.5, md: 2 },
      display: 'flex',
      flexDirection: 'column',
      minHeight: { xs: 'auto', md: 'calc(100vh - 70px)' },
      height: { xs: 'auto', md: 'calc(100vh - 70px)' },
      overflowY: { xs: 'initial', md: 'hidden' },
      bgcolor: '#f4f7f9'
    }}>
      <Grid container spacing={2} sx={{ height: { xs: 'auto', md: '100%' }, width: '100%' }}>
        {/* Main Calendar Section */}
        <Grid size={{ xs: 12, md: 7.5 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', minWidth: 0 }}>
          <Paper sx={{
            p: { xs: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            borderRadius: 3,
            overflow: 'hidden',
            border: 'none',
            minWidth: 0,
            minHeight: { xs: '450px', md: 'auto' },
            '&:hover .calendar-scroll': {
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)' }
            }
          }}>
            <CalendarHeader
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              onOpenTaskDialog={() => {
                setSelectedTask(null);
                setIsTaskDialogOpen(true);
              }}
            />
            <Box
              className="calendar-scroll"
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                mt: 1,
                pr: 1,
                minWidth: 0,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'transparent', borderRadius: '10px' }
              }}
            >
              <CalendarGrid currentDate={currentDate} tasks={tasks} />
            </Box>
          </Paper>
        </Grid>
 
        {/* Sidebar Section */}
        <Grid size={{ xs: 12, md: 4.5 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: { xs: '300px', md: 'auto' } }}>
            <UpcomingPanel tasks={tasks} loading={loading} />
          </Box>
        </Grid>
      </Grid>

      <TaskDialog
        open={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={selectedTask}
      />
    </Box>
  );
};

export default CalendarPage;
