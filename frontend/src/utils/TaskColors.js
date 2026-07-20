/**
 * Shared utility for consistent task color coding across the application.
 *
 * Color rules:
 * - Priority tasks  -> user-configurable color (default red),   not per-task editable
 * - Important tasks -> user-configurable color (default amber),  not per-task editable
 * - General tasks   -> a calm default, or a user-picked color that is guarded
 *                      against mimicking the (dynamic) priority/important colors.
 *
 * Priority/Important colors come from Account Settings and are applied at
 * runtime via `configureTierColors`. The DEFAULT_* constants below are the
 * project-base fallback used whenever settings are missing or invalid.
 */

export const DEFAULT_PRIORITY_COLOR = '#ef4444';  // Red   - project-base fallback
export const DEFAULT_IMPORTANT_COLOR = '#f59e0b'; // Amber - project-base fallback
export const GENERAL_DEFAULT = '#94a3b8';         // Light slate-blue - calm general default

// Below this RGB Euclidean distance, two colors are considered "too similar".
export const SIMILARITY_THRESHOLD = 70;

// Live tier colors, seeded with the project-base fallback until settings load.
let priorityColor = DEFAULT_PRIORITY_COLOR;
let importantColor = DEFAULT_IMPORTANT_COLOR;

const HEX = /^#[0-9a-fA-F]{6}$/;

const hexToRgb = (hex = '') => {
  const clean = String(hex).replace('#', '').trim();
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const colorDistance = (a, b) => {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  if (!c1 || !c2) return Infinity;
  return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
};

/** True when two colors are within the similarity threshold. */
export const isTooSimilar = (a, b) => colorDistance(a, b) < SIMILARITY_THRESHOLD;

/**
 * Apply user-configured tier colors at runtime. Invalid/missing values fall
 * back to the project-base defaults so the app always has usable colors.
 */
export const configureTierColors = ({ priority, important } = {}) => {
  priorityColor = HEX.test(priority || '') ? priority : DEFAULT_PRIORITY_COLOR;
  importantColor = HEX.test(important || '') ? important : DEFAULT_IMPORTANT_COLOR;
};

export const getPriorityColor = () => priorityColor;
export const getImportantColor = () => importantColor;

/**
 * Common guard (dynamic): true when a color is too close to the *current*
 * priority or important colors, so a general task can't mimic those tiers.
 */
export const isColorReserved = (hex) =>
  isTooSimilar(hex, priorityColor) || isTooSimilar(hex, importantColor);

export const getTaskColor = (taskTitle = '', priority = 'general', color = null) => {
  if (priority === 'priority') return priorityColor;
  if (priority === 'important') return importantColor;

  // General: honor a valid, non-reserved custom color; else the calm default.
  if (color && hexToRgb(color) && !isColorReserved(color)) return color;
  return GENERAL_DEFAULT;
};
