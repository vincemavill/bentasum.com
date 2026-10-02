'use client';

import React, { useMemo, useState } from 'react';
import { ProfileTemplate } from '@/types/profile';
import {
  deleteCustomProfile,
  resetProfilesToDefault,
  saveOrUpdateProfile,
  setActiveProfileId,
} from '@/lib/storage';

interface ProfileManagerProps {
  profiles: ProfileTemplate[];
  activeProfile: ProfileTemplate;
  availableHeaders: string[];
  summableHeaders?: string[];
  onProfilesChange: (updatedProfiles: ProfileTemplate[], activeId: string) => void;
  onActiveProfileChange: (profile: ProfileTemplate) => void;
  deduplicateByOrderId: boolean;
  setDeduplicateByOrderId: (val: boolean) => void;
}

export default function ProfileManager({
  profiles,
  activeProfile,
  availableHeaders,
  summableHeaders = [],
  onProfilesChange,
  onActiveProfileChange,
  deduplicateByOrderId,
  setDeduplicateByOrderId,
}: ProfileManagerProps) {

  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilterTab, setColumnFilterTab] = useState<'all' | 'summable'>('all');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleSelectProfile = (id: string) => {
    const target = profiles.find((p) => p.id === id);
    if (target) {
      // Filter out any non-summable columns from sumColumns
      const sanitizedSum = target.sumColumns.filter((c) =>
        summableHeaders.length === 0 || summableHeaders.includes(c)
      );
      const sanitizedProfile = { ...target, sumColumns: sanitizedSum };

      setActiveProfileId(id);
      onActiveProfileChange(sanitizedProfile);
      showFeedback(`Switched to "${target.name}"`);
    }
  };

  const toggleColumnSelection = (col: string) => {
    const isSelected = activeProfile.selectedColumns.includes(col);
    const updatedSelected = isSelected
      ? activeProfile.selectedColumns.filter((c) => c !== col)
      : [...activeProfile.selectedColumns, col];

    // If unselecting, also remove from sumColumns if present
    const updatedSum = isSelected
      ? activeProfile.sumColumns.filter((c) => c !== col)
      : activeProfile.sumColumns;

    const updatedProfile: ProfileTemplate = {
      ...activeProfile,
      selectedColumns: updatedSelected,
      sumColumns: updatedSum,
    };
    onActiveProfileChange(updatedProfile);
  };

  const toggleSumColumn = (col: string) => {
    // Strict validation: Only allow summable columns to be added
    if (summableHeaders.length > 0 && !summableHeaders.includes(col)) {
      showFeedback(`"${col}" cannot be summed because it is an ID, date, or text column.`);
      return;
    }

    const isSum = activeProfile.sumColumns.includes(col);
    const updatedSum = isSum
      ? activeProfile.sumColumns.filter((c) => c !== col)
      : [...activeProfile.sumColumns, col];

    // Ensure sum column is also a selected column
    const updatedSelected = activeProfile.selectedColumns.includes(col)
      ? activeProfile.selectedColumns
      : [...activeProfile.selectedColumns, col];

    const updatedProfile: ProfileTemplate = {
      ...activeProfile,
      sumColumns: updatedSum,
      selectedColumns: updatedSelected,
    };
    onActiveProfileChange(updatedProfile);
  };

  const handleSelectAll = () => {
    onActiveProfileChange({
      ...activeProfile,
      selectedColumns: [...availableHeaders],
    });
  };

  const handleDeselectAll = () => {
    onActiveProfileChange({
      ...activeProfile,
      selectedColumns: [],
      sumColumns: [],
    });
  };

  const handleSaveCurrent = () => {
    // Sanitize sumColumns before saving
    const sanitizedSum = activeProfile.sumColumns.filter(
      (c) => summableHeaders.length === 0 || summableHeaders.includes(c)
    );
    const toSave = { ...activeProfile, sumColumns: sanitizedSum };

    const updated = saveOrUpdateProfile(toSave);
    onProfilesChange(updated, activeProfile.id);
    showFeedback(`Saved changes to template "${activeProfile.name}"`);
  };

  const handleCreateNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const sanitizedSum = activeProfile.sumColumns.filter(
      (c) => summableHeaders.length === 0 || summableHeaders.includes(c)
    );

    const newId = `custom-${Date.now()}`;
    const newProfile: ProfileTemplate = {
      id: newId,
      name: newProfileName.trim(),
      isDefault: false,
      selectedColumns: [...activeProfile.selectedColumns],
      sumColumns: sanitizedSum,
      orderIdColumn: activeProfile.orderIdColumn,
    };

    const updatedList = saveOrUpdateProfile(newProfile);
    setActiveProfileId(newId);
    onProfilesChange(updatedList, newId);
    setIsCreatingNew(false);
    setNewProfileName('');
    showFeedback(`Created new template "${newProfile.name}"!`);
  };

  const handleDeleteProfile = (id: string) => {
    if (confirm(`Are you sure you want to delete this custom template?`)) {
      const updated = deleteCustomProfile(id);
      const nextActive = updated[0];
      setActiveProfileId(nextActive.id);
      onActiveProfileChange(nextActive);
      onProfilesChange(updated, nextActive.id);
      showFeedback('Custom template removed.');
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all templates back to factory presets? Any custom templates will be removed.')) {
      const reset = resetProfilesToDefault();
      onProfilesChange(reset, reset[0].id);
      onActiveProfileChange(reset[0]);
      showFeedback('Reset templates to default presets.');
    }
  };

  // Filter columns by user search and tab
  const filteredHeaders = useMemo(() => {
    return availableHeaders.filter((h) => {
      const matchesSearch = h.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (columnFilterTab === 'summable') {
        return summableHeaders.includes(h);
      }
      return true;
    });
  }, [availableHeaders, searchTerm, columnFilterTab, summableHeaders]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Template Selector */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Template &amp; Column Setup
            </h3>
            {activeProfile.isDefault && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Default Preset
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Pick an existing marketplace profile or customize visible headers. Only numeric/financial columns can be summed.
          </p>
        </div>

        {/* Profile Dropdown & New Template Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <select
              value={activeProfile.id}
              onChange={(e) => handleSelectProfile(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-800 transition focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <optgroup label="Default Presets">
                {profiles
                  .filter((p) => p.isDefault)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
              {profiles.some((p) => !p.isDefault) && (
                <optgroup label="My Custom Setups">
                  {profiles
                    .filter((p) => !p.isDefault)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Save as New</span>
          </button>

          {!activeProfile.isDefault && (
            <button
              type="button"
              onClick={() => handleDeleteProfile(activeProfile.id)}
              title="Delete this custom template"
              className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* New Profile Modal / Drawer */}
      {isCreatingNew && (
        <form
          onSubmit={handleCreateNewProfile}
          className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/40"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Template Name
              </label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g. TikTok Affiliates Payout or Custom Shopee"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 self-end pt-2 sm:self-center sm:pt-4">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newProfileName.trim()}
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                Save Template
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <span>{feedbackMessage}</span>
          <button type="button" onClick={() => setFeedbackMessage(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Advanced Settings: Order ID Deduplication & Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={deduplicateByOrderId}
              onChange={(e) => setDeduplicateByOrderId(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
            />
            <span>Deduplicate Multi-Item Orders</span>
          </label>

          {deduplicateByOrderId && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Order ID Key:</span>
              <select
                value={activeProfile.orderIdColumn || ''}
                onChange={(e) =>
                  onActiveProfileChange({
                    ...activeProfile,
                    orderIdColumn: e.target.value,
                  })
                }
                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">-- Choose Column --</option>
                {availableHeaders.map((hdr) => (
                  <option key={hdr} value={hdr}>
                    {hdr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveCurrent}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Save Changes to Template
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Column Search & Filter Tabs */}
      <div className="mt-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Columns in File
            </span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-800 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setColumnFilterTab('all')}
                className={`rounded-md px-2.5 py-1 font-semibold transition ${
                  columnFilterTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                All ({availableHeaders.length})
              </button>
              <button
                type="button"
                onClick={() => setColumnFilterTab('summable')}
                className={`rounded-md px-2.5 py-1 font-semibold transition flex items-center gap-1 ${
                  columnFilterTab === 'summable'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300'
                }`}
              >
                <span>∑ Summable Only</span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  {summableHeaders.length}
                </span>
              </button>
            </div>
            <span className="text-xs text-slate-400">
              ({activeProfile.selectedColumns.length} Selected • {activeProfile.sumColumns.length} Summed)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search headers..."
                className="w-40 rounded-lg border border-slate-300 bg-white py-1 pl-7 pr-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden sm:w-52 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <svg
                className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Column Badges Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 max-h-[340px] overflow-y-auto pr-1">
          {filteredHeaders.map((header) => {
            const isSelected = activeProfile.selectedColumns.includes(header);
            const isSum = activeProfile.sumColumns.includes(header);
            const isSummable = summableHeaders.length === 0 || summableHeaders.includes(header);

            return (
              <div
                key={header}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800/80 dark:bg-emerald-950/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
                }`}
              >
                {/* Column Name Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 pr-2 h-[20px]">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleColumnSelection(header)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700"
                  />
                  <span
                    className={`truncate font-medium ${
                      isSelected
                        ? 'text-emerald-950 dark:text-emerald-100'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    title={header}
                  >
                    {header}
                  </span>
                </label>

                {/* Calculate Sum Toggle: Only shown if the column can be summed */}
                {isSummable && (
                  <button
                    type="button"
                    onClick={() => toggleSumColumn(header)}
                    title={
                      isSum
                        ? 'Included in aggregate sum calculation'
                        : 'Click to calculate total for this numeric/financial column'
                    }
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase transition-all ${
                      isSum
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-slate-300 bg-slate-100 text-slate-500 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-emerald-300'
                    }`}
                  >
                    <span>Sum</span>
                    {isSum && <span>✓</span>}
                  </button>
                )}
              </div>
            );
          })}

          {filteredHeaders.length === 0 && (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              No columns match &quot;{searchTerm}&quot; {columnFilterTab === 'summable' ? 'under Summable Only' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
