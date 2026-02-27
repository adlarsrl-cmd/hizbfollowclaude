import React from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Shield,
  FileText,
  User
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

export default function ProfilPage() {
  const {
    user,
    userProfile,
    currentUserRole,
    theme,
    setTheme,
    signOut
  } = useAppStore();

  const themeOptions: Array<{ value: 'light' | 'dark' | 'auto'; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Clair',      icon: Sun },
    { value: 'dark',  label: 'Sombre',     icon: Moon },
    { value: 'auto',  label: 'Automatique', icon: Monitor },
  ];

  const roleLabel =
    currentUserRole === 'owner'   ? 'Propriétaire' :
    currentUserRole === 'manager' ? 'Gestionnaire'  :
    currentUserRole === 'viewer'  ? 'Observateur'   : 'Membre';

  const initials = (userProfile?.display_name || user?.email || '?')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gérez votre compte et vos préférences</p>
      </div>

      {/* Avatar + name */}
      <div className="glass-panel rounded-2xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-2xl font-bold border-2 border-white dark:border-slate-800 shadow-sm flex-shrink-0">
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} className="w-full h-full rounded-full object-cover" alt="avatar" />
          ) : (
            <User className="w-8 h-8" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-lg text-slate-900 dark:text-white truncate">
            {userProfile?.display_name || user?.email?.split('@')[0] || 'Utilisateur'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {user?.email}
          </p>
          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Thème */}
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 mb-3">
          Thème
        </p>
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                theme === value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liens */}
      <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Paramètres</span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          to="/privacy"
          className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Politique de confidentialité</span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          to="/terms"
          className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Conditions d'utilisation</span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Déconnexion */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="flex-1 font-medium text-rose-600 dark:text-rose-400 text-left">Déconnexion</span>
        </button>
      </div>

      {/* Version */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-2">
        HizbFollow — v1.0
      </p>
    </div>
  );
}
