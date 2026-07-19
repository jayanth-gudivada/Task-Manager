/**
 * Shared utility for consistent task color coding across the application.
 * Ensures the same task title always maps to the same color in both 
 * the Calendar dots and the Upcoming sidebar cards.
 */

const colors = [
  '#8529d8', // Primary Purple
  '#7c3aed', // Violet
  '#6366f1', // Indigo
  '#a855f7', // Light Purple
  '#d946ef', // Fuchsia
  '#4f46e5', // Royal Blue-ish Indigo
  '#9333ea', // Deep Purple
  '#4338ca'  // Indigo Tint
];

export const getTaskColor = (taskTitle = '', priority = 'general') => {
  if (priority === 'priority') return '#ef4444'; // Red for priority tasks
  
  const str = taskTitle || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
