import { Chrono } from './chrono.js';
import { Minuteur } from './minuteur.js';
import { Countdown } from './countdown.js';
import { Alarme } from './alarme.js';
import { Perso } from './perso.js';
import { getTheme, setTheme } from './storage.js';
import { initParallax, initMicroAnimations } from './parallax.js';

const modes = ['perso', 'chrono', 'minuteur', 'countdown', 'alarme'];
let currentMode = 'chrono';

const chrono = new Chrono();
const minuteur = new Minuteur();
const countdown = new Countdown();
const alarme = new Alarme();
const perso = new Perso();

const instances = { perso, chrono, minuteur, countdown, alarme };

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
  if (nav) {
    const startIdx = modes.indexOf(currentMode);
    nav.dataset.count = String(modes.length);
    nav.dataset.active = String(startIdx);
    updateModeIndicator(nav, startIdx);
  }

  tabs?.forEach((tab, index) => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode, index));
  });

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

function switchMode(mode, index, { force = false } = {}) {
  if (mode === currentMode && !force) return;

  if (mode !== currentMode) {
    instances[currentMode]?.onModeLeave?.();
    currentMode = mode;
  }

  const nav = document.querySelector('.mode-nav');
  if (nav) {
    nav.dataset.active = String(index);
    updateModeIndicator(nav, index);
  }

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
  updateHeaderNav();
}

function openPersoInterface(subView = 'capture') {
  switchMode('perso', modes.indexOf('perso'));
  perso?.switchSubView?.(subView);
}

function returnToTimer() {
  switchMode('chrono', modes.indexOf('chrono'));
}

function initHeaderNav() {
  document.getElementById('openPersoBtn')?.addEventListener('click', () => {
    if (currentMode === 'perso') returnToTimer();
    else openPersoInterface('capture');
  });

  document.getElementById('persoEntryBtn')?.addEventListener('click', () => {
    openPersoInterface('capture');
  });

  document.getElementById('persoEntryLink')?.addEventListener('click', e => {
    e.preventDefault();
    openPersoInterface('boite');
  });

  updateHeaderNav();
}

function updateHeaderNav() {
  const onPerso = currentMode === 'perso';
  const entry = document.getElementById('persoEntry');
  if (entry) entry.hidden = onPerso;

  const btn = document.getElementById('openPersoBtn');
  if (!btn) return;
  btn.textContent = onPerso ? 'Minuteur' : 'Boîte à idées';
  btn.classList.toggle('header-link-btn--accent', !onPerso);
  btn.setAttribute(
    'aria-label',
    onPerso
      ? 'Revenir au chrono et aux modes minuteur'
      : 'Ouvrir la boîte à idées : capture et tri',
  );
}

function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (currentMode === 'chrono') chrono.toggle();
      else if (currentMode === 'minuteur') minuteur.toggle();
      else if (currentMode === 'countdown') countdown.toggle();
    }

    if (e.code === 'KeyL' && currentMode === 'chrono') chrono.lap();
    if (e.code === 'KeyR') instances[currentMode]?.reset?.();

    if (e.code === 'Digit1') switchMode('perso', 0);
    if (e.code === 'Digit2') switchMode('chrono', 1);
    if (e.code === 'Digit3') switchMode('minuteur', 2);
    if (e.code === 'Digit4') switchMode('countdown', 3);
    if (e.code === 'Digit5') switchMode('alarme', 4);
  });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getTheme() === 'auto') applyTheme('auto');
});

initTheme();
initModeNav();
initHeaderNav();
initKeyboard();
initParallax();
initMicroAnimations();

function updateModeIndicator(nav, index) {
  const indicator = nav.querySelector('.mode-indicator');
  const count = modes.length;
  if (!indicator) return;
  indicator.style.width = `calc((100% - 8px) / ${count})`;
  indicator.style.transform = `translateX(calc(${index} * (100% + ${2}px)))`;
}

export { chrono, minuteur, countdown, alarme, perso };
