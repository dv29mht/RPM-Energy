/**
 * RPM.ENERGY — Nutrition Plan Library & Builder (/nutrition)
 *
 * Elements:
 *  N1 — Plan Library   : card grid — name, macros, assigned client count, dynamic icon
 *  N2 — Create Plan    : inline builder (name, description, icon picker, macros, guidelines)
 *  N3 — Save Template  : saves to localStorage; card appears in library grid
 *  N4 — Assign         : modal with client checklist; updates assigned_nutrition_id
 *  N5 — Share          : formatted WhatsApp macro summary + copy-to-clipboard
 *
 * Also supports: Edit, Duplicate, Delete (with referential integrity guard).
 *
 * Persistence: rpm_nutrition_plans in localStorage.
 * Assignment:  updates both plan.assigned_to[] and client.assigned_nutrition_id.
 */

import { useState } from 'react';
import {
  Plus, X, Edit2, Copy, Trash2, Users, Share2, Check,
  ArrowLeft, Apple, Beef, Carrot, Flame, Droplet,
} from 'lucide-react';

import { dummyNutritionPlans, dummyClients } from '../data/dummyData.js';

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  { key: 'flame',   Icon: Flame,   label: 'Flame'   },
  { key: 'beef',    Icon: Beef,    label: 'Beef'     },
  { key: 'apple',   Icon: Apple,   label: 'Apple'    },
  { key: 'carrot',  Icon: Carrot,  label: 'Carrot'   },
  { key: 'droplet', Icon: Droplet, label: 'Hydration' },
];

/** Renders the correct icon for a plan's iconType, falling back to Apple. */
function PlanIcon({ iconType, className }) {
  const match = ICON_OPTIONS.find(o => o.key === iconType);
  const Icon  = match ? match.Icon : Apple;
  return <Icon className={className} />;
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
  guidelines:  '',
};

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadNutritionPlans() {
  try {
    const saved = localStorage.getItem(LS_NUTRITION_KEY);
    return saved
      ? JSON.parse(saved)
      : dummyNutritionPlans.map(p => ({ ...p, assigned_to: [...p.assigned_to] }));
  } catch {
    return dummyNutritionPlans.map(p => ({ ...p, assigned_to: [...p.assigned_to] }));
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

function persistNutritionPlans(plans) {
  try { localStorage.setItem(LS_NUTRITION_KEY, JSON.stringify(plans)); } catch {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

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
  if (plan.guidelines?.trim()) {
    lines.push('', `📝 *Guidelines*`, plan.guidelines.trim());
  }
  lines.push('', '— Sent via RPM.ENERGY');
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

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-bold text-zinc-800">Assign to Clients</h2>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[200px]">{plan.name}</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
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

          {/* Actions */}
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
// ShareModal
// ---------------------------------------------------------------------------

function ShareModal({ plan, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = formatNutritionPlanText(plan);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

          <div className="px-6 py-4">
            <pre className="text-xs text-zinc-700 bg-zinc-50 border border-zinc-200
                            rounded-xl p-4 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
              {text}
            </pre>
          </div>

          <div className="flex gap-3 px-6 pb-5">
            <button
              onClick={handleCopy}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition
                          ${copied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-brand-500 text-white hover:bg-brand-600'}`}
            >
              {copied ? '✓ Copied!' : 'Copy Text'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center rounded-lg px-4 py-2 text-sm
                         font-bold bg-[#25D366] text-white hover:opacity-90 transition"
            >
              WhatsApp
            </a>
          </div>
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

      {/* Top row: plan icon + action buttons */}
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

      {/* Plan name + description */}
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

      {/* Assigned client count */}
      <p className="text-[11px] text-zinc-400 font-medium mb-2">
        {clientCount} client{clientCount !== 1 ? 's' : ''} assigned
      </p>

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
            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center
                            justify-center text-zinc-500 text-[10px] font-bold ring-2 ring-white">
              +{assignedClients.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
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
// IconPicker — row of selectable icon buttons for the builder form
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
// NutritionBuilder (inline form)
// ---------------------------------------------------------------------------

function NutritionBuilder({ initialPlan, onSave, onCancel }) {
  const [form, setForm] = useState({ ...BLANK_PLAN, ...initialPlan });

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const inputCls =
    'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 ' +
    'placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 ' +
    'focus:border-brand-400 transition-colors';

  const labelCls = 'block text-xs font-semibold text-zinc-500 mb-1.5';

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm">

      {/* Header */}
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
          <p className="text-xs text-zinc-400">Fill in the macro targets and guidelines.</p>
        </div>
      </div>

      <div className="p-5 space-y-4">

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

        {/* Guidelines textarea */}
        <div>
          <label className={labelCls}>Meal Guidelines</label>
          <textarea
            rows={5}
            className={`${inputCls} resize-none`}
            value={form.guidelines}
            onChange={e => updateField('guidelines', e.target.value)}
            placeholder="e.g. Eat 4–5 meals/day, prioritise protein at every meal, save carbs around training..."
          />
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
  const [editTarget, setEditTarget] = useState(null);      // null = new, plan obj = editing
  const [assignPlan, setAssignPlan] = useState(null);
  const [sharePlan,  setSharePlan]  = useState(null);

  // ── Persist helper ───────────────────────────────────────────────────────

  function save(next) {
    setPlans(next);
    persistNutritionPlans(next);
  }

  // ── Builder handlers ─────────────────────────────────────────────────────

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

  // ── Protected delete (referential integrity) ─────────────────────────────

  function handleDelete(nutrition_plan_id) {
    try {
      const raw     = localStorage.getItem(LS_CLIENTS_KEY);
      const allC    = raw ? JSON.parse(raw) : dummyClients;
      const blocked = allC.some(c => c.assigned_nutrition_id === nutrition_plan_id);
      if (blocked) {
        alert('Cannot delete this plan because it is currently assigned to an active client. Clear their nutrition plan first.');
        return;
      }
    } catch { /* if read fails, proceed */ }
    save(plans.filter(p => p.nutrition_plan_id !== nutrition_plan_id));
  }

  // ── Assign handlers ──────────────────────────────────────────────────────

  function handleSaveAssignment(nutrition_plan_id, clientIds) {
    // Update plans: new plan gets these clients; remove client from other plans
    const nextPlans = plans.map(p => {
      if (p.nutrition_plan_id === nutrition_plan_id) {
        return { ...p, assigned_to: clientIds };
      }
      return { ...p, assigned_to: p.assigned_to.filter(id => !clientIds.includes(id)) };
    });
    save(nextPlans);

    // Update clients' assigned_nutrition_id
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

  // ── Render ───────────────────────────────────────────────────────────────

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
          {/* Page header */}
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

          {/* Empty state */}
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

      {/* Modals */}
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
          onClose={() => setSharePlan(null)}
        />
      )}
    </div>
  );
}
