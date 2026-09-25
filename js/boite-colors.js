/** Tons style macOS (Tags / Rappels) — utilisés dans toute l’UI boîte */

export const STATUS_TONE = {
  inbox: 'blue',
  todo: 'green',
  idea: 'orange',
  scheduled: 'purple',
  archived: 'gray',
};

export const KIND_TONE = {
  idea: 'yellow',
  task: 'blue',
  reminder: 'red',
  note: 'teal',
  other: 'gray',
};

export const EFFORT_TONE = {
  quick: 'green',
  focus: 'indigo',
  creative: 'pink',
  admin: 'orange',
  unknown: 'gray',
};

export const VIEW_TONE = {
  capture: 'blue',
  boite: 'orange',
  maintenant: 'purple',
};

export const FILTER_TONE = {
  inbox: 'blue',
  todo: 'green',
  idea: 'orange',
  scheduled: 'purple',
  archived: 'gray',
  all: 'teal',
};

export function toneClass(tone, prefix = 'tone') {
  return tone ? `${prefix}-${tone}` : '';
}
