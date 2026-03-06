/**
 * RPM.ENERGY — Schedule & Session Management (/schedule)
 * Source of truth: spec Section 3.5 (Flow E)
 *
 * Elements built (all Must Have):
 *  E1 — Week Calendar View  : 7-day column grid, sessions as cards, today highlighted
 *  E1 — Month Calendar View : traditional grid, colored dots per session
 *  E2 — Book Session Modal  : client picker, date/time, in-person/online (+meeting link), notes
 *  E3 — Log Session Modal   : status picker (Completed/No-Show/Cancelled) + notes
 *       Session Detail View : click any session card → details + log + profile link
 *
 * Persistence: rpm_sessions + rpm_clients keys in localStorage
 * Filter:      per-client dropdown in page header
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, Plus, X,
  MapPin, Video, Clock, Calendar, CalendarDays,
  CheckCircle2, XCircle, AlertCircle, ExternalLink,
} from 'lucide-react';

import { dummySessions, dummyClients } from '../data/dummyData.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Seed reference date — used only by deriveStatus for dummy-data status labels. */
const TODAY_STR = '2026-02-24';

/** Actual calendar "today" — computed once at module load, timezone-safe. */
const REAL_TODAY_STR = (() => {
  const d = new Date();
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
})();

const LS_CLIENTS_KEY  = 'rpm_clients';
const LS_SESSIONS_KEY = 'rpm_sessions';

/** Tier-based hex colours — single source of truth for every color dot/stripe in the app. */
const TIER_COLORS = {
  serious:  '#10b981',   // emerald-500
  active:   '#3b82f6',   // blue-500
  casual:   '#f59e0b',   // amber-500
  inactive: '#ef4444',   // red-500
};

const STATUS_CFG = {
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700' },
  no_show:   { label: 'No Show',   cls: 'bg-red-100 text-red-600'         },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500'     },
  today:     { label: 'Today',     cls: 'bg-brand-100 text-brand-700'     },
  upcoming:  { label: 'Upcoming',  cls: 'bg-blue-50 text-blue-600'        },
};

const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

function getMondayOf(dateStr) {
  const d   = new Date(dateStr + 'T12:00:00Z');
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().split('T')[0];
}

function shiftDate(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function getWeekDays(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => shiftDate(mondayStr, i));
}

function getMonthGrid(year, month) {
  const firstISO = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const start    = getMondayOf(firstISO);
  const cells    = Array.from({ length: 42 }, (_, i) => {
    const dateStr = shiftDate(start, i);
    const d       = new Date(dateStr + 'T12:00:00Z');
    return {
      dateStr,
      day:            d.getUTCDate(),
      isCurrentMonth: d.getUTCMonth() === month && d.getUTCFullYear() === year,
    };
  });
  return cells.slice(35).some(c => c.isCurrentMonth) ? cells : cells.slice(0, 35);
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmt12h(time24 = '') {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function fmtLongDate(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function fmtWeekRange(mondayStr) {
  const mon  = new Date(mondayStr + 'T12:00:00Z');
  const sun  = new Date(shiftDate(mondayStr, 6) + 'T12:00:00Z');
  const opts = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  if (mon.getUTCMonth() === sun.getUTCMonth()) {
    const mo = mon.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
    return `${mon.getUTCDate()}–${sun.getUTCDate()} ${mo} ${mon.getUTCFullYear()}`;
  }
  return `${mon.toLocaleDateString('en-IN', opts)} – ${sun.toLocaleDateString('en-IN', opts)} ${sun.getUTCFullYear()}`;
}

function fmtMonthYear(year, month) {
  return new Date(Date.UTC(year, month, 15)).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function getYearMonth(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function clientInitials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ---------------------------------------------------------------------------
// Color helper
// ---------------------------------------------------------------------------

/** Returns the tier hex colour for a client — works for seed and dynamically added clients alike. */
function getClientColor(clientId, allClients) {
  const client = allClients.find(c => c.client_id === clientId);
  return TIER_COLORS[client?.classification] ?? '#64748b';
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function deriveStatus(s) {
  if (s.date === TODAY_STR && !s.status) return 'today';
  if (s.date > TODAY_STR  && !s.status) return 'upcoming';
  return s.status ?? 'upcoming';
}

function buildSessionMap(sessions) {
  const m = {};
  sessions.forEach(s => { (m[s.date] ??= []).push(s); });
  Object.values(m).forEach(arr => arr.sort((a, b) => a.time.localeCompare(b.time)));
  return m;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadClients() {
  try {
    const saved = localStorage.getItem(LS_CLIENTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return dummyClients;
}

function loadSessions() {
  try {
    const saved = localStorage.getItem(LS_SESSIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [...dummySessions];
}

function persistSessions(sessions) {
  try { localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
}

// ---------------------------------------------------------------------------
// BookSessionModal (E2 — Book a Session)
// ---------------------------------------------------------------------------

function BookSessionModal({ defaultDate, allClients, onClose, onSave }) {
  const [form, setForm] = useState({
    date:         defaultDate ?? REAL_TODAY_STR,
    time:         '09:00',
    client_id:    allClients[0]?.client_id ?? '',
    session_type: 'in_person',
    meeting_link: '',
    notes:        '',
  });

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_id) return;
    onSave({
      session_id:   `sess-local-${Date.now()}`,
      trainer_id:   'trainer-0001',
      client_id:    form.client_id,
      date:         form.date,
      time:         form.time,
      session_type: form.session_type,
      meeting_link: form.session_type === 'online' ? form.meeting_link.trim() : '',
      status:       null,
      notes:        form.notes.trim(),
    });
    onClose();
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm ' +
    'text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 ' +
    'focus:border-transparent transition';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Book Session</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Client */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Client</label>
              <select
                value={form.client_id}
                onChange={e => set('client_id', e.target.value)}
                className={inputCls}
              >
                {allClients.map(c => (
                  <option key={c.client_id} value={c.client_id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => set('time', e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* Session type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Session Type
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'in_person', label: 'In-Person', Icon: MapPin },
                  { value: 'online',    label: 'Online',    Icon: Video  },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('session_type', value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                                border text-sm font-semibold transition
                                ${form.session_type === value
                                  ? 'border-brand-400 bg-brand-50 text-brand-700'
                                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting link — only shown for Online sessions */}
            {form.session_type === 'online' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Meeting Link{' '}
                  <span className="font-normal text-slate-400">(optional — Zoom, Meet, etc.)</span>
                </label>
                <input
                  type="url"
                  value={form.meeting_link}
                  onChange={e => set('meeting_link', e.target.value)}
                  placeholder="https://zoom.us/j/… or meet.google.com/…"
                  className={inputCls}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Session focus, reminders, or context…"
                className={`${inputCls} resize-none leading-relaxed`}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm
                           font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold
                           text-white hover:bg-brand-600 transition"
              >
                Book Session
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// SessionDetailModal (E3 — view detail + log status)
// ---------------------------------------------------------------------------

function SessionDetailModal({ session, client, allClients, onClose, onUpdate }) {
  const colour   = getClientColor(client?.client_id, allClients);
  const isOnline = session.session_type === 'online';

  const [logStatus, setLogStatus] = useState(session.status ?? '');
  const [logNotes,  setLogNotes]  = useState(session.notes  ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!logStatus) return;
    onUpdate(session.session_id, logStatus, logNotes.trim());
    onClose();
  }

  function handleClearStatus() {
    onUpdate(session.session_id, null, '');
    onClose();
  }

  const derivedStatus = deriveStatus(session);
  const statusCfg     = STATUS_CFG[derivedStatus];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">

          {/* Colour bar at top */}
          <div className="h-1" style={{ backgroundColor: colour }} />

          {/* Client header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center
                           text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: colour }}
              >
                {clientInitials(client?.name)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {client?.name ?? 'Unknown'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{client?.goal}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Session details */}
          <div className="px-6 py-4 space-y-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{fmtLongDate(session.date)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{fmt12h(session.time)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              {isOnline
                ? <Video  className="w-4 h-4 text-blue-400 flex-shrink-0" />
                : <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />}
              <span>{isOnline ? 'Online' : 'In-Person'}</span>
            </div>

            {/* Meeting link — shown only when present */}
            {isOnline && session.meeting_link && (
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <a
                  href={session.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-500 hover:text-brand-600 truncate transition"
                >
                  Join Meeting
                </a>
              </div>
            )}

            {/* Current status badge */}
            <div className="flex items-center gap-2 pt-1">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusCfg?.cls ?? ''}`}>
                {statusCfg?.label}
              </span>
              {session.status && (
                <button
                  onClick={handleClearStatus}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition ml-auto"
                >
                  Clear status
                </button>
              )}
            </div>

            {session.notes && (
              <p className="text-xs text-slate-400 italic pt-1">{session.notes}</p>
            )}
          </div>

          {/* Log / Update status form (E3) */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
              {session.status ? 'Update Status' : 'Log Session'}
            </p>

            <div className="space-y-2 mb-4">
              {[
                {
                  value:  'completed',
                  label:  'Completed',
                  Icon:   CheckCircle2,
                  active: 'border-emerald-400 bg-emerald-50 text-emerald-700',
                },
                {
                  value:  'no_show',
                  label:  'Client No-Show',
                  Icon:   XCircle,
                  active: 'border-red-400 bg-red-50 text-red-600',
                },
                {
                  value:  'cancelled',
                  label:  'Cancelled',
                  Icon:   AlertCircle,
                  active: 'border-slate-400 bg-slate-100 text-slate-600',
                },
              ].map(({ value, label, Icon, active }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLogStatus(value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border
                              text-sm font-semibold transition
                              ${logStatus === value
                                ? active
                                : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={logNotes}
              onChange={e => setLogNotes(e.target.value)}
              placeholder="Session notes (optional)…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                         text-slate-700 placeholder:text-slate-400 focus:outline-none
                         focus:ring-2 focus:ring-brand-400 focus:border-transparent
                         resize-none leading-relaxed transition mb-4"
            />

            <button
              type="submit"
              disabled={!logStatus}
              className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold
                         text-white hover:bg-brand-600 transition
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {session.status ? 'Update' : 'Log Session'}
            </button>
          </form>

          {/* Profile link */}
          {client && (
            <div className="px-6 pb-5 -mt-1">
              <Link
                to={`/clients/${client.client_id}`}
                onClick={onClose}
                className="text-xs font-medium text-brand-500 hover:text-brand-600 transition"
              >
                View {client.name.split(' ')[0]}'s full profile →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// SessionBlock — a session card in the week grid
// ---------------------------------------------------------------------------

/** Session-type color — used for stripe and month dots. */
const SESSION_TYPE_COLOUR = { online: '#3b82f6', in_person: '#22c55e' };

function SessionBlock({ session, client, allClients, onClick }) {
  const colour   = SESSION_TYPE_COLOUR[session.session_type] ?? '#64748b';
  const derived  = deriveStatus(session);
  const isOnline = session.session_type === 'online';

  const blockBg =
    derived === 'completed' ? 'bg-emerald-50  border-emerald-100'  :
    derived === 'no_show'   ? 'bg-red-50      border-red-100'      :
    derived === 'cancelled' ? 'bg-slate-50    border-slate-100'    :
    derived === 'today'     ? 'bg-brand-50    border-brand-200'    :
                              'bg-white       border-slate-100'    ;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-2 py-1.5 mb-1.5
                  hover:shadow-sm transition-all relative overflow-hidden
                  ${blockBg}
                  ${derived === 'cancelled' ? 'opacity-60' : ''}`}
    >
      {/* Left colour stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: colour }}
      />

      {/* Time + name */}
      <p className="text-[11px] font-bold text-slate-700 leading-tight truncate pl-1.5">
        {fmt12h(session.time)}
        <span className="font-normal text-slate-400 ml-1">·</span>
        <span className="ml-1">{client?.name.split(' ')[0]}</span>
      </p>

      {/* Type + status */}
      <div className="flex items-center gap-1 mt-0.5 pl-1.5">
        {isOnline
          ? <Video  className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
          : <MapPin className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />}
        <span className="text-[10px] text-slate-400">
          {isOnline ? 'Online' : 'In-Person'}
        </span>
        {STATUS_CFG[derived] && derived !== 'upcoming' && derived !== 'today' && (
          <span className={`ml-auto text-[9px] font-bold px-1 py-px rounded-full
                            ${STATUS_CFG[derived].cls}`}>
            {STATUS_CFG[derived].label}
          </span>
        )}
        {derived === 'today' && (
          <span className="ml-auto text-[9px] font-bold px-1 py-px rounded-full bg-brand-100 text-brand-700">
            Today
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// WeekView (E1 — default calendar view)
// ---------------------------------------------------------------------------

function WeekView({ sessions, allClients, viewDate, onNavigate, onBook, onSessionClick, onToday }) {
  const mondayStr = getMondayOf(viewDate);
  const weekDays  = getWeekDays(mondayStr);

  const sessionMap = useMemo(() => buildSessionMap(sessions), [sessions]);

  const isCurrentWeek = getMondayOf(viewDate) === getMondayOf(REAL_TODAY_STR);

  function clientFor(id) {
    return allClients.find(c => c.client_id === id);
  }

  const totalThisWeek = weekDays.reduce((n, d) => n + (sessionMap[d]?.length ?? 0), 0);

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate(shiftDate(viewDate, -7))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500
                       hover:bg-slate-100 transition"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate(shiftDate(viewDate, 7))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500
                       hover:bg-slate-100 transition"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-700 ml-1">
            {fmtWeekRange(mondayStr)}
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 ml-1">
            · {totalThisWeek} session{totalThisWeek !== 1 ? 's' : ''}
          </span>
        </div>
        {!isCurrentWeek && (
          <button
            onClick={onToday}
            className="text-xs font-semibold text-brand-500 hover:text-brand-600 border
                       border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition"
          >
            Today
          </button>
        )}
      </div>

      {/* 7-day column grid */}
      <div className="overflow-x-auto -mx-1 pb-4">
        <div className="grid grid-cols-7 gap-1.5 min-w-[800px] px-1">
          {weekDays.map(dateStr => {
            const d       = new Date(dateStr + 'T12:00:00Z');
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
            const dayNum  = d.getUTCDate();
            const isToday = dateStr === TODAY_STR;
            const daySess = sessionMap[dateStr] ?? [];

            return (
              <div key={dateStr} className="flex flex-col">

                {/* Day header — click to book on this day */}
                <button
                  onClick={() => onBook(dateStr)}
                  className={`rounded-xl py-2.5 mb-2 text-center transition hover:opacity-90
                              ${isToday
                                ? 'bg-brand-500 shadow-sm shadow-brand-200'
                                : 'bg-slate-50 hover:bg-slate-100'}`}
                  title={`Book session on ${dateStr}`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wide
                                 ${isToday ? 'text-brand-100' : 'text-slate-400'}`}>
                    {dayName}
                  </p>
                  <p className={`text-xl font-bold leading-tight mt-0.5
                                 ${isToday ? 'text-white' : 'text-slate-700'}`}>
                    {dayNum}
                  </p>
                </button>

                {/* Session cards */}
                <div className="flex-1 min-h-[80px]">
                  {daySess.map(s => (
                    <SessionBlock
                      key={s.session_id}
                      session={s}
                      client={clientFor(s.client_id)}
                      allClients={allClients}
                      onClick={() => onSessionClick(s)}
                    />
                  ))}
                </div>

                {/* Add session button */}
                <button
                  onClick={() => onBook(dateStr)}
                  title="Book session"
                  className="mt-1 flex items-center justify-center w-full py-1.5 rounded-lg
                             text-slate-300 hover:text-brand-500 hover:bg-brand-50
                             transition group"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint bar */}
      <p className="text-[11px] text-slate-400 mt-2 text-center">
        Click a session card to view details or log status · Click a day header or{' '}
        <span className="text-brand-400">+</span> to book
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonthView (E1 — toggle view)
// ---------------------------------------------------------------------------

function MonthView({ sessions, allClients, viewDate, onNavigate, onDayClick }) {
  const { t } = useTranslation();
  const { year, month } = getYearMonth(viewDate);
  const cells           = useMemo(() => getMonthGrid(year, month), [year, month]);
  const sessionMap      = useMemo(() => buildSessionMap(sessions), [sessions]);

  const MAX_DOTS = 3;

  function prevMonth() {
    onNavigate(new Date(Date.UTC(year, month - 1, 15)).toISOString().split('T')[0]);
  }
  function nextMonth() {
    onNavigate(new Date(Date.UTC(year, month + 1, 15)).toISOString().split('T')[0]);
  }

  return (
    <div>
      {/* Navigation — Today button intentionally omitted in Month view (Week view only) */}
      <div className="flex items-center gap-1.5 mb-5">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500
                     hover:bg-slate-100 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500
                     hover:bg-slate-100 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-700 ml-1">
          {fmtMonthYear(year, month)}
        </span>
      </div>

      {/* Day-of-week header row */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS_SHORT.map(d => (
          <div
            key={d}
            className="text-center text-[11px] font-bold text-slate-400 uppercase
                       tracking-widest py-1.5"
          >
            {d.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 border-t border-l border-slate-100">
        {cells.map(cell => {
          const cellSess = sessionMap[cell.dateStr] ?? [];
          const isToday  = cell.dateStr === TODAY_STR;
          const inMonth  = cell.isCurrentMonth;

          return (
            <div
              key={cell.dateStr}
              onClick={() => inMonth && onDayClick(cell.dateStr)}
              className={`border-b border-r border-slate-100 p-2 min-h-[72px] flex flex-col
                          ${isToday && inMonth ? 'bg-slate-50' : ''}
                          ${inMonth && !isToday ? 'cursor-pointer hover:bg-slate-50' : ''}
                          ${!inMonth ? 'bg-slate-50/40' : 'cursor-pointer'}
                          transition`}
            >
              {/* Day number — today gets a subtle ring instead of a solid brand circle */}
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs
                             font-bold mb-1.5 self-end
                             ${isToday && inMonth
                               ? 'ring-1 ring-slate-300 bg-white text-slate-900'
                               : inMonth
                                 ? 'text-slate-700'
                                 : 'text-slate-300'}`}
              >
                {cell.day}
              </div>

              {/* Session dots — color by session type */}
              {cellSess.length > 0 && inMonth && (
                <div className="flex flex-wrap gap-0.5 items-center mt-auto">
                  {cellSess.slice(0, MAX_DOTS).map(s => (
                    <div
                      key={s.session_id}
                      title={`${allClients.find(c => c.client_id === s.client_id)?.name} ${fmt12h(s.time)}`}
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SESSION_TYPE_COLOUR[s.session_type] ?? '#64748b' }}
                    />
                  ))}
                  {cellSess.length > MAX_DOTS && (
                    <span className="text-[9px] font-bold text-slate-400">
                      +{cellSess.length - MAX_DOTS}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Session-type legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
        <span className="font-semibold text-slate-500 text-[11px]">{t('schedule.legend')}:</span>
        {[
          { key: 'in_person', colour: SESSION_TYPE_COLOUR.in_person, labelKey: 'schedule.inPerson' },
          { key: 'online',    colour: SESSION_TYPE_COLOUR.online,    labelKey: 'schedule.online'   },
        ].map(({ key, colour, labelKey }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} />
            <span className="text-slate-500 text-[11px]">{t(labelKey)}</span>
          </div>
        ))}
        <span className="text-slate-400 text-[11px] ml-auto hidden sm:block">
          {t('schedule.clickToJump')}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule — root page
// ---------------------------------------------------------------------------

export default function Schedule() {
  // Load clients and sessions from localStorage on mount (lazy initializers)
  const [allClients]   = useState(loadClients);
  const [sessions,      setSessions]     = useState(loadSessions);
  const [view,          setView]         = useState('week');    // 'week' | 'month'
  const [viewDate,      setViewDate]     = useState(TODAY_STR); // seed date so dummy sessions are visible
  const [bookDate,      setBookDate]     = useState(null);      // non-null → modal open
  const [detailTarget,  setDetailTarget] = useState(null);      // session being viewed/logged
  const [filterClient,  setFilterClient] = useState('');        // '' = all clients

  // ── Filtered sessions ─────────────────────────────────────────────────────

  const filteredSessions = useMemo(
    () => filterClient
      ? sessions.filter(s => s.client_id === filterClient)
      : sessions,
    [sessions, filterClient]
  );

  // ── Header metric: booked sessions in the currently viewed week ───────────

  const thisWeekCount = useMemo(() => {
    const monday = getMondayOf(viewDate);
    const sunday = shiftDate(monday, 6);
    return filteredSessions.filter(s => s.date >= monday && s.date <= sunday).length;
  }, [filteredSessions, viewDate]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBookSave(newSession) {
    setSessions(prev => {
      const next = [...prev, newSession];
      persistSessions(next);
      return next;
    });
  }

  function handleSessionUpdate(sessionId, newStatus, newNotes) {
    setSessions(prev => {
      const next = prev.map(s =>
        s.session_id === sessionId
          ? { ...s, status: newStatus, notes: newNotes }
          : s
      );
      persistSessions(next);
      return next;
    });
  }

  /** Clicking a day in month view → switch to week view for that week. */
  function handleMonthDayClick(dateStr) {
    setViewDate(dateStr);
    setView('week');
  }

  /** Resets the calendar to the actual current date. */
  function handleToday() {
    setViewDate(REAL_TODAY_STR);
  }

  // Detail modal: look up client from the live allClients array
  const detailClient = detailTarget
    ? allClients.find(c => c.client_id === detailTarget.client_id) ?? null
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-screen-xl mx-auto px-6 py-6">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Schedule</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {thisWeekCount} booked session{thisWeekCount !== 1 ? 's' : ''} this week
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">

            {/* Client filter dropdown */}
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-[7px]
                         bg-white text-slate-600 focus:outline-none focus:ring-2
                         focus:ring-brand-400 focus:border-transparent transition"
            >
              <option value="">All Clients</option>
              {allClients.map(c => (
                <option key={c.client_id} value={c.client_id}>{c.name}</option>
              ))}
            </select>

            {/* Week / Month toggle */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
              {[
                { id: 'week',  Icon: CalendarDays, label: 'Week'  },
                { id: 'month', Icon: Calendar,     label: 'Month' },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs
                              font-semibold transition
                              ${view === id
                                ? 'bg-slate-800 text-white'
                                : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Book session */}
            <button
              onClick={() => setBookDate(REAL_TODAY_STR)}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600
                         text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Book Session
            </button>
          </div>
        </div>

        {/* Calendar card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {view === 'week' ? (
            <WeekView
              sessions={filteredSessions}
              allClients={allClients}
              viewDate={viewDate}
              onNavigate={setViewDate}
              onBook={setBookDate}
              onSessionClick={setDetailTarget}
              onToday={handleToday}
            />
          ) : (
            <MonthView
              sessions={filteredSessions}
              allClients={allClients}
              viewDate={viewDate}
              onNavigate={setViewDate}
              onDayClick={handleMonthDayClick}
              onToday={handleToday}
            />
          )}
        </div>
      </div>

      {/* Book Session Modal (E2) */}
      {bookDate !== null && (
        <BookSessionModal
          defaultDate={bookDate}
          allClients={allClients}
          onClose={() => setBookDate(null)}
          onSave={handleBookSave}
        />
      )}

      {/* Session Detail + Log Modal (E3) */}
      {detailTarget && (
        <SessionDetailModal
          session={detailTarget}
          client={detailClient}
          allClients={allClients}
          onClose={() => setDetailTarget(null)}
          onUpdate={handleSessionUpdate}
        />
      )}
    </div>
  );
}
