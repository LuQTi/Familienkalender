import { createClient } from '@supabase/supabase-js';
import './style.css';

// The Supabase URL and publishable key are supplied by the GitHub Actions build.
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;
const supabase = VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY
  ? createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  : null;

// This is the family row created in Supabase.
const FAMILY_ID = 'ecf0a753-dd2a-48b0-b42a-ca8069ddc154';
const people = [
  { id: 'all', name: 'Alle', color: '#456b53', initials: '✳' },
  { id: 'lukas', name: 'Lukas', color: '#d08e70', initials: 'L' },
  { id: 'timea', name: 'Timea', color: '#7194a0', initials: 'T' },
];

const today = new Date();
let year = today.getFullYear();
let month = today.getMonth();
let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let activeMember = 'all';
let events = [];
let mode = 'month';

const pad = value => String(value).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="M9 6 L15 12 L9 18"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
};

function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
}

function addIcons() {
  document.querySelectorAll('[data-icon]').forEach(element => {
    const name = element.dataset.icon;
    element.innerHTML = icon(name, name === 'sun' ? 20 : 18);
  });
}

function eventsFor(date) {
  return events.filter(event => event.date === dateKey(date)
    && (activeMember === 'all' || event.member === 'all' || event.member === activeMember));
}

function getCalendarDays() {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const offset = (firstDay.getDay() + 6) % 7;
  const cellCount = Math.ceil((offset + lastDay.getDate()) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => new Date(year, month, 1 - offset + index));
}

function renderMembers() {
  document.querySelector('#members').innerHTML = people
    .filter(person => person.id !== 'all')
    .map(person => `<button class="member ${activeMember === person.id ? 'selected' : ''}" data-person="${person.id}" type="button">
      <span class="avatar" style="--person:${person.color}">${person.initials}</span>${person.name}
      <span class="member-check">${activeMember === person.id ? icon('check', 13) : ''}</span>
    </button>`).join('');
  document.querySelector('#legend').innerHTML = people.slice(1)
    .map(person => `<span><i style="--person:${person.color}"></i>${person.name}</span>`).join('');
}

function renderDays() {
  document.querySelector('#days').innerHTML = getCalendarDays().map(date => {
    const dayEvents = eventsFor(date);
    const isOtherMonth = date.getMonth() !== month;
    const isToday = dateKey(date) === dateKey(today);
    const isSelected = dateKey(date) === dateKey(selectedDate);
    const chips = dayEvents.slice(0, 2).map(event => {
      const person = people.find(item => item.id === event.member) || people[0];
      return `<span class="event-chip" style="--person:${person.color}"><i></i><b>${escapeHtml(event.time || '')}</b> ${escapeHtml(event.title)}</span>`;
    }).join('');
    const more = dayEvents.length > 2 ? `<span class="more">+${dayEvents.length - 2} weitere</span>` : '';
    return `<button class="day ${isOtherMonth ? 'other' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'picked' : ''}" data-date="${dateKey(date)}" type="button">
      <span class="day-num">${date.getDate()}</span><span class="day-events">${chips}${more}</span>
    </button>`;
  }).join('');
}

function renderAgenda() {
  const heading = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(selectedDate);
  document.querySelector('#selectedDate').innerHTML = `${heading} <span>· ${selectedDate.getFullYear()}</span>`;
  const dayEvents = eventsFor(selectedDate);
  if (!dayEvents.length) {
    document.querySelector('#agendaList').innerHTML = `<div class="empty-agenda">
      <span class="empty-icon">${icon('sun', 20)}</span>
      <span><b>Ein freier Tag!</b><small>Hier ist noch nichts geplant.</small></span>
      <button id="emptyAdd" type="button">Termin planen ${icon('chevron', 14)}</button>
    </div>`;
    document.querySelector('#emptyAdd').onclick = openEventForm;
    return;
  }
  document.querySelector('#agendaList').innerHTML = dayEvents.map(event => {
    const person = people.find(item => item.id === event.member) || people[0];
    return `<div class="agenda-event">
      <span class="agenda-line" style="--person:${person.color}"></span>
      <time>${escapeHtml(event.time || 'Ganztägig')}</time>
      <div><b>${escapeHtml(event.title)}</b><small><span class="avatar mini" style="--person:${person.color}">${person.initials}</span>${person.name} · ${escapeHtml(event.category || 'Familie')}</small></div>
      <button class="delete-event" data-delete="${event.id}" title="Termin löschen" type="button">×</button>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-delete]').forEach(button => {
    button.onclick = () => deleteEvent(button.dataset.delete);
  });
}

function render() {
  addIcons();
  renderMembers();
  document.querySelector('#monthTitle').textContent = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  document.querySelector('#eventCount').textContent = `${events.length} Termine`;
  document.querySelector('#syncStatus').textContent = supabase ? 'Mit Supabase verbunden' : 'Supabase nicht verbunden';
  document.querySelector('#profileStatus').textContent = supabase ? 'Lukas & Timea' : 'Demo ohne Daten';
  renderDays();
  renderAgenda();
  bindControls();
}

function bindControls() {
  document.querySelectorAll('[data-person]').forEach(button => {
    button.onclick = () => {
      activeMember = activeMember === button.dataset.person ? 'all' : button.dataset.person;
      render();
    };
  });
  document.querySelectorAll('[data-date]').forEach(button => {
    button.onclick = () => {
      selectedDate = new Date(`${button.dataset.date}T12:00:00`);
      render();
    };
  });
  document.querySelector('#prev').onclick = () => moveMonth(-1);
  document.querySelector('#next').onclick = () => moveMonth(1);
  document.querySelector('#todayBtn').onclick = document.querySelector('#todayNav').onclick = () => {
    year = today.getFullYear(); month = today.getMonth(); selectedDate = new Date(today); loadEvents();
  };
  ['#add', '#add2', '#add3'].forEach(selector => {
    document.querySelector(selector).onclick = openEventForm;
  });
  document.querySelector('#invite').onclick = () => alert('Teile den Link zu diesem Kalender mit deiner Familie.');
  document.querySelector('#searchBtn').onclick = searchEvents;
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.onclick = () => {
      mode = button.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('chosen', item.dataset.mode === mode));
    };
  });
}

async function loadEvents() {
  if (!supabase) {
    events = [];
    render();
    showNotice('Supabase ist noch nicht verbunden. Prüfe die GitHub Actions Secrets.');
    return;
  }
  const start = `${year}-${pad(month + 1)}-01`;
  const nextMonth = new Date(year, month + 1, 1);
  const end = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-01`;
  const { data, error } = await supabase.from('events').select('*')
    .eq('family_id', FAMILY_ID).gte('date', start).lt('date', end).order('time');
  if (error) {
    showNotice(`Supabase-Fehler beim Laden: ${error.message}`);
    return;
  }
  hideNotice();
  events = data || [];
  render();
}

function moveMonth(amount) {
  const next = new Date(year, month + amount, 1);
  year = next.getFullYear();
  month = next.getMonth();
  selectedDate = new Date(year, month, Math.min(selectedDate.getDate(), new Date(year, month + 1, 0).getDate()));
  loadEvents();
}

function openEventForm() {
  document.querySelector('#modal').innerHTML = `<div class="modal-backdrop"><form class="modal" id="eventForm">
    <button type="button" class="modal-close" aria-label="Schließen">×</button>
    <div class="eyebrow">GEMEINSAM PLANEN</div><h2>Neuer Termin</h2>
    <label>Titel<input name="title" required placeholder="Was steht an?"></label>
    <div class="form-row"><label>Datum<input name="date" type="date" required value="${dateKey(selectedDate)}"></label><label>Uhrzeit<input name="time" type="time" value="10:00"></label></div>
    <div class="form-row"><label>Für wen<select name="member">${people.map(person => `<option value="${person.id}">${person.name}</option>`).join('')}</select></label>
    <label>Kategorie<select name="category">${['Familie', 'Schule', 'Arbeit', 'Freizeit', 'Sport', 'Termin'].map(value => `<option>${value}</option>`).join('')}</select></label></div>
    <label>Notiz<input name="note" placeholder="Optional"></label>
    <button class="save-btn" type="submit">${icon('plus', 16)} Termin speichern</button>
  </form></div>`;
  const backdrop = document.querySelector('.modal-backdrop');
  backdrop.onclick = event => { if (event.target === backdrop) backdrop.remove(); };
  document.querySelector('.modal-close').onclick = () => backdrop.remove();
  document.querySelector('#eventForm').onsubmit = saveEvent;
}

async function saveEvent(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  if (!supabase) {
    showNotice('Termin konnte nicht gespeichert werden: Supabase ist nicht verbunden.');
    return;
  }
  const { error } = await supabase.from('events').insert({ ...values, family_id: FAMILY_ID });
  if (error) {
    alert(`Speichern fehlgeschlagen: ${error.message}`);
    return;
  }
  selectedDate = new Date(`${values.date}T12:00:00`);
  year = selectedDate.getFullYear(); month = selectedDate.getMonth();
  document.querySelector('#modal').innerHTML = '';
  await loadEvents();
}

async function deleteEvent(id) {
  if (!confirm('Diesen Termin löschen?')) return;
  if (!supabase) return;
  const { error } = await supabase.from('events').delete().eq('id', id).eq('family_id', FAMILY_ID);
  if (error) { alert(`Löschen fehlgeschlagen: ${error.message}`); return; }
  await loadEvents();
}

function searchEvents() {
  const query = prompt('Termine suchen:');
  if (!query) return;
  const found = events.filter(event => event.title.toLowerCase().includes(query.toLowerCase()));
  alert(found.length ? found.map(event => `${event.date} · ${event.title}`).join('\n') : 'Keine Termine gefunden.');
}

function showNotice(message) {
  const notice = document.querySelector('#notice');
  notice.textContent = message;
  notice.hidden = false;
}

function hideNotice() {
  document.querySelector('#notice').hidden = true;
}

addIcons();
loadEvents();
if (supabase) {
  supabase.channel('family-events')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, loadEvents)
    .subscribe();
}
