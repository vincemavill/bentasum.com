'use client';

import React, { useRef, useState } from 'react';
import { parseSpreadsheetFile, parseMultipleSpreadsheets } from '@/lib/excelParser';
import { ParsedSpreadsheet } from '@/types/profile';

interface DropzoneProps {
  onDataLoaded: (data: ParsedSpreadsheet) => void;
  onReset: () => void;
  currentData: ParsedSpreadsheet | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function Dropzone({
  onDataLoaded,
  onReset,
  currentData,
  isLoading,
  setIsLoading,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = async (files: File[]) => {
    setErrorMessage(null);
    if (!files || files.length === 0) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const invalidFiles = files.filter((file) => {
      const lowerName = file.name.toLowerCase();
      return !validExtensions.some((ext) => lowerName.endsWith(ext));
    });

    if (invalidFiles.length > 0) {
      setErrorMessage(
        files.length === 1
          ? 'Please upload a valid spreadsheet (.xlsx, .xls, or .csv).'
          : 'Some files have invalid extensions. Please upload only .xlsx, .xls, or .csv files.'
      );
      return;
    }

    try {
      setIsLoading(true);
      const parsed = await parseMultipleSpreadsheets(files);
      onDataLoaded(parsed);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || 'Could not parse the spreadsheet files. Ensure they are not password protected.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Helper to load real sample excel files from app/assets
  const loadSampleExcel = async (fileName: 'shopee-order.xlsx' | 'lazada-order.xlsx' | 'tiktok-orders.xlsx') => {
    setErrorMessage(null);
    setLoadingSample(fileName);
    setIsLoading(true);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const response = await fetch(`${basePath}/assets/${fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${fileName} (HTTP ${response.status})`);
      }
      const blob = await response.blob();
      const file = new File([blob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const parsed = await parseSpreadsheetFile(file);
      onDataLoaded(parsed);
    } catch (err: any) {
      console.error('Error loading sample Excel:', err);
      setErrorMessage(err?.message || `Could not load sample file ${fileName}`);
    } finally {
      setIsLoading(false);
      setLoadingSample(null);
    }
  };

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drop Area or Loaded State */}
      {!currentData ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-12 ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99] dark:border-emerald-400 dark:bg-emerald-950/30'
              : 'border-slate-300 bg-white/60 hover:border-emerald-500 hover:bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-emerald-500/80'
          }`}
        >
          {/* Main Upload Icon */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-600 transition-transform duration-200 group-hover:scale-110 dark:from-emerald-950/70 dark:to-teal-950/70 dark:text-emerald-400">
            {isLoading ? (
              <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isLoading ? (
              <span>Reading {loadingSample || 'files'} securely on your device...</span>
            ) : (
              'Drop single or multiple seller exports here, or browse files'
            )}
          </h3>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Upload one or multiple .xlsx, .xls, or .csv files sharing the same format
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono dark:bg-slate-800">.XLSX</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono dark:bg-slate-800">.XLS</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono dark:bg-slate-800">.CSV</span>
            <span className="text-slate-400">• Up to 50,000+ rows instantly</span>
          </div>

          {/* Quick Demo Loader Buttons from app/assets */}
          <div
            className="mt-6 border-t border-slate-200/80 pt-4 text-xs dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Try sample marketplace exports:</span>
            </div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => loadSampleExcel('shopee-order.xlsx')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/90 px-3 py-1.5 font-semibold text-orange-700 shadow-xs transition hover:bg-orange-100 hover:border-orange-300 active:scale-95 disabled:opacity-50 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300"
              >
                <span>🟠 Shopee (shopee-order.xlsx)</span>
                {loadingSample === 'shopee-order.xlsx' && <span className="animate-spin text-xs">⏳</span>}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => loadSampleExcel('lazada-order.xlsx')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 px-3 py-1.5 font-semibold text-blue-700 shadow-xs transition hover:bg-blue-100 hover:border-blue-300 active:scale-95 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
              >
                <span>🔵 Lazada (lazada-order.xlsx)</span>
                {loadingSample === 'lazada-order.xlsx' && <span className="animate-spin text-xs">⏳</span>}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => loadSampleExcel('tiktok-orders.xlsx')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-1.5 font-semibold text-rose-700 shadow-xs transition hover:bg-rose-100 hover:border-rose-300 active:scale-95 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <span>🎵 TikTok Shop (tiktok-orders.xlsx)</span>
                {loadingSample === 'tiktok-orders.xlsx' && <span className="animate-spin text-xs">⏳</span>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Loaded File Header Card */
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-300/80 bg-emerald-50/40 p-4 sm:flex-row sm:items-center dark:border-emerald-800/80 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-md">
                  {currentData.fileName}
                </h4>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  Ready
                </span>
                {Boolean(currentData.fileCount && currentData.fileCount > 1) && (
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {currentData.fileCount} Files Merged
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatFileSize(currentData.fileSize)} total</span>
                <span>•</span>
                <span>{currentData.totalRowCount.toLocaleString()} rows</span>
                <span>•</span>
                <span>{currentData.headers.length} available columns</span>
              </div>
              {Boolean(currentData.fileNames && currentData.fileNames.length > 1) && (
                <p
                  className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-xl"
                  title={currentData.fileNames?.join(', ')}
                >
                  Combined: {currentData.fileNames?.join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Replace Files
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/80 dark:bg-rose-950/50 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 flex-shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 dark:text-rose-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
