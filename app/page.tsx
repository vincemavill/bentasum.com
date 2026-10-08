'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Dropzone from '@/components/Dropzone';
import ProfileManager from '@/components/ProfileManager';
import DateRangeFilter from '@/components/DateRangeFilter';
import SummaryCards from '@/components/SummaryCards';
import PreviewTable from '@/components/PreviewTable';
import RelationalToolbar from '@/components/RelationalToolbar';
import LinkSecondaryModal from '@/components/LinkSecondaryModal';
import CalculatedColumnModal from '@/components/CalculatedColumnModal';
import {
  ParsedSpreadsheet,
  ProfileTemplate,
  SecondaryLookupFile,
  JoinConfig,
  CalculatedColumnConfig,
} from '@/types/profile';
import {
  getActiveProfileId,
  getStoredProfiles,
  saveProfilesToStorage,
  setActiveProfileId,
} from '@/lib/storage';
import {
  calculateColumnMetrics,
  isDateInRange,
  isDateInMonths,
  getAvailableMonthsForColumn,
  haveSameHeadersFormat,
  performRelationalJoin,
  applyCalculatedColumns,
  suggestMatchingKeys,
} from '@/lib/excelParser';

export default function HomePage() {
  const [profiles, setProfiles] = useState<ProfileTemplate[]>([]);
  const [activeProfile, setActiveProfile] = useState<ProfileTemplate | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deduplicateByOrderId, setDeduplicateByOrderId] = useState(false);

  // Relational merge & calculated column state
  const [secondaryFile, setSecondaryFile] = useState<SecondaryLookupFile | null>(null);
  const [joinConfig, setJoinConfig] = useState<JoinConfig | null>(null);
  const [calculatedColumns, setCalculatedColumns] = useState<CalculatedColumnConfig[]>([]);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState(false);

  // Date filter state (mutually exclusive: Date Range vs Specific Months)
  const [selectedDateColumn, setSelectedDateColumn] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'range' | 'months'>('range');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // List of imported secondary column names (taking alias into account)
  const importedSecondaryCols = useMemo(() => {
    if (!joinConfig) return [];
    return joinConfig.selectedColumns.map((col) => joinConfig.columnAliases?.[col] || col);
  }, [joinConfig]);

  // List of calculated column names
  const calculatedColNames = useMemo(() => {
    return calculatedColumns.map((c) => c.name);
  }, [calculatedColumns]);

  // Primary columns currently checked/selected to show
  const visiblePrimaryColumns = useMemo(() => {
    if (!parsedData || !activeProfile) return [];
    return activeProfile.selectedColumns.filter((col) => parsedData.headers.includes(col));
  }, [parsedData, activeProfile?.selectedColumns]);

  // Numeric columns available for calculations: ONLY visible primary numeric + chosen secondary numeric + calculated columns
  const visibleNumericColumns = useMemo(() => {
    if (!parsedData || !activeProfile) return [];
    // 1. Primary numeric columns currently checked/selected to show
    const primaryVisibleSummables = (parsedData.summableHeaders || []).filter((col) =>
      activeProfile.selectedColumns.includes(col)
    );
    // 2. Secondary numeric columns chosen from secondary file
    const secondarySummables =
      secondaryFile && joinConfig
        ? (secondaryFile.summableHeaders || [])
            .filter((c) => joinConfig.selectedColumns.includes(c))
            .map((c) => joinConfig.columnAliases?.[c] || c)
        : [];
    // 3. Existing calculated columns
    return Array.from(
      new Set([
        ...primaryVisibleSummables,
        ...secondarySummables,
        ...calculatedColNames,
      ])
    );
  }, [parsedData, activeProfile?.selectedColumns, secondaryFile, joinConfig, calculatedColNames]);

  // All available headers across primary, linked secondary, and calculated columns
  const allAvailableHeaders = useMemo(() => {
    if (!parsedData) return [];
    return Array.from(
      new Set([
        ...parsedData.headers,
        ...importedSecondaryCols,
        ...calculatedColNames,
      ])
    );
  }, [parsedData, importedSecondaryCols, calculatedColNames]);

  // All summable (numeric) headers across primary, linked secondary, and calculated columns
  const allSummableHeaders = useMemo(() => {
    if (!parsedData) return [];
    const primarySummables = parsedData.summableHeaders || [];
    const secondarySummables =
      secondaryFile && joinConfig
        ? (secondaryFile.summableHeaders || [])
            .filter((c) => joinConfig.selectedColumns.includes(c))
            .map((c) => joinConfig.columnAliases?.[c] || c)
        : [];

    return Array.from(
      new Set([
        ...primarySummables,
        ...secondarySummables,
        ...calculatedColNames, // calculated columns are always numeric/summable
      ])
    );
  }, [parsedData, secondaryFile, joinConfig, calculatedColNames]);

  // All detected date headers across primary and linked secondary
  const allDateHeaders = useMemo(() => {
    if (!parsedData) return [];
    const primaryDates = parsedData.dateHeaders || [];
    const secondaryDates =
      secondaryFile && joinConfig
        ? (secondaryFile.dateHeaders || [])
            .filter((c) => joinConfig.selectedColumns.includes(c))
            .map((c) => joinConfig.columnAliases?.[c] || c)
        : [];
    return Array.from(new Set([...primaryDates, ...secondaryDates]));
  }, [parsedData, secondaryFile, joinConfig]);

  // Date columns currently selected in active profile
  const selectedDateColumns = useMemo(() => {
    if (!parsedData || !activeProfile) return [];
    return activeProfile.selectedColumns.filter((col) => allDateHeaders.includes(col));
  }, [parsedData, activeProfile, allDateHeaders]);

  // Keep selectedDateColumn in sync with the selected date columns in "Columns in File"
  useEffect(() => {
    if (selectedDateColumns.length > 0) {
      if (!selectedDateColumn || !selectedDateColumns.includes(selectedDateColumn)) {
        const bestCol =
          selectedDateColumns.find((c) => /creation|create|order\s*date/i.test(c)) ||
          selectedDateColumns.find((c) => /paid/i.test(c)) ||
          selectedDateColumns[0];
        setSelectedDateColumn(bestCol);
        if (parsedData?.rows) {
          const avail = getAvailableMonthsForColumn(parsedData.rows, bestCol);
          setSelectedMonths(avail.map((m) => m.key));
        }
      }
    } else {
      setSelectedDateColumn('');
      setStartDate('');
      setEndDate('');
      setSelectedMonths([]);
    }
  }, [selectedDateColumns, selectedDateColumn, parsedData]);

  const handleSelectDateColumn = (col: string) => {
    setSelectedDateColumn(col);
    setStartDate('');
    setEndDate('');
    if (parsedData?.rows) {
      const avail = getAvailableMonthsForColumn(parsedData.rows, col);
      setSelectedMonths(avail.map((m) => m.key));
    }
  };

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

  // When primary file is parsed
  const handleDataLoaded = (data: ParsedSpreadsheet) => {
    if (
      parsedData &&
      activeProfile &&
      activeProfile.selectedColumns.length > 0 &&
      haveSameHeadersFormat(parsedData.headers, data.headers)
    ) {
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
    setDateFilterMode('range');
    setSelectedMonths([]);

    const lowerFileName = data.fileName.toLowerCase();
    const headerStr = data.headers.join(' ').toLowerCase();
    const summableCols = data.summableHeaders || [];

    // 1. Check existing Custom Setups first
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

    // 2. Check Default Presets
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

    // 3. Fallback to generic columns
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
    setSecondaryFile(null);
    setJoinConfig(null);
    setCalculatedColumns([]);
    setDeduplicateByOrderId(false);
    setSelectedDateColumn('');
    setStartDate('');
    setEndDate('');
    setDateFilterMode('range');
    setSelectedMonths([]);
  };

  // Handle uploading of secondary lookup file
  const handleSecondaryFileLoaded = (secFile: SecondaryLookupFile) => {
    setSecondaryFile(secFile);
    // Auto suggest matching keys if possible from visiblePrimaryColumns
    if (parsedData && visiblePrimaryColumns.length > 0) {
      const suggested = suggestMatchingKeys(visiblePrimaryColumns, secFile.headers);
      if (suggested) {
        const autoSelectedCols = secFile.headers.filter((h) => h !== suggested.secondaryKey);
        setJoinConfig({
          primaryKey: suggested.primaryKey,
          secondaryKey: suggested.secondaryKey,
          selectedColumns: autoSelectedCols,
        });
      }
    }
    // Open mapping modal for user confirmation & column selection
    setIsJoinModalOpen(true);
  };

  // Apply join configuration from modal
  const handleApplyJoin = (newConfig: JoinConfig) => {
    setJoinConfig(newConfig);

    // Update column visibility in activeProfile:
    // Retain currently selected primary columns, remove previously imported secondary columns, and add newly selected secondary columns
    if (activeProfile) {
      const oldImported = joinConfig
        ? joinConfig.selectedColumns.map((sc) => joinConfig.columnAliases?.[sc] || sc)
        : [];
      const targetColNames = newConfig.selectedColumns.map(
        (sc) => newConfig.columnAliases?.[sc] || sc
      );
      const baseSelected = activeProfile.selectedColumns.filter((c) => !oldImported.includes(c));
      const updatedSelected = Array.from(new Set([...baseSelected, ...targetColNames]));

      setActiveProfile({
        ...activeProfile,
        selectedColumns: updatedSelected,
      });
    }
  };

  // Unlink and remove secondary lookup file
  const handleUnlinkSecondary = () => {
    if (!joinConfig) {
      setSecondaryFile(null);
      return;
    }
    const removedCols = joinConfig.selectedColumns.map(
      (col) => joinConfig.columnAliases?.[col] || col
    );
    setSecondaryFile(null);
    setJoinConfig(null);

    // Clean up activeProfile
    if (activeProfile) {
      setActiveProfile({
        ...activeProfile,
        selectedColumns: activeProfile.selectedColumns.filter((c) => !removedCols.includes(c)),
        sumColumns: activeProfile.sumColumns.filter((c) => !removedCols.includes(c)),
      });
    }

    // Clean up any calculated columns depending on removed columns
    setCalculatedColumns((prev) =>
      prev.filter(
        (calc) => !removedCols.includes(calc.leftColumn) && !removedCols.includes(calc.rightColumn)
      )
    );
  };

  // Add a calculated column
  const handleAddCalculatedColumn = (newCalc: CalculatedColumnConfig) => {
    setCalculatedColumns((prev) => [...prev, newCalc]);

    // Automatically add to activeProfile selectedColumns and sumColumns
    if (activeProfile) {
      setActiveProfile({
        ...activeProfile,
        selectedColumns: Array.from(new Set([...activeProfile.selectedColumns, newCalc.name])),
        sumColumns: Array.from(new Set([...activeProfile.sumColumns, newCalc.name])),
      });
    }
  };

  // Delete a calculated column
  const handleDeleteCalculatedColumn = (id: string) => {
    const target = calculatedColumns.find((c) => c.id === id);
    if (!target) return;

    setCalculatedColumns((prev) => prev.filter((c) => c.id !== id));

    if (activeProfile) {
      setActiveProfile({
        ...activeProfile,
        selectedColumns: activeProfile.selectedColumns.filter((c) => c !== target.name),
        sumColumns: activeProfile.sumColumns.filter((c) => c !== target.name),
      });
    }
  };

  // Step 1: Relational Left Join (Enrich primary rows with lookup file)
  const { joinedDataRows, matchStats } = useMemo(() => {
    if (!parsedData) {
      return {
        joinedDataRows: [],
        matchStats: { matchCount: 0, totalCount: 0, matchRate: 0 },
      };
    }

    if (secondaryFile && joinConfig) {
      const res = performRelationalJoin({
        primaryRows: parsedData.rows,
        primaryKey: joinConfig.primaryKey,
        secondaryRows: secondaryFile.rows,
        secondaryKey: joinConfig.secondaryKey,
        selectedColumns: joinConfig.selectedColumns,
        columnAliases: joinConfig.columnAliases,
      });

      return {
        joinedDataRows: res.mergedRows,
        matchStats: {
          matchCount: res.matchCount,
          totalCount: res.totalCount,
          matchRate: res.matchRate,
        },
      };
    }

    return {
      joinedDataRows: parsedData.rows,
      matchStats: {
        matchCount: 0,
        totalCount: parsedData.rows.length,
        matchRate: 0,
      },
    };
  }, [parsedData, secondaryFile, joinConfig]);

  // Step 2: Apply Calculated Columns
  const enrichedRows = useMemo(() => {
    return applyCalculatedColumns(joinedDataRows, calculatedColumns);
  }, [joinedDataRows, calculatedColumns]);

  // Step 3: Date Filtering and Order ID Deduplication
  const processedRows = useMemo(() => {
    if (!enrichedRows || enrichedRows.length === 0) return [];
    let rows = enrichedRows;

    // 1. Date Filter (mutually exclusive: Date Range vs Specific Months)
    if (selectedDateColumns.length > 0 && selectedDateColumn) {
      if (dateFilterMode === 'range') {
        if (startDate || endDate) {
          rows = rows.filter((row) =>
            isDateInRange(row[selectedDateColumn], startDate, endDate)
          );
        }
      } else if (dateFilterMode === 'months') {
        rows = rows.filter((row) =>
          isDateInMonths(row[selectedDateColumn], selectedMonths)
        );
      }
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
    enrichedRows,
    selectedDateColumns,
    selectedDateColumn,
    dateFilterMode,
    startDate,
    endDate,
    selectedMonths,
    deduplicateByOrderId,
    activeProfile?.orderIdColumn,
  ]);

  const availableMonthsForCol = useMemo(() => {
    if (!enrichedRows || !selectedDateColumn) return [];
    return getAvailableMonthsForColumn(enrichedRows, selectedDateColumn);
  }, [enrichedRows, selectedDateColumn]);

  const isDateFilterActive = useMemo(() => {
    if (selectedDateColumns.length === 0 || !selectedDateColumn) return false;
    if (dateFilterMode === 'range') {
      return Boolean(startDate || endDate);
    }
    if (dateFilterMode === 'months') {
      return (
        availableMonthsForCol.length > 0 &&
        selectedMonths.length !== availableMonthsForCol.length
      );
    }
    return false;
  }, [
    selectedDateColumns,
    selectedDateColumn,
    dateFilterMode,
    startDate,
    endDate,
    selectedMonths,
    availableMonthsForCol,
  ]);

  const dateFilterDescription = useMemo(() => {
    if (!selectedDateColumn) return '';
    if (dateFilterMode === 'range') {
      return `${startDate || 'Earliest'} → ${endDate || 'Latest'}`;
    }
    if (dateFilterMode === 'months') {
      if (selectedMonths.length === 0) return 'No months selected';
      if (selectedMonths.length === availableMonthsForCol.length) return 'All Months';
      const names = availableMonthsForCol
        .filter((m) => selectedMonths.includes(m.key))
        .map((m) => m.shortLabel);
      return names.join(', ');
    }
    return '';
  }, [dateFilterMode, startDate, endDate, selectedDateColumn, selectedMonths, availableMonthsForCol]);

  // Reactive metrics computation - computed for all active sumColumns over the processed/filtered rows
  const columnMetrics = useMemo(() => {
    if (!processedRows || !activeProfile || activeProfile.sumColumns.length === 0) {
      return {};
    }
    const safeSumCols = activeProfile.sumColumns.filter(
      (c) => allSummableHeaders.length === 0 || allSummableHeaders.includes(c)
    );
    if (safeSumCols.length === 0) return {};

    return calculateColumnMetrics(
      processedRows,
      safeSumCols,
      false, // Deduplication already handled in processedRows
      activeProfile.orderIdColumn
    );
  }, [processedRows, allSummableHeaders, activeProfile]);

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
          Link external cost sheets via VLOOKUP, create calculated margin columns, and export cleaned files.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>100% Private (Runs Client-Side)</span>
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
          {/* Multi-File Relational Merge & Calculated Columns Toolbar */}
          <RelationalToolbar
            secondaryFile={secondaryFile}
            joinConfig={joinConfig}
            calculatedColumns={calculatedColumns}
            matchCount={matchStats.matchCount}
            totalRows={matchStats.totalCount}
            matchRate={matchStats.matchRate}
            onSecondaryFileLoaded={handleSecondaryFileLoaded}
            onOpenJoinModal={() => setIsJoinModalOpen(true)}
            onOpenCalcModal={() => setIsCalcModalOpen(true)}
            onUnlinkSecondary={handleUnlinkSecondary}
            isLoadingSecondary={isLoadingSecondary}
            setIsLoadingSecondary={setIsLoadingSecondary}
          />

          {/* Section 1: Template & Column Configuration */}
          <ProfileManager
            profiles={profiles}
            activeProfile={activeProfile}
            availableHeaders={allAvailableHeaders}
            summableHeaders={allSummableHeaders}
            onProfilesChange={handleProfilesChange}
            onActiveProfileChange={setActiveProfile}
            deduplicateByOrderId={deduplicateByOrderId}
            setDeduplicateByOrderId={setDeduplicateByOrderId}
          />

          {/* Section 2: Date Filter */}
          {selectedDateColumns.length > 0 && (
            <DateRangeFilter
              dateHeaders={selectedDateColumns}
              rows={enrichedRows}
              totalRawRows={enrichedRows.length}
              filteredRowsCount={processedRows.length}
              selectedDateColumn={selectedDateColumn}
              onSelectDateColumn={handleSelectDateColumn}
              filterMode={dateFilterMode}
              onFilterModeChange={setDateFilterMode}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
              selectedMonths={selectedMonths}
              onSelectedMonthsChange={setSelectedMonths}
              onResetFilter={() => {
                if (dateFilterMode === 'range') {
                  setStartDate('');
                  setEndDate('');
                } else {
                  setSelectedMonths(availableMonthsForCol.map((m) => m.key));
                }
              }}
            />
          )}

          {/* Section 3: Aggregated KPI Cards */}
          <SummaryCards
            metrics={columnMetrics}
            sumColumns={activeProfile.sumColumns}
            totalRowCount={processedRows.length}
            calculatedColumns={calculatedColumns}
          />

          {/* Section 4: Clean Data Preview & SheetJS Export */}
          <PreviewTable
            rows={processedRows}
            selectedColumns={activeProfile.selectedColumns}
            sumColumns={activeProfile.sumColumns}
            baseFileName={parsedData.fileName}
            calculatedColumns={calculatedColumns}
            secondaryColumns={importedSecondaryCols}
            dateFilterActive={isDateFilterActive}
            dateFilterColumn={selectedDateColumn}
            startDate={startDate}
            endDate={endDate}
            dateFilterDescription={dateFilterDescription}
            onClearDateFilter={() => {
              if (dateFilterMode === 'range') {
                setStartDate('');
                setEndDate('');
              } else {
                setSelectedMonths(availableMonthsForCol.map((m) => m.key));
              }
            }}
          />
        </div>
      )}

      {/* Column Mapping Modal (Join Key) */}
      {parsedData && secondaryFile && (
        <LinkSecondaryModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          primaryFileName={parsedData.fileName}
          visiblePrimaryColumns={visiblePrimaryColumns}
          primaryRows={parsedData.rows}
          secondaryFile={secondaryFile}
          currentJoinConfig={joinConfig}
          onApplyJoin={handleApplyJoin}
        />
      )}

      {/* Calculated Column Builder Modal */}
      {parsedData && (
        <CalculatedColumnModal
          isOpen={isCalcModalOpen}
          onClose={() => setIsCalcModalOpen(false)}
          availableNumericColumns={visibleNumericColumns}
          calculatedColumns={calculatedColumns}
          onAddCalculatedColumn={handleAddCalculatedColumn}
          onDeleteCalculatedColumn={handleDeleteCalculatedColumn}
          sampleRows={processedRows.length > 0 ? processedRows : parsedData.rows}
        />
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

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-4">
            {/* Step 1 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xs">
                1
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                Upload Seller Exports
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Drop your raw `.xlsx` or `.csv` export directly from Shopee, Lazada, or TikTok Shop.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-xs">
                2
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                Link Master Cost Sheets
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Perform client-side VLOOKUP / joins using Order ID or SKU to enrich orders with inventory costs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-sm shadow-xs">
                3
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                Calculate Net Margins
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Add calculated columns like <code>Price − Product Cost</code> to see your true margins instantly.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold text-sm shadow-xs">
                4
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white">
                Save Presets &amp; Export
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Download cleaned spreadsheets with total summaries. Presets and calculations stay private on your device.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
