// Minimal Web Push for Cloudflare Workers (RFC 8291 aes128gcm + RFC 8292 VAPID), WebCrypto only.
const enc = new TextEncoder();
export const b64u = {
  enc(buf) {
    const b = new Uint8Array(buf); let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
    const s = atob(str); const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  },
};
const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; } return out;
};
async function hkdf(salt, ikm, info, len) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

// Encrypt payload for a subscription. Returns body bytes (aes128gcm single record).
export async function encryptPayload(sub, payload, _test = {}) {
  const uaPub = b64u.dec(sub.keys.p256dh);
  const auth = b64u.dec(sub.keys.auth);
  const asKeys = _test.asKeys || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = _test.salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const plain = concat(typeof payload === 'string' ? enc.encode(payload) : payload, new Uint8Array([2]));
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, plain));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

export async function vapidJwt(endpoint, privateJwk, subject) {
  const aud = new URL(endpoint).origin;
  const header = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', { ...privateJwk, key_ops: ['sign'], ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(header + '.' + claims));
  return header + '.' + claims + '.' + b64u.enc(sig);
}

// Send one push. Returns { ok, status, gone, text }.
export async function sendPush(sub, data, { publicKey, privateJwk, subject, ttl = 6 * 3600, urgency = 'high', topic } = {}) {
  const body = await encryptPayload(sub, JSON.stringify(data));
  const jwt = await vapidJwt(sub.endpoint, privateJwk, subject);
  const headers = {
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    TTL: String(ttl),
    Urgency: urgency,
    Authorization: `vapid t=${jwt}, k=${publicKey}`,
  };
  if (topic) headers.Topic = topic;
  const r = await fetch(sub.endpoint, { method: 'POST', headers, body });
  const text = r.ok ? '' : (await r.text()).slice(0, 300);
  return { ok: r.ok, status: r.status, gone: r.status === 404 || r.status === 410, text };
}
