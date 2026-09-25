import {
  createItem,
  updateItem,
  deleteItem,
  getPersoPrefs,
  savePersoPrefs,
  filterItems,
  pickSuggestedItem,
  getInboxItems,
  STATUS_LABELS,
  KIND_LABELS,
  EFFORT_LABELS,
  ENERGY_LEVELS,
  FOCUS_LEVELS,
} from './perso-storage.js';
import { showToast } from './boite-toast.js';
import { initBoiteTheme } from './boite-theme.js';
import {
  STATUS_TONE,
  KIND_TONE,
  EFFORT_TONE,
  VIEW_TONE,
  FILTER_TONE,
} from './boite-colors.js';

const TONE_NAMES = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'gray'];

const VIEW_COPY = {
  capture: {
    title: 'Capture',
    subtitle: 'Capture une idée avant de l\'oublier — tu pourras la trier plus tard',
  },
  boite: {
    title: 'Boîte de réception',
    subtitle: 'Trie en quelques gestes, sans remplir de longs formulaires',
  },
  maintenant: {
    title: 'Maintenant',
    subtitle: 'Qu\'est-ce qui te semble faisable ? Tu peux aussi ne rien choisir',
  },
};

class BoiteApp {
  constructor() {
    this.view = 'capture';
    this.inboxFilter = 'inbox';
    this.inboxSearch = '';
    this.editingId = null;

    initBoiteTheme();
    this.initToneUi();
    this.bindNav();
    this.bindCapture();
    this.bindInbox();
    this.bindNow();
    this.bindEditDialog();

    const hash = location.hash.replace('#', '');
    if (['capture', 'boite', 'maintenant'].includes(hash)) {
      this.setView(hash);
    } else {
      this.setView('capture');
    }
  }

  initToneUi() {
    document.querySelectorAll('.nav-item, .tabbar-btn').forEach(btn => {
      const tone = VIEW_TONE[btn.dataset.view];
      if (tone) btn.classList.add(`tone-${tone}`);
    });

    document.querySelectorAll('#inboxStatusFilters .segment').forEach(seg => {
      const tone = FILTER_TONE[seg.dataset.status];
      if (tone) seg.classList.add(`tone-${tone}`);
    });

    this.bindColoredSelect('captureKind', KIND_TONE, 'captureKindField');
    this.bindColoredSelect('captureEffort', EFFORT_TONE, 'captureEffortField');
    this.bindColoredSelect('editKind', KIND_TONE);
    this.bindColoredSelect('editStatus', STATUS_TONE);
    this.bindColoredSelect('editEffort', EFFORT_TONE);
  }

  bindColoredSelect(selectId, toneMap, fieldId) {
    const select = document.getElementById(selectId);
    const field = fieldId
      ? document.getElementById(fieldId)
      : select?.closest('.mac-field');
    if (!select || !field) return;

    const apply = () => {
      TONE_NAMES.forEach(t => field.classList.remove(`field-tone-${t}`));
      const tone = toneMap[select.value] || 'gray';
      field.classList.add(`field-tone-${tone}`);
    };
    select.addEventListener('change', apply);
    apply();
  }

  bindNav() {
    document.querySelectorAll('.nav-item, .tabbar-btn').forEach(el => {
      el.addEventListener('click', () => this.setView(el.dataset.view));
    });
  }

  setView(view) {
    this.view = view;
    location.hash = view;

    document.querySelectorAll('.nav-item, .tabbar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      const on = panel.dataset.view === view;
      panel.classList.toggle('active', on);
      panel.hidden = !on;
    });

    const copy = VIEW_COPY[view];
    const titleEl = document.getElementById('viewTitle');
    const subEl = document.getElementById('viewSubtitle');
    if (titleEl) titleEl.textContent = copy.title;
    if (subEl) subEl.textContent = copy.subtitle;
    document.title = `${copy.title} — Boîte à idées`;

    const toolbar = document.querySelector('.desk-toolbar');
    if (toolbar) {
      TONE_NAMES.forEach(t => toolbar.classList.remove(`toolbar-tone-${t}`));
      toolbar.classList.add(`toolbar-tone-${VIEW_TONE[view]}`);
    }

    if (view === 'boite') this.renderInbox();
    if (view === 'maintenant') this.renderNow();
    if (view === 'capture') this.renderRecent();
  }

  bindCapture() {
    this.captureForm = document.getElementById('captureForm');
    this.captureInput = document.getElementById('captureTitle');

    this.captureForm?.addEventListener('submit', e => {
      e.preventDefault();
      this.handleCapture();
    });
  }

  handleCapture() {
    const title = (this.captureInput?.value || '').trim();
    if (!title) {
      showToast('Écris quelque chose, même court');
      this.captureInput?.focus();
      return;
    }

    createItem({
      title,
      kind: document.getElementById('captureKind')?.value || 'other',
      details: document.getElementById('captureDetails')?.value || '',
      dueDate: document.getElementById('captureDue')?.value || null,
      category: document.getElementById('captureCategory')?.value || '',
      effort: document.getElementById('captureEffort')?.value || 'unknown',
    });

    this.captureInput.value = '';
    ['captureDetails', 'captureDue', 'captureCategory'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const kind = document.getElementById('captureKind');
    const effort = document.getElementById('captureEffort');
    if (kind) kind.value = 'other';
    if (effort) effort.value = 'unknown';

    showToast('Enregistré');
    this.captureInput.focus();
    this.renderRecent();
  }

  bindInbox() {
    this.inboxList = document.getElementById('inboxList');
    this.inboxEmpty = document.getElementById('inboxEmpty');

    document.getElementById('inboxSearch')?.addEventListener('input', e => {
      this.inboxSearch = e.target.value;
      this.renderInbox();
    });

    document.getElementById('inboxStatusFilters')?.querySelectorAll('.segment').forEach(chip => {
      chip.addEventListener('click', () => {
        this.inboxFilter = chip.dataset.status;
        document.querySelectorAll('#inboxStatusFilters .segment').forEach(c => {
          c.classList.toggle('active', c.dataset.status === this.inboxFilter);
        });
        this.renderInbox();
      });
    });

    this.inboxList?.addEventListener('click', e => this.onInboxClick(e));
    this.inboxList?.addEventListener('change', e => this.onTriageChange(e));
  }

  onTriageChange(e) {
    const select = e.target.closest('[data-triage]');
    if (!select) return;
    const card = select.closest('[data-id]');
    const id = card?.dataset.id;
    const action = select.value;
    if (!id || !action) return;
    this.applyStatus(id, action);
    select.value = '';
  }

  onInboxClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn || !this.inboxList?.contains(btn)) return;
    const id = btn.closest('[data-id]')?.dataset.id;
    if (!id) return;

    const action = btn.dataset.action;
    if (action === 'edit') {
      this.openEdit(id);
      return;
    }
    if (action === 'delete') {
      const item = getInboxItems().find(i => i.id === id);
      const label = item?.title ? `« ${item.title.slice(0, 40)} »` : 'cet élément';
      if (!window.confirm(`Supprimer ${label} ?`)) return;
      deleteItem(id);
      showToast('Supprimé');
      this.refreshLists();
      return;
    }
    if (['todo', 'keepIdea', 'archive'].includes(action)) {
      this.applyStatus(id, action);
    }
  }

  applyStatus(id, action) {
    const statusMap = {
      keepInbox: 'inbox',
      todo: 'todo',
      keepIdea: 'idea',
      schedule: 'scheduled',
      archive: 'archived',
    };
    const status = statusMap[action];
    if (!status) return;
    const patch = { status };
    if (action === 'schedule') {
      const item = getInboxItems().find(i => i.id === id);
      if (!item?.dueDate) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        patch.dueDate = d.toISOString().slice(0, 10);
      }
    }
    updateItem(id, patch);
    showToast(STATUS_LABELS[status] ? `→ ${STATUS_LABELS[status]}` : 'Mis à jour');
    this.refreshLists();
  }

  bindNow() {
    const energyGroup = document.getElementById('energyGroup');
    const focusGroup = document.getElementById('focusGroup');

    ENERGY_LEVELS.forEach(level => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mood-opt mood-tone-${level.tone}`;
      btn.dataset.energy = level.id;
      btn.textContent = level.label;
      btn.addEventListener('click', () => {
        savePersoPrefs({ energy: level.id });
        this.syncMood();
        this.renderNow();
      });
      energyGroup?.appendChild(btn);
    });

    FOCUS_LEVELS.forEach(level => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mood-opt mood-tone-${level.tone}`;
      btn.dataset.focus = level.id;
      btn.textContent = level.label;
      btn.addEventListener('click', () => {
        savePersoPrefs({ focus: level.id });
        this.syncMood();
        this.renderNow();
      });
      focusGroup?.appendChild(btn);
    });

    document.getElementById('highlightCompat')?.addEventListener('change', e => {
      savePersoPrefs({ highlightCompat: e.target.checked });
      this.renderNow();
    });

    document.getElementById('suggestAnother')?.addEventListener('click', () => this.renderSuggestion());
    document.getElementById('suggestOpen')?.addEventListener('click', () => {
      const id = document.getElementById('suggestCard')?.dataset.itemId;
      if (id) this.openEdit(id);
    });

    document.getElementById('nowList')?.addEventListener('click', e => {
      const row = e.target.closest('[data-open-item]');
      if (row) this.openEdit(row.dataset.openItem);
    });
  }

  syncMood() {
    const prefs = getPersoPrefs();
    document.querySelectorAll('.mood-opt[data-energy]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.energy === prefs.energy);
    });
    document.querySelectorAll('.mood-opt[data-focus]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.focus === prefs.focus);
    });
    const toggle = document.getElementById('highlightCompat');
    if (toggle) toggle.checked = prefs.highlightCompat;
  }

  bindEditDialog() {
    this.dialog = document.getElementById('itemEditDialog');
    this.editForm = document.getElementById('itemEditForm');

    document.getElementById('editClose')?.addEventListener('click', () => this.closeEdit());
    document.getElementById('editCancel')?.addEventListener('click', () => this.closeEdit());

    this.editForm?.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.editingId) return;
      updateItem(this.editingId, {
        title: document.getElementById('editTitle')?.value.trim(),
        kind: document.getElementById('editKind')?.value,
        status: document.getElementById('editStatus')?.value,
        effort: document.getElementById('editEffort')?.value,
        details: document.getElementById('editDetails')?.value || '',
        dueDate: document.getElementById('editDue')?.value || null,
        category: document.getElementById('editCategory')?.value || '',
      });
      showToast('Enregistré');
      this.closeEdit();
      this.refreshLists();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.editingId) this.closeEdit();
    });
  }

  openEdit(id) {
    const item = getInboxItems().find(i => i.id === id);
    if (!item || !this.dialog) return;
    this.editingId = id;
    document.getElementById('editTitle').value = item.title;
    document.getElementById('editKind').value = item.kind;
    document.getElementById('editStatus').value = item.status;
    document.getElementById('editEffort').value = item.effort || 'unknown';
    document.getElementById('editDetails').value = item.details || '';
    document.getElementById('editDue').value = item.dueDate || '';
    document.getElementById('editCategory').value = item.category || '';
    document.getElementById('editKind').dispatchEvent(new Event('change'));
    document.getElementById('editStatus').dispatchEvent(new Event('change'));
    document.getElementById('editEffort').dispatchEvent(new Event('change'));
    this.dialog.showModal();
    document.getElementById('editTitle')?.focus();
  }

  closeEdit() {
    this.editingId = null;
    this.dialog?.close();
  }

  refreshLists() {
    this.renderRecent();
    this.renderInbox();
    this.renderNow();
  }

  renderRecent() {
    const list = document.getElementById('captureRecentList');
    if (!list) return;
    const recent = getInboxItems().slice(0, 8);
    list.innerHTML = recent.map(item => `
      <li class="list-row tone-row-${STATUS_TONE[item.status]}">
        ${statusBadge(item.status)}
        ${kindBadge(item.kind)}
        <span class="list-row-title">${escapeHtml(item.title)}</span>
      </li>
    `).join('');
  }

  renderInbox() {
    const list = filterItems({
      status: this.inboxFilter === 'all' ? null : this.inboxFilter,
      query: this.inboxSearch,
    });

    if (this.inboxList) {
      this.inboxList.innerHTML = list.map(item => this.cardHtml(item)).join('');
    }
    if (this.inboxEmpty) {
      this.inboxEmpty.textContent = this.inboxFilter === 'inbox'
        ? 'Rien à trier pour le moment'
        : 'Aucun élément dans cette vue';
    }
  }

  cardHtml(item) {
    const st = STATUS_TONE[item.status];
    return `
      <article class="item-card accent-tone tone-${st}" data-id="${item.id}" role="listitem">
        <header class="item-card-head">
          ${statusBadge(item.status)}
          ${kindBadge(item.kind)}
          ${effortBadge(item.effort)}
        </header>
        <h3 class="item-card-title">${escapeHtml(item.title)}</h3>
        ${item.details ? `<p class="item-card-details">${escapeHtml(item.details)}</p>` : ''}
        <div class="item-card-meta">${metaHtml(item)}</div>
        <footer class="item-card-foot">
          <select class="mac-input triage-select tone-${st}" data-triage aria-label="Classer ${escapeHtml(item.title)}">
            <option value="">Classer…</option>
            <option value="keepInbox">Garder en boîte</option>
            <option value="todo">À faire</option>
            <option value="keepIdea">Idée à garder</option>
            <option value="schedule">Planifier</option>
            <option value="archive">Archiver</option>
          </select>
          <div class="item-card-actions">
            <button type="button" class="mac-btn mac-btn-sm btn-tone-green" data-action="todo">À faire</button>
            <button type="button" class="mac-btn mac-btn-sm btn-tone-orange" data-action="keepIdea">Idée</button>
            <button type="button" class="mac-btn mac-btn-sm btn-tone-blue" data-action="edit">Modifier</button>
            <button type="button" class="mac-btn mac-btn-sm btn-tone-red" data-action="delete">Supprimer</button>
          </div>
        </footer>
      </article>
    `;
  }

  renderNow() {
    this.syncMood();
    const prefs = getPersoPrefs();
    const list = filterItems({
      status: null,
      compatOnly: prefs.highlightCompat,
      energy: prefs.energy,
      focus: prefs.focus,
    }).filter(i => ['inbox', 'todo', 'idea'].includes(i.status));

    const nowList = document.getElementById('nowList');
    if (nowList) {
      nowList.innerHTML = list.slice(0, 16).map(item => `
        <li class="tone-row-${STATUS_TONE[item.status]}" data-open-item="${item.id}">
          ${statusBadge(item.status)}
          ${kindBadge(item.kind)}
          <span class="list-row-title">${escapeHtml(item.title)}</span>
          <span class="list-row-meta">${metaLine(item)}</span>
        </li>
      `).join('');
    }

    const empty = document.getElementById('nowEmpty');
    if (empty) {
      empty.textContent = prefs.highlightCompat
        ? 'Aucun élément mis en avant — désactive le filtre ou consulte la boîte'
        : 'Tu peux aussi ne rien choisir';
    }

    this.renderSuggestion();
  }

  renderSuggestion() {
    const prefs = getPersoPrefs();
    const item = pickSuggestedItem(prefs.energy, prefs.focus);
    const card = document.getElementById('suggestCard');
    if (!card) return;
    if (!item) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    card.dataset.itemId = item.id;
    TONE_NAMES.forEach(t => card.classList.remove(`tone-${t}`));
    card.classList.add(`tone-${STATUS_TONE[item.status]}`);
    document.getElementById('suggestTitle').textContent = item.title;
    document.getElementById('suggestMeta').textContent = metaLine(item);
  }
}

function statusBadge(status) {
  const tone = STATUS_TONE[status] || 'gray';
  return `<span class="badge mac-tag tone-${tone}">${STATUS_LABELS[status]}</span>`;
}

function kindBadge(kind) {
  const tone = KIND_TONE[kind] || 'gray';
  return `<span class="badge mac-tag tone-${tone}">${KIND_LABELS[kind] || kind}</span>`;
}

function effortBadge(effort) {
  if (!effort || effort === 'unknown') return '';
  const tone = EFFORT_TONE[effort] || 'gray';
  return `<span class="badge mac-tag tone-${tone}">${EFFORT_LABELS[effort]}</span>`;
}

function metaHtml(item) {
  const chips = [];
  if (item.category) {
    chips.push(`<span class="meta-chip tone-teal">${escapeHtml(item.category)}</span>`);
  }
  if (item.dueDate) {
    chips.push(`<span class="meta-chip tone-purple">${escapeHtml(item.dueDate)}</span>`);
  }
  if (!chips.length) return '<span class="meta-plain">Sans détail supplémentaire</span>';
  return `<div class="meta-chips">${chips.join('')}</div>`;
}

function metaLine(item) {
  const parts = [];
  if (item.effort && EFFORT_LABELS[item.effort]) parts.push(EFFORT_LABELS[item.effort]);
  if (item.category) parts.push(item.category);
  if (item.dueDate) parts.push(item.dueDate);
  return parts.join(' · ') || 'Sans détail';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

new BoiteApp();
