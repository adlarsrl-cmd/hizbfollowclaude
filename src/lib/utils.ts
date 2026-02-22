import { clsx, type ClassValue } from 'clsx';
import { startOfWeek, addDays, getISOWeek, getYear, getISOWeekYear } from 'date-fns';
import { TOTAL_HIZB, TOTAL_PAGES, CONVERSION_FACTORS } from './constants';

/* ------------------------------ UI helpers ------------------------------ */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/* --------------------------- Conversions & Juz --------------------------- */
export function toPages(hizb: number): number {
  if (hizb < 1 || hizb > TOTAL_HIZB) return 0;
  return Math.round(hizb * CONVERSION_FACTORS.hizb_to_pages);
}
export function toHizb(pages: number): number {
  if (pages < 1 || pages > TOTAL_PAGES) return 0;
  return Math.round(pages * CONVERSION_FACTORS.pages_to_hizb);
}
export function getJuzFromHizb(hizb: number): number {
  return Math.ceil(hizb / 2);
}
export function getJuzFromPages(pages: number): number {
  return Math.ceil(pages / (TOTAL_PAGES / 30));
}

/* ------------------------------ Week (Tue) ------------------------------ */
/** Clé de semaine alignée sur mardi : YYYY-Www-TUE */
export function getWeekKeyTuesday(date: Date = new Date()): string {
  const tuesday = startOfWeek(date, { weekStartsOn: 2 }); // 2 = Tuesday
  // Use getISOWeekYear instead of getYear to handle year boundaries correctly
  // (e.g., Dec 30 2025 might be in week 1 of 2026 according to ISO standard)
  const year = getISOWeekYear(tuesday);
  const week = getISOWeek(tuesday);
  return `${year}-W${week.toString().padStart(2, '0')}-TUE`;
}
/** Date du mardi (local) depuis la clé */
export function parseWeekKeyTuesday(weekKey: string): Date {
  const [y, wPart] = weekKey.split('-W');
  const week = parseInt(wPart.split('-')[0], 10);
  const year = parseInt(y, 10);

  // ISO: semaine 1 = semaine contenant le 4 janvier
  const jan4 = new Date(year, 0, 4);
  const jan4Monday = startOfWeek(jan4, { weekStartsOn: 1 });
  const targetMonday = addDays(jan4Monday, (week - 1) * 7);
  const tuesday = addDays(targetMonday, 1);
  return tuesday;
}
/** ⛳️ ISO string fixé au mardi de la semaine, à **12:00** (anti-fuseau) */
export function tuesdayNoonISO(input: Date | string): string {
  const tuesday =
    typeof input === 'string'
      ? parseWeekKeyTuesday(input)
      : startOfWeek(input, { weekStartsOn: 2 });
  const d = new Date(tuesday);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
/** Bornes mardi → lundi (minuit aux extrêmes) */
export function getWeekBoundsTuesday(d: Date) {
  const tue = startOfWeek(d, { weekStartsOn: 2 });
  const start = new Date(tue); start.setHours(0, 0, 0, 0);
  const end = new Date(tue); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Bornes d'une journée (00:00:00.000 → 23:59:59.999) */
export function getDayBounds(d: Date) {
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Clé unique pour un jour (YYYY-MM-DD local) */
export function getDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* --------------------------- Analytics helpers -------------------------- */
export function detectNewKhatma(
  currentValue: number,
  previousValue: number,
  unitType: 'hizb' | 'page'
): boolean {
  const threshold = unitType === 'hizb' ? 30 : 300; // moitié
  return previousValue >= threshold && currentValue <= threshold / 3;
}
export function calculateCumulative(
  currentValue: number,
  cycleNumber: number,
  unitType: 'hizb' | 'page'
): { cumulative_hizb: number; cumulative_pages: number } {
  if (unitType === 'hizb') {
    const cumulative_hizb = cycleNumber * TOTAL_HIZB + currentValue;
    const cumulative_pages = toPages(cumulative_hizb);
    return { cumulative_hizb, cumulative_pages };
  } else {
    const cumulative_pages = cycleNumber * TOTAL_PAGES + currentValue;
    const cumulative_hizb = toHizb(cumulative_pages);
    return { cumulative_hizb, cumulative_pages };
  }
}
export function formatDuration(weeks: number): string {
  if (weeks < 4) return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  if (weeks < 52) return `${Math.floor(weeks / 4)} mois`;
  return `${Math.floor(weeks / 52)} an${weeks >= 104 ? 's' : ''}`;
}
export function estimateCompletion(
  currentValue: number,
  weeklyPace: number,
  unitType: 'hizb' | 'page'
): Date | null {
  if (weeklyPace <= 0) return null;
  const total = unitType === 'hizb' ? TOTAL_HIZB : TOTAL_PAGES;
  const remaining = total - currentValue;
  const weeksRemaining = Math.ceil(remaining / weeklyPace);
  return addDays(new Date(), weeksRemaining * 7);
}
export function validateUnitValue(value: number, unitType: 'hizb' | 'page'): boolean {
  const max = unitType === 'hizb' ? TOTAL_HIZB : TOTAL_PAGES;
  return value >= 1 && value <= max;
}

/** Filtre les entrées par user_id (cross-groupe) si disponible, sinon par participant_id */
function matchParticipant(e: any, participantId: string, userId?: string): boolean {
  if (userId && e.user_id) return e.user_id === userId;
  return e.participant_id === participantId;
}

/** Dernière entrée "réelle" (≠ starting_point) d'un participant */
export function getLastRealEntry(entries: any[], participantId: string, userId?: string): any | null {
  return (
    entries
      .filter((e) => matchParticipant(e, participantId, userId))
      .filter((e) => e.source !== 'starting_point')
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0] || null
  );
}
export function hasRealEntries(entries: any[], participantId: string, userId?: string): boolean {
  return entries.some((e) => matchParticipant(e, participantId, userId) && e.source !== 'starting_point');
}
export function getCurrentPosition(
  entries: any[],
  participantId: string,
  userId?: string
): { value: number; cycle: number; unit: 'hizb' | 'page' } {
  const latestEntry =
    entries
      .filter((e) => matchParticipant(e, participantId, userId))
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
  if (!latestEntry) return { value: 1, cycle: 0, unit: 'hizb' };
  return { value: latestEntry.value_int, cycle: latestEntry.cycle_number || 0, unit: latestEntry.unit_type };
}

/* ---------------------- Weekly deltas (robustes & fixes) ---------------------- */
/**
 * Calcule le progrès hebdo (mardi→lundi) pour TOUTES les semaines présentes.
 * Règles :
 *  - starting_point dans la semaine => delta 0 (sert de baseline)
 *  - is_restart => delta = valeur de l'entrée (en hizb)
 *  - wrap implicite (ex 55→4) => (60 - 55) + 4
 *  - conversions pages -> hizb normalisées
 */
export function calculateWeeklyDeltas(
  entries: any[],
  participantId: string,
  userId?: string
): { week: string; delta: number }[] {
  const toH = (e: any) => (e.unit_type === 'page' ? toHizb(e.value_int) : e.value_int);
  const MAX_HIZB = 60;

  const all = entries
    .filter((e) => matchParticipant(e, participantId, userId))
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  if (!all.length) return [];

  const weekKeys = Array.from(new Set(all.map((e) => getWeekKeyTuesday(new Date(e.recorded_at))))).sort();
  const out: { week: string; delta: number }[] = [];

  for (const wk of weekKeys) {
    const tue = parseWeekKeyTuesday(wk);
    const ws = new Date(tue); ws.setHours(0, 0, 0, 0);
    const we = new Date(tue); we.setDate(we.getDate() + 6); we.setHours(23, 59, 59, 999);

    // baseline = dernière entrée avant la semaine
    let baseline: any | null = null;
    for (let i = all.length - 1; i >= 0; i--) {
      const t = new Date(all[i].recorded_at).getTime();
      if (t < ws.getTime()) { baseline = all[i]; break; }
    }

    const inWeek = all.filter((e) => {
      const t = new Date(e.recorded_at).getTime();
      return t >= ws.getTime() && t <= we.getTime();
    });

    let prev = baseline;
    let delta = 0;

    for (const e of inWeek) {
      const curr = toH(e);

      if (!prev) {
        if (e.source === 'starting_point') { prev = e; continue; }
        // première vraie saisie sans baseline → tout ce qui est atteint cette semaine
        delta += curr;
        prev = e;
        continue;
      }

      const prevVal = toH(prev);

      if (e.source === 'starting_point') {
        // un point de départ posé dans la semaine ne compte pas comme lecture
        prev = e; // devient la nouvelle baseline
        continue;
      }

      if (e.is_restart) {
        // redémarrage: on a lu "curr" hizb depuis 0
        delta += curr;
      } else if ((e.cycle_number ?? 0) > (prev.cycle_number ?? 0) || curr < prevVal) {
        // ✅ wrap implicite même sans cycle_number (ex: 54 → 4)
        delta += (MAX_HIZB - prevVal) + curr;
      } else {
        // progression normale
        delta += Math.max(0, curr - prevVal);
      }

      prev = e;
    }

    out.push({ week: wk.split('-W')[1]?.replace('-TUE', '') || wk, delta });
  }
  return out;
}

/* -------------------- Calculs mensuels & “hizb en retard” ----------------- */
/** Moyenne hebdo sur un mois (clé "YYYY-MM") */
export function calculateMonthlyAverages(entries: any[], participantId: string, month: string, userId?: string): number {
  const [year, monthNum] = month.split('-').map(Number);

  // construire les weekKeys (mardis) du mois sélectionné
  const first = new Date(year, monthNum - 1, 1);
  const last = new Date(year, monthNum, 0);

  const weeks: string[] = [];
  const cur = new Date(first);
  // calage au lundi, puis mardi
  cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
  while (cur <= last) {
    const tue = new Date(cur); tue.setDate(tue.getDate() + 1);
    weeks.push(getWeekKeyTuesday(tue));
    cur.setDate(cur.getDate() + 7);
  }

  const weekly = calculateWeeklyDeltas(entries, participantId, userId);
  const deltas = weeks.map((wk) => {
    const num = wk.split('-W')[1]?.replace('-TUE', '');
    const match = weekly.find((w) => w.week === num);
    return match?.delta ?? 0;
  });

  const total = deltas.reduce((s, v) => s + v, 0);
  return deltas.length ? total / deltas.length : 0;
}

/**
 * “Hizb en retard/avance” vs objectif hebdo depuis la 1re entrée (approx en hizb)
 * - neutralise starting_point
 * - gère wrap implicite et is_restart
 */
export function calculateHizbRetard(
  entries: any[],
  participantId: string,
  weeklyTarget: number,
  userId?: string
): { retard: number; status: 'avance' | 'retard' | 'ajour' } {
  const participantEntries = entries
    .filter((e) => matchParticipant(e, participantId, userId))
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  if (participantEntries.length === 0) return { retard: 0, status: 'ajour' };

  const firstEntryDate = new Date(participantEntries[0].recorded_at);
  const now = new Date();
  const weeksElapsed = Math.floor((now.getTime() - firstEntryDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const expectedHizb = weeksElapsed * weeklyTarget;

  let runningTotal = 0;
  for (let i = 0; i < participantEntries.length; i++) {
    const e = participantEntries[i];
    const val = e.unit_type === 'page' ? toHizb(e.value_int) : e.value_int;

    if (e.source === 'starting_point') {
      // point de départ: ne change pas le total, sert juste de repère
      continue;
    }

    if (e.is_restart) {
      runningTotal += val;
      continue;
    }

    const prev = participantEntries[i - 1];
    if (!prev) {
      // première vraie entrée
      runningTotal += val;
      continue;
    }

    const prevVal = prev.unit_type === 'page' ? toHizb(prev.value_int) : prev.value_int;

    if ((e.cycle_number ?? 0) > (prev.cycle_number ?? 0) || val < prevVal) {
      runningTotal += (TOTAL_HIZB - prevVal) + val;
    } else {
      runningTotal += Math.max(0, val - prevVal);
    }
  }

  const diff = runningTotal - expectedHizb;
  if (diff > 0) return { retard: diff, status: 'avance' };
  if (diff < 0) return { retard: Math.abs(diff), status: 'retard' };
  return { retard: 0, status: 'ajour' };
}

/* ------------------------------ CSV helpers ------------------------------ */
export function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map((line) => {
    const values: string[] = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim());
    return values;
  });
}
export function toCSV(data: any[], headers: string[]): string {
  const escapeCell = (cell: any) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const rows = [headers, ...data.map((row) => headers.map((h) => escapeCell(row[h])))];
  return rows.map((row) => row.join(',')).join('\n');
}
