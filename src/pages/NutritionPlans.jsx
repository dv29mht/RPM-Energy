/**
 * progrx — Nutrition Plan Library & Builder (/nutrition)
 *
 * Elements:
 *  N1 — Plan Library   : card grid — name, macros, assigned client count, dynamic icon
 *  N2 — Create Plan    : inline builder (name, description, icon picker, macros, meals)
 *  N3 — Save Template  : saves to localStorage; card appears in library grid
 *  N4 — Assign         : modal with client checklist; updates assigned_nutrition_id
 *  N5 — Share          : formatted WhatsApp macro summary, per-client WA links
 *
 * Also supports: Edit, Duplicate, Delete (with referential integrity guard).
 *
 * Persistence: rpm_nutrition_plans in localStorage.
 * Assignment:  updates both plan.assigned_to[] and client.assigned_nutrition_id.
 */

import { useState } from 'react';
import {
  Plus, X, Edit2, Copy, Trash2, Users, Share2, Check,
  ArrowLeft, Apple, Beef, Carrot, Flame, Droplet, Clock,
} from 'lucide-react';

import { dummyNutritionPlans, dummyClients } from '../data/dummyData.js';

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  { key: 'flame',   Icon: Flame,   label: 'Flame'    },
  { key: 'beef',    Icon: Beef,    label: 'Beef'     },
  { key: 'apple',   Icon: Apple,   label: 'Apple'    },
  { key: 'carrot',  Icon: Carrot,  label: 'Carrot'   },
  { key: 'droplet', Icon: Droplet, label: 'Hydration' },
];

function PlanIcon({ iconType, className }) {
  const match = ICON_OPTIONS.find(o => o.key === iconType);
  const Icon  = match ? match.Icon : Apple;
  return <Icon className={className} />;
}

// ---------------------------------------------------------------------------
// Meal constants
// ---------------------------------------------------------------------------

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Beverage'];

/** Convert "HH:MM" → "H:MM AM/PM" */
function fmt12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr   = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_NUTRITION_KEY = 'rpm_nutrition_plans';
const LS_CLIENTS_KEY   = 'rpm_clients';

const BLANK_PLAN = {
  name:        '',
  description: '',
  iconType:    'apple',
  calories:    '',
  protein_g:   '',
  carbs_g:     '',
  fats_g:      '',
  meals:       [],
};

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadNutritionPlans() {
  try {
    const saved = localStorage.getItem(LS_NUTRITION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return dummyNutritionPlans.map(p => ({ ...p, assigned_to: [...p.assigned_to] }));
}

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

function persistNutritionPlans(plans) {
  try { localStorage.setItem(LS_NUTRITION_KEY, JSON.stringify(plans)); } catch {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Formats a nutrition plan as WhatsApp-ready text.
 * Renders structured meals if present, falls back to legacy guidelines string.
 */
function formatNutritionPlanText(plan) {
  const lines = [
    `🥗 *${plan.name}*`,
    plan.description ? `_${plan.description}_` : '',
    '',
    `📊 *Daily Macros*`,
    `• Calories: ${plan.calories} kcal`,
    `• Protein:  ${plan.protein_g}g`,
    `• Carbs:    ${plan.carbs_g}g`,
    `• Fats:     ${plan.fats_g}g`,
  ];

  // Structured meals (new format)
  if (plan.meals?.length > 0) {
    lines.push('', `🍽️ *Meal Schedule*`);
    plan.meals.forEach((meal, i) => {
      const time = meal.time ? ` (${fmt12h(meal.time)})` : '';
      const desc = meal.description?.trim() ? ` — ${meal.description.trim()}` : '';
      lines.push(`${i + 1}. ${meal.name}${time}${desc}`);
    });
  } else if (plan.guidelines?.trim()) {
    // Legacy guidelines fallback
    lines.push('', `📝 *Guidelines*`, plan.guidelines.trim());
  }

  lines.push('', '— Sent via progrx.in');
  return lines.filter(l => l !== undefined).join('\n');
}

// ---------------------------------------------------------------------------
// AssignModal
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

          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-bold text-zinc-800">Assign to Clients</h2>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[200px]">{plan.name}</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-5 h-5" />
            </button>
          </div>

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
                                : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center
                                  bg-zinc-100 text-zinc-800 border border-zinc-200
                                  text-[10px] font-bold flex-shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-700 leading-tight truncate">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">{c.goal}</p>
                  </div>
                  {checked && <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 px-6 pb-5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm
                         font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(plan.nutrition_plan_id, [...selected])}
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold
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
// ShareModal — per-client WhatsApp links
// ---------------------------------------------------------------------------

function ShareModal({ plan, allClients, onClose }) {
  const [copied, setCopied] = useState(false);
  const text            = formatNutritionPlanText(plan);
  const assignedClients = allClients.filter(c => plan.assigned_to.includes(c.client_id));

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function waLink(client) {
    const phone = (client.phone ?? '').replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-bold text-zinc-800">Share Plan</h2>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[280px]">{plan.name}</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Plan text preview */}
          <div className="px-6 pt-4 pb-3">
            <pre className="text-xs text-zinc-700 bg-zinc-50 border border-zinc-200
                            rounded-xl p-4 whitespace-pre-wrap font-mono max-h-52 overflow-y-auto">
              {text}
            </pre>
          </div>

          {/* Copy button */}
          <div className="px-6 pb-3">
            <button
              onClick={handleCopy}
              className={`w-full rounded-lg px-4 py-2 text-sm font-bold transition
                          ${copied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              {copied ? '✓ Copied!' : 'Copy Text'}
            </button>
          </div>

          {/* Per-client WhatsApp links */}
          {assignedClients.length > 0 ? (
            <div className="px-6 pb-5 space-y-2">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                Send to assigned clients
              </p>
              {assignedClients.map(c => (
                <a
                  key={c.client_id}
                  href={waLink(c)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
                             bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30
                             transition text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center
                                  bg-zinc-100 text-zinc-800 border border-zinc-200
                                  text-[10px] font-bold flex-shrink-0">
                    {initials(c.name)}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-zinc-700">{c.name}</span>
                  <span className="text-[11px] font-bold text-[#25D366]">WhatsApp →</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-5">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full rounded-lg px-4 py-2 text-sm
                           font-bold bg-[#25D366] text-white hover:opacity-90 transition"
              >
                WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// NutritionPlanCard (Library grid)
// ---------------------------------------------------------------------------

function NutritionPlanCard({ plan, allClients, onEdit, onDuplicate, onDelete, onAssign, onShare }) {
  const assignedClients = allClients.filter(c => plan.assigned_to.includes(c.client_id));
  const clientCount     = plan.assigned_to.length;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col
                    hover:border-zinc-300 hover:shadow-md transition-all">

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
          <PlanIcon iconType={plan.iconType} className="w-5 h-5 text-brand-500" />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onEdit(plan)}
            title="Edit plan"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicate(plan)}
            title="Duplicate plan"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(plan.nutrition_plan_id)}
            title="Delete plan"
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-sm font-bold text-zinc-800 leading-tight">{plan.name}</h3>
      <p className="text-xs text-zinc-500 mt-1 mb-3 leading-relaxed line-clamp-2">
        {plan.description || 'No description.'}
      </p>

      {/* Macro chips */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {[
          { label: 'Cal',  value: `${plan.calories} kcal` },
          { label: 'Pro',  value: `${plan.protein_g}g` },
          { label: 'Carb', value: `${plan.carbs_g}g` },
          { label: 'Fat',  value: `${plan.fats_g}g` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-50 rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</p>
            <p className="text-xs font-bold text-zinc-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Meal count chip */}
      {(plan.meals?.length > 0) && (
        <div className="flex items-center gap-1 mb-2">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span className="text-[11px] text-zinc-400 font-medium">
            {plan.meals.length} meal{plan.meals.length !== 1 ? 's' : ''} scheduled
          </span>
        </div>
      )}

      <p className="text-[11px] text-zinc-400 font-medium mb-2">
        {clientCount} client{clientCount !== 1 ? 's' : ''} assigned
      </p>

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
            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center
                            justify-center text-zinc-500 text-[10px] font-bold ring-2 ring-white">
              +{assignedClients.length - 5}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100">
        <button
          onClick={() => onAssign(plan)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold
                     py-2 px-3 rounded-lg border border-zinc-200 text-zinc-600
                     hover:border-zinc-300 hover:bg-zinc-50 transition"
        >
          <Users className="w-3.5 h-3.5" />
          Assign
        </button>
        <button
          onClick={() => onShare(plan)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold
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
// IconPicker
// ---------------------------------------------------------------------------

function IconPicker({ value, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 mb-1.5">Plan Icon</p>
      <div className="flex items-center gap-2">
        {ICON_OPTIONS.map(({ key, Icon, label }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => onChange(key)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                          ${active
                            ? 'bg-zinc-900 text-brand-500 ring-2 ring-brand-500/40'
                            : 'bg-white border border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50'}`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MealRow — one row in the meal schedule builder
// Layout (L→R): Name dropdown | Time picker | Description input | X button
// ---------------------------------------------------------------------------

function MealRow({ meal, onChange, onRemove }) {
  const inputBase =
    'rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-colors';

  return (
    <div className="flex items-center gap-2">
      {/* Meal type */}
      <select
        value={meal.name}
        onChange={e => onChange({ ...meal, name: e.target.value })}
        className={`${inputBase} flex-shrink-0 w-32`}
      >
        {MEAL_TYPES.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Time */}
      <input
        type="time"
        value={meal.time}
        onChange={e => onChange({ ...meal, time: e.target.value })}
        className={`${inputBase} flex-shrink-0`}
      />

      {/* Description */}
      <input
        type="text"
        value={meal.description ?? ''}
        onChange={e => onChange({ ...meal, description: e.target.value })}
        placeholder="e.g. 3 Eggs, 1 Avocado, 50g Oats"
        className={`${inputBase} flex-1 min-w-0 placeholder:text-zinc-300`}
      />

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NutritionBuilder (inline form)
// ---------------------------------------------------------------------------

function NutritionBuilder({ initialPlan, onSave, onCancel }) {
  const [form, setForm] = useState({
    ...BLANK_PLAN,
    ...initialPlan,
    meals: initialPlan?.meals ?? [],
  });

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addMeal() {
    setForm(prev => ({
      ...prev,
      meals: [
        ...prev.meals,
        { id: `meal-${Date.now()}`, name: MEAL_TYPES[0], time: '', description: '' },
      ],
    }));
  }

  function updateMeal(id, updated) {
    setForm(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.id === id ? updated : m),
    }));
  }

  function removeMeal(id) {
    setForm(prev => ({ ...prev, meals: prev.meals.filter(m => m.id !== id) }));
  }

  const inputCls =
    'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 ' +
    'placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 ' +
    'focus:border-brand-400 transition-colors';

  const labelCls = 'block text-xs font-semibold text-zinc-500 mb-1.5';

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm">

      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-zinc-800">
            {initialPlan?.nutrition_plan_id ? 'Edit Nutrition Plan' : 'New Nutrition Plan'}
          </h2>
          <p className="text-xs text-zinc-400">Set macro targets and schedule meals.</p>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Icon picker */}
        <IconPicker value={form.iconType} onChange={v => updateField('iconType', v)} />

        {/* Name + Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Plan Name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="e.g. Fat Loss Deficit Plan"
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input
              className={inputCls}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Brief description of the plan"
            />
          </div>
        </div>

        {/* Macro fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'calories',  label: 'Daily Calories (kcal)', placeholder: '1800' },
            { key: 'protein_g', label: 'Protein (g)',           placeholder: '160'  },
            { key: 'carbs_g',   label: 'Carbs (g)',             placeholder: '150'  },
            { key: 'fats_g',    label: 'Fats (g)',              placeholder: '55'   },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form[key]}
                onChange={e => updateField(key, e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        {/* Meal schedule */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls + ' mb-0'}>Meal Schedule</label>
            <button
              type="button"
              onClick={addMeal}
              className="inline-flex items-center gap-1 text-xs font-semibold
                         text-brand-600 hover:text-brand-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Meal
            </button>
          </div>

          {form.meals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center">
              <Clock className="w-5 h-5 text-zinc-300 mx-auto mb-1" />
              <p className="text-xs text-zinc-400">
                No meals added yet.{' '}
                <button
                  type="button"
                  onClick={addMeal}
                  className="text-brand-600 hover:underline font-semibold"
                >
                  Add one
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {form.meals.map(meal => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  onChange={updated => updateMeal(meal.id, updated)}
                  onRemove={() => removeMeal(meal.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium text-zinc-600 border border-zinc-200
                       rounded-xl hover:bg-zinc-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-5 py-2 text-sm font-bold text-white bg-brand-500 rounded-xl
                       hover:bg-brand-600 transition shadow-sm"
          >
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NutritionPlans page
// ---------------------------------------------------------------------------

export default function NutritionPlans() {
  const [plans,      setPlans]      = useState(loadNutritionPlans);
  const [clients,    setClients]    = useState(loadClients);
  const [mode,       setMode]       = useState('library'); // 'library' | 'builder'
  const [editTarget, setEditTarget] = useState(null);
  const [assignPlan, setAssignPlan] = useState(null);
  const [sharePlan,  setSharePlan]  = useState(null);

  function save(next) {
    setPlans(next);
    persistNutritionPlans(next);
  }

  function handleBuilderSave(formData) {
    if (editTarget) {
      save(plans.map(p =>
        p.nutrition_plan_id === editTarget.nutrition_plan_id ? { ...p, ...formData } : p
      ));
    } else {
      const newPlan = {
        ...formData,
        nutrition_plan_id: `nplan-local-${Date.now()}`,
        trainer_id:        'trainer-0001',
        assigned_to:       [],
        created_at:        new Date().toISOString(),
      };
      save([...plans, newPlan]);
    }
    setMode('library');
    setEditTarget(null);
  }

  function handleDuplicate(plan) {
    const dup = {
      ...plan,
      nutrition_plan_id: `nplan-local-${Date.now()}`,
      name:              `${plan.name} (Copy)`,
      assigned_to:       [],
      created_at:        new Date().toISOString(),
    };
    save([...plans, dup]);
  }

  function handleDelete(planId) {
    let isAssigned = false;
    try {
      const raw        = localStorage.getItem(LS_CLIENTS_KEY);
      const allClients = raw ? JSON.parse(raw) : dummyClients;
      if (Array.isArray(allClients)) {
        isAssigned = allClients.some(c => c.assigned_nutrition_id === planId);
      }
    } catch {
      isAssigned = clients.some(c => c.assigned_nutrition_id === planId);
    }
    if (isAssigned) {
      alert('Cannot delete this plan — it is currently assigned to one or more clients. Remove the assignment first.');
      return;
    }
    save(plans.filter(p => p.nutrition_plan_id !== planId));
  }

  function handleSaveAssignment(nutrition_plan_id, clientIds) {
    const nextPlans = plans.map(p => {
      if (p.nutrition_plan_id === nutrition_plan_id) {
        return { ...p, assigned_to: clientIds };
      }
      return { ...p, assigned_to: p.assigned_to.filter(id => !clientIds.includes(id)) };
    });
    save(nextPlans);

    const nextClients = clients.map(c => ({
      ...c,
      assigned_nutrition_id: clientIds.includes(c.client_id)
        ? nutrition_plan_id
        : (c.assigned_nutrition_id === nutrition_plan_id ? null : c.assigned_nutrition_id),
    }));
    setClients(nextClients);
    try { localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(nextClients)); } catch {}

    setAssignPlan(null);
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-4">

      {mode === 'builder' ? (
        <NutritionBuilder
          initialPlan={editTarget}
          onSave={handleBuilderSave}
          onCancel={() => { setMode('library'); setEditTarget(null); }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Nutrition Plans</h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Build and assign macro-based plans to your clients.
              </p>
            </div>
            <button
              onClick={() => { setEditTarget(null); setMode('builder'); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white
                         text-sm font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                <Apple className="w-6 h-6 text-brand-500" />
              </div>
              <p className="text-sm font-semibold text-zinc-800">No nutrition plans yet</p>
              <p className="text-xs text-zinc-400 mt-1">Create your first plan to get started.</p>
              <button
                onClick={() => { setEditTarget(null); setMode('builder'); }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white
                           text-sm font-bold rounded-xl hover:bg-brand-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {plans.map(plan => (
                <NutritionPlanCard
                  key={plan.nutrition_plan_id}
                  plan={plan}
                  allClients={clients}
                  onEdit={p => { setEditTarget(p); setMode('builder'); }}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onAssign={setAssignPlan}
                  onShare={setSharePlan}
                />
              ))}
            </div>
          )}
        </>
      )}

      {assignPlan && (
        <AssignModal
          plan={assignPlan}
          allClients={clients}
          onClose={() => setAssignPlan(null)}
          onSave={handleSaveAssignment}
        />
      )}
      {sharePlan && (
        <ShareModal
          plan={sharePlan}
          allClients={clients}
          onClose={() => setSharePlan(null)}
        />
      )}
    </div>
  );
}
