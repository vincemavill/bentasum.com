'use client';

import React, { useRef, useState } from 'react';
import { SecondaryLookupFile, JoinConfig, CalculatedColumnConfig } from '@/types/profile';
import { parseSpreadsheetFile } from '@/lib/excelParser';

interface RelationalToolbarProps {
  secondaryFile: SecondaryLookupFile | null;
  joinConfig: JoinConfig | null;
  calculatedColumns: CalculatedColumnConfig[];
  matchCount?: number;
  totalRows?: number;
  matchRate?: number;
  onSecondaryFileLoaded: (file: SecondaryLookupFile) => void;
  onOpenJoinModal: () => void;
  onOpenCalcModal: () => void;
  onUnlinkSecondary: () => void;
  isLoadingSecondary: boolean;
  setIsLoadingSecondary: (val: boolean) => void;
}

export default function RelationalToolbar({
  secondaryFile,
  joinConfig,
  calculatedColumns,
  matchCount = 0,
  totalRows = 0,
  matchRate = 0,
  onSecondaryFileLoaded,
  onOpenJoinModal,
  onOpenCalcModal,
  onUnlinkSecondary,
  isLoadingSecondary,
  setIsLoadingSecondary,
}: RelationalToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoadError(null);
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setIsLoadingSecondary(true);
      const parsed = await parseSpreadsheetFile(file);
      onSecondaryFileLoaded({
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        headers: parsed.headers,
        summableHeaders: parsed.summableHeaders,
        dateHeaders: parsed.dateHeaders,
        rows: parsed.rows,
        totalRowCount: parsed.totalRowCount,
      });
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || 'Could not parse the secondary file.');
    } finally {
      setIsLoadingSecondary(false);
      e.target.value = '';
    }
  };

  const loadSampleLookup = async () => {
    setLoadError(null);
    try {
      setIsLoadingSecondary(true);
      const res = await fetch('/assets/inventory-cost-lookup.xlsx');
      if (!res.ok) throw new Error('Sample file could not be fetched.');
      const blob = await res.blob();
      const file = new File([blob], 'inventory-cost-lookup.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const parsed = await parseSpreadsheetFile(file);
      onSecondaryFileLoaded({
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        headers: parsed.headers,
        summableHeaders: parsed.summableHeaders,
        dateHeaders: parsed.dateHeaders,
        rows: parsed.rows,
        totalRowCount: parsed.totalRowCount,
      });
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || 'Could not load the sample lookup file.');
    } finally {
      setIsLoadingSecondary(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Bar Top Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Multi-File Relational Merge &amp; Calculations
              </h3>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300">
                VLOOKUP / JOIN
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Link external inventory, cost, or master order sheets and create custom calculated columns.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {!secondaryFile ? (
            <>
              <button
                type="button"
                disabled={isLoadingSecondary}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 hover:border-indigo-300 transition active:scale-95 disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{isLoadingSecondary ? 'Parsing...' : 'Link Lookup File (.xlsx)'}</span>
              </button>

              <button
                type="button"
                disabled={isLoadingSecondary}
                onClick={loadSampleLookup}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Loads sample Master Cost & Inventory Sheet"
              >
                <span>Sample Cost Sheet</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenJoinModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition active:scale-95 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Edit Link Settings</span>
              </button>

              <button
                type="button"
                onClick={onUnlinkSecondary}
                className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition active:scale-95 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                title="Unlink and remove secondary sheet"
              >
                ✕ Unlink
              </button>
            </>
          )}

          {/* Add Calculated Column button */}
          <button
            type="button"
            onClick={onOpenCalcModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95"
          >
            <span className="font-mono text-xs">ƒ(x)</span>
            <span>+ Calculated Column</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          ⚠️ {loadError}
        </div>
      )}

      {/* Linked Status Banner if secondary file is loaded */}
      {secondaryFile && joinConfig && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
              LINKED
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {secondaryFile.fileName}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-mono text-xs text-indigo-700 dark:text-indigo-300">
              {joinConfig.primaryKey} ⟷ {joinConfig.secondaryKey}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {matchCount.toLocaleString()} / {totalRows.toLocaleString()} matched ({matchRate.toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Imported: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {joinConfig.selectedColumns.join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Active Calculated Columns Chips */}
      {calculatedColumns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Calculated Columns:
          </span>
          {calculatedColumns.map((calc) => (
            <button
              key={calc.id}
              type="button"
              onClick={onOpenCalcModal}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">ƒ</span>
              <span>{calc.name}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                ({calc.leftColumn} {calc.operation === '*' ? '×' : calc.operation} {calc.rightColumn})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
