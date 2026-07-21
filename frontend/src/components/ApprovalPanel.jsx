import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Divider,
} from '@mui/material';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReactDatePicker from 'react-datepicker';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';

const priorityChip = (priority) => {
  if (priority === 'priority') return { label: 'Priority', bg: '#fee2e2', fg: '#ef4444' };
  if (priority === 'important') return { label: 'Important', bg: '#fef3c7', fg: '#f59e0b' };
  return { label: 'General', bg: '#f1f5f9', fg: '#64748b' };
};

const fmt = (d) => { try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return '—'; } };

// Change requests. latestOnly → show just the newest (the active request to act
// on); otherwise the full history, newest first.
const RemarkList = ({ remarks = [], latestOnly = false }) => {
  if (remarks.length === 0) return null;
  const list = latestOnly ? remarks.slice(-1) : [...remarks].reverse();
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>
        {latestOnly ? 'CHANGE REQUESTED' : 'CHANGE REQUESTS'}
      </Typography>
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {list.map((r, i) => (
          <Box key={i} sx={{ p: 1.2, borderRadius: '10px', bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
            <Typography variant="body2" sx={{ color: '#7c2d12' }}>{r.text}</Typography>
            <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 700 }}>
              — {r.byName || 'Someone'}{r.at ? ` · ${fmt(r.at)}` : ''}
            </Typography>
          </Box>
        ))}
      </Box>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
};

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
  </Box>
);

// Dialog shown from the "Approval Pending" tab. Assignee → Accept / Request Change.
// Owner (after a change was requested) → edit fields + Resubmit.
const ApprovalDialog = ({ task, iAmAssignee, onClose, onAccept, onRequestChange, onReject, onResubmit }) => {
  const [action, setAction] = useState(null); // 'request' | 'reject' (remark mode)
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Editable fields for the owner's resubmit form.
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [startDate, setStartDate] = useState(task.startDate ? parseISO(task.startDate) : new Date());
  const [endDate, setEndDate] = useState(task.endDate ? parseISO(task.endDate) : new Date());
  const [priority, setPriority] = useState(task.priority || 'general');

  const chip = priorityChip(task.priority);

  // Resubmit is only enabled when the owner actually changed something.
  const sameDate = (d, iso) => {
    try { return d && iso && d.getTime() === parseISO(iso).getTime(); } catch { return false; }
  };
  const dirty =
    title !== (task.title || '') ||
    description !== (task.description || '') ||
    priority !== (task.priority || 'general') ||
    !sameDate(startDate, task.startDate) ||
    !sameDate(endDate, task.endDate);

  const doAccept = async () => { setBusy(true); setErr(''); try { await onAccept(task._id); onClose(); } catch (e) { setErr(e?.response?.data?.message || 'Failed'); setBusy(false); } };

  const submitRemark = async () => {
    if (!remark.trim()) { setErr(action === 'reject' ? 'Please give a reason for rejecting' : 'Please describe the change'); return; }
    setBusy(true); setErr('');
    try {
      if (action === 'reject') await onReject(task._id, remark.trim());
      else await onRequestChange(task._id, remark.trim());
      onClose();
    } catch (e) { setErr(e?.response?.data?.message || 'Failed'); setBusy(false); }
  };

  const doResubmit = async () => {
    if (!title.trim()) { setErr('Task name is required'); return; }
    if (!description.trim()) { setErr('Description is required'); return; }
    if (isBefore(startOfDay(endDate), startOfDay(startDate))) { setErr('End date cannot be before start date'); return; }
    setBusy(true); setErr('');
    try {
      await onResubmit(task._id, {
        title: title.trim(), description: description.trim(),
        startDate: startDate.toISOString(), endDate: endDate.toISOString(), priority,
      });
      onClose();
    } catch (e) { setErr(e?.response?.data?.message || 'Failed'); setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {iAmAssignee ? 'Review assigned task' : 'Make requested changes'}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <RemarkList remarks={task.remarks} latestOnly={!iAmAssignee} />
        {err && <Typography color="error" variant="caption" sx={{ display: 'block', mb: 1 }}>{err}</Typography>}

        {iAmAssignee ? (
          <>
            {/* Read-only task details */}
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{task.title}</Typography>
            <Typography variant="body2" sx={{ color: '#475569', mb: 1.5 }}>
              {task.description || 'No description provided.'}
            </Typography>
            <InfoRow label="START" value={fmt(task.startDate)} />
            <InfoRow label="END" value={fmt(task.endDate)} />
            <InfoRow label="PRIORITY" value={<Chip size="small" label={chip.label} sx={{ bgcolor: chip.bg, color: chip.fg, fontWeight: 700 }} />} />
            {task.ownerName && <InfoRow label="ASSIGNED BY" value={task.ownerName} />}

            {action && (
              <TextField
                label={action === 'reject' ? 'Reason for rejecting' : 'Describe the change you need'}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                fullWidth multiline rows={3} size="small" autoFocus
                sx={{ mt: 2 }}
              />
            )}
          </>
        ) : (
          <>
            {/* Owner edits the task and resubmits */}
            <TextField label="Task Name" value={title} onChange={(e) => setTitle(e.target.value)} size="small" fullWidth sx={{ mb: 2 }} />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} size="small" fullWidth multiline rows={2} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, mb: 2, '& .react-datepicker-wrapper': { width: '100%' } }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#94a3b8', fontWeight: 700 }}>START DATE</Typography>
                <ReactDatePicker selected={startDate} onChange={setStartDate} dateFormat="dd/MM/yyyy"
                  customInput={<TextField fullWidth size="small" />} portalId="root-datepicker" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#94a3b8', fontWeight: 700 }}>END DATE</Typography>
                <ReactDatePicker selected={endDate} onChange={setEndDate} dateFormat="dd/MM/yyyy" minDate={startDate}
                  customInput={<TextField fullWidth size="small" />} portalId="root-datepicker" />
              </Box>
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>Priority Level</InputLabel>
              <Select value={priority} label="Priority Level" onChange={(e) => setPriority(e.target.value)}>
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="important">Important</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
        {iAmAssignee ? (
          action ? (
            <>
              <Button onClick={() => { setAction(null); setRemark(''); setErr(''); }}
                sx={{ textTransform: 'none', color: 'text.secondary' }}>Back</Button>
              <Button onClick={submitRemark} variant="contained" disabled={busy}
                color={action === 'reject' ? 'error' : 'primary'}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                {action === 'reject' ? 'Reject task' : 'Send request'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setAction('reject')} color="error"
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Reject task</Button>
              <Button onClick={() => setAction('request')} variant="outlined"
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Request for change</Button>
              <Button onClick={doAccept} variant="contained" disabled={busy}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Accept</Button>
            </>
          )
        ) : (
          <Button onClick={doResubmit} variant="contained" disabled={busy || !dirty}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Submit again</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/**
 * Panel for the "Approval Pending" and "Waiting for Approval" tabs.
 * mode 'pending' → tasks awaiting my action (clickable → ApprovalDialog).
 * mode 'waiting' → tasks waiting on the other party (read-only, shows remarks).
 */
const ApprovalPanel = ({ tasks = [], mode, me, onAccept, onRequestChange, onReject, onResubmit }) => {
  const [selected, setSelected] = useState(null);

  // If the list refreshes, keep the open dialog in sync (or close it if gone).
  useEffect(() => {
    if (!selected) return;
    const fresh = tasks.find((t) => t._id === selected._id);
    setSelected(fresh || null);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  if (tasks.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', width: '100%' }}>
        <HourglassEmptyIcon sx={{ color: '#cbd5e1', fontSize: 32, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {mode === 'pending' ? 'Nothing awaiting your approval.' : 'Nothing waiting on others.'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
      {tasks.map((task) => {
        const chip = priorityChip(task.priority);
        const iAmAssignee = String(task.assigneeId) === String(me?._id);
        const waitingOn = iAmAssignee ? task.ownerName : task.assigneeName;
        return (
          <Paper key={task._id} elevation={0}
            onClick={mode === 'pending' ? () => setSelected(task) : undefined}
            sx={{
              p: 2, borderRadius: '12px', border: '1px solid #f1f5f9', bgcolor: 'white',
              cursor: mode === 'pending' ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              '&:hover': mode === 'pending' ? { boxShadow: '0 8px 16px rgba(0,0,0,0.06)', transform: 'translateY(-2px)' } : {},
            }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{task.title}</Typography>
              <Chip size="small" label={chip.label} sx={{ bgcolor: chip.bg, color: chip.fg, fontWeight: 700, height: 18, fontSize: '0.6rem' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
              {task.description || 'No description.'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
              {fmt(task.startDate)} → {fmt(task.endDate)}
            </Typography>

            {mode === 'waiting' && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#6366f1', fontWeight: 700 }}>
                Waiting on {waitingOn || 'the other person'}
              </Typography>
            )}

            {/* Latest remark shown inline in the waiting tab. */}
            {mode === 'waiting' && task.remarks?.length > 0 && (
              <Box sx={{ mt: 1, p: 1, borderRadius: '8px', bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
                <Typography variant="body2" sx={{ color: '#7c2d12' }}>
                  {task.remarks[task.remarks.length - 1].text}
                </Typography>
                <Typography variant="caption" sx={{ color: '#9a3412', fontWeight: 700 }}>
                  — {task.remarks[task.remarks.length - 1].byName || 'Someone'}
                </Typography>
              </Box>
            )}

            {mode === 'pending' && (
              <Box sx={{ mt: 1.5 }}>
                <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                  {iAmAssignee ? 'Review' : 'Make changes'}
                </Button>
              </Box>
            )}
          </Paper>
        );
      })}

      {selected && (
        <ApprovalDialog
          task={selected}
          iAmAssignee={String(selected.assigneeId) === String(me?._id)}
          onClose={() => setSelected(null)}
          onAccept={onAccept}
          onRequestChange={onRequestChange}
          onReject={onReject}
          onResubmit={onResubmit}
        />
      )}
    </Box>
  );
};

export default ApprovalPanel;
