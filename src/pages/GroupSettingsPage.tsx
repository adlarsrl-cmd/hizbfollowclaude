import { useState, useEffect } from 'react';
import { Settings, Save, Bell, Camera, Globe, Archive, RotateCcw } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';
import { supabase } from '../lib/supabase';

interface GroupSettings {
  id: string;
  group_id: string;
  unit_type: 'hizb' | 'page' | 'juz';
  reminder_enabled: boolean;
  reminder_day: string;
  reminder_time: string;
  auto_snapshot: boolean;
  snapshot_day: string;
  locale: 'fr' | 'ar' | 'en';
}

const DAYS_OF_WEEK = [
  { value: 'lundi', label: 'Lundi' },
  { value: 'mardi', label: 'Mardi' },
  { value: 'mercredi', label: 'Mercredi' },
  { value: 'jeudi', label: 'Jeudi' },
  { value: 'vendredi', label: 'Vendredi' },
  { value: 'samedi', label: 'Samedi' },
  { value: 'dimanche', label: 'Dimanche' }
];

const LOCALES = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' }
];

const UNIT_TYPES = [
  { value: 'hizb', label: 'Hizb' },
  { value: 'page', label: 'Pages' },
  { value: 'juz', label: "Juz'" }
];

export default function GroupSettingsPage() {
  const { activeGroupId, currentUserRole } = useAppStore();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [group, setGroup] = useState<any>(null);

  const canEdit = currentUserRole === 'owner';

  useEffect(() => {
    if (activeGroupId) {
      loadSettings();
      loadGroup();
    }
  }, [activeGroupId]);

  const loadGroup = async () => {
    if (!activeGroupId) return;

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', activeGroupId)
      .maybeSingle();

    if (error) {
      console.error('Error loading group:', error);
      return;
    }

    setGroup(data);
  };

  const loadSettings = async () => {
    if (!activeGroupId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', activeGroupId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        const { data: newSettings, error: createError } = await supabase
          .from('group_settings')
          .insert({
            group_id: activeGroupId,
            unit_type: 'hizb',
            reminder_enabled: true,
            reminder_day: 'mardi',
            reminder_time: '09:00:00',
            auto_snapshot: true,
            snapshot_day: 'mardi',
            locale: 'fr'
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      showError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !canEdit) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('group_settings')
        .update({
          unit_type: settings.unit_type,
          reminder_enabled: settings.reminder_enabled,
          reminder_day: settings.reminder_day,
          reminder_time: settings.reminder_time,
          auto_snapshot: settings.auto_snapshot,
          snapshot_day: settings.snapshot_day,
          locale: settings.locale
        })
        .eq('id', settings.id);

      if (error) throw error;

      success('Paramètres enregistrés avec succès');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showError('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!activeGroupId || !canEdit) return;

    if (!confirm('Êtes-vous sûr de vouloir archiver ce groupe ?')) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', activeGroupId);

      if (error) throw error;

      success('Groupe archivé avec succès');
      loadGroup();
    } catch (error: any) {
      console.error('Error archiving group:', error);
      showError('Erreur lors de l\'archivage du groupe');
    }
  };

  const handleUnarchive = async () => {
    if (!activeGroupId || !canEdit) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          archived: false,
          archived_at: null,
          archived_by: null
        })
        .eq('id', activeGroupId);

      if (error) throw error;

      success('Groupe réactivé avec succès');
      loadGroup();
    } catch (error: any) {
      console.error('Error unarchiving group:', error);
      showError('Erreur lors de la réactivation du groupe');
    }
  };

  if (!activeGroupId) {
    return (
      <div className="text-center py-12">
        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Sélectionnez un groupe pour voir ses paramètres
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Paramètres du groupe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configurez les préférences de votre groupe
          </p>
        </div>

        {group?.archived && (
          <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded text-sm font-medium">
            Archivé
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Seul le propriétaire du groupe peut modifier ces paramètres
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Unité de mesure
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Unité par défaut
            </label>
            <select
              value={settings.unit_type}
              onChange={(e) => setSettings({ ...settings, unit_type: e.target.value as any })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              {UNIT_TYPES.map(unit => (
                <option key={unit.value} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Rappels hebdomadaires
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Activer les rappels
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Recevoir des notifications pour saisir vos lectures
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, reminder_enabled: !settings.reminder_enabled })}
              disabled={!canEdit}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.reminder_enabled ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-600'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.reminder_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.reminder_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jour du rappel
                </label>
                <select
                  value={settings.reminder_day}
                  onChange={(e) => setSettings({ ...settings, reminder_day: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Heure du rappel
                </label>
                <input
                  type="time"
                  value={settings.reminder_time}
                  onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Camera className="h-5 w-5 mr-2" />
            Snapshots hebdomadaires
          </h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Snapshots automatiques
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enregistrer automatiquement la progression chaque semaine
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, auto_snapshot: !settings.auto_snapshot })}
              disabled={!canEdit}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.auto_snapshot ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-600'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_snapshot ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.auto_snapshot && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Jour du snapshot
              </label>
              <select
                value={settings.snapshot_day}
                onChange={(e) => setSettings({ ...settings, snapshot_day: e.target.value })}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Langue
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Langue du groupe
            </label>
            <select
              value={settings.locale}
              onChange={(e) => setSettings({ ...settings, locale: e.target.value as any })}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              {LOCALES.map(locale => (
                <option key={locale.value} value={locale.value}>{locale.label}</option>
              ))}
            </select>
          </div>
        </div>

        {canEdit && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Archive className="h-5 w-5 mr-2" />
              Zone de danger
            </h2>

            {group?.archived ? (
              <button
                onClick={handleUnarchive}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réactiver le groupe
              </button>
            ) : (
              <button
                onClick={handleArchive}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archiver le groupe
              </button>
            )}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  );
}
