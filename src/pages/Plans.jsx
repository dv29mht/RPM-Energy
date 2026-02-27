/**
 * RPM.ENERGY — Workout Plan Library & Builder (/plans)
 * Source of truth: spec Section 3.4 (Flow D)
 *
 * Elements (all Must Have):
 *  D1 — Plan Library      : card grid — name, description, day count, assigned client count
 *  D2 — Create New Plan   : inline builder (name + description form)
 *  D3 — Add Exercises     : day tabs + exercise rows (name, sets, reps, notes)
 *  D4 — Save Template     : saves to local state; card appears in library grid
 *  D5 — Assign to Client  : modal with client checklist; updates assigned_to array
 *  D6 — Share / Export    : formatted WhatsApp text block + copy-to-clipboard
 *
 * Also supports: Edit, Duplicate, Delete existing plans.
 * NOT built: drag-and-drop reordering (explicitly deferred per V1 spec).
 */

import { useState } from 'react';
import {
  Plus, X, Edit2, Copy, Trash2, Users, Share2, Check,
  ArrowLeft, Dumbbell, ClipboardList,
} from 'lucide-react';

import { dummyPlans, dummyClients, dummyTrainer } from '../data/dummyData.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_PLANS_KEY   = 'rpm_plans';
const LS_CLIENTS_KEY = 'rpm_clients';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadPlans() {
  try {
    const saved = localStorage.getItem(LS_PLANS_KEY);
    return saved
      ? JSON.parse(saved)
      : dummyPlans.map(p => ({ ...p, assigned_to: [...p.assigned_to] }));
  } catch {
    return dummyPlans.map(p => ({ ...p, assigned_to: [...p.assigned_to] }));
  }
}

function loadClients() {
  try {
    const saved = localStorage.getItem(LS_CLIENTS_KEY);
    return saved ? JSON.parse(saved) : dummyClients;
  } catch {
    return dummyClients;
  }
}

function persistPlans(plans) {
  try { localStorage.setItem(LS_PLANS_KEY, JSON.stringify(plans)); } catch {}
}

const EMPTY_EXERCISE = { name: '', sets: '', reps: '', notes: '' };
const BLANK_DAY      = n => ({ day_number: n, label: `Day ${n}`, exercises: [] });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Formats a workout plan into clean WhatsApp-ready text.
 * Example output:
 *   🏋️ *Fat Loss — 4-Day Split*
 *   _Description here_
 *
 *   *Day 1 — Upper Push*
 *   1. Bench Press — 4 sets × 10 reps _(2 sec eccentric)_
 *   ...
 */
function formatPlanText(plan) {
  const lines = [];
  lines.push(`🏋️ *${plan.name}*`);
  if (plan.description) lines.push(`_${plan.description}_`);
  lines.push('');

  (plan.days ?? []).forEach(day => {
    lines.push(`*${day.label}*`);
    const exercises = day.exercises ?? [];
    if (exercises.length === 0) {
      lines.push('_(No exercises added)_');
    } else {
      exercises.forEach((ex, i) => {
        let line = `${i + 1}. ${ex.name || 'Exercise'}`;
        const parts = [];
        if (ex.sets) parts.push(`${ex.sets} sets`);
        if (ex.reps) parts.push(`${ex.reps} reps`);
        if (parts.length) line += ` — ${parts.join(' × ')}`;
        if (ex.notes) line += ` _(${ex.notes})_`;
        lines.push(line);
      });
    }
    lines.push('');
  });

  lines.push('—');
  lines.push(`Sent by ${dummyTrainer.name} via RPM.ENERGY`);
  return lines.join('\n').trimEnd();
}

// ---------------------------------------------------------------------------
// Share Modal (D6 — Export / Print for WhatsApp)
// ---------------------------------------------------------------------------

function ShareModal({ plan, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = formatPlanText(plan);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-800">Share Plan</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Copy and paste directly into WhatsApp
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Plan name chip */}
          <div className="px-6 pt-4 pb-2 flex-shrink-0">
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200
                            text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <Dumbbell className="w-3.5 h-3.5" />
              {plan.name}
            </div>
          </div>

          {/* Text preview */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-slate-50
                            border border-slate-200 rounded-xl p-4 leading-[1.7]">
              {text}
            </pre>
          </div>

          {/* Copy button */}
          <div className="px-6 pb-5 pt-2 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                          text-sm font-semibold transition-all
                          ${copied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to clipboard!' : 'Copy for WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Assign Modal (D5 — Assign to Client)
// ---------------------------------------------------------------------------

function AssignModal({ plan, allClients, onClose, onSave }) {
  const [selected, setSelected] = useState(new Set(plan.assigned_to));

  function toggle(clientId) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId); else next.add(clientId);
      return next;
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Assign to Clients</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{plan.name}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Client list */}
          <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
            {allClients.map(c => {
              const checked = selected.has(c.client_id);
              return (
                <button
                  key={c.client_id}
                  onClick={() => toggle(c.client_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border
                              text-left transition-all
                              ${checked
                                ? 'border-brand-400 bg-brand-50'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center
                                bg-zinc-100 text-zinc-800 border border-zinc-200
                                text-[10px] font-bold flex-shrink-0"
                  >
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 leading-tight truncate">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{c.goal}</p>
                  </div>
                  {checked && <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm
                         font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(plan.plan_id, [...selected])}
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold
                         text-white hover:bg-brand-600"
            >
              Save ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Plan Card (D1 — Plan Library grid)
// ---------------------------------------------------------------------------

function PlanCard({ plan, allClients, onEdit, onDuplicate, onDelete, onAssign, onShare }) {
  const assignedClients = allClients.filter(c => plan.assigned_to.includes(c.client_id));
  const dayCount        = plan.days?.length ?? 0;
  const clientCount     = plan.assigned_to.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col
                    hover:border-slate-300 hover:shadow-md transition-all">

      {/* Top row: icon + action icons */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-brand-500" />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(plan)}
            title="Edit plan"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicate(plan)}
            title="Duplicate plan"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(plan.plan_id)}
            title="Delete plan"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Plan name + description */}
      <h3 className="text-sm font-bold text-slate-800 leading-tight">{plan.name}</h3>
      <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed line-clamp-2">
        {plan.description || 'No description.'}
      </p>

      {/* Stats chips */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold
                         px-2 py-0.5 rounded-full">
          {dayCount} day{dayCount !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          {clientCount} client{clientCount !== 1 ? 's' : ''} assigned
        </span>
      </div>

      {/* Assigned client avatars */}
      {assignedClients.length > 0 && (
        <div className="flex items-center gap-1 mb-4">
          {assignedClients.slice(0, 5).map(c => (
            <div
              key={c.client_id}
              title={c.name}
              className="w-7 h-7 rounded-full flex items-center justify-center
                         bg-zinc-100 text-zinc-800 border border-zinc-200
                         text-[10px] font-bold ring-2 ring-white"
            >
              {initials(c.name)}
            </div>
          ))}
          {assignedClients.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center
                            justify-center text-slate-500 text-[10px] font-bold ring-2 ring-white">
              +{assignedClients.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
        <button
          onClick={() => onAssign(plan)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold
                     py-2 px-3 rounded-lg border border-slate-200 text-slate-600
                     hover:border-slate-300 hover:bg-slate-50 transition"
        >
          <Users className="w-3.5 h-3.5" />
          Assign
        </button>
        <button
          onClick={() => onShare(plan)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold
                     py-2 px-3 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise Row (D3 — Add Exercises to Days)
// ---------------------------------------------------------------------------

function ExerciseRow({ ex, dayIdx, exIdx, onChange, onRemove }) {
  function update(field) {
    return e => onChange(dayIdx, exIdx, field, e.target.value);
  }

  const inputCls =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 ' +
    'placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400 ' +
    'focus:border-transparent transition';

  return (
    <div className="flex items-center gap-2 group/row">
      <span className="text-xs text-slate-300 w-5 text-right flex-shrink-0 font-medium select-none">
        {exIdx + 1}.
      </span>
      <input
        type="text"
        value={ex.name}
        placeholder="Exercise name"
        onChange={update('name')}
        className={`${inputCls} flex-1 min-w-0`}
      />
      <input
        type="number"
        value={ex.sets}
        placeholder="Sets"
        min="1"
        onChange={update('sets')}
        className={`${inputCls} w-16 flex-shrink-0`}
      />
      <input
        type="text"
        value={ex.reps}
        placeholder="Reps"
        onChange={update('reps')}
        className={`${inputCls} w-20 flex-shrink-0`}
      />
      <input
        type="text"
        value={ex.notes}
        placeholder="Notes (optional)"
        onChange={update('notes')}
        className={`${inputCls} flex-1 min-w-0 text-xs`}
      />
      <button
        onClick={() => onRemove(dayIdx, exIdx)}
        className="flex-shrink-0 p-1 text-slate-300 hover:text-red-400 transition rounded"
        title="Remove exercise"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan Builder (D2 + D3 + D4)
// ---------------------------------------------------------------------------

function PlanBuilder({ initialPlan, onSave, onCancel }) {
  const [name,      setName]      = useState(initialPlan?.name ?? '');
  const [desc,      setDesc]      = useState(initialPlan?.description ?? '');
  const [days,      setDays]      = useState(() =>
    initialPlan?.days?.length
      ? initialPlan.days.map(d => ({
          ...d,
          exercises: (d.exercises ?? []).map(e => ({ ...e })),
        }))
      : [BLANK_DAY(1)]
  );
  const [activeDay,  setActiveDay]  = useState(0);
  const [nameError,  setNameError]  = useState(false);

  // ── Day management ────────────────────────────────────────────────────────

  function addDay() {
    const n = days.length + 1;
    setDays(d => [...d, BLANK_DAY(n)]);
    setActiveDay(days.length); // switch to new tab
  }

  function removeDay(idx) {
    if (days.length === 1) return;
    setDays(d =>
      d.filter((_, i) => i !== idx)
       .map((day, i) => ({ ...day, day_number: i + 1 }))
    );
    setActiveDay(prev => Math.min(prev, days.length - 2));
  }

  function updateDayLabel(idx, label) {
    setDays(d => d.map((day, i) => i === idx ? { ...day, label } : day));
  }

  // ── Exercise management ───────────────────────────────────────────────────

  function addExercise(dayIdx) {
    setDays(d => d.map((day, i) =>
      i === dayIdx
        ? { ...day, exercises: [...(day.exercises ?? []), { ...EMPTY_EXERCISE }] }
        : day
    ));
  }

  function updateExercise(dayIdx, exIdx, field, value) {
    setDays(d => d.map((day, i) =>
      i === dayIdx
        ? {
            ...day,
            exercises: day.exercises.map((e, j) =>
              j === exIdx ? { ...e, [field]: value } : e
            ),
          }
        : day
    ));
  }

  function removeExercise(dayIdx, exIdx) {
    setDays(d => d.map((day, i) =>
      i === dayIdx
        ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIdx) }
        : day
    ));
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!name.trim()) { setNameError(true); return; }
    onSave({
      ...(initialPlan ?? {}),
      name:        name.trim(),
      description: desc.trim(),
      days,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const activeExercises = days[activeDay]?.exercises ?? [];
  const totalExercises  = days.reduce((s, d) => s + (d.exercises?.length ?? 0), 0);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-screen-xl mx-auto px-6 py-6">

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-sm font-medium
                       text-slate-500 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium border border-slate-200
                         rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-semibold bg-brand-500 text-white
                         rounded-lg hover:bg-brand-600 transition"
            >
              Save Plan
            </button>
          </div>
        </div>

        <div className="space-y-5">

          {/* Plan details card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              Plan Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Plan Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  placeholder="e.g. Beginner Fat Loss 3-Day"
                  onChange={e => { setName(e.target.value); setNameError(false); }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800
                             placeholder:text-slate-400 focus:outline-none focus:ring-2
                             focus:ring-brand-400 focus:border-transparent transition
                             ${nameError
                               ? 'border-red-300 bg-red-50'
                               : 'border-slate-200 bg-slate-50'}`}
                />
                {nameError && (
                  <p className="text-xs text-red-500 mt-1">Plan name is required.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  value={desc}
                  rows={2}
                  placeholder="Who is this for? What's the goal and training focus?"
                  onChange={e => setDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2
                             text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none
                             focus:ring-2 focus:ring-brand-400 focus:border-transparent
                             resize-none transition"
                />
              </div>
            </div>
          </div>

          {/* Day builder card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            {/* Day tabs */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 pt-4">
              <div className="flex items-end gap-1 overflow-x-auto">
                {days.map((day, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <button
                      onClick={() => setActiveDay(i)}
                      className={`relative text-xs font-semibold px-4 py-2 rounded-t-lg transition
                                  pr-${days.length > 1 ? '7' : '4'}
                                  ${activeDay === i
                                    ? 'bg-white border border-b-white border-slate-200 text-slate-800 -mb-px z-10'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                      {day.label}
                    </button>
                    {/* Remove day × only on active tab when 2+ days */}
                    {activeDay === i && days.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); removeDay(i); }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4
                                   flex items-center justify-center rounded-full
                                   text-slate-400 hover:text-red-400 hover:bg-red-50 transition"
                        title="Remove this day"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Day button */}
                <button
                  onClick={addDay}
                  className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold
                             px-3 py-2 text-brand-500 hover:text-brand-600 hover:bg-brand-50
                             rounded-t-lg transition"
                >
                  <Plus className="w-3 h-3" />
                  Add Day
                </button>
              </div>
            </div>

            {/* Active day content */}
            <div className="p-5">

              {/* Day label editor */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-50">
                <label className="text-xs font-semibold text-slate-500 flex-shrink-0 w-16">
                  Day label:
                </label>
                <input
                  type="text"
                  value={days[activeDay]?.label ?? ''}
                  onChange={e => updateDayLabel(activeDay, e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm
                             text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400
                             focus:border-transparent transition w-64"
                />
                <span className="text-xs text-slate-400 hidden sm:block">
                  {activeExercises.length} exercise{activeExercises.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Column headers */}
              {activeExercises.length > 0 && (
                <div className="flex items-center gap-2 mb-2 px-0">
                  <div className="w-5 flex-shrink-0" />
                  <div className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Exercise
                  </div>
                  <div className="w-16 flex-shrink-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Sets
                  </div>
                  <div className="w-20 flex-shrink-0 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Reps
                  </div>
                  <div className="flex-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Notes
                  </div>
                  <div className="w-6 flex-shrink-0" />
                </div>
              )}

              {/* Exercise rows */}
              <div className="space-y-2">
                {activeExercises.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-25" />
                    <p className="text-sm font-medium">No exercises yet.</p>
                    <p className="text-xs mt-0.5">Add exercises to this day below.</p>
                  </div>
                ) : (
                  activeExercises.map((ex, exIdx) => (
                    <ExerciseRow
                      key={exIdx}
                      ex={ex}
                      dayIdx={activeDay}
                      exIdx={exIdx}
                      onChange={updateExercise}
                      onRemove={removeExercise}
                    />
                  ))
                )}
              </div>

              {/* Add exercise button */}
              <button
                onClick={() => addExercise(activeDay)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold
                           text-brand-500 hover:text-brand-600 px-3 py-2 rounded-lg
                           hover:bg-brand-50 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Exercise
              </button>
            </div>
          </div>

          {/* Footer summary */}
          <div className="flex items-center justify-between text-xs text-slate-400 pb-6">
            <span>
              {days.length} day{days.length !== 1 ? 's' : ''}
              {' · '}
              {totalExercises} exercise{totalExercises !== 1 ? 's' : ''} total
            </span>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold
                         bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
            >
              Save Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plans — root page
// ---------------------------------------------------------------------------

export default function Plans() {
  // Initialize from localStorage; mutations are persisted immediately
  const [plans,      setPlans]      = useState(loadPlans);
  const [allClients] = useState(loadClients);   // loaded fresh on mount, read-only here
  const [view,         setView]         = useState('library'); // 'library' | 'builder'
  const [editingPlan,  setEditingPlan]  = useState(null);
  const [shareTarget,  setShareTarget]  = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function openNew()      { setEditingPlan(null); setView('builder'); }
  function openEdit(plan) { setEditingPlan(plan);  setView('builder'); }
  function cancelBuilder(){ setEditingPlan(null);  setView('library'); }

  // ── Mutations ──────────────────────────────────────────────────────────────

  function handleDuplicate(plan) {
    setPlans(prev => {
      const next = [...prev, {
        ...plan,
        plan_id:     `plan-local-${Date.now()}`,
        name:        `${plan.name} (Copy)`,
        assigned_to: [],
        created_at:  new Date().toISOString(),
        days: plan.days.map(d => ({
          ...d,
          exercises: d.exercises.map(e => ({ ...e })),
        })),
      }];
      persistPlans(next);
      return next;
    });
  }

  function handleDelete(planId) {
    // Check plan's own assigned_to list
    const planToDelete = plans.find(p => p.plan_id === planId);
    if (planToDelete?.assigned_to?.length > 0) {
      alert('Cannot delete this plan because it is currently assigned to an active client. Reassign the client first.');
      return;
    }
    // Also check each client's assigned_plan_id in localStorage
    const clients = loadClients();
    if (clients.some(c => c.assigned_plan_id === planId)) {
      alert('Cannot delete this plan because it is currently assigned to an active client. Reassign the client first.');
      return;
    }
    setPlans(prev => {
      const next = prev.filter(p => p.plan_id !== planId);
      persistPlans(next);
      return next;
    });
  }

  function handleSave(data) {
    if (editingPlan) {
      setPlans(prev => {
        const next = prev.map(p => p.plan_id === data.plan_id ? data : p);
        persistPlans(next);
        return next;
      });
    } else {
      setPlans(prev => {
        const next = [...prev, {
          ...data,
          plan_id:     `plan-local-${Date.now()}`,
          trainer_id:  dummyTrainer.trainer_id,
          assigned_to: [],
          created_at:  new Date().toISOString(),
        }];
        persistPlans(next);
        return next;
      });
    }
    cancelBuilder();
  }

  function handleSaveAssignment(planId, selectedIds) {
    // 1. Update the plan's assigned_to list and persist rpm_plans
    setPlans(prev => {
      const next = prev.map(p => p.plan_id === planId ? { ...p, assigned_to: selectedIds } : p);
      persistPlans(next);
      return next;
    });

    // 2. Mirror the assignment onto each client in rpm_clients so ClientProfile stays in sync.
    //    Only assigned_plan_id is touched — all other client fields are preserved via spread.
    try {
      const raw     = localStorage.getItem(LS_CLIENTS_KEY);
      const clients = raw ? JSON.parse(raw) : dummyClients;
      const updated = clients.map(c => {
        const isNowAssigned    = selectedIds.includes(c.client_id);
        const wasThisPlan      = c.assigned_plan_id === planId;

        if (isNowAssigned) {
          // Assign (or keep assigned) to this plan
          return { ...c, assigned_plan_id: planId };
        }
        if (wasThisPlan) {
          // Trainer explicitly removed them from this plan
          return { ...c, assigned_plan_id: null };
        }
        // Not related to this plan — leave untouched
        return c;
      });
      localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable — plan state was still updated above
    }

    setAssignTarget(null);
  }

  // ── Builder view ───────────────────────────────────────────────────────────

  if (view === 'builder') {
    return (
      <PlanBuilder
        initialPlan={editingPlan}
        onSave={handleSave}
        onCancel={cancelBuilder}
      />
    );
  }

  // ── Library view ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-screen-xl mx-auto px-6 py-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Workout Plans</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {plans.length} template{plans.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600
                       text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>

        {/* Empty state */}
        {plans.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center
                            justify-center mx-auto mb-4">
              <Dumbbell className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">No plans yet</p>
            <p className="text-slate-400 text-xs mb-5">
              Create your first workout template.
            </p>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm
                         font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-600 transition"
            >
              <Plus className="w-4 h-4" />
              Create First Plan
            </button>
          </div>
        ) : (
          /* Plan card grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <PlanCard
                key={plan.plan_id}
                plan={plan}
                allClients={allClients}
                onEdit={openEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onAssign={setAssignTarget}
                onShare={setShareTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareTarget && (
        <ShareModal
          plan={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          plan={assignTarget}
          allClients={allClients}
          onClose={() => setAssignTarget(null)}
          onSave={handleSaveAssignment}
        />
      )}
    </div>
  );
}
