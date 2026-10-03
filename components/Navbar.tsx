import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 transition-colors group-hover:opacity-90 dark:text-white">
                  Benta<span className="text-emerald-600 dark:text-emerald-400">Sum.com</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300">
                  100% Private
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                E-Commerce Spreadsheet &amp; Sales Formatter
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation & Trust Badges */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-800 md:flex dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Files Stay on Your Device</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Tool
            </Link>
            <Link
              href="/privacy"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Terms
            </Link>

            <div className="hidden items-center gap-1.5 border-l border-slate-200 pl-3 text-xs text-slate-500 sm:flex dark:border-slate-800 dark:text-slate-400">
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Built by</span>
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
          </nav>
        </div>
      </div>
    </header>
  );
}
