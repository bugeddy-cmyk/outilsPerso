import { getTheme, setTheme } from './storage.js';

const THEME_COLORS = {
  light: '#ebebf0',
  dark: '#1e1e1e',
};

export function applyTheme(preference) {
  const root = document.documentElement;
  let resolved = preference;
  if (preference === 'auto') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[resolved] || THEME_COLORS.light;
}

export function initBoiteTheme() {
  applyTheme(getTheme());

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'auto') applyTheme('auto');
  });
}
