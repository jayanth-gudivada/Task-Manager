import React from 'react';
import { Box, Paper, Typography, Button, Chip } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';

// Phase 2 placeholder. The admin's Teams area will have two actions —
// "Create a new team" and "Manage existing teams" — with each team shown as a
// card (team name + a few member avatars), mirroring the task-card layout on
// the calendar. The edit action on a card is left as a stub for the next phase.
//
// This page only renders for admins (gated in App.jsx), and only lays out the
// shell so the navigation and structure exist to build on.

const MOCK_TEAMS = [
  { name: 'Design', members: ['AK', 'RP', 'JS'] },
  { name: 'Engineering', members: ['JG', 'MT', 'SD', 'RK'] },
];

const TeamCard = ({ team }) => (
  <Paper sx={{
    p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)', minWidth: 240, flex: '1 1 240px', maxWidth: 320,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{team.name}</Typography>
      <Chip label={`${team.members.length} members`} size="small"
        sx={{ bgcolor: 'primary.light', color: 'primary.main', fontWeight: 700 }} />
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {team.members.map((m) => (
        <Box key={m} sx={{
          width: 30, height: 30, borderRadius: '50%', bgcolor: 'secondary.main', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
        }}>{m}</Box>
      ))}
    </Box>
    {/* Edit action is a stub — real behavior designed in the next phase. */}
    <Button size="small" disabled sx={{ mt: 2, textTransform: 'none' }}>Edit (coming soon)</Button>
  </Paper>
);

const TeamsPage = () => (
  <Box sx={{ p: { xs: 2, md: 3 }, height: { xs: 'auto', md: 'calc(100vh - 70px)' }, overflowY: 'auto', bgcolor: '#f4f7f9' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <GroupsIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Teams</Typography>
          <Typography variant="body2" color="text.secondary">
            Admin area — create and manage team circles (Phase 2, in design).
          </Typography>
        </Box>
      </Box>
      <Button variant="contained" startIcon={<AddIcon />} disabled
        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
        Create a new team
      </Button>
    </Box>

    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {MOCK_TEAMS.map((t) => <TeamCard key={t.name} team={t} />)}
    </Box>
  </Box>
);

export default TeamsPage;
