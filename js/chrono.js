import { addLap, getLaps, clearLaps as clearStoredLaps } from './storage.js';
import { formatChrono, setRingProgress, resetRing, now, setPrimaryButtonRunning } from './utils.js';

export class Chrono {
  constructor() {
    this.elapsed = 0;
    this.running = false;
    this.startTime = 0;
    this.rafId = null;
    this.lastLapTotal = 0;

    this.display = document.getElementById('chronoDisplay');
    this.ring = document.querySelector('.chrono-ring');
    this.startBtn = document.getElementById('chronoStart');
    this.lapBtn = document.getElementById('chronoLap');
    this.resetBtn = document.getElementById('chronoReset');
    this.lapsList = document.getElementById('lapsList');
    this.clearBtn = document.getElementById('clearLaps');

    this.bindEvents();
    this.renderLaps();
  }

  bindEvents() {
    this.startBtn?.addEventListener('click', () => this.toggle());
    this.lapBtn?.addEventListener('click', () => this.lap());
    this.resetBtn?.addEventListener('click', () => this.reset());
    this.clearBtn?.addEventListener('click', () => this.clearLaps());
  }

  toggle() {
    this.running ? this.pause() : this.start();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.startTime = now() - this.elapsed;
    this.lapBtn.disabled = false;
    setPrimaryButtonRunning(this.startBtn, true);
    this.tick();
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    setPrimaryButtonRunning(this.startBtn, false);
  }

  reset() {
    this.pause();
    this.elapsed = 0;
    this.lastLapTotal = 0;
    this.lapBtn.disabled = true;
    this.updateDisplay();
    resetRing(this.ring);
  }

  lap() {
    if (!this.running) return;
    const lapMs = this.elapsed - this.lastLapTotal;
    this.lastLapTotal = this.elapsed;
    const laps = getLaps();
    const lap = {
      id: crypto.randomUUID(),
      number: laps.length + 1,
      totalMs: this.elapsed,
      lapMs,
      timestamp: Date.now(),
    };
    addLap(lap);
    this.renderLaps();
  }

  clearLaps() {
    clearStoredLaps();
    this.renderLaps();
  }

  tick() {
    this.elapsed = now() - this.startTime;
    this.updateDisplay();
    const progress = (this.elapsed % 60000) / 60000;
    setRingProgress(this.ring, progress);
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  updateDisplay() {
    if (this.display) this.display.textContent = formatChrono(this.elapsed);
  }

  renderLaps() {
    const laps = getLaps();
    if (!this.lapsList) return;
    this.lapsList.innerHTML = '';

    if (laps.length === 0) return;

    const lapTimes = laps.map(l => l.lapMs);
    const best = Math.min(...lapTimes);
    const worst = Math.max(...lapTimes);
    const maxLap = worst || 1;

    laps.forEach(lap => {
      const li = document.createElement('li');
      li.className = 'lap-item';
      if (lap.lapMs === best && laps.length > 1) li.classList.add('best');
      if (lap.lapMs === worst && laps.length > 1) li.classList.add('worst');

      const barWidth = Math.max(8, (lap.lapMs / maxLap) * 100);

      li.innerHTML = `
        <span class="lap-number">${lap.number}</span>
        <div class="lap-bar" style="width:${barWidth}%"></div>
        <span class="lap-delta">+${formatChrono(lap.lapMs)}</span>
        <span class="lap-total">${formatChrono(lap.totalMs)}</span>
      `;
      this.lapsList.appendChild(li);
    });
  }

  onModeEnter() {
    this.updateDisplay();
  }

  onModeLeave() {
    /* chrono keeps running in background */
  }
}
