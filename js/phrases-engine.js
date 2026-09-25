/**
 * Tirage sans répétition dans un cycle. Les favorites ne sont pas réaffichées
 * par le tirage normal une fois vues (elles restent dans le pool jusqu'à vues).
 */

export function getUnseenPhrases(phrases, seenIds) {
  const seen = new Set(seenIds);
  return phrases.filter(p => p?.id && !seen.has(p.id));
}

export function pickRandomPhrase(phrases, seenIds) {
  const pool = getUnseenPhrases(phrases, seenIds);
  if (!pool.length) {
    return { exhausted: true, phrase: null };
  }
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  return { exhausted: false, phrase };
}

export function getProgressCounts(phrases, seenIds) {
  const total = phrases.length;
  const seen = new Set(seenIds);
  const seenCount = phrases.filter(p => seen.has(p.id)).length;
  return { seenCount, total, remaining: total - seenCount };
}

export function findPhraseById(phrases, id) {
  return phrases.find(p => p.id === id) ?? null;
}
