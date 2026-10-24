// App lock: PIN + fingerprint + authenticator (TOTP). Sob kichu shudhu ei device-e thake.
const KEY = (uid) => `bc_sec_${uid}`;

export const loadSec = (uid) => {
  try {
    return JSON.parse(localStorage.getItem(KEY(uid)) || '{}');
  } catch (e) {
    return {};
  }
};
export const saveSec = (uid, v) => {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(v));
  } catch (e) {
    /* ignore */
  }
};

export async function hashPin(uid, pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`bc-sec:${uid}:${pin}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = '';
  bytes.forEach((b) => {
    bits += b.toString(2).padStart(8, '0');
  });
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

const b32decode = (s) => {
  let bits = '';
  s.replace(/=+$/, '')
    .toUpperCase()
    .split('')
    .forEach((c) => {
      const v = B32.indexOf(c);
      if (v >= 0) bits += v.toString(2).padStart(5, '0');
    });
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
};

export async function totp(secret, at = Date.now()) {
  const counter = Math.floor(at / 30000);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i -= 1) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const key = await crypto.subtle.importKey('raw', b32decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[h.length - 1] & 0xf;
  const code = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1000000;
  return String(code).padStart(6, '0');
}

export async function verifyTotp(secret, code) {
  const now = Date.now();
  for (const d of [-1, 0, 1]) {
    if ((await totp(secret, now + d * 30000)) === String(code).trim()) return true;
  }
  return false;
}

export async function bioAvailable() {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const r = await BiometricAuth.checkBiometry();
    return !!r.isAvailable;
  } catch (e) {
    return false;
  }
}

export async function bioAuth(reason) {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({ reason, allowDeviceCredential: true });
    return true;
  } catch (e) {
    return false;
  }
}
