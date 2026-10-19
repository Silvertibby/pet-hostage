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
// v0.6.0 automatic replies (free, sent by the game): the cheered friend's outcome that day. Picked by the server, shown by id.
export const WIN_LINES = [
  { id: 'w1', text: '🎉 Made it! The pet is safe tonight.' },
  { id: 'w2', text: '🐾 Goal hit. Tiny paws, big relief.' },
  { id: 'w3', text: '✅ Done! The Raccoon is sulking.' },
  { id: 'w4', text: '💪 Crushed it. Thanks for the cheer!' },
];
export const MISS_LINES = [
  { id: 'm1', text: '🕯️ Missed it. Light a candle.' },
  { id: 'm2', text: '🦝 The Raccoon collected. Oops.' },
  { id: 'm3', text: '🩹 Fell short. Fetch the stitches.' },
  { id: 'm4', text: '💀 Didn\'t make it. Moment of silence.' },
];
export const replyLine = (kind, id) => (kind === 'win' ? WIN_LINES : MISS_LINES).find(l => l.id === id) || null;
