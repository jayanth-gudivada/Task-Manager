import React, { useState, useEffect } from 'react';
import { Box, Paper, Grid, Tabs, Tab } from '@mui/material';
import CalendarHeader from '../components/CalendarHeader';
import CalendarGrid from '../components/CalendarGrid';
import TaskDialog from '../components/TaskDialog';
import UpcomingPanel from '../components/UpcomingPanel';
import ApprovalPanel from '../components/ApprovalPanel';
import ReassignPanel from '../components/ReassignPanel';
import { taskService } from '../services/api';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/authSlice';

import { useTasks } from '../context/TaskContext';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null); // Prefill start date when creating from a day cell
  const [dialogViewOnly, setDialogViewOnly] = useState(false); // Assigned-tab tasks are read-only
  const [activeTab, setActiveTab] = useState(0); // 0 = My Tasks, 1 = Tasks Assigned
  const me = useSelector(selectUser);
  const {
    tasks, loadingTasks: loading, fetchTasks,
    assignedTasks, loadingAssigned, fetchAssignedTasks,
    approvalPending, waitingApproval, reassignTasks, fetchApprovals,
    refreshAll,
  } = useTasks();

  // Fetch all task lists on initial load (Context handles first-time checks).
  useEffect(() => {
    fetchTasks();
    fetchAssignedTasks();
    fetchApprovals();
  }, [fetchTasks, fetchAssignedTasks, fetchApprovals]);

  // Approval workflow actions — refresh every list afterwards.
  const handleAccept = async (id) => { await taskService.acceptTask(id); await refreshAll(); };
  const handleRequestChange = async (id, remark) => { await taskService.requestChange(id, remark); await refreshAll(); };
  const handleResubmit = async (id, changes) => { await taskService.resubmitTask(id, changes); await refreshAll(); };
  const handleReject = async (id, remark) => { await taskService.rejectTask(id, remark); await refreshAll(); };
  const handleReassign = async (id, changes) => { await taskService.reassignTask(id, changes); await refreshAll(); };

  // Expose handlers to window so CalendarGrid and UpcomingPanel can trigger them.
  useEffect(() => {
    // Edit an existing task (dot / card click).
    window.onEditTask = (task) => {
      setSelectedTask(task);
      setSelectedDate(null);
      setDialogViewOnly(false);
      setIsTaskDialogOpen(true);
    };
    // View a task read-only (tasks I assigned to others — not editable by me).
    window.onViewTask = (task) => {
      setSelectedTask(task);
      setSelectedDate(null);
      setDialogViewOnly(true);
      setIsTaskDialogOpen(true);
    };
    // Create a new task on a clicked day, with its start date prefilled.
    window.onSelectDate = (date) => {
      setSelectedTask(null);
      setSelectedDate(date);
      setIsTaskDialogOpen(true);
    };
    return () => {
      delete window.onEditTask;
      delete window.onViewTask;
      delete window.onSelectDate;
    };
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
        <Grid size={{ xs: 12, md: 5 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', minWidth: 0 }}>
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
                setSelectedDate(null);
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
 
        {/* Sidebar Section — tabbed: My Tasks / Tasks Assigned */}
        <Grid size={{ xs: 12, md: 7 }} sx={{ height: { xs: 'auto', md: '100%' }, display: 'flex', minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 1, minHeight: 40,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 40, fontSize: '0.85rem' },
              }}
            >
              <Tab label={`My Tasks${tasks.length ? ` (${tasks.length})` : ''}`} />
              <Tab label={`Tasks Assigned${assignedTasks.length ? ` (${assignedTasks.length})` : ''}`} />
              <Tab label={`Approval Pending${approvalPending.length ? ` (${approvalPending.length})` : ''}`} />
              <Tab label={`Waiting for Approval${waitingApproval.length ? ` (${waitingApproval.length})` : ''}`} />
              <Tab label={`Reassign Task${reassignTasks.length ? ` (${reassignTasks.length})` : ''}`} />
            </Tabs>
            <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
              {activeTab === 0 && <UpcomingPanel tasks={tasks} loading={loading} />}
              {activeTab === 1 && <UpcomingPanel tasks={assignedTasks} loading={loadingAssigned} context="assigned" />}
              {activeTab === 2 && (
                <ApprovalPanel tasks={approvalPending} mode="pending" me={me}
                  onAccept={handleAccept} onRequestChange={handleRequestChange}
                  onReject={handleReject} onResubmit={handleResubmit} />
              )}
              {activeTab === 3 && (
                <ApprovalPanel tasks={waitingApproval} mode="waiting" me={me} />
              )}
              {activeTab === 4 && (
                <ReassignPanel tasks={reassignTasks} me={me} onReassign={handleReassign} />
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      <TaskDialog
        open={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
          setSelectedDate(null);
          setDialogViewOnly(false);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onRequestChange={handleRequestChange}
        task={selectedTask}
        initialDate={selectedDate}
        viewOnly={dialogViewOnly}
      />
    </Box>
  );
};

export default CalendarPage;
