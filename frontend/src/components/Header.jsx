import { AppBar, Toolbar, Typography, Container, Box, Tooltip, CircularProgress, Skeleton } from '@mui/material';

const Header = ({ taskCount, status, loading }) => {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: 1000
      }}
    >
      <Box sx={{ px: 3 }}>
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: 70 }}>
          {/* Brand Logo & Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 0.5
                }}
              >
                TaskMaster
                <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>.</Typography>
              </Typography>
            </Box>
          </Box>

          {/* Right Side Stats & Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Task Counter */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Tasks
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={20} height={24} />
              ) : (
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mt: -0.5 }}>
                  {taskCount || 0}
                </Typography>
              )}
            </Box>

            <Box sx={{ width: '1px', height: '30px', bgcolor: 'divider' }} />

            {/* Backend Status Indicator */}
            <Tooltip title={loading ? "Connecting..." : status === 'ok' ? "Syncing with Cloud" : "Connection Error"}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {loading ? (
                  <CircularProgress size={16} thickness={6} />
                ) : (
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: status === 'ok' ? '#22c55e' : '#ef4444',
                      boxShadow: status === 'ok' ? '0 0 10px rgba(34, 197, 94, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.5)',
                      animation: status === 'ok' ? 'none' : 'pulse 2s infinite'
                    }}
                  />
                )}
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.85rem' }}>
                  {loading ? 'Syncing' : status === 'ok' ? 'Connected' : 'Offline'}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </Toolbar>
      </Box>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </AppBar>
  );
};

export default Header;
