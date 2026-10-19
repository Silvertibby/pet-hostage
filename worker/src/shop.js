// v0.5.3 villain cosmetics (v0.5.4: + styles and free rescue rewards), keyed per villain so a future villain can reuse the slots/palette.
// This exact file is copied to app/shop.js (a test checks they match). Pure: no imports.
// Prices in Spare Steps. Brighter = pricier. Gold needs 5 on the shelf, Rainbow needs 10.
export const VILLAINS = {
  raccoon: { name: 'The Raccoon', shop: 'Raccoon Shop', slots: ['shirt', 'hat', 'bowtie', 'glasses'],
    // v0.5.4 styles per slot (first = default). Styles in a color slot take that slot's color.
    styles: { hat: ['fedora', 'bowler', 'tophat', 'crown'], glasses: ['shades', 'monocle', 'aviator'], bowtie: ['bowtie', 'scarf'], face: ['none', 'mustache'], pin: ['none', 'flower'], hand: ['none', 'cane', 'scepter'] } },
};
// v0.5.4 free rescue rewards: `at` = pets rescued (best ever). Awarded server-side, kept forever.
export const REWARDS = {
  raccoon: [
    { at: 1, slot: 'glasses', style: 'monocle' },
    { at: 2, slot: 'hat', style: 'bowler' },
    { at: 3, slot: 'hat', style: 'tophat' },
    { at: 4, slot: 'bowtie', style: 'scarf' },
    { at: 5, slot: 'face', style: 'mustache' },
    { at: 6, slot: 'glasses', style: 'aviator' },
    { at: 7, slot: 'hand', style: 'cane' },
    { at: 8, slot: 'pin', style: 'flower' },
    { at: 9, slot: 'hat', style: 'crown' },
    { at: 10, slot: 'hand', style: 'scepter' }, // v0.5.7: for rescuing the unicorn
  ],
};
export const STYLE_INFO = {
  fedora: { label: 'Fedora', icon: '🕵️' }, bowler: { label: 'Bowler', icon: '🎩' }, tophat: { label: 'Top hat', icon: '🎩' }, crown: { label: 'Crown', icon: '👑' },
  shades: { label: 'Shades', icon: '🕶️' }, monocle: { label: 'Monocle', icon: '🧐' }, aviator: { label: 'Aviators', icon: '🕶️' },
  bowtie: { label: 'Bow tie', icon: '🎀' }, scarf: { label: 'Scarf', icon: '🧣' },
  mustache: { label: 'Mustache', icon: '🥸' }, flower: { label: 'Flower', icon: '🌹' }, cane: { label: 'Cane', icon: '🐾' }, scepter: { label: 'Scepter', icon: '🪄' }, none: { label: 'None', icon: '∅' },
};
export const rewardFor = (villain, at) => (REWARDS[villain] || []).find(r => r.at === at) || null;
export const styleKey = (slot, style) => slot + ':' + style;
export const hasStyle = (cos, villain, slot, style) => { const v = VILLAINS[villain]; if (!v || !v.styles[slot]) return false;
  return v.styles[slot][0] === style || !!(cos && cos.unlocked && (cos.unlocked[villain] || []).includes(styleKey(slot, style))); };
export const SLOTS = {
  shirt: { label: 'Coat', icon: '🧥' },
  hat: { label: 'Hat', icon: '🎩' },
  bowtie: { label: 'Bow tie', icon: '🎀' },
  glasses: { label: 'Shades', icon: '🕶️' },
  face: { label: 'Face', icon: '🥸' }, pin: { label: 'Lapel', icon: '🌹' }, hand: { label: 'Paw', icon: '🐾' }, // v0.5.4 style-only (rescue rewards)
};
// base / shade / highlight. anim: 'gold' shimmer or 'rainbow' cycle (drawn by the app).
export const COLORS = [
  { id: 'black', notFor: ['glasses'], label: 'Black', tier: 'dark', price: 5000, hex: ['#26222c', '#141118', '#3a3442'] },
  { id: 'charcoal', notFor: ['shirt', 'glasses'], label: 'Charcoal', tier: 'dark', price: 8000, hex: ['#45434e', '#2e2c36', '#5c5a66'] },
  { id: 'brown', notFor: ['hat'], label: 'Brown', tier: 'dark', price: 10000, hex: ['#5e4030', '#40281c', '#7a5640'] },
  { id: 'navy', notFor: ['shirt'], label: 'Navy', tier: 'dark', price: 12000, hex: ['#2a3460', '#1b2244', '#3c4878'] },
  { id: 'forest', label: 'Forest', tier: 'dark', price: 15000, hex: ['#2e5a3a', '#1e3e28', '#3e7450'] },
  { id: 'burgundy', label: 'Burgundy', tier: 'mid', price: 20000, hex: ['#7a2438', '#561828', '#963048'] },
  { id: 'grey', label: 'Grey', tier: 'mid', price: 25000, hex: ['#8a8a96', '#686874', '#a6a6b2'] },
  { id: 'tan', label: 'Tan', tier: 'mid', price: 30000, hex: ['#b08a5a', '#8a6a40', '#c8a272'] },
  { id: 'mustard', label: 'Mustard', tier: 'mid', price: 40000, hex: ['#c49a2a', '#987418', '#dcb444'] },
  { id: 'teal', label: 'Teal', tier: 'mid', price: 50000, hex: ['#2a8a8a', '#1a6466', '#3aa6a4'] },
  { id: 'red', notFor: ['bowtie'], label: 'Red', tier: 'bright', price: 75000, hex: ['#e03a3a', '#a82424', '#ff5a52'] },
  { id: 'pink', label: 'Hot pink', tier: 'bright', price: 100000, hex: ['#ff4fa0', '#c42c78', '#ff7ab8'] },
  { id: 'blue', label: 'Electric blue', tier: 'bright', price: 150000, hex: ['#2a7aff', '#1a54c4', '#5aa0ff'] },
  { id: 'gold', label: 'Gold', tier: 'gold', price: 250000, needShelf: 5, anim: 'gold', hex: ['#e8b830', '#b0841c', '#fff0a0'] },
  { id: 'rainbow', label: 'Rainbow', tier: 'rainbow', price: 500000, needShelf: 10, anim: 'rainbow', hex: ['#ff4f4f', '#a02a6a', '#ffe27a'] },
];
export const TIERS = { dark: 'Dark', mid: 'Classic', bright: 'Bright', gold: 'Gold', rainbow: 'Rainbow' };
// v0.6.0: colors removed per slot (too close to that slot's free stock color: plum coat, brown fedora, pink-red bow tie, black shades)
export const forSlot = slot => COLORS.filter(c => !(c.notFor || []).includes(slot));
export const colorById = id => COLORS.find(c => c.id === id) || null;
export function itemFor(villain, slot, color) {
  const v = VILLAINS[villain], c = colorById(color);
  if (!v || !v.slots.includes(slot) || !c || (c.notFor || []).includes(slot)) return null; // v0.6.0: no paid color that looks like the stock one
  return { villain, slot, color: c.id, price: c.price, needShelf: c.needShelf || 0, tier: c.tier };
}
export const emptyCosmetics = () => ({ owned: {}, equipped: {}, unlocked: {} });
export const owns = (cos, villain, slot, color) => !!(cos && cos.owned && cos.owned[villain] && (cos.owned[villain][slot] || []).includes(color));
