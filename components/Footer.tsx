import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand & Purpose */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Benta<span className="text-emerald-600 dark:text-emerald-400">Sum</span>
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                100% Private
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Free spreadsheet formatter compatible with Shopee, Lazada, and TikTok Shop seller reports.
            </p>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              🔒 100% Private. Your sales data stays safe on your device and is never uploaded.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Navigation & Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="transition hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Spreadsheet Formatter &amp; Sales Summary Tool
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Privacy Policy (Zero Data Storage Guarantee)
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Terms of Service & Trademark Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Supported Formats & Security Badge */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Data Safety Model
            </h4>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Everything is processed right on your computer or phone. Your files and sales numbers are
              never uploaded to any server or shared with anyone.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span className="rounded bg-slate-200/80 px-2 py-0.5 dark:bg-slate-800">.XLSX</span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 dark:bg-slate-800">.XLS</span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 dark:bg-slate-800">.CSV</span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 dark:bg-slate-800">Offline Ready</span>
            </div>
          </div>
        </div>

        {/* Mandatory Trademark Disclaimer */}
        <div className="mt-8 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-500">
          <p className="font-medium text-slate-600 dark:text-slate-400">Trademark & Nominative Fair Use Notice:</p>
          <p className="mt-1">
            BentaSum is an independent tool and is not affiliated, associated, authorized, endorsed by, or in any way
            officially connected with Shopee, Lazada, TikTok, ByteDance, or any of their subsidiaries. All product and
            platform names are trademarks™ or registered® trademarks of their respective holders. Use of them does not
            imply any affiliation with or endorsement by them.
          </p>
          <div className="mt-4 flex flex-col items-start justify-between gap-2 border-t border-slate-200/60 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center dark:border-slate-800/60">
            <p>© {new Date().getFullYear()} BentaSum (BentaSum.com). All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Built by</span>
              <a
                href="https://vincemavill.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center transition-opacity hover:opacity-80"
                title="Vince Mavill"
              >
                <Image
                  src="/assets/devname.png"
                  alt="Vince Mavill"
                  width={610}
                  height={70}
                  className="h-3 w-auto object-contain"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
