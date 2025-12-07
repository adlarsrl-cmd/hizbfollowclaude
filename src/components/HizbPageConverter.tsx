import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

// Conversion constants
const PAGES_PER_HIZB = 10.05;
const TOTAL_PAGES = 603;
const TOTAL_HIZB = 60;

export function HizbPageConverter() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const [hizbInput, setHizbInput] = useState('');

  // Page → Hizb (round up)
  const pageToHizb = (page: number): number => {
    if (page <= 0) return 0;
    if (page >= TOTAL_PAGES) return TOTAL_HIZB;
    return Math.ceil(page / PAGES_PER_HIZB);
  };

  // Hizb → Page
  const hizbToPage = (hizb: number): number => {
    if (hizb <= 0) return 0;
    if (hizb >= TOTAL_HIZB) return TOTAL_PAGES;
    return Math.round(hizb * PAGES_PER_HIZB);
  };

  const handlePageChange = (value: string) => {
    setPageInput(value);
    setHizbInput(''); // Clear the other input
  };

  const handleHizbChange = (value: string) => {
    setHizbInput(value);
    setPageInput(''); // Clear the other input
  };

  const getPageResult = () => {
    const num = Number(pageInput);
    if (!pageInput || isNaN(num)) return '-';
    return pageToHizb(num);
  };

  const getHizbResult = () => {
    const num = Number(hizbInput);
    if (!hizbInput || isNaN(num)) return '-';
    return hizbToPage(num);
  };

  return (
    <div className="fixed top-20 right-4 z-30">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 bg-purple-600/90 hover:bg-purple-700/90 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-purple-500/20 backdrop-blur-sm transition-all duration-200 transform hover:scale-105"
      >
        <Calculator className="h-4 w-4" />
        <span className="text-sm font-bold">Convertisseur</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Converter panel */}
      {isExpanded && (
        <div className="mt-3 glass-panel rounded-2xl p-5 w-72 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Calculator className="h-4 w-4" />
            </div>
            Page ↔ Hizb
          </h3>

          {/* Page to Hizb */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Page → Hizb
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={TOTAL_PAGES}
                value={pageInput}
                onChange={(e) => handlePageChange(e.target.value)}
                placeholder="Page (1-603)"
                className="input-modern w-full text-sm font-medium"
              />
              <div className="text-lg text-slate-300 dark:text-slate-600">→</div>
              <div className="w-20 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-center font-bold text-purple-700 dark:text-purple-300 text-sm shadow-sm">
                {getPageResult()}
              </div>
            </div>
            {pageInput && !isNaN(Number(pageInput)) && Number(pageInput) > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                Arrondi au supérieur
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-4"></div>

          {/* Hizb to Page */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Hizb → Page
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={TOTAL_HIZB}
                value={hizbInput}
                onChange={(e) => handleHizbChange(e.target.value)}
                placeholder="Hizb (1-60)"
                className="input-modern w-full text-sm font-medium"
              />
              <div className="text-lg text-slate-300 dark:text-slate-600">→</div>
              <div className="w-20 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-center font-bold text-purple-700 dark:text-purple-300 text-sm shadow-sm">
                {getHizbResult()}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              📖 1 Hizb = 10.05 pages<br />
              📚 60 Hizb = 603 pages
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

