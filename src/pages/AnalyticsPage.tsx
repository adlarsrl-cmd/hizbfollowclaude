import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Users,
} from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import {
  getWeekKeyTuesday,
  calculateWeeklyDeltas,
  calculateHizbRetard,
  parseWeekKeyTuesday
} from '../lib/utils';

// ── Rank badge colors ────────────────────────────────────────────────────────
function rankBadge(rank: number) {
  if (rank === 1) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: '🥇' };
  if (rank === 2) return { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', label: '🥈' };
  if (rank === 3) return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', label: '🥉' };
  return { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', label: String(rank) };
}

export default function AnalyticsPage() {
  const {
    participants,
    entries,
    fetchParticipants,
    fetchEntries,
    loading,
    currentUserRole,
    activeGroupId,
    user,
  } = useAppStore();

  const [analyticsMode, setAnalyticsMode] = useState<'personal' | 'group'>('personal');
  const isLoading = loading.participants || loading.entries;

  // All group data (loaded directly for group mode, bypasses role-based store filter)
  const [allGroupParticipants, setAllGroupParticipants] = useState<any[]>([]);
  const [allGroupEntries, setAllGroupEntries] = useState<any[]>([]);
  const [loadingGroupData, setLoadingGroupData] = useState(false);

  // Global hizb (cross-group) — source de vérité pour "hizb actuel" et "khatma n°X"
  const [globalCurrentHizb, setGlobalCurrentHizb]   = useState<number | null>(null);
  const [globalCurrentCycle, setGlobalCurrentCycle] = useState<number | null>(null);
  const [globalHizbByUser, setGlobalHizbByUser]     = useState<Record<string, number>>({});
  const [globalCycleByUser, setGlobalCycleByUser]   = useState<Record<string, number>>({});

  useEffect(() => {
    fetchParticipants();
    fetchEntries();
  }, []);

  // Fetch global current hizb + cycle for the logged-in user (no group filter)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('entries')
      .select('value_int, cycle_number')
      .eq('user_id', user.id)
      .neq('source', 'starting_point')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0] !== undefined) {
          setGlobalCurrentHizb(data[0].value_int);
          setGlobalCurrentCycle(data[0].cycle_number ?? 0);
        }
      });
  }, [user?.id]);

  // Load full group data when switching to group mode (bypasses role-based store filter)
  useEffect(() => {
    if (analyticsMode !== 'group' || !activeGroupId) return;
    setLoadingGroupData(true);

    supabase
      .from('participants')
      .select('*')
      .eq('group_id', activeGroupId)
      .eq('active', true)
      .order('created_at')
      .then(async ({ data: pData }) => {
        const allParts = pData || [];
        setAllGroupParticipants(allParts);

        // Load ALL entries for this group filtered by participant_id (covers real + ghost)
        const allParticipantIds = allParts.map(p => p.id);
        const userIds = allParts.map(p => p.user_id).filter(Boolean) as string[];

        if (allParticipantIds.length === 0) {
          setAllGroupEntries([]);
          setLoadingGroupData(false);
          return;
        }

        let query = supabase.from('entries').select('*').eq('group_id', activeGroupId);
        if (userIds.length > 0) {
          query = query.or(`user_id.in.(${userIds.join(',')}),participant_id.in.(${allParticipantIds.join(',')})`);
        } else {
          query = query.in('participant_id', allParticipantIds);
        }

        const { data: eData } = await query.order('recorded_at', { ascending: false });
        setAllGroupEntries(eData || []);

        // Fetch global latest hizb + cycle for each user (cross-group)
        if (userIds.length > 0) {
          const { data: gData } = await supabase
            .from('entries')
            .select('user_id, value_int, cycle_number')
            .in('user_id', userIds)
            .neq('source', 'starting_point')
            .order('recorded_at', { ascending: false });
          const hizbMap: Record<string, number> = {};
          const cycleMap: Record<string, number> = {};
          gData?.forEach((e: any) => {
            if (hizbMap[e.user_id] === undefined) {
              hizbMap[e.user_id] = e.value_int;
              cycleMap[e.user_id] = e.cycle_number ?? 0;
            }
          });
          setGlobalHizbByUser(hizbMap);
          setGlobalCycleByUser(cycleMap);
        }

        setLoadingGroupData(false);
      });
  }, [analyticsMode, activeGroupId]);

  // ── My participant (for personal mode) ────────────────────────────────────
  const myParticipant = useMemo(() => {
    // Try to find user's own participant by user_id
    const byUserId = participants.find(p => p.user_id === user?.id && p.active);
    if (byUserId) return byUserId;
    // For members, fallback to first participant (legacy)
    if (currentUserRole === 'member' && participants.length > 0) return participants[0];
    return null;
  }, [participants, user, currentUserRole]);

  // ── My stats (personal mode) ──────────────────────────────────────────────
  const myStats = useMemo(() => {
    if (!myParticipant) return null;
    const target = myParticipant.weekly_target_hizb || 7;
    const weeklyDeltas = calculateWeeklyDeltas(entries, myParticipant.id, myParticipant.user_id);
    const totalHizb = weeklyDeltas.reduce((s, w) => s + w.delta, 0);
    const khatmas = Math.floor(totalHizb / 60);
    const progressInCycle = totalHizb % 60;

    const last8 = weeklyDeltas.slice(-8);
    const weeklyAverage = last8.length
      ? Math.round((last8.reduce((s, w) => s + w.delta, 0) / last8.length) * 10) / 10
      : 0;
    const bestVal = weeklyDeltas.reduce((m, w) => Math.max(m, w.delta), 0);

    let currentStreak = 0;
    for (let i = weeklyDeltas.length - 1; i >= 0; i--) {
      if (weeklyDeltas[i].delta >= target) currentStreak++;
      else break;
    }

    const hizbRetard = calculateHizbRetard(entries, myParticipant.id, target, myParticipant.user_id);

    let prediction: string | null = null;
    if (weeklyAverage > 0) {
      const remaining = Math.max(0, 60 - progressInCycle);
      const weeksRemaining = Math.ceil(remaining / weeklyAverage);
      const d = new Date();
      d.setDate(d.getDate() + weeksRemaining * 7);
      prediction = d.toLocaleDateString('fr-FR');
    }

    return { khatmas, progressInCycle, weeklyAverage, bestVal, currentStreak, hizbRetard, prediction, target };
  }, [myParticipant, entries]);

  const myChartData = useMemo(() => {
    if (!myParticipant) return [];
    const weeklyDeltas = calculateWeeklyDeltas(entries, myParticipant.id, myParticipant.user_id);
    const deltaMap = new Map(weeklyDeltas.map(w => [w.week, w.delta]));
    const now = new Date();
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const anchor = new Date(now);
      anchor.setDate(anchor.getDate() - i * 7);
      const weekKey = getWeekKeyTuesday(anchor);
      const weekNum = weekKey.split('-W')[1]?.replace('-TUE', '') || '';
      const tue = parseWeekKeyTuesday(weekKey);
      weeks.push({
        label: tue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        value: deltaMap.get(weekNum) || 0
      });
    }
    return weeks;
  }, [myParticipant, entries]);

  // ── Group stats (group mode) — uses directly-loaded data ─────────────────
  const groupStats = useMemo(() => {
    const currentWeekNum = getWeekKeyTuesday(new Date()).split('-W')[1]?.replace('-TUE', '') || '';
    const prevDate = new Date(); prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekNum = getWeekKeyTuesday(prevDate).split('-W')[1]?.replace('-TUE', '') || '';

    return allGroupParticipants.map(participant => {
      const target = participant.weekly_target_hizb || 7;
      const weeklyDeltas = calculateWeeklyDeltas(allGroupEntries, participant.id, participant.user_id);
      const last8 = weeklyDeltas.slice(-8);

      // Current position: use latest non-starting_point entry directly (not cumulative)
      const latestGroupEntry = allGroupEntries
        .filter(e => e.participant_id === participant.id || (participant.user_id && e.user_id === participant.user_id))
        .filter(e => e.source !== 'starting_point')
        .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
      const currentHizb = latestGroupEntry?.value_int ?? 0;
      const currentCycle = latestGroupEntry?.cycle_number ?? 0;
      const weeklyAverage = last8.length
        ? Math.round((last8.reduce((s, w) => s + w.delta, 0) / last8.length) * 10) / 10
        : 0;
      let currentStreak = 0;
      for (let i = weeklyDeltas.length - 1; i >= 0; i--) {
        if (weeklyDeltas[i].delta >= target) currentStreak++;
        else break;
      }
      const hizbRetard = calculateHizbRetard(allGroupEntries, participant.id, target, participant.user_id);
      const weekDelta = weeklyDeltas.find(w => w.week === currentWeekNum)?.delta ?? 0;
      const prevWeekDelta = weeklyDeltas.find(w => w.week === prevWeekNum)?.delta ?? 0;
      return { participant, currentHizb, currentCycle, weeklyAverage, currentStreak, hizbRetard, target, weekDelta, prevWeekDelta };
    }).sort((a, b) => b.weeklyAverage - a.weeklyAverage);
  }, [allGroupParticipants, allGroupEntries]);

  // ── No group state ────────────────────────────────────────────────────────
  if (!activeGroupId) {
    return (
      <div className="flex flex-col items-center py-16 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
          <BarChart3 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Pas encore de groupe</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Rejoignez ou créez un groupe pour accéder aux statistiques.
        </p>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto px-4 pt-4 pb-12 flex flex-col gap-6">
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-2 rounded-full" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-12 flex flex-col gap-6">

      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stats</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {analyticsMode === 'personal' ? 'Ma progression' : 'Statistiques du groupe'}
          </p>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setAnalyticsMode('personal')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              analyticsMode === 'personal'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Moi
          </button>
          <button
            onClick={() => setAnalyticsMode('group')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              analyticsMode === 'group'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Groupe
          </button>
        </div>
      </div>

      {/* ── Personal mode ── */}
      {analyticsMode === 'personal' && (() => {
        const thisWeekDelta = myChartData[myChartData.length - 1]?.value ?? 0;
        const prevWeekDelta = myChartData[myChartData.length - 2]?.value ?? 0;
        const deltaVsPrev = thisWeekDelta - prevWeekDelta;

        return (
          <>
            {!myParticipant || !myStats ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-2xl">📊</div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Aucune donnée</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  Ajoutez des entrées pour voir vos statistiques.
                </p>
              </div>
            ) : (
              <>
                {/* Hero: current position */}
                <div className="bg-emerald-600 dark:bg-emerald-700 rounded-3xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
                        Hizb actuel
                      </p>
                      <p className="text-8xl font-black mt-1 leading-none tabular-nums">
                        {globalCurrentHizb ?? myStats.progressInCycle}
                      </p>
                      <p className="text-sm text-emerald-200 mt-2">
                        sur 60 · khatma n°{(globalCurrentCycle ?? myStats.khatmas) + 1}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 pt-1">
                      <p className="text-xs text-emerald-200 font-medium">Cette semaine</p>
                      <p className="text-5xl font-black mt-0.5 leading-none tabular-nums">
                        {thisWeekDelta}
                      </p>
                      {prevWeekDelta > 0 && (
                        <p className={`text-xs mt-1 font-semibold ${
                          deltaVsPrev > 0 ? 'text-white' : deltaVsPrev < 0 ? 'text-rose-200' : 'text-emerald-200'
                        }`}>
                          {deltaVsPrev > 0 ? `↑ +${deltaVsPrev}` : deltaVsPrev < 0 ? `↓ ${deltaVsPrev}` : '='} vs S-1
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {(() => {
                    const heroHizb = globalCurrentHizb ?? myStats.progressInCycle;
                    return (
                      <div className="mt-5 space-y-1.5">
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all"
                            style={{ width: `${Math.max(2, heroHizb / 60 * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-emerald-200">
                          <span>{Math.round(heroHizb / 60 * 100)}% du cycle en cours</span>
                          {myStats.prediction && <span>khatma le {myStats.prediction}</span>}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 3-col mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{myStats.weeklyAverage}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">hizb/sem moy.</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {myStats.currentStreak > 0 ? `${myStats.currentStreak}🔥` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">série</p>
                  </div>
                  <div className={`rounded-2xl p-3 text-center ${
                    myStats.hizbRetard.status === 'retard' ? 'bg-rose-50 dark:bg-rose-900/20' :
                    myStats.hizbRetard.status === 'avance' ? 'bg-blue-50 dark:bg-blue-900/20' :
                    'bg-emerald-50 dark:bg-emerald-900/20'
                  }`}>
                    <p className={`text-xl font-bold tabular-nums ${
                      myStats.hizbRetard.status === 'retard' ? 'text-rose-600 dark:text-rose-400' :
                      myStats.hizbRetard.status === 'avance' ? 'text-blue-600 dark:text-blue-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {myStats.hizbRetard.status === 'retard' ? `-${myStats.hizbRetard.retard}` :
                       myStats.hizbRetard.status === 'avance' ? `+${myStats.hizbRetard.retard}` : '✓'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {myStats.hizbRetard.status === 'retard' ? 'retard' :
                       myStats.hizbRetard.status === 'avance' ? 'avance' : 'à jour'}
                    </p>
                  </div>
                </div>

              </>
            )}
          </>
        );
      })()}

      {/* ── Group mode — Ramadan-style leaderboard ── */}
      {analyticsMode === 'group' && (
        <>
          {loadingGroupData ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse w-32" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded animate-pulse w-24" />
                    </div>
                    <div className="h-10 w-12 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : groupStats.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Aucun participant actif</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupStats.map(({ participant, currentHizb, currentCycle, weeklyAverage, currentStreak, hizbRetard, target, weekDelta, prevWeekDelta }, index) => {
                const rank = index + 1;
                const badge = rankBadge(rank);
                const isMe = participant.user_id === user?.id;
                const deltaVsPrev = weekDelta - prevWeekDelta;
                // For users with accounts: use global latest (cross-group); for ghosts: use per-group latest entry
                const heroHizb = (participant.user_id && globalHizbByUser[participant.user_id] !== undefined)
                  ? globalHizbByUser[participant.user_id]
                  : currentHizb;
                const heroKhatma = (participant.user_id && globalCycleByUser[participant.user_id] !== undefined)
                  ? globalCycleByUser[participant.user_id]
                  : currentCycle;
                return (
                  <div
                    key={participant.id}
                    className={`bg-white dark:bg-slate-800/50 rounded-2xl p-4 border transition-all ${
                      isMe
                        ? 'border-emerald-300 dark:border-emerald-700 shadow-md shadow-emerald-500/10'
                        : 'border-slate-100 dark:border-slate-700/50'
                    }`}
                  >
                    {/* Row 1: rank + name + current hizb + this week */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{participant.name}</p>
                          {isMe && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md flex-shrink-0">
                              vous
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          khatma n°{heroKhatma + 1} · obj {target} hizb/sem
                        </p>
                      </div>
                      {/* Focal numbers: current hizb + this week */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-baseline gap-1 justify-end">
                          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{heroHizb}</p>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-left leading-tight">
                            <p>hizb</p>
                            <p>actuel</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <p className={`text-xs font-semibold tabular-nums ${weekDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>
                            {weekDelta > 0 ? `+${weekDelta}` : '—'} sem.
                          </p>
                          {prevWeekDelta > 0 && weekDelta > 0 && (
                            <span className={`text-[10px] font-bold leading-none ${deltaVsPrev > 0 ? 'text-emerald-500' : deltaVsPrev < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                              {deltaVsPrev > 0 ? '↑' : deltaVsPrev < 0 ? '↓' : '='}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                        <span>Hizb {heroHizb} / 60</span>
                        <span>{Math.round(heroHizb / 60 * 100)}%</span>
                      </div>
                      <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.max(2, heroHizb / 60 * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="flex gap-1.5">
                      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2 text-center">
                        <p className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{weeklyAverage}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">moy/sem</p>
                      </div>
                      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2 text-center">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {currentStreak > 0 ? `${currentStreak}🔥` : '—'}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">série</p>
                      </div>
                      <div className={`flex-1 rounded-xl p-2 text-center ${
                        hizbRetard.status === 'retard' ? 'bg-rose-50 dark:bg-rose-900/20' :
                        hizbRetard.status === 'avance' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        'bg-emerald-50 dark:bg-emerald-900/20'
                      }`}>
                        <p className={`text-xs font-bold tabular-nums ${
                          hizbRetard.status === 'retard' ? 'text-rose-600 dark:text-rose-400' :
                          hizbRetard.status === 'avance' ? 'text-blue-600 dark:text-blue-400' :
                          'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {hizbRetard.status === 'retard' ? `-${hizbRetard.retard}` :
                           hizbRetard.status === 'avance' ? `+${hizbRetard.retard}` : '✓'}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {hizbRetard.status === 'retard' ? 'retard' : hizbRetard.status === 'avance' ? 'avance' : 'à jour'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
