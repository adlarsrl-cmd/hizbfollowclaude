import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home,
  Book,
  BarChart3,
  Users,
  User,
  BookOpen,
  ChevronDown,
  LogOut,
  Settings,
  Moon,
  Sun,
  Monitor,
  WifiOff
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import GroupSelector from './GroupSelector';
import EmailVerificationBanner from './EmailVerificationBanner';
import BottomTabBar from './BottomTabBar';

// Desktop sidebar nav items (same 5 as bottom tabs)
const desktopNavItems = [
  { name: 'Accueil',  href: '/',          icon: Home },
  { name: 'Coran',    href: '/quran',     icon: Book },
  { name: 'Stats',    href: '/analytics', icon: BarChart3 },
  { name: 'Groupes',  href: '/groups',    icon: Users },
  { name: 'Profil',   href: '/profil',    icon: User },
];

export default function Layout() {
  const location = useLocation();
  const {
    theme,
    setTheme,
    isOnline,
    user,
    signOut,
    enableGroups,
    activeGroupId,
    userProfile,
    currentUserRole
  } = useAppStore();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme management
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return Sun;
      case 'dark':  return Moon;
      case 'auto':  return Monitor;
    }
  };
  const ThemeIcon = getThemeIcon();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex">

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="hidden lg:flex flex-col w-72 fixed inset-y-0 left-0 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-50">
        {/* Logo */}
        <div className="h-20 flex items-center px-8 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              HizbFollow
            </span>
          </div>
        </div>

        {/* Group selector */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50">
          <GroupSelector />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {desktopNavItems.map((item) => {
            const isActive =
              item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}

          {/* Participants link for owner/manager (desktop only) */}
          {(currentUserRole === 'owner' || currentUserRole === 'manager') && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <p className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Gestion
              </p>
              <Link
                to="/participants"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  location.pathname === '/participants'
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-5 h-5" />
                Participants
              </Link>
            </div>
          )}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {!isOnline && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              Mode hors-ligne
            </div>
          )}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold border-2 border-white dark:border-slate-800 shadow-sm flex-shrink-0">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} className="w-full h-full rounded-full object-cover" alt="avatar" />
                ) : (
                  user?.email?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {userProfile?.display_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUserRole === 'owner'   ? 'Propriétaire' :
                   currentUserRole === 'manager' ? 'Gestionnaire'  : 'Membre'}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showProfileDropdown && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in origin-bottom">
                <div className="p-2 space-y-1">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Thème</span>
                    <button
                      onClick={toggleTheme}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <ThemeIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                  <Link
                    to="/settings"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Paramètres
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-screen lg:ml-72">
        {/* Mobile: safe area top spacer */}
        <div className="lg:hidden" style={{ height: 'env(safe-area-inset-top, 0px)' }} />

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-4 lg:mb-6 animate-fade-in">
            <EmailVerificationBanner />
          </div>
          <Outlet />
        </div>

        {/* Mobile: spacer for bottom tab bar */}
        <div className="lg:hidden" style={{ height: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }} />
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <BottomTabBar />
    </div>
  );
}
