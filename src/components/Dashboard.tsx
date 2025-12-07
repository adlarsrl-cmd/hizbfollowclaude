import React, { useEffect, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  Award,
  Calendar,
  Target,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { supabase } from '../lib/supabase';
import {
  getWeekKeyTuesday,
  parseWeekKeyTuesday,
  getWeekBoundsTuesday,
  calculateWeeklyDeltas
} from '../lib/utils';

export default function Dashboard() {
  const {
    participants,
    entries,
    fetchParticipants,
    fetchEntries,
    currentUserRole,
    user
  } = useAppStore();

  const isMember = currentUserRole === 'member' || currentUserRole === 'viewer';

  useEffect(() => {
    fetchParticipants();
    fetchEntries();
  }, []);

  const {
    kpis,
    weeklyProgressData,
    recentTop
  } = useMemo(() => {
    // participants actifs
    const active = participants.filter(p => p.active);

    // semaine er courante alignée mardi
    const now = new Date();
    const currentWeekKey = getWeekKeyTuesday(now);                 // ex: 2025-W43-TUE
    const currentTuesday = parseWeekKeyTuesday(currentWeekKey);    // Date du mardi
    const { start: weekStart, end: weekEnd } = getWeekBoundsTuesday(now);

    // index des deltas hebdo par participant sur la semaine courante
    const weekNum = currentWeekKey.split('-W')[1]?.replace('-TUE', '') || '';
    const perParticipantDelta = active.map(p => {
      const deltas = calculateWeeklyDeltas(entries, p.id); // [{week:'43', delta: X}, ...]
      const delta = deltas.find(d => d.week === weekNum)?.delta ?? 0;
      return { participant: p, delta };
    });

    // participants qui ont AU MOINS UNE saisie (peu importe delta) dans la semaine (mardi→lundi)
    const entriesThisWeek = entries.filter(e => {
      const t = new Date(e.recorded_at).getTime();
      return t >= weekStart.getTime() && t <= weekEnd.getTime();
    });
    const participantsWithEntryThisWeek = new Set(entriesThisWeek.map(e => e.participant_id));

    // KPIs
    const activeParticipants = active.length;
    const participantsWhoSubmitted = participantsWithEntryThisWeek.size; // saisies cette semaine (au moins une)
    const thisWeekTotal = perParticipantDelta.reduce((s, x) => s + x.delta, 0); // somme des deltas
    const participantsWithProgress = perParticipantDelta.filter(x => x.delta > 0).length;

    // Données graphe (barres = delta par participant)
    // For members: anonymize other participants' names
    const weeklyProgressData = perParticipantDelta
      .map(x => ({ 
        name: isMember && x.participant.user_id !== user?.id ? 'Autre participant' : x.participant.name, 
        value: x.delta, 
        participant_id: x.participant.id,
        isCurrentUser: x.participant.user_id === user?.id
      }))
      .sort((a, b) => b.value - a.value);

    // "Participants récents" = top 3 de la semaine par delta > 0
    const weekLabel = currentTuesday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const sorted = perParticipantDelta
      .filter(x => x.delta > 0)
      .sort((a, b) => b.delta - a.delta);
    
    // For members: find their rank and show anonymized leaderboard
    let recentTop = sorted.slice(0, 3);
    
    if (isMember) {
      const myRank = sorted.findIndex(x => x.participant.user_id === user?.id);
      recentTop = recentTop.map((x, i) => ({
        id: `${x.participant.id}-${currentWeekKey}`,
        participant: {
          ...x.participant,
          name: x.participant.user_id === user?.id ? '🎯 Vous' : `#${i + 1} Participant`
        },
        delta: x.delta,
        rank: i + 1,
        weekLabel,
        isCurrentUser: x.participant.user_id === user?.id,
        myActualRank: myRank + 1
      }));
    } else {
      recentTop = recentTop.map((x, i) => ({
        id: `${x.participant.id}-${currentWeekKey}`,
        participant: x.participant,
        delta: x.delta,
        rank: i + 1,
        weekLabel
      }));
    }

    return {
      kpis: {
        activeParticipants,
        participantsWhoSubmitted,
        thisWeekTotal,
        participantsWithProgress
      },
      weeklyProgressData,
      recentTop
    };
  }, [participants, entries]);

  const statCards = [
    {
      name: 'Participants actifs',
      value: kpis.activeParticipants,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      name: 'Saisies cette semaine',
      value: kpis.participantsWhoSubmitted,
      icon: Calendar,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      name: 'Total cette semaine (hizb)',
      value: kpis.thisWeekTotal,
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      name: 'Participants avec progression',
      value: kpis.participantsWithProgress,
      icon: Award,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    }
  ];

  // Fetch ALL participants count for member rank (without exposing data)
  const [allParticipantsStats, setAllParticipantsStats] = React.useState<{
    totalActive: number;
    myRank: number;
    myDelta: number;
  } | null>(null);

  React.useEffect(() => {
    if (!isMember || !user) return;

    const fetchRankStats = async () => {
      try {
        const { activeGroupId } = useAppStore.getState();
        if (!activeGroupId) return;

        // Fetch ALL participants count (just IDs and active status for counting)
        const { data: allParticipants } = await supabase
          .from('participants')
          .select('id, user_id, active')
          .eq('group_id', activeGroupId)
          .eq('active', true);

        if (!allParticipants) return;

        // Fetch ALL entries for ranking calculation
        const { data: allEntries } = await supabase
          .from('entries')
          .select('*')
          .eq('group_id', activeGroupId);

        if (!allEntries) return;

        // Calculate deltas for everyone
        const currentWeekKey = getWeekKeyTuesday(new Date());
        const weekNum = currentWeekKey.split('-W')[1]?.replace('-TUE', '') || '';

        const participantDeltas = allParticipants.map(p => {
          const deltas = calculateWeeklyDeltas(allEntries, p.id);
          const delta = deltas.find(d => d.week === weekNum)?.delta ?? 0;
          return { participant: p, delta };
        });

        const sorted = participantDeltas
          .filter(x => x.delta > 0)
          .sort((a, b) => b.delta - a.delta);

        const myRank = sorted.findIndex(x => x.participant.user_id === user.id);
        const myDelta = sorted.find(x => x.participant.user_id === user.id)?.delta ?? 0;

        setAllParticipantsStats({
          totalActive: allParticipants.length,
          myRank: myRank >= 0 ? myRank + 1 : 0,
          myDelta
        });
      } catch (error) {
        console.error('Error fetching rank stats:', error);
      }
    };

    fetchRankStats();
  }, [isMember, user, participants, entries]);

  // Calculate member's rank for the banner (legacy - kept for fallback)
  const myRankInfo = useMemo(() => {
    if (!isMember) return null;
    
    // Use the fetched stats if available
    if (allParticipantsStats) {
      return {
        rank: allParticipantsStats.myRank,
        total: allParticipantsStats.totalActive
      };
    }

    // Fallback to local calculation
    const sorted = participants
      .map(p => {
        const deltas = calculateWeeklyDeltas(entries, p.id);
        const currentWeekKey = getWeekKeyTuesday(new Date());
        const weekNum = currentWeekKey.split('-W')[1]?.replace('-TUE', '') || '';
        const delta = deltas.find(d => d.week === weekNum)?.delta ?? 0;
        return { participant: p, delta };
      })
      .filter(x => x.delta > 0)
      .sort((a, b) => b.delta - a.delta);
    
    const myRank = sorted.findIndex(x => x.participant.user_id === user?.id);
    const totalParticipants = sorted.length;
    
    return { rank: myRank + 1, total: totalParticipants };
  }, [isMember, participants, entries, user, allParticipantsStats]);

  return (
    <>
      <div className="space-y-6">
        {/* Member Rank Banner */}
        {isMember && myRankInfo && myRankInfo.rank > 0 && (
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">🏆 Votre classement cette semaine</h2>
                <p className="text-purple-100">
                  Vous êtes <span className="font-bold text-xl">{myRankInfo.rank}</span>ème sur {myRankInfo.total} participants actifs
                </p>
              </div>
              <Award className="h-12 w-12 text-purple-200" />
            </div>
          </div>
        )}

        {/* Welcome */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl shadow-emerald-500/20">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-3 tracking-tight">Bienvenue sur HizbFollow</h1>
            <p className="text-emerald-100 text-lg max-w-2xl font-light">
              {isMember 
                ? "Suivez votre progression personnelle dans la lecture du Saint Coran"
                : "Suivez votre progression et celle de votre groupe dans la lecture du Saint Coran"
              }
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <div key={stat.name} className="glass-panel rounded-2xl p-6 card-hover">
              <div className="flex items-center">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Progress Chart */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg mr-3">
                <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Progression cette semaine
            </h3>

            {weeklyProgressData.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Aucune progression cette semaine
                </p>
                {currentUserRole !== 'member' && (
                  <Link
                    to="/entry"
                    className="inline-flex items-center mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Faire une saisie
                  </Link>
                )}
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyProgressData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                    />
                    <YAxis
                      label={{ value: 'hizb', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value} hizb`, 'Lu cette semaine']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      name="Lu cette semaine"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Summary below chart */}
            {weeklyProgressData.length > 0 && (
              <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                Total cette semaine:{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {weeklyProgressData.reduce((sum, p) => sum + p.value, 0)} hizb
                </span>{' '}
                • Participants avec progression:{' '}
                <span className="font-semibold">
                  {weeklyProgressData.filter(p => p.value > 0).length}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions & Top Participants */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Actions rapides
              </h3>
              <div className="space-y-3">
                {currentUserRole !== 'member' && (
                  <Link
                    to="/entry"
                    className="flex items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:border-emerald-200 dark:hover:border-emerald-800 border border-transparent transition-all group"
                  >
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="ml-3 font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Saisie hebdomadaire</span>
                  </Link>
                )}
                <Link
                  to="/monthly"
                  className="flex items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/10 hover:border-teal-200 dark:hover:border-teal-800 border border-transparent transition-all group"
                >
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="ml-3 font-medium text-slate-700 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-300">Saisie mensuelle</span>
                </Link>
                <Link
                  to="/analytics"
                  className="flex items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-200 dark:hover:border-purple-800 border border-transparent transition-all group"
                >
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="ml-3 font-medium text-slate-700 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">Voir analytics</span>
                </Link>
              </div>
            </div>

            {/* Top Participants (semaine) */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Participants récents
              </h3>
              <div className="space-y-4">
                {recentTop.length > 0 ? recentTop.map((row: any, idx) => {
                  const medals = ['🥇','🥈','🥉'];
                  return (
                    <div key={`${row.participant?.id || idx}-top`} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{medals[idx] || '✅'}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {row.participant?.name || 'Participant'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +{row.delta} hizb
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Semaine du {row.weekLabel || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Aucune progression cette semaine
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>{/* grid */}
      </div>
    </>
  );
}
