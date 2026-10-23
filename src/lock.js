import { useCallback, useState } from 'react';

// Locked chat: PIN ar locked chat-er list shudhu ei device-er localStorage-e thake
const read = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch (e) {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    /* ignore */
  }
};

async function hash(pin, uid) {
  const text = `bewonchat:${uid}:${pin}`;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    return btoa(unescape(encodeURIComponent(text)));
  }
}

export function useLock(uid) {
  const kPin = `bc_pin_${uid}`;
  const kIds = `bc_locked_${uid}`;
  const [pinHash, setPinHash] = useState(() => read(kPin, ''));
  const [ids, setIds] = useState(() => new Set(read(kIds, [])));

  const setPin = useCallback(
    async (pin) => {
      const h = await hash(pin, uid);
      write(kPin, h);
      setPinHash(h);
    },
    [uid, kPin]
  );
  const verify = useCallback(async (pin) => (await hash(pin, uid)) === pinHash, [uid, pinHash]);
  const toggle = useCallback(
    (id) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        write(kIds, Array.from(next));
        return next;
      });
    },
    [kIds]
  );
  return { hasPin: !!pinHash, ids, setPin, verify, toggle };
}
