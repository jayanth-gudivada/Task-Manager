import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../services/api';

const TaskContext = createContext();

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [totalCompletedCount, setTotalCompletedCount] = useState(0);
  
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [initialized, setInitialized] = useState({ tasks: false, stats: false });

  // Fetch active tasks
  const fetchTasks = useCallback(async (force = false) => {
    if (initialized.tasks && !force) return;
    
    setLoadingTasks(true);
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
      setInitialized(prev => ({ ...prev, tasks: true }));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [initialized.tasks]);

  // Fetch stats for Performance Page
  const fetchStats = useCallback(async (force = false) => {
    if (initialized.stats && !force) return;
    
    setLoadingStats(true);
    try {
      const res = await axios.get(`${API_URL}/tasks/stats`);
      setStats(res.data);
      setInitialized(prev => ({ ...prev, stats: true }));
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [initialized.stats]);

  // Fetch paginated history (Completed tasks)
  // Usually paginated data is less "cacheable" in a simple way, 
  // but we can at least avoid re-fetching the same page unless forced.
  const fetchCompletedTasks = useCallback(async (page, limit) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/tasks/completed?page=${page + 1}&limit=${limit}`);
      setCompletedTasks(res.data.tasks);
      setTotalCompletedCount(res.data.total);
    } catch (err) {
      console.error('Error fetching completed tasks:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Refresh all caches (called after mutations)
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchTasks(true),
      fetchStats(true)
    ]);
  }, [fetchTasks, fetchStats]);

  const value = {
    tasks,
    stats,
    completedTasks,
    totalCompletedCount,
    loadingTasks,
    loadingStats,
    loadingHistory,
    fetchTasks,
    fetchStats,
    fetchCompletedTasks,
    refreshAll
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};
