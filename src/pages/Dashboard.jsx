/**
 * RPM.ENERGY — Dashboard (Command Center)
 * Source of truth: spec Flow B + Section 3.1
 *
 * Sections rendered (all Must Have per spec):
 *  1. Dummy Data Banner      — persistent sample-data notice
 *  2. Today Strip            — scrollable row of today's sessions
 *  3. Stat Cards (×4)        — Active Clients, Avg Meals, Avg Check-ins, Star Client
 *  4. Engagement Bar Chart   — per-client logging frequency, 4-week view
 *  5. Weight Trend Graph     — multi-line weight over time, toggleable clients
 *  6. Classification Panel   — clients grouped by tier + WhatsApp nudge + override
 */

import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import {
  Users, UtensilsCrossed, Activity, Star, MessageCircle,
  Video, MapPin, Trophy, CheckCircle,
  AlertTriangle, XCircle,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

import NotificationBell from '../components/NotificationBell.jsx';
import { dummyClients, dummySessions }                 from '../data/dummyData.js';
import { getThisWeekStats, getEngagementChartData,
         getWeightTrendData, getClassificationGroups } from '../data/dashboardStats.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TODAY = '2026-02-24';

const LS_CLIENTS_KEY = 'progrx_clients';

// Categorical palette — distinct colors for readable data visualization
const CLIENT_COLOURS = {
  'client-0001': '#6366f1', // Priya  — indigo
  'client-0002': '#10b981', // Rahul  — emerald
  'client-0003': '#f59e0b', // Sneha  — amber
  'client-0004': '#0ea5e9', // Arjun  — sky
  'client-0005': '#8b5cf6', // Kavya  — violet
  'client-0006': '#f43f5e', // Rohan  — rose
};

// Tier visual config — uses translation keys for all user-visible strings
const TIER_CONFIG = {
  serious: {
    icon:          Trophy,
    labelKey:      'dashboard.tiers.serious.label',
    countLabelKey: 'dashboard.tiers.serious.countLabel',
    suggestionKey: 'dashboard.tiers.serious.suggestion',
    badgeCls:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    headerCls:   'text-emerald-700',
    borderCls:   'border-emerald-200',
    rowHoverCls: 'hover:bg-zinc-50',
  },
  active: {
    icon:          CheckCircle,
    labelKey:      'dashboard.tiers.active.label',
    countLabelKey: 'dashboard.tiers.active.countLabel',
    suggestionKey: 'dashboard.tiers.active.suggestion',
    badgeCls:    'bg-blue-50 text-blue-700 border border-blue-200',
    headerCls:   'text-blue-700',
    borderCls:   'border-blue-200',
    rowHoverCls: 'hover:bg-zinc-50',
  },
  casual: {
    icon:          AlertTriangle,
    labelKey:      'dashboard.tiers.casual.label',
    countLabelKey: 'dashboard.tiers.casual.countLabel',
    suggestionKey: 'dashboard.tiers.casual.suggestion',
    badgeCls:    'bg-amber-50 text-amber-700 border border-amber-200',
    headerCls:   'text-amber-700',
    borderCls:   'border-amber-200',
    rowHoverCls: 'hover:bg-zinc-50',
  },
  inactive: {
    icon:          XCircle,
    labelKey:      'dashboard.tiers.inactive.label',
    countLabelKey: 'dashboard.tiers.inactive.countLabel',
    suggestionKey: 'dashboard.tiers.inactive.suggestion',
    badgeCls:    'bg-rose-50 text-rose-700 border border-rose-200',
    headerCls:   'text-rose-700',
    borderCls:   'border-rose-200',
    rowHoverCls: 'hover:bg-zinc-50',
  },
};

const ALL_TIERS = ['serious', 'active', 'casual', 'inactive'];

// ---------------------------------------------------------------------------
// Micro-helpers
// ---------------------------------------------------------------------------

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function firstName(name = '') {
  return name.split(' ')[0];
}
function whatsAppLink(phone, name) {
  const text = encodeURIComponent(
    `Hey ${firstName(name)}! Just checking in on your progress this week 💪`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

// ---------------------------------------------------------------------------
// 2. Today Strip (Flow E4 / Section 3.1 — Must Have)
// ---------------------------------------------------------------------------

function SessionCard({ session, client }) {
  const { t } = useTranslation();
  const isOnline = session.session_type === 'online';

  return (
    <Link
      to={`/clients/${client?.client_id}`}
      className="flex-shrink-0 bg-white rounded-xl border border-slate-200 px-4 py-3.5 min-w-[200px]
                 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all cursor-pointer
                 block no-underline"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold text-slate-500 tracking-wide">{session.time}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
          ${isOnline ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {isOnline
            ? <><Video className="w-2.5 h-2.5" />{t('dashboard.online')}</>
            : <><MapPin className="w-2.5 h-2.5" />{t('dashboard.inPerson')}</>}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-bold">
          {initials(client?.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{client?.name ?? 'Unknown'}</p>
          <p className="text-[11px] text-slate-400 truncate">{client?.goal ?? ''}</p>
        </div>
      </div>
    </Link>
  );
}

function TodayStrip({ sessions, clients }) {
  const { t } = useTranslation();
  const clientMap  = Object.fromEntries(clients.map(c => [c.client_id, c]));
  const todaySorted = [...sessions]
    .filter(s => s.date === TODAY)
    .sort((a, b) => a.time.localeCompare(b.time));

  const dateLabel = new Date(TODAY + 'T12:00:00Z').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          {t('dashboard.todaysSessions')}
        </h2>
        <div className="flex items-center gap-2">
          <NotificationBell placement="mobile" />
          <span className="text-xs text-slate-400 font-medium">{dateLabel}</span>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {todaySorted.length === 0 ? (
          <div className="flex items-center gap-2 bg-white rounded-xl border border-dashed
                          border-slate-200 px-4 py-3 text-slate-400 text-sm">
            {t('dashboard.noSessions')}
          </div>
        ) : (
          todaySorted.map(s => (
            <SessionCard key={s.session_id} session={s} client={clientMap[s.client_id]} />
          ))
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. Stat Cards (Flow B1 / Section 3.1)
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, iconBg, iconCls, label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className={`inline-flex p-2 rounded-lg flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconCls}`} />
        </div>
        <p className="text-sm font-medium text-slate-500 leading-tight">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function StarClientCard({ starClient }) {
  const { t } = useTranslation();
  if (!starClient) return null;
  const { client, score } = starClient;
  const canvasRef = useRef(null);
  const [hasPopped, setHasPopped] = useState(false);

  function handleClick() {
    if (hasPopped || !canvasRef.current) return;
    const myConfetti = confetti.create(canvasRef.current, { resize: true, useWorker: true });
    myConfetti({ particleCount: 40, spread: 60, origin: { x: 0.5, y: 0.6 } });
    setHasPopped(true);
  }

  return (
    <Link
      to={`/clients/${client.client_id}`}
      onClick={handleClick}
      className="relative overflow-hidden bg-white rounded-xl border border-zinc-200 p-5
                 hover:shadow-md hover:border-brand-400 hover:bg-brand-50
                 cursor-pointer transition-all block no-underline"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
      />
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                        bg-zinc-100 text-zinc-800 border border-zinc-200 text-xs font-bold">
          {initials(client.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate leading-tight">{client.name}</p>
          <p className="text-xs text-slate-400 truncate">{client.goal}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Star className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" />
        <p className="text-sm font-medium text-slate-500">{t('dashboard.starClient')}</p>
      </div>
      <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.engagementScore')}: {score}</p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// 4. Engagement Bar Chart (Flow B2 / Section 3.1)
// ---------------------------------------------------------------------------

function EngagementTooltip({ active, payload, label }) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-semibold text-slate-500 mb-2">{t('dashboard.weekOf')} {label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.fill }} />
            <span className="text-slate-600">
              {firstName(dummyClients.find(c => c.client_id === entry.dataKey)?.name ?? entry.name)}
            </span>
          </div>
          <span className="font-semibold text-slate-800">{entry.value} {t('dashboard.logs')}</span>
        </div>
      ))}
    </div>
  );
}

function EngagementBarChart({ data }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(
    () => new Set(dummyClients.slice(1).map(c => c.client_id))
  );

  function toggle(clientId) {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.clientEngagement')}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.logEntriesHint')}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {dummyClients.map(c => {
          const isHidden = hidden.has(c.client_id);
          return (
            <button
              key={c.client_id}
              onClick={() => toggle(c.client_id)}
              style={!isHidden ? { backgroundColor: CLIENT_COLOURS[c.client_id] } : {}}
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all
                          ${isHidden
                ? 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                : 'text-white'}`}
            >
              {firstName(c.name)}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<EngagementTooltip />} cursor={{ fill: '#f8fafc' }} />
          {dummyClients.filter(c => !hidden.has(c.client_id)).map(c => (
            <Bar
              key={c.client_id}
              dataKey={c.client_id}
              name={c.client_id}
              fill={CLIENT_COLOURS[c.client_id]}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Weight Trend Graph (Flow B3 / Section 3.1)
// ---------------------------------------------------------------------------

function WeightTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter(e => e.value !== undefined && e.value !== null);
  if (!visible.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg min-w-[160px]">
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      {visible.map(entry => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-slate-600">{entry.name}</span>
          </div>
          <span className="font-semibold text-slate-800">{entry.value} kg</span>
        </div>
      ))}
    </div>
  );
}

function WeightTrendChart({ data }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(
    () => new Set(dummyClients.slice(1).map(c => c.client_id))
  );

  function toggle(clientId) {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.weightTrends')}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.weightTrendHint')}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {dummyClients.map(c => {
          const isHidden = hidden.has(c.client_id);
          return (
            <button
              key={c.client_id}
              onClick={() => toggle(c.client_id)}
              style={!isHidden ? { backgroundColor: CLIENT_COLOURS[c.client_id] } : {}}
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all
                          ${isHidden
                ? 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                : 'text-white'}`}
            >
              {firstName(c.name)}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval={1}
            tickMargin={10}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={v => `${v}kg`}
            domain={['auto', 'auto']}
            tickMargin={10}
          />
          <Tooltip content={<WeightTooltip />} />
          {dummyClients.map(c => (
            <Line
              key={c.client_id}
              type="monotone"
              dataKey={c.client_id}
              name={firstName(c.name)}
              stroke={CLIENT_COLOURS[c.client_id]}
              strokeWidth={2}
              dot={{ r: 3, fill: CLIENT_COLOURS[c.client_id], strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
              hide={hidden.has(c.client_id)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Classification Panel (Flow B4 / Section 3.1)
// ---------------------------------------------------------------------------

function ClientRow({ client, tierKey }) {
  const { t } = useTranslation();
  const cfg = TIER_CONFIG[tierKey];

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', client.client_id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-grab
                  active:cursor-grabbing ${cfg.rowHoverCls}`}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] font-bold">
        {initials(client.name)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{client.name}</p>
        <p className="text-xs text-slate-400 truncate leading-tight">{client.goal}</p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {client.classification_override && (
          <span className="text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200
                           px-1.5 py-0.5 rounded">
            MO
          </span>
        )}
        <span className="w-6 text-right inline-block text-[11px] font-bold text-slate-400 tabular-nums">
          {client.score}
        </span>
      </div>

      <a
        href={whatsAppLink(client.phone, client.name)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-medium
                   text-slate-500 hover:text-green-600 bg-slate-50 hover:bg-green-50
                   border border-slate-200 hover:border-green-300 rounded-lg px-2.5 py-1
                   transition-all"
      >
        <MessageCircle className="w-3 h-3" />
        {t('dashboard.nudge')}
      </a>
    </div>
  );
}

function TierSection({ tierKey, clients, onDrop }) {
  const { t } = useTranslation();
  const cfg      = TIER_CONFIG[tierKey];
  const Icon     = cfg.icon;
  const label      = t(cfg.labelKey);
  const countLabel = t(cfg.countLabelKey);
  const suggestion = t(cfg.suggestionKey);
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }
  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const clientId = e.dataTransfer.getData('text/plain');
    if (clientId) onDrop(clientId, tierKey);
  }

  if (!clients.length && !dragOver) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl border transition-all duration-150
                  ${dragOver
                    ? `${cfg.borderCls} ring-2 ring-brand-400 bg-brand-50/30`
                    : cfg.borderCls}`}
    >
      <div className={`flex items-center justify-between px-4 py-3 bg-white rounded-t-xl border-b ${cfg.borderCls}`}>
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${cfg.headerCls}`} />
          <span className={`text-sm font-bold ${cfg.headerCls}`}>{label}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>
            {clients.length}
          </span>
          <span className="text-xs text-slate-400 hidden sm:block">{countLabel}</span>
        </div>
        <p className="text-xs text-slate-400 italic hidden lg:block">{suggestion}</p>
      </div>

      <div className="bg-white divide-y divide-slate-50 rounded-b-xl">
        {clients.length === 0 && dragOver ? (
          <div className="px-4 py-4 text-xs text-center text-brand-400 font-medium">
            {t('dashboard.dropHere', { tier: label })}
          </div>
        ) : (
          clients.map(c => (
            <ClientRow key={c.client_id} client={c} tierKey={tierKey} />
          ))
        )}
      </div>
    </div>
  );
}

function ClassificationPanel({ initialGroups }) {
  const { t } = useTranslation();
  const [overrides, setOverrides] = useState({});

  function handleDrop(clientId, newTier) {
    setOverrides(prev => ({ ...prev, [clientId]: newTier }));
    try {
      const raw = localStorage.getItem(LS_CLIENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.map(c =>
            c.client_id === clientId ? { ...c, classification: newTier } : c
          );
          localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(updated));
        }
      }
    } catch {}
  }

  const groups = useMemo(() => {
    const allClients = ALL_TIERS.flatMap(t => initialGroups[t] ?? []);
    const result     = { serious: [], active: [], casual: [], inactive: [] };
    allClients.forEach(c => {
      const effectiveTier = overrides[c.client_id] ?? c.classification;
      result[effectiveTier]?.push({
        ...c,
        classification_override: !!overrides[c.client_id],
      });
    });
    return result;
  }, [overrides, initialGroups]);

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{t('dashboard.clientClassifications')}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.classificationHint')}</p>
      </div>
      <div className="space-y-3">
        {ALL_TIERS.map(tier => (
          <TierSection
            key={tier}
            tierKey={tier}
            clients={groups[tier]}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Root export — Dashboard page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { t } = useTranslation();
  const stats          = useMemo(() => getThisWeekStats(),        []);
  const engagementData = useMemo(() => getEngagementChartData(),  []);
  const weightData     = useMemo(() => getWeightTrendData(),      []);
  const initialGroups  = useMemo(() => getClassificationGroups(), []);

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">

        {/* Today Strip */}
        <TodayStrip sessions={dummySessions} clients={dummyClients} />

        {/* Weekly Snapshot Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            iconBg="bg-slate-100"
            iconCls="text-slate-600"
            label={t('dashboard.totalClients')}
            value={stats.totalClients}
            sub={t('dashboard.onYourRoster')}
          />
          <StatCard
            icon={UtensilsCrossed}
            iconBg="bg-emerald-50"
            iconCls="text-emerald-600"
            label={t('dashboard.avgMealsLogged')}
            value={stats.avgMeals}
            sub={t('dashboard.perClientThisWeek')}
          />
          <StatCard
            icon={Activity}
            iconBg="bg-blue-50"
            iconCls="text-blue-500"
            label={t('dashboard.avgCheckIns')}
            value={stats.avgCheckIns}
            sub={t('dashboard.workoutSessionsThisWeek')}
          />
          <StarClientCard starClient={stats.starClient} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EngagementBarChart data={engagementData} />
          <WeightTrendChart   data={weightData} />
        </div>

        {/* Classification Panel */}
        <ClassificationPanel initialGroups={initialGroups} />

        <div className="h-4" />
      </div>
    </div>
  );
}
