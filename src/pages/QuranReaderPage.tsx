import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  ChevronLeft,
  ChevronRight,
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
  Save,
  LogIn,
  ChevronDown
} from 'lucide-react';
import {
  getSurahs,
  getPageWithWords,
  getSurahVersesAll,
  getHizbVerses,
  type Surah,
  type VerseWithTranslation,
  type WordWithLine,
  TOTAL_PAGES,
  TOTAL_HIZB
} from '../lib/quranApi';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/useAppStore';
import { useToast } from '../stores/useToast';
import { getDayBounds } from '../lib/utils';

type ViewMode = 'page' | 'surah' | 'hizb';
type LanguageMode = 'arabic' | 'french' | 'both';
type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
type FontFamily = 'amiri' | 'noto';

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
  .drawer-slide-left  { animation: slideInLeft  0.28s ease-out; }
  .drawer-slide-right { animation: slideInRight 0.28s ease-out; }
  .drawer-backdrop    { animation: fadeInBackdrop 0.28s ease-out; }

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
  .verse-number {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    /* Push down to align with the center of the first text line.
       line-height: 2.8 creates ~0.9em of space above the first glyph.
       offset = (leading_above - half_frame_height) ≈ 14px for typical sizes */
    margin-top: 14px;
    margin-left: 6px;
    margin-right: 6px;
    font-family: 'Amiri Quran', serif;
    font-size: 13px;
    color: #e8d5a0;
    font-weight: bold;
    line-height: 1;
    z-index: 0;
  }

  .verse-number::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid rgba(220, 180, 80, 0.7);
    background: radial-gradient(circle, rgba(180,130,30,0.18) 0%, rgba(180,130,30,0.04) 100%);
    z-index: -1;
  }

  .quran-light .verse-number {
    color: #3a2800;
  }

  .quran-light .verse-number::before {
    border-color: rgba(120, 80, 10, 0.5);
    background: radial-gradient(circle, rgba(200,160,40,0.15) 0%, rgba(200,160,40,0.03) 100%);
  }
  
  @media (max-width: 640px) {
    .tajweed-text {
      word-spacing: 4px;
      line-height: 2.4;
    }
  }

  /* ===== MUSHAF PAGE — inline verse number ===== */
  .verse-number-inline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    margin: 0 3px;
    font-family: 'Amiri Quran', serif;
    font-size: 11px;
    color: #e8d5a0;
    font-weight: bold;
    line-height: 1;
    vertical-align: middle;
    position: relative;
    z-index: 0;
  }
  .verse-number-inline::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid rgba(220, 180, 80, 0.7);
    background: radial-gradient(circle, rgba(180,130,30,0.18) 0%, rgba(180,130,30,0.04) 100%);
    z-index: -1;
  }
  .quran-light .verse-number-inline {
    color: #3a2800;
  }
  .quran-light .verse-number-inline::before {
    border-color: rgba(120, 80, 10, 0.5);
    background: radial-gradient(circle, rgba(200,160,40,0.15) 0%, rgba(200,160,40,0.03) 100%);
  }

  /* ===== MUSHAF PAGE — surah header box ===== */
  .surah-header-box {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 8px 28px;
    border-radius: 9999px;
    border: 1px solid rgba(180,130,30,0.35);
    background: rgba(180,130,30,0.08);
  }
  .quran-light .surah-header-box {
    border-color: rgba(160,110,20,0.3);
    background: rgba(255,248,220,0.8);
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
    font-size: 0.65em;
    width: 2.4em;
    height: 2.4em;
    margin: 0 0.15em;
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
  const [viewMode, setViewMode] = useState<ViewMode>('surah');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSurah, setCurrentSurah] = useState(1);
  const [currentHizb, setCurrentHizb] = useState(1);
  
  // UI Settings
  const [languageMode, setLanguageMode] = useState<LanguageMode>('both');
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem('quran-font-size') as FontSize) || 'large'
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(
    () => (localStorage.getItem('quran-font-family') as FontFamily) || 'amiri'
  );
  const [showSurahList, setShowSurahList] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  const [surahDrawerTab, setSurahDrawerTab] = useState<'surah' | 'hizb'>('surah');
  const [showSettings, setShowSettings] = useState(false);
  
  // Page mode word-level data (for exact mushaf line layout)
  const [pageWords, setPageWords] = useState<WordWithLine[]>([]);

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

  // Mushaf no-scroll: auto font size
  const headerRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);
  const mushafNoScrollRef = useRef<HTMLDivElement>(null);
  const [mushafAutoFontSize, setMushafAutoFontSize] = useState(18);

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
          const result = await getPageWithWords(currentPage);
          data = result.verses;
          setPageWords(result.allWords);
          setTotalVersePages(1);
          setCurrentVersePage(1);
        } else if (viewMode === 'surah') {
          data = await getSurahVersesAll(currentSurah);
          setTotalVersePages(1);
          setCurrentVersePage(1);
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
    if (viewMode === 'hizb') return Math.round((currentHizb / TOTAL_HIZB) * 100);
    return 0;
  }, [viewMode, currentSurah, currentPage, currentHizb]);

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
        // Verse-end ornament with Western numerals (1, 2, 3...)
        const verseNum = parseInt(word.verse_key.split(':')[1]);
        itemHtml = `<span class="verse-number-inline">${verseNum}</span>`;
      } else if (word.text_uthmani_tajweed) {
        // PRIMARY: word-level tajweed from API. The API returns <rule class=...> tags
        // at the word level, while the verse level uses <tajweed class=...>.
        // processWordTajweed normalizes <rule> → <tajweed> then applies full processing.
        itemHtml = processWordTajweed(word.text_uthmani_tajweed);
      } else {
        // FALLBACK: verse-level tajweed split by position.
        // word.position is 1-indexed within the verse (absolute, works cross-page).
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
      const navH = bottomNavRef.current?.offsetHeight ?? 64;
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
      const computed = Math.floor((availH - pageInfoH) / totalFlex / 2.2);
      setMushafAutoFontSize(Math.min(computed, 30));
    };
    compute();
    // Observe the header (not the container itself, to avoid resize loops).
    // Window resize covers viewport size changes (rotation, browser chrome show/hide).
    const ro = new ResizeObserver(compute);
    if (headerRef.current) ro.observe(headerRef.current);
    if (bottomNavRef.current) ro.observe(bottomNavRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [viewMode, mushafLines.length, pageInfo]);

  // Keyboard navigation (arrow keys) — ← next, → prev (RTL convention)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') goToPrev();
      if (e.key === 'ArrowLeft') goToNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewMode, currentPage, currentSurah, currentHizb]);

  // Scroll to top on content change
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Navigation handlers
  const goToNext = () => {
    if (viewMode === 'page') {
      setCurrentPage(prev => Math.min(prev + 1, TOTAL_PAGES));
    } else if (viewMode === 'surah') {
      setCurrentSurah(prev => Math.min(prev + 1, 114));
      setCurrentVersePage(1);
    } else if (viewMode === 'hizb') {
      setCurrentHizb(prev => Math.min(prev + 1, TOTAL_HIZB));
    }
    scrollToTop();
  };

  const goToPrev = () => {
    if (viewMode === 'page') {
      setCurrentPage(prev => Math.max(prev - 1, 1));
    } else if (viewMode === 'surah') {
      setCurrentSurah(prev => Math.max(prev - 1, 1));
      setCurrentVersePage(1);
    } else if (viewMode === 'hizb') {
      setCurrentHizb(prev => Math.max(prev - 1, 1));
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
    // Only trigger if horizontal swipe > 60px and not a vertical scroll
    if (Math.abs(dx) > 60 && dy < 40) {
      if (dx > 0) goToNext();
      else goToPrev();
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
        if (mode === 'hizb' && position.hizb_number) {
          setCurrentHizb(position.hizb_number);
        } else if (mode === 'page' && position.page_number) {
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
    setCurrentSurah(id);
    setCurrentVersePage(1);
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
    if (viewMode === 'hizb') return `Hizb ${currentHizb} / ${TOTAL_HIZB}`;
    return '';
  };

  const isAuthenticated = !!user;

  return (
    <>
      <style>{tajweedStyles}</style>
      
      <div
        className={`quran-container min-h-screen ${isDark ? '' : 'quran-light'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div ref={headerRef} className={`sticky top-0 z-30 backdrop-blur-md border-b ${isDark ? 'bg-[#1a1f2e]/95 border-gray-700/50' : 'bg-white/95 border-gray-200/80'}`}>
          <div className="max-w-5xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              {/* Title */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="p-1.5 bg-emerald-900/50 rounded-lg border border-emerald-700/30">
                  <Book className="h-4 w-4 text-emerald-400" />
                </div>
                <h1 className={`text-base font-bold font-arabic ${isDark ? 'text-white' : 'text-gray-900'}`}>القرآن الكريم</h1>
              </div>

              {/* View Mode - Desktop: 3 buttons, Mobile: Dropdown */}
              <div className={`hidden md:flex items-center gap-1 rounded-xl p-1 border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100/80 border-gray-300/50'}`}>
                {[
                  { mode: 'surah' as ViewMode, icon: BookOpen, label: 'Sourate' },
                  { mode: 'page' as ViewMode, icon: FileText, label: 'Page' },
                  { mode: 'hizb' as ViewMode, icon: Layers, label: 'Hizb' },
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => switchViewMode(mode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      viewMode === mode
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                        : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${isDark ? 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-700/50' : 'bg-gray-100/80 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 border-gray-300/50'}`}
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
                  <div className={`absolute right-0 mt-2 w-32 rounded-lg shadow-lg z-50 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    {[
                      { mode: 'surah' as ViewMode, label: 'Sourate' },
                      { mode: 'page' as ViewMode, label: 'Page' },
                      { mode: 'hizb' as ViewMode, label: 'Hizb' },
                    ].map(({ mode, label }) => (
                      <button
                        key={mode}
                        onClick={() => {
                          switchViewMode(mode);
                          setShowViewModeDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                          viewMode === mode
                            ? 'bg-emerald-600 text-white'
                            : isDark ? 'text-gray-400 hover:bg-gray-700/50 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                  className={`hidden sm:block p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700/50 text-gray-400 hover:text-white' : 'hover:bg-gray-200/70 text-gray-500 hover:text-gray-900'}`}
                  title="Liste des sourates"
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`hidden sm:block p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-gray-700/50 text-gray-400 hover:text-white' : 'hover:bg-gray-200/70 text-gray-500 hover:text-gray-900'}`}
                  title="Paramètres"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className={`h-0.5 w-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${readingProgress}%` }}
            />
          </div>
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
                    <span>صفحة {toArabicNumerals(currentPage)}</span>
                  </div>
                )}

                {/* Mushaf no-scroll container — lines fill available height */}
                <div
                  className={`mushaf-no-scroll flex-1 min-h-0 ${fontFamily === 'noto' ? 'font-noto' : ''}`}
                  style={{ fontSize: `${mushafAutoFontSize}px` }}
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
                        {/* Surah header (compact) */}
                        {line.newSurahBefore && (
                          <div className="surah-header-compact text-center">
                            <div className="surah-header-box" style={{ display: 'inline-flex', padding: '2px 14px', gap: '8px' }}>
                              <span
                                className={`font-bold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}
                                style={{ fontFamily: "'Amiri Quran', serif", fontSize: `${mushafAutoFontSize * 0.85}px` }}
                              >
                                سُورَة {si?.name_arabic}
                              </span>
                              {si?.translated_name?.name && (
                                <span className={`font-medium ${isDark ? 'text-amber-500' : 'text-amber-700'}`}
                                  style={{ fontSize: `${mushafAutoFontSize * 0.5}px` }}>
                                  {si.translated_name.name}
                                </span>
                              )}
                            </div>
                            {line.newSurahBefore.hasBismillah && (
                              <div className={`bismillah-text ${fontFamily === 'noto' ? 'font-noto' : ''}`}
                                style={{ fontSize: `${mushafAutoFontSize * 1.1}px` }}>﷽</div>
                            )}
                          </div>
                        )}

                        {/* The mushaf line — each word clickable */}
                        <div className={`mushaf-line tajweed-text ${fontFamily === 'noto' ? 'font-noto' : ''}`}>
                          {line.items.map((item, wi) => (
                            <span
                              key={wi}
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                const verse = verses.find(v => v.verse_key === item.verseKey);
                                if (verse) handleVerseClick(verse, e as unknown as React.MouseEvent);
                              }}
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
              disabled={
                (viewMode === 'surah' && currentSurah <= 1) ||
                (viewMode === 'hizb' && currentHizb <= 1)
              }
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
              disabled={
                (viewMode === 'surah' && currentSurah >= 114) ||
                (viewMode === 'hizb' && currentHizb >= TOTAL_HIZB)
              }
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
                {/* Bismillah — shown when first verse is verse 1 of a surah (except Al-Fatiha and At-Tawbah) */}
                {(() => {
                  if (viewMode === 'surah') return currentSurah !== 1 && currentSurah !== 9;
                  if (verses.length > 0 && verses[0].verse_number === 1) {
                    const surahNum = parseInt(verses[0].verse_key.split(':')[0]);
                    return surahNum !== 1 && surahNum !== 9;
                  }
                  return false;
                })() && (
                  <div className={`text-center py-3 mb-2 border-b ${isDark ? 'border-gray-800/50' : 'border-gray-200/50'}`}>
                    <p className={`bismillah-text ${fontFamily === 'noto' ? 'font-noto' : ''}`}>
                      ﷽
                    </p>
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
                          className={`tajweed-text ${fontFamily === 'noto' ? 'font-noto' : ''} ${fontSizes[fontSize]} flex-1`}
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
              {viewMode === 'hizb' && (
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Hizb:</span>
                  <input
                    type="number"
                    min={1}
                    max={TOTAL_HIZB}
                    value={currentHizb}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= TOTAL_HIZB) setCurrentHizb(val);
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val) || val < 1 || val > TOTAL_HIZB) setCurrentHizb(1);
                    }}
                    className="input-modern w-20 text-center"
                  />
                </div>
              )}
            </div>
          )}

        </div>
        )} {/* end viewMode !== 'page' */}

        {/* Bottom Navigation Bar */}
        <div ref={bottomNavRef} className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md ${isDark ? 'bg-[#1a1f2e]/95 border-gray-700/50' : 'bg-white/95 border-gray-200/80'}`}>
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            {/* Previous */}
            <button
              onClick={goToPrev}
              disabled={
                (viewMode === 'page' && currentPage <= 1) ||
                (viewMode === 'surah' && currentSurah <= 1) ||
                (viewMode === 'hizb' && currentHizb <= 1)
              }
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${isDark ? 'text-gray-400 hover:text-white active:bg-gray-700/50' : 'text-gray-500 hover:text-gray-900 active:bg-gray-100'}`}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[10px]">Précédent</span>
            </button>

            {/* Surah List */}
            <button
              onClick={() => setShowSurahList(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:text-white active:bg-gray-700/50' : 'text-gray-500 hover:text-gray-900 active:bg-gray-100'}`}
            >
              <List className="h-5 w-5" />
              <span className="text-[10px]">Sourates</span>
            </button>

            {/* Current Position (center) — clickable to open picker */}
            <button
              onClick={() => { const v = viewMode === 'page' ? currentPage : viewMode === 'hizb' ? currentHizb : currentSurah; setPickerValue(v); setPickerInputStr(String(v)); setShowPositionPicker(true); }}
              className={`flex flex-col items-center px-2 min-w-0 max-w-[110px] rounded-xl py-1 transition-colors active:scale-95 ${isDark ? 'hover:bg-gray-700/50 active:bg-gray-700' : 'hover:bg-gray-100 active:bg-gray-200'}`}
            >
              <span className={`text-sm font-bold font-arabic truncate w-full text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {getPositionLabel()}
              </span>
              <span className="text-[10px] text-emerald-500">{readingProgress}% · appuyer</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isDark ? 'text-gray-400 hover:text-white active:bg-gray-700/50' : 'text-gray-500 hover:text-gray-900 active:bg-gray-100'}`}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px]">Réglages</span>
            </button>

            {/* Next */}
            <button
              onClick={goToNext}
              disabled={
                (viewMode === 'page' && currentPage >= TOTAL_PAGES) ||
                (viewMode === 'surah' && currentSurah >= 114) ||
                (viewMode === 'hizb' && currentHizb >= TOTAL_HIZB)
              }
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${isDark ? 'text-gray-400 hover:text-white active:bg-gray-700/50' : 'text-gray-500 hover:text-gray-900 active:bg-gray-100'}`}
            >
              <ChevronRight className="h-5 w-5" />
              <span className="text-[10px]">Suivant</span>
            </button>
          </div>
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

            {/* Tabs */}
            <div className={`flex gap-1 px-5 py-3 border-b flex-shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              {([
                { tab: 'surah' as const, label: 'Sourates' },
                { tab: 'hizb' as const, label: 'Hizb' },
              ]).map(({ tab, label }) => (
                <button
                  key={tab}
                  onClick={() => setSurahDrawerTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    surahDrawerTab === tab
                      ? 'bg-emerald-600 text-white'
                      : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search (surah tab only) */}
            {surahDrawerTab === 'surah' && (
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
              {surahDrawerTab === 'surah' ? (
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
              ) : (
                <div className="p-4 grid grid-cols-5 gap-2">
                  {Array.from({ length: TOTAL_HIZB }, (_, i) => i + 1).map((hizb) => (
                    <button
                      key={hizb}
                      onClick={() => { setCurrentHizb(hizb); setViewMode('hizb'); setShowSurahList(false); }}
                      className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                        currentHizb === hizb && viewMode === 'hizb'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                          : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {hizb}
                    </button>
                  ))}
                </div>
              )}
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
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Typographie</p>
                <div className={`flex gap-2 rounded-xl p-1 border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100/80 border-gray-300/50'}`}>
                  {([
                    { family: 'amiri' as FontFamily, label: 'Amiri Quran' },
                    { family: 'noto' as FontFamily, label: 'Noto Naskh' },
                  ] as { family: FontFamily; label: string }[]).map(({ family, label }) => (
                    <button
                      key={family}
                      onClick={() => setFontFamily(family)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        fontFamily === family
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50'
                          : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

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
                {viewMode === 'page' ? 'Aller à la page' : viewMode === 'hizb' ? 'Aller au hizb' : 'Aller à la sourate'}
              </p>

              {/* Number picker */}
              {(() => {
                const max = viewMode === 'page' ? TOTAL_PAGES : viewMode === 'hizb' ? TOTAL_HIZB : 114;
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
                        else if (viewMode === 'hizb') setCurrentHizb(confirmedValue);
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
