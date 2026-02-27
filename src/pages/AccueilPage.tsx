import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Minus, Plus, Users, BarChart3,
  ChevronLeft, ChevronRight, Pencil,
  TrendingDown, TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { supabase } from '../lib/supabase';
import { getWeekKeyTuesday, parseWeekKeyTuesday } from '../lib/utils';

// Bornes mardi→lundi pour un offset (en semaines depuis aujourd'hui)
function getWeekBounds(weekOffset: number): { weekKey: string; tue: Date; mon: Date; label: string } {
  const anchor = new Date();
  anchor.setDate(anchor.getDate() + weekOffset * 7);
  const weekKey = getWeekKeyTuesday(anchor);
  const tue = parseWeekKeyTuesday(weekKey);
  tue.setHours(0, 0, 0, 0);
  const mon = new Date(tue);
  mon.setDate(tue.getDate() + 6);
  mon.setHours(23, 59, 59, 999);
  const label = tue.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    ...(tue.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  });
  return { weekKey, tue, mon, label };
}

export default function AccueilPage() {
  const {
    userProfile,
    updateUserProfile,
    user,
    activeGroupId,
    fetchEntries,
    groups,
  } = useAppStore();

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const displayName = userProfile?.display_name || '';
  const maxValue = 60;

  // ── Counter widget ───────────────────────────────────────────────────────
  const [value, setValue] = useState<number>(userProfile?.current_hizb ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Personal entries (history) ──────────────────────────────────────────
  const [personalEntries, setPersonalEntries] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── History navigation (0 = current week, -1 = previous, etc.) ──────────
  const [histWeekOffset, setHistWeekOffset] = useState(0);

  // ── Edit sheet ──────────────────────────────────────────────────────────
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editValue, setEditValue] = useState(30);
  const [editType, setEditType] = useState<'normal' | 'restart' | 'starting_point'>('normal');
  const [editSaving, setEditSaving] = useState(false);

  // Sync hizb from global latest entry
  useEffect(() => {
    if (!user?.id) {
      if (userProfile?.current_hizb !== undefined) setValue(userProfile.current_hizb);
      return;
    }
    supabase
      .from('entries')
      .select('value_int')
      .eq('user_id', user.id)
      .neq('source', 'starting_point')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const latest = data?.[0]?.value_int;
        setValue(latest !== undefined ? latest : (userProfile?.current_hizb ?? 0));
      });
  }, [user?.id, refreshKey]);

  // Fetch all personal entries for history (global, no group filter)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('entries')
      .select('id, value_int, cycle_number, recorded_at, source, is_restart, group_id')
      .eq('user_id', user.id)
      .neq('source', 'starting_point')
      .order('recorded_at', { ascending: false })
      .then(({ data }) => setPersonalEntries(data || []));
  }, [user?.id, refreshKey]);

  // ── Save (upsert: delete today's entry for this group, then insert) ─────
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({ current_hizb: value });

      if (activeGroupId && user) {
        const { data: participant } = await supabase
          .from('participants')
          .select('id, cycle_number')
          .eq('group_id', activeGroupId)
          .eq('user_id', user.id)
          .eq('active', true)
          .maybeSingle();

        if (participant) {
          const { data: lastEntries } = await supabase
            .from('entries')
            .select('value_int, cycle_number')
            .eq('group_id', activeGroupId)
            .or(`participant_id.eq.${participant.id},user_id.eq.${user.id}`)
            .order('recorded_at', { ascending: false })
            .limit(1);

          const lastEntry = lastEntries?.[0];
          const lastValue = lastEntry?.value_int ?? 0;
          const lastCycle = lastEntry?.cycle_number ?? 0;
          const isWrap = lastEntry && value < lastValue && lastValue > 10;
          const cycleNumber = isWrap ? lastCycle + 1 : lastCycle;

          // Upsert: supprimer l'entrée d'aujourd'hui pour ce groupe/user
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
          await supabase.from('entries').delete()
            .eq('group_id', activeGroupId)
            .eq('user_id', user.id)
            .neq('source', 'starting_point')
            .gte('recorded_at', todayStart.toISOString())
            .lte('recorded_at', todayEnd.toISOString());

          await supabase.from('entries').insert({
            participant_id: participant.id,
            user_id: user.id,
            group_id: activeGroupId,
            owner_id: user.id,
            unit_type: 'hizb',
            value_int: value,
            cycle_number: cycleNumber,
            source: 'manual',
            recorded_at: new Date().toISOString(),
          });
          fetchEntries();
        }
      }

      setSaved(true);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Erreur sauvegarde position:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── History: entry for displayed week ───────────────────────────────────
  const { tue: displayTue, mon: displayMon, label: weekLabel } = getWeekBounds(histWeekOffset);
  const displayedEntry = personalEntries.find(e => {
    const t = new Date(e.recorded_at).getTime();
    return t >= displayTue.getTime() && t <= displayMon.getTime();
  }) ?? null;

  // ── Edit sheet save (upsert: delete week's entries, then insert) ─────────
  const handleEditSave = async () => {
    if (!user?.id || !activeGroupId) return;
    setEditSaving(true);
    try {
      const { data: participant } = await supabase
        .from('participants')
        .select('id, cycle_number')
        .eq('group_id', activeGroupId)
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle();
      if (!participant) return;

      const { tue, mon } = getWeekBounds(histWeekOffset);
      const isCurrentWeek = histWeekOffset === 0;
      const recordedAt = isCurrentWeek
        ? new Date().toISOString()
        : (() => { const m = new Date(mon); m.setHours(23, 59, 59, 999); return m.toISOString(); })();

      // Supprimer les entrées existantes de cette semaine pour ce groupe/user
      await supabase.from('entries').delete()
        .eq('group_id', activeGroupId)
        .eq('user_id', user.id)
        .neq('source', 'starting_point')
        .gte('recorded_at', tue.toISOString())
        .lte('recorded_at', mon.toISOString());

      // Trouver le cycle_number à partir de la dernière entrée avant cette semaine
      const lastBeforeWeek = personalEntries.find(
        e => new Date(e.recorded_at).getTime() < tue.getTime()
      );
      const prevCycle = lastBeforeWeek?.cycle_number ?? 0;
      const cycleNumber = editType === 'restart' ? prevCycle + 1 : prevCycle;

      await supabase.from('entries').insert({
        participant_id: participant.id,
        user_id: user.id,
        group_id: activeGroupId,
        owner_id: user.id,
        unit_type: 'hizb',
        value_int: editValue,
        cycle_number: cycleNumber,
        source: editType === 'starting_point' ? 'starting_point' : 'manual',
        is_restart: editType === 'restart',
        recorded_at: recordedAt,
      });

      setShowEditSheet(false);
      fetchEntries();
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Erreur correction:', err);
    } finally {
      setEditSaving(false);
    }
  };

  const openEdit = () => {
    setEditValue(displayedEntry?.value_int ?? value);
    setEditType('normal');
    setShowEditSheet(true);
  };

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const progress = value > 0 ? Math.round((value / maxValue) * 100) : 0;

  return (
    <div className="space-y-6 max-w-sm mx-auto pb-12">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {displayName ? `Salam, ${displayName}` : 'Accueil'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Enregistrez votre lecture du jour
        </p>
      </div>

      {/* Counter widget */}
      <div className="flex flex-col gap-8 pt-2">
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
          {todayLabel}
        </p>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>Hizb {value} / {maxValue}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => { setValue(v => Math.max(v - 1, 0)); setSaved(false); }}
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
              value={value}
              onChange={(e) => { setValue(Math.min(parseInt(e.target.value) || 0, maxValue)); setSaved(false); }}
              className="w-full text-center text-7xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <button
            onClick={() => { setValue(v => Math.min(v + 1, maxValue)); setSaved(false); }}
            disabled={value >= maxValue}
            className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-25 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="h-6 w-6" />
          </button>
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
          {saving ? 'Enregistrement…' : saved ? '✓ Position sauvegardée' : 'Mettre à jour ma position'}
        </button>

        {/* CTA groupe si pas encore dans un groupe */}
        {!activeGroupId && (
          <Link
            to="/groups"
            className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Rejoindre ou créer un groupe</p>
              <p className="text-xs opacity-70">Suivez votre progression avec d'autres</p>
            </div>
            <span className="text-slate-300 dark:text-slate-600">›</span>
          </Link>
        )}
      </div>

      {/* ── Historique personnel ─────────────────────────────────────────────── */}
      {user?.id && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          {/* Titre + navigation */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Historique
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHistWeekOffset(o => o - 1)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setHistWeekOffset(o => Math.min(o + 1, 0))}
                disabled={histWeekOffset >= 0}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Label semaine */}
          <p className={`text-xs font-medium mb-3 ${
            histWeekOffset === 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}>
            {histWeekOffset === 0 ? 'Semaine en cours' : `Semaine du ${weekLabel}`}
          </p>

          {/* Valeur + bouton correction */}
          <div className="flex items-end justify-between">
            <div>
              {displayedEntry ? (
                <>
                  <p className="text-5xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                    {displayedEntry.value_int}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    hizb atteint
                    {displayedEntry.is_restart && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                        Nouvelle khatma
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-300 dark:text-slate-600 leading-none">—</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Aucune entrée</p>
                </>
              )}
            </div>

            {activeGroupId && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-medium"
              >
                <Pencil className="h-3.5 w-3.5" />
                Corriger
              </button>
            )}
          </div>
        </div>
      )}

      {/* Carte groupe compact */}
      {activeGroupId && activeGroup && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-sm flex-shrink-0">
              {activeGroup.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{activeGroup.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Groupe actif</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/analytics"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Stats
            </Link>
            <Link
              to="/groups"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Groupe
            </Link>
          </div>
        </div>
      )}

      {/* ── Edit / Correction bottom sheet ──────────────────────────────────── */}
      {showEditSheet && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-[60]"
          onClick={() => setShowEditSheet(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-t-3xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="px-6 pt-3 pb-2">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Corriger une entrée
              </p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {histWeekOffset === 0 ? 'Semaine en cours' : `Semaine du ${weekLabel}`}
              </h3>
            </div>
            <div className="px-6 pb-10 space-y-5">
              {/* Stepper */}
              <div className="flex items-center justify-between gap-4 py-2">
                <button
                  onClick={() => setEditValue(v => Math.max(v - 1, 0))}
                  disabled={editValue <= 0}
                  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-25 active:scale-95 transition-all"
                >
                  <TrendingDown className="h-5 w-5" />
                </button>
                <div className="flex-1 text-center">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editValue || ''}
                    onChange={(e) => setEditValue(Math.max(0, Math.min(parseInt(e.target.value) || 0, 60)))}
                    className="w-full text-center text-7xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">Hizb atteint</p>
                </div>
                <button
                  onClick={() => setEditValue(v => Math.min(v + 1, 60))}
                  disabled={editValue >= 60}
                  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-25 active:scale-95 transition-all"
                >
                  <TrendingUp className="h-5 w-5" />
                </button>
              </div>

              {/* Type toggles */}
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'restart', 'starting_point'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setEditType(t)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all text-center ${
                      editType === t
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t === 'normal' ? 'Normal' : t === 'restart' ? 'Nouvelle khatma' : 'Point de départ'}
                  </button>
                ))}
              </div>
              {editType === 'starting_point' && (
                <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">
                  Point de départ : ne compte pas dans les statistiques, sert de référence.
                </p>
              )}
              {editType === 'restart' && (
                <p className="text-xs text-slate-400 dark:text-slate-500 -mt-1">
                  Nouvelle khatma : marque le début d'un nouveau cycle.
                </p>
              )}

              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="w-full py-4 rounded-2xl font-semibold text-base bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                {editSaving ? 'Enregistrement…' : 'Enregistrer la correction'}
              </button>
              <button
                onClick={() => setShowEditSheet(false)}
                className="w-full text-center text-sm text-slate-400 dark:text-slate-500 py-1"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
