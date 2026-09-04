const STORAGE_KEY = 'horizon-timer';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaults();
  } catch {
    return getDefaults();
  }
}

export function saveState(partial) {
  const current = loadState();
  const next = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function getDefaults() {
  return {
    theme: 'auto',
    chronoLaps: [],
    minuteurDuration: 300,
    countdownDuration: 300,
    alarms: [],
  };
}

export function getLaps() {
  return loadState().chronoLaps ?? [];
}

export function addLap(lap) {
  const laps = getLaps();
  laps.unshift(lap);
  saveState({ chronoLaps: laps.slice(0, 200) });
  return laps;
}

export function clearLaps() {
  saveState({ chronoLaps: [] });
}

export function getTheme() {
  return loadState().theme ?? 'auto';
}

export function setTheme(theme) {
  saveState({ theme });
}

export function saveMinuteurDuration(seconds) {
  saveState({ minuteurDuration: seconds });
}

export function saveCountdownDuration(seconds) {
  saveState({ countdownDuration: seconds });
}

export function getMinuteurDuration() {
  return loadState().minuteurDuration ?? 300;
}

export function getCountdownDuration() {
  return loadState().countdownDuration ?? 300;
}

export function getAlarms() {
  return loadState().alarms ?? [];
}

export function saveAlarms(alarms) {
  saveState({ alarms });
}

export function addAlarm(alarm) {
  const alarms = getAlarms();
  alarms.push(alarm);
  saveAlarms(alarms.slice(0, 50));
  return alarms;
}

export function updateAlarm(id, partial) {
  const alarms = getAlarms().map(a => (a.id === id ? { ...a, ...partial } : a));
  saveAlarms(alarms);
  return alarms;
}

export function deleteAlarm(id) {
  saveAlarms(getAlarms().filter(a => a.id !== id));
}
