import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickRandomPhrase,
  getUnseenPhrases,
  getProgressCounts,
} from './phrases-engine.js';

const SAMPLE = [
  { id: 'a' },
  { id: 'b' },
  { id: 'c' },
];

test('ne repète pas une phrase déjà vue', () => {
  const seen = ['a', 'b'];
  const pool = getUnseenPhrases(SAMPLE, seen);
  assert.equal(pool.length, 1);
  assert.equal(pool[0].id, 'c');
  const { phrase, exhausted } = pickRandomPhrase(SAMPLE, seen);
  assert.equal(exhausted, false);
  assert.equal(phrase.id, 'c');
});

test('cycle épuisé sans boucle', () => {
  const { exhausted, phrase } = pickRandomPhrase(SAMPLE, ['a', 'b', 'c']);
  assert.equal(exhausted, true);
  assert.equal(phrase, null);
});

test('compte la progression', () => {
  const { seenCount, total, remaining } = getProgressCounts(SAMPLE, ['a']);
  assert.equal(seenCount, 1);
  assert.equal(total, 3);
  assert.equal(remaining, 2);
});

test('collection vide', () => {
  const { exhausted } = pickRandomPhrase([], []);
  assert.equal(exhausted, true);
  const counts = getProgressCounts([], []);
  assert.equal(counts.total, 0);
});

test('tirages successifs couvrent tout le pool sans répétition', () => {
  const seen = [];
  for (let i = 0; i < SAMPLE.length; i++) {
    const { phrase, exhausted } = pickRandomPhrase(SAMPLE, seen);
    assert.equal(exhausted, false);
    assert.ok(!seen.includes(phrase.id));
    seen.push(phrase.id);
  }
  const done = pickRandomPhrase(SAMPLE, seen);
  assert.equal(done.exhausted, true);
});
