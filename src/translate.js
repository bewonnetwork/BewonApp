// Auto-translate: prothome Google-er free endpoint (language nije detect kore),
// na hole MyMemory free API. Result cache kora hoy jate ekta message bar bar translate na hoy.

const LS_KEY = 'cc_tr_cache_v1';
let mem = null;
const inflight = new Map();

const cache = () => {
  if (mem) return mem;
  try {
    mem = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch (e) {
    mem = {};
  }
  return mem;
};

const persist = () => {
  try {
    const keys = Object.keys(mem);
    if (keys.length > 400) keys.slice(0, keys.length - 300).forEach((k) => delete mem[k]);
    localStorage.setItem(LS_KEY, JSON.stringify(mem));
  } catch (e) {
    /* ignore */
  }
};

async function viaGoogle(text, to) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t' +
    `&tl=${encodeURIComponent(to)}&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`google ${r.status}`);
  const j = await r.json();
  return { text: j[0].map((x) => x[0]).join(''), from: j[2] || '' };
}

async function viaMyMemory(text, from, to) {
  if (text.length > 480) throw new Error('too long');
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    `${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`mymemory ${r.status}`);
  const j = await r.json();
  const out = j && j.responseData && j.responseData.translatedText;
  if (Number(j.responseStatus) !== 200 || !out || /MYMEMORY WARNING/i.test(out)) {
    throw new Error('mymemory limit');
  }
  return { text: out, from };
}

/** @returns {Promise<{text:string, from:string}|null>} */
export function translateText(text, hintFrom, to) {
  const key = `${to}|${text}`;
  const c = cache();
  if (c[key]) return Promise.resolve(c[key]);
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    let res = null;
    try {
      res = await viaGoogle(text, to);
    } catch (e) {
      try {
        res = await viaMyMemory(text, hintFrom || 'en', to);
      } catch (e2) {
        res = null;
      }
    }
    if (res) {
      c[key] = res;
      persist();
    }
    inflight.delete(key);
    return res;
  })();
  inflight.set(key, p);
  return p;
}
