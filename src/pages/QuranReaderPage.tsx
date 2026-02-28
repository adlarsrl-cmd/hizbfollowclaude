import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  Loader2,
  X,
  Settings,
  BookOpen,
  Layers,
  FileText,
  Check,
  Bookmark,
  Share2,
  Play,
  Pause,
  Save,
  LogIn,
  Music,
} from 'lucide-react';
import {
  getSurahs,
  getPageWithWords,
  getSurahVersesAll,
  getSurahVerseAudioFiles,
  getChapterAudio,
  type Surah,
  type VerseWithTranslation,
  type WordWithLine,
  TOTAL_PAGES,
} from '../lib/quranApi';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';
import { getDayBounds } from '../lib/utils';
import BottomTabBar from '../components/BottomTabBar';

type ViewMode = 'page' | 'surah';
type LanguageMode = 'arabic' | 'french' | 'both';
type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
type FontFamily = 'scheherazade' | 'amiri' | 'noto';

// Styles CSS pour le Tajweed - basé sur quran.com
const tajweedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Noto+Naskh+Arabic:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap');

  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes fadeInBackdrop {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes overlaySlideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
  }
  .drawer-slide-left  { animation: slideInLeft    0.28s ease-out; }
  .drawer-slide-right { animation: slideInRight   0.28s ease-out; }
  .drawer-backdrop    { animation: fadeInBackdrop 0.28s ease-out; }
  .overlay-slide-down { animation: overlaySlideDown 0.22s cubic-bezier(0.22, 1, 0.36, 1); }

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
  
  /* Scheherazade New — traditional Mushaf Naskh */
  .tajweed-text.font-scheherazade {
    font-family: 'Scheherazade New', serif;
  }
  .bismillah-text.font-scheherazade {
    font-family: 'Scheherazade New', serif;
  }

  /* Noto Naskh Arabic font variant */
  .tajweed-text.font-noto {
    font-family: 'Noto Naskh Arabic', serif;
  }
  .bismillah-text.font-noto {
    font-family: 'Noto Naskh Arabic', serif;
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
  /* ===== SHARED — ayah rosette (۝) and number on top ===== */
  .qv-r {
    position: absolute;
    font-family: 'Scheherazade New', 'Amiri Quran', serif;
    color: rgba(192, 144, 32, 0.95);
    line-height: 1;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    user-select: none;
  }
  .qv-n {
    position: relative;
    z-index: 1;
    font-family: 'Scheherazade New', 'Amiri Quran', serif;
    font-weight: bold;
    line-height: 1;
    color: #e8d5a0;
  }
  .quran-light .qv-r { color: rgba(130, 88, 10, 0.92); }
  .quran-light .qv-n { color: #3a2200; }

  /* ===== VERSE NUMBER — surah / hizb mode ===== */
  .verse-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    margin-top: 14px;
    margin-left: 6px;
    margin-right: 6px;
    position: relative;
    flex-shrink: 0;
  }
  .verse-number .qv-r { font-size: 46px; }
  .verse-number .qv-n { font-size: 13px; }
  
  @media (max-width: 640px) {
    .tajweed-text {
      word-spacing: 4px;
      line-height: 2.4;
    }
  }

  /* ===== MUSHAF PAGE — inline verse number (scales with em) ===== */
  .verse-number-inline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2em;
    height: 2em;
    margin: 0 0.08em;
    vertical-align: middle;
    position: relative;
  }
  .verse-number-inline .qv-r { font-size: 2em; }
  .verse-number-inline .qv-n { font-size: 0.54em; }

  /* ===== MUSHAF PAGE — surah header box ===== */
  .surah-header-box {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 4px 18px;
    border: 1.5px solid rgba(180,130,30,0.5);
    outline: 0.75px solid rgba(180,130,30,0.2);
    outline-offset: 4px;
    background: rgba(180,130,30,0.06);
  }
  .quran-light .surah-header-box {
    border-color: rgba(140,100,20,0.5);
    outline-color: rgba(140,100,20,0.2);
    background: rgba(255,248,215,0.7);
  }

  /* ===== MUSHAF LINE LAYOUT ===== */
  .mushaf-page {
    direction: rtl;
    width: 100%;
  }
  .mushaf-line {
    display: block;
    direction: rtl;
    text-align: justify;
    text-align-last: justify;
    width: 100%;
    padding: 0.15em 0;
  }

  /* ===== MUSHAF NO-SCROLL (page mode) ===== */
  .mushaf-no-scroll {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    direction: rtl;
    width: 100%;
  }
  .mushaf-no-scroll .mushaf-line-group {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .mushaf-no-scroll .mushaf-line-group .surah-header-compact {
    flex-shrink: 0;
  }
  .mushaf-no-scroll .mushaf-line {
    flex: 1;
    min-height: 0;
    overflow: visible;
    padding: 0;
    /* Flex layout ensures each line fills the full width and words are
       evenly spaced — fixes single-word lines that would stretch with justify */
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    text-align: right;
  }
  /* Tighter line-height in no-scroll mode (2.2 vs 2.8) — fits more on screen */
  .mushaf-no-scroll .tajweed-text {
    line-height: 2.2 !important;
    word-spacing: 0.15em;
  }
  @media (max-width: 640px) {
    .mushaf-no-scroll .tajweed-text {
      word-spacing: 0.08em;
    }
  }
  /* Verse ornament scales with mushafAutoFontSize in no-scroll mode */
  .mushaf-no-scroll .verse-number-inline {
    font-size: 0.7em;
    width: 2em;
    height: 2em;
    margin: 0 0.06em;
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
    font-size: 1.4rem;
    color: #c9a227;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  /* ===== LIGHT MODE ===== */
  .quran-light {
    background: linear-gradient(180deg, #f0f4f8 0%, #e8edf2 100%) !important;
  }
  .quran-light .tajweed-text {
    color: #1e293b !important;
  }
  .quran-light .bismillah-text {
    text-shadow: none;
  }

  /* ===== AUDIO VERSE HIGHLIGHT ===== */
  .verse-clickable.audio-playing {
    background: rgba(57, 181, 120, 0.22) !important;
    border-color: rgba(57, 181, 120, 0.70) !important;
    box-shadow: 0 2px 16px rgba(57, 181, 120, 0.25) !important;
  }
`;

/**
 * Word-level API returns <rule class=...> tags; verse-level returns <tajweed class=...>.
 * Normalize word-level tajweed before processing.
 */
function processWordTajweed(html: string): string {
  if (!html) return html;
  const normalized = html
    .replace(/<rule(\s[^>]*)?>/g, (_, attrs) => `<tajweed${attrs || ''}>`)
    .replace(/<\/rule>/g, '</tajweed>');
  return processTajweedHtml(normalized);
}

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

/** Convert Western digits to Arabic-Indic numerals (١٢٣…) */
const toArabicNumerals = (n: number): string =>
  n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);

/** Hizb + quarter label from rub_el_hizb_number (1-240) */
function hizbQuarterLabel(hizb: number, rub: number): string {
  const q = (rub - 1) % 4;
  const fractions = ['', ' ¼', ' ½', ' ¾'];
  return `Hizb ${hizb}${fractions[q]}`;
}

/**
 * Split verse tajweed HTML into word-level chunks.
 * Words are separated by spaces occurring OUTSIDE of <tajweed> tags.
 */
function splitTajweedByWords(html: string): string[] {
  if (!html) return [];
  const parts: string[] = [];
  let current = '';
  let i = 0;
  let depth = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      const tagEnd = html.indexOf('>', i);
      if (tagEnd === -1) { current += html.slice(i); break; }
      const tagContent = html.slice(i + 1, tagEnd);
      const isClosing = tagContent.startsWith('/');
      const isSelfClosing = tagContent.endsWith('/');
      current += html.slice(i, tagEnd + 1);
      if (!isClosing && !isSelfClosing) depth++;
      else if (isClosing) depth = Math.max(0, depth - 1);
      i = tagEnd + 1;
    } else if (html[i] === ' ' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      i++;
      while (i < html.length && html[i] === ' ') i++;
    } else {
      current += html[i];
      i++;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
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
    user,
    theme,
    activeGroupId
  } = useAppStore();

  const isDark = theme === 'dark';

  // States
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [verses, setVerses] = useState<VerseWithTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVersePage, setCurrentVersePage] = useState(1);
  const [totalVersePages, setTotalVersePages] = useState(1);
  
  // Navigation
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('quran-last-saved-position');
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos.view_mode === 'page' || pos.view_mode === 'surah') return pos.view_mode as ViewMode;
      }
    } catch {}
    const vm = localStorage.getItem('quran-view-mode') as ViewMode;
    return (vm === 'page' || vm === 'surah') ? vm : 'surah';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSurah, setCurrentSurah] = useState(1);
  
  // UI Settings
  const [languageMode, setLanguageMode] = useState<LanguageMode>('both');
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem('quran-font-size') as FontSize) || 'large'
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(
    () => (localStorage.getItem('quran-font-family') as FontFamily) || 'scheherazade'
  );
  const [showSurahList, setShowSurahList] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Page mode word-level data (for exact mushaf line layout)
  const [pageWords, setPageWords] = useState<WordWithLine[]>([]);

  // Settings dropdowns
  const [openDropdown, setOpenDropdown] = useState<'reciter' | 'font' | null>(null);

  // Translation: 136 = Montada (default), 31 = Hamidullah
  const [selectedTranslationId, setSelectedTranslationId] = useState<number>(
    () => parseInt(localStorage.getItem('quran-translation-id') || '136', 10)
  );

  // Audio player
  const [audioVerseKey, setAudioVerseKey] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioReciterId, setAudioReciterId] = useState<number>(
    () => parseInt(localStorage.getItem('quran-reciter-id') || '7', 10)
  );
  const [audioMode, setAudioMode] = useState<'verse' | 'surah'>('verse');
  const [audioTimestamps, setAudioTimestamps] = useState<{verse_key: string; timestamp_from: number; timestamp_to: number}[]>([]);
  const [audioVerseUrls, setAudioVerseUrls] = useState<Map<string, string>>(new Map());
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioLoadingKey, setAudioLoadingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Verse interaction
  const [selectedVerse, setSelectedVerse] = useState<VerseWithTranslation | null>(null);
  const [showVerseMenu, setShowVerseMenu] = useState(false);
  const [verseMenuPosition, setVerseMenuPosition] = useState({ x: 0, y: 0 });
  const [savingProgress, setSavingProgress] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedVerseKey, setLastSavedVerseKey] = useState<string | null>(null);
  const verseMenuRef = useRef<HTMLDivElement>(null);
  const savedVerseRef = useRef<HTMLDivElement>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivatedRef = useRef(false);

  // Mushaf no-scroll: auto font size
  const bottomNavRef = useRef<HTMLDivElement>(null);
  const mushafNoScrollRef = useRef<HTMLDivElement>(null);
  const [mushafAutoFontSize, setMushafAutoFontSize] = useState(18);

  // Font family → CSS class
  const fontFamilyClass = (f: FontFamily): string => {
    if (f === 'scheherazade') return 'font-scheherazade';
    if (f === 'noto') return 'font-noto';
    return ''; // 'amiri' — base CSS
  };

  // Font sizes mapping — smaller baseline on mobile
  const fontSizes: Record<FontSize, string> = {
    small: 'text-base sm:text-xl',
    medium: 'text-2xl sm:text-3xl',
    large: 'text-3xl sm:text-5xl',
    xlarge: 'text-4xl sm:text-6xl'
  };

  // Persist font family preference
  useEffect(() => {
    localStorage.setItem('quran-font-family', fontFamily);
  }, [fontFamily]);

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('quran-view-mode', viewMode);
  }, [viewMode]);

  // Persist translation selection
  useEffect(() => {
    localStorage.setItem('quran-translation-id', String(selectedTranslationId));
  }, [selectedTranslationId]);

  // Close verse menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (verseMenuRef.current && !verseMenuRef.current.contains(event.target as Node)) {
        setShowVerseMenu(false);
        setSelectedVerse(null);
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
        setCurrentPage(position.page_number);
        setCurrentSurah(position.surah_number);
        // Migrate old 'hizb' view_mode to 'surah' (hizb mode removed)
        const vm: ViewMode = position.view_mode === 'hizb' ? 'page' : (position.view_mode || 'page');
        setViewMode(vm);
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
          const result = await getPageWithWords(currentPage, [selectedTranslationId]);
          data = result.verses;
          setPageWords(result.allWords);
          setTotalVersePages(1);
          setCurrentVersePage(1);
        } else if (viewMode === 'surah') {
          data = await getSurahVersesAll(currentSurah, [selectedTranslationId]);
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
  }, [viewMode, currentPage, currentSurah, currentVersePage, selectedTranslationId]);



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

  // Reading progress (0–100)
  const readingProgress = useMemo(() => {
    if (viewMode === 'surah') return Math.round((currentSurah / 114) * 100);
    if (viewMode === 'page') return Math.round((currentPage / TOTAL_PAGES) * 100);
    return 0;
  }, [viewMode, currentSurah, currentPage]);

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

  // Mushaf page metadata (used when viewMode === 'page')
  const pageInfo = useMemo(() => {
    if (viewMode !== 'page' || verses.length === 0) return null;
    const first = verses[0];
    const surahNum = parseInt(first.verse_key.split(':')[0]);
    const surahInfo = surahs.find(s => s.id === surahNum);
    return {
      surahName: surahInfo?.translated_name?.name || surahInfo?.name_simple || '',
      juz: first.juz_number,
      hizbLabel: hizbQuarterLabel(first.hizb_number, first.rub_el_hizb_number ?? 1),
    };
  }, [verses, surahs, viewMode]);

  // Exact mushaf line layout: words grouped by line_number with tajweed applied per word
  interface MushafRenderItem { html: string; verseKey: string; charType: string; }
  interface MushafRenderLine {
    lineNum: number;
    items: MushafRenderItem[];
    newSurahBefore?: { surahNum: number; hasBismillah: boolean };
  }

  const mushafLines = useMemo((): MushafRenderLine[] => {
    if (viewMode !== 'page' || pageWords.length === 0) return [];

    // Verse-level tajweed split by word — used as fallback when word-level tajweed is absent.
    // word.position (1-indexed within verse) maps directly to chunks[position-1], which is
    // cross-page safe because positions are absolute within the verse.
    const verseTajweedWords = new Map<string, string[]>();
    for (const verse of verses) {
      const processed = processTajweedHtml(verse.text_uthmani_tajweed || verse.text_uthmani);
      verseTajweedWords.set(verse.verse_key, splitTajweedByWords(processed));
    }

    // Detect surah starts: find the first line_number on this page for verse 1 of any surah
    const surahFirstLine = new Map<number, number>();
    for (const word of pageWords) {
      const [surahStr, verseStr] = word.verse_key.split(':');
      if (verseStr === '1' && !surahFirstLine.has(+surahStr)) {
        surahFirstLine.set(+surahStr, word.line_number);
      }
    }

    const lineItems = new Map<number, MushafRenderItem[]>();

    for (const word of pageWords) {
      const lineNum = word.line_number;
      if (!lineItems.has(lineNum)) lineItems.set(lineNum, []);

      let itemHtml: string;

      if (word.char_type_name === 'end') {
        // Verse-end ornament with Arabic-Indic numerals (١٢٣...)
        const verseNum = parseInt(word.verse_key.split(':')[1]);
        itemHtml = `<span class="verse-number-inline"><span class="qv-r">&#x06DD;</span><span class="qv-n">${toArabicNumerals(verseNum)}</span></span>`;
      } else if (word.text_uthmani_tajweed) {
        // PRIMARY: word-level tajweed from API
        itemHtml = processWordTajweed(word.text_uthmani_tajweed);
      } else {
        // FALLBACK: verse-level tajweed split by position
        const chunks = verseTajweedWords.get(word.verse_key) || [];
        const idx = word.position - 1;
        itemHtml = (idx >= 0 && idx < chunks.length)
          ? chunks[idx]
          : processTajweedHtml(word.text_uthmani);
      }

      lineItems.get(lineNum)!.push({ html: itemHtml, verseKey: word.verse_key, charType: word.char_type_name });
    }

    const sortedLineNums = [...lineItems.keys()].sort((a, b) => a - b);

    return sortedLineNums.map(lineNum => {
      let newSurahBefore: MushafRenderLine['newSurahBefore'];
      for (const [surahNum, firstLine] of surahFirstLine.entries()) {
        if (firstLine === lineNum) {
          newSurahBefore = { surahNum, hasBismillah: surahNum !== 1 && surahNum !== 9 };
          break;
        }
      }
      return { lineNum, items: lineItems.get(lineNum)!, newSurahBefore };
    });
  }, [viewMode, pageWords, verses]);

  // Position picker state
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [pickerValue, setPickerValue] = useState(1);   // numeric (for progress bar, +/-)
  const [pickerInputStr, setPickerInputStr] = useState('1'); // string (for the editable input)

  // Swipe gesture state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Persist fontSize to localStorage
  useEffect(() => {
    localStorage.setItem('quran-font-size', fontSize);
  }, [fontSize]);

  // Mushaf no-scroll: compute auto font size from available height
  useLayoutEffect(() => {
    if (viewMode !== 'page') return;
    const compute = () => {
      const el = mushafNoScrollRef.current;
      if (!el) return;
      // Use getBoundingClientRect().top to get the EXACT position of the container
      // in the viewport — this accounts for the header height, any margins/padding,
      // progress bar, etc. without needing to measure each element separately.
      const containerTop = el.getBoundingClientRect().top;
      // BottomTabBar is position:fixed — its wrapper div has height 0 in normal flow.
      // Query the fixed <nav> directly to get its true visual height (includes safe-area-inset-bottom).
      const navEl = (bottomNavRef.current?.querySelector('nav') ?? document.querySelector('nav.fixed.bottom-0')) as HTMLElement | null;
      const navH = navEl?.offsetHeight ?? 64;
      const availH = window.innerHeight - containerTop - navH;
      if (availH <= 0) return;
      el.style.height = `${availH}px`;
      // Each content line = flex weight 1.
      // A surah header group has the header element + the text line:
      //   - No bismillah (surah 1 & 9): header ≈ 1 line-height → total flex 2
      //   - With bismillah: header title + bismillah ≈ 2 line-heights → total flex 3
      // The font is scaled so the entire page fills the screen, capped at 30 px
      // to prevent over-zoom on sparse pages (e.g. page 1 = Fatiha, 7 lines).
      const totalFlex = mushafLines.reduce((s, l) => {
        if (!l.newSurahBefore) return s + 1;
        return s + (l.newSurahBefore.hasBismillah ? 3 : 2);
      }, 0) || 1;
      // availH includes the page-info strip (~30px, flex-shrink:0).
      // Subtract it so the last line doesn't overflow the container.
      const pageInfoH = pageInfo ? 30 : 0;
      // Scheherazade New and Amiri Quran have wider glyphs — use a larger divisor
      // so the computed font size is smaller and lines don't overflow horizontally.
      const lhDivisor = (fontFamily === 'scheherazade' || fontFamily === 'amiri') ? 2.65 : 2.2;
      const computed = Math.floor((availH - pageInfoH) / totalFlex / lhDivisor);
      const maxSize = currentPage === 1 ? 20 : currentPage === 2 ? 24 : 30;
      setMushafAutoFontSize(Math.min(computed, maxSize));
    };
    compute();
    // Window resize covers viewport size changes (rotation, browser chrome show/hide).
    const ro = new ResizeObserver(compute);
    if (bottomNavRef.current) ro.observe(bottomNavRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [viewMode, mushafLines.length, pageInfo, fontFamily, currentPage]);


  // Keyboard navigation (arrow keys) — ← next, → prev (RTL convention)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') goToPrev();
      if (e.key === 'ArrowLeft') goToNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewMode, currentPage, currentSurah]);

  // Scroll to top on content change
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Navigation handlers
  const goToNext = () => {
    if (viewMode === 'page') {
      setCurrentPage(prev => Math.min(prev + 1, TOTAL_PAGES));
    } else if (viewMode === 'surah') {
      setCurrentSurah(prev => Math.min(prev + 1, 114));
      setCurrentVersePage(1);
    }
    scrollToTop();
  };

  const goToPrev = () => {
    if (viewMode === 'page') {
      setCurrentPage(prev => Math.max(prev - 1, 1));
    } else if (viewMode === 'surah') {
      setCurrentSurah(prev => Math.max(prev - 1, 1));
      setCurrentVersePage(1);
    }
    scrollToTop();
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const dx = touchStartX - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY - e.changedTouches[0].clientY);
    const absDx = Math.abs(dx);
    // Swipe navigation — RTL: swipe right (dx < 0) = next page, swipe left (dx > 0) = prev page
    if (absDx > 60 && dy < 40) {
      if (dx < 0) goToNext(); // finger moved right → next (RTL convention)
      else goToPrev();        // finger moved left  → prev
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Switch view mode AND restore last saved position in that mode
  const switchViewMode = (mode: ViewMode) => {
    const saved = localStorage.getItem('quran-last-saved-position');
    if (saved) {
      try {
        const position = JSON.parse(saved);
        if (mode === 'page' && position.page_number) {
          setCurrentPage(position.page_number);
        } else if (mode === 'surah' && position.surah_number) {
          setCurrentSurah(position.surah_number);
          // Calculate which paginated page of the surah the saved verse is on (50 verses/page)
          if (position.verse_key) {
            const verseNum = parseInt(position.verse_key.split(':')[1]);
            if (!isNaN(verseNum)) {
              setCurrentVersePage(Math.ceil(verseNum / 50));
            }
          }
        }
        setLastSavedVerseKey(position.verse_key);
      } catch {}
    }
    setViewMode(mode);
  };

  const selectSurah = (id: number) => {
    if (viewMode === 'page') {
      const surah = surahs.find(s => s.id === id);
      if (surah?.pages?.[0]) setCurrentPage(surah.pages[0]);
    } else {
      setCurrentSurah(id);
      setCurrentVersePage(1);
    }
    setShowSurahList(false);
  };

  // ── Audio helpers ─────────────────────────────────────────────────────────

  const getAudio = (): HTMLAudioElement => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setAudioPlaying(false);
    setAudioVerseKey(null);
    setAudioTimestamps([]);
    setAudioVerseUrls(new Map());
    setAudioProgress(0);
    setAudioLoadingKey(null);
  };

  const playVerse = async (verseKey: string) => {
    const surahNum = parseInt(verseKey.split(':')[0]);
    setAudioLoadingKey(verseKey);
    try {
      const files = await getSurahVerseAudioFiles(audioReciterId, surahNum);
      const urlMap = new Map(files.map(f => [f.verse_key, f.url]));
      setAudioVerseUrls(urlMap);
      const url = urlMap.get(verseKey);
      if (!url) return;
      const el = getAudio();
      el.src = url;
      await el.play();
      setAudioVerseKey(verseKey);
      setAudioMode('verse');
      setAudioPlaying(true);
      setAudioTimestamps([]);
    } catch (err) {
      console.error('[Audio] playVerse error:', err);
    } finally {
      setAudioLoadingKey(null);
    }
  };

  const playSurah = async () => {
    const surahNum = viewMode === 'surah'
      ? currentSurah
      : parseInt(verses[0]?.verse_key?.split(':')[0] || '1');
    const key = `surah-${surahNum}`;
    setAudioLoadingKey(key);
    try {
      const audio = await getChapterAudio(audioReciterId, surahNum);
      if (!audio) return;
      const el = getAudio();
      el.src = audio.audio_url;
      await el.play();
      setAudioTimestamps(audio.timestamps);
      setAudioMode('surah');
      setAudioPlaying(true);
      setAudioVerseKey(audio.timestamps[0]?.verse_key || null);
      setAudioVerseUrls(new Map());
    } catch (err) {
      console.error('[Audio] playSurah error:', err);
    } finally {
      setAudioLoadingKey(null);
    }
  };

  // Audio: unmount cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Audio: timeupdate — progress bar + surah mode verse key highlight
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handleTimeUpdate = () => {
      if (el.duration) setAudioProgress((el.currentTime / el.duration) * 100);
      if (audioMode === 'surah' && audioTimestamps.length > 0) {
        const ms = el.currentTime * 1000;
        const cur = audioTimestamps.find(t => ms >= t.timestamp_from && ms < t.timestamp_to);
        if (cur) setAudioVerseKey(cur.verse_key);
      }
    };
    el.addEventListener('timeupdate', handleTimeUpdate);
    return () => el.removeEventListener('timeupdate', handleTimeUpdate);
  }, [audioMode, audioTimestamps]);

  // Audio: verse mode auto-advance on ended
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handleEnded = () => {
      setAudioPlaying(false);
      if (audioMode === 'verse' && audioVerseKey) {
        const [surahStr, verseStr] = audioVerseKey.split(':');
        const nextKey = `${surahStr}:${parseInt(verseStr) + 1}`;
        const nextUrl = audioVerseUrls.get(nextKey);
        if (nextUrl) {
          el.src = nextUrl;
          el.play()
            .then(() => { setAudioVerseKey(nextKey); setAudioPlaying(true); })
            .catch(() => {});
        } else {
          setAudioVerseKey(null);
        }
      } else if (audioMode === 'surah') {
        setAudioVerseKey(null);
      }
    };
    el.addEventListener('ended', handleEnded);
    return () => el.removeEventListener('ended', handleEnded);
  }, [audioMode, audioVerseKey, audioVerseUrls]);

  // ── End audio helpers ──────────────────────────────────────────────────────

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
      const now = new Date();
      const { start: dayStart, end: dayEnd } = getDayBounds(now);
      // recorded_at = today at noon
      const recordedAt = new Date(now); recordedAt.setHours(12, 0, 0, 0);

      const myParticipant = participants.find(p => p.user_id === user.id);

      if (!myParticipant) {
        showWarning('Tu n\'es pas encore lié à un participant. Demande à un admin de te lier.');
        setSavingProgress(false);
        return;
      }

      // Chercher l'entrée existante du jour par user_id (cross-groupe)
      const existingEntry = entries.find(e =>
        e.user_id === user.id &&
        new Date(e.recorded_at) >= dayStart &&
        new Date(e.recorded_at) <= dayEnd
      );

      if (existingEntry) {
        await updateEntry(existingEntry.id, {
          value_int: hizbNumber,
          recorded_at: recordedAt.toISOString(),
          note: `Lu jusqu'au verset ${selectedVerse.verse_key}`
        });
      } else {
        await addEntry({
          participant_id: myParticipant.id,
          unit_type: 'hizb',
          value_int: hizbNumber,
          cycle_number: myParticipant.cycle_number || 0,
          source: 'app_reader',
          recorded_at: recordedAt.toISOString(),
          note: `Lu jusqu'au verset ${selectedVerse.verse_key}`
        } as any);
      }

      // Sync : mettre à jour la position courante dans tous les groupes de l'utilisateur
      await supabase
        .from('participants')
        .update({ current_hizb: hizbNumber, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      // Sync Ramadan : upsert l'entrée du jour
      const today = new Date().toISOString().split('T')[0];
      const { data: existingRamadan } = await supabase
        .from('ramadan_entries')
        .select('id')
        .eq('participant_id', myParticipant.id)
        .eq('recorded_date', today)
        .maybeSingle();

      if (existingRamadan) {
        await supabase
          .from('ramadan_entries')
          .update({ hizb_position: hizbNumber, updated_at: new Date().toISOString() })
          .eq('id', existingRamadan.id);
      } else if (activeGroupId) {
        await supabase.from('ramadan_entries').insert({
          group_id: activeGroupId,
          participant_id: myParticipant.id,
          hizb_position: hizbNumber,
          recorded_date: today,
        });
      }

      // Rafraîchir les entrées
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
    return '';
  };

  const isAuthenticated = !!user;


  const showOverlayWithTimer = () => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    setShowOverlay(true);
    overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 3500);
  };

  const resetOverlayTimer = () => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 3500);
  };

  return (
    <>
      <style>{tajweedStyles}</style>
      
      <div
        className={`quran-container min-h-screen ${isDark ? '' : 'quran-light'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // If a long press just opened the verse menu, suppress this click
          if (longPressActivatedRef.current) {
            longPressActivatedRef.current = false;
            return;
          }
          // Any tap (including on verse text) toggles the overlay bar
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('input') || target.closest('a')) return;
          if (showOverlay) {
            if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
            setShowOverlay(false);
          } else {
            showOverlayWithTimer();
          }
        }}
      >
        {/* Safe area spacer (iOS notch/island) */}
        <div style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0 }} />

        {/* Thin progress bar — always visible at top */}
        <div className={`h-0.5 w-full ${isDark ? 'bg-gray-800/60' : 'bg-gray-300/40'}`}>
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${readingProgress}%` }}
          />
        </div>

        {/* ── PAGE MODE — full-height no-scroll mushaf ── */}
        {viewMode === 'page' && (
          <div
            ref={mushafNoScrollRef}
            className={`max-w-3xl mx-auto px-2 flex flex-col overflow-hidden ${isDark ? '' : ''}`}
            style={{ overflow: 'hidden' }}
          >
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-gray-400">Chargement...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <>
                {/* Compact page info strip */}
                {pageInfo && (
                  <div className={`flex items-center justify-between text-[10px] px-1 py-1 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    <span>{pageInfo.surahName}</span>
                    <span>Juz {pageInfo.juz} · {pageInfo.hizbLabel}</span>
                    <span>Page {currentPage}</span>
                  </div>
                )}

                {/* Mushaf no-scroll container — lines fill available height */}
                <div
                  className={`mushaf-no-scroll flex-1 min-h-0 ${fontFamilyClass(fontFamily)}`}
                  style={{
                    fontSize: `${mushafAutoFontSize}px`,
                  }}
                >
                  {mushafLines.map((line) => {
                    const si = line.newSurahBefore
                      ? surahs.find(s => s.id === line.newSurahBefore!.surahNum)
                      : null;
                    // Flex weight matches the font-size formula:
                    // header groups get more space so the header + text line both fit.
                    const flexWeight = line.newSurahBefore
                      ? (line.newSurahBefore.hasBismillah ? 3 : 2)
                      : 1;
                    return (
                      <div key={line.lineNum} className="mushaf-line-group" style={{ flex: flexWeight }}>
                        {/* Surah header (compact — page mode) */}
                        {line.newSurahBefore && (() => {
                          const gold = isDark ? 'rgba(210,160,40,0.85)' : 'rgba(120,80,10,0.80)';
                          const goldFade = isDark ? 'rgba(210,160,40,0.15)' : 'rgba(120,80,10,0.12)';
                          const S = 16; // corner ornament size
                          const corners = [
                            { key: 'tl', pos: { top: -S/2, left: -S/2 }, tx: '' },
                            { key: 'tr', pos: { top: -S/2, right: -S/2 }, tx: `translate(${S},0) scale(-1,1)` },
                            { key: 'bl', pos: { bottom: -S/2, left: -S/2 }, tx: `translate(0,${S}) scale(1,-1)` },
                            { key: 'br', pos: { bottom: -S/2, right: -S/2 }, tx: `translate(${S},${S}) scale(-1,-1)` },
                          ];
                          return (
                            <div className="surah-header-compact" style={{ textAlign: 'center', paddingBottom: '2px' }}>
                              {/* Surah name box with corner ornaments */}
                              <div className="surah-header-box" style={{ display: 'inline-flex', position: 'relative', padding: '4px 22px', gap: '10px', overflow: 'visible' }}>
                                {corners.map(({ key, pos, tx }) => (
                                  <svg key={key} width={S} height={S} viewBox={`0 0 ${S} ${S}`}
                                    style={{ position: 'absolute', pointerEvents: 'none', ...pos } as React.CSSProperties}
                                    xmlns="http://www.w3.org/2000/svg">
                                    <g transform={tx || undefined}>
                                      <path d={`M ${S} 1.5 Q ${S*0.55} 1.5 ${S*0.3} ${S*0.3} Q 1.5 ${S*0.55} 1.5 ${S}`} stroke={gold} fill="none" strokeWidth="1.3" strokeLinecap="round"/>
                                      <path d={`M ${S} ${S*0.38} Q ${S*0.7} ${S*0.38} ${S*0.55} ${S*0.55} Q ${S*0.38} ${S*0.7} ${S*0.38} ${S}`} stroke={gold} fill="none" strokeWidth="0.65" strokeLinecap="round" opacity="0.4"/>
                                      <path d={`M ${S*0.75} 1.5 Q ${S-0.5} ${S*0.31} ${S*0.75} ${S*0.53} Q ${S*0.47} ${S*0.31} ${S*0.75} 1.5 Z`} fill={gold} opacity="0.7"/>
                                      <path d={`M 1.5 ${S*0.75} Q ${S*0.31} ${S-0.5} ${S*0.53} ${S*0.75} Q ${S*0.31} ${S*0.47} 1.5 ${S*0.75} Z`} fill={gold} opacity="0.7"/>
                                      <circle cx={S*0.5} cy={S*0.5} r="1.2" fill={gold} opacity="0.55"/>
                                    </g>
                                  </svg>
                                ))}
                                <span
                                  className={`font-bold tracking-wide ${isDark ? 'text-amber-200' : 'text-amber-900'} ${fontFamilyClass(fontFamily)}`}
                                  style={{ fontSize: `${mushafAutoFontSize * 0.92}px` }}
                                >
                                  سُورَةُ {si?.name_arabic}
                                </span>
                              </div>
                              {/* Divider below box */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', marginBottom: line.newSurahBefore.hasBismillah ? '1px' : '0' }}>
                                <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
                              </div>
                              {line.newSurahBefore.hasBismillah && (
                                <div className={`bismillah-text ${fontFamilyClass(fontFamily)}`}
                                  style={{ fontSize: `${mushafAutoFontSize * 1.1}px` }}>﷽</div>
                              )}
                            </div>
                          );
                        })()}

                        {/* The mushaf line — each word clickable */}
                        <div className={`mushaf-line tajweed-text ${fontFamilyClass(fontFamily)}`}>
                          {line.items.map((item, wi) => (
                            <span
                              key={wi}
                              style={{ cursor: 'pointer' }}
                              onPointerDown={(e) => {
                                if (e.pointerType === 'mouse' && e.button !== 0) return;
                                const verse = verses.find(v => v.verse_key === item.verseKey);
                                if (!verse) return;
                                const el = e.currentTarget;
                                longPressTimerRef.current = setTimeout(() => {
                                  longPressActivatedRef.current = true;
                                  const rect = el.getBoundingClientRect();
                                  setSelectedVerse(verse);
                                  setShowVerseMenu(true);
                                  setVerseMenuPosition({ x: Math.min(rect.left, window.innerWidth - 250), y: rect.bottom + 10 });
                                }, 500);
                              }}
                              onPointerUp={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                              onPointerLeave={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                              onPointerCancel={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                              dangerouslySetInnerHTML={{ __html: item.html }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Main Content — surah / hizb modes */}
        {viewMode !== 'page' && (
        <div className="max-w-5xl mx-auto px-1 py-4 pb-24">
          {/* Navigation — desktop only, replaced by bottom bar on mobile */}
          <div className="hidden sm:flex items-center justify-between mb-6">
            <button
              onClick={goToPrev}
              disabled={viewMode === 'surah' && currentSurah <= 1}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 border rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${isDark ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 text-white' : 'bg-white/80 border-gray-300/80 hover:bg-gray-100/80 text-gray-800'}`}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden sm:inline text-sm font-medium">Précédent</span>
            </button>

            <div className="text-center min-w-0 px-2">
              <div className={`text-base sm:text-2xl font-bold font-arabic truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {getPositionLabel()}
              </div>
              {currentSurahInfo && (
                <div className="text-sm text-emerald-600">
                  {currentSurahInfo.translated_name?.name} • {currentSurahInfo.verses_count} versets
                </div>
              )}
            </div>

            <button
              onClick={goToNext}
              disabled={viewMode === 'surah' && currentSurah >= 114}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 border rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${isDark ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 text-white' : 'bg-white/80 border-gray-300/80 hover:bg-gray-100/80 text-gray-800'}`}
            >
              <span className="hidden sm:inline text-sm font-medium">Suivant</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Verses Display */}
          <div className={`rounded-2xl shadow-2xl border p-2 sm:p-3 ${isDark ? 'bg-[#0f1318] border-gray-800' : 'bg-white border-gray-200'}`}>
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
              /* ── VERSE-BY-VERSE VIEW (surah / hizb modes) ── */
              <div className="space-y-2">
                {/* ── Ornamental Surah Header ── */}
                {(() => {
                  const si: Surah | undefined = currentVersePage === 1 ? (currentSurahInfo || undefined) : undefined;
                  if (!si) return null;

                  const gold = isDark ? 'rgba(205,158,45,0.75)' : 'rgba(135,95,18,0.72)';
                  const goldFade = isDark ? 'rgba(205,158,45,0.18)' : 'rgba(135,95,18,0.18)';
                  const divider = (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ width: 8, height: 8, background: gold, transform: 'rotate(45deg)', flexShrink: 0 }} />
                      <div style={{ flex: 1, height: '1.5px', background: `linear-gradient(90deg, ${goldFade}, ${gold}, ${goldFade})` }} />
                      <span style={{ color: gold, fontSize: '11px', lineHeight: 1, flexShrink: 0 }}>✦</span>
                      <div style={{ flex: 1, height: '1.5px', background: `linear-gradient(90deg, ${goldFade}, ${gold}, ${goldFade})` }} />
                      <div style={{ width: 8, height: 8, background: gold, transform: 'rotate(45deg)', flexShrink: 0 }} />
                    </div>
                  );

                  const SH = 22;
                  const shCorners = [
                    { key: 'tl', pos: { top: -SH/2, left: -SH/2 }, tx: '' },
                    { key: 'tr', pos: { top: -SH/2, right: -SH/2 }, tx: `translate(${SH},0) scale(-1,1)` },
                    { key: 'bl', pos: { bottom: -SH/2, left: -SH/2 }, tx: `translate(0,${SH}) scale(1,-1)` },
                    { key: 'br', pos: { bottom: -SH/2, right: -SH/2 }, tx: `translate(${SH},${SH}) scale(-1,-1)` },
                  ];
                  return (
                    <div style={{ textAlign: 'center', padding: '10px 6px 4px', margin: '4px 0 6px' }}>
                      {divider}
                      <div className="surah-header-box" style={{ padding: '10px 20px 8px', position: 'relative', display: 'inline-block', overflow: 'visible' }}>
                        {/* Corner ornaments */}
                        {shCorners.map(({ key, pos, tx }) => (
                          <svg key={key} width={SH} height={SH} viewBox={`0 0 ${SH} ${SH}`}
                            style={{ position: 'absolute', pointerEvents: 'none', ...pos } as React.CSSProperties}
                            xmlns="http://www.w3.org/2000/svg">
                            <g transform={tx || undefined}>
                              <path d={`M ${SH} 2 Q ${SH*0.5} 2 ${SH*0.27} ${SH*0.27} Q 2 ${SH*0.5} 2 ${SH}`} stroke={gold} fill="none" strokeWidth="1.5" strokeLinecap="round"/>
                              <path d={`M ${SH} ${SH*0.36} Q ${SH*0.65} ${SH*0.36} ${SH*0.53} ${SH*0.53} Q ${SH*0.36} ${SH*0.65} ${SH*0.36} ${SH}`} stroke={gold} fill="none" strokeWidth="0.8" strokeLinecap="round" opacity="0.4"/>
                              <path d={`M ${SH*0.73} 2 Q ${SH-1} ${SH*0.3} ${SH*0.73} ${SH*0.52} Q ${SH*0.45} ${SH*0.3} ${SH*0.73} 2 Z`} fill={gold} opacity="0.72"/>
                              <path d={`M 2 ${SH*0.73} Q ${SH*0.3} ${SH-1} ${SH*0.52} ${SH*0.73} Q ${SH*0.3} ${SH*0.45} 2 ${SH*0.73} Z`} fill={gold} opacity="0.72"/>
                              <circle cx={SH*0.5} cy={SH*0.5} r="1.6" fill={gold} opacity="0.5"/>
                            </g>
                          </svg>
                        ))}
                        <div style={{
                          fontFamily: fontFamily === 'noto' ? "'Noto Naskh Arabic', serif" : fontFamily === 'scheherazade' ? "'Scheherazade New', serif" : "'Amiri Quran', serif",
                          fontSize: '1.6rem',
                          fontWeight: 700,
                          color: isDark ? '#f0dca0' : '#7b5213',
                          marginBottom: '4px',
                          letterSpacing: '0.02em',
                          padding: '0 18px',
                        }}>
                          سُورَةُ {si.name_arabic}
                        </div>
                        <div style={{
                          fontSize: '0.67rem',
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(210,160,50,0.72)' : 'rgba(120,80,15,0.72)',
                        }}>
                          {si.translated_name?.name && `${si.translated_name.name}  ·  `}
                          {si.verses_count} versets  ·  {si.revelation_place === 'makkah' ? 'Mecquoise' : 'Médinoise'}
                        </div>
                      </div>
                      {divider}
                    </div>
                  );
                })()}

                {/* Bismillah — shown when first verse is verse 1 of a surah (except Al-Fatiha and At-Tawbah) */}
                {(currentSurah !== 1 && currentSurah !== 9 && currentVersePage === 1) && (
                  <div style={{ textAlign: 'center', padding: '6px 0 16px' }}>
                    <p className={`bismillah-text ${fontFamilyClass(fontFamily)}`}>﷽</p>
                  </div>
                )}

                {/* Verses */}
                {verses.map((verse) => (
                  <div
                    key={verse.id}
                    id={`verse-${verse.verse_key}`}
                    ref={lastSavedVerseKey === verse.verse_key ? savedVerseRef : null}
                    onPointerDown={(e) => {
                      if (e.pointerType === 'mouse' && e.button !== 0) return;
                      const el = e.currentTarget;
                      longPressTimerRef.current = setTimeout(() => {
                        longPressActivatedRef.current = true;
                        const rect = el.getBoundingClientRect();
                        setSelectedVerse(verse);
                        setShowVerseMenu(true);
                        setVerseMenuPosition({ x: Math.min(rect.left, window.innerWidth - 250), y: rect.bottom + 10 });
                      }, 500);
                    }}
                    onPointerUp={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                    onPointerLeave={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                    onPointerCancel={() => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
                    className={`verse-clickable ${selectedVerse?.id === verse.id ? 'selected' : ''} ${
                      lastSavedVerseKey === verse.verse_key ? 'saved-verse' : ''
                    } ${audioVerseKey === verse.verse_key ? 'audio-playing' : ''}`}
                  >
                    {/* Arabic Text */}
                    {(languageMode === 'arabic' || languageMode === 'both') && (
                      <div className="flex items-start justify-end gap-2">
                        <div
                          className={`tajweed-text ${fontFamilyClass(fontFamily)} ${fontSizes[fontSize]} flex-1`}
                          dangerouslySetInnerHTML={{
                            __html: processTajweedHtml(verse.text_uthmani_tajweed || verse.text_uthmani)
                          }}
                        />
                        <span className="verse-number flex-shrink-0">
                          <span className="qv-r">۝</span>
                          <span className="qv-n">{toArabicNumerals(verse.verse_number)}</span>
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
                        <p className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {verse.translations[0].text.replace(/<[^>]*>/g, '')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Navigation — hidden for page mode (use bottom bar picker) */}
          {viewMode !== 'page' && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {viewMode === 'surah' && (
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sourate:</span>
                  <input
                    type="number"
                    min={1}
                    max={114}
                    value={currentSurah}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= 114) setCurrentSurah(val);
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val) || val < 1 || val > 114) setCurrentSurah(1);
                    }}
                    className="input-modern w-20 text-center"
                  />
                </div>
              )}
            </div>
          )}

        </div>
        )} {/* end viewMode !== 'page' */}

        {/* Overlay bar — compact top bar, shown on tap, auto-hides after 3.5s */}
        {showOverlay && (
          <div
            className="overlay-slide-down fixed top-0 left-0 right-0 z-50"
            onClick={(e) => { e.stopPropagation(); resetOverlayTimer(); }}
          >
            <div
              className={`${isDark ? 'bg-[#0d1117]/96 border-gray-800/70' : 'bg-white/96 border-gray-200/80'} backdrop-blur-xl border-b shadow-xl`}
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
              <div className="flex items-center px-2 py-1.5 gap-1">

                {/* Back / home */}
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/'); }}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {!isAuthenticated && (
                    <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </button>

                {/* Position label — tappable to open position picker */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const v = viewMode === 'page' ? currentPage : currentSurah;
                    setPickerValue(v);
                    setPickerInputStr(String(v));
                    setShowOverlay(false);
                    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
                    setShowPositionPicker(true);
                  }}
                  className="flex-1 min-w-0 text-center px-1 py-1.5 rounded-xl transition-colors"
                >
                  <div className={`text-sm font-bold font-arabic leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {getPositionLabel()}
                  </div>
                  <div className={`text-[10px] font-medium leading-tight ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>
                    {readingProgress}%
                  </div>
                </button>

                {/* View mode — Apple-like sliding segmented control */}
                <div
                  className={`relative flex rounded-xl p-0.5 flex-shrink-0 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Sliding pill */}
                  <div
                    className="absolute top-0.5 bottom-0.5 w-8 rounded-[10px] bg-emerald-600 shadow-md"
                    style={{
                      left: viewMode === 'page' ? '2px' : '34px',
                      transition: 'left 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                  <button
                    onClick={() => { switchViewMode('page'); resetOverlayTimer(); }}
                    className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-[10px] transition-colors duration-200 ${viewMode === 'page' ? 'text-white' : isDark ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    <BookOpen className="h-[15px] w-[15px]" />
                  </button>
                  <button
                    onClick={() => { switchViewMode('surah'); resetOverlayTimer(); }}
                    className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-[10px] transition-colors duration-200 ${viewMode === 'surah' ? 'text-white' : isDark ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    <Layers className="h-[15px] w-[15px]" />
                  </button>
                </div>

                {/* List */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOverlay(false); if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); setShowSurahList(true); }}
                  className={`p-2 rounded-xl transition-colors flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <List className="h-5 w-5" />
                </button>

                {/* Play surah audio */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (audioPlaying && audioMode === 'surah') {
                      audioRef.current?.pause();
                      setAudioPlaying(false);
                    } else {
                      playSurah();
                    }
                    resetOverlayTimer();
                  }}
                  className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                    audioPlaying && audioMode === 'surah'
                      ? 'text-emerald-400'
                      : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  title="Écouter la sourate"
                >
                  {audioLoadingKey?.startsWith('surah-')
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : audioPlaying && audioMode === 'surah'
                      ? <Pause className="h-5 w-5" />
                      : <Music className="h-5 w-5" />}
                </button>

                {/* Settings */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowOverlay(false); if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); setShowSettings(true); }}
                  className={`p-2 rounded-xl transition-colors flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>

              {/* Progress bar */}
              <div className={`h-0.5 ${isDark ? 'bg-gray-800/60' : 'bg-gray-200/60'}`}>
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mini audio player bar — visible only when overlay is shown */}
        {showOverlay && audioVerseKey && (
          <div
            className={`fixed left-0 right-0 z-30 ${isDark ? 'bg-gray-900/70 border-gray-800/60' : 'bg-white/70 border-gray-200/60'} border-t backdrop-blur-xl`}
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}
          >
            {/* Progress line */}
            <div className={`h-0.5 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-2">
              {/* Verse info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold font-arabic truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {audioVerseKey}
                </p>
                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {audioMode === 'surah' ? 'Sourate en cours' : 'Verset en cours'}
                </p>
              </div>
              {/* Play/pause */}
              <button
                onClick={() => {
                  if (!audioRef.current) return;
                  if (audioPlaying) { audioRef.current.pause(); setAudioPlaying(false); }
                  else { audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {}); }
                }}
                className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
              >
                {audioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              {/* Stop */}
              <button
                onClick={stopAudio}
                className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* App Bottom Tab Bar */}
        <div ref={bottomNavRef}>
          <BottomTabBar />
        </div>

        {/* Surah List Drawer */}
        {showSurahList && (
        <div className="fixed inset-0 z-[80]">
          {/* Backdrop */}
          <div
            className={`drawer-backdrop absolute inset-0 bg-black/50`}
            onClick={() => setShowSurahList(false)}
          />
          {/* Panel — slides from left */}
          <div className={`drawer-slide-left absolute top-0 left-0 h-full w-full max-w-sm shadow-2xl border-r flex flex-col ${isDark ? 'bg-[#0f1318] border-gray-800' : 'bg-white border-gray-200'}`}>
            {/* Drawer Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Navigation</h3>
              <button
                onClick={() => setShowSurahList(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            {(
              <div className={`px-5 py-3 border-b flex-shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <input
                  type="text"
                  value={surahSearch}
                  onChange={(e) => setSurahSearch(e.target.value)}
                  placeholder="Rechercher une sourate..."
                  className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-emerald-500'}`}
                />
              </div>
            )}

            {/* List Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-1">
                {surahs
                  .filter((s) => {
                    if (!surahSearch.trim()) return true;
                    const q = surahSearch.toLowerCase();
                    return (
                      s.name_arabic.includes(surahSearch) ||
                      s.translated_name.name.toLowerCase().includes(q) ||
                      String(s.id).includes(q)
                    );
                  })
                  .map((surah) => (
                    <button
                      key={surah.id}
                      onClick={() => { selectSurah(surah.id); setSurahSearch(''); }}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-colors gap-3 ${
                        currentSurah === surah.id && viewMode === 'surah'
                          ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-500'
                          : isDark ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xs font-medium w-6 text-center flex-shrink-0 rounded-md py-0.5 ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{surah.id}</span>
                        <span className="font-arabic text-base truncate">{surah.name_arabic}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{surah.translated_name.name}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Settings Side Drawer */}
        {showSettings && (
        <div className="fixed inset-0 z-[80]">
          {/* Backdrop */}
          <div
            className="drawer-backdrop absolute inset-0 bg-black/50"
            onClick={() => setShowSettings(false)}
          />
          {/* Panel */}
          <div className={`drawer-slide-right absolute top-0 right-0 h-full w-full max-w-sm shadow-2xl border-l flex flex-col ${isDark ? 'bg-[#0f1318] border-gray-800' : 'bg-white border-gray-200'}`}>
            {/* Drawer Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Paramètres</h3>
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
              {/* Language Selection */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Langue</p>
                <div className={`flex gap-2 rounded-xl p-1 border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100/80 border-gray-300/50'}`}>
                  {[
                    { mode: 'arabic' as LanguageMode, label: 'عربي' },
                    { mode: 'french' as LanguageMode, label: 'FR' },
                    { mode: 'both' as LanguageMode, label: 'Les deux' },
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => setLanguageMode(mode)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        languageMode === mode
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                          : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Translation */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Traduction</p>
                <div className={`flex gap-2 rounded-xl p-1 border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100/80 border-gray-300/50'}`}>
                  {([
                    { id: 136, label: 'Montada' },
                    { id: 31, label: 'Hamidullah' },
                  ] as { id: number; label: string }[]).map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedTranslationId(id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTranslationId === id
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                          : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Récitateur */}
              {(() => {
                const reciters = [
                  { id: 7, label: 'Mishari al-Afasy' },
                  { id: 1, label: 'Abdul Basit' },
                  { id: 6, label: 'Sudais' },
                  { id: 8, label: 'Minshawi' },
                ] as { id: number; label: string }[];
                const current = reciters.find(r => r.id === audioReciterId);
                return (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Récitateur</p>
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === 'reciter' ? null : 'reciter')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          isDark ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600' : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        <span>{current?.label ?? '—'}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openDropdown === 'reciter' ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                      {openDropdown === 'reciter' && (
                        <div className={`absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border shadow-xl overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                          {reciters.map(({ id, label }) => (
                            <button
                              key={id}
                              onClick={() => { setAudioReciterId(id); localStorage.setItem('quran-reciter-id', String(id)); stopAudio(); setOpenDropdown(null); }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                                audioReciterId === id
                                  ? isDark ? 'bg-emerald-600/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>{label}</span>
                              {audioReciterId === id && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Font Size */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Taille du texte</p>
                <div className={`flex gap-2 rounded-xl p-1 border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100/80 border-gray-300/50'}`}>
                  {[
                    { size: 'small' as FontSize, label: 'S' },
                    { size: 'medium' as FontSize, label: 'M' },
                    { size: 'large' as FontSize, label: 'L' },
                    { size: 'xlarge' as FontSize, label: 'XL' },
                  ].map(({ size, label }) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        fontSize === size
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                          : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography */}
              {(() => {
                const fonts = [
                  { family: 'scheherazade' as FontFamily, label: 'Scheherazade' },
                  { family: 'amiri' as FontFamily, label: 'Amiri Quran' },
                  { family: 'noto' as FontFamily, label: 'Noto Naskh' },
                ] as { family: FontFamily; label: string }[];
                const current = fonts.find(f => f.family === fontFamily);
                return (
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Typographie</p>
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === 'font' ? null : 'font')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          isDark ? 'bg-gray-800/80 border-gray-700 text-white hover:border-gray-600' : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        <span>{current?.label ?? '—'}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${openDropdown === 'font' ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                      {openDropdown === 'font' && (
                        <div className={`absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border shadow-xl overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                          {fonts.map(({ family, label }) => (
                            <button
                              key={family}
                              onClick={() => { setFontFamily(family); setOpenDropdown(null); }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                                fontFamily === family
                                  ? isDark ? 'bg-emerald-600/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                  : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>{label}</span>
                              {fontFamily === family && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Tajweed Legend */}
              <div className={`pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Couleurs Tajweed</p>
                <div className="flex flex-col gap-2.5">
                  {[
                    { color: '#AAAAAA', label: 'Lettre silencieuse' },
                    { color: '#FFC1E0', label: 'Madd normal (2)' },
                    { color: '#F49E38', label: 'Madd séparé (2/4/6)' },
                    { color: '#CF3D9E', label: 'Madd connecté (4/5)' },
                    { color: '#E04A5A', label: 'Madd nécessaire (6)' },
                    { color: '#39B578', label: "Ghunna / Ikhfa'" },
                    { color: '#49C1CE', label: 'Qalqala (écho)' },
                    { color: '#6DB1DB', label: 'Tafkhim (lourd)' },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Position Picker — bottom sheet */}
        {showPositionPicker && (
          <>
            <div
              className="fixed inset-0 z-[70] bg-black/50"
              onClick={() => setShowPositionPicker(false)}
            />
            <div className={`fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl shadow-2xl px-6 pt-4 pb-10 ${isDark ? 'bg-gray-900 border-t border-gray-800' : 'bg-white border-t border-gray-200'}`}>
              {/* Drag handle */}
              <div className={`w-10 h-1 rounded-full mx-auto mb-5 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

              <p className={`text-center text-base font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {viewMode === 'page' ? 'Aller à la page' : 'Aller à la sourate'}
              </p>

              {/* Number picker */}
              {(() => {
                const max = viewMode === 'page' ? TOTAL_PAGES : 114;
                const bump = (delta: number) => {
                  const next = Math.min(max, Math.max(1, pickerValue + delta));
                  setPickerValue(next);
                  setPickerInputStr(String(next));
                };
                const confirmedValue = Math.min(max, Math.max(1, parseInt(pickerInputStr) || pickerValue));
                return (
                  <>
                    <div className="flex items-center justify-center gap-5 mb-4">
                      <button
                        onClick={() => bump(-1)}
                        className={`w-14 h-14 rounded-2xl text-2xl font-bold transition-all active:scale-90 ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        −
                      </button>

                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={max}
                        value={pickerInputStr}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setPickerInputStr(raw);
                          const v = parseInt(raw);
                          if (!isNaN(v) && v >= 1 && v <= max) setPickerValue(v);
                        }}
                        onBlur={() => {
                          // Re-clamp on blur so progress bar stays accurate
                          const v = parseInt(pickerInputStr);
                          if (isNaN(v) || v < 1) { setPickerInputStr(String(pickerValue)); }
                          else { const clamped = Math.min(max, v); setPickerValue(clamped); setPickerInputStr(String(clamped)); }
                        }}
                        className={`text-6xl font-bold w-36 text-center bg-transparent border-none outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                      />

                      <button
                        onClick={() => bump(1)}
                        className={`w-14 h-14 rounded-2xl text-2xl font-bold transition-all active:scale-90 ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        +
                      </button>
                    </div>

                    {/* Progress sub-label */}
                    <p className={`text-center text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      sur {max}
                    </p>

                    {/* Progress bar */}
                    <div className={`h-1.5 rounded-full mb-6 overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.round((pickerValue / max) * 100)}%` }}
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (viewMode === 'page') setCurrentPage(confirmedValue);
                        else { setCurrentSurah(confirmedValue); setCurrentVersePage(1); }
                        setShowPositionPicker(false);
                        scrollToTop();
                      }}
                      className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition-all active:scale-[0.98]"
                    >
                      Confirmer
                    </button>
                  </>
                );
              })()}
            </div>
          </>
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
              className={`z-50 shadow-xl border
                fixed bottom-0 left-0 right-0 rounded-t-2xl p-4 pb-24
                sm:absolute sm:bottom-auto sm:left-auto sm:right-auto sm:rounded-lg sm:p-2 sm:pb-2
                ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              style={
                typeof window !== 'undefined' && window.innerWidth >= 640
                  ? { top: verseMenuPosition.y, left: verseMenuPosition.x }
                  : {}
              }
            >
              {/* Mobile drag handle */}
              <div className={`w-10 h-1 rounded-full mx-auto mb-4 sm:hidden ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
              <p className={`text-xs px-3 mb-2 sm:hidden ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Verset {selectedVerse.verse_key}
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={saveReadingProgress}
                    disabled={savingProgress || !isAuthenticated}
                    className={`flex items-center gap-3 px-3 py-3 sm:py-2 text-sm text-emerald-500 rounded-xl sm:rounded-md w-full text-left disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
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
                    onClick={() => {
                      if (selectedVerse) {
                        playVerse(selectedVerse.verse_key);
                        setShowVerseMenu(false);
                        setSelectedVerse(null);
                      }
                    }}
                    disabled={audioLoadingKey !== null}
                    className={`flex items-center gap-3 px-3 py-3 sm:py-2 text-sm text-blue-400 rounded-xl sm:rounded-md w-full text-left disabled:opacity-50 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    {audioLoadingKey === selectedVerse?.verse_key
                      ? <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                      : <Play className="h-5 w-5 sm:h-4 sm:w-4" />}
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
