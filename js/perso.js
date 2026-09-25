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
import { showToast } from './utils.js';

export class Perso {
  constructor() {
    this.subView = 'capture';
    this.inboxFilter = 'inbox';
    this.inboxSearch = '';
    this.editingId = null;

    this.panel = document.getElementById('panel-perso');
    this.bindShell();
    this.bindCapture();
    this.bindInbox();
    this.bindNow();
    this.bindEditDialog();
    this.renderAll();
  }

  onModeEnter() {
    this.renderAll();
  }

  bindShell() {
    this.persoNav = document.getElementById('persoNav');
    this.persoNav?.querySelectorAll('.perso-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchSubView(btn.dataset.persoView));
    });
  }

  switchSubView(view) {
    this.subView = view;
    const idx = ['capture', 'boite', 'maintenant'].indexOf(view);
    if (this.persoNav) this.persoNav.dataset.active = String(idx);

    this.persoNav?.querySelectorAll('.perso-tab').forEach(tab => {
      const on = tab.dataset.persoView === view;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
    });

    document.querySelectorAll('.perso-view').forEach(el => {
      const show = el.dataset.persoView === view;
      el.hidden = !show;
      el.classList.toggle('active', show);
    });

    if (view === 'maintenant') this.renderNow();
    if (view === 'boite') this.renderInbox();
    if (view === 'capture') this.renderRecent();
  }

  bindCapture() {
    this.captureInput = document.getElementById('captureTitle');
    this.captureForm = document.getElementById('captureForm');
    this.captureDetailsToggle = document.getElementById('captureDetailsToggle');
    this.captureExtras = document.getElementById('captureExtras');
    this.captureKind = document.getElementById('captureKind');
    this.captureDetails = document.getElementById('captureDetails');
    this.captureDue = document.getElementById('captureDue');
    this.captureCategory = document.getElementById('captureCategory');
    this.captureEffort = document.getElementById('captureEffort');
    this.recentList = document.getElementById('captureRecentList');
    this.recentEmpty = document.getElementById('captureRecentEmpty');

    this.captureDetailsToggle?.addEventListener('click', () => {
      const open = this.captureExtras.hidden;
      this.captureExtras.hidden = !open;
      this.captureDetailsToggle.setAttribute('aria-expanded', String(open));
    });

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
      kind: this.captureKind?.value || 'other',
      details: this.captureDetails?.value || '',
      dueDate: this.captureDue?.value || null,
      category: this.captureCategory?.value || '',
      effort: this.captureEffort?.value || 'unknown',
    });

    this.captureInput.value = '';
    if (this.captureDetails) this.captureDetails.value = '';
    if (this.captureDue) this.captureDue.value = '';
    if (this.captureCategory) this.captureCategory.value = '';
    if (this.captureKind) this.captureKind.value = 'other';
    if (this.captureEffort) this.captureEffort.value = 'unknown';

    showToast('Enregistré — tu pourras trier plus tard');
    this.captureInput.focus();
    this.renderRecent();
  }

  bindInbox() {
    this.inboxList = document.getElementById('inboxList');
    this.inboxEmpty = document.getElementById('inboxEmpty');
    this.inboxSearchInput = document.getElementById('inboxSearch');
    this.inboxStatusFilters = document.getElementById('inboxStatusFilters');

    this.inboxSearchInput?.addEventListener('input', () => {
      this.inboxSearch = this.inboxSearchInput.value;
      this.renderInbox();
    });

    this.inboxStatusFilters?.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.inboxFilter = chip.dataset.status;
        this.inboxStatusFilters.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.status === this.inboxFilter);
        });
        this.renderInbox();
      });
    });

    this.inboxList?.addEventListener('click', e => this.onInboxAction(e));
  }

  onInboxAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn || !this.inboxList?.contains(btn)) return;
    const row = btn.closest('[data-id]');
    const id = row?.dataset.id;
    if (!id) return;

    const action = btn.dataset.action;
    if (action === 'edit') {
      this.openEdit(id);
      return;
    }
    if (action === 'delete') {
      const item = getInboxItems().find(i => i.id === id);
      const label = item?.title ? `« ${item.title.slice(0, 40)} »` : 'cet élément';
      if (!window.confirm(`Supprimer ${label} ? Cette action est définitive.`)) return;
      deleteItem(id);
      showToast('Élément supprimé');
      this.renderInbox();
      this.renderRecent();
      this.renderNow();
      return;
    }

    const statusMap = {
      keepInbox: 'inbox',
      todo: 'todo',
      keepIdea: 'idea',
      schedule: 'scheduled',
      archive: 'archived',
    };
    if (statusMap[action]) {
      const patch = { status: statusMap[action] };
      if (action === 'schedule' && !getInboxItems().find(i => i.id === id)?.dueDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        patch.dueDate = tomorrow.toISOString().slice(0, 10);
      }
      updateItem(id, patch);
      showToast(STATUS_LABELS[patch.status] ? `Marqué : ${STATUS_LABELS[patch.status]}` : 'Mis à jour');
      this.renderInbox();
      this.renderRecent();
      this.renderNow();
    }
  }

  bindNow() {
    this.energyGroup = document.getElementById('energyGroup');
    this.focusGroup = document.getElementById('focusGroup');
    this.highlightToggle = document.getElementById('highlightCompat');
    this.nowList = document.getElementById('nowList');
    this.nowEmpty = document.getElementById('nowEmpty');
    this.suggestCard = document.getElementById('suggestCard');
    this.suggestTitle = document.getElementById('suggestTitle');
    this.suggestMeta = document.getElementById('suggestMeta');
    this.suggestAnother = document.getElementById('suggestAnother');
    this.suggestOpen = document.getElementById('suggestOpen');

    ENERGY_LEVELS.forEach(level => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.dataset.energy = level.id;
      btn.textContent = level.label;
      btn.addEventListener('click', () => this.setEnergy(level.id));
      this.energyGroup?.appendChild(btn);
    });

    FOCUS_LEVELS.forEach(level => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.dataset.focus = level.id;
      btn.textContent = level.label;
      btn.addEventListener('click', () => this.setFocus(level.id));
      this.focusGroup?.appendChild(btn);
    });

    this.highlightToggle?.addEventListener('change', () => {
      savePersoPrefs({ highlightCompat: this.highlightToggle.checked });
      this.renderNow();
    });

    this.suggestAnother?.addEventListener('click', () => this.renderSuggestion());
    this.suggestOpen?.addEventListener('click', () => {
      const id = this.suggestCard?.dataset.itemId;
      if (id) this.openEdit(id);
    });

    this.nowList?.addEventListener('click', e => {
      const open = e.target.closest('[data-open-item]');
      if (open) this.openEdit(open.dataset.openItem);
    });
  }

  setEnergy(id) {
    savePersoPrefs({ energy: id });
    this.syncMoodButtons();
    this.renderNow();
  }

  setFocus(id) {
    savePersoPrefs({ focus: id });
    this.syncMoodButtons();
    this.renderNow();
  }

  syncMoodButtons() {
    const prefs = getPersoPrefs();
    this.energyGroup?.querySelectorAll('.chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.energy === prefs.energy);
    });
    this.focusGroup?.querySelectorAll('.chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.focus === prefs.focus);
    });
    if (this.highlightToggle) this.highlightToggle.checked = prefs.highlightCompat;
  }

  bindEditDialog() {
    this.editDialog = document.getElementById('itemEditDialog');
    this.editForm = document.getElementById('itemEditForm');
    this.editTitle = document.getElementById('editTitle');
    this.editKind = document.getElementById('editKind');
    this.editStatus = document.getElementById('editStatus');
    this.editEffort = document.getElementById('editEffort');
    this.editDetails = document.getElementById('editDetails');
    this.editDue = document.getElementById('editDue');
    this.editCategory = document.getElementById('editCategory');
    this.editCancel = document.getElementById('editCancel');
    this.editClose = document.getElementById('editClose');

    this.editCancel?.addEventListener('click', () => this.closeEdit());
    this.editClose?.addEventListener('click', () => this.closeEdit());
    this.editDialog?.addEventListener('click', e => {
      if (e.target === this.editDialog) this.closeEdit();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.editingId) this.closeEdit();
    });

    this.editForm?.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.editingId) return;
      updateItem(this.editingId, {
        title: (this.editTitle?.value || '').trim(),
        kind: this.editKind?.value,
        status: this.editStatus?.value,
        effort: this.editEffort?.value,
        details: this.editDetails?.value || '',
        dueDate: this.editDue?.value || null,
        category: this.editCategory?.value || '',
      });
      showToast('Modifications enregistrées');
      this.closeEdit();
      this.renderAll();
    });
  }

  openEdit(id) {
    const item = getInboxItems().find(i => i.id === id);
    if (!item) return;
    this.editingId = id;
    if (this.editTitle) this.editTitle.value = item.title;
    if (this.editKind) this.editKind.value = item.kind;
    if (this.editStatus) this.editStatus.value = item.status;
    if (this.editEffort) this.editEffort.value = item.effort || 'unknown';
    if (this.editDetails) this.editDetails.value = item.details || '';
    if (this.editDue) this.editDue.value = item.dueDate || '';
    if (this.editCategory) this.editCategory.value = item.category || '';
    if (this.editDialog) {
      this.editDialog.hidden = false;
      this.editTitle?.focus();
    }
  }

  closeEdit() {
    this.editingId = null;
    if (this.editDialog) this.editDialog.hidden = true;
  }

  renderAll() {
    this.syncMoodButtons();
    this.renderRecent();
    this.renderInbox();
    this.renderNow();
  }

  renderRecent() {
    const recent = getInboxItems().slice(0, 5);
    if (!this.recentList) return;
    this.recentList.innerHTML = recent.map(item => this.itemRowHtml(item, 'compact')).join('');
  }

  renderInbox() {
    const list = filterItems({
      status: this.inboxFilter === 'all' ? null : this.inboxFilter,
      query: this.inboxSearch,
    });
    if (this.inboxList) {
      this.inboxList.innerHTML = list.map(item => this.itemRowHtml(item, 'full')).join('');
    }
    if (this.inboxEmpty) {
      const msg = this.inboxFilter === 'inbox'
        ? 'Rien à trier pour le moment'
        : 'Aucun élément dans cette vue';
      this.inboxEmpty.textContent = msg;
    }
  }

  renderNow() {
    const prefs = getPersoPrefs();
    this.syncMoodButtons();
    const list = filterItems({
      status: null,
      query: '',
      compatOnly: prefs.highlightCompat,
      energy: prefs.energy,
      focus: prefs.focus,
    }).filter(i => i.status === 'inbox' || i.status === 'todo' || i.status === 'idea');

    if (this.nowList) {
      this.nowList.innerHTML = list.slice(0, 12).map(item => `
        <li class="inbox-item compat" data-open-item="${item.id}">
          <div class="inbox-item-main">
            <span class="status-pill status-${item.status}">${STATUS_LABELS[item.status]}</span>
            <span class="inbox-title">${escapeHtml(item.title)}</span>
          </div>
          <span class="inbox-meta">${metaLine(item)}</span>
        </li>
      `).join('');
    }

    if (this.nowEmpty) {
      this.nowEmpty.textContent = prefs.highlightCompat
        ? 'Aucun élément mis en avant — tu peux désactiver le filtre ou voir toute la liste ci-dessous'
        : 'Rien de pressant ici — tu peux aussi ne rien choisir';
    }

    this.renderSuggestion();
  }

  renderSuggestion() {
    const prefs = getPersoPrefs();
    const item = pickSuggestedItem(prefs.energy, prefs.focus);
    if (!this.suggestCard) return;
    if (!item) {
      this.suggestCard.hidden = true;
      return;
    }
    this.suggestCard.hidden = false;
    this.suggestCard.dataset.itemId = item.id;
    if (this.suggestTitle) this.suggestTitle.textContent = item.title;
    if (this.suggestMeta) this.suggestMeta.textContent = metaLine(item);
  }

  itemRowHtml(item, mode) {
    const statusClass = `status-${item.status}`;
    if (mode === 'compact') {
      return `
        <li class="inbox-item compact">
          <span class="status-pill ${statusClass}">${STATUS_LABELS[item.status]}</span>
          <span class="inbox-title">${escapeHtml(item.title)}</span>
        </li>
      `;
    }

    return `
      <li class="inbox-item" data-id="${item.id}">
        <div class="inbox-item-top">
          <span class="status-pill ${statusClass}">${STATUS_LABELS[item.status]}</span>
          <span class="kind-pill">${KIND_LABELS[item.kind] || item.kind}</span>
        </div>
        <p class="inbox-title">${escapeHtml(item.title)}</p>
        ${item.details ? `<p class="inbox-details">${escapeHtml(item.details)}</p>` : ''}
        <p class="inbox-meta">${metaLine(item)}</p>
        <div class="inbox-actions" role="group" aria-label="Actions pour ${escapeHtml(item.title)}">
          <button type="button" class="action-chip" data-action="keepInbox">Boîte</button>
          <button type="button" class="action-chip" data-action="todo">À faire</button>
          <button type="button" class="action-chip" data-action="keepIdea">Idée</button>
          <button type="button" class="action-chip" data-action="schedule">Planifier</button>
          <button type="button" class="action-chip" data-action="archive">Archiver</button>
          <button type="button" class="action-chip subtle" data-action="edit">Modifier</button>
          <button type="button" class="action-chip danger" data-action="delete">Supprimer</button>
        </div>
      </li>
    `;
  }
}

function metaLine(item) {
  const parts = [];
  if (item.effort && EFFORT_LABELS[item.effort]) parts.push(EFFORT_LABELS[item.effort]);
  if (item.category) parts.push(item.category);
  if (item.dueDate) parts.push(`Date : ${item.dueDate}`);
  return parts.join(' · ') || 'Sans détail supplémentaire';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
