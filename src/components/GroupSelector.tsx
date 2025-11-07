import React from 'react';
import { ChevronDown, Users, Crown, Shield, Eye } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

export default function GroupSelector() {
  const {
    groups,
    activeGroupId,
    currentUserRole,
    setActiveGroup,
    enableGroups
  } = useAppStore();

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!enableGroups || groups.length === 0) {
    return null;
  }

  const activeGroup = groups.find(g => g.id === activeGroupId);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'manager': return <Shield className="h-3 w-3 text-blue-500" />;
      case 'member': return <Users className="h-3 w-3 text-green-500" />;
      case 'viewer': return <Eye className="h-3 w-3 text-gray-500" />;
      default: return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'manager': return 'Gestionnaire';
      case 'member': return 'Membre';
      case 'viewer': return 'Observateur';
      default: return role;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {activeGroup?.name || 'Sélectionner un groupe'}
        </span>
        {currentUserRole && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
            {getRoleIcon(currentUserRole)}
            <span className="text-gray-600 dark:text-gray-400">
              {getRoleLabel(currentUserRole)}
            </span>
          </div>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <div className="py-1">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setActiveGroup(group.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  group.id === activeGroupId
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{group.name}</span>
                  {group.id === activeGroupId && (
                    <div className="flex items-center gap-1">
                      {getRoleIcon(currentUserRole || '')}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Créé le {new Date(group.created_at).toLocaleDateString('fr-FR')}
                </div>
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 py-1">
            <a
              href="/groups"
              className="block w-full px-4 py-2 text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Gérer les groupes
            </a>
          </div>
        </div>
      )}
    </div>
  );
}