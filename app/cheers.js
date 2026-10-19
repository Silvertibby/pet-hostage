// v0.5.8 friend cheers (1,000 Spare Steps each): preset picks only (no free text). This exact file is copied to app/cheers.js (a test checks they match).
export const CHEER_COST = 1000;
export const CHEER_DAILY_MAX = 3; // per friend per day (PT)
export const CHEERS = [
  { id: 'go', text: '📣 You got this!' },
  { id: 'heart', text: '💖 Rooting for you!' },
  { id: 'walk', text: '🏃 Walk walk walk!' },
  { id: 'star', text: '⭐ So proud of you!' },
  { id: 'fire', text: '🔥 Crush that goal!' },
  { id: 'paws', text: '🐾 Your pet believes in you!' },
];
export const cheerById = id => CHEERS.find(c => c.id === id) || null;
export const DISPLAY_NAME_MAX = 20;
export const cleanName = s => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, DISPLAY_NAME_MAX);
