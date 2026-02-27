/**
 * RPM.ENERGY — My Clients list  (/clients)
 * Source of truth: spec Section 3.2
 *
 * Elements (all Must Have):
 *  - Client Cards: avatar, name, classification badge, last log date, current weight
 *  - Search bar: filter by name
 *  - Filter by Classification: All / Serious / Active / Casual / Inactive
 *  - Sort: Name / Last Active / Start Date
 *  - Add New Client button: opens a controlled modal (local state, no backend in V1)
 */

import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, X, ChevronRight, Trophy, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

import { dummyClients, calculateEngagementScore, dummyLogs } from '../data/dummyData.js';
import { getLastActiveDate, getCurrentWeight }                from '../data/clientProfileStats.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_CFG = {
  serious:  { label: 'Serious',  badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  active:   { label: 'Active',   badgeCls: 'bg-blue-50 text-blue-700 border border-blue-200'          },
  casual:   { label: 'Casual',   badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200'       },
  inactive: { label: 'Inactive', badgeCls: 'bg-rose-50 text-rose-700 border border-rose-200'          },
};

const SEED_DATE = new Date('2026-02-24T23:59:59.000Z');

/** Tier-based hex colours — mirrors the same constant in Schedule.jsx. */
const TIER_COLORS = {
  serious:  '#10b981',   // emerald-500
  active:   '#3b82f6',   // blue-500
  casual:   '#f59e0b',   // amber-500
  inactive: '#ef4444',   // red-500
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr + 'T12:00:00Z').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  });
}

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'rpm_clients';

function loadClients() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return dummyClients;
}

// ---------------------------------------------------------------------------
// Add New Client modal (UI-only in V1)
// ---------------------------------------------------------------------------

// Accepts 10-digit numbers, optionally prefixed with +91 (space or dash ok)
const PHONE_RE = /^(\+91[\s-]?)?\d{10}$/;

function AddClientModal({ open, onClose, onSuccess }) {
  const EMPTY = { name: '', phone_code: '+91', phone_number: '', start_date: '', goal: '' };
  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});

  if (!open) return null;

  function reset() { setForm(EMPTY); setErrors({}); }
  function handleClose() { reset(); onClose(); }

  function validate() {
    const e = {};
    if (!form.name.trim())  e.name       = 'Full name is required.';
    if (!form.start_date)   e.start_date = 'Start date is required.';
    if (!form.goal.trim())  e.goal       = 'Goal is required.';
    const ph = form.phone_number.replace(/\s/g, '');
    if (!ph)                    e.phone = 'Phone number is required.';
    else if (!/^\d{10}$/.test(ph)) e.phone = 'Enter exactly 10 digits (country code is separate).';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const submitted = {
      name:       form.name,
      start_date: form.start_date,
      goal:       form.goal,
      phone:      `${form.phone_code} ${form.phone_number.trim()}`,
    };
    reset();
    onSuccess(submitted);
  }

  function field(label, key, type = 'text', ph = '', extraAttrs = {}) {
    const hasErr = !!errors[key];
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          placeholder={ph}
          {...extraAttrs}
          onChange={e => {
            setForm(p => ({ ...p, [key]: e.target.value }));
            if (hasErr) setErrors(p => ({ ...p, [key]: '' }));
          }}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800
                      placeholder:text-slate-400 focus:outline-none focus:ring-2
                      focus:ring-brand-400 focus:border-transparent
                      ${hasErr
                        ? 'border-red-300 bg-red-50/40'
                        : 'border-slate-200 bg-slate-50'}`}
        />
        {hasErr && (
          <p className="text-[11px] text-red-500 mt-1">{errors[key]}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Add New Client</h2>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
            {field('Full Name',  'name', 'text', 'e.g. Priya Sharma')}

            {/* Phone — country code selector + number input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <div className="flex gap-2">
                <select
                  value={form.phone_code}
                  onChange={e => setForm(p => ({ ...p, phone_code: e.target.value }))}
                  className="w-24 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50
                             px-2 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2
                             focus:ring-brand-400 focus:border-transparent"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>
                <input
                  type="tel"
                  value={form.phone_number}
                  placeholder="9876543210"
                  onChange={e => {
                    setForm(p => ({ ...p, phone_number: e.target.value }));
                    if (errors.phone) setErrors(p => ({ ...p, phone: '' }));
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm text-slate-800
                              placeholder:text-slate-400 focus:outline-none focus:ring-2
                              focus:ring-brand-400 focus:border-transparent
                              ${errors.phone ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-50'}`}
                />
              </div>
              {errors.phone && <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>}
            </div>

            {(() => {
              const tzOffset = new Date().getTimezoneOffset() * 60000;
              const localToday = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
              return field('Start Date', 'start_date', 'date', '', { min: localToday });
            })()}
            {field('Goal',       'goal',       'text', 'e.g. Fat loss, Muscle gain')}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm
                           font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold
                           text-white hover:bg-brand-600">
                Add Client
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Client Card
// ---------------------------------------------------------------------------

function ClientCard({ client }) {
  const cfg = TIER_CFG[client.classification];
  const weight  = getCurrentWeight(client.client_id);
  const lastAct = getLastActiveDate(client.client_id);
  const { score } = calculateEngagementScore(client.client_id, dummyLogs, SEED_DATE);

  return (
    <Link to={`/clients/${client.client_id}`}
      className="group bg-white rounded-xl border border-slate-200 p-5
                 hover:border-slate-300 hover:shadow-md transition-all block">

      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center
                        bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold text-sm flex-shrink-0">
          {initials(client.name)}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>
          {cfg.label}
        </span>
      </div>

      <p className="font-bold text-slate-800 text-base leading-tight">{client.name}</p>
      <p className="text-xs text-slate-400 mt-0.5 mb-3 truncate">{client.goal}</p>

      <div className="flex items-center gap-4 text-xs border-t border-slate-50 pt-3">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Weight</p>
          <p className="font-semibold text-slate-700">{weight ? `${weight} kg` : '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Last Active</p>
          <p className="font-semibold text-slate-700">{fmtDate(lastAct)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Score</p>
          <p className="font-semibold text-slate-700">{score}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 ml-auto" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const FILTER_TABS   = ['All', 'Serious', 'Active', 'Casual', 'Inactive'];
const SORT_OPTIONS  = [
  { value: 'name',        label: 'Name'        },
  { value: 'last_active', label: 'Last Active' },
  { value: 'start_date',  label: 'Start Date'  },
];

export default function Clients() {
  const [clientsList, setClientsList] = useState(loadClients);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('All');
  const [sort,      setSort]      = useState('name');
  const [addOpen,   setAddOpen]   = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef(null);

  function handleAddSuccess(formData) {
    const newClient = {
      client_id:      `client-${Date.now()}`,
      trainer_id:     'trainer-0001',
      name:           formData.name.trim(),
      phone:          formData.phone.trim(),
      start_date:     formData.start_date,
      goal:           formData.goal.trim(),
      classification: 'active',
      is_dummy:       false,
      source:         'local',
    };
    setClientsList(prev => {
      const next = [newClient, ...prev];
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
    setAddOpen(false);
    setShowToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 3000);
  }

  const visible = useMemo(() => {
    let list = [...clientsList];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    if (filter !== 'All') {
      list = list.filter(c => c.classification === filter.toLowerCase());
    }
    if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'last_active') {
      list.sort((a, b) => (getLastActiveDate(b.client_id) ?? '').localeCompare(getLastActiveDate(a.client_id) ?? ''));
    } else if (sort === 'start_date') {
      list.sort((a, b) => b.start_date.localeCompare(a.start_date));
    }
    return list;
  }, [clientsList, search, filter, sort]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-screen-xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Clients</h1>
            <p className="text-xs text-slate-400 mt-0.5">{clientsList.length} clients</p>
          </div>
          <button onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600
                       text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by name…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg
                         bg-white placeholder:text-slate-400 focus:outline-none
                         focus:ring-2 focus:ring-brand-400 focus:border-transparent" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-400">Sort:</span>
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setSort(o.value)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition
                  ${sort === o.value
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Classification filter */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto">
          {FILTER_TABS.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition
                ${filter === t
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Cards */}
        {visible.length === 0
          ? <p className="text-center py-16 text-slate-400 text-sm">No clients match.</p>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(c => <ClientCard key={c.client_id} client={c} />)}
            </div>
        }
      </div>

      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Success toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5
                        bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl
                        shadow-lg pointer-events-none whitespace-nowrap">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Client added successfully!
        </div>
      )}
    </div>
  );
}
