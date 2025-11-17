import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  AlertCircle,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import {
  getWeekKeyTuesday,
  parseWeekKeyTuesday,
  calculateWeeklyDeltas,
  calculateMonthlyAverages,
  tuesdayNoonISO,
  toCSV,
  parseCSV,
} from '../lib/utils';
import type { Entry, Participant } from '../types';
import { HizbPageConverter } from '../components/HizbPageConverter';

interface CellState {
  value: string;            // ce que tape l'utilisateur (peut être "0" ou "")
  isModified: boolean;
  isSaving: boolean;
  error: string | null;
  originalValue: string;
}

interface WeekInfo {
  weekKey: string;
  tuesday: Date;
  displayWeek: string;
  displayDate: string;
}

export default function MonthlyEntriesPage() {
  const {
    participants,
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    fetchEntries,
    fetchParticipants,
    updateParticipant,
    currentUserRole
  } = useAppStore();

  const isViewer = currentUserRole === 'viewer';
  const canEdit = !isViewer;

  // ----- état principal -----
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
  });

  // états de cellules (optimistic UI)
  const [cellStates, setCellStates] = useState<Record<string, CellState>>({});
  // autosave timeouts
  const [saveTimeouts, setSaveTimeouts] = useState<
    Record<string, NodeJS.Timeout>
  >({});

  useEffect(() => {
    fetchParticipants();
    fetchEntries();
  }, []);

  // participants actifs
  const activeParticipants = useMemo(
    () => participants.filter((p) => p.active),
    [participants]
  );

  // semaines du mois (mardis)
  const monthWeeks = useMemo((): WeekInfo[] => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const weeks: WeekInfo[] = [];
    const current = new Date(firstDay);

    // aller au lundi de la 1re semaine qui recouvre le mois
    current.setDate(current.getDate() - ((current.getDay() + 6) % 7));

    while (current <= lastDay || weeks.length === 0) {
      const tuesday = new Date(current);
      tuesday.setDate(current.getDate() + 1); // mardi

      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(current.getDate() + 6);

      if (weekEnd >= firstDay && weekStart <= lastDay) {
        const weekKey = getWeekKeyTuesday(tuesday);
        const weekNumber =
          weekKey.split('-W')[1]?.replace('-TUE', '') || '';

        weeks.push({
          weekKey,
          tuesday,
          displayWeek: `W${weekNumber}`,
          displayDate: tuesday.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
          }),
        });
      }

      current.setDate(current.getDate() + 7);
      if (weeks.length > 6) break; // garde-fou
    }

    return weeks;
  }, [selectedMonth]);

  // index (participant + semaine) -> dernière entrée de cette semaine
  const entriesIndex = useMemo(() => {
    const index = new Map<string, Entry>();
    for (const entry of entries) {
      const wk = getWeekKeyTuesday(new Date(entry.recorded_at));
      const key = `${entry.participant_id}-${wk}`;
      if (
        !index.has(key) ||
        new Date(entry.recorded_at) >
          new Date(index.get(key)!.recorded_at)
      ) {
        index.set(key, entry);
      }
    }
    return index;
  }, [entries]);

  // helpers pour lire valeurs/entrées
  const getCellValue = useCallback(
    (participantId: string, weekKey: string): string => {
      const cellKey = `${participantId}-${weekKey}`;
      if (cellStates[cellKey]) return cellStates[cellKey].value; // optimistic
      const entry = entriesIndex.get(cellKey);
      return entry ? String(entry.value_int) : '';
    },
    [cellStates, entriesIndex]
  );

  const getCellEntry = useCallback(
    (participantId: string, weekKey: string): Entry | undefined => {
      return entriesIndex.get(`${participantId}-${weekKey}`);
    },
    [entriesIndex]
  );

  // valeur absolue précédente (avant cette semaine) en hizb
  const getPreviousAbsoluteValue = useCallback(
    (participantId: string, weekKey: string): number | null => {
      const tue = parseWeekKeyTuesday(weekKey);
      tue.setHours(0, 0, 0, 0);
      const before = entries
        .filter(
          (e) =>
            e.participant_id === participantId &&
            new Date(e.recorded_at).getTime() < tue.getTime()
        )
        .sort(
          (a, b) =>
            new Date(b.recorded_at).getTime() -
            new Date(a.recorded_at).getTime()
        )[0];
      return before ? before.value_int : null;
    },
    [entries]
  );

  // delta hebdo (pour tooltip)
  const getCellDelta = useCallback(
    (participantId: string, weekKey: string): number => {
      const weeklyDeltas = calculateWeeklyDeltas(entries, participantId);
      const weekNumber =
        weekKey.split('-W')[1]?.replace('-TUE', '') || '';
      const weekData = weeklyDeltas.find((w) => w.week === weekNumber);
      return weekData?.delta || 0;
    },
    [entries]
  );

  // sauvegarde cellule
  const saveCell = useCallback(
    async (participantId: string, weekKey: string, value: string) => {
      const cellKey = `${participantId}-${weekKey}`;
      const trimmed = value.trim();

      // autoriser 0..60 (et valeur vide = on ne sauve rien)
      if (trimmed === '') return;

      const numValue = Number(trimmed);
      if (Number.isNaN(numValue) || numValue < 0 || numValue > 60) {
        setCellStates((prev) => ({
          ...prev,
          [cellKey]: {
            ...prev[cellKey],
            error: 'Valeur invalide (0–60)',
            isSaving: false,
          },
        }));
        return;
      }

      setCellStates((prev) => ({
        ...prev,
        [cellKey]: {
          ...prev[cellKey],
          isSaving: true,
          error: null,
        },
      }));

      try {
        // valeur à enregistrer en base (position absolue).
        // Si l'utilisateur tape 0 => "pas lu" => on REPREND la position précédente.
        let absoluteToStore = numValue;
        if (numValue === 0) {
          const prev = getPreviousAbsoluteValue(participantId, weekKey);
          // s'il n'y a pas d'historique, on normalise à 1 (début mushaf)
          absoluteToStore = prev ?? 1;
        }

        const existing = getCellEntry(participantId, weekKey);
        const recorded_at = tuesdayNoonISO(weekKey); // mardi 12:00 (anti TZ)

        if (existing) {
          await updateEntry(existing.id, {
            value_int: absoluteToStore,
            recorded_at,
          });
        } else {
          await addEntry({
            participant_id: participantId,
            unit_type: 'hizb',
            value_int: absoluteToStore,
            cycle_number: 0, // inchangé: ta logique de calcul fait foi ailleurs
            source: 'manual',
            recorded_at,
          } as any);
        }

        await fetchEntries();

        // UI : on marque sauvegardé.
        // IMPORTANT : si l'utilisateur avait tapé "0", on garde l'affichage "0"
        // (sinon on re-verrait la position absolue en base).
        setCellStates((prev) => ({
          ...prev,
          [cellKey]: {
            ...prev[cellKey],
            isSaving: false,
            isModified: false,
            originalValue: value,
            // on conserve la valeur saisie (peut être "0")
            value,
          },
        }));

        // on nettoie l'état pour toutes les valeurs ≠ "0" (après 2s)
        if (value !== '0') {
          setTimeout(() => {
            setCellStates((prev2) => {
              const clone = { ...prev2 };
              delete clone[cellKey];
              return clone;
            });
          }, 2000);
        }
      } catch (err) {
        console.error('Erreur sauvegarde:', err);
        setCellStates((prev) => ({
          ...prev,
          [cellKey]: {
            ...prev[cellKey],
            isSaving: false,
            error: 'Échec de la sauvegarde',
            value: prev[cellKey].originalValue, // revert
          },
        }));
      }
    },
    [addEntry, updateEntry, fetchEntries, getCellEntry, getPreviousAbsoluteValue]
  );

  // supprimer entrée
  const deleteCell = useCallback(
    async (participantId: string, weekKey: string) => {
      const cellKey = `${participantId}-${weekKey}`;
      const existing = getCellEntry(participantId, weekKey);
      
      if (!existing) return;
      
      if (!confirm('Supprimer cette entrée ?')) return;
      
      try {
        await deleteEntry(existing.id);
        await fetchEntries();
        
        // Nettoyer l'état de la cellule
        setCellStates((prev) => {
          const clone = { ...prev };
          delete clone[cellKey];
          return clone;
        });
      } catch (err) {
        console.error('Erreur suppression:', err);
        alert('Erreur lors de la suppression');
      }
    },
    [getCellEntry, deleteEntry, fetchEntries]
  );

  // change cellule + autosave
  const handleCellChange = useCallback(
    (participantId: string, weekKey: string, value: string) => {
      const cellKey = `${participantId}-${weekKey}`;
      const originalValue = getCellValue(participantId, weekKey);

      setCellStates((prev) => ({
        ...prev,
        [cellKey]: {
          value,
          isModified: value !== originalValue,
          isSaving: false,
          error: null,
          originalValue: prev[cellKey]?.originalValue ?? originalValue,
        },
      }));

      // annule ancien timeout
      if (saveTimeouts[cellKey]) clearTimeout(saveTimeouts[cellKey]);

      // autosave après 1.5s (y compris "0")
      const timeout = setTimeout(() => {
        if (value !== originalValue) {
          saveCell(participantId, weekKey, value);
        }
      }, 1500);

      setSaveTimeouts((prev) => ({ ...prev, [cellKey]: timeout }));
    },
    [getCellValue, saveCell, saveTimeouts]
  );

  // navigation mois
  const navigateMonth = useCallback(
    (dir: 'prev' | 'next') => {
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = new Date(y, m - 1);
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      setSelectedMonth(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      );
    },
    [selectedMonth]
  );

  // Export CSV du mois actuel
  const exportMonthlyCSV = useCallback(() => {
    const data: any[] = [];
    const headers = ['Nom participant', 'Date', 'Hizb', 'Point de départ', 'Redémarrage'];
    
    // Pour chaque participant et chaque semaine, créer une ligne si il y a une entrée
    activeParticipants.forEach(participant => {
      monthWeeks.forEach(week => {
        const entry = getCellEntry(participant.id, week.weekKey);
        if (entry) {
          // Convertir la date du mardi en format lisible
          const tuesday = parseWeekKeyTuesday(week.weekKey);
          const dateStr = tuesday.toLocaleDateString('fr-FR');
          
          // Convertir la valeur en hizb si nécessaire
          const hizbValue = entry.unit_type === 'hizb' ? entry.value_int : toHizb(entry.value_int);
          
          data.push({
            'Nom participant': participant.name,
            'Date': dateStr,
            'Hizb': hizbValue,
            'Point de départ': entry.source === 'starting_point' ? 'X' : '',
            'Redémarrage': entry.is_restart ? 'X' : ''
          });
        }
      });
    });
    
    const csv = toCSV(data, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `entrees-mensuelles-${selectedMonth}.csv`;
    link.click();
  }, [activeParticipants, monthWeeks, getCellValue, selectedMonth]);

  // Import CSV
  const importMonthlyCSV = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseCSV(content);
        
        if (rows.length < 2) {
          alert('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données');
          return;
        }
        
        const headers = rows[0];
        const dataRows = rows.slice(1);
        
        // Vérifier les colonnes requises
        const requiredColumns = ['Nom participant', 'Date', 'Hizb'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
          alert(`Colonnes manquantes: ${missingColumns.join(', ')}`);
          return;
        }
        
        const participantCol = headers.indexOf('Nom participant');
        const dateCol = headers.indexOf('Date');
        const hizbCol = headers.indexOf('Hizb');
        const startingPointCol = headers.indexOf('Point de départ');
        const restartCol = headers.indexOf('Redémarrage');
        
        let importedCount = 0;
        let errorCount = 0;
        
        for (const row of dataRows) {
          const participantName = row[participantCol]?.trim();
          const dateStr = row[dateCol]?.trim();
          const hizbValue = row[hizbCol]?.trim();
          
          if (!participantName) continue;
          
          // Trouver le participant par nom
          const participant = activeParticipants.find(p => 
            p.name.toLowerCase() === participantName.toLowerCase()
          );
          
          if (!participant) {
            console.warn(`Participant non trouvé: ${participantName}`);
            errorCount++;
            continue;
          }
          
          // Parser la date pour trouver la semaine correspondante
          let targetDate: Date;
          try {
            // Essayer plusieurs formats de date
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              // Format DD/MM/YYYY
              targetDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
              targetDate = new Date(dateStr);
            }
            
            if (isNaN(targetDate.getTime())) {
              throw new Error('Date invalide');
            }
          } catch (error) {
            console.warn(`Date invalide pour ${participantName}: ${dateStr}`);
            errorCount++;
            continue;
          }
          
          // Trouver la semaine correspondante (mardi de la semaine)
          const weekKey = getWeekKeyTuesday(targetDate);
          
          // Valider la valeur hizb
          const numValue = parseInt(hizbValue);
          if (isNaN(numValue) || numValue < 1 || numValue > 60) {
            console.warn(`Valeur hizb invalide pour ${participantName}: ${hizbValue}`);
            errorCount++;
            continue;
          }
          
          // Déterminer les flags
          const isStartingPoint = startingPointCol >= 0 && row[startingPointCol]?.trim().toLowerCase() === 'x';
          const isRestart = restartCol >= 0 && row[restartCol]?.trim().toLowerCase() === 'x';
          
          try {
            // Vérifier si une entrée existe déjà pour cette date
            const existing = getCellEntry(participant.id, weekKey);
            const recorded_at = tuesdayNoonISO(weekKey);
            
            // Calculer le cycle number
            let cycleNumber = participant.cycle_number;
            if (isRestart) {
              const lastEntry = getLastRealEntry(entries, participant.id);
              cycleNumber = lastEntry ? lastEntry.cycle_number + 1 : 1;
            }
            
            const entryData = {
              participant_id: participant.id,
              unit_type: 'hizb' as const,
              value_int: numValue,
              cycle_number: cycleNumber,
              source: isStartingPoint ? 'starting_point' as const : 'import' as const,
              recorded_at,
              is_restart: isRestart,
              note: `Importé le ${new Date().toLocaleDateString('fr-FR')}`
            };
            
            if (existing) {
              await updateEntry(existing.id, entryData);
            } else {
              await addEntry(entryData as any);
            }
            
            // Mettre à jour le cycle du participant si nécessaire
            if (cycleNumber !== participant.cycle_number) {
              await updateParticipant(participant.id, { cycle_number: cycleNumber });
            }
            
            importedCount++;
          } catch (error) {
            console.error(`Erreur import ${participantName}, date ${dateStr}:`, error);
            errorCount++;
          }
        }
        
        await fetchEntries();
        await fetchParticipants();
        alert(`Import terminé!\n✅ ${importedCount} entrées importées\n❌ ${errorCount} erreurs`);
        
      } catch (error) {
        console.error('Erreur lors de l\'import CSV:', error);
        alert('Erreur lors de l\'import du fichier CSV');
      }
    };
    
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  }, [activeParticipants, getCellEntry, addEntry, updateEntry, updateParticipant, fetchEntries, fetchParticipants, entries]);

  // stats par participant
  const getParticipantStats = useCallback(
    (participant: Participant) => {
      const monthlyAvg = calculateMonthlyAverages(
        entries,
        participant.id,
        selectedMonth
      );
      const weeklyDeltas = calculateWeeklyDeltas(entries, participant.id);

      const monthTotal = monthWeeks.reduce((sum, w) => {
        const num =
          w.weekKey.split('-W')[1]?.replace('-TUE', '') || '';
        const row = weeklyDeltas.find((r) => r.week === num);
        return sum + (row?.delta || 0);
      }, 0);

      // wrap heuristique visuelle (facultatif)
      const hasWrap = false;

      return {
        monthlyAvg: Math.round(monthlyAvg * 10) / 10,
        monthTotal,
        hasWrap,
      };
    },
    [entries, selectedMonth, monthWeeks]
  );

  const monthName = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Floating converter */}
      <HizbPageConverter />

      {/* header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Saisie mensuelle
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tapez la position de fin de semaine (mardi→lundi). Vous pouvez
            saisir <strong>0</strong> si la personne n'a rien lu : la position
            précédente sera conservée, et Analytics comptera <strong>0</strong>.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-center min-w-48">
              <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {monthName}
              </div>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
          />

          <button
            onClick={() => fetchEntries()}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            💾 Actualiser
          </button>

          <div className="flex gap-2">
            <button
              onClick={exportMonthlyCSV}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>

            {canEdit && (
              <label className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={importMonthlyCSV}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {isViewer && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Mode lecture seule:</strong> En tant qu'observateur, vous pouvez consulter les données mais pas les modifier.
          </p>
        </div>
      )}

      {/* tableau */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                  Participant
                </th>
                {monthWeeks.map((week) => (
                  <th
                    key={week.weekKey}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-24"
                  >
                    <div>{week.displayWeek}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      {week.displayDate}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stats
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {activeParticipants.map((participant) => {
                const stats = getParticipantStats(participant);

                return (
                  <tr
                    key={participant.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 z-10">
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0">
                          {participant.avatar_url ? (
                            <img
                              className="h-8 w-8 rounded-full"
                              src={participant.avatar_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {participant.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {participant.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Obj: {participant.weekly_target_hizb || 7}/sem
                          </div>
                        </div>
                      </div>
                    </td>

                    {monthWeeks.map((week) => {
                      const cellKey = `${participant.id}-${week.weekKey}`;
                      const state = cellStates[cellKey];
                      const entry = getCellEntry(participant.id, week.weekKey);
                      const value = getCellValue(participant.id, week.weekKey);
                      const delta = getCellDelta(
                        participant.id,
                        week.weekKey
                      );

                      return (
                        <td key={week.weekKey} className="px-3 py-4 text-center relative">
                          <div className="relative group">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="60"
                                value={value}
                                onChange={(e) =>
                                  handleCellChange(
                                    participant.id,
                                    week.weekKey,
                                    e.target.value
                                  )
                                }
                                disabled={!canEdit}
                                className={`w-14 px-2 py-1 text-center border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white ${
                                  state?.isModified
                                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                    : state?.error
                                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-300 dark:border-gray-600'
                                } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                                placeholder="-"
                              />

                              {entry && canEdit && (
                                <button
                                  onClick={() => deleteCell(participant.id, week.weekKey)}
                                  className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Supprimer cette entrée"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* badges */}
                            <div className="absolute -top-1 -right-1 flex gap-1">
                              {entry?.source === 'starting_point' && (
                                <span className="inline-block w-3 h-3 text-[8px] bg-blue-500 text-white rounded-full flex items-center justify-center">
                                  📍
                                </span>
                              )}
                              {entry?.is_restart && (
                                <span className="inline-block w-3 h-3 text-[8px] bg-amber-500 text-white rounded-full flex items-center justify-center">
                                  🔁
                                </span>
                              )}
                              {state?.isSaving && (
                                <div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                              )}
                              {state?.isModified === false && !state?.isSaving && (
                                <Check className="w-3 h-3 text-emerald-500" />
                              )}
                            </div>

                            {/* tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                              <div className="font-semibold">
                                {week.displayDate}
                              </div>
                              <div>
                                {delta > 0
                                  ? `+${delta} hizb cette semaine`
                                  : '0 hizb cette semaine'}
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>

                            {state?.error && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-red-500 text-white text-xs rounded whitespace-nowrap z-20">
                                {state.error}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* stats */}
                    <td className="px-4 py-4 text-center">
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {stats.monthlyAvg}/sem
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {stats.monthTotal} total
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* récap global */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Récapitulatif {monthName}
        </h3>
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            📋 Format CSV pour import
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Colonnes requises :</strong> Participant, {monthWeeks.map(w => w.displayWeek).join(', ')}<br/>
            <strong>Valeurs :</strong> Position en hizb (1-60) ou 0 pour "pas lu cette semaine"<br/>
            <strong>Exemple :</strong> Adam,15,22,28,35 (Adam a lu jusqu'au hizb 15, 22, 28, 35 chaque semaine)
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeParticipants.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Participants actifs
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {monthWeeks.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Semaines du mois
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {activeParticipants.reduce(
                (sum, p) => sum + getParticipantStats(p).monthTotal,
                0
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total hizb lus
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
