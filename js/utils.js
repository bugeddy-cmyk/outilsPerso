const RING_C = 741.15;

export function formatChrono(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${pad(min)}:${pad(sec)}.${pad(cs)}`;
}

export function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatCountdown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export { pad };

export function setRingProgress(ringEl, progress, className = '') {
  if (!ringEl) return;
  const offset = RING_C * (1 - Math.min(1, Math.max(0, progress)));
  ringEl.style.strokeDashoffset = String(offset);
  ringEl.classList.remove('warning', 'danger', 'success');
  if (className) ringEl.classList.add(className);
}

export function resetRing(ringEl) {
  if (!ringEl) return;
  ringEl.style.strokeDashoffset = String(RING_C);
  ringEl.classList.remove('warning', 'danger', 'success');
}

export function parsePickerValues(hId, mId, sId) {
  const h = clamp(parseInt(document.getElementById(hId)?.value, 10) || 0, 0, 99);
  const m = clamp(parseInt(document.getElementById(mId)?.value, 10) || 0, 0, 59);
  const s = clamp(parseInt(document.getElementById(sId)?.value, 10) || 0, 0, 59);
  return h * 3600 + m * 60 + s;
}

export function setPickerValues(hId, mId, sId, totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const hEl = document.getElementById(hId);
  const mEl = document.getElementById(mId);
  const sEl = document.getElementById(sId);
  if (hEl) hEl.value = pad(h);
  if (mEl) mEl.value = pad(m);
  if (sEl) sEl.value = pad(s);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [880, 1108, 880, 1108];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch { /* audio unavailable */ }
}

let alarmSession = null;

/** Sonnerie d'alarme insistante (distincte du minuteur). */
export function playAlarmSound() {
  stopAlarmSound();
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    const oscillators = [];
    let cycleTimer = null;
    let stopped = false;

    function ringCycle(startTime) {
      if (stopped) return;
      const pairs = [
        [880, 0],
        [880, 0.22],
        [0, 0.28],
        [988, 0.38],
        [988, 0.6],
        [0, 0.68],
        [784, 0.78],
        [784, 1.0],
        [0, 1.08],
        [1046, 1.18],
        [1046, 1.42],
      ];
      pairs.forEach(([freq, offset]) => {
        if (freq === 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(master);
        const t = startTime + offset;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.setValueAtTime(0.35, t + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.2);
        oscillators.push(osc);
      });
    }

    const loop = () => {
      if (stopped) return;
      ringCycle(ctx.currentTime);
      cycleTimer = setTimeout(loop, 1600);
    };
    loop();

    alarmSession = {
      stop() {
        if (stopped) return;
        stopped = true;
        clearTimeout(cycleTimer);
        oscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
        master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        setTimeout(() => ctx.close().catch(() => {}), 200);
        alarmSession = null;
      },
    };
    return alarmSession;
  } catch {
    return null;
  }
}

export function stopAlarmSound() {
  alarmSession?.stop();
  alarmSession = null;
}

export function vibrate(pattern = [200, 100, 200]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

let toastTimer;
export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { toast.hidden = true; }, 400);
  }, duration);
}

export function setPrimaryButtonRunning(btn, running) {
  if (!btn) return;
  btn.classList.toggle('running', running);
  btn.innerHTML = running
    ? '<svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
    : '<svg class="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  btn.setAttribute('aria-label', running ? 'Mettre en pause' : 'Démarrer');
}

export function now() {
  return performance.now();
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function showBrowserNotification(title, body, tag = 'horizon-alarm') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  try {
    const n = new Notification(title, {
      body,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⏰</text></svg>",
      tag: `horizon-${tag}`,
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return n;
  } catch {
    return null;
  }
}
