import assert from 'node:assert/strict';
import { normalize, newState } from './src/game.js';
import { itemFor } from './src/shop.js';
const T = '2026-10-19', st = newState('LEDGER0001', T);
normalize(st, T);
const p = (sl, c) => itemFor('raccoon', sl, c).price;
st.cosmetics.owned = { raccoon: { hat: ['black'], shirt: ['navy'], bowtie: ['red', 'teal'] } };
st.bankLog = [{ date: T, kind: 'shop', amount: -p('shirt', 'navy') }, { date: T, kind: 'shop', amount: -p('hat', 'black') }, { date: T, kind: 'cheer', amount: -1000 }, { date: T, kind: 'shop', amount: -p('bowtie', 'red') }];
st.cheerSent = { [T]: { FRIEND1: 1 } };
normalize(st, T);
const [a, b, c, d] = st.bankLog;
const ambiguous = p('bowtie', 'red') === p('bowtie', 'teal');
if (p('shirt', 'navy') !== p('hat', 'black')) { assert.equal(a.item, 'raccoon:shirt:navy'); assert.equal(b.item, 'raccoon:hat:black'); }
assert.equal(c.to, 'FRIEND1');
if (ambiguous) assert.equal(d.item, undefined, 'ambiguous price stays generic');
console.log('✓ ledger backfill (unique shop price, single cheer recipient, ambiguous left generic)');
