/**
 * progrx — Main Application Layout
 * Source of truth: spec Section 7.6 (Navigation Structure)
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  Apple,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';


// ---------------------------------------------------------------------------
// Navigation definition
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { labelKey: 'nav.dashboard',      route: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.clients',        route: '/clients',   icon: Users           },
  { labelKey: 'nav.schedule',       route: '/schedule',  icon: Calendar        },
  { labelKey: 'nav.workoutPlans',   route: '/plans',     icon: Dumbbell        },
  { labelKey: 'nav.nutritionPlans', route: '/nutrition', icon: Apple           },
];

const SETTINGS_ITEM = { labelKey: 'nav.settings', route: '/settings', icon: Settings };

// ---------------------------------------------------------------------------
// Trainer profile helpers
// ---------------------------------------------------------------------------

function loadTrainerProfile() {
  try {
    const raw = localStorage.getItem('progrx_trainer_settings');
    if (raw) {
      const data = JSON.parse(raw);
      return { fullName: data.name ?? 'Vikram Sood', email: data.email ?? 'vikram@progrx.in' };
    }
  } catch { /* ignore */ }
  return { fullName: 'Vikram Sood', email: 'vikram@progrx.in' };
}

function initials(fullName = '') {
  return fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ---------------------------------------------------------------------------
// NavItem
// ---------------------------------------------------------------------------

function NavItem({ item, isCollapsed, onNavClick }) {
  const { t } = useTranslation();
  const { labelKey, route, icon: Icon } = item;
  const label = t(labelKey);

  return (
    <NavLink
      to={route}
      onClick={onNavClick}
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
      {!isCollapsed && <span className="flex-1">{label}</span>}
    </NavLink>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function Layout() {
  const [isCollapsed,      setIsCollapsed]      = useState(false);
  const [trainer,          setTrainer]          = useState(loadTrainerProfile);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    function onTrainerUpdated() { setTrainer(loadTrainerProfile()); }
    window.addEventListener('trainerUpdated', onTrainerUpdated);
    return () => window.removeEventListener('trainerUpdated', onTrainerUpdated);
  }, []);

  function closeMobileMenu() { setIsMobileMenuOpen(false); }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">

      {/* ── Mobile top bar ─────────────────────────────────────────── */}
      <div className="fixed top-0 inset-x-0 z-40 flex md:hidden items-center justify-between
                      px-4 h-14 bg-white border-b border-zinc-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
          </div>
          <span className="text-sm font-bold text-zinc-900 tracking-wide">PROGRX</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100
                       transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Mobile backdrop ────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 flex flex-col
                         bg-zinc-950 border-r border-zinc-900 overflow-hidden
                         md:relative md:z-auto md:translate-x-0
                         transition-all duration-300
                         ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                         ${isCollapsed ? 'w-16' : 'w-60'}`}>

        {/* X close — mobile only */}
        <button
          onClick={closeMobileMenu}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400
                     hover:text-white hover:bg-zinc-800 transition-colors md:hidden"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className={`flex items-center border-b border-zinc-900 py-5 flex-shrink-0
                         ${isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-4'}`}>
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight overflow-hidden">
              <p className="text-sm font-bold text-white tracking-wide">PROGRX</p>
              <p className="text-[10px] text-zinc-500 font-medium">Trainer Console</p>
            </div>
          )}
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.route}
              item={item}
              isCollapsed={isCollapsed}
              onNavClick={closeMobileMenu}
            />
          ))}
        </nav>

        {/* Settings + trainer strip + collapse toggle */}
        <div className="px-2 py-3 border-t border-zinc-900 space-y-0.5">
          <NavItem
            item={SETTINGS_ITEM}
            isCollapsed={isCollapsed}
            onNavClick={closeMobileMenu}
          />

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

          <button
            onClick={() => setIsCollapsed(c => !c)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full hidden md:flex items-center justify-center rounded-lg py-2 mt-1
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

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto transition-all duration-300 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
