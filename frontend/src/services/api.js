import axios from 'axios';

// Single source of truth for the API base URL.
// In the combined production image the frontend is served by the backend,
// so VITE_API_URL is set to the relative path "/api".
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
  }
};
