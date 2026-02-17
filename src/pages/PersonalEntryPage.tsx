import React, { useState, useEffect } from 'react';
import { Save, User, Target, Award } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { 
  getWeekKeyTuesday, 
  parseWeekKeyTuesday, 
  getWeekBoundsTuesday,
  tuesdayNoonISO,
  detectNewKhatma,
  getLastRealEntry
} from '../lib/utils';

export default function PersonalEntryPage() {
  const {
    participants,
    entries,
    currentUnit,
    currentUserRole,
    fetchMyParticipants,
    fetchEntries,
    addEntry,
    updateEntry,
    updateParticipant
  } = useAppStore();

  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [value, setValue] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Fetch user's own participants
  useEffect(() => {
    fetchMyParticipants();
    fetchEntries();
  }, []);

  // Auto-select first participant if only one
  useEffect(() => {
    if (participants.length === 1 && !selectedParticipantId) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  // Load existing entry for selected participant
  useEffect(() => {
    if (!selectedParticipantId) return;

    const now = new Date();
    const { start: weekStart, end: weekEnd } = getWeekBoundsTuesday(now);

    const existingEntry = entries
      .filter(e => e.participant_id === selectedParticipantId)
      .find(e => {
        const entryDate = new Date(e.recorded_at);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

    if (existingEntry) {
      setValue(existingEntry.value_int);
      setNote(existingEntry.note || '');
    } else {
      // Load last position
      const lastEntry = getLastRealEntry(entries, selectedParticipantId);
      setValue(lastEntry ? lastEntry.value_int : 1);
      setNote('');
    }
  }, [selectedParticipantId, entries]);

  const selectedParticipant = participants.find(p => p.id === selectedParticipantId);

  const handleSave = async () => {
    if (!selectedParticipant || !value) return;

    setSaving(true);
    try {
      const now = new Date();
      const { start: weekStart, end: weekEnd } = getWeekBoundsTuesday(now);
      const weekKey = getWeekKeyTuesday(now);

      // Check for existing entry this week
      const existingEntry = entries
        .filter(e => e.participant_id === selectedParticipantId)
        .find(e => {
          const entryDate = new Date(e.recorded_at);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });

      const lastEntry = getLastRealEntry(entries, selectedParticipantId);
      let cycleNumber = selectedParticipant.cycle_number;
      let finalNote = note;

      // Detect new khatma
      if (!existingEntry && lastEntry) {
        const newCycleDetected = detectNewKhatma(value, lastEntry.value_int, currentUnit);
        if (newCycleDetected) {
          cycleNumber = lastEntry.cycle_number + 1;
          finalNote = finalNote ? `${finalNote} (Nouvelle Khatma détectée)` : 'Nouvelle Khatma détectée';
        }
      }

      if (existingEntry) {
        // Update existing entry
        await updateEntry(existingEntry.id, {
          value_int: value,
          cycle_number: cycleNumber,
          note: finalNote,
          recorded_at: new Date().toISOString()
        });
      } else {
        // Create new entry
        await addEntry({
          participant_id: selectedParticipantId,
          unit_type: currentUnit,
          value_int: value,
          cycle_number: cycleNumber,
          note: finalNote,
          source: 'manual',
          recorded_at: new Date().toISOString()
        } as any);
      }

      // Update participant cycle if changed
      if (cycleNumber !== selectedParticipant.cycle_number) {
        await updateParticipant(selectedParticipant.id, { cycle_number: cycleNumber });
      }

      setLastSaved(new Date());
      // Small delay before fetching to ensure DB has propagated the entry
      setTimeout(async () => {
        await fetchEntries();
      }, 500);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Quick value buttons
  const quickValues = [0, 7, 14, 21, 28, 35, 42, 49, 56, 60];

  if (!currentUserRole || currentUserRole === 'viewer' || currentUserRole === 'owner' || currentUserRole === 'manager') {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Page réservée aux membres
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Cette page permet aux membres du groupe de saisir uniquement leur propre progression.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          En tant que {currentUserRole === 'owner' ? 'propriétaire' : currentUserRole === 'manager' ? 'gestionnaire' : 'observateur'},
          utilisez <strong>Saisie hebdo</strong> ou <strong>Saisie mensuelle</strong> à la place.
        </p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Aucun participant
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Vous n'avez pas encore de participant lié à votre compte.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Demandez à un gestionnaire du groupe de vous créer un participant ou de lier un participant existant à votre compte.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ma saisie personnelle
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Saisissez votre progression de lecture pour cette semaine
        </p>
      </div>

      {/* Participant Selection */}
      {participants.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sélectionner le participant
          </label>
          <select
            value={selectedParticipantId}
            onChange={(e) => setSelectedParticipantId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Choisir un participant</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedParticipant && (
        <>
          {/* Participant Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedParticipant.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cycle actuel: {selectedParticipant.cycle_number} • Objectif: {selectedParticipant.weekly_target_hizb || 7} hizb/semaine
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Objectif hebdo: {selectedParticipant.weekly_target_hizb || 7} hizb
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Khatmas complétées: {selectedParticipant.cycle_number}
                </span>
              </div>
            </div>
          </div>

          {/* Entry Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Position actuelle
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Position en {currentUnit} (1-{currentUnit === 'hizb' ? '60' : '604'})
                </label>
                <input
                  type="number"
                  min={0}
                  max={currentUnit === 'hizb' ? 60 : 604}
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-lg font-medium text-center"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Saisissez 0 si vous n'avez pas lu cette semaine
                </p>
              </div>

              {/* Quick Value Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valeurs rapides
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {quickValues.map((quickValue) => (
                    <button
                      key={quickValue}
                      onClick={() => setValue(quickValue)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        value === quickValue
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {quickValue}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Note (optionnel)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Ajoutez une note sur votre progression..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !value}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder ma progression'}
            </button>

            {lastSaved && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Sauvegardé le {lastSaved.toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}