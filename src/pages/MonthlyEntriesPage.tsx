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
  Sparkles,
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
  const isOwner = currentUserRole === 'owner'; // Seul le propriétaire (admin) peut utiliser "Remplir auto"

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
  // modale remplissage auto
  const [showFillModal, setShowFillModal] = useState(false);
  const [selectedWeekToFill, setSelectedWeekToFill] = useState<string>('');

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
      // Calculate weekKey from recorded_at
      // tuesdayNoonISO creates dates at 12:00 UTC (noon to avoid timezone issues)
      // getWeekKeyTuesday works in local timezone, but since recorded_at is at noon UTC,
      // it should always be the same day in local timezone (noon UTC = afternoon in most timezones)
      const entryDate = new Date(entry.recorded_at);
      const wk = getWeekKeyTuesday(entryDate);
      const key = `${entry.participant_id}-${wk}`;
      
      // Debug: log if we see entries being indexed
      if (process.env.NODE_ENV === 'development' && entries.length > 0 && entries.length < 10) {
        console.log('Entry indexed:', {
          entryId: entry.id,
          participantId: entry.participant_id,
          recorded_at: entry.recorded_at,
          weekKey: wk,
          key
        });
      }
      
      // Keep the most recent entry for this participant+week combination
      if (
        !index.has(key) ||
        new Date(entry.recorded_at).getTime() >
          new Date(index.get(key)!.recorded_at).getTime()
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

        // Don't fetchEntries immediately - addEntry/updateEntry already update the state
        // Only fetch after a delay to ensure DB consistency, but the UI should update immediately
        // via the optimistic state update in addEntry/updateEntry
        setTimeout(async () => {
          await fetchEntries();
        }, 1000);

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

  // Remplir automatiquement une semaine spécifique avec la moyenne arrondie vers le haut
  const fillMissingWeek = useCallback(async (weekKey: string) => {
    if (!isOwner || !weekKey) {
      alert('Seul le propriétaire du groupe peut utiliser cette fonctionnalité.');
      return;
    }

    // Trouver l'index de la semaine sélectionnée
    const weekIndex = monthWeeks.findIndex(w => w.weekKey === weekKey);
    if (weekIndex === -1) {
      alert('Semaine non trouvée');
      return;
    }

    let filledCount = 0;
    const promises: Promise<void>[] = [];

    for (const participant of activeParticipants) {
      const week = monthWeeks[weekIndex];
      const entry = getCellEntry(participant.id, week.weekKey);
      
      // Si la semaine a déjà une entrée, on passe
      if (entry) continue;
      
      // Trouver LA semaine précédente immédiate (même si elle est dans un autre mois)
      let prevValue: number | null = null;
      let prevWeekKey: string | null = null;
      
      // Calculer la semaine précédente en soustrayant 7 jours
      const currentTuesday = parseWeekKeyTuesday(week.weekKey);
      const prevTuesday = new Date(currentTuesday);
      prevTuesday.setDate(prevTuesday.getDate() - 7);
      prevWeekKey = getWeekKeyTuesday(prevTuesday);
      
      // Chercher dans toutes les entrées (pas seulement dans monthWeeks)
      let prevEntry = getCellEntry(participant.id, prevWeekKey);
      if (!prevEntry) {
        prevEntry = entries.find(e => {
          if (e.participant_id !== participant.id) return false;
          const entryWeekKey = getWeekKeyTuesday(new Date(e.recorded_at));
          return entryWeekKey === prevWeekKey;
        });
      }
      
      if (prevEntry) {
        prevValue = prevEntry.value_int;
      }
      
      // Trouver LA semaine suivante immédiate (même si elle est dans un autre mois)
      let nextValue: number | null = null;
      let nextWeekKey: string | null = null;
      
      // Calculer la semaine suivante en ajoutant 7 jours
      const nextTuesday = new Date(currentTuesday);
      nextTuesday.setDate(nextTuesday.getDate() + 7);
      nextWeekKey = getWeekKeyTuesday(nextTuesday);
      
      // Chercher dans toutes les entrées (pas seulement dans monthWeeks)
      let nextEntry = getCellEntry(participant.id, nextWeekKey);
      if (!nextEntry) {
        nextEntry = entries.find(e => {
          if (e.participant_id !== participant.id) return false;
          const entryWeekKey = getWeekKeyTuesday(new Date(e.recorded_at));
          return entryWeekKey === nextWeekKey;
        });
      }
      
      if (nextEntry) {
        nextValue = nextEntry.value_int;
      }
      
      // Calculer la moyenne si on a au moins une valeur
      let averageValue: number | null = null;
      if (prevValue !== null && nextValue !== null) {
        // Moyenne des deux valeurs adjacentes, arrondie vers le haut
        averageValue = Math.ceil((prevValue + nextValue) / 2);
      } else if (prevValue !== null) {
        // Utiliser seulement la valeur précédente
        averageValue = prevValue;
      } else if (nextValue !== null) {
        // Utiliser seulement la valeur suivante
        averageValue = nextValue;
      }
      
      // Si on a une valeur à insérer
      if (averageValue !== null && averageValue > 0 && averageValue <= 60) {
        const promise = (async () => {
          try {
            const recorded_at = tuesdayNoonISO(week.weekKey);
            await addEntry({
              participant_id: participant.id,
              unit_type: 'hizb',
              value_int: averageValue,
              cycle_number: participant.cycle_number || 0,
              source: 'manual',
              recorded_at,
              note: `Rempli automatiquement (moyenne: ${prevValue !== null ? prevValue : '?'}${nextValue !== null ? ` + ${nextValue}` : ''})`
            } as any);
            filledCount++;
          } catch (error) {
            console.error(`Erreur remplissage semaine ${week.weekKey} pour ${participant.name}:`, error);
          }
        })();
        promises.push(promise);
      }
    }
    
    // Attendre que toutes les sauvegardes soient terminées
    await Promise.all(promises);
    await fetchEntries();
    
    setShowFillModal(false);
    setSelectedWeekToFill('');
    
    const week = monthWeeks[weekIndex];
    if (filledCount > 0) {
      alert(`✅ ${filledCount} participant(s) rempli(s) pour la semaine ${week.displayWeek}`);
    } else {
      alert('Aucun participant à remplir pour cette semaine (tous ont déjà des données ou aucune valeur adjacente trouvée)');
    }
  }, [activeParticipants, monthWeeks, getCellEntry, addEntry, fetchEntries, isOwner, tuesdayNoonISO, entries]);

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
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Saisie mensuelle
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Saisissez la position de fin de semaine (mardi→lundi). '0' conserve la position précédente.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {/* Navigation Mois */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full lg:w-auto">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="text-center px-4">
              <span className="text-sm font-bold text-gray-900 dark:text-white capitalize block">
                {monthName}
              </span>
            </div>

            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Actions Toolbar */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <div className="relative flex-grow lg:flex-grow-0">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full lg:w-auto border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>

            <button
              onClick={() => fetchEntries()}
              className="flex-grow lg:flex-grow-0 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-lg shadow-emerald-500/20"
            >
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            {isOwner && (
              <button
                onClick={() => setShowFillModal(true)}
                className="flex-grow lg:flex-grow-0 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium shadow-lg shadow-purple-500/20"
                title="Remplir automatiquement une semaine avec la moyenne des semaines adjacentes (réservé au propriétaire)"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Remplir auto</span>
              </button>
            )}

            <div className="flex gap-2 flex-grow lg:flex-grow-0">
              <button
                onClick={exportMonthlyCSV}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
                title="Export CSV"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {canEdit && (
                <label className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors cursor-pointer text-sm font-medium shadow-lg shadow-orange-500/20" title="Import CSV">
                  <Upload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Import</span>
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
      </div>

      {isViewer && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">Mode lecture seule</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              En tant qu'observateur, vous pouvez consulter les données mais pas les modifier.
            </p>
          </div>
        </div>
      )}

      {/* Mobile swipe hint */}
      <div className="sm:hidden flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-2">
        <span>←</span>
        <span>Faites glisser pour voir toutes les semaines</span>
        <span>→</span>
      </div>

      {/* tableau */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.2)] min-w-[130px] sm:min-w-[180px]">
                  Participant
                </th>
                {monthWeeks.map((week) => (
                  <th
                    key={week.weekKey}
                    className="px-2 sm:px-4 py-3 sm:py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[80px] sm:min-w-[100px]"
                  >
                    <div className="text-emerald-600 dark:text-emerald-400 mb-0.5">{week.displayWeek}</div>
                    <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                      {week.displayDate}
                    </div>
                  </th>
                ))}
                <th className="px-2 sm:px-6 py-3 sm:py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Stats
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {activeParticipants.map((participant) => {
                const stats = getParticipantStats(participant);

                return (
                  <tr
                    key={participant.id}
                    className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors z-10 border-r border-slate-100 dark:border-slate-800 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0">
                          {participant.avatar_url ? (
                            <img
                              className="h-7 w-7 sm:h-9 sm:w-9 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                              src={participant.avatar_url}
                              alt=""
                            />
                          ) : (
                            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm text-white font-bold text-xs sm:text-sm">
                              {participant.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-2 sm:ml-3 min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate max-w-[80px] sm:max-w-none">
                            {participant.name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
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
                        <td key={week.weekKey} className="px-1 sm:px-2 py-3 sm:py-4 text-center relative">
                          <div className="relative flex justify-center">
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
                              className={`w-12 sm:w-16 py-1.5 sm:py-2 text-center text-sm font-bold bg-transparent border rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all ${
                                state?.isModified
                                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                  : state?.error
                                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20'
                                  : entry
                                  ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50' 
                                  : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                              placeholder="-"
                            />

                            {entry && canEdit && (
                              <button
                                onClick={() => deleteCell(participant.id, week.weekKey)}
                                className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-800 text-rose-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"
                                title="Supprimer cette entrée"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            
                            {/* Indicators */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5 pointer-events-none">
                              {entry?.source === 'starting_point' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Départ"></span>
                              )}
                              {entry?.is_restart && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Restart"></span>
                              )}
                              {state?.isSaving && (
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* stats */}
                    <td className="px-2 sm:px-6 py-3 sm:py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 sm:px-2 py-1 rounded-lg whitespace-nowrap">
                          {stats.monthlyAvg}/s
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
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
      <div className="glass-panel rounded-2xl p-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Calendar className="h-5 w-5" />
          </div>
          Récapitulatif {monthName}
        </h3>
        
        <div className="mb-8 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
          <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Format CSV pour import
          </h4>
          <p className="text-xs leading-relaxed text-blue-600 dark:text-blue-400">
            <strong className="font-semibold">Colonnes requises :</strong> Participant, {monthWeeks.map(w => w.displayWeek).join(', ')}<br/>
            <strong className="font-semibold">Valeurs :</strong> Position en hizb (1-60) ou 0 pour "pas lu cette semaine"<br/>
            <strong className="font-semibold">Exemple :</strong> Adam,15,22,28,35 (Adam a lu jusqu'au hizb 15, 22, 28, 35 chaque semaine)
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-xl p-5 text-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {activeParticipants.length}
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Participants actifs
            </div>
          </div>
          <div className="glass-panel rounded-xl p-5 text-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {monthWeeks.length}
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Semaines du mois
            </div>
          </div>
          <div className="glass-panel rounded-xl p-5 text-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {activeParticipants.reduce(
                (sum, p) => sum + getParticipantStats(p).monthTotal,
                0
              )}
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Total hizb lus
            </div>
          </div>
        </div>
      </div>

      {/* Modal Remplissage Auto */}
      {showFillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Remplir automatiquement</h3>
              <button 
                onClick={() => {
                  setShowFillModal(false);
                  setSelectedWeekToFill('');
                }} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                  Sélectionner la semaine à remplir
                </label>
                <select
                  value={selectedWeekToFill}
                  onChange={(e) => setSelectedWeekToFill(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-slate-900 dark:text-white"
                >
                  <option value="">-- Choisir une semaine --</option>
                  {monthWeeks.map((week) => {
                    const hasData = activeParticipants.some(p => getCellEntry(p.id, week.weekKey));
                    return (
                      <option key={week.weekKey} value={week.weekKey}>
                        {week.displayWeek} ({week.displayDate}) {hasData ? '⚠️ Déjà des données' : '✅ Vide'}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  La semaine sera remplie avec la moyenne arrondie vers le haut des semaines précédente et suivante
                </p>
              </div>

              {selectedWeekToFill && (() => {
                const weekIndex = monthWeeks.findIndex(w => w.weekKey === selectedWeekToFill);
                if (weekIndex === -1) return null;
                
                const week = monthWeeks[weekIndex];
                const prevWeek = weekIndex > 0 ? monthWeeks[weekIndex - 1] : null;
                const nextWeek = weekIndex < monthWeeks.length - 1 ? monthWeeks[weekIndex + 1] : null;
                
                // Vérifier les valeurs pour le premier participant (exemple)
                const exampleParticipant = activeParticipants[0];
                let prevValue: number | null = null;
                let nextValue: number | null = null;
                
                if (prevWeek && exampleParticipant) {
                  const prevEntry = getCellEntry(exampleParticipant.id, prevWeek.weekKey);
                  if (prevEntry) prevValue = prevEntry.value_int;
                }
                if (nextWeek && exampleParticipant) {
                  const nextEntry = getCellEntry(exampleParticipant.id, nextWeek.weekKey);
                  if (nextEntry) nextValue = nextEntry.value_int;
                }
                
                const calculatedValue = prevValue !== null && nextValue !== null
                  ? Math.ceil((prevValue + nextValue) / 2)
                  : prevValue !== null
                  ? prevValue
                  : nextValue !== null
                  ? nextValue
                  : null;

                return (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                      Aperçu du calcul :
                    </p>
                    <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                      <div>Semaine précédente ({prevWeek?.displayWeek || 'N/A'}): {prevValue !== null ? `${prevValue} hizb` : 'Aucune donnée'}</div>
                      <div>Semaine suivante ({nextWeek?.displayWeek || 'N/A'}): {nextValue !== null ? `${nextValue} hizb` : 'Aucune donnée'}</div>
                      <div className="pt-2 border-t border-purple-200 dark:border-purple-700 font-bold">
                        Valeur calculée : {calculatedValue !== null ? `${calculatedValue} hizb` : 'Impossible (pas de données adjacentes)'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => {
                  setShowFillModal(false);
                  setSelectedWeekToFill('');
                }} 
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (selectedWeekToFill) {
                    fillMissingWeek(selectedWeekToFill);
                  }
                }}
                disabled={!selectedWeekToFill}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" /> Remplir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
