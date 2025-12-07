import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Save, X, Edit } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { getWeekKeyTuesday, parseWeekKeyTuesday, tuesdayNoonISO, hasRealEntries, getLastRealEntry, toHizb, toPages, detectNewKhatma } from '../lib/utils';
import type { Participant, UnitType } from '../types';

export default function EntryPage() {
  const {
    participants, entries, currentUnit,
    fetchParticipants, fetchEntries, addEntry, updateEntry, updateParticipant
  } = useAppStore();

  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    participantId: '',
    value: 1,
    isStartingPoint: false,
    isRestart: false,
    note: ''
  });

  useEffect(() => { fetchParticipants(); fetchEntries(); }, []);

  const selectedWeekDate = useMemo(() => {
    const today = new Date();
    const d = new Date(today);
    d.setDate(today.getDate() + selectedWeekOffset * 7);
    return d;
  }, [selectedWeekOffset]);

  const selectedWeekKey = useMemo(() => getWeekKeyTuesday(selectedWeekDate), [selectedWeekDate]);

  const weekDisplayInfo = useMemo(() => {
    const tuesday = parseWeekKeyTuesday(selectedWeekKey);
    const monday = new Date(tuesday);
    monday.setDate(tuesday.getDate() + 6); // Lundi suivant
    const tuesdayStart = new Date(tuesday); // Mardi de début
    
    const weekNumber = selectedWeekKey.split('-W')[1]?.replace('-TUE', '') || '';
    
    return {
      weekNumber: `Semaine ${weekNumber}`,
      dateRange: `${tuesdayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
      isCurrentWeek: selectedWeekOffset === 0
    };
  }, [selectedWeekKey, selectedWeekOffset]);

  const activeParticipants = participants.filter(p => p.active);

  // Compter les entrées pour la semaine sélectionnée
  const weekEntriesCount = useMemo(() => {
    const tuesday = parseWeekKeyTuesday(selectedWeekKey);
    const weekStart = new Date(tuesday);
    weekStart.setDate(tuesday.getDate() - 1); // Lundi
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(tuesday);
    weekEnd.setDate(tuesday.getDate() + 5); // Dimanche
    weekEnd.setHours(23, 59, 59, 999);
    
    return entries.filter(e => {
      const entryDate = new Date(e.recorded_at);
      return entryDate >= weekStart && entryDate <= weekEnd;
    }).length;
  }, [entries, selectedWeekKey]);

  const openManualEntry = (participantId: string) => {
    // Chercher l'entrée existante pour cette semaine
    const tuesday = parseWeekKeyTuesday(selectedWeekKey);
    const weekStart = new Date(tuesday);
    weekStart.setDate(tuesday.getDate() - 1); // Lundi
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(tuesday);
    weekEnd.setDate(tuesday.getDate() + 5); // Dimanche
    weekEnd.setHours(23, 59, 59, 999);
    
    const existingEntry = entries
      .filter(e => e.participant_id === participantId)
      .find(e => {
        const entryDate = new Date(e.recorded_at);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

    const lastEntry = getLastRealEntry(entries, participantId);
    const hasExisting = hasRealEntries(entries, participantId);
    
    setManualEntryData({
      participantId,
      value: existingEntry ? existingEntry.value_int : (lastEntry ? lastEntry.value_int : 1),
      isStartingPoint: existingEntry ? (existingEntry.source === 'starting_point') : !hasExisting,
      isRestart: existingEntry ? (existingEntry.is_restart || false) : false,
      note: existingEntry ? (existingEntry.note || '') : ''
    });
    setShowManualEntry(true);
  };

  const handleManualEntrySave = async () => {
    try {
      const participant = participants.find(p => p.id === manualEntryData.participantId);
      if (!participant) return;

      // Vérifier s'il y a une entrée existante pour cette semaine
      const tuesday = parseWeekKeyTuesday(selectedWeekKey);
      const weekStart = new Date(tuesday);
      weekStart.setDate(tuesday.getDate() - 1);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(tuesday);
      weekEnd.setDate(tuesday.getDate() + 5);
      weekEnd.setHours(23, 59, 59, 999);
      
      const existingEntry = entries
        .filter(e => e.participant_id === manualEntryData.participantId)
        .find(e => {
          const entryDate = new Date(e.recorded_at);
          return entryDate >= weekStart && entryDate <= weekEnd;
        });
      const lastEntry = getLastRealEntry(entries, manualEntryData.participantId);
      let cycleNumber = participant.cycle_number;
      let note = manualEntryData.note;

      if (!existingEntry && !manualEntryData.isStartingPoint && !manualEntryData.isRestart && lastEntry) {
        const newCycleDetected = detectNewKhatma(manualEntryData.value, lastEntry.value_int, currentUnit);
        if (newCycleDetected) {
          cycleNumber = lastEntry.cycle_number + 1;
          note = note ? `${note} (Nouvelle Khatma détectée)` : 'Nouvelle Khatma détectée';
        }
      }
      if (manualEntryData.isRestart && !existingEntry?.is_restart && lastEntry) {
        cycleNumber = lastEntry.cycle_number + 1;
        note = note ? `${note} (Redémarrage)` : 'Redémarrage - Nouvelle Khatma';
      }

      if (existingEntry) {
        // Modifier l'entrée existante
        await updateEntry(existingEntry.id, {
          value_int: manualEntryData.value,
          cycle_number: cycleNumber,
          note,
          source: manualEntryData.isStartingPoint ? 'starting_point' : 'manual',
          is_restart: manualEntryData.isRestart,
          previous_position: manualEntryData.isRestart && lastEntry ? lastEntry.value_int : undefined
        });
      } else {
        // Créer une nouvelle entrée
        await addEntry({
          participant_id: manualEntryData.participantId,
          unit_type: currentUnit,
          value_int: manualEntryData.value,
          cycle_number: cycleNumber,
          note,
          source: manualEntryData.isStartingPoint ? 'starting_point' : 'manual',
          recorded_at: tuesdayNoonISO(selectedWeekKey),
          is_restart: manualEntryData.isRestart,
          previous_position: manualEntryData.isRestart && lastEntry ? lastEntry.value_int : undefined
        } as any);
      }

      if (cycleNumber !== participant.cycle_number) {
        await updateParticipant(participant.id, { cycle_number: cycleNumber });
      }

      setShowManualEntry(false);
      await fetchEntries();
    } catch (e) {
      console.error('Error saving manual entry:', e);
    }
  };

  // ---- UI simplifiée (table) ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saisie hebdomadaire</h1>
          <p className="text-gray-600 dark:text-gray-400">Mardi → lundi. Sauvegarde forcée au mardi 12:00.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedWeekOffset(selectedWeekOffset - 1)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center min-w-64">
            <div className={`text-lg font-semibold ${weekDisplayInfo.isCurrentWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              {weekDisplayInfo.weekNumber}
              {weekDisplayInfo.isCurrentWeek && <span className="ml-2 text-sm font-normal">(Actuelle)</span>}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {weekDisplayInfo.dateRange}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {weekEntriesCount > 0 ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                  ✓ {weekEntriesCount} entrée{weekEntriesCount > 1 ? 's' : ''} saisie{weekEntriesCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  Aucune donnée
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setSelectedWeekOffset(selectedWeekOffset + 1)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Participant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cycle</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {activeParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Obj: {p.weekly_target_hizb || 7}/sem</div>
                  </td>
                  <td className="px-6 py-4 text-slate-800 dark:text-slate-200">
                    {/* Position pour la semaine sélectionnée */}
                    {(() => {
                      const tuesday = parseWeekKeyTuesday(selectedWeekKey);
                      const weekStart = new Date(tuesday);
                      weekStart.setDate(tuesday.getDate() - 1); // Lundi
                      weekStart.setHours(0, 0, 0, 0);
                      
                      const weekEnd = new Date(tuesday);
                      weekEnd.setDate(tuesday.getDate() + 5); // Dimanche
                      weekEnd.setHours(23, 59, 59, 999);
                      
                      const weekEntry = entries
                        .filter(e => e.participant_id === p.id)
                        .find(e => {
                          const entryDate = new Date(e.recorded_at);
                          return entryDate >= weekStart && entryDate <= weekEnd;
                        });
                      
                      if (!weekEntry) {
                        return <span className="text-gray-400 dark:text-gray-500">—</span>;
                      }
                      
                      const displayValue = weekEntry.unit_type === currentUnit
                        ? weekEntry.value_int
                        : (currentUnit === 'hizb' ? toHizb(weekEntry.value_int) : toPages(weekEntry.value_int));
                      
                      return (
                        <div className="flex items-center gap-2">
                          <span>{displayValue} {currentUnit}</span>
                          {weekEntry.source === 'starting_point' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                              📍 Départ
                            </span>
                          )}
                          {weekEntry.is_restart && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                              🔁 Restart
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.cycle_number}</td>
                  <td className="px-6 py-4 text-right">
                    {(() => {
                      const tuesday = parseWeekKeyTuesday(selectedWeekKey);
                      const weekStart = new Date(tuesday);
                      weekStart.setDate(tuesday.getDate() - 1);
                      weekStart.setHours(0, 0, 0, 0);
                      
                      const weekEnd = new Date(tuesday);
                      weekEnd.setDate(tuesday.getDate() + 5);
                      weekEnd.setHours(23, 59, 59, 999);
                      
                      const weekEntry = entries
                        .filter(e => e.participant_id === p.id)
                        .find(e => {
                          const entryDate = new Date(e.recorded_at);
                          return entryDate >= weekStart && entryDate <= weekEnd;
                        });
                      
                      return weekEntry ? (
                        <button 
                          onClick={() => openManualEntry(p.id)} 
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Edit className="h-4 w-4" /> Modifier
                        </button>
                      ) : (
                        <button 
                          onClick={() => openManualEntry(p.id)} 
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Plus className="h-4 w-4" /> Saisir
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal saisie */}
      {showManualEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Saisie manuelle</h3>
              <button 
                onClick={() => setShowManualEntry(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Participant</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {participants.find(p => p.id === manualEntryData.participantId)?.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Position atteinte ({currentUnit})</label>
                <input
                  type="number"
                  min={1}
                  max={currentUnit === 'hizb' ? 60 : 604}
                  value={manualEntryData.value}
                  onChange={(e) => setManualEntryData(prev => ({ ...prev, value: parseInt(e.target.value) || 1 }))}
                  className="input-modern text-lg font-semibold text-center"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="flex items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={manualEntryData.isStartingPoint}
                    onChange={(e) => setManualEntryData(prev => ({ ...prev, isStartingPoint: e.target.checked, isRestart: false }))}
                    className="w-5 h-5 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">📍 Point de départ</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Première saisie pour ce participant</span>
                  </div>
                </label>
                
                <label className="flex items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={manualEntryData.isRestart}
                    onChange={(e) => setManualEntryData(prev => ({ ...prev, isRestart: e.target.checked, isStartingPoint: false }))}
                    className="w-5 h-5 text-emerald-600 border-slate-300 dark:border-slate-600 rounded focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">🔁 Redémarrage (Nouvelle Khatma)</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Commence un nouveau cycle de lecture</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowManualEntry(false)} 
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleManualEntrySave} 
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 font-medium transition-all"
              >
                <Save className="h-4 w-4" /> Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
