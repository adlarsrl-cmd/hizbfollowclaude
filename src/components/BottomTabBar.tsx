import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Book, BarChart3, Users, User } from 'lucide-react';

const tabs = [
  { name: 'Accueil', href: '/', icon: Home },
  { name: 'Coran',   href: '/quran', icon: Book },
  { name: 'Stats',   href: '/analytics', icon: BarChart3 },
  { name: 'Groupes', href: '/groups', icon: Users },
  { name: 'Profil',  href: '/profil', icon: User },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px] ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className={`text-[10px] font-medium leading-none ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
