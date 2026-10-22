let ctx = null;
let ringTimer = null;

const getCtx = () => {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) {
    return null;
  }
};

function tone(freq, durMs, delayS = 0, vol = 0.18) {
  const c = getCtx();
  if (!c) return;
  try {
    const t0 = c.currentTime + delayS;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + durMs / 1000 + 0.05);
  } catch (e) {
    /* ignore */
  }
}

export function ding() {
  tone(880, 140, 0, 0.14);
  tone(1175, 200, 0.13, 0.14);
}

export function startRing() {
  stopRing();
  const play = () => {
    tone(740, 380, 0);
    tone(932, 380, 0.45);
    try {
      if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
    } catch (e) {
      /* ignore */
    }
  };
  play();
  ringTimer = setInterval(play, 2200);
}

export function stopRing() {
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
  try {
    if (navigator.vibrate) navigator.vibrate(0);
  } catch (e) {
    /* ignore */
  }
}
