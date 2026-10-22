import { useMemo, useState } from "react";
import { inputCls } from "./ui";

export const EMPTY_FILTERS = { account: "", year: "", month: "", from: "", to: "", category: "", kind: "", q: "" };

export function applyFilters(transactions, f, categories) {
  const q = f.q.trim().toLowerCase();
  const catMap = new Map(categories.map((c) => [c.id, c]));
  return transactions.filter((t) => {
    if (f.account && t.account_id !== f.account) return false;
    if (f.year && t.booking_date.slice(0, 4) !== f.year) return false;
    if (f.month && t.booking_date.slice(5, 7) !== f.month) return false;
    if (f.from && t.booking_date < f.from) return false;
    if (f.to && t.booking_date > f.to) return false;
    if (f.category === "none" && t.category_id) return false;
    if (f.category && f.category !== "none") {
      const c = catMap.get(t.category_id);
      if (t.category_id !== f.category && c?.parent_id !== f.category) return false;
    }
    if (f.kind === "income" && t.amount_cents <= 0) return false;
    if (f.kind === "expense" && t.amount_cents >= 0) return false;
    if (q && !`${t.counterparty} ${t.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const MONTH_NAMES = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

export default function FilterBar({ filters, setFilters, accounts, categories, transactions }) {
  const [open, setOpen] = useState(false);
  const years = useMemo(() => [...new Set(transactions.map((t) => t.booking_date.slice(0, 4)))].sort().reverse(), [transactions]);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const active = Object.entries(filters).filter(([k, v]) => v && k !== "q").length;

  return (
    <div className="mb-4 space-y-2" data-testid="filters">
      <div className="flex gap-2">
        <input type="search" className={inputCls} placeholder="Zoeken…" aria-label="Zoeken" value={filters.q} onChange={set("q")} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-h-[44px] shrink-0 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100 lg:hidden"
        >
          Filters{active ? ` (${active})` : ""}
        </button>
      </div>
      <div className={`${open ? "grid" : "hidden"} grid-cols-2 gap-2 md:grid-cols-4 lg:grid lg:grid-cols-8`}>
        <select className={inputCls} aria-label="Rekening" value={filters.account} onChange={set("account")}>
          <option value="">Alle rekeningen</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className={inputCls} aria-label="Jaar" value={filters.year} onChange={set("year")}>
          <option value="">Alle jaren</option>
          {years.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select className={inputCls} aria-label="Maand" value={filters.month} onChange={set("month")}>
          <option value="">Alle maanden</option>
          {MONTH_NAMES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
        </select>
        <select className={inputCls} aria-label="Categorie" value={filters.category} onChange={set("category")}>
          <option value="">Alle categorieën</option>
          <option value="none">Ongecategoriseerd</option>
          {categories.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={inputCls} aria-label="Soort" value={filters.kind} onChange={set("kind")}>
          <option value="">Inkomsten en uitgaven</option>
          <option value="income">Alleen inkomsten</option>
          <option value="expense">Alleen uitgaven</option>
        </select>
        <input type="date" className={inputCls} aria-label="Vanaf datum" value={filters.from} onChange={set("from")} />
        <input type="date" className={inputCls} aria-label="Tot datum" value={filters.to} onChange={set("to")} />
        <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="min-h-[44px] rounded-xl text-sm text-brand-600">Wis filters</button>
      </div>
    </div>
  );
}
