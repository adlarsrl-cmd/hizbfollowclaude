import { useState, useEffect, useMemo, useCallback } from 'react';
import { Star, Minus, Plus, ChevronDown, BookOpen } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import type { RamadanEntry } from '../types';

// Point de départ du suivi Ramadan 1447
const RAMADAN_LABEL = 'Ramadan 1447';

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00'); // treat as local date
  const now = new Date();
  const diffMs = now.setHours(0,0,0,0) - date.setHours(0,0,0,0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/**
 * Calcule les stats Ramadan à partir des saisies quotidiennes.
 * La première entrée est le point de départ (baseline), chaque entrée suivante
 * génère un delta. Une khatma = 60 hizb cumulés.
 */
function computeRamadanStats(entries: RamadanEntry[], participantId: string, userId?: string) {
  const relevant = entries
    .filter(e => userId && e.user_id ? e.user_id === userId : e.participant_id === participantId);

  // Dédupliquer par date : si le user a plusieurs entrées le même jour (depuis des groupes
  // différents), on garde celle avec le updated_at le plus récent pour éviter les faux
  // wrap-arounds qui compteraient des khatmas fictives.
  const byDate = new Map<string, RamadanEntry>();
  for (const e of relevant) {
    const existing = byDate.get(e.recorded_date);
    if (!existing || e.updated_at > existing.updated_at) byDate.set(e.recorded_date, e);
  }
  const sorted = [...byDate.values()].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date));

  if (sorted.length === 0) return { ramadanTotal: 0, ramadanKhatmas: 0, lastHizb: null, lastDate: null };
  if (sorted.length === 1) return { ramadanTotal: 0, ramadanKhatmas: 0, lastHizb: sorted[0].hizb_position, lastDate: sorted[0].recorded_date };

  let total = 0;
  let prev = sorted[0].hizb_position;
  for (let i = 1; i < sorted.length; i++) {
    let delta = sorted[i].hizb_position - prev;
    if (delta < 0) delta += 60; // khatma complétée
    total += delta;
    prev = sorted[i].hizb_position;
  }

  return {
    ramadanTotal: total,
    ramadanKhatmas: Math.floor(total / 60),
    lastHizb: sorted[sorted.length - 1].hizb_position,
    lastDate: sorted[sorted.length - 1].recorded_date,
  };
}

export default function RamadanPage() {
  const { activeGroupId, currentUserRole, user } = useAppStore();

  // ── Data ────────────────────────────────────────────────────────────────
  const [allParticipants, setAllParticipants]   = useState<any[]>([]);
  const [ramadanEntries, setRamadanEntries]     = useState<RamadanEntry[]>([]);
  const [pageLoading, setPageLoading]           = useState(true);

  // ── Input form ──────────────────────────────────────────────────────────
  const [inputParticipantId, setInputParticipantId] = useState('');
  const [inputHizb, setInputHizb]   = useState(0);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [showKhatmaModal, setShowKhatmaModal] = useState(false);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // ── Fetch ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!activeGroupId) return;

    const { data: parts } = await supabase
      .from('participants')
      .select('*')
      .eq('group_id', activeGroupId)
      .eq('active', true)
      .order('created_at', { ascending: true });

    setAllParticipants(parts || []);

    // Fetch ramadan_entries cross-groupe via user_id des participants
    const participantUserIds = parts?.map(p => p.user_id).filter(Boolean) as string[] || [];
    const ghostParticipantIds = parts?.filter(p => !p.user_id).map(p => p.id) || [];

    let ramadanQuery = supabase
      .from('ramadan_entries')
      .select('*')
      .order('recorded_date', { ascending: true });

    if (participantUserIds.length > 0 && ghostParticipantIds.length > 0) {
      ramadanQuery = ramadanQuery.or(
        `user_id.in.(${participantUserIds.join(',')}),participant_id.in.(${ghostParticipantIds.join(',')})`
      );
    } else if (participantUserIds.length > 0) {
      ramadanQuery = ramadanQuery.in('user_id', participantUserIds);
    } else if (ghostParticipantIds.length > 0) {
      ramadanQuery = ramadanQuery.in('participant_id', ghostParticipantIds);
    } else {
      setRamadanEntries([]);
      return;
    }

    const { data: ents } = await ramadanQuery;
    setRamadanEntries(ents || []);
  }, [activeGroupId]);

  useEffect(() => {
    setPageLoading(true);
    loadData().finally(() => setPageLoading(false));
  }, [loadData]);

  // ── Derived: current user's participant ──────────────────────────────────
  const myParticipant = useMemo(() => {
    if (currentUserRole !== 'member' && currentUserRole !== 'viewer') return null;
    return allParticipants.find(p => p.user_id === user?.id) ?? null;
  }, [allParticipants, currentUserRole, user]);

  // Auto-select member's participant on load
  useEffect(() => {
    if (myParticipant) setInputParticipantId(myParticipant.id);
  }, [myParticipant]);

  // ── Today's entry for selected participant ───────────────────────────────
  const todayEntry = useMemo(() => {
    const candidates = ramadanEntries.filter(e =>
      (myParticipant?.user_id
        ? e.user_id === myParticipant.user_id
        : e.participant_id === inputParticipantId
      ) && e.recorded_date === today
    );
    // Si plusieurs entrées aujourd'hui (multi-groupes), prendre la plus récente
    return candidates.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? undefined;
  }, [ramadanEntries, inputParticipantId, myParticipant, today]);

  // Pre-fill input with today's or last recorded value
  useEffect(() => {
    if (!inputParticipantId) return;
    if (todayEntry) {
      setInputHizb(todayEntry.hizb_position);
    } else {
      // Dédupliquer par date avant de prendre la dernière
      const userEntries = ramadanEntries
        .filter(e => myParticipant?.user_id
          ? e.user_id === myParticipant.user_id
          : e.participant_id === inputParticipantId);
      const byDate = new Map<string, RamadanEntry>();
      for (const e of userEntries) {
        const existing = byDate.get(e.recorded_date);
        if (!existing || e.updated_at > existing.updated_at) byDate.set(e.recorded_date, e);
      }
      const last = [...byDate.values()].sort((a, b) => b.recorded_date.localeCompare(a.recorded_date))[0];
      setInputHizb(last?.hizb_position ?? 0);
    }
    setSaved(false);
  }, [inputParticipantId, todayEntry]);

  // ── Leaderboard stats ────────────────────────────────────────────────────
  const participantStats = useMemo(() =>
    allParticipants
      .map(p => ({ p, ...computeRamadanStats(ramadanEntries, p.id, p.user_id) }))
      .sort((a, b) => {
        if (b.ramadanKhatmas !== a.ramadanKhatmas) return b.ramadanKhatmas - a.ramadanKhatmas;
        return b.ramadanTotal - a.ramadanTotal;
      }),
    [allParticipants, ramadanEntries]
  );

  const groupStats = useMemo(() => ({
    totalKhatmas:   participantStats.reduce((s, p) => s + p.ramadanKhatmas, 0),
    totalHizb:      participantStats.reduce((s, p) => s + p.ramadanTotal, 0),
    activeCount:    participantStats.filter(p => p.lastDate !== null).length,
  }), [participantStats]);

  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!inputParticipantId || !activeGroupId) return;
    setSaving(true);
    try {
      // 1. Sauvegarder dans ramadan_entries
      if (todayEntry) {
        await supabase
          .from('ramadan_entries')
          .update({ hizb_position: inputHizb, updated_at: new Date().toISOString() })
          .eq('id', todayEntry.id);
      } else {
        await supabase.from('ramadan_entries').insert({
          group_id: activeGroupId,
          participant_id: inputParticipantId,
          hizb_position: inputHizb,
          recorded_date: today,
        });
      }

      // 2. Mise à jour de la position courante (source de vérité partagée)
      await supabase
        .from('participants')
        .update({ current_hizb: inputHizb })
        .eq('id', inputParticipantId);

      // 3. Synchroniser avec entries (saisie régulière) pour que toutes les vues
      //    (mensuelle, hebdo, personnel) reflètent la même position.
      //    Upsert : mettre à jour l'entrée d'aujourd'hui si elle existe, sinon en créer une.
      const selectedParticipant = allParticipants.find(p => p.id === inputParticipantId);
      const todayStart = today + 'T00:00:00.000Z';
      const todayEnd   = today + 'T23:59:59.999Z';

      const existingEntryQuery = selectedParticipant?.user_id
        ? supabase.from('entries').select('id').eq('user_id', selectedParticipant.user_id)
            .gte('recorded_at', todayStart).lte('recorded_at', todayEnd).limit(1)
        : supabase.from('entries').select('id').eq('participant_id', inputParticipantId)
            .gte('recorded_at', todayStart).lte('recorded_at', todayEnd).limit(1);

      const { data: existingEntries } = await existingEntryQuery;
      const todayNoon = today + 'T12:00:00.000Z';

      if (existingEntries && existingEntries.length > 0) {
        await supabase.from('entries')
          .update({ value_int: inputHizb, recorded_at: todayNoon })
          .eq('id', existingEntries[0].id);
      } else {
        await supabase.from('entries').insert({
          group_id: activeGroupId,
          participant_id: inputParticipantId,
          user_id: selectedParticipant?.user_id ?? null,
          unit_type: 'hizb',
          value_int: inputHizb,
          recorded_at: todayNoon,
        });
      }

      await loadData();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'manager';
  const canInput = isAdmin
    ? allParticipants.length > 0
    : myParticipant !== null;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-12 space-y-6">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-12 space-y-6">

      {/* ── Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
        <div className="absolute -top-4 -right-4 opacity-10 select-none pointer-events-none text-[140px] leading-none">☪</div>
        <div className="absolute top-6 right-16 opacity-20 flex gap-1">
          <Star className="h-2 w-2 fill-white text-white" />
          <Star className="h-3 w-3 fill-white text-white" />
          <Star className="h-2 w-2 fill-white text-white" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-widest">Spécial {RAMADAN_LABEL}</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight mb-1" style={{ fontFamily: 'serif' }}>
            رَمَضَان مُبَارَك
          </h1>
          <p className="text-emerald-100 text-sm">
            Saisie quotidienne · {allParticipants.length} participant{allParticipants.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Saisie du jour ──────────────────────────────────────────── */}
      {canInput && (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">
                Saisie du jour
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            {todayEntry && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                ✓ Saisi aujourd'hui
              </span>
            )}
          </div>

          {/* Participant selector — admins only */}
          {isAdmin && (
            <div className="relative mb-4">
              <select
                value={inputParticipantId}
                onChange={e => setInputParticipantId(e.target.value)}
                className="w-full appearance-none bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl px-4 py-3 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 border-none"
              >
                <option value="">Choisir un participant</option>
                {allParticipants.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Member: just show their name */}
          {!isAdmin && myParticipant && (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
              {myParticipant.name}
            </p>
          )}

          {/* Hizb counter */}
          {inputParticipantId && (
            <>
              <div className="flex items-center justify-between gap-4 mb-4">
                <button
                  onClick={() => { setInputHizb(v => Math.max(0, v - 1)); setSaved(false); }}
                  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <div className="flex-1 text-center">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={inputHizb || ''}
                    onChange={e => { setInputHizb(Math.min(60, Math.max(0, parseInt(e.target.value) || 0))); setSaved(false); }}
                    className="w-full text-center text-6xl font-black text-slate-900 dark:text-white bg-transparent border-none outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">hizb actuel · /60</p>
                </div>
                <button
                  onClick={() => {
                    if (inputHizb >= 60) {
                      setShowKhatmaModal(true);
                    } else {
                      setInputHizb(v => v + 1);
                      setSaved(false);
                    }
                  }}
                  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] ${
                  saved
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40'
                }`}
              >
                {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : todayEntry ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Group stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Khatmas groupe</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{groupStats.totalKhatmas}</p>
          <div className="flex justify-center mt-1 gap-0.5">
            {Array.from({ length: Math.min(groupStats.totalKhatmas, 5) }).map((_, i) => (
              <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Participants actifs</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{groupStats.activeCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">/ {allParticipants.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Hizb ce Ramadan</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{groupStats.totalHizb}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">groupe total</p>
        </div>
      </div>

      {/* ── Leaderboard ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Classement Ramadan
        </p>

        {allParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🌙</div>
            <p className="text-slate-500 dark:text-slate-400">Aucun participant actif</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {participantStats.map(({ p, ramadanTotal, ramadanKhatmas, lastHizb, lastDate }, index) => (
              <div
                key={p.id}
                className={`relative bg-white dark:bg-slate-800/50 rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg ${
                  index === 0
                    ? 'border-amber-200 dark:border-amber-800/50 hover:shadow-amber-500/10'
                    : 'border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-emerald-500/5'
                }`}
              >
                {/* Rank */}
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                  : index === 1 ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                  : index === 2 ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-slate-50 text-slate-300 dark:bg-slate-700/50 dark:text-slate-500'
                }`}>
                  {index + 1}
                </div>

                {/* Avatar + Name + Khatma stars */}
                <div className="flex items-center gap-3 mb-5 pr-8">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                    index === 0
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  }`}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm leading-tight">{p.name}</h3>
                    <div className="flex items-center gap-0.5 mt-1">
                      {ramadanKhatmas > 0 ? (
                        <>
                          {Array.from({ length: Math.min(ramadanKhatmas, 5) }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                          {ramadanKhatmas > 5 && <span className="text-[10px] text-amber-500 font-bold ml-0.5">+{ramadanKhatmas - 5}</span>}
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold ml-1">{ramadanKhatmas}× ce Ramadan</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Current hizb — focal point (from cross-group deduplicated stats) */}
                <div className="text-center py-3 mb-4">
                  {lastHizb != null ? (
                    <>
                      <p className="text-6xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                        {lastHizb}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium uppercase tracking-widest">
                        hizb actuel
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">Pas encore de saisie</p>
                  )}
                </div>

                {/* Footer: last date + Ramadan total */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Dernière saisie</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {lastDate ? relativeDate(lastDate) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Ce Ramadan</p>
                    <p className={`text-sm font-bold ${
                      ramadanTotal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {ramadanTotal > 0 ? `+${ramadanTotal} hizb` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>

      {/* ── Khatma confirmation modal ─────────────────────────────── */}

      {showKhatmaModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowKhatmaModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-amber-500" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-1">
              Khatma complétée ?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-1">
              Vous avez atteint le hizb 60.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              Confirmez-vous avoir terminé une khatma du Coran ?
            </p>

            {/* Arabic blessing */}
            <p className="text-center text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-6" dir="rtl">
              بَارَكَ اللَّهُ فِيكَ
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setInputHizb(1);
                  setSaved(false);
                  setShowKhatmaModal(false);
                }}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                Oui, الحمد لله !
              </button>
              <button
                onClick={() => setShowKhatmaModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                Non, pas encore
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
