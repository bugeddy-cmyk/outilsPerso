import { getMinuteurDuration, saveMinuteurDuration } from './storage.js';
import {
  formatTimer, setRingProgress, resetRing, parsePickerValues,
  setPickerValues, playAlert, vibrate, showToast, setPrimaryButtonRunning, now,
} from './utils.js';

export class Minuteur {
  constructor() {
    this.totalSeconds = getMinuteurDuration();
    this.remaining = this.totalSeconds;
    this.running = false;
    this.startTime = 0;
    this.rafId = null;
    this.finished = false;

    this.display = document.getElementById('minuteurDisplay');
    this.ring = document.querySelector('.minuteur-ring');
    this.picker = document.getElementById('minuteurPicker');
    this.presets = document.querySelector('#panel-minuteur .presets');
    this.panel = document.getElementById('panel-minuteur');
    this.startBtn = document.getElementById('minuteurStart');
    this.cancelBtn = document.getElementById('minuteurCancel');
    this.resetBtn = document.getElementById('minuteurReset');

    setPickerValues('minuteur-h', 'minuteur-m', 'minuteur-s', this.totalSeconds);
    this.bindEvents();
    this.updateDisplay();
  }

  bindEvents() {
    this.startBtn?.addEventListener('click', () => this.toggle());
    this.cancelBtn?.addEventListener('click', () => this.cancel());
    this.resetBtn?.addEventListener('click', () => this.reset());

    this.presets?.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.running) return;
        const sec = parseInt(btn.dataset.seconds, 10);
        this.setDuration(sec);
        this.presets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    this.bindPicker('minuteur-h', 0, 99);
    this.bindPicker('minuteur-m', 0, 59);
    this.bindPicker('minuteur-s', 0, 59);
  }

  bindPicker(id, min, max) {
    const el = document.getElementById(id);
    el?.addEventListener('change', () => {
      if (this.running) return;
      let v = parseInt(el.value, 10) || 0;
      v = Math.min(max, Math.max(min, v));
      el.value = String(v).padStart(2, '0');
      this.setDuration(parsePickerValues('minuteur-h', 'minuteur-m', 'minuteur-s'));
      this.clearPresetActive();
    });
  }

  clearPresetActive() {
    this.presets?.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  }

  setDuration(seconds) {
    this.totalSeconds = Math.max(1, seconds);
    this.remaining = this.totalSeconds;
    saveMinuteurDuration(this.totalSeconds);
    setPickerValues('minuteur-h', 'minuteur-m', 'minuteur-s', this.totalSeconds);
    this.updateDisplay();
    resetRing(this.ring);
    this.finished = false;
    this.panel?.classList.remove('finished');
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
      this.setDuration(parsePickerValues('minuteur-h', 'minuteur-m', 'minuteur-s') || this.totalSeconds);
    }
    this.running = true;
    this.finished = false;
    this.startTime = now();
    this.setEditing(false);
    setPrimaryButtonRunning(this.startBtn, true);
    this.tick();
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    setPrimaryButtonRunning(this.startBtn, false);
  }

  cancel() {
    this.pause();
    this.remaining = this.totalSeconds;
    this.setEditing(true);
    this.updateDisplay();
    resetRing(this.ring);
    this.finished = false;
    this.panel?.classList.remove('finished');
  }

  reset() {
    this.pause();
    this.remaining = this.totalSeconds;
    this.setEditing(true);
    this.updateDisplay();
    resetRing(this.ring);
    this.finished = false;
    this.panel?.classList.remove('finished');
  }

  complete() {
    this.running = false;
    this.finished = true;
    this.remaining = 0;
    cancelAnimationFrame(this.rafId);
    setPrimaryButtonRunning(this.startBtn, false);
    this.setEditing(true);
    this.updateDisplay();
    setRingProgress(this.ring, 0, 'success');
    this.panel?.classList.add('finished');
    playAlert();
    vibrate();
    showToast('Minuteur terminé !');
    document.title = '⏰ Minuteur terminé — Horizon';
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
    if (this.display) this.display.textContent = formatTimer(Math.ceil(this.remaining));
  }

  setEditing(editing) {
    this.picker?.classList.toggle('hidden', !editing);
    this.presets?.classList.toggle('hidden', !editing);
    this.cancelBtn?.classList.toggle('hidden-slot', editing);
  }

  onModeEnter() {
    this.updateDisplay();
  }

  onModeLeave() {
    /* minuteur keeps running in background */
  }
}

/* Picker increment buttons */
document.addEventListener('click', e => {
  const btn = e.target.closest('.picker-btn');
  if (!btn) return;
  const targetId = btn.dataset.target;
  const dir = parseInt(btn.dataset.dir, 10);
  const input = document.getElementById(targetId);
  if (!input || input.closest('.time-picker')?.classList.contains('hidden')) return;

  const max = targetId.includes('-h') ? 99 : 59;
  let v = (parseInt(input.value, 10) || 0) + dir;
  if (v > max) v = 0;
  if (v < 0) v = max;
  input.value = String(v).padStart(2, '0');
  input.dispatchEvent(new Event('change'));
});
