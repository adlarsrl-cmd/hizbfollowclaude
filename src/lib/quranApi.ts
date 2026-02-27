/**
 * Quran Foundation API — via Supabase Edge Function proxy.
 * The proxy handles OAuth2 client credentials (secret stays server-side).
 * Documentation: https://api-docs.quran.foundation/
 */

// Edge Function proxy — same endpoint paths as the old api.quran.com/api/v4
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const API_BASE = `${SUPABASE_URL}/functions/v1/quran-proxy`;

// Types
export interface Surah {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: number[];
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface Verse {
  id: number;
  verse_number: number;
  verse_key: string; // e.g., "1:1"
  hizb_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number: number | null;
  page_number: number;
  juz_number: number;
  text_uthmani: string;
  text_uthmani_tajweed: string; // With tajweed HTML tags
}

export interface Translation {
  resource_id: number;
  text: string;
}

export interface VerseWithTranslation extends Verse {
  translations?: Translation[];
}

export interface Juz {
  id: number;
  juz_number: number;
  verse_mapping: Record<string, string>; // e.g., {"1": "1-7", "2": "1-141"}
  first_verse_id: number;
  last_verse_id: number;
  verses_count: number;
}

export interface Page {
  page_number: number;
  verses: VerseWithTranslation[];
}

// Cache pour éviter les requêtes répétées
const cache = new Map<string, any>();

/**
 * Récupère la liste des 114 sourates
 */
export async function getSurahs(): Promise<Surah[]> {
  const cacheKey = 'surahs';
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const response = await fetch(`${API_BASE}/chapters?language=fr`);
  const data = await response.json();
  
  cache.set(cacheKey, data.chapters);
  return data.chapters;
}

/**
 * Récupère les informations d'une sourate
 */
export async function getSurah(surahNumber: number): Promise<Surah> {
  const cacheKey = `surah-${surahNumber}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const response = await fetch(`${API_BASE}/chapters/${surahNumber}?language=fr`);
  const data = await response.json();
  
  cache.set(cacheKey, data.chapter);
  return data.chapter;
}

/**
 * Récupère TOUS les versets d'une sourate en une seule opération (multi-fetch parallèle + cache).
 * Élimine la pagination côté client — toute la sourate est affichée d'un coup.
 */
export async function getSurahVersesAll(
  surahNumber: number,
  translations: number[] = [136]
): Promise<VerseWithTranslation[]> {
  const cacheKey = `surah-all-${surahNumber}-${translations.join(',')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const perPage = 50;
  const first = await getSurahVerses(surahNumber, { page: 1, perPage, translations });
  // API returns `total_records` (not `total_count`)
  const total = first.pagination?.total_records || first.pagination?.total_count || first.verses.length;
  const totalPages = Math.ceil(total / perPage);

  let allVerses = first.verses;

  if (totalPages > 1) {
    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const results = await Promise.all(
      remaining.map(page => getSurahVerses(surahNumber, { page, perPage, translations }))
    );
    allVerses = [first.verses, ...results.map(r => r.verses)].flat();
  }

  cache.set(cacheKey, allVerses);
  return allVerses;
}

/**
 * Récupère les versets d'une sourate avec Tajweed
 */
export async function getSurahVerses(
  surahNumber: number, 
  options?: { 
    page?: number; 
    perPage?: number;
    translations?: number[]; // e.g., [136] for French
  }
): Promise<{ verses: VerseWithTranslation[]; pagination: any }> {
  const { page = 1, perPage = 50, translations = [136] } = options || {};
  
  const cacheKey = `surah-verses-${surahNumber}-${page}-${perPage}-${translations.join(',')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const translationsParam = translations.length > 0 ? `&translations=${translations.join(',')}` : '';
  const response = await fetch(
    `${API_BASE}/verses/by_chapter/${surahNumber}?language=fr&words=false&page=${page}&per_page=${perPage}&fields=text_uthmani,text_uthmani_tajweed&text_type=uthmani${translationsParam}`
  );
  const data = await response.json();
  
  cache.set(cacheKey, { verses: data.verses, pagination: data.pagination });
  return { verses: data.verses, pagination: data.pagination };
}

export interface WordWithLine {
  id: number;
  position: number;
  text_uthmani: string;
  text_uthmani_tajweed?: string; // Tajweed HTML at word level (if returned by API)
  code_v2?: string;              // QPC Hafs glyph code U+FC41+ — used for both V2 and V4 fonts
  line_number: number;
  page_number: number;
  char_type_name: string; // 'word' | 'end' | 'pause' | 'sajdah' | 'rub_el_hizb'
  verse_key: string;
}

/**
 * Récupère les versets d'une page avec les mots et leurs numéros de ligne.
 * Permet de reproduire la mise en page exacte du Mushaf (15 lignes, même layout).
 */
export async function getPageWithWords(
  pageNumber: number,
  translations: number[] = [136]
): Promise<{ verses: VerseWithTranslation[]; allWords: WordWithLine[] }> {
  const cacheKey = `page-words-${pageNumber}-${translations.join(',')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const translationsParam = translations.length > 0 ? `&translations=${translations.join(',')}` : '';
  const response = await fetch(
    `${API_BASE}/verses/by_page/${pageNumber}?language=fr&words=true&word_fields=text_uthmani,text_uthmani_tajweed,code_v2,line_number,page_number,char_type_name&fields=text_uthmani_tajweed,juz_number,hizb_number,rub_el_hizb_number&text_type=uthmani${translationsParam}`
  );
  const data = await response.json();

  const allWords: WordWithLine[] = [];
  for (const verse of (data.verses || [])) {
    for (const word of (verse.words || [])) {
      const wordPage = word.page_number ?? pageNumber;
      // Only include words that are actually on this page.
      // The API returns ALL words of a verse even when the verse spans multiple pages,
      // which would corrupt line grouping if we include words from adjacent pages.
      if (wordPage !== pageNumber) continue;
      allWords.push({
        id: word.id,
        position: word.position,
        text_uthmani: word.text_uthmani || word.text || '',
        text_uthmani_tajweed: word.text_uthmani_tajweed || undefined,
        code_v2: word.code_v2 || undefined,
        line_number: word.line_number,
        page_number: wordPage,
        char_type_name: word.char_type_name ?? 'word',
        verse_key: verse.verse_key,
      });
    }
  }

  // Strip `words` array from verses (not part of VerseWithTranslation)
  const verses: VerseWithTranslation[] = (data.verses || []).map(
    ({ words: _w, ...rest }: any) => rest
  );

  const result = { verses, allWords };
  cache.set(cacheKey, result);
  return result;
}

// ─── Audio ──────────────────────────────────────────────────────────────────

const AUDIO_CDN = 'https://audio.qurancdn.com';

export interface VerseAudioFile {
  verse_key: string;
  url: string; // absolute URL
}

export interface ChapterAudio {
  audio_url: string;
  timestamps: {
    verse_key: string;
    timestamp_from: number; // ms
    timestamp_to: number;   // ms
  }[];
}

/** Verse-level audio files for an entire surah (one URL per verse). */
export async function getSurahVerseAudioFiles(
  reciterId: number,
  surahNumber: number
): Promise<VerseAudioFile[]> {
  const cacheKey = `verse-audio-${reciterId}-${surahNumber}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const response = await fetch(`${API_BASE}/recitations/${reciterId}/by_chapter/${surahNumber}`);
  const data = await response.json();
  const files: VerseAudioFile[] = (data.audio_files || []).map((f: any) => ({
    verse_key: f.verse_key,
    url: `${AUDIO_CDN}/${f.url}`,
  }));
  cache.set(cacheKey, files);
  return files;
}

/** Full-chapter audio MP3 with per-verse timestamps for live highlighting. */
export async function getChapterAudio(
  reciterId: number,
  surahNumber: number
): Promise<ChapterAudio | null> {
  const cacheKey = `chapter-audio-${reciterId}-${surahNumber}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const response = await fetch(`${API_BASE}/chapter_recitations/${reciterId}/${surahNumber}?segments=true`);
  const data = await response.json();
  const af = data.audio_file;
  if (!af) return null;

  const result: ChapterAudio = {
    audio_url: af.audio_url,
    timestamps: (af.timestamps || []).map((t: any) => ({
      verse_key: t.verse_key,
      timestamp_from: t.timestamp_from,
      timestamp_to: t.timestamp_to,
    })),
  };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Récupère les versets d'une page du Mushaf (604 pages total)
 */
export async function getPageVerses(
  pageNumber: number,
  translations: number[] = [136]
): Promise<VerseWithTranslation[]> {
  const cacheKey = `page-verses-${pageNumber}-${translations.join(',')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const translationsParam = translations.length > 0 ? `&translations=${translations.join(',')}` : '';
  const response = await fetch(
    `${API_BASE}/verses/by_page/${pageNumber}?language=fr&words=false&fields=text_uthmani,text_uthmani_tajweed&text_type=uthmani${translationsParam}`
  );
  const data = await response.json();
  
  cache.set(cacheKey, data.verses);
  return data.verses;
}

/**
 * Récupère les versets d'un Juz (30 juz total)
 */
export async function getJuzVerses(
  juzNumber: number,
  translations: number[] = [136]
): Promise<VerseWithTranslation[]> {
  const cacheKey = `juz-verses-${juzNumber}-${translations.join(',')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const translationsParam = translations.length > 0 ? `&translations=${translations.join(',')}` : '';
  const response = await fetch(
    `${API_BASE}/verses/by_juz/${juzNumber}?language=fr&words=false&per_page=300&fields=text_uthmani,text_uthmani_tajweed&text_type=uthmani${translationsParam}`
  );
  const data = await response.json();
  
  cache.set(cacheKey, data.verses);
  return data.verses;
}

/**
 * Récupère les versets d'un Hizb (60 hizb total)
 */
export async function getHizbVerses(
  hizbNumber: number,
  translations: number[] = [136]
): Promise<VerseWithTranslation[]> {
  const cacheKey = `hizb-verses-${hizbNumber}-${translations.join(',')}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const translationsParam = translations.length > 0 ? `&translations=${translations.join(',')}` : '';
  const response = await fetch(
    `${API_BASE}/verses/by_hizb/${hizbNumber}?language=fr&words=false&per_page=150&fields=text_uthmani,text_uthmani_tajweed&text_type=uthmani${translationsParam}`
  );
  const data = await response.json();
  
  cache.set(cacheKey, data.verses);
  return data.verses;
}

/**
 * Récupère la liste des Juz
 */
export async function getJuzs(): Promise<Juz[]> {
  const cacheKey = 'juzs';
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const response = await fetch(`${API_BASE}/juzs`);
  const data = await response.json();
  
  cache.set(cacheKey, data.juzs);
  return data.juzs;
}

/**
 * Recherche dans le Coran
 */
export async function searchQuran(
  query: string,
  options?: { page?: number; size?: number; language?: string }
): Promise<{ results: any[]; pagination: any }> {
  const { page = 1, size = 20, language = 'fr' } = options || {};
  
  const response = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(query)}&size=${size}&page=${page}&language=${language}`
  );
  const data = await response.json();
  
  return { results: data.search.results, pagination: data.search.pagination };
}

/**
 * Récupère les traductions disponibles
 */
export async function getTranslations(language: string = 'fr'): Promise<any[]> {
  const cacheKey = `translations-${language}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const response = await fetch(`${API_BASE}/resources/translations?language=${language}`);
  const data = await response.json();
  
  cache.set(cacheKey, data.translations);
  return data.translations;
}

// Kept for potential fallback use — prefer getSurahVerseAudioFiles for proper reciter support
export function getVerseAudioUrl(verseKey: string): string {
  const [surah, verse] = verseKey.split(':');
  return `${AUDIO_CDN}/Alafasy/mp3/${surah.padStart(3,'0')}${verse.padStart(3,'0')}.mp3`;
}

/**
 * Convertit un numéro de hizb en page approximative
 */
export function hizbToPage(hizb: number): number {
  // 60 hizb = 604 pages, donc ~10 pages par hizb
  return Math.ceil(hizb * 10.05);
}

/**
 * Convertit une page en numéro de hizb approximatif
 */
export function pageToHizb(page: number): number {
  return Math.ceil(page / 10.05);
}

/**
 * Nettoie le cache
 */
export function clearCache(): void {
  cache.clear();
}

// Constantes utiles
export const TOTAL_SURAHS = 114;
export const TOTAL_VERSES = 6236;
export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;
export const TOTAL_HIZB = 60;

// IDs des traductions populaires
export const TRANSLATIONS = {
  FRENCH_HAMIDULLAH: 136,
  FRENCH_MONTADA: 31,
  ENGLISH_SAHIH: 20,
  ENGLISH_CLEAR_QURAN: 131,
};

// IDs des récitateurs populaires
export const RECITERS = {
  MISHARY_ALAFASY: 7,
  ABDUL_BASIT: 1,
  SUDAIS: 6,
  MINSHAWI: 8,
};

