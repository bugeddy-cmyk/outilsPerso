import { Chrono } from './chrono.js';
import { Minuteur } from './minuteur.js';
import { Countdown } from './countdown.js';
import { getTheme, setTheme } from './storage.js';
import { initParallax, initMicroAnimations } from './parallax.js';

const modes = ['chrono', 'minuteur', 'countdown'];
let currentMode = 'chrono';

const chrono = new Chrono();
const minuteur = new Minuteur();
const countdown = new Countdown();

const instances = { chrono, minuteur, countdown };

function initTheme() {
  const saved = getTheme();
  applyTheme(saved);

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  });
}

function applyTheme(preference) {
  const root = document.documentElement;
  if (preference === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    root.dataset.theme = preference;
  }
}

function initModeNav() {
  const nav = document.querySelector('.mode-nav');
  const tabs = nav?.querySelectorAll('.mode-btn');

  tabs?.forEach((tab, index) => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode, index));
  });

  /* Swipe between modes on touch devices */
  let touchStartX = 0;
  const app = document.querySelector('.app');
  app?.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  app?.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) < 60) return;
    const idx = modes.indexOf(currentMode);
    if (diff < 0 && idx < modes.length - 1) switchMode(modes[idx + 1], idx + 1);
    if (diff > 0 && idx > 0) switchMode(modes[idx - 1], idx - 1);
  }, { passive: true });
}

function switchMode(mode, index) {
  if (mode === currentMode) return;

  instances[currentMode]?.onModeLeave?.();
  currentMode = mode;

  const nav = document.querySelector('.mode-nav');
  if (nav) nav.dataset.active = String(index);

  document.querySelectorAll('.mode-btn').forEach((btn, i) => {
    const active = i === index;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  document.querySelectorAll('.panel').forEach(panel => {
    const isActive = panel.id === `panel-${mode}`;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });

  instances[mode]?.onModeEnter?.();
}

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.matches('input')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (currentMode === 'chrono') chrono.toggle();
      else if (currentMode === 'minuteur') minuteur.toggle();
      else countdown.toggle();
    }

    if (e.code === 'KeyL' && currentMode === 'chrono') chrono.lap();
    if (e.code === 'KeyR') instances[currentMode]?.reset?.();

    if (e.code === 'Digit1') switchMode('chrono', 0);
    if (e.code === 'Digit2') switchMode('minuteur', 1);
    if (e.code === 'Digit3') switchMode('countdown', 2);
  });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getTheme() === 'auto') applyTheme('auto');
});

initTheme();
initModeNav();
initKeyboard();
initParallax();
initMicroAnimations();

export { chrono, minuteur, countdown };
