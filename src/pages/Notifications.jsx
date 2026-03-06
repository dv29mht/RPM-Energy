/**
 * RPM.ENERGY — Notifications (/notifications)
 *
 * Surfaces incoming client WhatsApp updates: meal photos, weight check-ins,
 * workout logs, and progress notes.
 *
 * Persistence: rpm_notifications in localStorage.
 * Badge sync:  dispatches 'notificationsUpdated' after every read-state change
 *              so Layout.jsx can refresh the sidebar badge count in real time.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell, Camera, Scale, Dumbbell, FileText,
  CheckCheck, MessageCircle, ArrowRight,
} from 'lucide-react';

import { dummyNotifications, dummyClients } from '../data/dummyData.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY         = 'rpm_notifications';
const LS_CLIENTS_KEY = 'rpm_clients';

/** Visual config per notification type (labels resolved via t() at render time) */
const TYPE_CFG = {
  meal_upload: {
    labelKey: 'notifications.typeMealUpload',
    Icon:    Camera,
    iconBg:  'bg-emerald-50',
    iconCls: 'text-emerald-600',
    badge:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  weight_checkin: {
    labelKey: 'notifications.typeWeightCheckin',
    Icon:    Scale,
    iconBg:  'bg-blue-50',
    iconCls: 'text-blue-600',
    badge:   'bg-blue-50 text-blue-700 border border-blue-200',
  },
  workout_log: {
    labelKey: 'notifications.typeWorkoutLog',
    Icon:    Dumbbell,
    iconBg:  'bg-violet-50',
    iconCls: 'text-violet-600',
    badge:   'bg-violet-50 text-violet-700 border border-violet-200',
  },
  progress_note: {
    labelKey: 'notifications.typeProgressNote',
    Icon:    FileText,
    iconBg:  'bg-amber-50',
    iconCls: 'text-amber-600',
    badge:   'bg-amber-50 text-amber-700 border border-amber-200',
  },
};

/**
 * Filter tab definitions — `key` drives logic; `labelKey` drives display.
 * Using stable keys (not translated strings) means filter logic never breaks on language switch.
 */
const FILTERS = [
  { key: 'all',      labelKey: 'notifications.filterAll'      },
  { key: 'unread',   labelKey: 'notifications.filterUnread'   },
  { key: 'whatsapp', labelKey: 'notifications.filterWhatsApp' },
];

/** Templates used by the Simulate button (payloads intentionally stay in English) */
const SIMULATE_POOL = [
  { type: 'meal_upload',    title: 'Meal photo shared',        message: 'sent a post-workout meal photo for calorie logging.' },
  { type: 'weight_checkin', title: 'Weight check-in received', message: 'logged today\'s weigh-in via WhatsApp.' },
  { type: 'workout_log',    title: 'Workout completed',        message: 'confirmed completing today\'s session and hit a new PB.' },
  { type: 'progress_note',  title: 'Progress update',          message: 'shared weekly measurements and a progress note.' },
];

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadNotifications() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [...dummyNotifications];
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(isoStr) {
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'just now';
}

// ---------------------------------------------------------------------------
// NotificationCard
// ---------------------------------------------------------------------------

function NotificationCard({ notif, client, onMarkRead }) {
  const { t } = useTranslation();
  const cfg  = TYPE_CFG[notif.type] ?? TYPE_CFG.progress_note;
  const Icon = cfg.Icon;

  return (
    <div
      className={`relative bg-white rounded-2xl border p-4 transition-all
                  ${notif.read
                    ? 'border-zinc-100'
                    : 'border-brand-200 shadow-sm shadow-brand-100/40'}`}
    >
      {!notif.read && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand-500" />
      )}

      <div className="flex items-start gap-3">

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                         flex-shrink-0 ${cfg.iconBg}`}>
          <Icon className={`w-5 h-5 ${cfg.iconCls}`} />
        </div>

        <div className="flex-1 min-w-0">

          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-bold text-zinc-800 leading-tight">
              {notif.title}
            </span>
            <span className="text-[10px] text-zinc-400 flex-shrink-0">
              {timeAgo(notif.timestamp)}
            </span>
          </div>

          {client && (
            <p className="text-xs font-semibold text-brand-600 mt-0.5 mb-1 leading-tight">
              {client.name}
            </p>
          )}

          <p className="text-xs text-zinc-500 leading-relaxed">{notif.message}</p>

          <div className="flex items-center justify-between mt-3 flex-wrap gap-y-2">

            <div className="flex items-center gap-1.5 flex-wrap">
              {notif.source === 'whatsapp' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold
                                 px-2 py-0.5 rounded-full
                                 bg-green-50 text-green-700 border border-green-200">
                  <MessageCircle className="w-2.5 h-2.5" />
                  WhatsApp
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {t(cfg.labelKey)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!notif.read && (
                <button
                  onClick={() => onMarkRead(notif.notification_id)}
                  className="text-[11px] font-medium text-zinc-400
                             hover:text-brand-500 transition-colors"
                >
                  {t('notifications.markRead')}
                </button>
              )}
              {client && (
                <Link
                  to={`/clients/${client.client_id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold
                             text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {t('notifications.viewProfile')}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(loadNotifications);
  const clients                            = useMemo(loadClients, []);
  const [activeFilter, setActiveFilter]   = useState('all');

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.client_id, c])),
    [clients],
  );

  function persist(next) {
    setNotifications(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new Event('notificationsUpdated'));
  }

  function markRead(id) {
    persist(notifications.map(n =>
      n.notification_id === id ? { ...n, read: true } : n,
    ));
  }

  function markAllRead() {
    persist(notifications.map(n => ({ ...n, read: true })));
  }

  function simulateUpload() {
    const clientList = clients.filter(c => c.client_id);
    if (!clientList.length) return;
    const client = clientList[Math.floor(Math.random() * clientList.length)];
    const tmpl   = SIMULATE_POOL[Math.floor(Math.random() * SIMULATE_POOL.length)];
    const first  = (client.name ?? '').split(' ')[0];
    persist([
      {
        notification_id: `notif-sim-${Date.now()}`,
        client_id:       client.client_id,
        type:            tmpl.type,
        title:           tmpl.title,
        message:         `${first} ${tmpl.message}`,
        timestamp:       new Date().toISOString(),
        read:            false,
        source:          'whatsapp',
        is_dummy:        false,
      },
      ...notifications,
    ]);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = useMemo(() => {
    if (activeFilter === 'unread')   return notifications.filter(n => !n.read);
    if (activeFilter === 'whatsapp') return notifications.filter(n => n.source === 'whatsapp');
    return notifications;
  }, [notifications, activeFilter]);

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{t('notifications.title')}</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {unreadCount > 0
                ? t('notifications.unread', { count: unreadCount })
                : t('notifications.allCaughtUp')}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap justify-end">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 text-xs font-semibold
                           text-zinc-500 hover:text-brand-600 transition-colors py-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('notifications.markAllRead')}
              </button>
            )}
            <button
              onClick={simulateUpload}
              title="Simulate an incoming WhatsApp client update"
              className="inline-flex items-center gap-1.5 text-xs font-semibold
                         bg-green-600 hover:bg-green-700 text-white
                         px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {t('notifications.simulate')}
            </button>
          </div>
        </div>

        {/* ── Filter tabs ─────────────────────────────────────────── */}
        <div className="flex gap-1 mb-5 p-1 bg-white rounded-xl border border-zinc-200 w-fit">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${activeFilter === f.key
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'}`}
            >
              {t(f.labelKey)}
              {f.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center
                                 min-w-[16px] h-4 rounded-full px-1
                                 bg-white/25 text-white text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── List / Empty state ──────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center
                            justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-600">
              {activeFilter === 'unread' ? t('notifications.emptyUnread') : t('notifications.emptyAll')}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {activeFilter === 'unread'
                ? t('notifications.emptyUnreadSub')
                : t('notifications.emptyAllSub')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(n => (
              <NotificationCard
                key={n.notification_id}
                notif={n}
                client={clientMap[n.client_id]}
                onMarkRead={markRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
