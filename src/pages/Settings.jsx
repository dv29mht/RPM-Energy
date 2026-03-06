/**
 * RPM.ENERGY — Trainer Settings (/settings)
 * Source of truth: spec Section 7.6 (Navigation Structure)
 *
 * Sections:
 *  1. Trainer Profile  — Full Name, Email, Workspace/Gym Name
 *  2. Coaching Mode    — Online Only | In-Person | Hybrid (selectable cards)
 *  3. Language         — English / Hindi toggle
 *
 * Persistence: progrx_trainer_settings in localStorage.
 * Save button lives in the page header — always visible, no scroll required.
 */

import { useState } from 'react';
import { Check, Wifi, MapPin, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { dummyTrainer } from '../data/dummyData.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY = 'progrx_trainer_settings';

const COACHING_MODES = [
  { value: 'online',    Icon: Wifi    },
  { value: 'in_person', Icon: MapPin  },
  { value: 'hybrid',    Icon: Shuffle },
];

const LANGUAGES = [
  { code: 'en', nativeLabel: 'English' },
  { code: 'hi', nativeLabel: 'हिंदी'   },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultSettings() {
  const rawMode = dummyTrainer.operating_type;
  return {
    name:          dummyTrainer.name,
    email:         dummyTrainer.email,
    gym_name:      dummyTrainer.gym_affiliation,
    coaching_mode: rawMode === 'both' ? 'hybrid' : (rawMode ?? 'hybrid'),
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <h2 className="text-sm font-bold text-zinc-800">{title}</h2>
        {description && (
          <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FormField({ label, id, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-zinc-600 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm text-zinc-800 bg-white border border-zinc-200
                   rounded-xl placeholder-zinc-300
                   focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400
                   transition-colors"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [form,  setForm]  = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  function handleField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(form));
      window.dispatchEvent(new Event('trainerUpdated'));
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleLanguage(code) {
    i18n.changeLanguage(code);
  }

  // i18n.resolvedLanguage reflects what's actually in use after detection
  const activeLang = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-4">

      {/* ── Page header + Save button ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('settings.pageTitle')}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {t('settings.pageSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <Check className="w-4 h-4" />
              {t('settings.savedLabel')}
            </span>
          )}
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white
                       text-sm font-bold rounded-xl hover:bg-brand-600
                       transition-colors shadow-sm"
          >
            {t('settings.saveButton')}
          </button>
        </div>
      </div>

      {/* ── 1. Trainer Profile ───────────────────────────────────────────── */}
      <SectionCard
        title={t('settings.profile.title')}
        description={t('settings.profile.description')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label={t('settings.profile.fullName')}
            id="name"
            value={form.name}
            onChange={v => handleField('name', v)}
            placeholder={t('settings.profile.fullNamePlaceholder')}
          />
          <FormField
            label={t('settings.profile.email')}
            id="email"
            type="email"
            value={form.email}
            onChange={v => handleField('email', v)}
            placeholder={t('settings.profile.emailPlaceholder')}
          />
          <div className="sm:col-span-2">
            <FormField
              label={t('settings.profile.gymName')}
              id="gym_name"
              value={form.gym_name}
              onChange={v => handleField('gym_name', v)}
              placeholder={t('settings.profile.gymNamePlaceholder')}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Default Coaching Mode ─────────────────────────────────────── */}
      <SectionCard
        title={t('settings.coachingMode.title')}
        description={t('settings.coachingMode.description')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COACHING_MODES.map(({ value, Icon }) => {
            const isActive = form.coaching_mode === value;
            return (
              <button
                key={value}
                onClick={() => handleField('coaching_mode', value)}
                className={`text-left px-3 py-3 rounded-xl border-2 transition-all
                            ${isActive
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2
                              ${isActive ? 'bg-brand-500' : 'bg-zinc-100'}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-900' : 'text-zinc-500'}`} />
                </div>
                <p className={`text-sm font-semibold ${isActive ? 'text-brand-700' : 'text-zinc-800'}`}>
                  {t(`settings.coachingMode.${value}.label`)}
                </p>
                <p className={`text-xs mt-0.5 leading-snug ${isActive ? 'text-brand-600' : 'text-zinc-400'}`}>
                  {t(`settings.coachingMode.${value}.description`)}
                </p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* ── 3. Language ──────────────────────────────────────────────────── */}
      <SectionCard
        title={t('settings.language.title')}
        description={t('settings.language.description')}
      >
        <div className="flex gap-3">
          {LANGUAGES.map(({ code, nativeLabel }) => {
            const isActive = activeLang === code;
            return (
              <button
                key={code}
                onClick={() => handleLanguage(code)}
                className={`px-6 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                            ${isActive
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'}`}
              >
                {nativeLabel}
              </button>
            );
          })}
        </div>
      </SectionCard>

    </div>
  );
}
