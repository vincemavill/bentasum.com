'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Dropzone from '@/components/Dropzone';
import ProfileManager from '@/components/ProfileManager';
import DateRangeFilter from '@/components/DateRangeFilter';
import SummaryCards from '@/components/SummaryCards';
import PreviewTable from '@/components/PreviewTable';
import { ParsedSpreadsheet, ProfileTemplate } from '@/types/profile';
import {
  getActiveProfileId,
  getStoredProfiles,
  saveProfilesToStorage,
  setActiveProfileId,
} from '@/lib/storage';
import { calculateColumnMetrics, isDateInRange } from '@/lib/excelParser';

export default function HomePage() {
  const [profiles, setProfiles] = useState<ProfileTemplate[]>([]);
  const [activeProfile, setActiveProfile] = useState<ProfileTemplate | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deduplicateByOrderId, setDeduplicateByOrderId] = useState(false);

  // Date filter state
  const [selectedDateColumn, setSelectedDateColumn] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Date columns that are currently selected in "Columns in File"
  const selectedDateColumns = useMemo(() => {
    if (!parsedData || !activeProfile) return [];
    const detectedDateCols = parsedData.dateHeaders || [];
    return activeProfile.selectedColumns.filter((col) =>
      detectedDateCols.includes(col)
    );
  }, [parsedData, activeProfile]);

  // Keep selectedDateColumn in sync with the selected date columns in "Columns in File"
  useEffect(() => {
    if (selectedDateColumns.length > 0) {
      if (!selectedDateColumn || !selectedDateColumns.includes(selectedDateColumn)) {
        const bestCol =
          selectedDateColumns.find((c) => /creation|create|order\s*date/i.test(c)) ||
          selectedDateColumns.find((c) => /paid/i.test(c)) ||
          selectedDateColumns[0];
        setSelectedDateColumn(bestCol);
      }
    } else {
      setSelectedDateColumn('');
      setStartDate('');
      setEndDate('');
    }
  }, [selectedDateColumns, selectedDateColumn]);

  // Initialize profiles from localStorage
  useEffect(() => {
    const loadedProfiles = getStoredProfiles();
    setProfiles(loadedProfiles);

    const activeId = getActiveProfileId();
    const found = loadedProfiles.find((p) => p.id === activeId) || loadedProfiles[0];
    setActiveProfile(found);
  }, []);

  // Handle new or updated profile list
  const handleProfilesChange = (updated: ProfileTemplate[], newActiveId: string) => {
    setProfiles(updated);
    saveProfilesToStorage(updated);
    const target = updated.find((p) => p.id === newActiveId) || updated[0];
    setActiveProfile(target);
    setActiveProfileId(target.id);
  };

  // When a file is parsed, intelligently detect matching marketplace profile if possible
  const handleDataLoaded = (data: ParsedSpreadsheet) => {
    // If an existing dataset is already active and we are appending/updating files,
    // preserve active profile selection if its columns are still valid
    if (parsedData && activeProfile && activeProfile.selectedColumns.length > 0) {
      const validSelected = activeProfile.selectedColumns.filter((col) => data.headers.includes(col));
      if (validSelected.length > 0) {
        setParsedData(data);
        const summableCols = data.summableHeaders || [];
        const validSum = activeProfile.sumColumns.filter(
          (col) => data.headers.includes(col) && (summableCols.length === 0 || summableCols.includes(col))
        );
        setActiveProfile({
          ...activeProfile,
          selectedColumns: validSelected,
          sumColumns: validSum.length > 0 ? validSum : activeProfile.sumColumns,
        });
        return;
      }
    }

    setParsedData(data);
    setStartDate('');
    setEndDate('');

    const lowerFileName = data.fileName.toLowerCase();
    const headerStr = data.headers.join(' ').toLowerCase();
    const summableCols = data.summableHeaders || [];

    // 1. Check existing Custom Setups first (if user created custom setups for this file format)
    const customProfiles = profiles.filter((p) => !p.isDefault);
    let matchedCustom: ProfileTemplate | null = null;
    let bestCustomScore = 0;

    for (const cp of customProfiles) {
      const cleanName = cp.name.trim().toLowerCase();
      const nameMatch = cleanName.length >= 3 && lowerFileName.includes(cleanName);
      const matchingCols = cp.selectedColumns.filter((c) => data.headers.includes(c));
      const overlapRatio = cp.selectedColumns.length > 0 ? matchingCols.length / cp.selectedColumns.length : 0;

      let score = 0;
      if (nameMatch) score += 60;
      if (matchingCols.length >= 2 && overlapRatio >= 0.5) {
        score += overlapRatio * 50;
      }
      if (cp.orderIdColumn && data.headers.includes(cp.orderIdColumn)) {
        score += 20;
      }

      if (score >= 40 && score > bestCustomScore) {
        bestCustomScore = score;
        matchedCustom = cp;
      }
    }

    if (matchedCustom) {
      const validSelected = matchedCustom.selectedColumns.filter((col) => data.headers.includes(col));
      const validSum = matchedCustom.sumColumns.filter(
        (col) => data.headers.includes(col) && (summableCols.length === 0 || summableCols.includes(col))
      );

      const updatedActiveProfile: ProfileTemplate = {
        ...matchedCustom,
        selectedColumns: validSelected.length > 0 ? validSelected : data.headers.slice(0, 8),
        sumColumns: validSum.length > 0 ? validSum : summableCols.slice(0, 4),
      };

      setActiveProfile(updatedActiveProfile);
      setActiveProfileId(matchedCustom.id);
      return;
    }

    // 2. Check Default Presets (Shopee, Lazada, Tiktok)
    let detectedPresetId: string | null = null;
    if (
      lowerFileName.includes('lazada') ||
      (data.headers.includes('orderNumber') && data.headers.includes('orderItemId')) ||
      headerStr.includes('ordernumber') ||
      headerStr.includes('orderitemid')
    ) {
      detectedPresetId = 'preset-lazada';
    } else if (
      lowerFileName.includes('tiktok') ||
      headerStr.includes('sku subtotal') ||
      headerStr.includes('settlement') ||
      headerStr.includes('affiliate commission') ||
      (data.headers.includes('Seller SKU') && data.headers.includes('SKU Subtotal After Discount'))
    ) {
      detectedPresetId = 'preset-tiktok';
    } else if (
      lowerFileName.includes('shopee') ||
      headerStr.includes('deal price') ||
      headerStr.includes('buyer username') ||
      (headerStr.includes('service fee') && headerStr.includes('grand total'))
    ) {
      detectedPresetId = 'preset-shopee';
    }

    // Check default preset column overlap as fallback
    if (!detectedPresetId) {
      for (const preset of profiles.filter((p) => p.isDefault)) {
        const matchingPresetCols = preset.selectedColumns.filter((c) => data.headers.includes(c));
        if (preset.selectedColumns.length > 0 && matchingPresetCols.length / preset.selectedColumns.length >= 0.6) {
          detectedPresetId = preset.id;
          break;
        }
      }
    }

    if (detectedPresetId) {
      const matchedPreset = profiles.find((p) => p.id === detectedPresetId);
      if (matchedPreset) {
        const validSelected = matchedPreset.selectedColumns.filter((col) => data.headers.includes(col));
        const validSum = matchedPreset.sumColumns.filter(
          (col) => data.headers.includes(col) && (summableCols.length === 0 || summableCols.includes(col))
        );

        const updatedActiveProfile: ProfileTemplate = {
          ...matchedPreset,
          selectedColumns: validSelected.length > 0 ? validSelected : data.headers.slice(0, 8),
          sumColumns: validSum.length > 0 ? validSum : summableCols.slice(0, 4),
        };

        setActiveProfile(updatedActiveProfile);
        setActiveProfileId(matchedPreset.id);
        return;
      }
    }

    // 3. New Excel format that does not match presets or custom setups
    // Set the dropdown value into empty
    const emptyProfile: ProfileTemplate = {
      id: '',
      name: '',
      isDefault: false,
      selectedColumns: data.headers.slice(0, 8),
      sumColumns: summableCols.slice(0, 4),
    };

    setActiveProfile(emptyProfile);
    setActiveProfileId('');
  };

  const handleReset = () => {
    setParsedData(null);
    setDeduplicateByOrderId(false);
    setSelectedDateColumn('');
    setStartDate('');
    setEndDate('');
  };

  // Filter rows based on active date range filter and order deduplication
  const processedRows = useMemo(() => {
    if (!parsedData) return [];
    let rows = parsedData.rows;

    // 1. Date Range Filter: automatically active whenever a date column is selected in "Columns in File" and dates are specified
    if (selectedDateColumns.length > 0 && selectedDateColumn && (startDate || endDate)) {
      rows = rows.filter((row) =>
        isDateInRange(row[selectedDateColumn], startDate, endDate)
      );
    }

    // 2. Deduplicate Multi-Item Orders if requested
    if (deduplicateByOrderId && activeProfile?.orderIdColumn) {
      const seenOrderIds = new Set<string>();
      rows = rows.filter((row) => {
        const orderIdVal = String(row[activeProfile.orderIdColumn!] ?? '').trim();
        if (!orderIdVal) return true;
        if (seenOrderIds.has(orderIdVal)) return false;
        seenOrderIds.add(orderIdVal);
        return true;
      });
    }

    return rows;
  }, [
    parsedData,
    selectedDateColumns,
    selectedDateColumn,
    startDate,
    endDate,
    deduplicateByOrderId,
    activeProfile?.orderIdColumn,
  ]);


  // Reactive metrics computation - computed for summable columns over the processed/filtered rows
  const columnMetrics = useMemo(() => {
    if (!processedRows || !activeProfile || activeProfile.sumColumns.length === 0) {
      return {};
    }
    const summableCols = parsedData?.summableHeaders || [];
    const safeSumCols = activeProfile.sumColumns.filter(
      (c) => summableCols.length === 0 || summableCols.includes(c)
    );
    if (safeSumCols.length === 0) return {};

    return calculateColumnMetrics(
      processedRows,
      safeSumCols,
      false, // Deduplication already handled in processedRows
      activeProfile.orderIdColumn
    );
  }, [processedRows, parsedData?.summableHeaders, activeProfile]);


  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>Free &amp; 100% Private E-Commerce Spreadsheet Formatter</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Organize, Filter &amp; Total Your Seller Reports in{' '}
          <span className="bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">
            Seconds
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
          Format, filter, and total reports from Shopee, Lazada, TikTok Shop, or custom spreadsheets.
          Everything runs privately right on your device—zero server uploads, so your sales records stay completely safe.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>100% Private (Stays on Your Device)</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Zero Server Uploads</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>No Account Needed</span>
        </div>
      </section>

      {/* Upload Dropzone */}
      <section className="space-y-4">
        <Dropzone
          onDataLoaded={handleDataLoaded}
          onReset={handleReset}
          currentData={parsedData}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </section>

      {/* Active Processing Flow (Only visible when file is loaded) */}
      {parsedData && activeProfile && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section 1: Template & Column Configuration */}
          <ProfileManager
            profiles={profiles}
            activeProfile={activeProfile}
            availableHeaders={parsedData.headers}
            summableHeaders={parsedData.summableHeaders || []}
            onProfilesChange={handleProfilesChange}
            onActiveProfileChange={setActiveProfile}
            deduplicateByOrderId={deduplicateByOrderId}
            setDeduplicateByOrderId={setDeduplicateByOrderId}
          />

          {/* Section 2: Date Range Filter (Automatically displayed whenever a date column is selected in "Columns in File") */}
          {selectedDateColumns.length > 0 && (
            <DateRangeFilter
              dateHeaders={selectedDateColumns}
              rows={parsedData.rows}
              totalRawRows={parsedData.totalRowCount}
              filteredRowsCount={processedRows.length}
              selectedDateColumn={selectedDateColumn}
              onSelectDateColumn={setSelectedDateColumn}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              onResetFilter={() => {
                setStartDate('');
                setEndDate('');
              }}
            />
          )}

          {/* Section 3: Aggregated KPI Cards */}
          <SummaryCards
            metrics={columnMetrics}
            sumColumns={activeProfile.sumColumns}
            totalRowCount={processedRows.length}
          />

          {/* Section 4: Clean Data Preview & SheetJS Export */}
          <PreviewTable
            rows={processedRows}
            selectedColumns={activeProfile.selectedColumns}
            sumColumns={activeProfile.sumColumns}
            baseFileName={parsedData.fileName}
            dateFilterActive={selectedDateColumns.length > 0 && Boolean(startDate || endDate)}
            dateFilterColumn={selectedDateColumn}
            startDate={startDate}
            endDate={endDate}
            onClearDateFilter={() => {
              setStartDate('');
              setEndDate('');
            }}
          />
        </div>
      )}

      {/* Empty State / How It Works Explainer */}
      {!parsedData && (
        <section className="mt-12 rounded-3xl border border-slate-200/80 bg-white/70 p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
              Why Online Sellers Rely on BentaSum
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Designed specifically for multi-channel Philippine and Southeast Asian marketplace merchants.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xs">
                1
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                Upload Any Seller Export
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Drop your raw `.xlsx` or `.csv` export directly from Shopee Seller Centre, Lazada Seller
                Center, or TikTok Shop Partner Portal.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-xs">
                2
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                Pick Columns &amp; Sums
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Hide the 30+ messy columns you don&apos;t need. Check the columns you want to sum up, like
                deal prices, commissions, service fees, or net payout.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-sm shadow-xs">
                3
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                Save Presets &amp; Export
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Download a clean, organized spreadsheet with optional totals row. Your templates are
                saved right on your device for next time!
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
