import { useMemo, useState } from "react";
import { useStore } from "../store";
import FilterBar, { applyFilters } from "../components/FilterBar";
import { Button, CategoryDot, PageHeader } from "../components/ui";
import { CategorizeSheet, TransactionDetail, categoryLabel, sourceLabel } from "../components/TransactionParts";
import { formatDate, formatDayLong, formatSigned } from "../lib/money";

const PAGE_SIZE = 50;

export default function Transactions({ filters, setFilters }) {
  const { data, bulkUpdate } = useStore();
  const [sort, setSort] = useState({ key: "booking_date", dir: "desc" });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const catMap = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const accMap = useMemo(() => new Map(data.accounts.map((a) => [a.id, a])), [data.accounts]);
  const impMap = useMemo(() => new Map(data.imports.map((a) => [a.id, a])), [data.imports]);

  const rows = useMemo(() => {
    const list = applyFilters(data.transactions, filters, data.categories);
    const mul = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return cmp * mul || b.booking_date.localeCompare(a.booking_date);
    });
  }, [data, filters, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const visible = rows.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);
  const selected = data.transactions.find((t) => t.id === selectedId);
  const checkedTxs = data.transactions.filter((t) => checked.has(t.id));

  const grouped = useMemo(() => {
    const g = [];
    for (const t of visible) {
      const last = g[g.length - 1];
      if (last && last.date === t.booking_date) last.items.push(t);
      else g.push({ date: t.booking_date, items: [t] });
    }
    return g;
  }, [visible]);

  const open = (t) => (selectMode ? setChecked((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; }) : setSelectedId(t.id));
  const sortBy = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const arrow = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  const catCell = (t) => {
    const c = catMap.get(t.category_id);
    return c ? (
      <span className="inline-flex items-center gap-1.5"><CategoryDot color={c.color} />{categoryLabel(t.category_id, data.categories)}</span>
    ) : (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Ongecategoriseerd</span>
    );
  };

  const flags = (t) => (
    <>
      {t.category_source === "manual" && <span title="Handmatig gecategoriseerd" aria-label="Handmatig gecategoriseerd">✎</span>}
      {t.possible_duplicate && !t.duplicate_reviewed && <span title="Vermoedelijk duplicaat">⚠</span>}
      {t.is_internal_transfer && <span title="Interne overboeking">⇄</span>}
      {t.excluded && <span title="Uitgesloten">⊘</span>}
    </>
  );

  return (
    <div>
      <PageHeader title="Transacties">
        <Button variant="secondary" onClick={() => { setSelectMode((m) => !m); setChecked(new Set()); }}>
          {selectMode ? "Klaar" : "Selecteren"}
        </Button>
      </PageHeader>
      <FilterBar filters={filters} setFilters={(f) => { setPage(0); setFilters(f); }} accounts={data.accounts} categories={data.categories} transactions={data.transactions} />

      {selectMode && (
        <div className="sticky top-14 z-20 mb-3 flex items-center justify-between gap-2 rounded-xl bg-brand-600 p-2 pl-4 text-sm text-white lg:top-0">
          <span>{checked.size} geselecteerd</span>
          <div className="flex gap-2">
            <button className="min-h-[44px] rounded-lg bg-white/20 px-3" onClick={() => setChecked(new Set(visible.map((t) => t.id)))}>Pagina</button>
            <button className="min-h-[44px] rounded-lg bg-white px-3 text-brand-600 disabled:opacity-50" disabled={!checked.size} onClick={() => setBulkOpen(true)}>Categoriseer</button>
            <button className="min-h-[44px] rounded-lg bg-white/20 px-3 disabled:opacity-50" disabled={!checked.size} onClick={() => bulkUpdate([...checked], { excluded: true }, "uitgesloten")}>Uitsluiten</button>
          </div>
        </div>
      )}

      {!rows.length && <p className="rounded-2xl bg-white p-6 text-center text-slate-500 dark:bg-slate-900">Geen transacties gevonden.</p>}

      {/* Mobile / tablet: cards */}
      <div className="space-y-4 lg:hidden" data-testid="tx-cards">
        {grouped.map((g) => (
          <section key={g.date}>
            <h2 className="mb-1 px-1 text-sm font-medium text-slate-500">{formatDayLong(g.date)}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
              {g.items.map((t) => (
                <li key={t.id}>
                  <button onClick={() => open(t)} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2 text-left active:bg-slate-50 dark:active:bg-slate-800" data-testid="tx-card">
                    {selectMode && <input type="checkbox" readOnly checked={checked.has(t.id)} className="h-5 w-5 shrink-0" aria-label="Selecteer" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-medium text-slate-900 dark:text-slate-100">{t.counterparty || "Onbekend"} <span className="text-xs text-slate-400">{flags(t)}</span></div>
                      <div className="truncate text-sm text-slate-500">{catCell(t)}</div>
                    </div>
                    <div className={`shrink-0 text-base font-semibold tabular-nums ${t.amount_cents < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatSigned(t.amount_cents)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 lg:block" data-testid="tx-table">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
            <tr>
              {selectMode && <th className="w-10 px-3 py-3" />}
              <th className="cursor-pointer px-3 py-3" onClick={() => sortBy("booking_date")}>Datum{arrow("booking_date")}</th>
              <th className="cursor-pointer px-3 py-3" onClick={() => sortBy("counterparty")}>Tegenpartij{arrow("counterparty")}</th>
              <th className="px-3 py-3">Omschrijving</th>
              <th className="cursor-pointer px-3 py-3 text-right" onClick={() => sortBy("amount_cents")}>Bedrag{arrow("amount_cents")}</th>
              <th className="px-3 py-3">Categorie</th>
              <th className="px-3 py-3">Bron</th>
              <th className="px-3 py-3">Rekening</th>
              <th className="px-3 py-3">Import</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.id} onClick={() => open(t)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                {selectMode && <td className="px-3"><input type="checkbox" readOnly checked={checked.has(t.id)} aria-label="Selecteer" /></td>}
                <td className="whitespace-nowrap px-3 py-3">{formatDate(t.booking_date)}</td>
                <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">{t.counterparty} <span className="text-slate-400">{flags(t)}</span></td>
                <td className="max-w-xs truncate px-3 py-3 text-slate-500">{t.description}</td>
                <td className={`whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums ${t.amount_cents < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatSigned(t.amount_cents)}</td>
                <td className="px-3 py-3">{catCell(t)}</td>
                <td className="px-3 py-3 text-slate-500">{sourceLabel(t.category_source)}</td>
                <td className="px-3 py-3 text-slate-500">{accMap.get(t.account_id)?.name}</td>
                <td className="max-w-[10rem] truncate px-3 py-3 text-slate-500">{impMap.get(t.import_id)?.filename}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Vorige</Button>
          <span className="text-sm text-slate-500">Pagina {cur + 1} van {pages} ({rows.length})</span>
          <Button variant="secondary" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Volgende</Button>
        </div>
      )}

      {selected && <TransactionDetail tx={selected} onClose={() => setSelectedId(null)} />}
      <CategorizeSheet open={bulkOpen} onClose={() => { setBulkOpen(false); setChecked(new Set()); setSelectMode(false); }} txs={checkedTxs.length ? checkedTxs : [{ amount_cents: 0 }, { amount_cents: 0 }]} />
    </div>
  );
}
