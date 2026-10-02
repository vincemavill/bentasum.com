export default function TrustBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-indigo-50/60 p-4 sm:p-5 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-indigo-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Shield Icon & Guarantee */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                100% Private &amp; Safe. Your files never leave your device.
              </h3>
              <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200">
                Zero Cloud Uploads
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
              We do not store, view, or upload your sales data to any server — all spreadsheet computations, column
              extractions, and totals calculations occur directly in your browser&apos;s memory via WebAssembly/JS.
            </p>
          </div>
        </div>

        {/* Right: Quick Checklist Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-emerald-900 shadow-xs dark:border-emerald-900 dark:bg-slate-900/80 dark:text-emerald-300">
            <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>100% Private</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
            <svg className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>No Account Needed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
