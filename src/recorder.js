import { blobToDataURL, openFile } from './utils.js';

// Call/meeting screen record: sob video tile + sob awaj ekshathe webm file-e save hoy
export function startRecorder(root, audioStreams) {
  const W = 960;
  const H = 540;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');

  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const dest = ctx.createMediaStreamDestination();
  audioStreams.forEach((s) => {
    if (s && s.getAudioTracks().length) {
      try {
        ctx.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(dest);
      } catch (e) {
        /* ignore */
      }
    }
  });

  let raf = 0;
  const draw = () => {
    g.fillStyle = '#0b141a';
    g.fillRect(0, 0, W, H);
    const vids = Array.from(root.querySelectorAll('video')).filter((v) => v.videoWidth > 0 && v.readyState >= 2);
    const n = vids.length;
    if (n) {
      const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const cw = W / cols;
      const ch = H / rows;
      vids.forEach((v, i) => {
        const x = (i % cols) * cw;
        const y = Math.floor(i / cols) * ch;
        const r = Math.min(cw / v.videoWidth, ch / v.videoHeight);
        const w = v.videoWidth * r;
        const h = v.videoHeight * r;
        try {
          g.drawImage(v, x + (cw - w) / 2, y + (ch - h) / 2, w, h);
        } catch (e) {
          /* ignore */
        }
      });
    }
    g.fillStyle = '#ea4335';
    g.beginPath();
    g.arc(24, 24, 8, 0, Math.PI * 2);
    g.fill();
    raf = requestAnimationFrame(draw);
  };
  draw();

  const stream = canvas.captureStream(15);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mime = ['video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 1200000 } : {});
  const chunks = [];
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  rec.start(1000);

  return async function stop() {
    cancelAnimationFrame(raf);
    await new Promise((res) => {
      rec.onstop = res;
      try {
        rec.stop();
      } catch (e) {
        res();
      }
    });
    try {
      ctx.close();
    } catch (e) {
      /* ignore */
    }
    if (!chunks.length) return;
    const blob = new Blob(chunks, { type: 'video/webm' });
    const file = await blobToDataURL(blob);
    await openFile({ file, fileName: `BewonChat-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.webm` });
  };
}
