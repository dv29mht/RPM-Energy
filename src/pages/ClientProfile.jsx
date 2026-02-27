/**
 * RPM.ENERGY — Client Profile  (/clients/:id)
 * Source of truth: spec Section 3.3 (Flow C)
 *
 * Sections built (all Must Have):
 *  1. Client Header        — name, avatar, phone, start date, goal, classification badge
 *  2. Weight Chart         — full history line graph with start / current / Δ summary
 *  3. Workout Completion   — 4-week Mon-Sun calendar heatmap
 *  4. Meal Log Summary     — 28-day daily bar chart
 *  5. Assigned Plan Card   — plan name, description, copy-for-WhatsApp
 *  6. Trainer Notes        — private textarea with save
 *  7. Session History      — all sessions newest-first with status badges
 *  8. Edit Client Details  — modal to update name, goal, phone, classification
 *  9. Mood Tracker         — OCR screenshot upload, 7-day bar chart, manual override (Flow G)
 */

import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Calendar, Target, Edit2, X, Trash2,
  CheckCircle2, XCircle, AlertCircle, Clock,
  Video, MapPin, ClipboardList, MessageCircle,
  Trophy, CheckCircle, AlertTriangle, Copy, Check,
  Upload, TrendingUp, TrendingDown, Minus, Apple,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

import { dummyClients, calculateEngagementScore, dummyLogs, dummyTrainer, dummyPlans, dummyNutritionPlans } from '../data/dummyData.js';
import {
  getWeightHistory, getWorkoutHeatmap,
  getMealLogSummary, getClientSessions,
  SEED_DATE, TODAY_STR,
} from '../data/clientProfileStats.js';
import { MOOD_STATE_CONFIG } from '../models/types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Categorical palette — matches Dashboard chart colours
const CLIENT_COLOURS = {
  'client-0001': '#6366f1', // Priya  — indigo
  'client-0002': '#10b981', // Rahul  — emerald
  'client-0003': '#f59e0b', // Sneha  — amber
  'client-0004': '#0ea5e9', // Arjun  — sky
  'client-0005': '#8b5cf6', // Kavya  — violet
  'client-0006': '#f43f5e', // Rohan  — rose
};

const TIER_CFG = {
  serious:  { icon: Trophy,        label: 'Serious',  badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', headerCls: 'text-emerald-700' },
  active:   { icon: CheckCircle,   label: 'Active',   badgeCls: 'bg-blue-50 text-blue-700 border border-blue-200',          headerCls: 'text-blue-700'    },
  casual:   { icon: AlertTriangle, label: 'Casual',   badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200',       headerCls: 'text-amber-700'   },
  inactive: { icon: XCircle,       label: 'Inactive', badgeCls: 'bg-rose-50 text-rose-700 border border-rose-200',          headerCls: 'text-rose-700'    },
};

// All avatars are neutral — tier badges carry the classification colour
const TIER_AVATAR = {
  serious:  { bg: 'bg-zinc-100', text: 'text-zinc-800' },
  active:   { bg: 'bg-zinc-100', text: 'text-zinc-800' },
  casual:   { bg: 'bg-zinc-100', text: 'text-zinc-800' },
  inactive: { bg: 'bg-zinc-100', text: 'text-zinc-800' },
};

const STATUS_CFG = {
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2  },
  no_show:   { label: 'No Show',   cls: 'bg-red-100 text-red-700',         icon: XCircle       },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500',     icon: AlertCircle   },
  today:     { label: 'Today',     cls: 'bg-brand-100 text-brand-700',     icon: Clock         },
  upcoming:  { label: 'Upcoming',  cls: 'bg-blue-50 text-blue-600',        icon: Clock         },
};

const ALL_TIERS = ['serious', 'active', 'casual', 'inactive'];

// ---------------------------------------------------------------------------
// Micro-helpers
// ---------------------------------------------------------------------------

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr + 'T12:00:00Z').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtPhone(raw = '') {
  // 919876543210 → +91 98765 43210
  if (raw.startsWith('91') && raw.length === 12) {
    return `+91 ${raw.slice(2, 7)} ${raw.slice(7)}`;
  }
  return `+${raw}`;
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------

function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <div className="px-5 pt-5 pb-4 border-b border-slate-50">
          {title    && <h3 className="text-sm font-bold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Edit Client Details Modal (Section 3.3 — Edit Client Details)
// ---------------------------------------------------------------------------

function EditModal({ client, open, onClose, onSave }) {
  const [form, setForm] = useState({
    name:           client.name,
    goal:           client.goal,
    phone:          client.phone,
    classification: client.classification,
  });

  if (!open) return null;

  function field(label, key, type = 'text') {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                     text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400
                     focus:border-transparent"
        />
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Edit Client Details</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {field('Full Name', 'name')}
            {field('Goal',      'goal')}
            {field('Phone',     'phone', 'tel')}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Classification Override
              </label>
              <select
                value={form.classification}
                onChange={e => setForm(p => ({ ...p, classification: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                           text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400
                           focus:border-transparent"
              >
                {ALL_TIERS.map(t => (
                  <option key={t} value={t}>{TIER_CFG[t].label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm
                           font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => { onSave(form); onClose(); }}
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold
                           text-white hover:bg-brand-600">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. Client Header (Section 3.3 — Client Header)
// ---------------------------------------------------------------------------

function ClientHeader({ client, score, onEdit, onDelete }) {
  const avt      = TIER_AVATAR[client.classification] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
  const cfg      = TIER_CFG[client.classification];
  const TierIcon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start gap-5">
        {/* Avatar — colour mapped to engagement tier */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0
                         text-xl font-bold border border-zinc-200 ${avt.bg} ${avt.text}`}>
          {initials(client.name)}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">{client.name}</h1>

              {/* Classification badge */}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1 text-xs font-bold
                                  px-2.5 py-0.5 rounded-full ${cfg.badgeCls}`}>
                  <TierIcon className="w-3 h-3" />
                  {cfg.label}
                </span>
                <span className="text-xs text-slate-400 font-medium">Score: {score}</span>
                {client.classification_override && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5
                                   rounded font-semibold">manual override</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500
                           hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border
                           border-slate-200 rounded-lg px-3 py-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600
                           hover:text-red-700 bg-white hover:bg-red-50 border
                           border-red-200 rounded-lg px-3 py-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{fmtPhone(client.phone)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Since {fmtDate(client.start_date)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Target className="w-3.5 h-3.5 text-slate-400" />
              <span>{client.goal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Weight Chart (Section 3.3 — Weight Chart)
// ---------------------------------------------------------------------------

function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-500 mb-0.5">{label}</p>
      <p className="font-bold text-slate-800">{payload[0].value} kg</p>
    </div>
  );
}

function WeightSection({ clientId, colour }) {
  const data = useMemo(() => getWeightHistory(clientId), [clientId]);

  if (!data) {
    return (
      <SectionCard title="Weight History" subtitle="No weight logs recorded yet.">
        <p className="text-slate-400 text-sm py-4 text-center">No data</p>
      </SectionCard>
    );
  }

  const { chartData, startWeight, currentWeight, change, changePct } = data;
  const isLoss = change < 0;
  const isGain = change > 0;
  const changeColour = isLoss ? 'text-emerald-600' : isGain ? 'text-orange-500' : 'text-slate-500';
  const changeSign   = isGain ? '+' : '';

  return (
    <SectionCard
      title="Weight History"
      subtitle={`${chartData.length} entries — full history`}
    >
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Start</p>
          <p className="text-lg font-bold text-slate-700">{startWeight}<span className="text-xs ml-0.5 font-normal text-slate-400">kg</span></p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Current</p>
          <p className="text-lg font-bold text-slate-700">{currentWeight}<span className="text-xs ml-0.5 font-normal text-slate-400">kg</span></p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Change</p>
          <p className={`text-lg font-bold ${changeColour}`}>
            {changeSign}{change}
            <span className="text-xs ml-0.5 font-normal text-slate-400">kg</span>
          </p>
          <p className={`text-[10px] font-semibold ${changeColour}`}>{changeSign}{changePct}%</p>
        </div>
      </div>

      {/* Line chart */}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false} tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false} tickLine={false}
            width={40}
            tickFormatter={v => `${v}kg`}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<WeightTooltip />} />
          <ReferenceLine
            y={startWeight}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
            label={{ value: 'Start', position: 'insideTopRight', fontSize: 9, fill: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke={colour}
            strokeWidth={2.5}
            dot={{ r: 4, fill: colour, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// 3. Workout Completion Heatmap (Section 3.3 — Workout Completion)
// ---------------------------------------------------------------------------

function WorkoutHeatmap({ clientId }) {
  const weeks = useMemo(() => getWorkoutHeatmap(clientId), [clientId]);

  // Count totals for the summary line
  const total    = weeks.flatMap(w => w.cells).filter(c => c.hasWorkout).length;
  const possible = 28;

  return (
    <SectionCard
      title="Workout Completion"
      subtitle={`${total} of ${possible} sessions logged — last 4 weeks`}
    >
      {/* Day-of-week column headers */}
      <div className="flex items-center mb-2 pl-12">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="flex-1 text-center text-[10px] font-semibold text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex items-center gap-0">
            {/* Week label */}
            <div className="w-12 flex-shrink-0 text-[10px] text-slate-400 font-medium pr-2 text-right">
              {week.weekLabel}
            </div>
            {/* Day cells */}
            {week.cells.map(cell => (
              <div key={cell.date} className="flex-1 flex justify-center px-0.5">
                <div
                  title={`${cell.date}${cell.hasWorkout ? ' — workout logged' : ' — rest day'}`}
                  className={`w-8 h-8 rounded-md transition-transform hover:scale-110 cursor-default
                    ${cell.hasWorkout
                      ? 'bg-green-400 shadow-sm'
                      : 'bg-slate-100'
                    } ${cell.isToday ? 'ring-2 ring-brand-400' : ''}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-400" />
          <span className="text-[10px] text-slate-500 font-medium">Workout logged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-100" />
          <span className="text-[10px] text-slate-500 font-medium">Rest day</span>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// 4. Meal Log Summary Bar Chart (Section 3.3 — Meal Log Summary)
// ---------------------------------------------------------------------------

function MealTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-500 mb-0.5">{label}</p>
      <p className="font-bold text-slate-800">{payload[0].value} meal{payload[0].value !== 1 ? 's' : ''} logged</p>
    </div>
  );
}

function MealLogSection({ clientId, colour }) {
  const data = useMemo(() => getMealLogSummary(clientId), [clientId]);
  const totalMeals  = data.reduce((s, d) => s + d.meals, 0);
  const activeDays  = data.filter(d => d.meals > 0).length;

  return (
    <SectionCard
      title="Meal Log Summary"
      subtitle={`${totalMeals} meal entries across ${activeDays} days — last 4 weeks`}
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            axisLine={false} tickLine={false}
            interval={6}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false} tickLine={false}
            width={24}
            allowDecimals={false}
          />
          <Tooltip content={<MealTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="meals" fill={colour} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// MOOD TRACKER — Flow G (Section 5.3 + 7.2)
// ---------------------------------------------------------------------------

// ── Date helpers (UTC-safe, scoped to this module) ────────────────────────────

function moodGetMonday(dateStr) {
  const d   = new Date(dateStr + 'T12:00:00Z');
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().split('T')[0];
}

function moodShift(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function moodWeekDays(seedDate) {
  const monday = moodGetMonday(seedDate);
  return Array.from({ length: 7 }, (_, i) => {
    const dateStr = moodShift(monday, i);
    const d = new Date(dateStr + 'T12:00:00Z');
    return {
      dateStr,
      dayLabel:  d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' }),
      dateNum:   d.getUTCDate(),
      monthAbbr: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }),
    };
  });
}

// ── OCR extraction ────────────────────────────────────────────────────────────

function extractFromOCR(text) {
  const t = text.toLowerCase().replace(/,/g, '').replace(/\n/g, ' ');
  let meals_logged = null, water_ml = null, steps = null, sleep_hours = null, workout_done = null;

  // Meals: "3 meals" / "meals: 3" / "meals logged: 3"
  let m = t.match(/(\d+)\s*meals?(?:\s+logged)?/) || t.match(/meals?(?:\s+logged)?\s*[:\-]+\s*(\d+)/);
  if (m) meals_logged = parseInt(m[1], 10);

  // Water: "2000ml" / "2.0 l" / "2 liters"
  m = t.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (m) {
    water_ml = parseFloat(m[1]);
  } else {
    m = t.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|litre)s?\b/);
    if (m) water_ml = parseFloat(m[1]) * 1000;
  }

  // Steps: "8500 steps" / "steps: 8500"
  m = t.match(/(\d[\d\s]*)\s*steps?/) || t.match(/steps?\s*[:\-]+\s*(\d+)/);
  if (m) steps = parseInt(m[1].replace(/\s/g, ''), 10);

  // Sleep: "sleep: 7h" / "7.5 hours sleep"
  m = t.match(/sleep[a-z\s]*[:\-]+\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour)?/)
    || t.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\s*(?:of\s*)?sleep/);
  if (m) sleep_hours = parseFloat(m[1]);

  // Workout done/not
  if (/workout[^.]{0,30}(?:done|complete|yes|logged|✓|✔|1\b)/.test(t))       workout_done = true;
  else if (/workout[^.]{0,30}(?:not done|no|missed|skip|0\b|✗|×)/.test(t))   workout_done = false;

  const signals = [meals_logged, water_ml, steps, sleep_hours, workout_done].filter(v => v !== null).length;
  return { meals_logged, water_ml, steps, sleep_hours, workout_done, ocr_success: signals >= 2 };
}

// ── Mood score formula (Section 5.3) ─────────────────────────────────────────

function computeMoodScore({ meals_logged, water_ml, workout_done, steps, sleep_hours }) {
  let score = 0;
  if (meals_logged !== null) {
    if (meals_logged >= 3)       score += 35;
    else if (meals_logged === 2) score += 23;
    else if (meals_logged === 1) score += 10;
  }
  if (workout_done === true) score += 30;
  if (water_ml     !== null) score += Math.min(water_ml / 2000, 1) * 20;
  if (steps        !== null) score += Math.min(steps   / 8000,  1) * 10;
  if (sleep_hours  !== null) {
    if (sleep_hours >= 7)      score += 5;
    else if (sleep_hours >= 5) score += ((sleep_hours - 5) / 2) * 5;
  }
  return Math.round(score);
}

function getMoodStateKey(score) {
  if (score >= 80) return 'thriving';
  if (score >= 60) return 'on_track';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'low_energy';
  return 'struggling';
}

function initDayState() {
  return {
    imageUrl: null, ocrRaw: null,
    meals_logged: null, water_ml: null, workout_done: null,
    steps: null, sleep_hours: null,
    mood_score: null, mood_state: null,
    ocr_success: null, manually_overridden: false,
    nudge_sent: false, isLoading: false,
  };
}

// ── ManualOverrideModal ───────────────────────────────────────────────────────

function ManualOverrideModal({ dateLabel, existing, onSave, onClose }) {
  const [form, setForm] = useState({
    meals_logged: existing.meals_logged ?? '',
    water_ml:     existing.water_ml     ?? '',
    workout_done: existing.workout_done ?? false,
    steps:        existing.steps        ?? '',
    sleep_hours:  existing.sleep_hours  ?? '',
  });

  const previewScore  = computeMoodScore({
    meals_logged: form.meals_logged !== '' ? Number(form.meals_logged) : null,
    water_ml:     form.water_ml     !== '' ? Number(form.water_ml)     : null,
    workout_done: form.workout_done,
    steps:        form.steps        !== '' ? Number(form.steps)        : null,
    sleep_hours:  form.sleep_hours  !== '' ? Number(form.sleep_hours)  : null,
  });
  const previewState  = getMoodStateKey(previewScore);
  const previewColour = MOOD_STATE_CONFIG[previewState].colour;

  function numField(label, key, placeholder, step = 1) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
        <input
          type="number" value={form[key]} step={step} placeholder={placeholder}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm
                     text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400
                     focus:border-transparent"
        />
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">Manual Override — {dateLabel}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-3">
            {numField('Meals Logged (0 – 6)', 'meals_logged', '3')}
            {numField('Water (ml)', 'water_ml', '2000')}
            {numField('Steps', 'steps', '8000')}
            {numField('Sleep (hours)', 'sleep_hours', '7', 0.5)}

            {/* Workout toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Workout Done?</label>
              <div className="flex gap-2">
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    onClick={() => setForm(p => ({ ...p, workout_done: v }))}
                    className={`flex-1 text-sm font-semibold py-2 rounded-lg border transition-all
                      ${form.workout_done === v
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {/* Live score preview */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ backgroundColor: previewColour }}
              >
                {previewScore}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Mood Score</p>
                <p className="text-sm font-bold" style={{ color: previewColour }}>
                  {MOOD_STATE_CONFIG[previewState].label}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm
                           font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  onSave({
                    meals_logged: form.meals_logged !== '' ? Number(form.meals_logged) : null,
                    water_ml:     form.water_ml     !== '' ? Number(form.water_ml)     : null,
                    workout_done: form.workout_done,
                    steps:        form.steps        !== '' ? Number(form.steps)        : null,
                    sleep_hours:  form.sleep_hours  !== '' ? Number(form.sleep_hours)  : null,
                  });
                  onClose();
                }}
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold
                           text-white hover:bg-brand-600">
                Save Override
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── DayDetailModal ────────────────────────────────────────────────────────────

function DayDetailModal({ dateLabel, data, onOverride, onClose }) {
  const hasScore   = data.mood_score !== null;
  const moodColour = hasScore ? MOOD_STATE_CONFIG[data.mood_state]?.colour : '#94a3b8';
  const moodLabel  = hasScore ? MOOD_STATE_CONFIG[data.mood_state]?.label  : '—';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">{dateLabel}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Screenshot thumbnail */}
            {data.imageUrl && (
              <img
                src={data.imageUrl}
                alt="Dashboard screenshot"
                className="w-full rounded-xl object-cover max-h-44 border border-slate-100"
              />
            )}

            {/* Score badge */}
            {hasScore && (
              <div
                className="flex items-center gap-3 rounded-xl p-3 border"
                style={{ borderColor: moodColour + '50', backgroundColor: moodColour + '14' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center
                              font-bold text-white text-lg flex-shrink-0"
                  style={{ backgroundColor: moodColour }}
                >
                  {data.mood_score}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Mood Score</p>
                  <p className="text-sm font-bold" style={{ color: moodColour }}>{moodLabel}</p>
                  {data.manually_overridden && (
                    <p className="text-[10px] text-slate-400 mt-0.5">manually overridden</p>
                  )}
                </div>
              </div>
            )}

            {/* Signal breakdown grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Meals',   data.meals_logged !== null ? `${data.meals_logged}` : '—'],
                ['Water',   data.water_ml    !== null ? `${data.water_ml} ml`   : '—'],
                ['Workout', data.workout_done === true  ? 'Done ✓'
                          : data.workout_done === false ? 'Missed' : '—'],
                ['Steps',   data.steps       !== null ? `${data.steps}`         : '—'],
                ['Sleep',   data.sleep_hours !== null ? `${data.sleep_hours}h`  : '—'],
              ].map(([key, val]) => (
                <div key={key} className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{key}</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => { onOverride(); onClose(); }}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm
                         font-medium text-slate-600 hover:bg-slate-50 text-center"
            >
              Edit / Override Values
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── DaySlot ───────────────────────────────────────────────────────────────────

function DaySlot({ dayInfo, data, isToday, isPast, onUploadClick, onNudge, onBarClick }) {
  const hasScore   = data.mood_score !== null;
  const moodColour = hasScore ? (MOOD_STATE_CONFIG[data.mood_state]?.colour ?? '#94a3b8') : null;
  const barPct     = hasScore ? Math.max(data.mood_score, 6) : 0;

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 rounded-xl p-2">
      {/* Day label + date */}
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {dayInfo.dayLabel}
      </p>
      <p className="text-xs font-semibold text-slate-500">
        {dayInfo.dateNum}
      </p>

      {/* Score bar */}
      <div
        className="relative w-full rounded-md bg-slate-100 overflow-hidden cursor-pointer"
        style={{ height: 80 }}
        onClick={() => hasScore && onBarClick()}
        title={hasScore ? `${MOOD_STATE_CONFIG[data.mood_state]?.label} — ${data.mood_score}` : undefined}
      >
        {hasScore && (
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-300"
            style={{ height: `${barPct}%`, backgroundColor: moodColour }}
          />
        )}
        {data.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Score label */}
      <p className="text-xs font-bold" style={hasScore ? { color: moodColour } : { color: '#cbd5e1' }}>
        {hasScore ? data.mood_score : '—'}
      </p>

      {/* Thumbnail */}
      {data.imageUrl && (
        <img
          src={data.imageUrl}
          alt="Screenshot"
          className="w-10 h-10 rounded-lg object-cover border border-slate-100 cursor-pointer"
          onClick={onBarClick}
        />
      )}

      {/* Upload button */}
      <button
        onClick={onUploadClick}
        disabled={data.isLoading}
        title={data.imageUrl ? 'Replace screenshot' : 'Upload screenshot'}
        className={`flex items-center justify-center gap-1 text-[10px] font-semibold
                    px-2 py-1 rounded-lg border transition-all w-full
                    ${data.imageUrl
                      ? 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'
                      : (isPast || isToday)
                        ? 'border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100'
                        : 'border-slate-100 text-slate-300'
                    }`}
      >
        <Upload className="w-2.5 h-2.5" />
        {data.imageUrl ? 'Replace' : 'Upload'}
      </button>

      {/* Nudge button — only for past / today days with no score */}
      {!hasScore && (isPast || isToday) && !data.nudge_sent && (
        <button
          onClick={onNudge}
          className="flex items-center justify-center gap-1 text-[10px] font-semibold
                     px-2 py-1 rounded-lg border border-green-200 text-green-600
                     bg-green-50 hover:bg-green-100 transition-all w-full"
        >
          <MessageCircle className="w-2.5 h-2.5" />
          Nudge
        </button>
      )}
      {data.nudge_sent && (
        <span className="text-[9px] text-green-500 font-semibold text-center">Nudged ✓</span>
      )}
    </div>
  );
}

// ── MoodWeeklySummary ─────────────────────────────────────────────────────────

function MoodWeeklySummary({ days, dayData }) {
  const scored = days.filter(d => dayData[d.dateStr].mood_score !== null);
  if (scored.length === 0) return null;

  const best  = scored.reduce((a, b) =>
    dayData[a.dateStr].mood_score >= dayData[b.dateStr].mood_score ? a : b);
  const worst = scored.reduce((a, b) =>
    dayData[a.dateStr].mood_score <= dayData[b.dateStr].mood_score ? a : b);

  let trend = 'stable';
  if (scored.length >= 2) {
    const mid   = Math.floor(scored.length / 2);
    const first = scored.slice(0, mid);
    const last  = scored.slice(mid);
    if (first.length && last.length) {
      const avgFirst = first.reduce((s, d) => s + dayData[d.dateStr].mood_score, 0) / first.length;
      const avgLast  = last.reduce((s,  d) => s + dayData[d.dateStr].mood_score, 0) / last.length;
      if (avgLast - avgFirst >  5) trend = 'improving';
      if (avgFirst - avgLast > 5)  trend = 'declining';
    }
  }

  const bestColour  = MOOD_STATE_CONFIG[dayData[best.dateStr].mood_state]?.colour;
  const worstColour = MOOD_STATE_CONFIG[dayData[worst.dateStr].mood_state]?.colour;

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs mt-2 mb-1">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 font-medium">Best:</span>
        <span className="font-bold" style={{ color: bestColour }}>
          {best.dayLabel} {best.dateNum} · {dayData[best.dateStr].mood_score}
        </span>
      </div>
      {worst.dateStr !== best.dateStr && (
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Worst:</span>
          <span className="font-bold" style={{ color: worstColour }}>
            {worst.dayLabel} {worst.dateNum} · {dayData[worst.dateStr].mood_score}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 font-medium">Trend:</span>
        <span className={`font-bold flex items-center gap-0.5
          ${trend === 'improving' ? 'text-emerald-600'
          : trend === 'declining' ? 'text-red-500'
          : 'text-slate-500'}`}>
          {trend === 'improving' ? <TrendingUp   className="w-3 h-3" />
          : trend === 'declining' ? <TrendingDown className="w-3 h-3" />
          :                         <Minus        className="w-3 h-3" />}
          {trend.charAt(0).toUpperCase() + trend.slice(1)}
        </span>
      </div>
    </div>
  );
}

// ── MoodChartSection ──────────────────────────────────────────────────────────

function MoodChartSection({ client }) {
  const days = useMemo(() => moodWeekDays(TODAY_STR), []);

  const initState = useMemo(
    () => Object.fromEntries(days.map(d => [d.dateStr, initDayState()])),
    [days],
  );

  const [dayData,      setDayData]      = useState(initState);
  const [detailDay,    setDetailDay]    = useState(null);
  const [overrideDay,  setOverrideDay]  = useState(null);
  const fileInputRef   = useRef(null);
  const pendingDateRef = useRef(null);

  const weekLabel = useMemo(() => {
    const first = days[0];
    const last  = days[6];
    if (first.monthAbbr === last.monthAbbr) {
      return `${first.monthAbbr} ${first.dateNum} – ${last.dateNum}`;
    }
    return `${first.monthAbbr} ${first.dateNum} – ${last.monthAbbr} ${last.dateNum}`;
  }, [days]);

  function updateDay(dateStr, patch) {
    setDayData(prev => ({ ...prev, [dateStr]: { ...prev[dateStr], ...patch } }));
  }

  function handleUploadClick(dateStr) {
    pendingDateRef.current = dateStr;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }

  async function handleFileChange(e) {
    const file    = e.target.files?.[0];
    const dateStr = pendingDateRef.current;
    if (!file || !dateStr) return;

    // Revoke previous object URL
    const old = dayData[dateStr]?.imageUrl;
    if (old) URL.revokeObjectURL(old);

    const imageUrl = URL.createObjectURL(file);
    updateDay(dateStr, { imageUrl, isLoading: true, ocrRaw: null });

    try {
      const { recognize } = await import('tesseract.js');
      const { data: { text } } = await recognize(file, 'eng', { logger: () => {} });
      const extracted = extractFromOCR(text);
      const score     = computeMoodScore(extracted);
      const state     = getMoodStateKey(score);

      updateDay(dateStr, {
        ocrRaw: text,
        ...extracted,
        mood_score:          score,
        mood_state:          state,
        manually_overridden: false,
        isLoading:           false,
      });

      // Auto-open manual override when OCR confidence is low
      if (!extracted.ocr_success) setOverrideDay(dateStr);

    } catch {
      updateDay(dateStr, { isLoading: false, ocr_success: false });
      setOverrideDay(dateStr);
    }
  }

  function handleNudge(dateStr) {
    const phone     = client.phone;
    const firstName = client.name.split(' ')[0];
    const msg       = encodeURIComponent(
      `Hey ${firstName}! Don't forget to send your dashboard screenshot for today 📊`,
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener');
    updateDay(dateStr, { nudge_sent: true });
  }

  function handleSaveOverride(dateStr, vals) {
    const score = computeMoodScore(vals);
    const state = getMoodStateKey(score);
    updateDay(dateStr, {
      ...vals,
      mood_score:          score,
      mood_state:          state,
      manually_overridden: true,
      ocr_success:         true,
    });
  }

  const detailData   = detailDay   ? dayData[detailDay]   : null;
  const detailInfo   = detailDay   ? days.find(d => d.dateStr === detailDay)   : null;
  const overrideData = overrideDay ? dayData[overrideDay] : null;
  const overrideInfo = overrideDay ? days.find(d => d.dateStr === overrideDay) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Mood Tracker</h3>
            <p className="text-xs text-slate-400 mt-0.5">Week of {weekLabel} — upload daily screenshots</p>
          </div>
          {/* Mood state legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {Object.entries(MOOD_STATE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.colour }} />
                <span className="text-[9px] text-slate-500 font-medium">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
        <MoodWeeklySummary days={days} dayData={dayData} />
      </div>

      {/* 7-day columns */}
      <div className="p-4">
        <div className="flex gap-1.5">
          {days.map(dayInfo => {
            const data    = dayData[dayInfo.dateStr];
            const isToday = dayInfo.dateStr === TODAY_STR;
            const isPast  = dayInfo.dateStr <  TODAY_STR;
            return (
              <DaySlot
                key={dayInfo.dateStr}
                dayInfo={dayInfo}
                data={data}
                isToday={isToday}
                isPast={isPast}
                onUploadClick={() => handleUploadClick(dayInfo.dateStr)}
                onNudge={() => handleNudge(dayInfo.dateStr)}
                onBarClick={() => setDetailDay(dayInfo.dateStr)}
              />
            );
          })}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Day Detail Modal */}
      {detailDay && detailData && detailInfo && (
        <DayDetailModal
          dateLabel={`${detailInfo.dayLabel} ${detailInfo.dateNum} ${detailInfo.monthAbbr}`}
          data={detailData}
          onOverride={() => setOverrideDay(detailDay)}
          onClose={() => setDetailDay(null)}
        />
      )}

      {/* Manual Override Modal */}
      {overrideDay && overrideData && overrideInfo && (
        <ManualOverrideModal
          dateLabel={`${overrideInfo.dayLabel} ${overrideInfo.dateNum} ${overrideInfo.monthAbbr}`}
          existing={overrideData}
          onSave={vals => handleSaveOverride(overrideDay, vals)}
          onClose={() => setOverrideDay(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Assigned Plan Card (Section 3.3 — Assigned Plan Card)
// ---------------------------------------------------------------------------

function formatPlanText(plan) {
  const lines = [];
  lines.push(`🏋️ *${plan.name}*`);
  if (plan.description) lines.push(`_${plan.description}_`);
  lines.push('');
  (plan.days ?? []).forEach(day => {
    lines.push(`*${day.label}*`);
    (day.exercises ?? []).forEach((ex, i) => {
      let line = `${i + 1}. ${ex.name || 'Exercise'}`;
      const parts = [];
      if (ex.sets) parts.push(`${ex.sets} sets`);
      if (ex.reps) parts.push(`${ex.reps} reps`);
      if (parts.length) line += ` — ${parts.join(' × ')}`;
      if (ex.notes) line += ` _(${ex.notes})_`;
      lines.push(line);
    });
    lines.push('');
  });
  lines.push('—');
  lines.push(`Sent by ${dummyTrainer.name} via RPM.ENERGY`);
  return lines.join('\n').trimEnd();
}

function AssignedPlanCard({ client }) {
  const [planId,      setPlanId]      = useState(client.assigned_plan_id ?? null);
  const [showPicker,  setShowPicker]  = useState(false);
  const [copied,      setCopied]      = useState(false);

  const pickerPlans = useMemo(() => {
    try {
      const raw = localStorage.getItem('rpm_plans');
      return raw ? JSON.parse(raw) : dummyPlans;
    } catch {
      return dummyPlans;
    }
  }, []);

  const plan = useMemo(() => pickerPlans.find(p => p.plan_id === planId) ?? null, [planId, pickerPlans]);

  function persistPlan(id) {
    try {
      const raw  = localStorage.getItem('rpm_clients');
      const list = raw ? JSON.parse(raw) : [];
      const idx  = list.findIndex(c => c.client_id === client.client_id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], assigned_plan_id: id };
        localStorage.setItem('rpm_clients', JSON.stringify(list));
      }
    } catch { /* silent */ }
  }

  function handleAssign(id) {
    setPlanId(id);
    persistPlan(id);
    setShowPicker(false);
  }

  function copyForWhatsApp() {
    navigator.clipboard.writeText(formatPlanText(plan)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <SectionCard title="Assigned Plan">
      {!plan ? (
        <>
          <p className="text-slate-400 text-sm">No plan assigned yet.</p>
          <button
            onClick={() => setShowPicker(true)}
            className="mt-3 text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            + Assign a Plan
          </button>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 leading-tight">{plan.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{plan.days.length} days/week</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{plan.description}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={copyForWhatsApp}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                          border transition-all
                          ${copied
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50'}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy for WhatsApp'}
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                         rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              Change Plan
            </button>
          </div>
        </>
      )}

      {/* Plan picker modal */}
      {showPicker && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowPicker(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Select a Plan</h3>
                <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {pickerPlans.map(p => (
                  <button
                    key={p.plan_id}
                    onClick={() => handleAssign(p.plan_id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all
                                ${planId === p.plan_id
                                  ? 'border-brand-400 bg-brand-50'
                                  : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}
                  >
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// 10. Assigned Nutrition Card
// ---------------------------------------------------------------------------

function AssignedNutritionCard({ client }) {
  const [showPicker, setShowPicker] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const nutritionPlans = useMemo(() => {
    try {
      const raw = localStorage.getItem('rpm_nutrition_plans');
      return raw ? JSON.parse(raw) : dummyNutritionPlans;
    } catch {
      return dummyNutritionPlans;
    }
  }, []);

  // Derive initial plan: check client field, then scan assigned_to arrays
  const [planId, setPlanId] = useState(() => {
    if (client.assigned_nutrition_id) return client.assigned_nutrition_id;
    const found = nutritionPlans.find(p => p.assigned_to?.includes(client.client_id));
    return found?.nutrition_plan_id ?? null;
  });

  const plan = useMemo(
    () => nutritionPlans.find(p => p.nutrition_plan_id === planId) ?? null,
    [planId, nutritionPlans]
  );

  function formatShareText(p) {
    const lines = [
      `🥗 *${p.name}*`,
      p.description ? `_${p.description}_` : '',
      '',
      `📊 *Daily Macros*`,
      `• Calories: ${p.calories} kcal`,
      `• Protein:  ${p.protein_g}g`,
      `• Carbs:    ${p.carbs_g}g`,
      `• Fats:     ${p.fats_g}g`,
    ];
    if (p.guidelines?.trim()) {
      lines.push('', `📝 *Guidelines*`, p.guidelines.trim());
    }
    lines.push('', '— Sent via RPM.ENERGY');
    return lines.filter(l => l !== undefined).join('\n');
  }

  function persistAssignment(nutritionPlanId) {
    try {
      // Update clients
      const rawClients = localStorage.getItem('rpm_clients');
      const clientList = rawClients ? JSON.parse(rawClients) : [];
      const idx        = clientList.findIndex(c => c.client_id === client.client_id);
      if (idx !== -1) {
        clientList[idx] = { ...clientList[idx], assigned_nutrition_id: nutritionPlanId };
        localStorage.setItem('rpm_clients', JSON.stringify(clientList));
      }
      // Update plans
      const rawPlans = localStorage.getItem('rpm_nutrition_plans');
      const planList = rawPlans ? JSON.parse(rawPlans) : dummyNutritionPlans;
      const updated  = planList.map(p => {
        if (p.nutrition_plan_id === nutritionPlanId) {
          return p.assigned_to.includes(client.client_id)
            ? p
            : { ...p, assigned_to: [...p.assigned_to, client.client_id] };
        }
        return { ...p, assigned_to: p.assigned_to.filter(id => id !== client.client_id) };
      });
      localStorage.setItem('rpm_nutrition_plans', JSON.stringify(updated));
    } catch { /* silent */ }
  }

  function handleAssign(id) {
    setPlanId(id);
    persistAssignment(id);
    setShowPicker(false);
  }

  function copyForWhatsApp() {
    if (!plan) return;
    navigator.clipboard.writeText(formatShareText(plan)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <SectionCard title="Nutrition Plan">
      {!plan ? (
        <>
          <p className="text-zinc-400 text-sm">No nutrition plan assigned yet.</p>
          <button
            onClick={() => setShowPicker(true)}
            className="mt-3 text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            + Assign a Plan
          </button>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Apple className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800 leading-tight">{plan.name}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{plan.description}</p>
            </div>
          </div>

          {/* Macro chips */}
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {[
              { label: 'Calories', value: `${plan.calories} kcal` },
              { label: 'Protein',  value: `${plan.protein_g}g` },
              { label: 'Carbs',    value: `${plan.carbs_g}g` },
              { label: 'Fats',     value: `${plan.fats_g}g` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-50 rounded-lg px-2.5 py-1.5">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</p>
                <p className="text-xs font-bold text-zinc-800">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={copyForWhatsApp}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                          border transition-all
                          ${copied
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50'}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy for WhatsApp'}
            </button>
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                         rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
            >
              Change Plan
            </button>
          </div>
        </>
      )}

      {/* Nutrition plan picker modal */}
      {showPicker && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowPicker(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-800">Select Nutrition Plan</h3>
                <button onClick={() => setShowPicker(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
                {nutritionPlans.map(p => (
                  <button
                    key={p.nutrition_plan_id}
                    onClick={() => handleAssign(p.nutrition_plan_id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all
                                ${planId === p.nutrition_plan_id
                                  ? 'border-brand-400 bg-brand-50'
                                  : 'border-transparent hover:bg-zinc-50 hover:border-zinc-200'}`}
                  >
                    <p className="text-sm font-semibold text-zinc-800">{p.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{p.description}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium">
                      {p.calories} kcal · {p.protein_g}g Pro · {p.carbs_g}g Carb · {p.fats_g}g Fat
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// 6. Trainer Notes (Section 3.3 — Trainer Notes)
// ---------------------------------------------------------------------------

function TrainerNotesSection({ initialNotes, clientId }) {
  const [notes,  setNotes]  = useState(initialNotes ?? '');
  const [saved,  setSaved]  = useState(true);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setNotes(e.target.value);
    setSaved(false);
  }

  function handleSave() {
    setSaving(true);
    try {
      const raw  = localStorage.getItem('rpm_clients');
      const list = raw ? JSON.parse(raw) : [];
      const idx  = list.findIndex(c => c.client_id === clientId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], notes };
        localStorage.setItem('rpm_clients', JSON.stringify(list));
      }
    } catch { /* no backend in V1 — silent */ }
    setTimeout(() => { setSaving(false); setSaved(true); }, 300);
  }

  return (
    <SectionCard title="Private Notes" subtitle="Visible to trainer only">
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Add notes about this client — goals, form cues, schedule preferences…"
        rows={5}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm
                   text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2
                   focus:ring-brand-400 focus:border-transparent resize-none leading-relaxed"
      />
      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs font-medium transition-colors
          ${saved ? 'text-slate-400' : 'text-amber-500'}`}>
          {saved ? 'All changes saved' : 'Unsaved changes'}
        </span>
        <button
          onClick={handleSave}
          disabled={saved}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all
            ${saved
              ? 'bg-slate-100 text-slate-400 cursor-default'
              : 'bg-brand-500 text-white hover:bg-brand-600'}`}
        >
          {saving ? 'Saving…' : 'Save Notes'}
        </button>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// 7. Session History (Section 3.3 — Session History)
// ---------------------------------------------------------------------------

function SessionRow({ session }) {
  const cfg      = STATUS_CFG[session.displayStatus] ?? STATUS_CFG.upcoming;
  const StatusIcon = cfg.icon;
  const isOnline = session.session_type === 'online';

  const dateLabel = new Date(session.date + 'T12:00:00Z').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="flex items-start gap-4 py-3 px-5 border-b border-slate-50 last:border-0
                    hover:bg-slate-50 transition-colors">
      {/* Status icon */}
      <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.cls.split(' ')[1]}`} />

      {/* Date + time + type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-700">{dateLabel}</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs font-medium text-slate-500">{session.time}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
                           px-1.5 py-0.5 rounded-full
                           ${isOnline ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'}`}>
            {isOnline ? <Video className="w-2.5 h-2.5" /> : <MapPin className="w-2.5 h-2.5" />}
            {isOnline ? 'Online' : 'In-Person'}
          </span>
        </div>
        {session.notes && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{session.notes}</p>
        )}
      </div>

      {/* Status badge */}
      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
        {cfg.label}
      </span>
    </div>
  );
}

function SessionHistorySection({ clientId }) {
  const sessions = useMemo(() => getClientSessions(clientId), [clientId]);

  const completedCount = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Session History</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {sessions.length} total · {completedCount} completed
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-400 text-center">No sessions recorded yet.</p>
      ) : (
        <div>{sessions.map(s => <SessionRow key={s.session_id} session={s} />)}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root — ClientProfile page
// ---------------------------------------------------------------------------

export default function ClientProfile() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  // Local override for edited fields (no backend in V1)
  const [clientOverride, setClientOverride] = useState(null);

  const baseClient = useMemo(() => {
    try {
      const saved = localStorage.getItem('rpm_clients');
      const list  = saved ? JSON.parse(saved) : dummyClients;
      return list.find(c => c.client_id === id);
    } catch {
      return dummyClients.find(c => c.client_id === id);
    }
  }, [id]);

  if (!baseClient) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-3">Client not found.</p>
          <Link to="/clients" className="text-brand-500 text-sm font-medium hover:underline">
            ← Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  // Merge base client with any local overrides from the edit modal
  const client = { ...baseClient, ...clientOverride };
  const colour  = CLIENT_COLOURS[client.client_id] ?? '#64748b';
  const { score } = calculateEngagementScore(client.client_id, dummyLogs, SEED_DATE);

  function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this client? This cannot be undone.')) return;
    try {
      const saved = localStorage.getItem('rpm_clients');
      const list  = saved ? JSON.parse(saved) : dummyClients;
      const updated = list.filter(c => c.client_id !== id);
      localStorage.setItem('rpm_clients', JSON.stringify(updated));
    } catch {
      // If localStorage fails, still navigate away
    }
    navigate('/clients');
  }

  function handleSaveEdit(form) {
    setClientOverride({
      name:                    form.name,
      goal:                    form.goal,
      phone:                   form.phone,
      classification:          form.classification,
      classification_override: form.classification !== baseClient.classification,
    });
  }

  return (
    <div className="min-h-full bg-slate-50">

      {/* Back navigation */}
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 px-6 py-3">
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500
                     hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          My Clients
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* 1. Client Header */}
        <ClientHeader client={client} score={score} onEdit={() => setEditOpen(true)} onDelete={handleDelete} />

        {/* 2. Weight Chart */}
        <WeightSection clientId={client.client_id} colour={colour} />

        {/* 3 + 4. Heatmap + Meal Log — side by side on xl */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <WorkoutHeatmap clientId={client.client_id} />
          <MealLogSection clientId={client.client_id} colour={colour} />
        </div>

        {/* 9. Mood Tracker (Flow G) */}
        <MoodChartSection client={client} />

        {/* 5, 10 + 6. Plan Card + Nutrition Card (stacked) + Trainer Notes */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-5">
          <div className="space-y-5">
            <AssignedPlanCard client={client} />
            <AssignedNutritionCard client={client} />
          </div>
          <TrainerNotesSection initialNotes={client.notes} clientId={client.client_id} />
        </div>

        {/* 7. Session History */}
        <SessionHistorySection clientId={client.client_id} />

        <div className="h-6" />
      </div>

      {/* Edit modal */}
      <EditModal
        client={client}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
