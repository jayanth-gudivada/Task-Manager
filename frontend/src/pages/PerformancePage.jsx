import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  TablePagination,
  CircularProgress,
  Chip,
  Button,
  Skeleton,
  IconButton
} from '@mui/material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { 
  FileDownload as ExportIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  MoreVert as MenuIcon,
  Description as FileIcon,
  AssignmentTurnedIn as CompletedIcon,
  TrendingUp as RateIcon
} from '@mui/icons-material';
import { Tooltip as MuiTooltip } from '@mui/material';
import TaskDialog from '../components/TaskDialog';
import { API_URL } from '../services/api';

// Move MetricCard above PerformancePage to avoid initialization errors
const MetricCard = ({ title, value, icon, subtitle, color, progress, label, loading }) => (
  <Card 
    elevation={0} 
    sx={{ 
      border: '1px solid', 
      borderColor: 'divider', 
      borderRadius: '20px', // Slightly more compact radius
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      p: 3, // Reduced padding
      bgcolor: 'white',
      height: '100%',
      flex: 1,
      maxWidth: '500px',
      minHeight: '160px', // Slightly shorter
      display: 'flex',
      flexDirection: 'column',
      '&:hover': {
        boxShadow: `0 8px 24px rgba(133, 41, 216, 0.06)`,
      }
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}> {/* Reduced gap and mb */}
      <Box 
        sx={{ 
          p: 1.5, // Tighter icon box
          bgcolor: `${color}15`, 
          borderRadius: '12px', 
          display: 'flex',
          color: color
        }}
      >
        {loading ? <Skeleton variant="circular" width={24} height={24} /> : (icon && React.isValidElement(icon) ? React.cloneElement(icon, { sx: { fontSize: 24, color: color } }) : null)}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', fontSize: '0.65rem', mb: 0.2, fontFamily: '"Outfit", sans-serif' }}>
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={100} height={32} />
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
            {value}
          </Typography>
        )}
      </Box>
    </Box>
 
    <Box sx={{ position: 'relative', mt: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.65rem' }}>
          {loading ? <Skeleton variant="text" width={80} /> : subtitle}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.65rem' }}>
          {loading ? <Skeleton variant="text" width={60} /> : label}
        </Typography>
      </Box>
      <Box sx={{ height: 4, bgcolor: '#f1f5f9', borderRadius: 3, width: '100%' }}> {/* Thinner progress bar */}
        {loading ? (
          <Skeleton variant="rectangular" height={4} sx={{ borderRadius: 3 }} />
        ) : (
          <Box sx={{ 
            height: '100%', 
            bgcolor: color, 
            borderRadius: 3, 
            width: `${Math.min(100, Math.max(0, progress || 0))}%`,
            transition: 'width 1s ease-in-out',
            boxShadow: `0 0 8px ${color}30`
          }} />
        )}
      </Box>
    </Box>
  </Card>
);

import { useTasks } from '../context/TaskContext';

const PerformancePage = () => {
  const { 
    stats, 
    fetchStats, 
    loadingStats,
    completedTasks, 
    totalCompletedCount: totalCount, 
    fetchCompletedTasks, 
    loadingHistory: loading 
  } = useTasks();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCompletedTasks(page, rowsPerPage);
  }, [fetchStats, fetchCompletedTasks, page, rowsPerPage]);

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks/completed?limit=all`);
      const allTasks = res.data.tasks.map(t => ({
        'Task Name': t.title,
        'Description': t.description,
        'Start Date': format(parseISO(t.startDate), 'MMM dd, yyyy'),
        'Deadline': format(parseISO(t.endDate), 'MMM dd, yyyy'),
        'Completed At': format(parseISO(t.completedAt), 'MMM dd, yyyy HH:mm'),
        'Priority': t.priority,
        'Status': new Date(t.completedAt) <= new Date(t.endDate) ? 'On Time' : 'Delayed'
      }));

      const ws = XLSX.utils.json_to_sheet(allTasks);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Completed Tasks');
      XLSX.writeFile(wb, `TaskMaster_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleViewDetails = (task) => {
    setSelectedTaskDetails(task);
    setIsDialogOpen(true);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    fetchTasks(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
  };

  return (
    <Box sx={{ p: { xs: 3, md: 4 }, height: '100%', overflowY: 'auto', bgcolor: '#f8fafc' }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700, 
            color: '#1e293b', 
            mb: 0.5, 
            letterSpacing: '-0.01em',
            fontFamily: '"Outfit", sans-serif',
            fontSize: '1.2rem'
          }}
        >
          Performance Analytics
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#64748b', 
            fontWeight: 500,
            maxWidth: '800px',
            lineHeight: 1.4,
            fontSize: '0.75rem'
          }}
        >
          Track individual task completion metrics and analyze your performance trends across the TaskMaster portal.
        </Typography>
      </Box>
 
      {/* Metrics Row */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <MetricCard 
              title="TOTAL FINISHED" 
              value={`${stats?.totalCompleted || 0} / ${(stats?.totalCompleted || 0) + (stats?.totalActive || 0)}`} 
              icon={<CompletedIcon />}
              subtitle="Overall task completion ratio"
              color="#8529d8"
              progress={(((stats?.totalCompleted || 0) / ((stats?.totalCompleted || 0) + (stats?.totalActive || 0) || 1)) * 100)}
              label={`${Math.round(((stats?.totalCompleted || 0) / ((stats?.totalCompleted || 0) + (stats?.totalActive || 0) || 1)) * 100)}% achieved`}
              loading={loadingStats}
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
            <MetricCard 
              title="COMPLETION RATE" 
              value={`${stats?.completionRate || 0}%`} 
              icon={<RateIcon />}
              subtitle="Tasks completed on or before deadline"
              color="#8529d8"
              progress={stats?.completionRate || 0}
              label={`${stats?.completionRate || 0}% on-time efficiency`}
              loading={loadingStats}
            />
          </Grid>
        </Grid>
      </Box>
 
      {/* Table Section */}
      <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'white' }}>
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', fontFamily: '"Outfit", sans-serif' }}>
            Completion History
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button 
              onClick={handleExport}
              size="small"
              startIcon={<ExportIcon sx={{ fontSize: 16 }} />}
              sx={{ 
                color: '#8529d8', 
                fontWeight: 600, 
                textTransform: 'none',
                fontSize: '0.75rem',
                border: '1px solid',
                borderColor: 'rgba(133, 41, 216, 0.2)',
                borderRadius: '8px',
                px: 1.5,
                '&:hover': { bgcolor: 'rgba(133, 41, 216, 0.05)', borderColor: '#8529d8' }
              }}
            >
              Export Report
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small"><FilterIcon sx={{ color: '#94a3b8' }} /></IconButton>
              <IconButton size="small"><MenuIcon sx={{ color: '#94a3b8' }} /></IconButton>
            </Box>
          </Box>
        </Box>
        
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', py: 1.5, fontFamily: '"Outfit", sans-serif' }}>Task Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', py: 1.5, fontFamily: '"Outfit", sans-serif' }}>Deadline</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', py: 1.5, fontFamily: '"Outfit", sans-serif' }}>Completed At</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', py: 1.5, fontFamily: '"Outfit", sans-serif' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', py: 1.5, fontFamily: '"Outfit", sans-serif' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from(new Array(rowsPerPage)).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ py: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: '8px' }} />
                        <Skeleton variant="text" width="60%" height={24} />
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width="80%" height={20} /></TableCell>
                    <TableCell><Skeleton variant="text" width="80%" height={20} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: '8px' }} /></TableCell>
                    <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ ml: 'auto' }} /></TableCell>
                  </TableRow>
                ))
              ) : (completedTasks || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><Typography variant="body2" color="text.secondary">No additional task records found for this period.</Typography></TableCell></TableRow>
              ) : (
                (completedTasks || []).map((task) => (
                  <TableRow key={task._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ py: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: '8px', color: '#94a3b8', display: 'flex' }}>
                          <FileIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{task.title}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>{task.endDate ? format(parseISO(task.endDate), 'MMM dd, yyyy') : '--'}</TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>{task.completedAt ? format(parseISO(task.completedAt), 'MMM dd, yyyy HH:mm') : '--'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={task.completedAt && task.endDate && new Date(task.completedAt) <= new Date(task.endDate) ? 'On Time' : 'Delayed'} 
                        size="small"
                        sx={{ 
                          fontWeight: 700, fontSize: '0.65rem',
                          bgcolor: task.completedAt && task.endDate && new Date(task.completedAt) <= new Date(task.endDate) ? '#f0fdf4' : '#fef2f2',
                          color: task.completedAt && task.endDate && new Date(task.completedAt) <= new Date(task.endDate) ? '#16a34a' : '#ef4444',
                          borderRadius: '8px'
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleViewDetails(task)} size="small" sx={{ color: '#94a3b8', '&:hover': { color: 'primary.main', bgcolor: 'primary.light' } }}>
                        <ViewIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
            Showing {(completedTasks || []).length} of {totalCount || 0} task{(totalCount || 0) !== 1 ? 's' : ''}
          </Typography>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ border: 'none', '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { display: 'none' } }}
          />
        </Box>
      </Paper>

      {/* Task Insight Dialog */}
      <TaskDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedTaskDetails(null);
        }}
        task={selectedTaskDetails}
        viewOnly={true}
        onSave={() => {}} // Not needed but satisfies prop typing
        onDelete={() => {}} // Not needed but satisfies prop typing
      />
    </Box>
  );
};

export default PerformancePage;
