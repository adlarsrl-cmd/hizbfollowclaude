import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  Settings,
  BookOpen,
  Layers,
  FileText,
  Check,
  Bookmark,
  Share2,
  Play,
  Save,
  LogIn,
  ChevronDown
} from 'lucide-react';
import {
  getSurahs,
  getPageVerses,
  getSurahVerses,
  getHizbVerses,
  type Surah,
  type VerseWithTranslation,
  TOTAL_PAGES,
  TOTAL_HIZB
} from '../lib/quranApi';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';
import { getWeekKeyTuesday, tuesdayNoonISO } from '../lib/utils';

type ViewMode = 'page' | 'surah' | 'hizb';
type LanguageMode = 'arabic' | 'french' | 'both';
type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

// Styles CSS pour le Tajweed - basé sur quran.com
const tajweedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Scheherazade+New:wght@400;700&display=swap');
  
  .quran-container {
    background: linear-gradient(180deg, #1a1f2e 0%, #0d1117 100%);
  }
  
  .tajweed-text {
    font-family: 'Amiri Quran', 'Scheherazade New', 'KFGQPC Uthmanic Script HAFS', serif;
    direction: rtl;
    text-align: justify;
    line-height: 2.8;
    color: #ffffff;
    word-spacing: 12px;
    letter-spacing: 0;
  }
  
  /* ===== TAJWEED COLORS - Exact Quran.com colors ===== */
  
  /* Silent letter - GREY (#AAAAAA) */
  .tajweed-text tajweed[class="slnt"],
  .tajweed-text tajweed[class=slnt],
  .tajweed-text tajweed[class="ham_wasl"],
  .tajweed-text tajweed[class=ham_wasl],
  .tajweed-text tajweed[class="laam_shamsiyah"],
  .tajweed-text tajweed[class=laam_shamsiyah],
  .tajweed-text .silent-diacritic {
    color: #AAAAAA !important;
  }
  
  /* Ensure combining characters (tanwin, etc.) inherit the color */
  .tajweed-text .silent-diacritic,
  .tajweed-text span[style*="color: #AAAAAA"] {
    color: #AAAAAA !important;
    display: inline;
  }
  
  /* Normal madd (2) - PINK (#FFC1E0) */
  .tajweed-text tajweed[class="madda_normal"],
  .tajweed-text tajweed[class=madda_normal] {
    color: #FFC1E0 !important;
  }
  
  /* Natural madd tabii (2) - PINK (#FFC1E0) */
  .tajweed-text tajweed[class="madda_tabii"],
  .tajweed-text tajweed[class=madda_tabii],
  .tajweed-text .tajweed-madda_tabii {
    color: #FFC1E0 !important;
  }
  
  /* Separated madd (2/4/6) - ORANGE (#F49E38) */
  .tajweed-text tajweed[class="madda_permissible"],
  .tajweed-text tajweed[class=madda_permissible] {
    color: #F49E38 !important;
  }
  
  /* Connected madd (4/5) - MAGENTA (#CF3D9E) */
  .tajweed-text tajweed[class="madda_obligatory"],
  .tajweed-text tajweed[class=madda_obligatory] {
    color: #CF3D9E !important;
  }
  
  /* Necessary madd (6) - RED (#E04A5A) */
  .tajweed-text tajweed[class="madda_necessary"],
  .tajweed-text tajweed[class=madda_necessary] {
    color: #E04A5A !important;
  }
  
  /* Ghunna/Ikhfa - GREEN (#39B578) */
  .tajweed-text tajweed[class="ghunnah"],
  .tajweed-text tajweed[class=ghunnah],
  .tajweed-text tajweed[class="ikhafa"],
  .tajweed-text tajweed[class=ikhafa],
  .tajweed-text tajweed[class="ikhafa_shafawi"],
  .tajweed-text tajweed[class=ikhafa_shafawi],
  .tajweed-text tajweed[class="idgham_ghunnah"],
  .tajweed-text tajweed[class=idgham_ghunnah],
  .tajweed-text tajweed[class="idgham_shafawi"],
  .tajweed-text tajweed[class=idgham_shafawi],
  .tajweed-text tajweed[class="iqlab"],
  .tajweed-text tajweed[class=iqlab] {
    color: #39B578 !important;
  }
  
  /* Idgham without Ghunna - LIGHT GREY (#9ea8b3) */
  .tajweed-text tajweed[class="idgham_wo_ghunnah"],
  .tajweed-text tajweed[class=idgham_wo_ghunnah],
  .tajweed-text tajweed[class="idgham_mutajanisayn"],
  .tajweed-text tajweed[class=idgham_mutajanisayn],
  .tajweed-text tajweed[class="idgham_mutaqaribayn"],
  .tajweed-text tajweed[class=idgham_mutaqaribayn] {
    color: #9ea8b3 !important;
  }
  
  /* Qalqala (echo) - CYAN (#49C1CE) */
  .tajweed-text tajweed[class="qalaqah"],
  .tajweed-text tajweed[class=qalaqah] {
    color: #49C1CE !important;
  }
  
  /* Tafkhim (heavy/emphatic) - LIGHT BLUE (#6DB1DB) */
  /* Letters: ص ض ط ظ ق غ خ */
  .tajweed-text tajweed[class="tafkheem"],
  .tajweed-text tajweed[class=tafkheem],
  .tajweed-text .tajweed-tafkheem {
    color: #6DB1DB !important;
  }
  
  /* End marker (verse number) - hide it as we show our own */
  .tajweed-text span.end,
  .tajweed-text span[class="end"] {
    display: none;
  }
  
  /* Generic tajweed tag styling */
  .tajweed-text tajweed {
    display: inline;
  }
  
  /* ===== VERSE NUMBER ORNAMENT ===== */
  .verse-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin: 0 10px;
    background: radial-gradient(circle, #1d5c3e 0%, #0f3d2a 100%);
    border: 2px solid #2d8a5e;
    border-radius: 50%;
    font-family: 'Amiri Quran', serif;
    font-size: 16px;
    color: #c9a227;
    font-weight: normal;
    box-shadow: 
      0 4px 12px rgba(0,0,0,0.5), 
      inset 0 2px 4px rgba(255,255,255,0.1),
      inset 0 -2px 4px rgba(0,0,0,0.2);
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }
  
  @media (max-width: 640px) {
    .tajweed-text {
      word-spacing: 4px;
      line-height: 2.4;
    }
  }

  /* ===== VERSE INTERACTIONS ===== */
  .verse-clickable {
    cursor: pointer;
    padding: 18px 14px;
    margin: 8px 0;
    border-radius: 16px;
    transition: all 0.25s ease;
    border: 1px solid transparent;
  }

  @media (max-width: 640px) {
    .verse-clickable {
      padding: 12px 8px;
    }
  }
  
  .verse-clickable:hover {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.08);
  }
  
  .verse-clickable.selected {
    background: rgba(24, 201, 110, 0.12);
    border-color: rgba(24, 201, 110, 0.35);
  }
  
  .verse-clickable.saved-verse {
    background: rgba(59, 130, 246, 0.15);
    border: 2px solid rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    position: relative;
  }
  
  .verse-clickable.saved-verse::before {
    content: '✓';
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(59, 130, 246, 0.9);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
  }
  
  /* ===== BISMILLAH STYLING ===== */
  .bismillah-text {
    font-family: 'Amiri Quran', serif;
    font-size: 2rem;
    color: #c9a227;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
`;

/**
 * Process Tajweed HTML with granular color application
 * Based on quran.com implementation - tachkil can have different color from letter
 * Only applies the 8 rules from the legend with exact colors
 */
function processTajweedHtml(html: string): string {
  if (!html) return html;
  
  // Helper: Check if character is a diacritic
  const isDiacritic = (code: number): boolean => {
    return (code >= 0x064B && code <= 0x065F) || // Tanwin, harakat, sukun, shaddah
           code === 0x0670 || // Dagger alif
           code === 0x0652 || // Sukun
           code === 0x0651 || // Shaddah
           code === 0x06DC || // Small high seen
           code === 0x06DF || // Small high rounded zero
           code === 0x06E0 || // Small high upright rectangular zero
           code === 0x06E2 || // Small high meem isolated form
           code === 0x06E3 || // Small low seen
           code === 0x06E5 || // Small waw
           code === 0x06E6 || // Small yeh
           code === 0x06E8 || // Small high noon
           code === 0x06EA || // Empty centre low stop
           code === 0x06EB || // Empty centre high stop
           code === 0x06EC || // Rounded high stop with filled centre
           code === 0x06ED;   // Small low meem
  };
  
  // Helper: Check if character is invisible (ZWNJ, ZWJ, etc.)
  const isInvisible = (code: number): boolean => {
    return code === 0x200C || // Zero-width non-joiner (ZWNJ)
           code === 0x200D || // Zero-width joiner (ZWJ)
           code === 0x200B || // Zero-width space
           code === 0xFEFF || // BOM
           code === 0x00A0;   // Non-breaking space
  };
  
  // Helper: Check if character is an Arabic letter
  const isArabicLetter = (code: number): boolean => {
    return (code >= 0x0621 && code <= 0x064A) || code === 0x0671;
  };
  
  // Helper: Split content into letter and diacritics
  const splitLetterAndDiacritics = (content: string): { letter: string; diacritics: string; rest: string } => {
    const chars = [...content];
    if (chars.length === 0) return { letter: '', diacritics: '', rest: '' };
    
    const firstChar = chars[0];
    const firstCode = firstChar.charCodeAt(0);
    
    if (!isArabicLetter(firstCode)) {
      return { letter: '', diacritics: '', rest: content };
    }
    
    let diacriticEnd = 1;
    while (diacriticEnd < chars.length) {
      const code = chars[diacriticEnd].charCodeAt(0);
      if (isDiacritic(code)) {
        diacriticEnd++;
      } else {
        break;
      }
    }
    
    return {
      letter: firstChar,
      diacritics: chars.slice(1, diacriticEnd).join(''),
      rest: chars.slice(diacriticEnd).join('')
    };
  };
  
  let result = html;
  
  // === HELPER: Extract letter structure from content ===
  // Handles orphan diacritics at the start (belong to previous letter)
  // Also handles invisible characters (ZWNJ, ZWJ, etc.)
  const extractLetterStructure = (content: string) => {
    const chars = [...content];
    
    // Find first Arabic letter
    let firstLetterIndex = -1;
    for (let i = 0; i < chars.length; i++) {
      const code = chars[i].charCodeAt(0);
      if (isArabicLetter(code)) {
        firstLetterIndex = i;
        break;
      }
    }
    
    if (firstLetterIndex === -1) {
      return { orphanDiacritics: content, letter: '', letterDiacritics: '', rest: '' };
    }
    
    // Orphan diacritics before the letter (belong to previous letter)
    const orphanDiacritics = chars.slice(0, firstLetterIndex).join('');
    
    // The letter itself
    const letter = chars[firstLetterIndex];
    
    // Diacritics that belong to THIS letter (including invisible chars mixed in)
    let diacriticsEnd = firstLetterIndex + 1;
    while (diacriticsEnd < chars.length) {
      const code = chars[diacriticsEnd].charCodeAt(0);
      if (isDiacritic(code) || isInvisible(code)) {
        diacriticsEnd++;
      } else {
        break;
      }
    }
    const letterDiacritics = chars.slice(firstLetterIndex + 1, diacriticsEnd).join('');
    
    // Everything after
    const rest = chars.slice(diacriticsEnd).join('');
    
    return { orphanDiacritics, letter, letterDiacritics, rest };
  };
  
  // === STEP 1: Handle idgham_wo_ghunnah - color ONLY the tanwin/diacritics, letter stays white ===
  // The API tags the assimilated letters, not the tanwin itself
  // We need to find ALL diacritics in the content and color them grey
  result = result.replace(/<tajweed\s+class=["']?idgham_wo_ghunnah["']?>([^<]+)<\/tajweed>/g, (match, content) => {
    const chars = [...content];
    let result = '';
    let i = 0;
    
    while (i < chars.length) {
      const char = chars[i];
      const code = char.charCodeAt(0);
      
      // Check if it's a diacritic (tanwin, harakat, etc.) - color it grey
      if (isDiacritic(code)) {
        // Collect consecutive diacritics
        let diacritics = char;
        let j = i + 1;
        while (j < chars.length && isDiacritic(chars[j].charCodeAt(0))) {
          diacritics += chars[j];
          j++;
        }
        result += `<span style="color: #9ea8b3 !important;">${diacritics}</span>`;
        i = j;
      } else {
        // Keep letter/other chars white
        result += char;
        i++;
      }
    }
    
    return result;
  });
  
  // === STEP 2: Handle silent letters (slnt, ham_wasl, laam_shamsiyah) ===
  // Color ENTIRE content grey — slnt wraps silent letters (اْ, و, وْ), not just diacritics
  const silentRules = [
    { class: 'slnt', color: '#AAAAAA' },
    { class: 'ham_wasl', color: '#AAAAAA' },
    { class: 'laam_shamsiyah', color: '#AAAAAA' }
  ];
  
  for (const { class: className, color } of silentRules) {
    const pattern = new RegExp(`<tajweed\\s+class=["']?${className}["']?>([^<]+)<\/tajweed>`, 'g');
    result = result.replace(pattern, (match, content) => {
      // slnt = silent letter (silent alif اْ, silent waw و, etc.) — color entire content grey
      // ham_wasl and laam_shamsiyah — also color entire content grey
      return `<span style="color: ${color} !important;">${content}</span>`;
    });
  }
  
  // === STEP 3: Handle Ikhfa/Idgham/Ghunna rules ===
  // Rules where the SOURCE letter (first) gets colored:
  // ikhafa: partial nasalization on the nun/tanwin — color the nun
  // ghunnah: letter with shaddah that has ghunnah — color the whole letter
  // ikhafa_shafawi: hidden mim pronunciation — color the first mim
  // iqlab: tanwin/nun converts to hidden mim before ba — color the source
  const firstLetterOnlyRules = [
    'ikhafa',
    'ikhafa_shafawi',
    'ghunnah',
    'iqlab'
  ];

  for (const className of firstLetterOnlyRules) {
    const pattern = new RegExp(`<tajweed\\s+class=["']?${className}["']?>([^<]+)<\/tajweed>`, 'g');
    result = result.replace(pattern, (match, content) => {
      const chars = [...content];
      if (chars.length <= 1) return match;

      // Find first letter with its diacritics (including invisible chars)
      let firstLetterEnd = 1;
      while (firstLetterEnd < chars.length) {
        const code = chars[firstLetterEnd].charCodeAt(0);
        if (isDiacritic(code) || isInvisible(code)) {
          firstLetterEnd++;
        } else {
          break;
        }
      }

      const firstLetter = chars.slice(0, firstLetterEnd).join('');
      const rest = chars.slice(firstLetterEnd).join('');
      // Only first letter (with diacritics) gets colored, rest stays white
      return `<tajweed class="${className}">${firstLetter}</tajweed>${rest}`;
    });
  }

  // Rules where the TARGET letter (last) gets colored:
  // idgham_ghunnah: tanwin/nun merges into ن/م/و/ي with ghunnah — color the TARGET (last) letter
  //   e.g. 'عٍ و' → ع white, ٍ white, و GREEN
  // idgham_shafawi: mim sakinah merges into mim with ghunnah — color the second mim
  //   e.g. 'ُم م' → ُم white, م GREEN
  const lastLetterOnlyRules = [
    'idgham_ghunnah',
    'idgham_shafawi'
  ];

  for (const className of lastLetterOnlyRules) {
    const pattern = new RegExp(`<tajweed\\s+class=["']?${className}["']?>([^<]+)<\/tajweed>`, 'g');
    result = result.replace(pattern, (match, content) => {
      const chars = [...content];
      if (chars.length <= 1) return match;

      // Find the LAST Arabic letter
      let lastLetterStart = -1;
      for (let k = chars.length - 1; k >= 0; k--) {
        const code = chars[k].charCodeAt(0);
        if (isArabicLetter(code)) {
          lastLetterStart = k;
          break;
        }
      }

      if (lastLetterStart === -1 || lastLetterStart === 0) return match;

      // Everything before the last letter stays white, last letter (+ any trailing diacritics) gets colored
      const prefix = chars.slice(0, lastLetterStart).join('');
      const lastLetter = chars.slice(lastLetterStart).join('');
      return `${prefix}<tajweed class="${className}">${lastLetter}</tajweed>`;
    });
  }
  
  // === STEP 4: Process remaining text for Tafkhim only (auto-detection) ===
  // NOTE: We do NOT auto-detect Madd Tabii - let the API tags handle it
  // The API already tags madda_tabii, madda_obligatory, etc. correctly
  const TAFKHIM_LETTERS = ['\u062E', '\u0635', '\u0636', '\u063A', '\u0637', '\u0642', '\u0638'];
  const RA = '\u0631';
  const FATHA = '\u064E';
  const DAMMA = '\u064F';
  const SUKUN = '\u0652';
  
  let finalResult = '';
  let i = 0;
  
  while (i < result.length) {
    // Skip already-tagged content
    if (result.slice(i, i + 8) === '<tajweed' || result.slice(i, i + 5) === '<span') {
      const tagStart = result.indexOf('>', i);
      if (tagStart === -1) {
        finalResult += result[i];
        i++;
        continue;
      }
      
      const isTajweed = result.slice(i, i + 8) === '<tajweed';
      const closingTag = isTajweed ? '</tajweed>' : '</span>';
      const tagEnd = result.indexOf(closingTag, tagStart);
      
      if (tagEnd === -1) {
        finalResult += result[i];
        i++;
        continue;
      }
      
      finalResult += result.slice(i, tagEnd + closingTag.length);
      i = tagEnd + closingTag.length;
      continue;
    }
    
    const char = result[i];
    
    // Check for Tafkhim letters (heavy/emphatic) - color letter AND diacritics
    if (TAFKHIM_LETTERS.includes(char)) {
      let letterWithDiacritics = char;
      let j = i + 1;

      while (j < result.length) {
        const nextCode = result.charCodeAt(j);
        if (isDiacritic(nextCode)) {
          letterWithDiacritics += result[j];
          j++;
        } else if (isInvisible(nextCode)) {
          // Preserve ZWNJ/ZWJ invisible chars that may appear between letter and harakat
          letterWithDiacritics += result[j];
          j++;
        } else {
          break;
        }
      }
      
      finalResult += `<span class="tajweed-tafkheem">${letterWithDiacritics}</span>`;
      i = j;
      continue;
    }
    
    // Check for heavy Ra (ر) - color letter AND diacritics if heavy
    if (char === RA) {
      let letterWithDiacritics = char;
      let j = i + 1;
      let firstDiacritic = '';
      
      while (j < result.length) {
        const nextCode = result.charCodeAt(j);
        if (isDiacritic(nextCode)) {
          if (!firstDiacritic) firstDiacritic = result[j];
          letterWithDiacritics += result[j];
          j++;
        } else if (isInvisible(nextCode)) {
          // Preserve ZWNJ/ZWJ invisible chars that may appear between letter and harakat
          letterWithDiacritics += result[j];
          j++;
        } else {
          break;
        }
      }
      
      // Ra is heavy if: fatha, damma, or sukun preceded by fatha/damma
      const prevChar = finalResult.slice(-1);
      const isHeavy = 
        firstDiacritic === FATHA || 
        firstDiacritic === DAMMA ||
        (firstDiacritic === SUKUN && (prevChar === FATHA || prevChar === DAMMA));
      
      if (isHeavy) {
        finalResult += `<span class="tajweed-tafkheem">${letterWithDiacritics}</span>`;
      } else {
        finalResult += letterWithDiacritics;
      }
      i = j;
      continue;
    }
    
    finalResult += char;
    i++;
  }
  
  return finalResult;
}

export default function QuranReaderPage() {
  const navigate = useNavigate();
  const { error: showError, warning: showWarning } = useToast();
  
  // Store
  const { 
    participants, 
    entries, 
    addEntry, 
    updateEntry, 
    fetchEntries,
    user 
  } = useAppStore();

  // States
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [verses, setVerses] = useState<VerseWithTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVersePage, setCurrentVersePage] = useState(1);
  const [totalVersePages, setTotalVersePages] = useState(1);
  
  // Navigation
  const [viewMode, setViewMode] = useState<ViewMode>('surah');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSurah, setCurrentSurah] = useState(1);
  const [currentHizb, setCurrentHizb] = useState(1);
  
  // UI Settings
  const [languageMode, setLanguageMode] = useState<LanguageMode>('both');
  const [fontSize, setFontSize] = useState<FontSize>('large');
  const [showSurahList, setShowSurahList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Verse interaction
  const [selectedVerse, setSelectedVerse] = useState<VerseWithTranslation | null>(null);
  const [showVerseMenu, setShowVerseMenu] = useState(false);
  const [verseMenuPosition, setVerseMenuPosition] = useState({ x: 0, y: 0 });
  const [savingProgress, setSavingProgress] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedVerseKey, setLastSavedVerseKey] = useState<string | null>(null);
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  
  const verseMenuRef = useRef<HTMLDivElement>(null);
  const savedVerseRef = useRef<HTMLDivElement>(null);
  const viewModeDropdownRef = useRef<HTMLDivElement>(null);

  // Font sizes mapping — smaller baseline on mobile
  const fontSizes: Record<FontSize, string> = {
    small: 'text-base sm:text-xl',
    medium: 'text-2xl sm:text-3xl',
    large: 'text-3xl sm:text-5xl',
    xlarge: 'text-4xl sm:text-6xl'
  };

  // Close verse menu and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (verseMenuRef.current && !verseMenuRef.current.contains(event.target as Node)) {
        setShowVerseMenu(false);
        setSelectedVerse(null);
      }
      if (viewModeDropdownRef.current && !viewModeDropdownRef.current.contains(event.target as Node)) {
        setShowViewModeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load surahs on mount
  useEffect(() => {
    getSurahs()
      .then(setSurahs)
      .catch(err => {
        setError('Erreur lors du chargement des sourates');
        showError('Impossible de charger les sourates. Vérifie ta connexion.');
        console.error('Error loading surahs:', err);
      });
  }, []);

  // Load last saved verse from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('quran-last-saved-position');
    if (saved) {
      try {
        const position = JSON.parse(saved);
        setLastSavedVerseKey(position.verse_key);
        setCurrentHizb(position.hizb_number);
        setCurrentPage(position.page_number);
        setCurrentSurah(position.surah_number);
        setViewMode(position.view_mode);
      } catch (e) {
        console.error('Error loading saved position:', e);
      }
    }
  }, []);

  // Load verses based on view mode
  useEffect(() => {
    setLoading(true);
    setError(null);

    const loadVerses = async () => {
      try {
        let data: VerseWithTranslation[] = [];
        
        if (viewMode === 'page') {
          data = await getPageVerses(currentPage);
          setTotalVersePages(1);
          setCurrentVersePage(1);
        } else if (viewMode === 'surah') {
          const perPage = 50;
          const result = await getSurahVerses(currentSurah, { 
            page: currentVersePage, 
            perPage 
          });
          data = result.verses;
          setTotalVersePages(Math.ceil((result.pagination?.total_count || 0) / perPage));
        } else if (viewMode === 'hizb') {
          data = await getHizbVerses(currentHizb);
          setTotalVersePages(1);
          setCurrentVersePage(1);
        }
        
        setVerses(data);
      } catch (err: any) {
        const errorMessage = err?.message || 'Erreur lors du chargement des versets';
        setError(errorMessage);
        
        if (err?.message?.includes('Failed to fetch') || err?.message?.includes('network')) {
          showError('Problème de connexion. Vérifie ton internet et réessaye.');
        } else if (err?.message?.includes('timeout')) {
          showError('Le chargement prend trop de temps. Réessaye dans quelques instants.');
        } else {
          showError('Impossible de charger les versets. Réessaye plus tard.');
        }
        console.error('Error loading verses:', err);
      } finally {
        setLoading(false);
      }
    };

    loadVerses();
  }, [viewMode, currentPage, currentSurah, currentHizb, currentVersePage]);

  // Reset verse page when changing surah
  useEffect(() => {
    if (viewMode === 'surah') {
      setCurrentVersePage(1);
    }
  }, [currentSurah, viewMode]);

  // Restore position when view mode changes
  useEffect(() => {
    const saved = localStorage.getItem('quran-last-saved-position');
    if (saved) {
      try {
        const position = JSON.parse(saved);
        if (viewMode === 'hizb' && position.hizb_number) {
          setCurrentHizb(position.hizb_number);
        } else if (viewMode === 'page' && position.page_number) {
          setCurrentPage(position.page_number);
        } else if (viewMode === 'surah' && position.surah_number) {
          setCurrentSurah(position.surah_number);
        }
        setLastSavedVerseKey(position.verse_key);
      } catch (e) {
        console.error('Error restoring position:', e);
      }
    }
  }, [viewMode]);

  // Scroll to saved verse when verses are loaded
  useEffect(() => {
    if (lastSavedVerseKey && verses.length > 0 && !loading) {
      setTimeout(() => {
        if (savedVerseRef.current) {
          savedVerseRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [verses, lastSavedVerseKey, loading]);

  // Current surah info
  const currentSurahInfo = useMemo(() => {
    if (viewMode === 'surah') {
      return surahs.find(s => s.id === currentSurah);
    }
    if (verses.length === 0) return null;
    const firstVerseKey = verses[0]?.verse_key;
    if (!firstVerseKey) return null;
    const surahNumber = parseInt(firstVerseKey.split(':')[0]);
    return surahs.find(s => s.id === surahNumber);
  }, [currentSurah, surahs, viewMode, verses]);

  // Navigation handlers
  const goToNext = () => {
    if (viewMode === 'page') {
      setCurrentPage(prev => Math.min(prev + 1, TOTAL_PAGES));
    } else if (viewMode === 'surah') {
      setCurrentSurah(prev => Math.min(prev + 1, 114));
    } else if (viewMode === 'hizb') {
      setCurrentHizb(prev => Math.min(prev + 1, TOTAL_HIZB));
    }
  };

  const goToPrev = () => {
    if (viewMode === 'page') {
      setCurrentPage(prev => Math.max(prev - 1, 1));
    } else if (viewMode === 'surah') {
      setCurrentSurah(prev => Math.max(prev - 1, 1));
    } else if (viewMode === 'hizb') {
      setCurrentHizb(prev => Math.max(prev - 1, 1));
    }
  };

  const selectSurah = (id: number) => {
    setCurrentSurah(id);
    setViewMode('surah');
    setShowSurahList(false);
  };

  const handleVerseClick = (verse: VerseWithTranslation, event: React.MouseEvent) => {
    event.preventDefault();
    setSelectedVerse(verse);
    setShowVerseMenu(true);
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setVerseMenuPosition({
      x: Math.min(rect.left, window.innerWidth - 250),
      y: rect.bottom + 10
    });
  };

  const saveReadingProgress = async () => {
    if (!selectedVerse) return;
    
    if (!user) {
      showWarning('Connecte-toi pour enregistrer ta lecture !');
      return;
    }
    
    setSavingProgress(true);
    setSaveSuccess(false);
    
    try {
      const hizbNumber = selectedVerse.hizb_number;
      
      const weekKey = getWeekKeyTuesday(new Date());
      const recordedAt = tuesdayNoonISO(weekKey);
      
      const myParticipant = participants.find(p => p.user_id === user.id);
      
      if (!myParticipant) {
        showWarning('Tu n\'es pas encore lié à un participant. Demande à un admin de te lier.');
        setSavingProgress(false);
        return;
      }
      
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const existingEntry = entries.find(e => 
        e.participant_id === myParticipant.id &&
        new Date(e.recorded_at) >= weekStart &&
        new Date(e.recorded_at) <= weekEnd
      );
      
      if (existingEntry) {
        await updateEntry(existingEntry.id, {
          value_int: hizbNumber,
          recorded_at: recordedAt,
          note: `Lu jusqu'au verset ${selectedVerse.verse_key}`
        });
      } else {
        await addEntry({
          participant_id: myParticipant.id,
          unit_type: 'hizb',
          value_int: hizbNumber,
          cycle_number: myParticipant.cycle_number || 0,
          source: 'app_reader',
          recorded_at: recordedAt,
          note: `Lu jusqu'au verset ${selectedVerse.verse_key}`
        } as any);
      }
      
      // Small delay before fetching to ensure DB has propagated the entry
      setTimeout(async () => {
        await fetchEntries();
      }, 500);
      
      const positionToSave = {
        verse_key: selectedVerse.verse_key,
        hizb_number: selectedVerse.hizb_number,
        page_number: selectedVerse.page_number,
        surah_number: parseInt(selectedVerse.verse_key.split(':')[0]),
        view_mode: viewMode
      };
      localStorage.setItem('quran-last-saved-position', JSON.stringify(positionToSave));
      setLastSavedVerseKey(selectedVerse.verse_key);

      setSaveSuccess(true);
      setTimeout(() => {
        setShowVerseMenu(false);
        setSelectedVerse(null);
        setSaveSuccess(false);
      }, 1500);
      
    } catch (err) {
      console.error('Error saving progress:', err);
      showError('Erreur lors de l\'enregistrement. Vérifie ta connexion et réessaye.');
    } finally {
      setSavingProgress(false);
    }
  };

  // Get position label
  const getPositionLabel = () => {
    if (viewMode === 'page') return `Page ${currentPage} / ${TOTAL_PAGES}`;
    if (viewMode === 'surah') {
      const surah = surahs.find(s => s.id === currentSurah);
      return surah ? `${surah.name_arabic}` : `Sourate ${currentSurah}`;
    }
    if (viewMode === 'hizb') return `Hizb ${currentHizb} / ${TOTAL_HIZB}`;
    return '';
  };

  const isAuthenticated = !!user;

  return (
    <>
      <style>{tajweedStyles}</style>
      
      <div className="quran-container min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[#1a1f2e]/95 backdrop-blur-md border-b border-gray-700/50">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Title */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <div className="p-1.5 md:p-2 bg-emerald-900/50 rounded-xl border border-emerald-700/30">
                  <Book className="h-5 w-5 md:h-6 md:w-6 text-emerald-400" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg md:text-xl font-bold text-white font-arabic">القرآن الكريم</h1>
                  <p className="text-xs text-emerald-400">Tajweed</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-base font-bold text-white font-arabic">القرآن</h1>
                </div>
              </div>

              {/* View Mode - Desktop: 3 buttons, Mobile: Dropdown */}
              <div className="hidden md:flex items-center gap-1 bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
                {[
                  { mode: 'surah' as ViewMode, icon: BookOpen, label: 'Sourate' },
                  { mode: 'page' as ViewMode, icon: FileText, label: 'Page' },
                  { mode: 'hizb' as ViewMode, icon: Layers, label: 'Hizb' },
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      viewMode === mode
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Mobile View Mode Dropdown */}
              <div className="md:hidden relative" ref={viewModeDropdownRef}>
                <button
                  onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700/50"
                >
                  {viewMode === 'surah' && <BookOpen className="h-4 w-4" />}
                  {viewMode === 'page' && <FileText className="h-4 w-4" />}
                  {viewMode === 'hizb' && <Layers className="h-4 w-4" />}
                  <span>
                    {viewMode === 'surah' ? 'Sourate' : viewMode === 'page' ? 'Page' : 'Hizb'}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showViewModeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showViewModeDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-700">
                    {[
                      { mode: 'surah' as ViewMode, label: 'Sourate' },
                      { mode: 'page' as ViewMode, label: 'Page' },
                      { mode: 'hizb' as ViewMode, label: 'Hizb' },
                    ].map(({ mode, label }) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setViewMode(mode);
                          setShowViewModeDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                          viewMode === mode
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!isAuthenticated && (
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-medium text-sm"
                    title="Se connecter"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Se connecter</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSurahList(true)}
                  className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors text-gray-400 hover:text-white"
                  title="Liste des sourates"
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-gray-700/50 rounded-xl transition-colors text-gray-400 hover:text-white"
                  title="Paramètres"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPrev}
              disabled={
                (viewMode === 'page' && currentPage <= 1) ||
                (viewMode === 'surah' && currentSurah <= 1) ||
                (viewMode === 'hizb' && currentHizb <= 1)
              }
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline text-sm font-medium">Précédent</span>
            </button>

            <div className="text-center min-w-0 px-2">
              <div className="text-base sm:text-2xl font-bold text-white font-arabic truncate">
                {getPositionLabel()}
              </div>
              {currentSurahInfo && (
                <div className="text-sm text-emerald-400">
                  {currentSurahInfo.translated_name?.name} • {currentSurahInfo.verses_count} versets
                </div>
              )}
            </div>

            <button
              onClick={goToNext}
              disabled={
                (viewMode === 'page' && currentPage >= TOTAL_PAGES) ||
                (viewMode === 'surah' && currentSurah >= 114) ||
                (viewMode === 'hizb' && currentHizb >= TOTAL_HIZB)
              }
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
            >
              <span className="hidden sm:inline text-sm font-medium">Suivant</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Verses Display */}
          <div className="bg-[#0f1318] rounded-2xl shadow-2xl border border-gray-800 p-3 sm:p-6 md:p-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-gray-400">Chargement...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Bismillah — shown when first verse is verse 1 of a surah (except Al-Fatiha and At-Tawbah) */}
                {(() => {
                  if (viewMode === 'surah') return currentSurah !== 1 && currentSurah !== 9;
                  if (verses.length > 0 && verses[0].verse_number === 1) {
                    const surahNum = parseInt(verses[0].verse_key.split(':')[0]);
                    return surahNum !== 1 && surahNum !== 9;
                  }
                  return false;
                })() && (
                  <div className="text-center py-8 mb-6 border-b border-gray-800/50">
                    <p className="bismillah-text text-3xl md:text-4xl">
                      ﷽
                    </p>
                    {(languageMode === 'french' || languageMode === 'both') && (
                      <p className="text-gray-500 mt-3 text-sm">
                        Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux
                      </p>
                    )}
                  </div>
                )}

                {/* Verses */}
                {verses.map((verse) => (
                  <div
                    key={verse.id}
                    id={`verse-${verse.verse_key}`}
                    ref={lastSavedVerseKey === verse.verse_key ? savedVerseRef : null}
                    onClick={(e) => handleVerseClick(verse, e)}
                    className={`verse-clickable ${selectedVerse?.id === verse.id ? 'selected' : ''} ${
                      lastSavedVerseKey === verse.verse_key ? 'saved-verse' : ''
                    }`}
                  >
                    {/* Arabic Text */}
                    {(languageMode === 'arabic' || languageMode === 'both') && (
                      <div className="flex items-start justify-end gap-2">
                        <div
                          className={`tajweed-text ${fontSizes[fontSize]} flex-1`}
                          dangerouslySetInnerHTML={{
                            __html: processTajweedHtml(verse.text_uthmani_tajweed || verse.text_uthmani)
                          }}
                        />
                        <span className="verse-number flex-shrink-0">
                          {verse.verse_number}
                        </span>
                      </div>
                    )}

                    {/* French Translation */}
                    {(languageMode === 'french' || languageMode === 'both') && verse.translations && verse.translations.length > 0 && (
                      <div className={`${languageMode === 'both' ? 'mt-3 pt-3 border-t border-gray-800/50' : ''}`}>
                        {languageMode === 'french' && (
                          <span className="inline-block px-2 py-0.5 bg-emerald-900/30 text-emerald-400 text-xs rounded mb-2">
                            {verse.verse_number}
                          </span>
                        )}
                        <p className="text-base text-gray-300 leading-relaxed">
                          {verse.translations[0].text.replace(/<[^>]*>/g, '')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Navigation */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {viewMode === 'page' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Page:</span>
                <input
                  type="number"
                  min={1}
                  max={TOTAL_PAGES}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= TOTAL_PAGES) {
                      setCurrentPage(val);
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1 || val > TOTAL_PAGES) {
                      setCurrentPage(1);
                    }
                  }}
                  className="input-modern w-20 text-center"
                />
              </div>
            )}
            {viewMode === 'surah' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Sourate:</span>
                <input
                  type="number"
                  min={1}
                  max={114}
                  value={currentSurah}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 114) {
                      setCurrentSurah(val);
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1 || val > 114) {
                      setCurrentSurah(1);
                    }
                  }}
                  className="input-modern w-20 text-center"
                />
              </div>
            )}
            {viewMode === 'hizb' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Hizb:</span>
                <input
                  type="number"
                  min={1}
                  max={TOTAL_HIZB}
                  value={currentHizb}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= TOTAL_HIZB) {
                      setCurrentHizb(val);
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1 || val > TOTAL_HIZB) {
                      setCurrentHizb(1);
                    }
                  }}
                  className="input-modern w-20 text-center"
                />
              </div>
            )}
          </div>

          {/* Surah Pagination for long surahs */}
          {viewMode === 'surah' && totalVersePages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 pt-6 border-t border-gray-800/50">
              <button
                onClick={() => setCurrentVersePage(p => Math.max(1, p - 1))}
                disabled={currentVersePage === 1}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Précédent</span>
              </button>

              <span className="text-sm text-gray-400">
                Page {currentVersePage} / {totalVersePages}
              </span>

              <button
                onClick={() => setCurrentVersePage(p => Math.min(totalVersePages, p + 1))}
                disabled={currentVersePage >= totalVersePages}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
              >
                <span className="hidden sm:inline text-sm font-medium">Suivant</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Surah List Modal */}
        {showSurahList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white font-arabic">قائمة السور</h2>
                <button
                  onClick={() => setShowSurahList(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-2">
                {surahs.map((surah) => (
                  <button
                    key={surah.id}
                    onClick={() => selectSurah(surah.id)}
                    className="flex items-center justify-between w-full p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-white gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-500 w-6 text-right flex-shrink-0">{surah.id}.</span>
                      <span className="font-arabic text-lg truncate">{surah.name_arabic}</span>
                    </div>
                    <div className="text-right flex-shrink-0 max-w-[45%]">
                      <span className="text-sm text-gray-400 block truncate">{surah.translated_name.name}</span>
                      <span className="text-xs text-gray-600 hidden sm:block">{surah.verses_count} versets</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0f1318] rounded-2xl shadow-2xl border border-gray-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 p-2 bg-gray-700/50 rounded-full text-gray-400 hover:text-white hover:bg-gray-600/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-white mb-4">Paramètres de lecture</h3>
              <div className="space-y-6">
                {/* Language Selection */}
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Langue:</p>
                  <div className="flex gap-2 bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
                    {[
                      { mode: 'arabic' as LanguageMode, label: 'عربي' },
                      { mode: 'french' as LanguageMode, label: 'FR' },
                      { mode: 'both' as LanguageMode, label: 'Les deux' },
                    ].map(({ mode, label }) => (
                      <button
                        key={mode}
                        onClick={() => setLanguageMode(mode)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          languageMode === mode
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Taille:</p>
                  <div className="flex gap-2 bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
                    {[
                      { size: 'small' as FontSize, label: 'S' },
                      { size: 'medium' as FontSize, label: 'M' },
                      { size: 'large' as FontSize, label: 'L' },
                      { size: 'xlarge' as FontSize, label: 'XL' },
                    ].map(({ size, label }) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          fontSize === size
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tajweed Legend */}
                <div className="pt-3 border-t border-gray-700/50">
                  <p className="text-xs font-medium text-gray-400 mb-2">Tajweed colors ▲</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#AAAAAA' }}></span>
                      <span className="text-gray-400">Silent letter</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFC1E0' }}></span>
                      <span className="text-gray-400">Normal madd (2)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F49E38' }}></span>
                      <span className="text-gray-400">Separated madd (2/4/6)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#CF3D9E' }}></span>
                      <span className="text-gray-400">Connected madd (4/5)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E04A5A' }}></span>
                      <span className="text-gray-400">Necessary madd (6)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#39B578' }}></span>
                      <span className="text-gray-400">Ghunna/ikhfa'</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#49C1CE' }}></span>
                      <span className="text-gray-400">Qalqala (echo)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6DB1DB' }}></span>
                      <span className="text-gray-400">Tafkhim (heavy)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verse Context Menu — bottom sheet on mobile, floating on desktop */}
        {showVerseMenu && selectedVerse && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50 sm:hidden"
              onClick={() => { setShowVerseMenu(false); setSelectedVerse(null); }}
            />
            <div
              ref={verseMenuRef}
              className={`z-50 bg-gray-800 border border-gray-700 shadow-xl
                fixed bottom-0 left-0 right-0 rounded-t-2xl p-4 pb-8
                sm:absolute sm:bottom-auto sm:left-auto sm:right-auto sm:rounded-lg sm:p-2 sm:pb-2`}
              style={
                typeof window !== 'undefined' && window.innerWidth >= 640
                  ? { top: verseMenuPosition.y, left: verseMenuPosition.x }
                  : {}
              }
            >
              {/* Mobile drag handle */}
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4 sm:hidden" />
              <p className="text-xs text-gray-500 px-3 mb-2 sm:hidden">
                Verset {selectedVerse.verse_key}
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={saveReadingProgress}
                    disabled={savingProgress || !isAuthenticated}
                    className="flex items-center gap-3 px-3 py-3 sm:py-2 text-sm text-emerald-400 hover:bg-gray-700 rounded-xl sm:rounded-md w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProgress ? (
                      <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="h-5 w-5 sm:h-4 sm:w-4 text-emerald-500" />
                    ) : (
                      <Save className="h-5 w-5 sm:h-4 sm:w-4" />
                    )}
                    Enregistrer ma lecture
                  </button>
                </li>
                <li>
                  <button
                    className="flex items-center gap-3 px-3 py-3 sm:py-2 text-sm text-gray-400 rounded-xl sm:rounded-md w-full text-left opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Bookmark className="h-5 w-5 sm:h-4 sm:w-4" />
                    Ajouter un marque-page
                  </button>
                </li>
                <li>
                  <button
                    className="flex items-center gap-3 px-3 py-3 sm:py-2 text-sm text-gray-400 rounded-xl sm:rounded-md w-full text-left opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Play className="h-5 w-5 sm:h-4 sm:w-4" />
                    Écouter ce verset
                  </button>
                </li>
                <li>
                  <button
                    className="flex items-center gap-3 px-3 py-3 sm:py-2 text-sm text-gray-400 rounded-xl sm:rounded-md w-full text-left opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Share2 className="h-5 w-5 sm:h-4 sm:w-4" />
                    Partager
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
