import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - BentaSum (100% Private Data Guarantee)',
  description:
    'Our strict zero-storage, private data guarantee. Your financial sales data never leaves your device.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <span>🔒 100% Private &amp; Zero File Uploads</span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Last updated: October 2, 2026 • Effective immediately
        </p>
      </div>

      {/* Core Privacy Summary Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
          Summary of Our Privacy Guarantee
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-300">
          <strong>BentaSum operates 100% privately on your device.</strong> When you select or drop a spreadsheet (.xlsx, .xls,
          or .csv), your browser reads it directly on your screen. Not a single row,
          column, customer name, order number, or sales amount is ever uploaded to our servers or
          any cloud service.
        </p>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            1. Private, On-Device Data Processing
          </h2>
          <p>
            Unlike traditional online software tools that upload your files to external company servers,
            BentaSum works entirely on your own computer or phone.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>Your uploaded spreadsheets never travel over the internet.</li>
            <li>No databases or online file servers ever receive or store your data.</li>
            <li>
              When you close or refresh this page, your loaded spreadsheets are instantly cleared from your screen.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            2. Customer &amp; Order Data We Do NOT Collect
          </h2>
          <p>We specifically guarantee that we have zero access to:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-semibold text-rose-600 dark:text-rose-400">✕ Customer Identifiers:</span>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Buyer usernames, real names, shipping addresses, contact numbers, and delivery notes.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <span className="font-semibold text-rose-600 dark:text-rose-400">✕ Financial Records:</span>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Payout amounts, marketplace commissions, seller fees, deal prices, and bank disbursement records.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            3. LocalStorage Usage
          </h2>
          <p>
            BentaSum provides the ability to save custom column templates (e.g., &quot;TikTok Affiliates&quot; or
            &quot;Manual POS&quot;) so you don&apos;t have to re-select your preferred columns every time.
          </p>
          <p>
            These templates are saved exclusively in your browser&apos;s local key-value store (<code>localStorage</code>).
            These records only contain column header strings (e.g., <code>&apos;Order ID&apos;</code>, <code>&apos;Total Amount&apos;</code>)
            and do <strong>NOT</strong> contain any order rows or dollar/peso values. You can clear this data at any
            time using the &quot;Reset Defaults&quot; button or by clearing your browser site data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            4. No Third-Party Analytics on File Contents
          </h2>
          <p>
            We do not embed trackers that inspect the contents of your clipboard or DOM tables. Any analytics, if
            implemented for basic pageview counting, only monitor high-level URL paths (e.g., visits to <code>/</code>{' '}
            or <code>/privacy</code>) and never capture file names or spreadsheet content.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            5. Contact &amp; Questions
          </h2>
          <p>
            If you have questions regarding our privacy guarantee or how your files stay safe on your device, please visit our{' '}
            <Link href="/terms" className="text-emerald-600 hover:underline dark:text-emerald-400">
              Terms &amp; Disclaimers
            </Link>{' '}
            page or reach out via our community channels.
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
