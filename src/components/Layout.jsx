/**
 * RPM.ENERGY — Main Application Layout
 * Source of truth: spec Section 7.6 (Navigation Structure)
 *
 * Navigation items:
 *   Dashboard     /dashboard   Active
 *   My Clients    /clients     Active
 *   Schedule      /schedule    Active
 *   Workout Plans /plans       Active
 *   Payments      /payments    Locked — Coming Soon badge
 *   Settings      /settings    Active
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  Apple,
  CreditCard,
  Settings,
  Lock,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Navigation definition — mirrors Section 7.6 exactly
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { label: 'Dashboard',     route: '/dashboard', icon: LayoutDashboard, locked: false },
  { label: 'My Clients',    route: '/clients',   icon: Users,           locked: false },
  { label: 'Schedule',      route: '/schedule',  icon: Calendar,        locked: false },
  { label: 'Workout Plans',   route: '/plans',     icon: Dumbbell, locked: false },
  { label: 'Nutrition Plans', route: '/nutrition', icon: Apple,    locked: false },
  { label: 'Payments',        route: '/payments',  icon: CreditCard, locked: true  },
];

const SETTINGS_ITEM = { label: 'Settings', route: '/settings', icon: Settings, locked: false };

// ---------------------------------------------------------------------------
// Trainer profile helpers
// ---------------------------------------------------------------------------

function loadTrainerProfile() {
  try {
    const raw = localStorage.getItem('rpm_trainer_settings');
    if (raw) {
      const data = JSON.parse(raw);
      return { fullName: data.name ?? 'Vikram Sood', email: data.email ?? 'vikram@rpm.energy' };
    }
  } catch { /* ignore */ }
  return { fullName: 'Vikram Sood', email: 'vikram@rpm.energy' };
}

function initials(fullName = '') {
  return fullName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// NavItem — renders differently when sidebar is collapsed (icon-only)
// ---------------------------------------------------------------------------

function NavItem({ item, isCollapsed }) {
  const { label, route, icon: Icon, locked } = item;

  if (locked) {
    return (
      <div
        title={isCollapsed ? label : undefined}
        className={`flex items-center rounded-lg text-zinc-600 cursor-not-allowed select-none py-2.5
                    ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-3'}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm font-medium">{label}</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
                             font-semibold bg-zinc-800 text-zinc-500 leading-tight">
              <Lock className="w-2.5 h-2.5" />
              Soon
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={route}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center rounded-lg text-sm font-medium transition-colors duration-150 py-2.5',
          isCollapsed ? 'justify-center px-1' : 'gap-3 px-3',
          isActive
            ? 'bg-brand-600 text-white font-semibold shadow-sm'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
        ].join(' ')
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [trainer,     setTrainer]     = useState(loadTrainerProfile);

  useEffect(() => {
    function onTrainerUpdated() { setTrainer(loadTrainerProfile()); }
    window.addEventListener('trainerUpdated', onTrainerUpdated);
    return () => window.removeEventListener('trainerUpdated', onTrainerUpdated);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`flex-shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-900
                         transition-all duration-300 overflow-hidden
                         ${isCollapsed ? 'w-16' : 'w-60'}`}>

        {/* Brand */}
        <div className={`flex items-center border-b border-zinc-900 py-5 flex-shrink-0
                         ${isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-4'}`}>
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight overflow-hidden">
              <p className="text-sm font-bold text-white tracking-wide">RPM.ENERGY</p>
              <p className="text-[10px] text-zinc-500 font-medium">Trainer Console</p>
            </div>
          )}
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.route} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Settings + trainer strip + collapse toggle */}
        <div className="px-2 py-3 border-t border-zinc-900 space-y-0.5">
          <NavItem item={SETTINGS_ITEM} isCollapsed={isCollapsed} />

          {/* Trainer avatar — hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mt-1">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{initials(trainer.fullName)}</span>
              </div>
              <div className="overflow-hidden leading-tight">
                <p className="text-xs font-semibold text-white truncate">{trainer.fullName}</p>
                <p className="text-[10px] text-zinc-500 truncate">{trainer.email}</p>
              </div>
            </div>
          )}

          {/* Collapse toggle — brand-tinted icon, no text label */}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center rounded-lg py-2 mt-1
                       text-brand-500 hover:text-brand-400 hover:bg-zinc-900
                       transition-colors duration-150"
          >
            {isCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft  className="w-4 h-4" />
            }
          </button>
        </div>
      </aside>

      {/* ── Main content — expands smoothly as sidebar shrinks ──────── */}
      <main className="flex-1 overflow-y-auto transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
