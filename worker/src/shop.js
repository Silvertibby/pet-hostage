// v0.5.3 villain cosmetics, keyed per villain so a future villain can reuse the slots/palette.
// This exact file is copied to app/shop.js (a test checks they match). Pure: no imports.
// Prices in Spare Steps. Brighter = pricier. Gold needs 5 on the shelf, Rainbow needs 10.
export const VILLAINS = {
  raccoon: { name: 'The Raccoon', shop: 'Raccoon Shop', slots: ['shirt', 'hat', 'bowtie', 'glasses'] },
};
export const SLOTS = {
  shirt: { label: 'Coat', icon: '🧥' },
  hat: { label: 'Hat', icon: '🎩' },
  bowtie: { label: 'Bow tie', icon: '🎀' },
  glasses: { label: 'Shades', icon: '🕶️' },
};
// base / shade / highlight. anim: 'gold' shimmer or 'rainbow' cycle (drawn by the app).
export const COLORS = [
  { id: 'black', label: 'Black', tier: 'dark', price: 5000, hex: ['#26222c', '#141118', '#3a3442'] },
  { id: 'charcoal', label: 'Charcoal', tier: 'dark', price: 8000, hex: ['#45434e', '#2e2c36', '#5c5a66'] },
  { id: 'brown', label: 'Brown', tier: 'dark', price: 10000, hex: ['#5e4030', '#40281c', '#7a5640'] },
  { id: 'navy', label: 'Navy', tier: 'dark', price: 12000, hex: ['#2a3460', '#1b2244', '#3c4878'] },
  { id: 'forest', label: 'Forest', tier: 'dark', price: 15000, hex: ['#2e5a3a', '#1e3e28', '#3e7450'] },
  { id: 'burgundy', label: 'Burgundy', tier: 'mid', price: 20000, hex: ['#7a2438', '#561828', '#963048'] },
  { id: 'grey', label: 'Grey', tier: 'mid', price: 25000, hex: ['#8a8a96', '#686874', '#a6a6b2'] },
  { id: 'tan', label: 'Tan', tier: 'mid', price: 30000, hex: ['#b08a5a', '#8a6a40', '#c8a272'] },
  { id: 'mustard', label: 'Mustard', tier: 'mid', price: 40000, hex: ['#c49a2a', '#987418', '#dcb444'] },
  { id: 'teal', label: 'Teal', tier: 'mid', price: 50000, hex: ['#2a8a8a', '#1a6466', '#3aa6a4'] },
  { id: 'red', label: 'Red', tier: 'bright', price: 75000, hex: ['#e03a3a', '#a82424', '#ff5a52'] },
  { id: 'pink', label: 'Hot pink', tier: 'bright', price: 100000, hex: ['#ff4fa0', '#c42c78', '#ff7ab8'] },
  { id: 'blue', label: 'Electric blue', tier: 'bright', price: 150000, hex: ['#2a7aff', '#1a54c4', '#5aa0ff'] },
  { id: 'gold', label: 'Gold', tier: 'gold', price: 250000, needShelf: 5, anim: 'gold', hex: ['#e8b830', '#b0841c', '#fff0a0'] },
  { id: 'rainbow', label: 'Rainbow', tier: 'rainbow', price: 500000, needShelf: 10, anim: 'rainbow', hex: ['#ff4f4f', '#a02a6a', '#ffe27a'] },
];
export const TIERS = { dark: 'Dark', mid: 'Classic', bright: 'Bright', gold: 'Gold', rainbow: 'Rainbow' };
export const colorById = id => COLORS.find(c => c.id === id) || null;
export function itemFor(villain, slot, color) {
  const v = VILLAINS[villain], c = colorById(color);
  if (!v || !v.slots.includes(slot) || !c) return null;
  return { villain, slot, color: c.id, price: c.price, needShelf: c.needShelf || 0, tier: c.tier };
}
export const emptyCosmetics = () => ({ owned: {}, equipped: {} });
export const owns = (cos, villain, slot, color) => !!(cos && cos.owned && cos.owned[villain] && (cos.owned[villain][slot] || []).includes(color));
