import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Button, Snackbar, Alert, Skeleton, Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { useSelector } from 'react-redux';
import { userService, ROLES } from '../services/api';
import { selectUser } from '../store/authSlice';

const ROLE_STYLES = {
  admin: { bg: '#f5f0ff', fg: '#8529d8' },
  leader: { bg: '#e0f2fe', fg: '#0369a1' },
  user: { bg: '#f1f5f9', fg: '#475569' },
};

const RoleChip = ({ role }) => {
  const s = ROLE_STYLES[role] || ROLE_STYLES.user;
  return <Chip label={role} size="small" sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 700, textTransform: 'capitalize' }} />;
};

// Admin-only screen: lists all users and lets the admin edit name/email/role.
const UserManagementPage = () => {
  const me = useSelector(selectUser);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // the user row being edited
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await userService.listUsers());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (updated) => {
    setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
    setEditing(null);
    setToast({ severity: 'success', message: 'User updated.' });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, height: { xs: 'auto', md: 'calc(100vh - 70px)' }, overflowY: 'auto', bgcolor: '#f4f7f9' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <PeopleAltIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            View everyone and manage their details and roles.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: 'none' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#fafafa' }}>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Edit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton width={120} /></TableCell>
                      <TableCell><Skeleton width={180} /></TableCell>
                      <TableCell><Skeleton width={60} /></TableCell>
                      <TableCell align="right"><Skeleton width={24} /></TableCell>
                    </TableRow>
                  ))
                : users.map((u) => (
                    <TableRow key={u._id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {u.name}{u._id === me?._id && <Typography component="span" variant="caption" color="text.secondary"> (you)</Typography>}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><RoleChip role={u.role} /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit user">
                          <IconButton size="small" onClick={() => setEditing(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && users.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {editing && (
        <EditUserDialog
          user={editing}
          isSelf={editing._id === me?._id}
          onClose={() => setEditing(null)}
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

const EditUserDialog = ({ user, isSelf, onClose, onSaved }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const dirty = name !== user.name || email !== user.email || role !== user.role;

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const updated = await userService.updateUser(user._id, { name, email, role });
      onSaved(updated);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit user</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {err && <Alert severity="error" sx={{ borderRadius: 2 }}>{err}</Alert>}
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" fullWidth />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} size="small" fullWidth />
        <TextField
          label="Role" select value={role} onChange={(e) => setRole(e.target.value)} size="small" fullWidth
          helperText={isSelf ? 'You cannot change your own role' : ' '}
          disabled={isSelf}
        >
          {ROLES.map((r) => (
            <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !dirty}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserManagementPage;
