'use client';

import React, { useMemo } from 'react';
import {
  formatDateDisplay,
  formatDateToYMD,
  getDateColumnBounds,
} from '@/lib/excelParser';

interface DateRangeFilterProps {
  dateHeaders: string[];
  rows: Record<string, any>[];
  totalRawRows: number;
  filteredRowsCount: number;
  selectedDateColumn: string;
  onSelectDateColumn: (column: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onResetFilter: () => void;
}

export default function DateRangeFilter({
  dateHeaders,
  rows,
  totalRawRows,
  filteredRowsCount,
  selectedDateColumn,
  onSelectDateColumn,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onResetFilter,
}: DateRangeFilterProps) {
  // Compute dataset date bounds for the currently selected date column
  const bounds = useMemo(() => {
    if (!selectedDateColumn || rows.length === 0) {
      return { minDate: null, maxDate: null, validCount: 0 };
    }
    return getDateColumnBounds(rows, selectedDateColumn);
  }, [rows, selectedDateColumn]);

  const hasActiveDateRange = Boolean(startDate || endDate);

  // Validation: Check if start date is after end date
  const isInvalidRange = useMemo(() => {
    if (startDate && endDate) {
      return startDate > endDate;
    }
    return false;
  }, [startDate, endDate]);

  // Quick preset handlers
  const handlePresetFullRange = () => {
    if (bounds.minDate && bounds.maxDate) {
      onStartDateChange(formatDateToYMD(bounds.minDate));
      onEndDateChange(formatDateToYMD(bounds.maxDate));
    }
  };

  const handlePresetRelativeDays = (days: number) => {
    const referenceDate = bounds.maxDate || new Date();
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - (days - 1));

    // Clamp start date if bounds minDate exists
    if (bounds.minDate && start < bounds.minDate) {
      onStartDateChange(formatDateToYMD(bounds.minDate));
    } else {
      onStartDateChange(formatDateToYMD(start));
    }
    onEndDateChange(formatDateToYMD(referenceDate));
  };

  const handleClearRange = () => {
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900 animate-fadeIn">
      {/* Top Row: Date Column Selector & Dataset Range */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <label htmlFor="date-column-select" className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Date Column:
          </label>
          <div className="relative">
            <select
              id="date-column-select"
              value={selectedDateColumn}
              onChange={(e) => onSelectDateColumn(e.target.value)}
              className="appearance-none rounded-xl border border-emerald-500 bg-white py-1.5 pl-3.5 pr-8 text-xs font-semibold text-slate-800 shadow-2xs transition hover:border-emerald-600 focus:border-emerald-600 focus:outline-hidden dark:border-emerald-500 dark:bg-slate-900 dark:text-slate-100"
            >
              {dateHeaders.map((col) => (
                <option key={col} value={col}>
                  {col} 📅
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Dataset span bounds */}
        {bounds.minDate && bounds.maxDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-500 dark:text-slate-400">Dataset Range:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {formatDateDisplay(bounds.minDate)}
            </span>
            <span className="text-slate-400">—</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {formatDateDisplay(bounds.maxDate)}
            </span>
            <span className="text-[11px] text-slate-400">({bounds.validCount.toLocaleString()} dates)</span>
          </div>
        )}
      </div>

      {/* Date Range Inputs & Presets Container */}
      <div className="mt-3 flex flex-col gap-4 rounded-xl bg-slate-50/80 p-4 sm:flex-row sm:items-end sm:justify-between dark:bg-slate-800/40">
        {/* Date Pickers */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="filter-start-date" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              From (Start Date)
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              min={bounds.minDate ? formatDateToYMD(bounds.minDate) : undefined}
              max={endDate || (bounds.maxDate ? formatDateToYMD(bounds.maxDate) : undefined)}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="filter-end-date" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              To (End Date)
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              min={startDate || (bounds.minDate ? formatDateToYMD(bounds.minDate) : undefined)}
              max={bounds.maxDate ? formatDateToYMD(bounds.maxDate) : undefined}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {hasActiveDateRange && (
            <button
              type="button"
              id="btn-clear-date-range"
              onClick={handleClearRange}
              className="self-end rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Clear Range
            </button>
          )}
        </div>

        {/* Quick Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
            Presets:
          </span>
          {bounds.minDate && bounds.maxDate && (
            <button
              type="button"
              onClick={handlePresetFullRange}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300"
            >
              All Dates
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePresetRelativeDays(7)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => handlePresetRelativeDays(30)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Validation Warning */}
      {isInvalidRange && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-900/60 dark:text-amber-300">
          <svg className="h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>The start date is after the end date. Please adjust your date range to filter transactions.</span>
        </div>
      )}

      {/* Results Summary Bar */}
      {hasActiveDateRange && !isInvalidRange && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Filtered Results:
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                filteredRowsCount > 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {filteredRowsCount.toLocaleString()} of {totalRawRows.toLocaleString()} rows
              {totalRawRows > 0 && ` (${((filteredRowsCount / totalRawRows) * 100).toFixed(1)}%)`}
            </span>
          </div>

          <button
            type="button"
            onClick={onResetFilter}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}
