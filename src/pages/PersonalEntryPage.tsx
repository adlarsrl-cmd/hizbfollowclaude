import { useState, useEffect } from 'react';
import { Minus, Plus, RotateCcw, MapPin, MessageSquare, ChevronDown } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { supabase } from '../lib/supabase';
import {
  getWeekBoundsTuesday,
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
  const [saved, setSaved] = useState(false);
  const [isNewKhatma, setIsNewKhatma] = useState(false);
  const [isStartingPoint, setIsStartingPoint] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [hasExistingEntry, setHasExistingEntry] = useState(false);

  useEffect(() => {
    fetchMyParticipants();
    fetchEntries();
  }, []);

  useEffect(() => {
    if (participants.length === 1 && !selectedParticipantId) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  useEffect(() => {
    if (!selectedParticipantId) return;
    const now = new Date();
    const { start: weekStart, end: weekEnd } = getWeekBoundsTuesday(now);
    const existingEntry = entries
      .filter(e => e.participant_id === selectedParticipantId)
      .find(e => {
        const d = new Date(e.recorded_at);
        return d >= weekStart && d <= weekEnd;
      });
    if (existingEntry) {
      setValue(existingEntry.value_int);
      setNote(existingEntry.note || '');
      setHasExistingEntry(true);
    } else {
      const lastEntry = getLastRealEntry(entries, selectedParticipantId);
      setValue(lastEntry ? lastEntry.value_int : 1);
      setNote('');
      setHasExistingEntry(false);
    }
    setIsNewKhatma(false);
    setIsStartingPoint(false);
    setSaved(false);
    setShowNote(false);
  }, [selectedParticipantId, entries]);

  const selectedParticipant = participants.find(p => p.id === selectedParticipantId);
  const maxValue = currentUnit === 'hizb' ? 60 : 604;
  const progress = value > 0 ? Math.round((value / maxValue) * 100) : 0;

  const weekLabel = (() => {
    const { start, end } = getWeekBoundsTuesday(new Date());
    return `${start.getDate()} – ${end.getDate()} ${end.toLocaleString('fr-FR', { month: 'long' })}`;
  })();

  const increment = () => { setValue(v => Math.min(v + 1, maxValue)); setSaved(false); };
  const decrement = () => { setValue(v => Math.max(v - 1, 0)); setSaved(false); };

  const handleSave = async () => {
    if (!selectedParticipant) return;
    setSaving(true);
    try {
      const now = new Date();
      const { start: weekStart, end: weekEnd } = getWeekBoundsTuesday(now);
      const existingEntry = entries
        .filter(e => e.participant_id === selectedParticipantId)
        .find(e => {
          const d = new Date(e.recorded_at);
          return d >= weekStart && d <= weekEnd;
        });
      const lastEntry = getLastRealEntry(entries, selectedParticipantId);
      let cycleNumber = selectedParticipant.cycle_number;
      let finalNote = note;

      if (isNewKhatma && !existingEntry) {
        const baseCycle = lastEntry ? lastEntry.cycle_number : selectedParticipant.cycle_number;
        cycleNumber = baseCycle + 1;
        finalNote = finalNote ? `${finalNote} (Nouvelle Khatma)` : 'Nouvelle Khatma';
      } else if (!existingEntry && lastEntry && !isStartingPoint) {
        const detected = detectNewKhatma(value, lastEntry.value_int, currentUnit);
        if (detected) {
          cycleNumber = lastEntry.cycle_number + 1;
          finalNote = finalNote ? `${finalNote} (Nouvelle Khatma détectée)` : 'Nouvelle Khatma détectée';
        }
      }

      const entrySource = isStartingPoint ? 'starting_point' : 'manual';

      if (existingEntry) {
        await updateEntry(existingEntry.id, {
          value_int: value,
          cycle_number: cycleNumber,
          note: finalNote,
          recorded_at: new Date().toISOString()
        });
      } else {
        await addEntry({
          participant_id: selectedParticipantId,
          unit_type: currentUnit,
          value_int: value,
          cycle_number: cycleNumber,
          note: finalNote,
          source: entrySource,
          recorded_at: new Date().toISOString()
        } as any);
      }

      if (cycleNumber !== selectedParticipant.cycle_number) {
        await updateParticipant(selectedParticipant.id, { cycle_number: cycleNumber });
      }

      // Mise à jour de la position courante (source de vérité partagée avec Ramadan)
      if (currentUnit === 'hizb') {
        await supabase
          .from('participants')
          .update({ current_hizb: value })
          .eq('id', selectedParticipantId);
      }

      setSaved(true);
      setIsNewKhatma(false);
      setIsStartingPoint(false);
      setTimeout(async () => { await fetchEntries(); }, 500);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /* ── Role guard ── */
  if (!currentUserRole || currentUserRole === 'viewer' || currentUserRole === 'owner' || currentUserRole === 'manager') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-2xl">🔒</div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Page réservée aux membres</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          En tant que {currentUserRole === 'owner' ? 'propriétaire' : currentUserRole === 'manager' ? 'gestionnaire' : 'observateur'},
          utilisez <strong>Saisie hebdo</strong> ou <strong>Saisie mensuelle</strong>.
        </p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-2xl">👤</div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Aucun participant lié</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Demandez à un gestionnaire de créer un participant ou de lier votre compte.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-4 pb-12 flex flex-col gap-10">

      {/* Participant selector — multi only */}
      {participants.length > 1 && (
        <div className="relative">
          <select
            value={selectedParticipantId}
            onChange={(e) => setSelectedParticipantId(e.target.value)}
            className="w-full appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl px-4 py-3 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 border-none"
          >
            <option value="">Choisir un participant</option>
            {participants.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      )}

      {selectedParticipant && (
        <>
          {/* Identity + week */}
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
              {weekLabel}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              {selectedParticipant.name}
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              {selectedParticipant.cycle_number} khatma{selectedParticipant.cycle_number > 1 ? 's' : ''}
              {' · '}
              objectif {selectedParticipant.weekly_target_hizb || 7} {currentUnit}/sem
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
              <span>{currentUnit} {value} / {maxValue}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Counter — the main focus */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={decrement}
              disabled={value <= 0}
              className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-25 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Minus className="h-6 w-6" />
            </button>

            <div className="flex-1 text-center">
              <input
                type="number"
                min={0}
                max={maxValue}
                value={value || ''}
                onChange={(e) => { setValue(Math.min(parseInt(e.target.value) || 0, maxValue)); setSaved(false); }}
                className="w-full text-center text-7xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <button
              onClick={increment}
              disabled={value >= maxValue}
              className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-25 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {/* Special actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { setIsNewKhatma(!isNewKhatma); if (!isNewKhatma) setIsStartingPoint(false); setSaved(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
                isNewKhatma
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nouvelle Khatma
            </button>
            <button
              onClick={() => { setIsStartingPoint(!isStartingPoint); if (!isStartingPoint) setIsNewKhatma(false); setSaved(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
                isStartingPoint
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Point de départ
            </button>
          </div>

          {/* Note — collapsed by default */}
          <div>
            <button
              onClick={() => setShowNote(!showNote)}
              className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              {note && !showNote ? 'Voir la note' : showNote ? 'Masquer' : 'Ajouter une note'}
            </button>
            {showNote && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Une note sur ta progression…"
                className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 resize-none border-none"
              />
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] ${
              saved
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : hasExistingEntry ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </>
      )}
    </div>
  );
}
