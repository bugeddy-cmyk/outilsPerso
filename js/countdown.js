import { getCountdownDuration, saveCountdownDuration } from './storage.js';
import {
  formatCountdown, setRingProgress, resetRing, parsePickerValues,
  setPickerValues, playAlert, vibrate, showToast, setPrimaryButtonRunning, now,
} from './utils.js';
import { setRunningGlow } from './parallax.js';

export class Countdown {
  constructor() {
    this.totalSeconds = getCountdownDuration();
    this.remaining = this.totalSeconds;
    this.running = false;
    this.startTime = 0;
    this.rafId = null;
    this.finished = false;

    this.display = document.getElementById('countdownDisplay');
    this.label = document.getElementById('countdownLabel');
    this.ring = document.querySelector('.countdown-ring');
    this.picker = document.getElementById('countdownPicker');
    this.panel = document.getElementById('panel-countdown');
    this.ringContainer = document.getElementById('countdownRingContainer');
    this.startBtn = document.getElementById('countdownStart');
    this.cancelBtn = document.getElementById('countdownCancel');
    this.resetBtn = document.getElementById('countdownReset');

    setPickerValues('countdown-h', 'countdown-m', 'countdown-s', this.totalSeconds);
    this.bindEvents();
    this.updateDisplay();
  }

  bindEvents() {
    this.startBtn?.addEventListener('click', () => this.toggle());
    this.cancelBtn?.addEventListener('click', () => this.cancel());
    this.resetBtn?.addEventListener('click', () => this.reset());

    ['countdown-h', 'countdown-m', 'countdown-s'].forEach((id, i) => {
      const max = i === 0 ? 99 : 59;
      const el = document.getElementById(id);
      el?.addEventListener('change', () => {
        if (this.running) return;
        let v = parseInt(el.value, 10) || 0;
        v = Math.min(max, Math.max(0, v));
        el.value = String(v).padStart(2, '0');
        this.setDuration(parsePickerValues('countdown-h', 'countdown-m', 'countdown-s'));
      });
    });
  }

  setDuration(seconds) {
    this.totalSeconds = Math.max(1, seconds);
    this.remaining = this.totalSeconds;
    saveCountdownDuration(this.totalSeconds);
    setPickerValues('countdown-h', 'countdown-m', 'countdown-s', this.totalSeconds);
    this.updateDisplay();
    resetRing(this.ring);
    this.finished = false;
    this.panel?.classList.remove('finished');
    if (this.label) this.label.textContent = 'Prêt';
  }

  toggle() {
    if (this.finished) {
      this.reset();
      return;
    }
    this.running ? this.pause() : this.start();
  }

  start() {
    if (this.running) return;
    if (this.remaining <= 0) {
      this.setDuration(parsePickerValues('countdown-h', 'countdown-m', 'countdown-s') || this.totalSeconds);
    }
    this.running = true;
    this.finished = false;
    this.startTime = now();
    this.setEditing(false);
    setPrimaryButtonRunning(this.startBtn, true);
    if (this.label) this.label.textContent = 'En cours';
    setRunningGlow(this.ringContainer, true);
    this.tick();
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    setPrimaryButtonRunning(this.startBtn, false);
    setRunningGlow(this.ringContainer, false);
    if (this.label) this.label.textContent = 'En pause';
  }

  cancel() {
    this.pause();
    this.remaining = this.totalSeconds;
    this.setEditing(true);
    this.updateDisplay();
    resetRing(this.ring);
    this.finished = false;
    this.panel?.classList.remove('finished');
    if (this.label) this.label.textContent = 'Prêt';
  }

  reset() {
    this.pause();
    this.remaining = this.totalSeconds;
    this.setEditing(true);
    this.updateDisplay();
    resetRing(this.ring);
    this.finished = false;
    this.panel?.classList.remove('finished');
    if (this.label) this.label.textContent = 'Prêt';
  }

  complete() {
    this.running = false;
    this.finished = true;
    this.remaining = 0;
    cancelAnimationFrame(this.rafId);
    setPrimaryButtonRunning(this.startBtn, false);
    setRunningGlow(this.ringContainer, false);
    this.setEditing(true);
    this.updateDisplay();
    setRingProgress(this.ring, 0, 'success');
    this.panel?.classList.add('finished');
    if (this.label) this.label.textContent = 'Terminé !';
    playAlert();
    vibrate([300, 100, 300, 100, 300]);
    showToast('Compte à rebours terminé !');
    document.title = '⏰ Terminé — Horizon';
    setTimeout(() => { document.title = 'Horizon — Minuteur'; }, 4000);
  }

  tick() {
    const elapsed = (now() - this.startTime) / 1000;
    this.remaining = Math.max(0, this.totalSeconds - elapsed);
    this.updateDisplay();

    const progress = this.remaining / this.totalSeconds;
    const ringClass = progress <= 0.1 ? 'danger' : progress <= 0.25 ? 'warning' : '';
    setRingProgress(this.ring, progress, ringClass);

    if (this.remaining <= 0) {
      this.complete();
      return;
    }
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  updateDisplay() {
    if (this.display) this.display.textContent = formatCountdown(Math.ceil(this.remaining));
  }

  setEditing(editing) {
    this.picker?.classList.toggle('hidden', !editing);
    this.cancelBtn?.classList.toggle('hidden-slot', editing);
  }

  onModeEnter() {
    this.updateDisplay();
  }

  onModeLeave() {
    /* countdown keeps running in background */
  }
}
