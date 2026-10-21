import { useState } from "react";
import { navigate } from "../lib/router";
import { useStore } from "../store";
import { isDemo } from "../lib/supabaseClient";
import { Sheet } from "./ui";

const I = (d) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const ICONS = {
  dashboard: I(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  transactions: I(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>),
  import: I(<><path d="M12 3v12m0 0l-4-4m4 4l4-4" /><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></>),
  categories: I(<><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.2" /></>),
  more: I(<><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>),
  accounts: I(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>),
  rules: I(<><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" /></>),
  settings: I(<><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.6 2.6a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 002 1.2L10 21h4l.6-2.6a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" /></>),
  duplicates: I(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></>),
  logout: I(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>)
};

export const MAIN = [
  { key: "dashboard", label: "Dashboard" },
  { key: "transactions", label: "Transacties" },
  { key: "import", label: "Import" },
  { key: "categories", label: "Categorieën" }
];
export const MORE = [
  { key: "accounts", label: "Rekeningen" },
  { key: "rules", label: "Slimme categorisatieregels" },
  { key: "duplicates", label: "Dubbele transacties" },
  { key: "settings", label: "Instellingen" }
];

export default function Layout({ route, children }) {
  const { signOut, error, setError } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((m) => m.key === route) || route === "more";

  const go = (k) => { setMoreOpen(false); navigate(k); };

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex" data-testid="sidebar">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <img src="/icons/icon.svg" alt="" className="h-8 w-8 rounded-lg" /> Mijn Uitgaven
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {[...MAIN, ...MORE].map((n) => (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              aria-current={route === n.key ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium ${route === n.key ? "bg-brand-50 text-brand-600 dark:bg-slate-800" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              {ICONS[n.key]} {n.label}
            </button>
          ))}
        </nav>
        <button onClick={signOut} className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          {ICONS.logout} Uitloggen
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
          <img src="/icons/icon.svg" alt="" className="h-7 w-7 rounded-lg" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Mijn Uitgaven</span>
          {isDemo && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">demo</span>}
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 lg:pb-8">
          {error && (
            <div role="alert" className="mb-4 flex items-start justify-between gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              <span>{error}</span>
              <button onClick={() => setError("")} className="min-h-[32px] min-w-[32px]" aria-label="Melding sluiten">×</button>
            </div>
          )}
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 lg:hidden"
          data-testid="bottom-nav"
        >
          {MAIN.map((n) => (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              aria-current={route === n.key ? "page" : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${route === n.key ? "text-brand-600" : "text-slate-500"}`}
            >
              {ICONS[n.key]}
              {n.label}
            </button>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${moreActive ? "text-brand-600" : "text-slate-500"}`}
          >
            {ICONS.more}
            Meer
          </button>
        </nav>
      </div>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Meer">
        <div className="space-y-1">
          {MORE.map((n) => (
            <button key={n.key} onClick={() => go(n.key)} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-2 text-left text-base text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800">
              {ICONS[n.key]} {n.label}
            </button>
          ))}
          <button onClick={() => { setMoreOpen(false); signOut(); }} className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-2 text-left text-base text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800">
            {ICONS.logout} Uitloggen
          </button>
        </div>
      </Sheet>
    </div>
  );
}
