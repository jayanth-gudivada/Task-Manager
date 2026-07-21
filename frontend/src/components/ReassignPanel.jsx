import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, Divider,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { format, parseISO } from 'date-fns';
import { teamService } from '../services/api';

const fmt = (d) => { try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return '—'; } };

const lastReject = (task) => {
  const rejects = (task.remarks || []).filter((r) => r.type === 'reject');
  return rejects.length ? rejects[rejects.length - 1] : (task.remarks || []).slice(-1)[0] || null;
};

const ReassignDialog = ({ task, members, onClose, onReassign }) => {
  const [assigneeId, setAssigneeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const reject = lastReject(task);

  const submit = async () => {
    if (!assigneeId) { setErr('Select a member to reassign to'); return; }
    setBusy(true); setErr('');
    try { await onReassign(task._id, { assigneeId, teamId: task.teamId }); onClose(); }
    catch (e) { setErr(e?.response?.data?.message || 'Failed to reassign'); setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Reassign task</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {reject && (
          <Box sx={{ mb: 2, p: 1.2, borderRadius: '10px', bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#b91c1c' }}>
              Rejected by {reject.byName || 'the assignee'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#7f1d1d', mt: 0.5 }}>{reject.text}</Typography>
          </Box>
        )}
        <Divider sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{task.title}</Typography>
        <Typography variant="body2" sx={{ color: '#475569', mb: 1.5 }}>
          {task.description || 'No description.'}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
          {fmt(task.startDate)} → {fmt(task.endDate)}
        </Typography>

        {err && <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>{err}</Typography>}

        <FormControl fullWidth size="small" sx={{ mt: 2.5 }} required>
          <InputLabel>Assign to a different member</InputLabel>
          <Select value={assigneeId} label="Assign to a different member" onChange={(e) => setAssigneeId(e.target.value)}>
            {members.length === 0 && <MenuItem value="" disabled>No eligible members left</MenuItem>}
            {members.map((m) => <MenuItem key={m._id} value={m._id}>{m.name}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={busy || !assigneeId}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}>Reassign</Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * "Reassign Task" tab — tasks the assignee rejected. The owner sees the reason
 * and reassigns to a different team member (the rejecter is excluded).
 */
const ReassignPanel = ({ tasks = [], me, onReassign }) => {
  const [teamsById, setTeamsById] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    teamService.listMyTeams()
      .then((teams) => setTeamsById(Object.fromEntries(teams.map((t) => [t._id, t]))))
      .catch(() => setTeamsById({}));
  }, []);

  // Keep the open dialog in sync with refreshes.
  useEffect(() => {
    if (!selected) return;
    setSelected(tasks.find((t) => t._id === selected._id) || null);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Team members eligible for a task: exclude me and anyone who rejected it.
  const eligibleMembers = (task) => {
    const team = teamsById[task.teamId];
    const rejected = (task.rejectedBy || []).map(String);
    return (team?.members || []).filter(
      (m) => String(m._id) !== String(me?._id) && !rejected.includes(String(m._id))
    );
  };

  if (tasks.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', width: '100%' }}>
        <ReplayIcon sx={{ color: '#cbd5e1', fontSize: 32, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">No tasks to reassign.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
      {tasks.map((task) => {
        const reject = lastReject(task);
        return (
          <Paper key={task._id} elevation={0}
            sx={{ p: 2, borderRadius: '12px', border: '1px solid #fecaca', bgcolor: '#fffbfb' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{task.title}</Typography>
              <Chip size="small" label="Rejected" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, height: 18, fontSize: '0.6rem' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
              {fmt(task.startDate)} → {fmt(task.endDate)}
            </Typography>
            {reject && (
              <Box sx={{ mt: 1, p: 1, borderRadius: '8px', bgcolor: '#fef2f2', border: '1px solid #fecaca' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#b91c1c' }}>
                  Rejected by {reject.byName || 'the assignee'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#7f1d1d' }}>{reject.text}</Typography>
              </Box>
            )}
            <Box sx={{ mt: 1.5 }}>
              <Button size="small" variant="contained" startIcon={<ReplayIcon fontSize="small" />}
                onClick={() => setSelected(task)}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                Reassign to someone else
              </Button>
            </Box>
          </Paper>
        );
      })}

      {selected && (
        <ReassignDialog
          task={selected}
          members={eligibleMembers(selected)}
          onClose={() => setSelected(null)}
          onReassign={onReassign}
        />
      )}
    </Box>
  );
};

export default ReassignPanel;
