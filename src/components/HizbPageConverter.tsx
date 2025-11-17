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
        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
      >
        <Calculator className="h-4 w-4" />
        <span className="text-sm font-medium">Convertisseur</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Converter panel */}
      {isExpanded && (
        <div className="mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-purple-600" />
            Page ↔ Hizb
          </h3>

          {/* Page to Hizb */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <div className="text-lg text-gray-400 dark:text-gray-500">→</div>
              <div className="w-20 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md text-center font-bold text-purple-700 dark:text-purple-300 text-sm">
                {getPageResult()}
              </div>
            </div>
            {pageInput && !isNaN(Number(pageInput)) && Number(pageInput) > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Page {pageInput} = {(Number(pageInput) / PAGES_PER_HIZB).toFixed(2)} hizb ≈ <strong>{getPageResult()} hizb</strong> (arrondi au supérieur)
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>

          {/* Hizb to Page */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <div className="text-lg text-gray-400 dark:text-gray-500">→</div>
              <div className="w-20 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md text-center font-bold text-purple-700 dark:text-purple-300 text-sm">
                {getHizbResult()}
              </div>
            </div>
            {hizbInput && !isNaN(Number(hizbInput)) && Number(hizbInput) > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {hizbInput} hizb ≈ <strong>{getHizbResult()} pages</strong>
              </p>
            )}
          </div>

          {/* Info */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              📖 1 Hizb = 10.05 pages<br />
              📚 60 Hizb = 603 pages (Coran complet)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

