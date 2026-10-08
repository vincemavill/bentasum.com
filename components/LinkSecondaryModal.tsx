'use client';

import React, { useMemo, useState } from 'react';
import { SecondaryLookupFile, JoinConfig } from '@/types/profile';
import { calculateJoinPreview } from '@/lib/excelParser';

interface LinkSecondaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryFileName: string;
  visiblePrimaryColumns: string[]; // Only checked/selected primary columns
  primaryRows: Record<string, any>[];
  secondaryFile: SecondaryLookupFile;
  currentJoinConfig: JoinConfig | null;
  onApplyJoin: (config: JoinConfig) => void;
}

export default function LinkSecondaryModal({
  isOpen,
  onClose,
  primaryFileName,
  visiblePrimaryColumns,
  primaryRows,
  secondaryFile,
  currentJoinConfig,
  onApplyJoin,
}: LinkSecondaryModalProps) {
  // Active section tab: 'join' (default first) | 'visibility' (second)
  const [activeTab, setActiveTab] = useState<'join' | 'visibility'>('join');

  // Primary key selection: ONLY from visiblePrimaryColumns
  const [primaryKey, setPrimaryKey] = useState<string>(() => {
    if (currentJoinConfig?.primaryKey && visiblePrimaryColumns.includes(currentJoinConfig.primaryKey)) {
      return currentJoinConfig.primaryKey;
    }
    // Auto-detect best key in visiblePrimaryColumns
    const auto =
      visiblePrimaryColumns.find((h) => /order[_\s-]?id/i.test(h)) ||
      visiblePrimaryColumns.find((h) => /order[_\s-]?number/i.test(h)) ||
      visiblePrimaryColumns.find((h) => /orderitemid/i.test(h)) ||
      visiblePrimaryColumns.find((h) => /\bsku\b/i.test(h)) ||
      visiblePrimaryColumns[0] ||
      '';
    return auto;
  });

  // Secondary key selection
  const [secondaryKey, setSecondaryKey] = useState<string>(() => {
    if (currentJoinConfig?.secondaryKey && secondaryFile.headers.includes(currentJoinConfig.secondaryKey)) {
      return currentJoinConfig.secondaryKey;
    }
    // Auto-detect best key in secondary
    const auto =
      secondaryFile.headers.find((h) => /product[_\s-]?order[_\s-]?id/i.test(h)) ||
      secondaryFile.headers.find((h) => /order[_\s-]?id/i.test(h)) ||
      secondaryFile.headers.find((h) => /order[_\s-]?number/i.test(h)) ||
      secondaryFile.headers.find((h) => /\bsku\b/i.test(h)) ||
      secondaryFile.headers[0] ||
      '';
    return auto;
  });

  // Column Visibility: Selected columns from secondary file to include in preview table and export
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    if (currentJoinConfig?.selectedColumns && currentJoinConfig.selectedColumns.length > 0) {
      return currentJoinConfig.selectedColumns;
    }
    // By default, select all secondary columns EXCEPT the join key itself
    const initial = secondaryFile.headers.filter((h) => {
      const isKey = /order[_\s-]?id|product[_\s-]?order[_\s-]?id|order[_\s-]?number/i.test(h);
      return !isKey;
    });
    return initial.length > 0 ? initial : secondaryFile.headers;
  });

  // Column search filter
  const [colSearch, setColSearch] = useState('');

  // Target aliases to prevent collision with primary headers
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>(() => {
    const aliases: Record<string, string> = { ...(currentJoinConfig?.columnAliases || {}) };
    for (const secCol of secondaryFile.headers) {
      if (!aliases[secCol]) {
        if (visiblePrimaryColumns.includes(secCol)) {
          aliases[secCol] = `[Lookup] ${secCol}`;
        } else {
          aliases[secCol] = secCol;
        }
      }
    }
    return aliases;
  });

  // Ensure Join Key Mapping tab is always visible first whenever the modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('join');
    }
  }, [isOpen]);

  // Update primaryKey if visiblePrimaryColumns changed and primaryKey is not in it
  React.useEffect(() => {
    if (!visiblePrimaryColumns.includes(primaryKey) && visiblePrimaryColumns.length > 0) {
      const auto =
        visiblePrimaryColumns.find((h) => /order[_\s-]?id/i.test(h)) ||
        visiblePrimaryColumns.find((h) => /order[_\s-]?number/i.test(h)) ||
        visiblePrimaryColumns.find((h) => /\bsku\b/i.test(h)) ||
        visiblePrimaryColumns[0];
      setPrimaryKey(auto);
    }
  }, [visiblePrimaryColumns, primaryKey]);

  // Calculate live preview metrics
  const previewStats = useMemo(() => {
    return calculateJoinPreview({
      primaryRows,
      primaryKey,
      secondaryRows: secondaryFile.rows,
      secondaryKey,
      sampleLimit: 3,
    });
  }, [primaryRows, primaryKey, secondaryFile.rows, secondaryKey]);

  if (!isOpen) return null;

  const toggleColumn = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  const handleSelectAll = () => {
    setSelectedColumns(secondaryFile.headers.filter((h) => h !== secondaryKey));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleAliasChange = (sourceCol: string, targetName: string) => {
    setColumnAliases((prev) => ({
      ...prev,
      [sourceCol]: targetName.trim() || sourceCol,
    }));
  };

  const handleSave = () => {
    if (!primaryKey || !secondaryKey) {
      alert('Please select both a Primary Key and a Secondary Matching Key.');
      setActiveTab('join');
      return;
    }
    if (selectedColumns.length === 0) {
      alert('Please select at least one column from the secondary file to include.');
      setActiveTab('visibility');
      return;
    }

    onApplyJoin({
      primaryKey,
      secondaryKey,
      selectedColumns,
      columnAliases,
    });
    onClose();
  };

  // Filtered secondary columns
  const filteredSecondaryCols = secondaryFile.headers.filter((col) =>
    col.toLowerCase().includes(colSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xs">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Secondary File Link Settings</span>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                  VLOOKUP / JOIN
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Match records and configure which lookup columns appear in your unified table &amp; export.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Section Navigation Stepper Tabs (High-Visibility Controls) */}
        <div className="border-b border-slate-200 bg-slate-100/80 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              Configuration Steps
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeTab === 'join' ? 'Step 1 of 2: Join Key Mapping' : 'Step 2 of 2: Column Visibility'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Step 1: Join Key Mapping (Visible first by default) */}
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`group relative flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition-all duration-200 cursor-pointer border-2 ${
                activeTab === 'join'
                  ? 'bg-white border-indigo-600 shadow-md ring-4 ring-indigo-500/10 dark:bg-slate-900 dark:border-indigo-500'
                  : 'bg-white/70 border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-white hover:shadow-xs dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs transition-colors ${
                    activeTab === 'join'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300'
                  }`}
                >
                  1
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-black tracking-wide ${
                        activeTab === 'join'
                          ? 'text-indigo-950 dark:text-white'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      Join Key Mapping
                    </span>
                    <span className="rounded-sm bg-indigo-50 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Step 1
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Match shared identifier
                  </div>
                </div>
              </div>

              {previewStats.matchRate > 0 ? (
                <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{previewStats.matchRate.toFixed(0)}% Match</span>
                </span>
              ) : (
                <span className="hidden sm:inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                  Keys Required
                </span>
              )}
            </button>

            {/* Step 2: Column Visibility (Second) */}
            <button
              type="button"
              onClick={() => setActiveTab('visibility')}
              className={`group relative flex items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition-all duration-200 cursor-pointer border-2 ${
                activeTab === 'visibility'
                  ? 'bg-white border-indigo-600 shadow-md ring-4 ring-indigo-500/10 dark:bg-slate-900 dark:border-indigo-500'
                  : 'bg-white/70 border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-white hover:shadow-xs dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-xs transition-colors ${
                    activeTab === 'visibility'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300'
                  }`}
                >
                  2
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-black tracking-wide ${
                        activeTab === 'visibility'
                          ? 'text-indigo-950 dark:text-white'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      Column Visibility
                    </span>
                    <span className="rounded-sm bg-indigo-50 px-1 py-0.2 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Step 2
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Select columns to include
                  </div>
                </div>
              </div>

              <span
                className={`hidden sm:inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold shadow-2xs ${
                  activeTab === 'visibility'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900'
                }`}
              >
                {selectedColumns.length} Selected
              </span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File summary badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Primary Sales Dataset
              </div>
              <div className="mt-1 font-bold text-slate-900 truncate dark:text-white text-sm">
                {primaryFileName}
              </div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {primaryRows.length.toLocaleString()} rows • {visiblePrimaryColumns.length} visible columns selected
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Secondary Lookup Sheet
              </div>
              <div className="mt-1 font-bold text-indigo-950 truncate dark:text-indigo-200 text-sm">
                {secondaryFile.fileName}
              </div>
              <div className="mt-0.5 text-xs text-indigo-700/80 dark:text-indigo-400">
                {secondaryFile.totalRowCount.toLocaleString()} rows • {secondaryFile.headers.length} available columns
              </div>
            </div>
          </div>

          {/* TAB 1: Join Key Mapping Section (Visible First by Default) */}
          {activeTab === 'join' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800/30 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Step 1: Join Key Mapping (Matching Identifiers)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select the shared key to link rows (e.g. match <code className="text-indigo-600 font-semibold">order_id</code> in the primary file to <code className="text-indigo-600 font-semibold">ProductOrderID</code> in the secondary file).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary Key Selection: ONLY visiblePrimaryColumns */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Primary Key (From Visible Primary Columns)
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Visible Only
                    </span>
                  </div>
                  <select
                    value={primaryKey}
                    onChange={(e) => setPrimaryKey(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {visiblePrimaryColumns.map((hdr) => (
                      <option key={hdr} value={hdr}>
                        {hdr}
                      </option>
                    ))}
                  </select>
                  {primaryRows[0] && (
                    <p className="mt-1 text-[11px] text-slate-400 truncate">
                      Sample: <span className="font-mono text-slate-600 dark:text-slate-300">{String(primaryRows[0][primaryKey] ?? '')}</span>
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    * Limited to columns checked/selected in your primary file settings.
                  </p>
                </div>

                {/* Secondary Key Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Matching Key (In Secondary Lookup File)
                    </label>
                  </div>
                  <select
                    value={secondaryKey}
                    onChange={(e) => setSecondaryKey(e.target.value)}
                    className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-indigo-500 focus:outline-hidden dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {secondaryFile.headers.map((hdr) => (
                      <option key={hdr} value={hdr}>
                        {hdr}
                      </option>
                    ))}
                  </select>
                  {secondaryFile.rows[0] && (
                    <p className="mt-1 text-[11px] text-slate-400 truncate">
                      Sample: <span className="font-mono text-slate-600 dark:text-slate-300">{String(secondaryFile.rows[0][secondaryKey] ?? '')}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Live Match Diagnostic */}
              <div
                className={`rounded-xl border p-3.5 transition ${
                  previewStats.matchRate > 70
                    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                    : previewStats.matchCount > 0
                    ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30'
                    : 'border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {previewStats.matchRate > 70 ? '✓' : previewStats.matchCount > 0 ? '⚠️' : '✕'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {previewStats.matchCount.toLocaleString()} of {previewStats.totalCount.toLocaleString()} primary rows matched ({previewStats.matchRate.toFixed(1)}%)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {previewStats.matchRate >= 95
                          ? 'Excellent match! Records align seamlessly.'
                          : previewStats.matchRate > 0
                          ? 'Partial match found. Unmatched rows will have blank lookup fields.'
                          : 'No matches found between these columns. Check if key columns match.'}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-36 h-2 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
                    <div
                      className={`h-full transition-all duration-300 ${
                        previewStats.matchRate > 70 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, previewStats.matchRate)}%` }}
                    />
                  </div>
                </div>

                {/* Sample matched rows excerpt */}
                {previewStats.sampleMatches.length > 0 && (
                  <div className="mt-3 border-t border-slate-200/60 pt-2.5 dark:border-slate-800 text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      Sample Match Verification:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {previewStats.sampleMatches.map((sm, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          🔑 {sm.keyValue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action button to proceed to Step 2 */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Step 1 of 2 configured • <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{previewStats.matchRate.toFixed(0)}% Rows Matched</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('visibility')}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95 cursor-pointer"
                >
                  <span>Proceed to Step 2: Column Visibility</span>
                  <span className="text-sm">➔</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Column Visibility Section (Second) */}
          {activeTab === 'visibility' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Step 2: Column Visibility (Secondary File)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select which columns from <span className="font-semibold text-slate-700 dark:text-slate-300">{secondaryFile.fileName}</span> should be included in the preview table and final Excel export.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Quick search input */}
              <div>
                <input
                  type="text"
                  value={colSearch}
                  onChange={(e) => setColSearch(e.target.value)}
                  placeholder="Filter secondary columns..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Column selection list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {filteredSecondaryCols.map((col) => {
                  const isSelected = selectedColumns.includes(col);
                  const isNumeric = secondaryFile.summableHeaders?.includes(col);
                  const hasCollision = visiblePrimaryColumns.includes(col);
                  const currentAlias = columnAliases[col] || col;

                  return (
                    <div
                      key={col}
                      onClick={() => toggleColumn(col)}
                      className={`flex flex-col gap-1 rounded-xl border p-2.5 transition cursor-pointer ${
                        isSelected
                          ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                          />
                          <span className="text-xs font-semibold text-slate-800 truncate dark:text-slate-200">
                            {col}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isNumeric && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              # Numeric
                            </span>
                          )}
                          {hasCollision && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Duplicate Name
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Target column name input if selected */}
                      {isSelected && (
                        <div
                          className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="shrink-0">Header Name:</span>
                          <input
                            type="text"
                            value={currentAlias}
                            onChange={(e) => handleAliasChange(col, e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <span>⬅ Back to Step 1: Join Key Mapping</span>
                </button>
                <span>
                  Included: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedColumns.length}</strong> of {secondaryFile.headers.length} columns in preview &amp; export.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={previewStats.matchCount === 0 || selectedColumns.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>Apply Link &amp; Merge ({previewStats.matchCount.toLocaleString()} Rows)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
