import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Save, X, Edit } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { getDayBounds, hasRealEntries, getLastRealEntry, toHizb, toPages, detectNewKhatma } from '../lib/utils';
import type { Participant, UnitType } from '../types';

export default function EntryPage() {
  const {
    participants, entries, currentUnit,
    fetchParticipants, fetchEntries, addEntry, updateEntry, updateParticipant
  } = useAppStore();

  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    participantId: '',
    value: 1,
    isStartingPoint: false,
    isRestart: false,
    note: ''
  });

  useEffect(() => { fetchParticipants(); fetchEntries(); }, []);

  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    return d;
  }, [selectedDayOffset]);

  const dayDisplayInfo = useMemo(() => {
    const isToday = selectedDayOffset === 0;
    const isYesterday = selectedDayOffset === -1;
    const label = isToday ? 'Aujourd\'hui' : isYesterday ? 'Hier' :
      selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const dateStr = selectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return { label, dateStr, isToday };
  }, [selectedDate, selectedDayOffset]);

  const activeParticipants = participants.filter(p => p.active);

  // Day bounds for the selected date
  const selectedDayBounds = useMemo(() => getDayBounds(selectedDate), [selectedDate]);

  // Count entries for the selected day
  const dayEntriesCount = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.recorded_at);
      return d >= selectedDayBounds.start && d <= selectedDayBounds.end;
    }).length;
  }, [entries, selectedDayBounds]);

  // Get the entry for a participant on the selected day (cross-group via user_id)
  const getDayEntry = (participantId: string) => {
    const p = participants.find(pt => pt.id === participantId);
    return entries
      .filter(e => {
        const matches = p?.user_id && e.user_id ? e.user_id === p.user_id : e.participant_id === participantId;
        if (!matches) return false;
        const d = new Date(e.recorded_at);
        return d >= selectedDayBounds.start && d <= selectedDayBounds.end;
      })
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
  };

  const openManualEntry = (participantId: string) => {
    const participantObj = participants.find(p => p.id === participantId);
    const existingEntry = getDayEntry(participantId);
    const lastEntry = getLastRealEntry(entries, participantId, participantObj?.user_id);
    const hasExisting = hasRealEntries(entries, participantId, participantObj?.user_id);

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

      const existingEntry = getDayEntry(manualEntryData.participantId);
      const lastEntry = getLastRealEntry(entries, manualEntryData.participantId, participant?.user_id);
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

      // recorded_at: selected date at noon
      const recordedAt = new Date(selectedDate);
      recordedAt.setHours(12, 0, 0, 0);

      if (existingEntry) {
        await updateEntry(existingEntry.id, {
          value_int: manualEntryData.value,
          cycle_number: cycleNumber,
          note,
          source: manualEntryData.isStartingPoint ? 'starting_point' : 'manual',
          is_restart: manualEntryData.isRestart,
          previous_position: manualEntryData.isRestart && lastEntry ? lastEntry.value_int : undefined
        });
      } else {
        await addEntry({
          participant_id: manualEntryData.participantId,
          unit_type: currentUnit,
          value_int: manualEntryData.value,
          cycle_number: cycleNumber,
          note,
          source: manualEntryData.isStartingPoint ? 'starting_point' : 'manual',
          recorded_at: recordedAt.toISOString(),
          is_restart: manualEntryData.isRestart,
          previous_position: manualEntryData.isRestart && lastEntry ? lastEntry.value_int : undefined
        } as any);
      }

      if (cycleNumber !== participant.cycle_number) {
        await updateParticipant(participant.id, { cycle_number: cycleNumber });
      }

      setShowManualEntry(false);
      setTimeout(async () => { await fetchEntries(); }, 500);
    } catch (e) {
      console.error('Error saving manual entry:', e);
      await fetchEntries();
    }
  };

  // ---- UI ----
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saisie journalière</h1>
          <p className="text-gray-600 dark:text-gray-400">Une entrée par jour, modifiable à tout moment.</p>
        </div>
        <div className="flex items-center gap-2 self-center sm:self-auto">
          <button onClick={() => setSelectedDayOffset(selectedDayOffset - 1)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center min-w-40 sm:min-w-56">
            <div className={`text-lg font-semibold capitalize ${dayDisplayInfo.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
              {dayDisplayInfo.label}
              {dayDisplayInfo.isToday && <span className="ml-2 text-sm font-normal">(Aujourd'hui)</span>}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {dayDisplayInfo.dateStr}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {dayEntriesCount > 0 ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                  ✓ {dayEntriesCount} entrée{dayEntriesCount > 1 ? 's' : ''} saisie{dayEntriesCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  Aucune donnée
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedDayOffset(Math.min(selectedDayOffset + 1, 0))}
            disabled={selectedDayOffset >= 0}
            className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {activeParticipants.map((p) => {
            const dayEntry = getDayEntry(p.id);
            return (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Obj: {p.weekly_target_hizb || 7}/sem</div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    Cycle {p.cycle_number}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <div className="text-sm">
                    <span className="block text-xs text-slate-500 mb-1">Position</span>
                    {dayEntry ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {dayEntry.unit_type === currentUnit
                            ? dayEntry.value_int
                            : (currentUnit === 'hizb' ? toHizb(dayEntry.value_int) : toPages(dayEntry.value_int))} {currentUnit}
                        </span>
                        {dayEntry.source === 'starting_point' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Départ</span>
                        )}
                        {dayEntry.is_restart && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Restart</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Non saisi</span>
                    )}
                  </div>

                  {dayEntry ? (
                    <button
                      onClick={() => openManualEntry(p.id)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => openManualEntry(p.id)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
              {activeParticipants.map((p) => {
                const dayEntry = getDayEntry(p.id);
                const displayValue = dayEntry
                  ? (dayEntry.unit_type === currentUnit
                    ? dayEntry.value_int
                    : (currentUnit === 'hizb' ? toHizb(dayEntry.value_int) : toPages(dayEntry.value_int)))
                  : null;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Obj: {p.weekly_target_hizb || 7}/sem</div>
                    </td>
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200">
                      {displayValue !== null ? (
                        <div className="flex items-center gap-2">
                          <span>{displayValue} {currentUnit}</span>
                          {dayEntry?.source === 'starting_point' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                              📍 Départ
                            </span>
                          )}
                          {dayEntry?.is_restart && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                              🔁 Restart
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.cycle_number}</td>
                    <td className="px-6 py-4 text-right">
                      {dayEntry ? (
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
                      )}
                    </td>
                  </tr>
                );
              })}
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
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Participant · {dayDisplayInfo.label}</div>
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
