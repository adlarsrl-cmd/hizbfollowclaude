import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, BarChart3, Settings, CreditCard as Edit3, WifiOff, Moon, Sun, Monitor, ChevronDown, LogOut } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import GroupSelector from './GroupSelector';
import EmailVerificationBanner from './EmailVerificationBanner';

export default function Layout() {
  const location = useLocation();
  const {
    theme,
    setTheme,
    isOnline,
    syncQueue,
    user,
    signOut,
    enableGroups,
    activeGroupId
  } = useAppStore();

  const [showEntriesDropdown, setShowEntriesDropdown] = React.useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter navigation based on role (removed Settings from nav - now in profile dropdown)
  const baseNavigation = [
    { name: 'Tableau de bord', href: '/', icon: Home, allowedRoles: ['owner', 'manager', 'member', 'viewer'] },
    { name: 'Participants', href: '/participants', icon: Users, allowedRoles: ['owner', 'manager'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, allowedRoles: ['owner', 'manager', 'member', 'viewer'] },
  ];

  const { currentUserRole } = useAppStore();

  const navigation = baseNavigation.filter(item => 
    !currentUserRole || item.allowedRoles.includes(currentUserRole)
  );

  const entriesNavigation = [
    // Viewers et Membres: seulement saisie mensuelle (lecture seule pour viewers)
    // Owner/Manager: saisie hebdo et mensuelle
    ...(currentUserRole === 'member' || currentUserRole === 'viewer' ? [
      { name: 'Saisie mensuelle', href: '/monthly' },
    ] : [
      { name: 'Saisie hebdo', href: '/entry' },
      { name: 'Saisie mensuelle', href: '/monthly' },
    ]),
  ];

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return Sun;
      case 'dark': return Moon;
      case 'auto': return Monitor;
    }
  };

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      // Light mode: remove dark class
      root.classList.remove('dark');
    }
  }, [theme]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEntriesDropdown(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ThemeIcon = getThemeIcon();

  const isEntriesActive = location.pathname === '/entry' || location.pathname === '/monthly' || location.pathname === '/me/entry';
  const isGroupsActive = location.pathname === '/groups' || location.pathname === '/group-settings' || location.pathname === '/join';

  // Redirect to groups if no active group
  if (enableGroups && !activeGroupId && location.pathname !== '/groups') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Sélectionnez un groupe
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Vous devez sélectionner un groupe pour continuer
          </p>
          <Link
            to="/groups"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Voir mes groupes
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Email Verification Banner */}
      <EmailVerificationBanner />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  HizbFollow
                </h1>
              </div>
            </div>

            {/* Group Selector */}
            <div className="flex items-center">
              <GroupSelector />
            </div>

            {/* Status indicators */}
            <div className="flex items-center space-x-4">
              {!isOnline && (
                <div className="flex items-center text-amber-600 dark:text-amber-400">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-sm">Hors ligne</span>
                </div>
              )}
              
              {syncQueue.length > 0 && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse mr-2" />
                  <span className="text-sm">{syncQueue.length} en attente</span>
                </div>
              )}

              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title={`Mode: ${theme === 'light' ? 'Clair' : theme === 'dark' ? 'Sombre' : 'Auto'}`}
              >
                <ThemeIcon className="h-5 w-5" />
              </button>

              {user && (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:block">
                      {user.email}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {currentUserRole === 'owner' ? 'Propriétaire' : 
                           currentUserRole === 'manager' ? 'Gestionnaire' :
                           currentUserRole === 'member' ? 'Membre' : 'Observateur'}
                        </p>
                      </div>

                      {/* Menu items */}
                      <Link
                        to="/settings"
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Paramètres
                      </Link>

                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          signOut();
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {/* Groups link (if enabled) */}
            {enableGroups && (
              <Link
                to="/groups"
                className={`inline-flex items-center px-1 pt-4 pb-4 border-b-2 text-sm font-medium transition-colors ${
                  isGroupsActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="h-4 w-4 mr-2" />
                Groupes
              </Link>
            )}

            {/* Tableau de bord */}
            <Link
              to="/"
              className={`inline-flex items-center px-1 pt-4 pb-4 border-b-2 text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Home className="h-4 w-4 mr-2" />
              Tableau de bord
            </Link>

            {/* Saisie Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEntriesDropdown(!showEntriesDropdown);
                }}
                className={`inline-flex items-center px-1 pt-4 pb-4 border-b-2 text-sm font-medium transition-colors ${
                  isEntriesActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Saisie
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showEntriesDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showEntriesDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                  {entriesNavigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setShowEntriesDropdown(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        location.pathname === item.href
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Autres liens de navigation */}
            {navigation.slice(1).map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`inline-flex items-center px-1 pt-4 pb-4 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}