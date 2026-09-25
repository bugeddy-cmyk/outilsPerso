import { loadState, saveState } from './storage.js';

/** @typedef {'inbox'|'todo'|'idea'|'scheduled'|'archived'} ItemStatus */
/** @typedef {'idea'|'task'|'reminder'|'note'|'other'} ItemKind */
/** @typedef {'quick'|'focus'|'creative'|'admin'|'unknown'} ItemEffort */

export const STATUS_LABELS = {
  inbox: 'À trier',
  todo: 'À faire',
  idea: 'Idée gardée',
  scheduled: 'Planifié',
  archived: 'Archivé',
};

export const KIND_LABELS = {
  idea: 'Idée',
  task: 'Tâche',
  reminder: 'Rappel',
  note: 'Note',
  other: 'Autre',
};

export const EFFORT_LABELS = {
  quick: 'Rapide / mécanique',
  focus: 'Concentration',
  creative: 'Créatif',
  admin: 'Pratique / admin',
  unknown: 'Effort inconnu',
};

export const ENERGY_LEVELS = [
  { id: 'low', label: 'Énergie basse' },
  { id: 'medium', label: 'Énergie moyenne' },
  { id: 'high', label: 'Énergie haute' },
];

export const FOCUS_LEVELS = [
  { id: 'hard', label: 'Difficile de me concentrer' },
  { id: 'medium', label: 'Concentration moyenne' },
  { id: 'good', label: 'Bonne concentration' },
];

const COMPAT_MATRIX = {
  low: {
    hard: ['quick', 'admin', 'unknown'],
    medium: ['quick', 'admin', 'unknown', 'creative'],
    good: ['quick', 'admin', 'creative', 'unknown'],
  },
  medium: {
    hard: ['quick', 'admin', 'unknown'],
    medium: ['quick', 'admin', 'creative', 'unknown', 'focus'],
    good: ['quick', 'admin', 'creative', 'focus', 'unknown'],
  },
  high: {
    hard: ['quick', 'admin', 'unknown', 'creative'],
    medium: ['quick', 'admin', 'creative', 'focus', 'unknown'],
    good: ['quick', 'admin', 'creative', 'focus', 'unknown'],
  },
};

export function getCompatEfforts(energy, focus) {
  const e = energy || 'medium';
  const f = focus || 'medium';
  return COMPAT_MATRIX[e]?.[f] ?? ['unknown'];
}

export function getInboxItems() {
  return loadState().inboxItems ?? [];
}

export function getPersoPrefs() {
  const defaults = {
    energy: 'medium',
    focus: 'medium',
    highlightCompat: true,
  };
  return { ...defaults, ...(loadState().persoPrefs ?? {}) };
}

export function savePersoPrefs(partial) {
  saveState({ persoPrefs: { ...getPersoPrefs(), ...partial } });
}

function touch(items) {
  saveState({ inboxItems: items });
  return items;
}

export function createItem({ title, kind = 'other', details = '', dueDate = null, category = '', effort = 'unknown' }) {
  const now = Date.now();
  const item = {
    id: `i-${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: title.trim(),
    kind,
    details: details?.trim() || '',
    status: 'inbox',
    effort: effort || 'unknown',
    category: category?.trim() || '',
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
  };
  const items = [item, ...getInboxItems()];
  touch(items);
  return item;
}

export function updateItem(id, partial) {
  const items = getInboxItems().map(item => {
    if (item.id !== id) return item;
    return { ...item, ...partial, updatedAt: Date.now() };
  });
  touch(items);
  return items.find(i => i.id === id);
}

export function deleteItem(id) {
  touch(getInboxItems().filter(i => i.id !== id));
}

export function clearAllInboxItems() {
  touch([]);
}

export function itemsByStatus(status) {
  return getInboxItems().filter(i => i.status === status);
}

export function filterItems({ status, query, compatOnly, energy, focus }) {
  let list = getInboxItems();
  if (status && status !== 'all') {
    list = list.filter(i => i.status === status);
  }
  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter(i =>
      i.title.toLowerCase().includes(q)
      || (i.details && i.details.toLowerCase().includes(q))
      || (i.category && i.category.toLowerCase().includes(q)),
    );
  }
  if (compatOnly) {
    const allowed = new Set(getCompatEfforts(energy, focus));
    list = list.filter(i => allowed.has(i.effort || 'unknown'));
  }
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function pickSuggestedItem(energy, focus) {
  const active = getInboxItems().filter(i => i.status === 'inbox' || i.status === 'todo');
  if (!active.length) return null;
  const allowed = new Set(getCompatEfforts(energy, focus));
  const compat = active.filter(i => allowed.has(i.effort || 'unknown'));
  const pool = compat.length ? compat : active;
  return pool[Math.floor(Math.random() * pool.length)];
}
