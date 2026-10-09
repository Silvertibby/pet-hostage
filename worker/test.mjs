// Local checks: Web Push encryption round-trip, VAPID JWT signature, rules.
import { encryptPayload, vapidJwt, b64u } from './src/push.js';
import { settle, newState, addDays, mood } from './src/game.js';
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
// Rules
const st = newState('X', '2026-10-01');
st.days['2026-10-01'] = 50; // adoption day miss = grace
st.days['2026-10-02'] = 12000;
st.days['2026-10-03'] = 9000;
st.days['2026-10-04'] = 10000;
let ev = settle(st, '2026-10-05');
assert.deepEqual(ev.map(e => e.peril), [0, 0, 1, 0]); assert.equal(st.pet.streak, 1); assert.ok(st.pet.alive);
ev = settle(st, '2026-10-08'); // 5,6,7 missed (no data)
assert.equal(st.pet.alive, false); assert.equal(st.pet.died, '2026-10-07');
assert.equal(mood(st, { date: '2026-10-08', hour: 9 }), 'ghost');
assert.equal(addDays('2026-11-01', 1), '2026-11-02'); // DST weekend safe
console.log('✓ rules');
