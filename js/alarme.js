import {
  getAlarms, addAlarm, updateAlarm, deleteAlarm,
} from './storage.js';
import {
  playAlert, vibrate, showToast, requestNotificationPermission,
  showBrowserNotification, pad,
} from './utils.js';

export class Alarme {
  constructor() {
    this.listEl = document.getElementById('alarmsList');
    this.emptyEl = document.getElementById('alarmsEmpty');
    this.titleInput = document.getElementById('alarmTitle');
    this.timeInput = document.getElementById('alarmTime');
    this.repeatInput = document.getElementById('alarmRepeat');
    this.addBtn = document.getElementById('alarmAdd');
    this.notifBanner = document.getElementById('notifBanner');
    this.notifBtn = document.getElementById('notifEnable');
    this.nextDisplay = document.getElementById('alarmNextDisplay');
    this.nextLabel = document.getElementById('alarmNextLabel');
    this.clockDisplay = document.getElementById('alarmClockDisplay');

    this.bindEvents();
    this.render();
    this.updateClock();
    this.updateNextAlarm();

    this.clockInterval = setInterval(() => {
      this.updateClock();
      this.checkAlarms();
    }, 1000);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.checkAlarms();
    });
  }

  bindEvents() {
    this.addBtn?.addEventListener('click', () => this.handleAdd());
    this.titleInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.handleAdd();
    });
    this.notifBtn?.addEventListener('click', () => this.enableNotifications());
  }

  async enableNotifications() {
    const result = await requestNotificationPermission();
    this.updateNotifBanner(result);
    if (result === 'granted') showToast('Notifications activées');
    else if (result === 'denied') showToast('Notifications refusées — vérifiez les réglages du navigateur');
  }

  updateNotifBanner(status = Notification.permission) {
    if (!this.notifBanner) return;
    const unsupported = !('Notification' in window);
    const hidden = unsupported || status === 'granted';
    this.notifBanner.hidden = hidden;
    if (this.notifBtn && status === 'denied') {
      this.notifBtn.textContent = 'Refusées';
      this.notifBtn.disabled = true;
    }
  }

  handleAdd() {
    const title = (this.titleInput?.value || '').trim() || 'Alarme';
    const timeVal = this.timeInput?.value;
    if (!timeVal) {
      showToast('Choisissez une heure');
      return;
    }
    const [h, m] = timeVal.split(':').map(Number);
    addAlarm({
      id: crypto.randomUUID(),
      title,
      hour: h,
      minute: m,
      enabled: true,
      repeatDaily: this.repeatInput?.checked ?? true,
      lastFiredKey: null,
      createdAt: Date.now(),
    });
    if (this.titleInput) this.titleInput.value = '';
    this.render();
    this.updateNextAlarm();
    showToast(`Alarme « ${title} » ajoutée`);
  }

  toggleAlarm(id) {
    const alarm = getAlarms().find(a => a.id === id);
    if (!alarm) return;
    updateAlarm(id, { enabled: !alarm.enabled, lastFiredKey: null });
    this.render();
    this.updateNextAlarm();
  }

  removeAlarm(id) {
    deleteAlarm(id);
    this.render();
    this.updateNextAlarm();
  }

  checkAlarms() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const firedKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${h}-${m}`;

    getAlarms()
      .filter(a => a.enabled && a.hour === h && a.minute === m && a.lastFiredKey !== firedKey)
      .forEach(alarm => this.fire(alarm, firedKey));

    this.updateNextAlarm();
  }

  fire(alarm, firedKey) {
    const timeStr = `${pad(alarm.hour)}:${pad(alarm.minute)}`;
    updateAlarm(alarm.id, {
      lastFiredKey: firedKey,
      enabled: alarm.repeatDaily ? true : false,
    });

    playAlert();
    vibrate([300, 100, 300, 100, 300, 100, 300]);
    showBrowserNotification(alarm.title, `Il est ${timeStr}`, alarm.id);
    showToast(`⏰ ${alarm.title} — ${timeStr}`);
    document.title = `⏰ ${alarm.title} — Horizon`;
    setTimeout(() => { document.title = 'Horizon — Minuteur'; }, 8000);

    this.render();
  }

  updateClock() {
    if (!this.clockDisplay) return;
    const now = new Date();
    this.clockDisplay.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  updateNextAlarm() {
    if (!this.nextDisplay || !this.nextLabel) return;
    const next = this.getNextAlarm();
    if (!next) {
      this.nextDisplay.textContent = '--:--';
      this.nextLabel.textContent = 'Aucune alarme active';
      return;
    }
    this.nextDisplay.textContent = `${pad(next.hour)}:${pad(next.minute)}`;
    this.nextLabel.textContent = next.title;
  }

  getNextAlarm() {
    const enabled = getAlarms().filter(a => a.enabled);
    if (enabled.length === 0) return null;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let best = null;
    let bestDelta = Infinity;

    for (const alarm of enabled) {
      const alarmMin = alarm.hour * 60 + alarm.minute;
      let delta = alarmMin - nowMin;
      if (delta <= 0) delta += 24 * 60;
      if (delta < bestDelta) {
        bestDelta = delta;
        best = alarm;
      }
    }
    return best;
  }

  render() {
    const alarms = getAlarms().sort((a, b) => {
      const ta = a.hour * 60 + a.minute;
      const tb = b.hour * 60 + b.minute;
      return ta - tb;
    });

    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (alarms.length === 0) {
      this.emptyEl && (this.emptyEl.hidden = false);
      return;
    }
    this.emptyEl && (this.emptyEl.hidden = true);

    alarms.forEach(alarm => {
      const li = document.createElement('li');
      li.className = `alarm-item${alarm.enabled ? '' : ' disabled'}`;
      li.innerHTML = `
        <button type="button" class="alarm-toggle${alarm.enabled ? ' on' : ''}" aria-label="${alarm.enabled ? 'Désactiver' : 'Activer'} ${alarm.title}" data-id="${alarm.id}">
          <span class="toggle-knob"></span>
        </button>
        <div class="alarm-info">
          <span class="alarm-title">${escapeHtml(alarm.title)}</span>
          <span class="alarm-meta">${alarm.repeatDaily ? 'Quotidienne' : 'Unique'} · ${pad(alarm.hour)}:${pad(alarm.minute)}</span>
        </div>
        <span class="alarm-time">${pad(alarm.hour)}:${pad(alarm.minute)}</span>
        <button type="button" class="alarm-delete" aria-label="Supprimer ${alarm.title}" data-id="${alarm.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      `;

      li.querySelector('.alarm-toggle')?.addEventListener('click', () => this.toggleAlarm(alarm.id));
      li.querySelector('.alarm-delete')?.addEventListener('click', () => this.removeAlarm(alarm.id));
      this.listEl.appendChild(li);
    });

    this.updateNotifBanner();
  }

  onModeEnter() {
    this.render();
    this.updateNextAlarm();
    this.updateNotifBanner();
  }

  onModeLeave() {}
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
