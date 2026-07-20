import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';
import Header from './components/Header';
import { API_URL } from './services/api';
import CalendarPage from './pages/CalendarPage';
import PerformancePage from './pages/PerformancePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import { IconButton, Tooltip } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#8529d8', // Purple accent
      light: '#f5f0ff',
    },
    secondary: {
      main: '#7c3aed',
    },
    background: {
      default: '#f8fafc', // Softer slate background
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.1rem' },
    h6: { fontWeight: 600, fontSize: '0.9rem' },
    subtitle1: { fontWeight: 700, fontSize: '0.8rem' },
    body1: { fontSize: '0.8rem', lineHeight: 1.4 },
    body2: { fontSize: '0.7rem', lineHeight: 1.4, color: '#64748b' },
    caption: { fontSize: '0.62rem', fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
});

import { TaskProvider, useTasks } from './context/TaskContext';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true); // Health loading

  useEffect(() => {
    // Check backend connection
    axios.get(`${API_URL}/health`)
      .then((res) => {
        setHealthStatus(res.data);
      })
      .catch((err) => {
        setHealthStatus({ status: 'error', message: err.message });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TaskProvider>
        <AppContent
          currentView={currentView}
          setCurrentView={setCurrentView}
          healthStatus={healthStatus}
          loading={loading}
        />
      </TaskProvider>
    </ThemeProvider>
  );
}

const AppContent = ({ currentView, setCurrentView, healthStatus, loading }) => {
  const { tasks, loadingTasks } = useTasks();
 
  return (
    <Box sx={{
      display: 'flex',
      height: { xs: 'auto', md: '100vh' },
      minHeight: '100vh',
      bgcolor: 'background.default',
      overflowX: 'hidden',
      overflowY: { xs: 'auto', md: 'hidden' }
    }}>
      {/* Sidebar Navigation */}
      <Sidebar activeView={currentView} onViewChange={setCurrentView} />
 
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        overflow: { xs: 'visible', md: 'hidden' },
        width: { xs: 'calc(100% - 64px)', md: 'calc(100% - 64px)' }
      }}>
        <Header
          taskCount={tasks.length}
          status={healthStatus?.status}
          loading={loading || loadingTasks}
        />
 
        <Box sx={{ flexGrow: 1, overflow: { xs: 'visible', md: 'hidden' } }}>
          {currentView === 'calendar' ? (
            <CalendarPage />
          ) : currentView === 'settings' ? (
            <AccountSettingsPage />
          ) : (
            <PerformancePage />
          )}
        </Box>
      </Box>
    </Box>
  );
};


const Sidebar = ({ activeView, onViewChange }) => {
  return (
    <Box sx={{
      width: 64,
      bgcolor: 'background.paper',
      borderRight: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      py: 2,
      gap: 3,
      zIndex: 1000
    }}>
      {/* Brand Icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          bgcolor: 'primary.main',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          mb: 2,
          boxShadow: '0 4px 12px rgba(133, 41, 216, 0.25)'
        }}
      >
        TM
      </Box>

      {/* Navigation Items */}
      <Tooltip title="Schedule" placement="right">
        <IconButton
          onClick={() => onViewChange('calendar')}
          sx={{
            color: activeView === 'calendar' ? 'primary.main' : 'text.secondary',
            bgcolor: activeView === 'calendar' ? 'primary.light' : 'transparent',
            borderRadius: '12px',
            '&:hover': { bgcolor: 'primary.light' }
          }}
        >
          <CalendarMonthIcon fontSize="medium" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Performance" placement="right">
        <IconButton
          onClick={() => onViewChange('performance')}
          sx={{
            color: activeView === 'performance' ? 'primary.main' : 'text.secondary',
            bgcolor: activeView === 'performance' ? 'primary.light' : 'transparent',
            borderRadius: '12px',
            '&:hover': { bgcolor: 'primary.light' }
          }}
        >
          <BarChartIcon fontSize="medium" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Account Settings" placement="right">
        <IconButton
          onClick={() => onViewChange('settings')}
          sx={{
            color: activeView === 'settings' ? 'primary.main' : 'text.secondary',
            bgcolor: activeView === 'settings' ? 'primary.light' : 'transparent',
            borderRadius: '12px',
            '&:hover': { bgcolor: 'primary.light' }
          }}
        >
          <SettingsIcon fontSize="medium" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default App;
