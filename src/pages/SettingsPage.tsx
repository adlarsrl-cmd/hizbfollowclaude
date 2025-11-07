import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Clock,
  Globe,
  Palette,
  Database,
  Mail,
  Smartphone,
  User
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';

export default function SettingsPage() {
  const {
    settings,
    currentUnit,
    theme,
    userProfile,
    fetchSettings,
    updateSettings,
    setCurrentUnit,
    setTheme,
    fetchUserProfile,
    updateUserProfile
  } = useAppStore();

  const { success, error: showError } = useToast();

  const [formData, setFormData] = useState({
    timezone: 'Europe/Brussels',
    checkpoint_window_start: '20:00',
    checkpoint_window_end: '23:00',
    default_unit: 'hizb' as 'hizb' | 'page',
    allow_iso_view: true
  });

  const [notifications, setNotifications] = useState({
    email: '',
    webPush: false,
    reminderEnabled: true
  });

  const [participantName, setParticipantName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile?.display_name) {
      setParticipantName(userProfile.display_name);
    }
  }, [userProfile]);

  useEffect(() => {
    if (settings) {
      setFormData({
        timezone: settings.timezone,
        checkpoint_window_start: settings.checkpoint_window_start,
        checkpoint_window_end: settings.checkpoint_window_end,
        default_unit: settings.default_unit,
        allow_iso_view: settings.allow_iso_view
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings(formData);
      // Update local unit preference
      setCurrentUnit(formData.default_unit);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSaveParticipantName = async () => {
    if (!participantName.trim()) {
      showError('Le nom de participant ne peut pas être vide');
      return;
    }

    setIsSavingName(true);
    try {
      await updateUserProfile({ display_name: participantName.trim() });
      success('Nom de participant mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating participant name:', error);
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        showError('Ce nom de participant est déjà utilisé. Veuillez en choisir un autre.');
      } else {
        showError('Erreur lors de la mise à jour du nom de participant');
      }
    } finally {
      setIsSavingName(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifications(prev => ({ ...prev, webPush: true }));
        
        // Register for web push
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          // This would normally use VAPID keys to subscribe
          console.log('Web push subscription would be created here');
        }
      }
    }
  };

  const exportAllData = () => {
    // This would export all user data
    console.log('Export all data functionality');
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // This would handle importing historical data
    console.log('Import data functionality');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configurez HizbFollow selon vos préférences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profil</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom de participant
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Follower-Rapide"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ce nom sera visible par les autres membres de vos groupes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={userProfile?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>

            <button
              onClick={handleSaveParticipantName}
              disabled={isSavingName || participantName === userProfile?.display_name}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSavingName ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <SettingsIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Général</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unité par défaut
              </label>
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, default_unit: 'hizb' }))}
                  className={`px-4 py-2 text-sm flex-1 ${
                    formData.default_unit === 'hizb'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Hizb (1-60)
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, default_unit: 'page' }))}
                  className={`px-4 py-2 text-sm flex-1 ${
                    formData.default_unit === 'page'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Pages (1-604)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="inline h-4 w-4 mr-1" />
                Fuseau horaire
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="Europe/Brussels">Europe/Brussels</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Africa/Casablanca">Africa/Casablanca</option>
                <option value="Africa/Tunis">Africa/Tunis</option>
                <option value="Africa/Algiers">Africa/Algiers</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allow_iso_view"
                checked={formData.allow_iso_view}
                onChange={(e) => setFormData(prev => ({ ...prev, allow_iso_view: e.target.checked }))}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="allow_iso_view" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Permettre l'affichage ISO (Lun-Dim) en plus du mardi-aligné
              </label>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Palette className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Apparence</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thème
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'auto'] as const).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => setTheme(themeOption)}
                    className={`p-3 border rounded-lg text-center ${
                      theme === themeOption
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-sm font-medium capitalize">
                      {themeOption === 'auto' ? 'Automatique' : themeOption === 'light' ? 'Clair' : 'Sombre'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Checkpoint Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Checkpoint mardi</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Début de fenêtre
              </label>
              <input
                type="time"
                value={formData.checkpoint_window_start}
                onChange={(e) => setFormData(prev => ({ ...prev, checkpoint_window_start: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fin de fenêtre
              </label>
              <input
                type="time"
                value={formData.checkpoint_window_end}
                onChange={(e) => setFormData(prev => ({ ...prev, checkpoint_window_end: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Le snapshot automatique est pris mardi à 22:59:30 si dans cette fenêtre
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email pour rappels
              </label>
              <input
                type="email"
                value={notifications.email}
                onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.value }))}
                placeholder="votre@email.com"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <Smartphone className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notifications web push
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recevoir des rappels dans le navigateur
                </p>
              </div>
              <button
                onClick={requestNotificationPermission}
                disabled={notifications.webPush}
                className={`px-3 py-1 text-xs rounded ${
                  notifications.webPush
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {notifications.webPush ? 'Activé' : 'Activer'}
              </button>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="reminder_enabled"
                checked={notifications.reminderEnabled}
                onChange={(e) => setNotifications(prev => ({ ...prev, reminderEnabled: e.target.checked }))}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="reminder_enabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Activer les rappels automatiques
              </label>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gestion des données</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={exportAllData}
              className="flex items-center justify-center px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Database className="h-4 w-4 mr-2" />
              Export complet
            </button>
            
            <label className="flex items-center justify-center px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer">
              <Database className="h-4 w-4 mr-2" />
              Import historique
              <input
                type="file"
                accept=".csv,.json"
                onChange={importData}
                className="hidden"
              />
            </label>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mapping JSON précis
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                (Fonctionnalité future)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium"
        >
          Enregistrer les paramètres
        </button>
      </div>
    </div>
  );
}