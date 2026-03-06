/**
 * progrx — NotificationBell
 *
 * A self-contained bell icon + dropdown component.
 * Renders the dropdown via createPortal so it escapes the overflow-hidden sidebar.
 *
 * Props:
 *   isCollapsed  boolean           — sidebar collapsed state (icon-only mode)
 *   placement    'sidebar'|'mobile' — controls dropdown position
 *   onNavClick   () => void         — called when "View All" is clicked (closes mobile drawer)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ArrowRight, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { dummyNotifications } from '../data/dummyData.js';

// ---------------------------------------------------------------------------
// localStorage helpers (duplicated from Notifications.jsx to keep this self-contained)
// ---------------------------------------------------------------------------

const LS_KEY = 'progrx_notifications';

function loadNotifications() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [...dummyNotifications];
}

function saveNotifications(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
  window.dispatchEvent(new Event('notificationsUpdated'));
}

function timeAgo(isoStr) {
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'just now';
}

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

export default function NotificationBell({ isCollapsed = false, placement = 'sidebar', onNavClick }) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(loadNotifications);
  const [open, setOpen]                   = useState(false);
  const [dropPos, setDropPos]             = useState({ top: 0, left: 0 });

  const buttonRef   = useRef(null);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const recent      = notifications.slice(0, 5);

  // Sync from other tabs / Notifications page
  useEffect(() => {
    function onUpdate() { setNotifications(loadNotifications()); }
    window.addEventListener('notificationsUpdated', onUpdate);
    return () => window.removeEventListener('notificationsUpdated', onUpdate);
  }, []);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current   && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Recompute position on scroll / resize while open
  const computePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    if (placement === 'mobile') {
      setDropPos({
        top:   rect.bottom + 6,
        right: window.innerWidth - rect.right,
        left:  'auto',
      });
    } else {
      setDropPos({
        top:  Math.max(8, rect.top),
        left: rect.right + 8,
      });
    }
  }, [placement]);

  useEffect(() => {
    if (!open) return;
    computePos();
    window.addEventListener('scroll', computePos, true);
    window.addEventListener('resize', computePos);
    return () => {
      window.removeEventListener('scroll', computePos, true);
      window.removeEventListener('resize', computePos);
    };
  }, [open, computePos]);

  function toggle() {
    if (!open) computePos();
    setOpen(o => !o);
  }

  function markRead(id) {
    const next = notifications.map(n =>
      n.notification_id === id ? { ...n, read: true } : n,
    );
    setNotifications(next);
    saveNotifications(next);
  }

  function markUnread(id) {
    const next = notifications.map(n =>
      n.notification_id === id ? { ...n, read: false } : n,
    );
    setNotifications(next);
    saveNotifications(next);
  }

  function markAllRead() {
    const next = notifications.map(n => ({ ...n, read: true }));
    setNotifications(next);
    saveNotifications(next);
  }

  // ---------------------------------------------------------------------------
  // Bell button
  // ---------------------------------------------------------------------------

  const buttonClasses = placement === 'mobile'
    ? 'relative p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors'
    : [
        'relative flex items-center rounded-lg text-sm font-medium transition-colors duration-150 py-2.5 w-full',
        isCollapsed ? 'justify-center px-1' : 'gap-3 px-3',
        open
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
      ].join(' ');

  const bell = (
    <button
      ref={buttonRef}
      onClick={toggle}
      className={buttonClasses}
      aria-label={t('nav.notifications')}
      title={isCollapsed ? t('nav.notifications') : undefined}
    >
      <Bell className="w-5 h-5 flex-shrink-0" />

      {/* label — sidebar expanded only */}
      {placement === 'sidebar' && !isCollapsed && (
        <span className="flex-1 text-left">{t('nav.notifications')}</span>
      )}

      {/* Badge */}
      {unreadCount > 0 && placement === 'sidebar' && !isCollapsed && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px]
                         rounded-full px-1 bg-rose-500 text-white text-[9px] font-bold leading-none">
          {unreadCount}
        </span>
      )}
      {unreadCount > 0 && (placement === 'mobile' || isCollapsed) && (
        <span className={`${placement === 'mobile'
          ? 'absolute top-1.5 right-1.5'
          : 'absolute top-1.5 right-1.5'
        } w-2 h-2 rounded-full bg-rose-500`} />
      )}
    </button>
  );

  // ---------------------------------------------------------------------------
  // Dropdown (via portal)
  // ---------------------------------------------------------------------------

  const dropdown = open && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top:   dropPos.top,
        left:  dropPos.left  ?? 'auto',
        right: dropPos.right ?? 'auto',
        zIndex: 9999,
        width: 320,
      }}
      className="bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-900/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <p className="text-sm font-bold text-zinc-800">
          {t('notifications.title')}
          {unreadCount > 0 && (
            <span className="ml-2 text-[10px] font-semibold text-rose-500">
              {t('notifications.unread', { count: unreadCount })}
            </span>
          )}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1 text-[11px] font-semibold
                       text-zinc-400 hover:text-brand-600 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {/* Notification rows */}
      <div className="divide-y divide-zinc-50 max-h-72 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            {t('notifications.emptyAll')}
          </div>
        ) : (
          recent.map(n => (
            <div
              key={n.notification_id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors
                          ${n.read ? 'bg-white' : 'bg-rose-50/40'}`}
            >
              {/* Unread dot */}
              <div className="mt-1 flex-shrink-0 w-2">
                {!n.read && <span className="block w-2 h-2 rounded-full bg-rose-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800 leading-snug truncate">
                  {n.title}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {n.message}
                </p>
                <p className="text-[10px] text-zinc-300 mt-1">{timeAgo(n.timestamp)}</p>
              </div>

              {/* Toggle read/unread */}
              <button
                onClick={() => n.read ? markUnread(n.notification_id) : markRead(n.notification_id)}
                title={n.read ? 'Mark unread' : t('notifications.markRead')}
                className="flex-shrink-0 mt-1 p-1 rounded-md text-zinc-300
                           hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                {n.read
                  ? <Circle className="w-3.5 h-3.5" />
                  : <CheckCheck className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-100 px-4 py-3">
        <Link
          to="/notifications"
          onClick={() => { setOpen(false); onNavClick?.(); }}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold
                     text-brand-600 hover:text-brand-700 transition-colors"
        >
          {t('notifications.viewAll')}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      {bell}
      {dropdown}
    </>
  );
}
