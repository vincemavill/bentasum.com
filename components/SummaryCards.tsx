'use client';

import React, { useState } from 'react';
import { ColumnMetric } from '@/types/profile';
import { formatCurrency } from '@/lib/excelParser';

interface SummaryCardsProps {
  metrics: Record<string, ColumnMetric>;
  sumColumns: string[];
  totalRowCount: number;
}

export default function SummaryCards({
  metrics,
  sumColumns,
  totalRowCount,
}: SummaryCardsProps) {
  const [currencySymbol, setCurrencySymbol] = useState('₱');

  if (sumColumns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
        No columns currently chosen for numeric totals. Toggle the{' '}
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Sum</span> badge on any column
        above to see instant KPI aggregate cards.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Sales Totals &amp; Summary
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Calculated instantly from your {totalRowCount.toLocaleString()} spreadsheet rows.
          </p>
        </div>

        {/* Currency selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Currency:</span>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs dark:border-slate-700 dark:bg-slate-800">
            {['₱', '$'].map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setCurrencySymbol(sym)}
                className={`rounded-md px-2 py-0.5 font-semibold transition ${
                  currencySymbol === sym
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sumColumns.map((col, idx) => {
          const metric = metrics[col] || {
            columnName: col,
            total: 0,
            count: 0,
            average: 0,
          };

          // Distinguish negative / deduction looking columns
          const isDeduction =
            col.toLowerCase().includes('fee') ||
            col.toLowerCase().includes('deduction') ||
            col.toLowerCase().includes('commission') ||
            col.toLowerCase().includes('discount') ||
            metric.total < 0;

          return (
            <div
              key={col}
              className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Top Accent Line */}
              <div
                className={`absolute top-0 inset-x-0 h-1 ${
                  isDeduction
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : idx === 0
                    ? 'bg-emerald-500'
                    : 'bg-indigo-500'
                }`}
              />

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate dark:text-slate-400">
                    {col}
                  </span>
                  {isDeduction && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      Fee / Deduction
                    </span>
                  )}
                </div>

                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {formatCurrency(metric.total, currencySymbol)}
                </div>
              </div>

              {/* Sub metrics */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <div>
                  <span className="text-slate-400">Entries: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {metric.count.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Avg: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(metric.average, currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
