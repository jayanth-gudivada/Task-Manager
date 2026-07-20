import React, { useEffect, useState } from 'react';
import {
  ThemeProvider, createTheme, CssBaseline, Box, CircularProgress,
  IconButton, Tooltip, Avatar, Menu, MenuItem, Typography, Divider,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import LogoutIcon from '@mui/icons-material/Logout';

import Header from './components/Header';
import CalendarPage from './pages/CalendarPage';
import PerformancePage from './pages/PerformancePage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import TeamsPage from './pages/TeamsPage';
import UserManagementPage from './pages/UserManagementPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import { TaskProvider, useTasks } from './context/TaskContext';
import {
  loadMe, logout, selectIsAuthed, selectAuthStatus, selectIsAdmin, selectUser,
} from './store/authSlice';
import { fetchSettings, resetSettings } from './store/settingsSlice';

const theme = createTheme({
  palette: {
    primary: { main: '#8529d8', light: '#f5f0ff' },
    secondary: { main: '#7c3aed' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#64748b' },
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
  shape: { borderRadius: 8 },
});

function App() {
  const dispatch = useDispatch();
  const authStatus = useSelector(selectAuthStatus);
  const isAuthed = useSelector(selectIsAuthed);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  // On boot: if a persisted token exists (status 'checking'), validate it.
  useEffect(() => {
    if (authStatus === 'checking') dispatch(loadMe());
  }, [authStatus, dispatch]);

  // A 401 anywhere clears the token and fires this event → drop to logged-out.
  useEffect(() => {
    const onExpired = () => {
      dispatch(logout());
      dispatch(resetSettings());
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [dispatch]);

  // Once authenticated, load this user's color settings.
  useEffect(() => {
    if (isAuthed) dispatch(fetchSettings());
  }, [isAuthed, dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {authStatus === 'checking' ? (
        <FullScreenSpinner />
      ) : isAuthed ? (
        <TaskProvider>
          <AppContent />
        </TaskProvider>
      ) : authView === 'register' ? (
        <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
      ) : (
        <LoginPage onSwitchToRegister={() => setAuthView('register')} />
      )}
    </ThemeProvider>
  );
}

const FullScreenSpinner = () => (
  <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress />
  </Box>
);

const AppContent = () => {
  const [currentView, setCurrentView] = useState('calendar');
  const { tasks, loadingTasks } = useTasks();

  return (
    <Box sx={{
      display: 'flex',
      height: { xs: 'auto', md: '100vh' },
      minHeight: '100vh',
      bgcolor: 'background.default',
      overflowX: 'hidden',
      overflowY: { xs: 'auto', md: 'hidden' },
    }}>
      <Sidebar activeView={currentView} onViewChange={setCurrentView} />

      <Box sx={{
        display: 'flex', flexDirection: 'column', flexGrow: 1,
        overflow: { xs: 'visible', md: 'hidden' },
        width: { xs: 'calc(100% - 64px)', md: 'calc(100% - 64px)' },
      }}>
        <Header taskCount={tasks.length} status="ok" loading={loadingTasks} />

        <Box sx={{ flexGrow: 1, overflow: { xs: 'visible', md: 'hidden' } }}>
          {currentView === 'calendar' && <CalendarPage />}
          {currentView === 'performance' && <PerformancePage />}
          {currentView === 'settings' && <AccountSettingsPage />}
          {currentView === 'teams' && <TeamsPage />}
          {currentView === 'users' && <UserManagementPage />}
        </Box>
      </Box>
    </Box>
  );
};

const NavButton = ({ title, active, onClick, children }) => (
  <Tooltip title={title} placement="right">
    <IconButton
      onClick={onClick}
      sx={{
        color: active ? 'primary.main' : 'text.secondary',
        bgcolor: active ? 'primary.light' : 'transparent',
        borderRadius: '12px',
        '&:hover': { bgcolor: 'primary.light' },
      }}
    >
      {children}
    </IconButton>
  </Tooltip>
);

const Sidebar = ({ activeView, onViewChange }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const [anchor, setAnchor] = useState(null);

  const initials = (user?.name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = () => {
    setAnchor(null);
    dispatch(logout());
    dispatch(resetSettings());
  };

  return (
    <Box sx={{
      width: 64, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider',
      display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 3, zIndex: 1000,
    }}>
      <Box sx={{
        width: 40, height: 40, bgcolor: 'primary.main', borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', mb: 2, boxShadow: '0 4px 12px rgba(133, 41, 216, 0.25)',
      }}>TM</Box>

      <NavButton title="Schedule" active={activeView === 'calendar'} onClick={() => onViewChange('calendar')}>
        <CalendarMonthIcon fontSize="medium" />
      </NavButton>

      <NavButton title="Performance" active={activeView === 'performance'} onClick={() => onViewChange('performance')}>
        <BarChartIcon fontSize="medium" />
      </NavButton>

      <NavButton title="Account Settings" active={activeView === 'settings'} onClick={() => onViewChange('settings')}>
        <SettingsIcon fontSize="medium" />
      </NavButton>

      {/* Admin-only menus. */}
      {isAdmin && (
        <NavButton title="User Management" active={activeView === 'users'} onClick={() => onViewChange('users')}>
          <PeopleAltIcon fontSize="medium" />
        </NavButton>
      )}
      {isAdmin && (
        <NavButton title="Teams" active={activeView === 'teams'} onClick={() => onViewChange('teams')}>
          <GroupsIcon fontSize="medium" />
        </NavButton>
      )}

      {/* User menu pinned to the bottom. */}
      <Box sx={{ mt: 'auto' }}>
        <Tooltip title={user?.name || 'Account'} placement="right">
          <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: '0.8rem', fontWeight: 700 }}>
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{user?.name}</Typography>
            <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            {isAdmin && <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>ADMIN</Typography>}
          </Box>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ gap: 1.5, mt: 0.5 }}>
            <LogoutIcon fontSize="small" /> Sign out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default App;
