export const chatIdFor = (a, b) => [a, b].sort().join('_');

export const initials = (name = '?') => (name.trim()[0] || '?').toUpperCase();

const COLORS = [
  '#e57373',
  '#f06292',
  '#ba68c8',
  '#9575cd',
  '#7986cb',
  '#64b5f6',
  '#4db6ac',
  '#81c784',
  '#ffb74d',
  '#a1887f',
  '#90a4ae',
];

export const colorFor = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
};

export const tsMs = (ts) => (ts && ts.toMillis ? ts.toMillis() : 0);

export const fmtClock = (ms) =>
  ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export const fmtDayOrTime = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  if (d.toDateString() === new Date().toDateString()) return fmtClock(ms);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export const fmtSeen = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const time = fmtClock(ms);
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${time}`;
};

export const fmtDur = (s) => {
  const total = Math.max(0, Math.round(s || 0));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

// Chobi chhoto kore JPEG data-URL banay (Firestore document 1MB-er niche rakhar jonno)
export async function compressImage(file, max = 1024, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    let q = quality;
    let out = canvas.toDataURL('image/jpeg', q);
    while (out.length > 850000 && q > 0.35) {
      q -= 0.1;
      out = canvas.toDataURL('image/jpeg', q);
    }
    if (out.length > 950000) throw new Error('too big');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// File kholo: phone-e Share/Save, web-e download
export async function openFile(m) {
  const name = m.fileName || 'file';
  const Cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (Cap && Cap.isNativePlatform && Cap.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const r = await Filesystem.writeFile({
        path: name,
        data: m.file.split(',')[1],
        directory: Directory.Cache,
      });
      await Share.share({ title: name, url: r.uri });
      return;
    } catch (e) {
      console.warn('openFile', e);
    }
  }
  const a = document.createElement('a');
  a.href = m.file;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
