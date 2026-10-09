// Local checks: Web Push encryption round-trip, VAPID JWT signature, rules.
import { encryptPayload, vapidJwt, b64u } from './src/push.js';
import { settle, newState, addDays, mood, migrate, view, needFor, animalFor, ANIMALS } from './src/game.js';
import assert from 'node:assert';
const subtle = crypto.subtle;
// Fake browser subscription
const ua = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const uaPub = new Uint8Array(await subtle.exportKey('raw', ua.publicKey));
const auth = crypto.getRandomValues(new Uint8Array(16));
const sub = { endpoint: 'https://web.push.apple.com/QXYZ', keys: { p256dh: b64u.enc(uaPub), auth: b64u.enc(auth) } };
const msg = JSON.stringify({ title: 'hi', body: 'Chompsky is fine. For now.' });
const body = await encryptPayload(sub, msg);
// Decrypt as the user agent would (RFC 8291)
const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
const asKey = await subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
const shared = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
const hk = async (s, ikm, info, n) => new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
const te = new TextEncoder();
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const ikm = await hk(auth, shared, cat(te.encode('WebPush: info\0'), uaPub, asPub), 32);
const cek = await hk(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
const nonce = await hk(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
const pt = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct));
assert.equal(pt[pt.length - 1], 2);
assert.equal(new TextDecoder().decode(pt.slice(0, -1)), msg);
console.log('✓ aes128gcm round-trip');
// RFC 8291 Appendix A test vector
{
  const imp = async (d, x, y, pub) => ({ privateKey: await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d, x, y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']), publicKey: await subtle.importKey('raw', b64u.dec(pub), { name: 'ECDH', namedCurve: 'P-256' }, true, []) });
  const asPubB = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
  const asPriv = b64u.dec('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw');
  const pub = b64u.dec(asPubB);
  const asKeys = await imp(b64u.enc(asPriv), b64u.enc(pub.slice(1, 33)), b64u.enc(pub.slice(33)), asPubB);
  const out = await encryptPayload({ keys: { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' } }, 'When I grow up, I want to be a watermelon', { asKeys, salt: b64u.dec('DGv6ra1nlYgDCS1FRnbzlw') });
  assert.equal(b64u.enc(out), 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
  console.log('✓ RFC 8291 test vector');
}
// VAPID JWT verifies
const vk = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwt = await vapidJwt(sub.endpoint, await subtle.exportKey('jwk', vk.privateKey), 'https://example.com/');
const [h, c, s] = jwt.split('.');
assert.ok(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vk.publicKey, b64u.dec(s), te.encode(h + '.' + c)));
assert.equal(JSON.parse(new TextDecoder().decode(b64u.dec(c))).aud, 'https://web.push.apple.com');
console.log('✓ VAPID JWT');
// ---- Ladder sim (v0.2 rules) ----
const D0 = '2026-10-09';
function sim(pattern, start = D0) { // pattern: string of 'Y' (10k) / 'n' (missed) / '-' (no sync) per day from start
  const st = newState('SIM', start); const evs = [];
  [...pattern].forEach((c, i) => { const d = addDays(start, i); if (c === 'Y') st.days[d] = 10000 + i; else if (c === 'n') st.days[d] = 9999; });
  evs.push(...settle(st, addDays(start, pattern.length)));
  return { st, evs, deaths: evs.filter(e => e.kind === 'death'), rescues: evs.filter(e => e.kind === 'rescue') };
}
assert.deepEqual([0, 1, 2, 3, 4].map(needFor), [3, 5, 7, 9, 11]);
assert.equal(new Set(ANIMALS.map(a => a.species)).size, ANIMALS.length); assert.ok(ANIMALS.length >= 6);
assert.equal(animalFor(0).name, 'Chompsky'); assert.equal(animalFor(8).name, 'Chompsky II');
// no free start day: missing it kills the bunny (rung 1 -> bunny again, patched up); hitting it counts as day 1
{ const { st, deaths } = sim('n'); assert.equal(deaths.length, 1); assert.equal(deaths[0].date, D0); assert.ok(deaths[0].rekidnap.same); assert.equal(st.hostage.rung, 0); assert.deepEqual(st.pets[0].injuries, ['pop']); }
{ const { st } = sim('Y'); assert.equal(st.hostage.streak, 1); }
// rescue the bunny in 3, the hamster in 5
{ const { st, rescues } = sim('YYY');
  assert.equal(rescues.length, 1); assert.equal(st.pets[0].rescuedOn, addDays(D0, 2)); assert.equal(st.hostage.rung, 1); assert.equal(st.hostage.since, addDays(D0, 3));
  const v = view(st, Date.parse(addDays(D0, 3) + 'T20:00:00Z'));
  assert.equal(v.shelf.length, 1); assert.equal(v.shelf[0].name, 'Chompsky'); assert.equal(v.hostage.name, 'Nugget'); assert.equal(v.hostage.need, 5); assert.equal(v.hostage.day, 1); }
{ const { st, rescues } = sim('YYY' + 'YYYY'); assert.equal(rescues.length, 1); assert.equal(st.hostage.rung, 1); assert.equal(st.hostage.streak, 4); }
{ const { st, rescues } = sim('YYY' + 'YYYYY' + 'YYYYYYY'); assert.equal(rescues.length, 3); assert.equal(st.hostage.rung, 3); assert.equal(st.pets[3].species, 'hedgehog'); }
// death: hamster dies on a miss, the bunny is re-kidnapped off the shelf and needs its ORIGINAL 3 days
{ const { st, deaths } = sim('YYY' + 'YY' + 'n');
  assert.equal(deaths.length, 1); const d = deaths[0];
  assert.equal(d.name, 'Nugget'); assert.equal(d.rekidnap.name, 'Chompsky'); assert.equal(d.rekidnap.need, 3); assert.equal(d.rekidnap.same, false);
  assert.equal(st.hostage.rung, 0); assert.equal(st.hostage.streak, 0); assert.equal(st.pets[0].rescuedOn, null);
  assert.equal(st.pets[1].deaths, 1); assert.deepEqual(st.pets[1].injuries, ['anvil']); assert.equal(st.pets[0].deaths, 0);
  assert.equal(st.lastDeath.id, 1);
  const v = view(st); assert.equal(v.shelf.length, 0); assert.equal(v.hostage.need, 3);
  // re-rescue bunny with 3 days -> stitched Nugget is back for 5 days
  const st2 = st; for (let i = 0; i < 3; i++) st2.days[addDays(D0, 6 + i)] = 12000;
  const ev2 = settle(st2, addDays(D0, 9));
  assert.equal(ev2.filter(e => e.kind === 'rescue').length, 1); assert.equal(st2.hostage.rung, 1); assert.equal(st2.pets[1].deaths, 1);
  assert.equal(view(st2).hostage.injuries.length, 1); }
// rung 1 (bunny) death: it's just the bunny again, with stitches; injuries accumulate
{ const { st, deaths } = sim('Y-' + 'Yn' + 'n' + 'YYn');
  assert.equal(deaths.length, 4); assert.ok(deaths.every(d => d.rung === 0 && d.rekidnap.same && d.rekidnap.rung === 0));
  assert.equal(st.hostage.rung, 0); assert.equal(st.pets[0].deaths, 4);
  assert.deepEqual(st.pets[0].injuries, ['pop', 'anvil', 'catapult', 'zap']); assert.equal(st.deathCount, 4); }
// long climb then a gap of no syncs: each missed day kills the current hostage and steps the ladder down one
{ const { st, deaths } = sim('YYY' + 'YYYYY' + 'YYYYYYY' + '--');
  assert.equal(deaths.length, 2); assert.deepEqual(deaths.map(d => d.name), ['Prickles', 'Acorn']); assert.equal(st.hostage.rung, 1);
  assert.deepEqual(view(st).shelf.map(p => p.name), ['Chompsky']); }
// migration from Ben's v0.1 state shape
{ const old = { v: 1, code: '3YS267ZCSA', goal: 10000, pet: { name: 'Chompsky', species: 'bunny', born: D0, alive: true, peril: 0, streak: 0, settledThrough: '2026-10-08' }, days: { [D0]: 613 }, lastSync: 1, lastSteps: 613, graveyard: [], sub: null, sent: { [D0]: ['n12'] }, events: [], syncLog: [{ at: 1, ok: true, steps: 613 }] };
  const st = migrate(old, D0);
  assert.equal(st.v, 2); assert.equal(st.code, '3YS267ZCSA'); assert.equal(st.days[D0], 613); assert.equal(st.syncLog.length, 1); assert.deepEqual(st.sent, old.sent);
  assert.equal(st.hostage.rung, 0); assert.equal(st.hostage.streak, 0); assert.equal(st.pets[0].deaths, 0); assert.equal(st.hostage.settledThrough, '2026-10-08');
  assert.equal(migrate(st, D0), st);
  assert.equal(settle(st, D0).length, 0);
  st.days[D0] = 10500; settle(st, addDays(D0, 1)); assert.equal(st.hostage.streak, 1); }
assert.equal(mood(newState('x', D0), { date: D0, hour: 22 }), 'scared');
assert.equal(addDays('2026-11-01', 1), '2026-11-02'); // DST weekend safe
console.log('✓ ladder sim (rescue, death, re-kidnap, original day count, injuries, rung 1 death, gaps, migration)');
