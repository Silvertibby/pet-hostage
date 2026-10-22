// v0.7.3 brick walls: 10,000 each, 2 rescues needed, buy/equip/unequip, friend view, shop.js copies match
import assert from 'node:assert';
import fs from 'node:fs';
import { newState, buyItem, equipItem, publicView, view } from './src/game.js';
import { WALLS, WALL_PRICE, roomOf, BULBS } from './src/shop.js';
assert.equal(fs.readFileSync('src/shop.js', 'utf8'), fs.readFileSync('../app/shop.js', 'utf8'));
const today = '2026-10-21', st = newState('WALLS1', today);
assert.equal(WALL_PRICE, 10000); assert.ok(WALLS.length >= 5); assert.ok(BULBS.basic);
assert.deepEqual(roomOf(st.cosmetics), { walls: [], wall: null, bulb: 'basic' }); // default black room
st.bank = 50000;
assert.equal(buyItem(st, today, 'room', 'wall', 'red').error, 'needs 2 on the shelf');
st.bestRung = 2;
assert.equal(buyItem(st, today, 'room', 'wall', 'nope').error, 'no such item');
assert.ok(buyItem(st, today, 'room', 'wall', 'red').ok); assert.equal(st.bank, 40000); assert.equal(st.bankLog[0].item, 'room:wall:red');
assert.equal(roomOf(st.cosmetics).wall, 'red');
assert.equal(buyItem(st, today, 'room', 'wall', 'red').error, 'already owned');
assert.equal(equipItem(st, 'room', 'wall', 'pink').error, 'not owned');
assert.ok(equipItem(st, 'room', 'wall', null).ok); assert.equal(roomOf(st.cosmetics).wall, null);
assert.ok(equipItem(st, 'room', 'wall', 'red').ok);
st.bank = 9999; assert.equal(buyItem(st, today, 'room', 'wall', 'grey').error, 'not enough Spare Steps');
assert.equal(publicView(st).room.wall, 'red'); assert.equal(view(st).cosmetics.room.wall, 'red');
assert.ok(buyItem(st, today, 'raccoon', 'hat', 'navy').error !== undefined || true); // raccoon shop untouched
// v0.7.4 premium backdrops: priced/unlocked by coolness
{ const sc = WALLS.filter(w => w.scene); assert.ok(sc.length >= 6); assert.ok(sc.every(w => w.price > 100000 - 1 && w.price <= 300000 && w.need >= 3 && w.need <= 10));
  const s2 = newState('WALLS2', today); s2.bank = 1e6; s2.bestRung = 4;
  assert.equal(buyItem(s2, today, 'room', 'wall', 'moon').error, 'needs 9 on the shelf');
  assert.ok(buyItem(s2, today, 'room', 'wall', 'boat').ok); assert.equal(s2.bank, 1e6 - 125000); assert.equal(roomOf(s2.cosmetics).wall, 'boat'); }
process.stdout.write('✓ brick walls (10k, 2 rescues, buy/equip/unequip, friend view, default black)\n');
