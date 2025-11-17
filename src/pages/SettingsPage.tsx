import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Bell,
  Clock,
  Globe,
  Palette,
  Database,
  Mail,
  Smartphone,
  User,
  Lock,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';
import { supabase } from '../lib/supabase';
import DeleteAccountConfirmationDialog from '../components/DeleteAccountConfirmationDialog';

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

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Account deletion state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const navigate = useNavigate();
  const { deleteAccount } = useAppStore();

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

  const handleChangePassword = async () => {
    setPasswordError('');

    // Validation
    if (!passwordData.currentPassword) {
      setPasswordError('Veuillez entrer votre mot de passe actuel');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    // Check password strength
    const hasLowercase = /[a-z]/.test(passwordData.newPassword);
    const hasUppercase = /[A-Z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?/~`]/.test(passwordData.newPassword);

    if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecial) {
      setPasswordError('Le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule, un chiffre et un caractère spécial');
      return;
    }

    setIsChangingPassword(true);

    try {
      const user = useAppStore.getState().user;
      if (!user?.email) {
        throw new Error('Utilisateur non trouvé');
      }

      // First, verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Mot de passe actuel incorrect');
        }
        throw signInError;
      }

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        // Simplify error messages
        let errorMessage = updateError.message;
        if (errorMessage.includes('Password should contain')) {
          errorMessage = 'Le mot de passe doit contenir au moins une lettre minuscule, une lettre majuscule, un chiffre et un caractère spécial.';
        } else if (errorMessage.includes('Error during password storage')) {
          errorMessage = 'Erreur lors de l\'enregistrement du mot de passe. Veuillez réessayer.';
        }
        throw new Error(errorMessage);
      }

      // Success!
      success('Mot de passe modifié avec succès !');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la modification du mot de passe';
      setPasswordError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      success('Compte supprimé avec succès. Toutes vos données ont été supprimées.');
      // Redirect to login
      navigate('/');
      // Force page reload to clear all state after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Error deleting account:', err);
      showError(err.message || 'Erreur lors de la suppression du compte');
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
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

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Changer le mot de passe</h2>
          </div>

          <div className="space-y-4">
            {passwordError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Entrez votre mot de passe actuel"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Le mot de passe doit contenir au moins 6 caractères, avec des lettres majuscules, minuscules, chiffres et caractères spéciaux.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Répétez le nouveau mot de passe"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isChangingPassword ? 'Modification...' : 'Modifier le mot de passe'}
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

        {/* Delete Account */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-red-200 dark:border-red-800">
          <div className="flex items-center mb-4">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Zone de danger</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Une fois votre compte supprimé, toutes vos données seront définitivement perdues. Cette action est irréversible.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteDialog(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer mon compte
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <DeleteAccountConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeletingAccount}
        userEmail={useAppStore.getState().user?.email}
      />

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