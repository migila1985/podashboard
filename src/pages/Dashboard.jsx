import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../store";
import FilterBar, { applyFilters } from "../components/FilterBar";
import { Card, CategoryDot, PageHeader } from "../components/ui";
import { formatDate, formatEuro, formatEuroRound, formatSigned } from "../lib/money";
import { accountBalance, balanceSeries, byMonth, currentMonthKey, expensesByCategory, isReportable, prevMonthKey, totals, ymOf } from "../lib/stats";
import { navigate } from "../lib/router";

const eurTip = (v) => formatEuro(Math.round(v * 100));

export default function Dashboard({ filters, setFilters }) {
  const { data } = useStore();
  const { accounts, categories, transactions, imports } = data;

  const filtered = useMemo(() => applyFilters(transactions, filters, categories), [transactions, filters, categories]);
  const accs = filters.account ? accounts.filter((a) => a.id === filters.account) : accounts;

  const balance = accs.reduce((s, a) => s + accountBalance(a, transactions), 0);
  const opening = accs.reduce((s, a) => s + a.opening_balance_cents, 0);
  const all = totals(filtered);
  const month = currentMonthKey(filtered);
  const prev = prevMonthKey(month);
  const cur = totals(filtered.filter((t) => ymOf(t.booking_date) === month));
  const prv = totals(filtered.filter((t) => ymOf(t.booking_date) === prev));
  const catRows = expensesByCategory(filtered, categories);
  const months = byMonth(filtered);
  const series = balanceSeries(accs, transactions.filter((t) => !filters.account || t.account_id === filters.account));
  const uncategorized = filtered.filter((t) => !t.category_id && isReportable(t)).length;
  const biggest = [...filtered].filter((t) => isReportable(t) && t.amount_cents < 0).sort((a, b) => a.amount_cents - b.amount_cents).slice(0, 5);
  const lastTx = transactions.reduce((m, t) => (t.booking_date > m ? t.booking_date : m), "");
  const lastImport = imports.reduce((m, i) => ((i.created_at || "") > m ? i.created_at : m), "");

  if (!accounts.length) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card className="text-center">
          <p className="mb-3 text-slate-600 dark:text-slate-300">Maak eerst een bankrekening aan en importeer je ING-transacties.</p>
          <button onClick={() => navigate("accounts")} className="min-h-[44px] rounded-xl bg-brand-600 px-4 text-white">Rekening aanmaken</button>
        </Card>
      </div>
    );
  }

  const diff = cur.expense - prv.expense;
  const top = catRows.slice(0, 4);
  const rest = catRows.slice(4).reduce((s, r) => s + r.cents, 0);

  return (
    <div>
      <PageHeader title="Dashboard" />
      <FilterBar filters={filters} setFilters={setFilters} accounts={accounts} categories={categories} transactions={transactions} />

      <Card className="mb-4 bg-brand-600 text-white ring-0 dark:bg-brand-600">
        <div className="text-sm opacity-80">Huidig saldo</div>
        <div className="text-3xl font-semibold tabular-nums md:text-4xl" data-testid="balance">{formatEuro(balance)}</div>
        <div className="mt-1 text-xs opacity-80">Beginsaldo {formatEuro(opening)} + transacties na de peildatum</div>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-2 md:gap-4" data-testid="month-cards">
        <Card className="!p-3"><div className="text-xs text-slate-500">Uitgaven</div><div className="text-base font-semibold tabular-nums text-red-600 md:text-xl">{formatEuroRound(cur.expense)}</div></Card>
        <Card className="!p-3"><div className="text-xs text-slate-500">Inkomsten</div><div className="text-base font-semibold tabular-nums text-emerald-600 md:text-xl">{formatEuroRound(cur.income)}</div></Card>
        <Card className="!p-3"><div className="text-xs text-slate-500">Netto</div><div className={`text-base font-semibold tabular-nums md:text-xl ${cur.net < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatSigned(Math.round(cur.net / 100) * 100).replace(/,00$/, "")}</div></Card>
      </div>
      <p className="-mt-2 mb-4 text-xs text-slate-500">
        Maand {month.split("-").reverse().join("-")} · {diff === 0 ? "gelijk aan" : `${formatEuroRound(Math.abs(diff))} ${diff > 0 ? "meer" : "minder"} uitgegeven dan`} vorige maand
      </p>

      <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><div className="text-xs text-slate-500">Totale inkomsten</div><div className="font-semibold tabular-nums text-emerald-600">{formatEuro(all.income)}</div></Card>
        <Card><div className="text-xs text-slate-500">Totale uitgaven</div><div className="font-semibold tabular-nums text-red-600">{formatEuro(all.expense)}</div></Card>
        <Card><div className="text-xs text-slate-500">Ongecategoriseerd</div><button className="min-h-[32px] font-semibold text-amber-700" onClick={() => { setFilters({ ...filters, category: "none" }); navigate("transactions"); }}>{uncategorized} transacties</button></Card>
        <Card><div className="text-xs text-slate-500">Laatste transactie / import</div><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{lastTx ? formatDate(lastTx) : "—"} / {lastImport ? formatDate(lastImport.slice(0, 10)) : "—"}</div></Card>
      </div>

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Uitgaven per categorie</h2>
        <ul className="space-y-1" data-testid="category-list">
          {top.map((r) => (
            <li key={r.id} className="flex min-h-[40px] items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200"><CategoryDot color={r.color} />{r.name}</span>
              <span className="tabular-nums text-slate-900 dark:text-slate-100">{formatEuroRound(r.cents)}</span>
            </li>
          ))}
          {rest > 0 && (
            <li className="flex min-h-[40px] items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200"><CategoryDot color="#94a3b8" />Overig</span>
              <span className="tabular-nums">{formatEuroRound(rest)}</span>
            </li>
          )}
          {!top.length && <li className="text-sm text-slate-500">Geen uitgaven in deze selectie.</li>}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="charts">
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Inkomsten en uitgaven per maand</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={48} />
                <Tooltip formatter={eurTip} />
                <Bar dataKey="income" name="Inkomsten" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Uitgaven" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Verdeling uitgaven</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={catRows.map((r) => ({ name: r.name, value: r.cents / 100, color: r.color }))} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%">
                  {catRows.map((r) => <Cell key={r.id} fill={r.color} />)}
                </Pie>
                <Tooltip formatter={eurTip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Saldoverloop</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={40} />
                <YAxis tick={{ fontSize: 12 }} width={56} domain={["auto", "auto"]} />
                <Tooltip formatter={eurTip} />
                <Area dataKey="balance" name="Saldo" stroke="#2d7ff9" fill="#2d7ff933" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Grootste uitgaven</h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {biggest.map((t) => (
              <li key={t.id} className="flex min-h-[44px] items-center justify-between gap-2 text-sm">
                <span className="truncate">{formatDate(t.booking_date)} · {t.counterparty}</span>
                <span className="font-medium tabular-nums text-red-600">{formatSigned(t.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
