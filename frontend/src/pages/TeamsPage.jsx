import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Autocomplete, Snackbar, Alert,
  Skeleton, Tooltip, Avatar, AvatarGroup,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSelector } from 'react-redux';
import { teamService } from '../services/api';
import { selectIsAdmin, selectCanManageTeams } from '../store/authSlice';

const initials = (name = '?') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const TeamCard = ({ team, canManage, canDelete, onManage, onDelete }) => (
  <Paper sx={{
    p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)', minWidth: 260, flex: '1 1 280px', maxWidth: 360,
    display: 'flex', flexDirection: 'column',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{team.name}</Typography>
      <Chip label={`${team.members.length} member${team.members.length === 1 ? '' : 's'}`} size="small"
        sx={{ bgcolor: 'primary.light', color: 'primary.main', fontWeight: 700 }} />
    </Box>

    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 32 }}>
      {team.description || 'No description.'}
    </Typography>

    {team.members.length > 0 ? (
      <AvatarGroup max={6} sx={{ justifyContent: 'flex-start', '& .MuiAvatar-root': { width: 30, height: 30, fontSize: '0.7rem', fontWeight: 700 } }}>
        {team.members.map((m) => (
          <Tooltip key={m._id} title={`${m.name} · ${m.email}`}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>{initials(m.name)}</Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>
    ) : (
      <Typography variant="caption" color="text.secondary">No members yet.</Typography>
    )}

    {(canManage || canDelete) && (
      <Box sx={{ display: 'flex', gap: 1, mt: 2.5, justifyContent: 'flex-end' }}>
        {canManage && (
          <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => onManage(team)}
            sx={{ textTransform: 'none', fontWeight: 600 }}>
            Manage
          </Button>
        )}
        {canDelete && (
          <Tooltip title="Delete team">
            <IconButton size="small" color="error" onClick={() => onDelete(team)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    )}
  </Paper>
);

const TeamsPage = () => {
  const isAdmin = useSelector(selectIsAdmin);
  const canManage = useSelector(selectCanManageTeams);

  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // { mode: 'create' | 'edit', team? }
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (canManage) {
        // Managers see every team and need the full user list for the picker.
        const [teamList, userList] = await Promise.all([
          teamService.listTeams(),
          teamService.listAvailableUsers(),
        ]);
        setTeams(teamList);
        setUsers(userList);
      } else {
        // Plain users see only the teams they belong to (read-only).
        setTeams(await teamService.listMyTeams());
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved, mode) => {
    setTeams((prev) => (mode === 'create'
      ? [saved, ...prev]
      : prev.map((t) => (t._id === saved._id ? saved : t))));
    setDialog(null);
    setToast({ severity: 'success', message: mode === 'create' ? 'Team created.' : 'Team updated.' });
  };

  const handleDelete = async (team) => {
    if (!window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    try {
      await teamService.deleteTeam(team._id);
      setTeams((prev) => prev.filter((t) => t._id !== team._id));
      setToast({ severity: 'success', message: 'Team deleted.' });
    } catch (err) {
      setToast({ severity: 'error', message: err.response?.data?.message || 'Failed to delete team' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: { xs: 'auto', md: 'calc(100vh - 70px)' }, overflowY: 'auto', bgcolor: '#f4f7f9' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupsIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Teams</Typography>
            <Typography variant="body2" color="text.secondary">
              {canManage ? 'Create teams and manage their members.' : "Teams you're a part of."}
            </Typography>
          </Box>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ mode: 'create' })}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Create a new team
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={300} height={180} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      ) : teams.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
          <Typography color="text.secondary">
          {canManage ? 'No teams yet. Create your first team to get started.' : "You're not part of any team yet."}
        </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {teams.map((t) => (
            <TeamCard key={t._id} team={t} canManage={canManage} canDelete={isAdmin}
              onManage={(team) => setDialog({ mode: 'edit', team })} onDelete={handleDelete} />
          ))}
        </Box>
      )}

      {dialog && (
        <TeamDialog
          mode={dialog.mode}
          team={dialog.team}
          users={users}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
};

const TeamDialog = ({ mode, team, users, onClose, onSaved }) => {
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  // Preselect existing members (matched by id against the available-users list).
  const [members, setMembers] = useState(
    team ? users.filter((u) => team.members.some((m) => m._id === u._id)) : []
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setErr('Team name is required'); return; }
    setSaving(true);
    setErr('');
    const payload = { name: name.trim(), description: description.trim(), memberIds: members.map((m) => m._id) };
    try {
      const saved = mode === 'create'
        ? await teamService.createTeam(payload)
        : await teamService.updateTeam(team._id, payload);
      onSaved(saved, mode);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{mode === 'create' ? 'Create a new team' : 'Manage team'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {err && <Alert severity="error" sx={{ borderRadius: 2 }}>{err}</Alert>}
        <TextField label="Team name" value={name} onChange={(e) => setName(e.target.value)} size="small" fullWidth autoFocus />
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} size="small" fullWidth multiline rows={2} />
        <Autocomplete
          multiple
          options={users}
          value={members}
          onChange={(_, next) => setMembers(next)}
          getOptionLabel={(u) => `${u.name} (${u.email})`}
          isOptionEqualToValue={(o, v) => o._id === v._id}
          filterSelectedOptions
          renderTags={(value, getTagProps) =>
            value.map((u, index) => (
              <Chip {...getTagProps({ index })} key={u._id} avatar={<Avatar>{initials(u.name)}</Avatar>} label={u.name} size="small" />
            ))
          }
          renderInput={(params) => <TextField {...params} label="Members" placeholder="Add users…" size="small" />}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamsPage;
