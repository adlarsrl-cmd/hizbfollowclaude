import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  Download,
  Eye,
  EyeOff,
  Target,
  Award,
  Zap,
  TrendingDown,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { useAppStore } from '../stores/useAppStore';
import { EditHistoryButton } from '../components/analytics/EditHistoryButton';
import {
  getWeekKeyTuesday,
  toCSV,
  calculateWeeklyDeltas,
  calculateMonthlyAverages,
  calculateHizbRetard,
  parseWeekKeyTuesday
} from '../lib/utils';

export default function AnalyticsPage() {
  const {
    participants,
    entries,
    currentUnit,
    fetchParticipants,
    fetchEntries
  } = useAppStore();

  // état sélection participants
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  // visibilité tableaux
  const [showWeeklyTable, setShowWeeklyTable] = useState(true);
  const [showMonthlyTable, setShowMonthlyTable] = useState(true);

  // sélections mois/périodes
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const [weeklyReadingsMode, setWeeklyReadingsMode] = useState<'month' | 'weeks'>('month');
  const [weeklyReadingsPeriod, setWeeklyReadingsPeriod] = useState<2 | 4 | 8 | 12>(8);

  const [comparisonMode, setComparisonMode] = useState(false);
  const [weeklyPeriod, setWeeklyPeriod] = useState<4 | 6 | 8 | 12 | 16>(8);

  // plage pour tableau mensuel
  const [monthlyFromDate, setMonthlyFromDate] = useState(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return `${sixMonthsAgo.getFullYear()}-${(sixMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [monthlyToDate, setMonthlyToDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchParticipants();
    fetchEntries();
  }, []);

  // init sélection quand les participants arrivent
  useEffect(() => {
    if (participants.length > 0 && selectedParticipantIds.length === 0) {
      setSelectedParticipantIds(participants.filter(p => p.active).map(p => p.id));
    }
  }, [participants]);

  // indexations pour perfs basées sur entries
  const { byParticipant, monthsSet } = useMemo(() => {
    const byParticipant = new Map<string, any[]>();
    const monthsSet = new Set<string>();

    for (const entry of entries as any[]) {
      if (!byParticipant.has(entry.participant_id)) byParticipant.set(entry.participant_id, []);
      byParticipant.get(entry.participant_id)!.push(entry);

      const d = new Date(entry.recorded_at);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).toString().padStart(2, '0')}`);
    }
    for (const arr of byParticipant.values()) {
      arr.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    }
    return { byParticipant, monthsSet };
  }, [entries]);

  // participants filtrés
  const filteredParticipants = useMemo(
    () => participants.filter(p => selectedParticipantIds.includes(p.id) && p.active),
    [participants, selectedParticipantIds]
  );

  // mois disponibles
  const availableMonths = useMemo(() => {
    return Array.from(monthsSet).sort().reverse();
  }, [monthsSet]);

  // handlers sélection participants
  const handleSelectAll = () => {
    setSelectedParticipantIds(participants.filter(p => p.active).map(p => p.id));
  };
  const handleResetAll = () => setSelectedParticipantIds([]);
  const toggleParticipant = (pid: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  // données mensuelles (classement par moyenne)
  const monthlyData = useMemo(() => {
    if (!selectedMonth) return [];

    return filteredParticipants
      .map(participant => {
        const average = calculateMonthlyAverages(entries, participant.id, selectedMonth);

        return {
          name: participant.name,
          participant_id: participant.id,
          average: Math.round(average * 10) / 10,
          total: Math.round(average * 4.33 * 10) / 10, // Approximate monthly total
          weeks: 4 // Approximate weeks per month
        };
      })
      .sort((a, b) => b.average - a.average);
  }, [filteredParticipants, entries, selectedMonth]);

  // données hebdo pour graph (par mois OU dernières X semaines)
  const weeklyData = useMemo(() => {
    const buildForWeeks = (weeks: { weekKey: string; date: string; fullDate: Date }[]) => {
      const chartData = filteredParticipants.map(participant => {
        const row: any = { name: participant.name, participant_id: participant.id };
        const weeklyDeltas = calculateWeeklyDeltas(entries, participant.id);
        const deltaMap = new Map(weeklyDeltas.map(w => [w.week, w.delta]));

        weeks.forEach(week => {
          const weekNumber = week.weekKey.split('-W')[1]?.replace('-TUE', '') || '';
          row[week.date] = deltaMap.get(weekNumber) || 0;
        });
        return row;
      });
      return { chartData, weeks };
    };

    if (weeklyReadingsMode === 'month') {
      if (!selectedMonth) return { chartData: [], weeks: [] as any[] };
      const [year, month] = selectedMonth.split('-').map(Number);

      // construit la liste des mardis du mois sélectionné (aligné mardi)
      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      const cur = new Date(first);
      // calage semaine ISO (lundi) puis mardi
      cur.setDate(cur.getDate() - cur.getDay() + 1);
      const weeks: any[] = [];
      while (cur <= last) {
        const tue = new Date(cur);
        tue.setDate(tue.getDate() + 1);
        const weekKey = getWeekKeyTuesday(tue);
        weeks.push({
          weekKey,
          date: tue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          fullDate: tue
        });
        cur.setDate(cur.getDate() + 7);
      }
      return buildForWeeks(weeks);
    } else {
      const now = new Date();
      const weeks: any[] = [];
      for (let i = weeklyReadingsPeriod - 1; i >= 0; i--) {
        const anchor = new Date(now);
        anchor.setDate(anchor.getDate() - i * 7);
        const weekKey = getWeekKeyTuesday(anchor);
        // ✅ mardi réel correspondant à la clé
        const tue = parseWeekKeyTuesday(weekKey);

        weeks.push({
          weekKey,
          date: tue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          fullDate: tue
        });
      }
      return buildForWeeks(weeks);
    }
  }, [filteredParticipants, entries, selectedMonth, weeklyReadingsMode, weeklyReadingsPeriod]);

  // tableau hebdo (timeline/heatmap/table)
  const weeklyTableData = useMemo(() => {
    const now = new Date();
    const weeks: any[] = [];
    for (let i = weeklyPeriod - 1; i >= 0; i--) {
      const anchor = new Date(now);
      anchor.setDate(anchor.getDate() - i * 7);
      const weekKey = getWeekKeyTuesday(anchor);
      // ✅ mardi réel
      const tue = parseWeekKeyTuesday(weekKey);
      weeks.push({
        weekKey,
        date: tue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      });
    }

    return filteredParticipants.map(participant => {
      const row: any = {
        name: participant.name,
        participant_id: participant.id,
        target: participant.weekly_target_hizb || 7
      };
      const weeklyDeltas = calculateWeeklyDeltas(entries, participant.id);
      const deltaMap = new Map(weeklyDeltas.map(w => [w.week, w.delta]));

      weeks.forEach(week => {
        const weekNumber = week.weekKey.split('-W')[1]?.replace('-TUE', '') || '';
        row[week.date] = deltaMap.get(weekNumber) || 0;
      });

      return { participant, data: row, weeks };
    });
  }, [filteredParticipants, entries, weeklyPeriod]);

  // tableau mensuel (moyennes)
  const monthlyTableData = useMemo(() => {
    const fromDate = new Date(monthlyFromDate + '-01');
    const toDate = new Date(monthlyToDate + '-01');

    const months: string[] = [];
    const cur = new Date(fromDate);
    while (cur <= toDate) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }

    return filteredParticipants.map(participant => {
      const row: any = {
        name: participant.name,
        participant_id: participant.id,
        target: participant.weekly_target_hizb || 7
      };

      months.forEach(monthKey => {
        const average = calculateMonthlyAverages(entries, participant.id, monthKey);
        row[monthKey] = Math.round(average * 100) / 100;
      });

      return { participant, data: row, months };
    });
  }, [filteredParticipants, entries, monthlyFromDate, monthlyToDate]);

  // stats d'en-tête rapides (facultatifs)
  const headerStats = useMemo(() => {
    const active = participants.filter(p => p.active).length;
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    let total = 0;
    let count = 0;
    for (const arr of byParticipant.values()) {
      for (const entry of arr) {
        if (new Date(entry.recorded_at) >= monday) {
          total += entry.value_int; // approximation simple
          count++;
        }
      }
    }
    return { activeParticipants: active, thisWeekEntries: count, thisWeekTotal: total };
  }, [participants, byParticipant]);

  // export CSV (classement mensuel)
  const exportCSV = () => {
    const data = monthlyData.map(item => ({
      participant: item.name,
      average: item.average,
      total: item.total,
      weeks: item.weeks
    }));
    const csv = toCSV(data, ['participant', 'average', 'total', 'weeks']);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const colors = ['#059669', '#0891b2', '#7c3aed', '#dc2626', '#ea580c', '#ca8a04', '#0ea5e9', '#16a34a'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyse détaillée des progressions en {currentUnit}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={exportCSV} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Sélection participants */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            <Users className="inline h-5 w-5 mr-2" />
            Sélection des participants
          </h2>
          <div className="flex gap-2">
            <button onClick={handleSelectAll} className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm">
              Tout sélectionner
            </button>
            <button onClick={handleResetAll} className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {participants.filter(p => p.active).map(p => (
            <button
              key={p.id}
              onClick={() => toggleParticipant(p.id)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedParticipantIds.includes(p.id)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {selectedParticipantIds.length} participant(s) sélectionné(s) sur {participants.filter(p => p.active).length}
        </div>
      </div>

      {/* Tableau hebdo (timeline/heatmap/table) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📊 Évolution par semaine</h2>
            <button
              onClick={() => setShowWeeklyTable(!showWeeklyTable)}
              className="flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {showWeeklyTable ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showWeeklyTable ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Période:</label>
            <select
              value={weeklyPeriod}
              onChange={(e) => setWeeklyPeriod(Number(e.target.value) as any)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value={4}>4 semaines</option>
              <option value={6}>6 semaines</option>
              <option value={8}>8 semaines</option>
              <option value={12}>12 semaines</option>
              <option value={16}>16 semaines</option>
            </select>
          </div>
        </div>

        {showWeeklyTable && (
          <>
            {/* Heatmap colorée avec tendances */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded" /><span className="text-gray-600 dark:text-gray-400">Objectif atteint</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded" /><span className="text-gray-600 dark:text-gray-400">Progression moyenne</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded" /><span className="text-gray-600 dark:text-gray-400">Faible progression</span></div>
              </div>

              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex mb-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                    <div className="w-40 p-2 font-semibold text-gray-900 dark:text-white">Participant</div>
                    <div className="w-16 p-2 text-center font-semibold text-gray-900 dark:text-white text-xs">Obj.</div>
                    {weeklyTableData[0]?.weeks.map((w: any) => (
                      <div key={w.weekKey} className="w-14 p-2 text-center font-semibold text-gray-900 dark:text-white text-xs">
                        {w.date}
                      </div>
                    ))}
                    <div className="w-16 p-2 text-center font-semibold text-gray-900 dark:text-white text-xs">Moy.</div>
                    <div className="w-24 p-2 text-center font-semibold text-gray-900 dark:text-white text-xs">Tendance</div>
                  </div>

                  {weeklyTableData.map(({ participant, data, weeks }) => (
                    <div key={participant.id} className="flex mb-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1 transition-colors">
                      <div className="w-40 p-2 font-medium text-gray-900 dark:text-white truncate flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold mr-3">
                          {participant.name.charAt(0)}
                        </div>
                        {participant.name}
                      </div>
                      <div className="w-16 p-2 text-center text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md flex items-center justify-center font-semibold">
                        {data.target}
                      </div>
                      {weeks.map((w: any) => {
                        const value = data[w.date] || 0;
                        const cls =
                          value >= data.target ? 'bg-green-500 text-white' :
                          value >= data.target * 0.5 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white';
                        return (
                          <div key={w.weekKey} className="w-14 p-1">
                            <div className={`${cls} rounded-lg text-center text-xs font-bold py-2 relative group shadow-sm hover:shadow-md transition-shadow`}>
                              {value}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                                <div className="font-semibold">{w.date}</div>
                                <div>{value} hizb {value >= data.target ? '🟢' : value >= data.target * 0.5 ? '🟡' : '🔴'}</div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="w-16 p-2 text-center text-xs font-semibold text-gray-900 dark:text-white flex items-center justify-center">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1">
                          {(weeks.reduce((s: number, w: any) => s + (data[w.date] || 0), 0) / Math.max(1, weeks.length)).toFixed(1)}
                        </div>
                      </div>
                      <div className="w-24 p-2 text-center text-xs flex items-center justify-center">
                        {(() => {
                          const values = weeks.map((w: any) => data[w.date] || 0);
                          const mid = Math.floor(values.length / 2);
                          const firstAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid);
                          const secondAvg = values.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, values.length - mid);
                          if (secondAvg > firstAvg * 1.1) return <span className="text-green-600 dark:text-green-400 font-semibold">↗️ Hausse</span>;
                          if (secondAvg < firstAvg * 0.9) return <span className="text-red-600 dark:text-red-400 font-semibold">↘️ Baisse</span>;
                          return <span className="text-gray-600 dark:text-gray-400 font-semibold">➡️ Stable</span>;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Moyennes mensuelles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📊 Moyennes mensuelles</h2>
            <button
              onClick={() => setShowMonthlyTable(!showMonthlyTable)}
              className="flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {showMonthlyTable ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showMonthlyTable ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">De:</label>
              <input
                type="month"
                value={monthlyFromDate}
                onChange={(e) => setMonthlyFromDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">À:</label>
              <input
                type="month"
                value={monthlyToDate}
                onChange={(e) => setMonthlyToDate(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {showMonthlyTable && (
          <>
            <div className="flex items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded" /><span className="text-gray-600 dark:text-gray-400">Objectif atteint</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded" /><span className="text-gray-600 dark:text-gray-400">Progression moyenne</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded" /><span className="text-gray-600 dark:text-gray-400">Faible progression</span></div>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex mb-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                  <div className="w-40 p-2 font-semibold text-gray-900 dark:text-white">Participant</div>
                  <div className="w-16 p-2 text-center font-semibold text-gray-900 dark:text-white text-xs">Obj.</div>
                  {monthlyTableData[0]?.months.map((month: string) => {
                    const [y, m] = month.split('-').map(Number);
                    const monthName = new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
                    return (
                      <div key={month} className="w-16 p-2 text-center font-semibold text-gray-900 dark:text-white text-xs">
                        {monthName}
                      </div>
                    );
                  })}
                  <div className="w-24 p-2 text-center font-semibold text-gray-900 dark:text-white text-xs">Tendance</div>
                </div>

                {monthlyTableData.map(({ participant, data, months }) => (
                  <div key={participant.id} className="flex mb-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1 transition-colors">
                    <div className="w-40 p-2 font-medium text-gray-900 dark:text-white truncate flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold mr-3">
                        {participant.name.charAt(0)}
                      </div>
                      {participant.name}
                    </div>
                    <div className="w-16 p-2 text-center text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-md flex items-center justify-center font-semibold">
                      {data.target}
                    </div>
                    {months.map((month: string) => {
                      const value = data[month] || 0;
                      const cls =
                        value >= data.target ? 'bg-green-500 text-white' :
                        value >= data.target * 0.5 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white';
                      return (
                        <div key={month} className="w-16 p-1">
                          <div className={`${cls} rounded-lg text-center text-xs font-bold py-2 relative group shadow-sm hover:shadow-md transition-shadow`}>
                            {value.toFixed(1)}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                              <div className="font-semibold">{new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
                              <div>{value.toFixed(1)} hizb/sem {value >= data.target ? '🟢' : value >= data.target * 0.5 ? '🟡' : '🔴'}</div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="w-24 p-2 text-center text-xs flex items-center justify-center">
                      {(() => {
                        const values = months.map((m: string) => data[m] || 0);
                        if (values.length < 2) return <span className="text-gray-400 font-semibold">-</span>;
                        const mid = Math.floor(values.length / 2);
                        const firstAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid);
                        const secondAvg = values.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, values.length - mid);
                        if (secondAvg > firstAvg * 1.1) return <span className="text-green-600 dark:text-green-400 font-semibold">↗️ Hausse</span>;
                        if (secondAvg < firstAvg * 0.9) return <span className="text-red-600 dark:text-red-400 font-semibold">↘️ Baisse</span>;
                        return <span className="text-gray-600 dark:text-gray-400 font-semibold">➡️ Stable</span>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analyse mensuelle (graph classement) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analyse mensuelle</h2>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="comparison-month"
              checked={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.checked)}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mr-2"
            />
            <label htmlFor="comparison-month" className="text-sm text-gray-700 dark:text-gray-300">Mode comparaison</label>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">Moyenne hebdomadaire de lecture par participant</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mois à analyser</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
          >
            {availableMonths.map(m => {
              const [y, mNum] = m.split('-').map(Number);
              const monthName = new Date(y, mNum - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
              return <option key={m} value={m}>{monthName}</option>;
            })}
          </select>
        </div>

        {monthlyData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucune donnée disponible pour ce mois</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis label={{ value: 'Hizb/semaine', angle: -90, position: 'insideLeft' }} />
                <ReferenceLine y={7} stroke="red" strokeDasharray="4 4" label="7" />
                <ReferenceLine y={14} stroke="red" strokeDasharray="4 4" label="14" />
                <Tooltip
                  formatter={(value: any) => [`${value} hizb/semaine`, 'Moyenne']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <Bar dataKey="average" fill="#059669" radius={[4, 4, 0, 0]} name="Moyenne hebdomadaire" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Lectures hebdomadaires (graph multi-séries) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lectures hebdomadaires</h2>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="comparison-weeks"
              checked={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.checked)}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mr-2"
            />
            <label htmlFor="comparison-weeks" className="text-sm text-gray-700 dark:text-gray-300">Mode comparaison</label>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400 mb-2">Progression par semaine pour le mois sélectionné</p>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Mode selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode d'affichage</label>
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                <button
                  onClick={() => setWeeklyReadingsMode('month')}
                  className={`px-3 py-2 text-sm ${
                    weeklyReadingsMode === 'month'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Par mois
                </button>
                <button
                  onClick={() => setWeeklyReadingsMode('weeks')}
                  className={`px-3 py-2 text-sm ${
                    weeklyReadingsMode === 'weeks'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Par semaines
                </button>
              </div>
            </div>

            {/* Contrôles conditionnels */}
            {weeklyReadingsMode === 'month' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mois à analyser</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                >
                  {availableMonths.map(m => {
                    const [y, mNum] = m.split('-').map(Number);
                    const monthName = new Date(y, mNum - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                    return <option key={m} value={m}>{monthName}</option>;
                  })}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre de semaines</label>
                <select
                  value={weeklyReadingsPeriod}
                  onChange={(e) => setWeeklyReadingsPeriod(Number(e.target.value) as any)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value={2}>2 dernières semaines</option>
                  <option value={4}>4 dernières semaines</option>
                  <option value={8}>8 dernières semaines</option>
                  <option value={12}>12 dernières semaines</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {weeklyReadingsMode === 'month'
              ? `Affichage des semaines du mois sélectionné`
              : `Affichage des ${weeklyReadingsPeriod} dernières semaines`}
          </div>
        </div>

        {weeklyData.chartData?.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Aucune donnée hebdomadaire disponible</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis label={{ value: 'Hizb', angle: -90, position: 'insideLeft' }} />
                {/* lignes d'objectif */}
                <ReferenceLine y={7} stroke="red" strokeDasharray="4 4" label="7" />
                <ReferenceLine y={14} stroke="red" strokeDasharray="4 4" label="14" />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} hizb`, `Semaine du ${name}`]}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <Legend />
                {weeklyData.weeks?.map((w: any, index: number) => (
                  <Bar
                    key={w.weekKey}
                    dataKey={w.date}
                    fill={colors[index % colors.length]}
                    name={`Semaine du ${w.date}`}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Analyse individuelle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analyse individuelle</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredParticipants.map((participant) => {
            // cumul réel = somme des deltas (toutes semaines)
            const weeklyDeltas = calculateWeeklyDeltas(entries, participant.id);
            const totalHizb = weeklyDeltas.reduce((sum, w) => sum + w.delta, 0);
            const khatmas = Math.floor(totalHizb / 60);
            const progressInCycle = totalHizb % 60;

            // moyenne 8 sem
            const last8Weeks = weeklyDeltas.slice(-8);
            const weeklyTotal = last8Weeks.reduce((sum, w) => sum + w.delta, 0);
            const weeklyAverage = last8Weeks.length ? Math.round((weeklyTotal / last8Weeks.length) * 10) / 10 : 0;

            // best week
            const bestWeek = weeklyDeltas.reduce((best, current) =>
              current.delta > best.delta ? current : best,
              { delta: 0, week: '' }
            );
            const bestVal = bestWeek.delta;
            const bestDate = bestWeek.week ? `S${bestWeek.week}` : null;

            // régularité
            const target = participant.weekly_target_hizb || 7;
            const weeksWithTarget = weeklyDeltas.filter(w => w.delta >= target).length;
            const regularity = weeklyDeltas.length ? Math.round((weeksWithTarget / weeklyDeltas.length) * 100) : 0;

            // calcul hizb en retard
            const hizbRetard = calculateHizbRetard(entries, participant.id, target);

            // prédiction (reste dans le cycle courant)
            let prediction: string | null = null;
            if (weeklyAverage > 0) {
              const remaining = Math.max(0, 60 - progressInCycle);
              const weeksRemaining = Math.ceil(remaining / weeklyAverage);
              const completionDate = new Date();
              completionDate.setDate(completionDate.getDate() + weeksRemaining * 7);
              prediction = completionDate.toLocaleDateString('fr-FR');
            }

            return (
              <div key={participant.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">{participant.name}</h3>
                  <EditHistoryButton participantId={participant.id} />
                </div>

                <div className="space-y-3">
                  {/* Progression */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Target className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Progression totale:</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {khatmas} khatma{khatmas > 1 ? 's' : ''} + {progressInCycle} hizb
                    </span>
                  </div>

                  {/* Moyenne 8 sem */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Moyenne (8 sem.):</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {weeklyAverage} hizb/sem.
                    </span>
                  </div>

                  {/* Meilleure semaine */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Meilleure semaine:</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {bestVal} hizb {bestDate ? `(${bestDate})` : ''}
                    </span>
                  </div>

                  {/* Régularité */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Régularité:</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {regularity}%
                    </span>
                  </div>

                  {/* Hizb en retard */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {hizbRetard.status === 'retard' ? (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                      ) : hizbRetard.status === 'ajour' ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">Statut:</span>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        hizbRetard.status === 'avance'
                          ? 'text-blue-600 dark:text-blue-400'
                          : hizbRetard.status === 'retard'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {hizbRetard.status === 'retard' 
                        ? `Retard: ${hizbRetard.retard} hizb`
                        : hizbRetard.status === 'avance'
                        ? `Avance: ${hizbRetard.retard} hizb`
                        : 'À jour'}
                    </span>
                  </div>

                  {/* Prédiction */}
                  {prediction && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Khatma prévue:</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {prediction}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
