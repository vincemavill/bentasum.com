'use client';

import React, { useMemo, useState } from 'react';
import { ExportFormat } from '@/types/profile';
import { exportCleanedSpreadsheet } from '@/lib/excelParser';

interface PreviewTableProps {
  rows: Record<string, any>[];
  selectedColumns: string[];
  sumColumns: string[];
  baseFileName: string;
  dateFilterActive?: boolean;
  dateFilterColumn?: string;
  startDate?: string;
  endDate?: string;
  onClearDateFilter?: () => void;
}

export default function PreviewTable({
  rows,
  selectedColumns,
  sumColumns,
  baseFileName,
  dateFilterActive,
  dateFilterColumn,
  startDate,
  endDate,
  onClearDateFilter,
}: PreviewTableProps) {

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [tableSearch, setTableSearch] = useState('');
  const [includeTotalsRow, setIncludeTotalsRow] = useState(true);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Filter rows by table search
  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rows;
    const term = tableSearch.toLowerCase();
    return rows.filter((row) =>
      selectedColumns.some((col) => {
        const val = String(row[col] ?? '').toLowerCase();
        return val.includes(term);
      })
    );
  }, [rows, selectedColumns, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleExport = (format: ExportFormat) => {
    try {
      exportCleanedSpreadsheet({
        rows,
        selectedColumns,
        sumColumns,
        format,
        baseFileName,
        includeTotalsRow,
      });
      setExportFeedback(`Exported cleaned .${format} successfully!`);
      setTimeout(() => setExportFeedback(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Error generating export file.');
    }
  };

  if (selectedColumns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No columns selected to display. Please check at least one column above to preview your data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Table Header & Export Actions Toolbar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cleaned Data Preview
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {filteredRows.length.toLocaleString()} rows
            </span>
            {dateFilterActive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
                <span>📅 {dateFilterColumn}: {startDate || 'Earliest'} → {endDate || 'Latest'}</span>
                {onClearDateFilter && (
                  <button
                    type="button"
                    onClick={onClearDateFilter}
                    className="ml-0.5 text-emerald-700 hover:text-rose-600 dark:text-emerald-300 dark:hover:text-rose-400"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Displaying only the {selectedColumns.length} chosen columns.
          </p>
        </div>

        {/* Export & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick row search */}
          <div className="relative">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search table rows..."
              className="w-44 rounded-xl border border-slate-300 bg-slate-50/50 py-1.5 pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <svg
              className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Totals row toggle */}
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTotalsRow}
              onChange={(e) => setIncludeTotalsRow(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
            />
            <span>Include Totals Row</span>
          </label>

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export .XLSX</span>
            </button>

            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span>Export .CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export notification toast */}
      {exportFeedback && (
        <div className="bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-b border-emerald-100 dark:border-emerald-900">
          ✓ {exportFeedback}
        </div>
      )}

      {/* Scrollable Table */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/90 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-200">
            <tr>
              <th className="w-12 px-3 py-3 text-center text-slate-400">#</th>
              {selectedColumns.map((col) => {
                const isSum = sumColumns.includes(col);
                return (
                  <th key={col} className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      {isSum && (
                        <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                          ∑
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRows.map((row, rowIdx) => {
              const globalIndex = (currentPage - 1) * pageSize + rowIdx + 1;
              return (
                <tr
                  key={rowIdx}
                  className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                    {globalIndex}
                  </td>
                  {selectedColumns.map((col) => (
                    <td
                      key={col}
                      className="px-4 py-2.5 whitespace-nowrap text-slate-800 dark:text-slate-200 max-w-[260px] truncate"
                      title={String(row[col] ?? '')}
                    >
                      {String(row[col] ?? '') || <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}

            {paginatedRows.length === 0 && (
              <tr>
                <td
                  colSpan={selectedColumns.length + 1}
                  className="py-8 text-center text-xs text-slate-400"
                >
                  No matching rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-3 sm:flex-row dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2">
            Showing {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Previous
          </button>
          <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
