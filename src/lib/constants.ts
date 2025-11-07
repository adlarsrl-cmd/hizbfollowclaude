export const TOTAL_HIZB = 60;
export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;

export const HIZB_PER_JUZ = 2; // Approximation
export const PAGES_PER_JUZ = Math.floor(TOTAL_PAGES / TOTAL_JUZ);

export const TIMEZONE_DEFAULT = 'Europe/Brussels';
export const CHECKPOINT_START = '20:00';
export const CHECKPOINT_END = '23:00';

export const REMINDER_TIMES = {
  pre: '19:30',
  post: '22:30'
};

export const COLORS = {
  primary: '#059669', // emerald-600
  secondary: '#0f766e', // teal-700
  accent: '#ea580c', // orange-600
  success: '#16a34a', // green-600
  warning: '#ca8a04', // yellow-600
  error: '#dc2626', // red-600
  muted: '#64748b' // slate-500
};

export const CONVERSION_FACTORS = {
  hizb_to_pages: TOTAL_PAGES / TOTAL_HIZB,
  pages_to_hizb: TOTAL_HIZB / TOTAL_PAGES
};