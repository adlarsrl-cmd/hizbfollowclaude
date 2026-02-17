import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  BarChart3, 
  Settings, 
  CreditCard as Edit3, 
  WifiOff, 
  Moon, 
  Sun, 
  Monitor, 
  ChevronDown, 
  LogOut,
  Menu,
  X,
  BookOpen,
  Book,
  User,
  Bell,
  Search
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import GroupSelector from './GroupSelector';
import EmailVerificationBanner from './EmailVerificationBanner';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    theme,
    setTheme,
    isOnline,
    syncQueue,
    user,
    signOut,
    enableGroups,
    activeGroupId,
    currentUserRole,
    userProfile
  } = useAppStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
      case 'dark': return Moon;
      case 'auto': return Monitor;
    }
  };
  const ThemeIcon = getThemeIcon();

  // Navigation Items
  const navItems = [
    { 
      name: 'Tableau de bord', 
      href: '/', 
      icon: Home, 
      allowedRoles: ['owner', 'manager', 'member', 'viewer'] 
    },
    { 
      name: 'Participants', 
      href: '/participants', 
      icon: Users, 
      allowedRoles: ['owner', 'manager'] 
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: BarChart3, 
      allowedRoles: ['owner', 'manager', 'member', 'viewer'] 
    },
    {
      name: 'Saisie Hebdo',
      href: '/entry',
      icon: Edit3,
      allowedRoles: ['owner', 'manager']
    },
    {
      name: 'Saisie Mensuelle',
      href: '/monthly',
      icon: BookOpen,
      allowedRoles: ['owner', 'manager', 'member', 'viewer']
    },
    {
      name: 'Ma Saisie',
      href: '/me/entry',
      icon: Edit3,
      allowedRoles: ['member', 'viewer'],
      hidden: currentUserRole === 'owner' || currentUserRole === 'manager'
    },
    {
      name: 'Coran',
      href: '/quran',
      icon: Book,
      allowedRoles: ['owner', 'manager', 'member', 'viewer']
    }
  ];

  const filteredNavItems = navItems.filter(item => 
    (!item.hidden) && 
    (!currentUserRole || item.allowedRoles.includes(currentUserRole))
  );

  if (enableGroups && !activeGroupId && location.pathname !== '/groups') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Sélectionnez un groupe
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Pour commencer à utiliser l'application, veuillez sélectionner ou rejoindre un groupe de lecture.
          </p>
          <Link
            to="/groups"
            className="block w-full py-3 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium shadow-lg shadow-emerald-500/20"
          >
            Voir mes groupes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex">
      
      {/* Desktop Sidebar */}
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

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="mb-6 px-4">
            <GroupSelector />
          </div>

          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
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
                  <item.icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {enableGroups && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50">
              <div className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Gestion
              </div>
              <Link
                to="/groups"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  location.pathname === '/groups'
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-5 h-5" />
                Mes Groupes
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user?.email?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {userProfile?.display_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUserRole === 'owner' ? 'Propriétaire' : 
                   currentUserRole === 'manager' ? 'Gestionnaire' : 'Membre'}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
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

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">
            HizbFollow
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-64 bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col">
            <div className="mt-16 space-y-6 flex-1">
              <GroupSelector />
              
              <nav className="space-y-2">
                {filteredNavItems.map((item) => {
                   const isActive = location.pathname === item.href;
                   return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-medium' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                 <Link
                    to="/settings"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Settings className="w-5 h-5" />
                    Paramètres
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                  >
                    <LogOut className="w-5 h-5" />
                    Déconnexion
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${isMobileMenuOpen ? 'blur-sm lg:blur-0' : ''}`}>
        <div className="h-16 lg:hidden" /> {/* Spacer for mobile header */}
        <div className="p-4 lg:p-8 lg:ml-72 max-w-7xl mx-auto">
          <div className="mb-6 lg:mb-8 animate-fade-in">
            <EmailVerificationBanner />
          </div>
          <Outlet />
        </div>
      </main>

    </div>
  );
}
