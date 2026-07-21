import axios from 'axios';

// Single source of truth for the API base URL.
// In the combined production image the frontend is served by the backend,
// so VITE_API_URL is set to the relative path "/api".
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const TOKEN_KEY = 'tm_token';

// Attach the JWT to every outgoing request so protected routes accept it.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On any 401 the session is dead: clear it and bounce to login. A tiny custom
// event lets the app react without this module importing the store (avoids a
// circular dependency between api.js and the slices).
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (data) => {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data; // { token, user }
  },
  login: async (creds) => {
    const response = await axios.post(`${API_URL}/auth/login`, creds);
    return response.data; // { token, user }
  },
  me: async () => {
    const response = await axios.get(`${API_URL}/auth/me`);
    return response.data; // { user }
  },
};

export const taskService = {
  // Get all tasks
  getAllTasks: async () => {
    const response = await axios.get(`${API_URL}/tasks`);
    return response.data;
  },

  // Get upcoming tasks
  getUpcomingTasks: async () => {
    const response = await axios.get(`${API_URL}/tasks/upcoming`);
    return response.data;
  },

  // Create a new task
  createTask: async (taskData) => {
    const response = await axios.post(`${API_URL}/tasks`, taskData);
    return response.data;
  },

  // Update a task
  updateTask: async (id, taskData) => {
    const response = await axios.put(`${API_URL}/tasks/${id}`, taskData);
    return response.data;
  },

  // Delete a task
  deleteTask: async (id) => {
    const response = await axios.delete(`${API_URL}/tasks/${id}`);
    return response.data;
  },

  // --- Approval workflow ---
  getApprovalPending: async () => {
    const response = await axios.get(`${API_URL}/tasks/approval-pending`);
    return response.data;
  },
  getWaitingApproval: async () => {
    const response = await axios.get(`${API_URL}/tasks/waiting-approval`);
    return response.data;
  },
  getReassign: async () => {
    const response = await axios.get(`${API_URL}/tasks/reassign`);
    return response.data;
  },
  rejectTask: async (id, remark) => {
    const response = await axios.post(`${API_URL}/tasks/${id}/reject`, { remark });
    return response.data;
  },
  reassignTask: async (id, changes) => {
    const response = await axios.post(`${API_URL}/tasks/${id}/reassign`, changes);
    return response.data;
  },
  acceptTask: async (id) => {
    const response = await axios.post(`${API_URL}/tasks/${id}/accept`);
    return response.data;
  },
  requestChange: async (id, remark) => {
    const response = await axios.post(`${API_URL}/tasks/${id}/request-change`, { remark });
    return response.data;
  },
  resubmitTask: async (id, changes) => {
    const response = await axios.post(`${API_URL}/tasks/${id}/resubmit`, changes);
    return response.data;
  }
};

export const settingsService = {
  // Get tier colors (priority / important)
  getSettings: async () => {
    const response = await axios.get(`${API_URL}/settings`);
    return response.data;
  },

  // Update tier colors
  updateSettings: async (settings) => {
    const response = await axios.put(`${API_URL}/settings`, settings);
    return response.data;
  }
};

// Admin-only user management.
export const userService = {
  listUsers: async () => {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  },
  updateUser: async (id, changes) => {
    const response = await axios.put(`${API_URL}/users/${id}`, changes);
    return response.data;
  }
};

// Team management (leader/admin). Delete is admin-only on the backend.
export const teamService = {
  listTeams: async () => {
    const response = await axios.get(`${API_URL}/teams`);
    return response.data;
  },
  // Teams the current user belongs to (read-only; any role).
  listMyTeams: async () => {
    const response = await axios.get(`${API_URL}/teams/mine`);
    return response.data;
  },
  listAvailableUsers: async () => {
    const response = await axios.get(`${API_URL}/teams/users`);
    return response.data;
  },
  createTeam: async (team) => {
    const response = await axios.post(`${API_URL}/teams`, team);
    return response.data;
  },
  updateTeam: async (id, changes) => {
    const response = await axios.put(`${API_URL}/teams/${id}`, changes);
    return response.data;
  },
  deleteTeam: async (id) => {
    const response = await axios.delete(`${API_URL}/teams/${id}`);
    return response.data;
  }
};

// The role values the UI offers; keep in sync with backend roles.js.
export const ROLES = ['admin', 'leader', 'user'];
