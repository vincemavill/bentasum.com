'use client';

import React, { useMemo, useState } from 'react';
import {
  formatDateDisplay,
  formatDateToYMD,
  getDateColumnBounds,
  getAvailableMonthsForColumn,
} from '@/lib/excelParser';

interface DateRangeFilterProps {
  dateHeaders: string[];
  rows: Record<string, any>[];
  totalRawRows: number;
  filteredRowsCount: number;
  selectedDateColumn: string;
  onSelectDateColumn: (column: string) => void;
  filterMode: 'range' | 'months';
  onFilterModeChange: (mode: 'range' | 'months') => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  selectedMonths: string[];
  onSelectedMonthsChange: (months: string[]) => void;
  onResetFilter: () => void;
}

export default function DateRangeFilter({
  dateHeaders,
  rows,
  totalRawRows,
  filteredRowsCount,
  selectedDateColumn,
  onSelectDateColumn,
  filterMode,
  onFilterModeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedMonths,
  onSelectedMonthsChange,
  onResetFilter,
}: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<'all' | 7 | 30 | null>(null);
  // Compute dataset date bounds for the currently selected date column
  const bounds = useMemo(() => {
    if (!selectedDateColumn || rows.length === 0) {
      return { minDate: null, maxDate: null, validCount: 0 };
    }
    return getDateColumnBounds(rows, selectedDateColumn);
  }, [rows, selectedDateColumn]);

  // Compute available calendar months in the selected date column
  const availableMonths = useMemo(() => {
    if (!selectedDateColumn || rows.length === 0) return [];
    return getAvailableMonthsForColumn(rows, selectedDateColumn);
  }, [rows, selectedDateColumn]);

  const hasActiveDateRange = Boolean(startDate || endDate);
  const hasActiveMonthsFilter =
    availableMonths.length > 0 && selectedMonths.length < availableMonths.length;

  // Validation: Check if start date is after end date
  const isInvalidRange = useMemo(() => {
    if (startDate && endDate) {
      return startDate > endDate;
    }
    return false;
  }, [startDate, endDate]);

  // Computed preset target ranges
  const preset7Range = useMemo(() => {
    const referenceDate = bounds.maxDate || new Date();
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 6);
    const s = bounds.minDate && start < bounds.minDate ? formatDateToYMD(bounds.minDate) : formatDateToYMD(start);
    const e = formatDateToYMD(referenceDate);
    return { start: s, end: e };
  }, [bounds]);

  const preset30Range = useMemo(() => {
    const referenceDate = bounds.maxDate || new Date();
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 29);
    const s = bounds.minDate && start < bounds.minDate ? formatDateToYMD(bounds.minDate) : formatDateToYMD(start);
    const e = formatDateToYMD(referenceDate);
    return { start: s, end: e };
  }, [bounds]);

  const isAllDatesActive = useMemo(() => {
    if (!bounds.minDate || !bounds.maxDate || !startDate || !endDate) return false;
    const allStart = formatDateToYMD(bounds.minDate);
    const allEnd = formatDateToYMD(bounds.maxDate);
    if (startDate === allStart && endDate === allEnd) {
      if (allStart === preset7Range.start && activePreset === 7) return false;
      if (allStart === preset30Range.start && activePreset === 30) return false;
      return true;
    }
    return false;
  }, [bounds, startDate, endDate, preset7Range, preset30Range, activePreset]);

  const isLast7DaysActive = useMemo(() => {
    if (!startDate || !endDate) return false;
    if (startDate === preset7Range.start && endDate === preset7Range.end) {
      if (isAllDatesActive && activePreset === 'all') return false;
      return true;
    }
    return false;
  }, [startDate, endDate, preset7Range, isAllDatesActive, activePreset]);

  const isLast30DaysActive = useMemo(() => {
    if (!startDate || !endDate) return false;
    if (startDate === preset30Range.start && endDate === preset30Range.end) {
      if (isAllDatesActive && activePreset === 'all') return false;
      return true;
    }
    return false;
  }, [startDate, endDate, preset30Range, isAllDatesActive, activePreset]);

  // Mode switch handlers: always reset each filter state when switching modes
  const handleSwitchToRange = () => {
    if (filterMode === 'range') return;
    setActivePreset(null);
    onFilterModeChange('range');
    onStartDateChange('');
    onEndDateChange('');
    onSelectedMonthsChange(availableMonths.map((m) => m.key));
  };

  const handleSwitchToMonths = () => {
    if (filterMode === 'months') return;
    setActivePreset(null);
    onFilterModeChange('months');
    onStartDateChange('');
    onEndDateChange('');
    onSelectedMonthsChange(availableMonths.map((m) => m.key));
  };

  // Quick preset handlers for Date Range
  const handlePresetFullRange = () => {
    setActivePreset('all');
    if (bounds.minDate && bounds.maxDate) {
      onStartDateChange(formatDateToYMD(bounds.minDate));
      onEndDateChange(formatDateToYMD(bounds.maxDate));
    }
  };

  const handlePresetRelativeDays = (days: number) => {
    setActivePreset(days as 7 | 30);
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
    setActivePreset(null);
    onStartDateChange('');
    onEndDateChange('');
  };

  // Month Checkbox Handlers
  const handleSelectAllMonths = () => {
    onSelectedMonthsChange(availableMonths.map((m) => m.key));
  };

  const handleSelectLatestMonth = () => {
    if (availableMonths.length > 0) {
      onSelectedMonthsChange([availableMonths[availableMonths.length - 1].key]);
    }
  };

  const handleToggleMonth = (key: string) => {
    if (selectedMonths.includes(key)) {
      // Must keep at least 1 month enabled
      if (selectedMonths.length <= 1) {
        return;
      }
      onSelectedMonthsChange(selectedMonths.filter((m) => m !== key));
    } else {
      onSelectedMonthsChange([...selectedMonths, key]);
    }
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

      {/* Mutually Exclusive Filter Mode Switcher */}
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Filter Option:
          </span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/90 p-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800/90">
            <button
              type="button"
              id="filter-mode-range"
              onClick={handleSwitchToRange}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                filterMode === 'range'
                  ? 'bg-white text-emerald-700 shadow-2xs dark:bg-slate-900 dark:text-emerald-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Date Range</span>
            </button>
            <button
              type="button"
              id="filter-mode-months"
              onClick={handleSwitchToMonths}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                filterMode === 'months'
                  ? 'bg-white text-emerald-700 shadow-2xs dark:bg-slate-900 dark:text-emerald-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Specific Months</span>
              {availableMonths.length > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filterMode === 'months'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {availableMonths.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Informative Helper Tag */}
        <span className="text-[11px] text-slate-400">
          {filterMode === 'range'
            ? 'Custom start & end date range filter'
            : 'Select specific months using checkboxes'}
        </span>
      </div>

      {/* OPTION 1: Date Range Inputs & Presets Container */}
      {filterMode === 'range' && (
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
                onChange={(e) => {
                  setActivePreset(null);
                  onStartDateChange(e.target.value);
                }}
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
                onChange={(e) => {
                  setActivePreset(null);
                  onEndDateChange(e.target.value);
                }}
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
                className={`rounded-md px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all ${
                  isAllDatesActive
                    ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20 shadow-xs dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-400/20'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300'
                }`}
              >
                All Dates
              </button>
            )}
            <button
              type="button"
              onClick={() => handlePresetRelativeDays(7)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all ${
                isLast7DaysActive
                  ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20 shadow-xs dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-400/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetRelativeDays(30)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all ${
                isLast30DaysActive
                  ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20 shadow-xs dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-400/20'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      )}

      {/* OPTION 2: Months Checkbox Filter Container */}
      {filterMode === 'months' && (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50/80 p-4 dark:bg-slate-800/40 animate-fadeIn">
          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Months to Include:
              </span>
              <span className="rounded-md bg-emerald-100/90 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {selectedMonths.length} of {availableMonths.length} selected
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllMonths}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300"
              >
                Select All
              </button>
              {availableMonths.length > 1 && (
                <button
                  type="button"
                  onClick={handleSelectLatestMonth}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300"
                >
                  Latest Month
                </button>
              )}
            </div>
          </div>

          {/* Month Checkbox Cards Grid */}
          {availableMonths.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No valid monthly date records found in column &quot;{selectedDateColumn}&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {availableMonths.map((month) => {
                const isChecked = selectedMonths.includes(month.key);
                const isLastRemaining = isChecked && selectedMonths.length <= 1;
                return (
                  <label
                    key={month.key}
                    title={isLastRemaining ? 'At least 1 month must remain enabled' : undefined}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 select-none transition-all ${
                      isLastRemaining
                        ? 'cursor-not-allowed border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-2xs dark:border-emerald-500/80 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : isChecked
                        ? 'cursor-pointer border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-2xs dark:border-emerald-500/80 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'cursor-pointer border-slate-200 bg-white text-slate-700 opacity-60 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLastRemaining}
                      onChange={() => handleToggleMonth(month.key)}
                      className={`h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:checked:bg-emerald-500 ${
                        isLastRemaining ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">
                        {month.shortLabel}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {month.count.toLocaleString()} rows
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Validation Warning for Date Range */}
      {filterMode === 'range' && isInvalidRange && (
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
      {((filterMode === 'range' && hasActiveDateRange && !isInvalidRange) ||
        (filterMode === 'months' && hasActiveMonthsFilter)) && (
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
            {filterMode === 'months' && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                ({selectedMonths.length} of {availableMonths.length} months active)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onResetFilter}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
          >
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}
