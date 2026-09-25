import { PHRASES, CATEGORY_LABELS } from './phrases-data.js';
import {
  getPhrasesProgress,
  markPhraseSeen,
  setLastPhrase,
  toggleFavorite,
  isFavorite,
  clearSeenHistory,
} from './phrases-storage.js';
import {
  pickRandomPhrase,
  getProgressCounts,
  findPhraseById,
  getUnseenPhrases,
} from './phrases-engine.js';
import { initBoiteTheme } from './boite-theme.js';
import { showToast } from './boite-toast.js';

class PhrasesApp {
  constructor() {
    this.phrases = PHRASES;
    this.currentId = null;
    this.view = 'phrase';
    this.fromFavoritePick = false;

    initBoiteTheme();
    this.bindShell();
    this.restoreOrPick();
    this.setView('phrase');
  }

  bindShell() {
    document.querySelectorAll('.phrases-nav-item, .phrases-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setView(btn.dataset.view));
    });

    document.getElementById('newPhraseBtn')?.addEventListener('click', () => this.pickNewPhrase());
    document.getElementById('favoriteBtn')?.addEventListener('click', () => this.toggleCurrentFavorite());
    document.getElementById('exhaustedRestart')?.addEventListener('click', () => this.confirmRestart());
    document.getElementById('exhaustedFavorites')?.addEventListener('click', () => this.setView('favorites'));
    document.getElementById('settingsRestart')?.addEventListener('click', () => this.confirmRestart());
  }

  setView(view) {
    this.view = view;
    document.querySelectorAll('.phrases-nav-item, .phrases-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.querySelectorAll('.phrases-panel').forEach(panel => {
      const on = panel.dataset.view === view;
      panel.hidden = !on;
      panel.classList.toggle('active', on);
    });

    const titles = {
      phrase: ['Phrases', 'Une inspiration à la fois'],
      favorites: ['Favoris', 'Revoir une phrase que tu as gardée'],
      settings: ['Réglages', 'Progression et cycle'],
    };
    const [t, s] = titles[view] || titles.phrase;
    document.getElementById('viewTitle').textContent = t;
    document.getElementById('viewSubtitle').textContent = s;
    document.title = `${t} — Horizon Phrases`;

    if (view === 'favorites') this.renderFavorites();
    if (view === 'settings') this.renderSettings();
    if (view === 'phrase') this.renderPhrase();
  }

  restoreOrPick() {
    if (!this.phrases.length) {
      this.showExhausted();
      document.querySelector('#exhaustedState h2')?.textContent = 'Aucune phrase dans la collection';
      return;
    }
    const { lastPhraseId, seenIds } = getPhrasesProgress();
    if (lastPhraseId && findPhraseById(this.phrases, lastPhraseId)) {
      this.displayPhrase(lastPhraseId, { markSeen: false });
      return;
    }
    if (!seenIds.length) {
      this.pickNewPhrase();
      return;
    }
    const { exhausted, phrase } = pickRandomPhrase(this.phrases, seenIds);
    if (exhausted) {
      this.showExhausted();
      return;
    }
    this.displayPhrase(phrase.id, { markSeen: true });
  }

  pickNewPhrase() {
    const { seenIds } = getPhrasesProgress();
    const { exhausted, phrase } = pickRandomPhrase(this.phrases, seenIds);
    if (exhausted) {
      this.showExhausted();
      return;
    }
    this.fromFavoritePick = false;
    this.displayPhrase(phrase.id, { markSeen: true });
  }

  displayPhrase(id, { markSeen = true } = {}) {
    const phrase = findPhraseById(this.phrases, id);
    if (!phrase) return;
    this.currentId = id;
    setLastPhrase(id);
    if (markSeen) markPhraseSeen(id);
    this.hideExhausted();
    this.renderPhrase();
  }

  showFavorite(id) {
    this.fromFavoritePick = true;
    this.displayPhrase(id, { markSeen: false });
    this.setView('phrase');
    showToast('Phrase favorite — hors du tirage normal');
  }

  renderPhrase() {
    const phrase = findPhraseById(this.phrases, this.currentId);
    const card = document.getElementById('phraseCard');
    const empty = document.getElementById('phraseEmpty');
    if (!phrase) {
      if (card) card.hidden = true;
      if (empty) empty.hidden = false;
      this.updateProgress();
      return;
    }
    if (card) card.hidden = false;
    if (empty) empty.hidden = true;

    const isFr = phrase.language === 'Français' || !phrase.frenchTranslation;
    const main = document.getElementById('phraseOriginal');
    const trans = document.getElementById('phraseTranslation');
    const transWrap = document.getElementById('phraseTranslationWrap');

    if (main) {
      main.textContent = phrase.textOriginal;
      main.lang = phrase.languageCode || 'und';
    }

    if (transWrap && trans) {
      if (isFr) {
        transWrap.hidden = true;
      } else {
        transWrap.hidden = false;
        trans.textContent = phrase.frenchTranslation || '—';
      }
    }

    const meta = document.getElementById('phraseMeta');
    if (meta) {
      meta.innerHTML = this.metaHtml(phrase);
    }

    const cat = document.getElementById('phraseCategory');
    if (cat) {
      const label = CATEGORY_LABELS[phrase.category] || phrase.category || '';
      cat.textContent = label;
      cat.hidden = !label;
      cat.className = `phrase-category mac-tag tone-${categoryTone(phrase.category)}`;
    }

    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) {
      const on = isFavorite(phrase.id);
      favBtn.setAttribute('aria-pressed', String(on));
      favBtn.textContent = on ? 'Retirer des favoris' : 'Ajouter aux favoris';
    }

    this.updateProgress();
  }

  metaHtml(phrase) {
    const parts = [];
    parts.push(`<span class="meta-line"><strong>Langue :</strong> ${escapeHtml(phrase.language)}</span>`);

    if (phrase.region && phrase.attributionConfidence !== 'uncertain') {
      parts.push(`<span class="meta-line"><strong>Origine :</strong> ${escapeHtml(phrase.region)}</span>`);
    }

    if (phrase.author) {
      const qual = phrase.attributionConfidence === 'uncertain' ? ' (attribution incertaine)' : '';
      parts.push(`<span class="meta-line"><strong>Auteur :</strong> ${escapeHtml(phrase.author)}${qual}</span>`);
    }

    if (phrase.source) {
      parts.push(`<span class="meta-line meta-source">${escapeHtml(phrase.source)}</span>`);
    }

    if (phrase.attributionConfidence === 'uncertain' && !phrase.author) {
      parts.push('<span class="meta-line meta-uncertain">Origine ou auteur non établi avec certitude.</span>');
    }

    if (phrase.attributionConfidence === 'original') {
      parts.push('<span class="meta-line">Texte original pour cette application.</span>');
    }

    return parts.join('');
  }

  updateProgress() {
    const { seenCount, total, remaining } = getProgressCounts(this.phrases, getPhrasesProgress().seenIds);
    const el = document.getElementById('phraseProgress');
    if (el) el.textContent = `${seenCount} / ${total} vues · ${remaining} restantes`;

    const newBtn = document.getElementById('newPhraseBtn');
    const exhausted = getUnseenPhrases(this.phrases, getPhrasesProgress().seenIds).length === 0;
    if (newBtn) newBtn.disabled = exhausted && total > 0;
  }

  showExhausted() {
    document.getElementById('phraseCard')?.hidden = true;
    document.getElementById('phraseEmpty')?.hidden = true;
    const box = document.getElementById('exhaustedState');
    if (box) box.hidden = false;
    document.getElementById('newPhraseBtn')?.disabled = true;
    const { total } = getProgressCounts(this.phrases, getPhrasesProgress().seenIds);
    const prog = document.getElementById('phraseProgress');
    if (prog) prog.textContent = `${total} / ${total} vues`;
  }

  hideExhausted() {
    document.getElementById('exhaustedState')?.hidden = true;
  }

  toggleCurrentFavorite() {
    if (!this.currentId) return;
    toggleFavorite(this.currentId);
    this.renderPhrase();
    if (this.view === 'favorites') this.renderFavorites();
    showToast(isFavorite(this.currentId) ? 'Ajoutée aux favoris' : 'Retirée des favoris');
  }

  renderFavorites() {
    const list = document.getElementById('favoritesList');
    const empty = document.getElementById('favoritesEmpty');
    const ids = getPhrasesProgress().favoriteIds;
    const items = ids.map(id => findPhraseById(this.phrases, id)).filter(Boolean);

    if (list) {
      list.innerHTML = items.map(p => `
        <li class="favorite-row">
          <div class="favorite-text">
            <p class="favorite-quote">${escapeHtml(p.textOriginal)}</p>
            <p class="favorite-sub">${escapeHtml(p.language)}${p.frenchTranslation && p.language !== 'Français' ? ` · ${escapeHtml(p.frenchTranslation)}` : ''}</p>
          </div>
          <button type="button" class="mac-btn mac-btn-secondary mac-btn-sm" data-show-fav="${p.id}">Afficher</button>
        </li>
      `).join('');

      list.querySelectorAll('[data-show-fav]').forEach(btn => {
        btn.addEventListener('click', () => this.showFavorite(btn.dataset.showFav));
      });
    }

    if (empty) empty.hidden = items.length > 0;
  }

  renderSettings() {
    const { seenCount, total } = getProgressCounts(this.phrases, getPhrasesProgress().seenIds);
    const el = document.getElementById('settingsProgress');
    if (el) {
      el.textContent = `Tu as vu ${seenCount} phrase${seenCount > 1 ? 's' : ''} sur ${total} dans ce cycle.`;
    }
  }

  confirmRestart() {
    const ok = window.confirm(
      'Recommencer un nouveau cycle ?\n\nL’historique des phrases vues sera effacé. Tes favoris seront conservés.',
    );
    if (!ok) return;
    clearSeenHistory();
    this.hideExhausted();
    this.pickNewPhrase();
    showToast('Nouveau cycle — bonne exploration');
    this.renderSettings();
  }
}

function categoryTone(category) {
  const map = {
    motivation: 'blue',
    humour: 'orange',
    persévérance: 'green',
    créativité: 'pink',
    repos: 'teal',
    réconfort: 'purple',
  };
  return map[category] || 'gray';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

new PhrasesApp();
