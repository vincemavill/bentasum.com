import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service & Trademark Disclaimer - BentaSum',
  description:
    'Legal terms, disclaimers, and nominative fair use statement for BentaSum e-commerce spreadsheet formatter.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-300">
          <span>📜 Legal Terms &amp; Fair Use Disclaimers</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Terms of Service &amp; Disclaimers
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Last updated: October 2, 2026 • Please read carefully before using BentaSum
        </p>
      </div>

      {/* Mandatory Trademark Disclaimer Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-amber-950 dark:text-amber-200">
              Mandatory Nominative Fair Use &amp; Trademark Disclaimer
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-300">
              &quot;BentaSum is an independent tool and is not affiliated, associated, authorized, endorsed by, or in
              any way officially connected with Shopee, Lazada, TikTok, ByteDance, or any of their subsidiaries. All
              product and platform names are trademarks™ or registered® trademarks of their respective holders.&quot;
            </p>
            <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-400">
              Reference to these marks is made solely under nominative fair use for compatibility and identification
              purposes, indicating file format layouts produced by those respective platforms.
            </p>
          </div>
        </div>
      </div>

      {/* Terms Body */}
      <div className="space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using BentaSum (BentaSum.com), you acknowledge that you have read, understood, and agree
            to be bound by these Terms of Service. If you do not agree to these terms, please do not use the tool.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            2. Purpose &amp; Intended Use
          </h2>
          <p>
            BentaSum is provided as a free, client-side productivity utility intended to assist online sellers in
            filtering columns, reformatting tables, and computing arithmetic column totals from exported marketplace
            spreadsheets.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            3. Financial Accuracy &amp; Reconciliation Disclaimer
          </h2>
          <p>
            While BentaSum has been designed to accurately sanitize currency symbols and calculate column sums,
            spreadsheets may contain formatting anomalies, formula errors, or inconsistent seller export headers.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>
              <strong>No Professional Financial Advice:</strong> BentaSum does not provide certified accounting, tax,
              auditing, or legal counsel.
            </li>
            <li>
              <strong>Verification Obligation:</strong> Sellers must always cross-reference their exported figures and
              aggregate totals against their official marketplace Seller Center statements and bank deposits before
              filing tax returns or making binding financial decisions.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            4. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, BentaSum and its creators shall not be liable for any
            direct, indirect, incidental, consequential, or punitive damages arising from the use of, or inability to
            use, this software, including but not limited to bookkeeping discrepancies, tax miscalculations, loss of
            revenue, or data corruption.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            5. Modifications to the Service
          </h2>
          <p>
            We reserve the right to modify, enhance, or discontinue any feature of BentaSum at any time without prior
            notice. Any updates to these Terms will be posted directly to this page.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          ← Return to Formatter Tool
        </Link>
      </div>
    </div>
  );
}
