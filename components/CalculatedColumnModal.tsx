'use client';

import React, { useMemo, useState } from 'react';
import { CalculatedColumnConfig, CalcOperation } from '@/types/profile';
import { formatCurrency, sanitizeCurrencyToNumber, applyCalculatedColumns } from '@/lib/excelParser';

interface CalculatedColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableNumericColumns: string[];
  calculatedColumns: CalculatedColumnConfig[];
  onAddCalculatedColumn: (calc: CalculatedColumnConfig) => void;
  onDeleteCalculatedColumn: (id: string) => void;
  sampleRows?: Record<string, any>[];
  currencySymbol?: string;
}

export default function CalculatedColumnModal({
  isOpen,
  onClose,
  availableNumericColumns,
  calculatedColumns,
  onAddCalculatedColumn,
  onDeleteCalculatedColumn,
  sampleRows = [],
  currencySymbol = '₱',
}: CalculatedColumnModalProps) {
  // Column Name
  const [colName, setColName] = useState('');
  // Left Column
  const [leftCol, setLeftCol] = useState(() => availableNumericColumns[0] || '');
  // Operation: '+' or '-'
  const [operation, setOperation] = useState<CalcOperation>('-');
  // Right Column
  const [rightCol, setRightCol] = useState(() => availableNumericColumns[1] || availableNumericColumns[0] || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Suggested names
  const namePresets = [
    'Net Margin',
    'Price Difference',
    'Gross Profit',
    'Total Cost (Qty × Cost)',
    'Gross Revenue (Qty × Price)',
    'Net Payout Less Cost',
    'Adjusted Total',
  ];

  // Update left/right if available columns change and not set
  React.useEffect(() => {
    if (!leftCol && availableNumericColumns.length > 0) {
      setLeftCol(availableNumericColumns[0]);
    }
    if (!rightCol && availableNumericColumns.length > 1) {
      setRightCol(availableNumericColumns[1]);
    }
  }, [availableNumericColumns, leftCol, rightCol]);

  // Live sample computation with dynamic evaluation of active calculated columns
  const livePreview = useMemo(() => {
    if (!sampleRows || sampleRows.length === 0 || !leftCol || !rightCol) {
      return null;
    }

    // Evaluate active calculated columns on candidate rows to ensure chained columns (like QxSept)
    // are present and have accurate values
    const evaluateCandidate = (rawRow: Record<string, any>) => {
      const enriched = applyCalculatedColumns([rawRow], calculatedColumns)[0] || rawRow;
      const v1 = sanitizeCurrencyToNumber(enriched[leftCol]);
      const v2 = sanitizeCurrencyToNumber(enriched[rightCol]);
      return { enriched, v1, v2 };
    };

    // Find the most representative row from sample rows:
    // 1. Both columns have non-zero values
    // 2. Or at least one is non-zero
    // 3. Fallback to row 0
    let chosen = evaluateCandidate(sampleRows[0]);
    for (let i = 0; i < Math.min(sampleRows.length, 50); i++) {
      const cand = evaluateCandidate(sampleRows[i]);
      if (cand.v1 !== null && cand.v1 !== 0 && cand.v2 !== null && cand.v2 !== 0) {
        chosen = cand;
        break;
      }
      if (
        (cand.v1 !== null && cand.v1 !== 0 && (chosen.v1 === null || chosen.v1 === 0)) ||
        (cand.v2 !== null && cand.v2 !== 0 && (chosen.v2 === null || chosen.v2 === 0))
      ) {
        chosen = cand;
      }
    }

    const val1 = chosen.v1 ?? 0;
    const val2 = chosen.v2 ?? 0;
    let res = 0;
    if (operation === '+') res = val1 + val2;
    else if (operation === '-') res = val1 - val2;
    else if (operation === '*') res = val1 * val2;
    return {
      val1,
      val2,
      result: Number(res.toFixed(2)),
    };
  }, [sampleRows, calculatedColumns, leftCol, rightCol, operation]);

  if (!isOpen) return null;

  const handleCreate = () => {
    setErrorMsg(null);
    const cleanName = colName.trim();
    if (!cleanName) {
      setErrorMsg('Please enter a name for the new column (e.g. "Net Margin").');
      return;
    }

    if (calculatedColumns.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMsg(`A calculated column named "${cleanName}" already exists.`);
      return;
    }

    if (!leftCol || !rightCol) {
      setErrorMsg('Please select both numeric columns to calculate.');
      return;
    }

    const newCalc: CalculatedColumnConfig = {
      id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: cleanName,
      leftColumn: leftCol,
      operation,
      rightColumn: rightCol,
    };

    onAddCalculatedColumn(newCalc);
    setColName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative flex flex-col max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <span className="font-mono text-base font-black">ƒ(x)</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Calculated Columns Builder</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Custom Math
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perform Addition, Subtraction, or Multiplication across numeric columns from your sales and linked sheets.
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

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Builder Form Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Create New Column
            </h3>

            {/* Column Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Output Column Name
              </label>
              <input
                type="text"
                value={colName}
                onChange={(e) => {
                  setColName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="e.g. Net Margin or Price Difference"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />

              {/* Preset suggestion pills */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Presets:</span>
                {namePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setColName(preset);
                      setErrorMsg(null);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Formula Equation Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Left Column (5 cols) */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  First Column
                </label>
                <select
                  value={leftCol}
                  onChange={(e) => setLeftCol(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {availableNumericColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator (2 cols) */}
              <div className="sm:col-span-2 flex flex-col items-center">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">
                  Operation
                </label>
                <div className="flex rounded-xl border border-slate-300 bg-white p-0.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800 w-full justify-center">
                  <button
                    type="button"
                    onClick={() => setOperation('+')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
                      operation === '+'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                    }`}
                    title="Addition (+)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperation('-')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
                      operation === '-'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                    }`}
                    title="Subtraction (-)"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperation('*')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
                      operation === '*'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                    }`}
                    title="Multiplication (×)"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Right Column (5 cols) */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Second Column
                </label>
                <select
                  value={rightCol}
                  onChange={(e) => setRightCol(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {availableNumericColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Formula Preview Box */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Formula Definition:
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                    [{colName || 'Custom Column'}] = [{leftCol || 'Col A'}] {operation === '*' ? '×' : operation} [{rightCol || 'Col B'}]
                  </div>
                </div>

                {livePreview && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Sample Row:</span>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(livePreview.val1, currencySymbol)} {operation === '*' ? '×' : operation} {formatCurrency(livePreview.val2, currencySymbol)} = {formatCurrency(livePreview.result, currencySymbol)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                ⚠️ {errorMsg}
              </p>
            )}

            <button
              type="button"
              onClick={handleCreate}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95"
            >
              <span>+ Add This Calculated Column</span>
            </button>
          </div>

          {/* Active Calculated Columns List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Active Calculated Columns ({calculatedColumns.length})
              </h3>
            </div>

            {calculatedColumns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                No custom calculated columns added yet. Create one above to add it to your preview table, summary cards, and Excel export.
              </div>
            ) : (
              <div className="space-y-2">
                {calculatedColumns.map((calc) => (
                  <div
                    key={calc.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-mono font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ƒ
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate dark:text-white">
                          {calc.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate dark:text-slate-400">
                          {calc.leftColumn} {calc.operation === '*' ? '×' : calc.operation} {calc.rightColumn}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        Totaled &amp; Exportable
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteCalculatedColumn(calc.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                        title="Delete this calculated column"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
