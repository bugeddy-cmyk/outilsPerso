import { loadState, saveState } from './storage.js';

const DEFAULT_PROGRESS = {
  seenIds: [],
  favoriteIds: [],
  lastPhraseId: null,
};

export function getPhrasesProgress() {
  const raw = loadState().phrasesProgress;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROGRESS };
  return {
    seenIds: Array.isArray(raw.seenIds) ? [...raw.seenIds] : [],
    favoriteIds: Array.isArray(raw.favoriteIds) ? [...raw.favoriteIds] : [],
    lastPhraseId: raw.lastPhraseId ?? null,
  };
}

export function savePhrasesProgress(partial) {
  const next = { ...getPhrasesProgress(), ...partial };
  saveState({ phrasesProgress: next });
  return next;
}

export function markPhraseSeen(id) {
  const progress = getPhrasesProgress();
  if (!id || progress.seenIds.includes(id)) return progress;
  const seenIds = [...progress.seenIds, id];
  return savePhrasesProgress({ seenIds, lastPhraseId: id });
}

export function setLastPhrase(id) {
  return savePhrasesProgress({ lastPhraseId: id });
}

export function toggleFavorite(id) {
  const progress = getPhrasesProgress();
  const set = new Set(progress.favoriteIds);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return savePhrasesProgress({ favoriteIds: [...set] });
}

export function isFavorite(id) {
  return getPhrasesProgress().favoriteIds.includes(id);
}

export function clearSeenHistory() {
  return savePhrasesProgress({ seenIds: [], lastPhraseId: null });
}
