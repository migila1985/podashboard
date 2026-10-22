import { formatDate, monthLabel } from "./money";

export const isReportable = (t) => !t.excluded && !t.is_internal_transfer;

export function accountBalance(account, transactions) {
  const after = transactions.filter(
    (t) => t.account_id === account.id && t.booking_date > account.opening_date
  );
  return account.opening_balance_cents + after.reduce((s, t) => s + t.amount_cents, 0);
}

export function accountWarnings(account, transactions) {
  const mine = transactions.filter((t) => t.account_id === account.id).sort((a, b) => a.booking_date.localeCompare(b.booking_date));
  const out = [];
  if (!mine.length) return out;
  const before = mine.filter((t) => t.booking_date <= account.opening_date).length;
  if (before) {
    out.push(`${before} transactie(s) liggen op of vóór de peildatum ${formatDate(account.opening_date)} en tellen niet mee in het saldo.`);
  }
  const first = mine.find((t) => t.booking_date > account.opening_date);
  if (first) {
    const gap = (Date.parse(first.booking_date) - Date.parse(account.opening_date)) / 86400000;
    if (gap > 7) out.push(`Er lijkt een gat van ${Math.round(gap)} dagen tussen de peildatum en de eerste transactie (${formatDate(first.booking_date)}).`);
  }
  return out;
}

export function totals(transactions) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!isReportable(t)) continue;
    if (t.amount_cents > 0) income += t.amount_cents;
    else expense += -t.amount_cents;
  }
  return { income, expense, net: income - expense };
}

export const ymOf = (iso) => iso.slice(0, 7);

export function byMonth(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (!isReportable(t)) continue;
    const ym = ymOf(t.booking_date);
    const m = map.get(ym) || { ym, income: 0, expense: 0 };
    if (t.amount_cents > 0) m.income += t.amount_cents;
    else m.expense += -t.amount_cents;
    map.set(ym, m);
  }
  return [...map.values()]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((m) => ({ ...m, label: monthLabel(m.ym), income: m.income / 100, expense: m.expense / 100 }));
}

export function expensesByCategory(transactions, categories) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const map = new Map();
  for (const t of transactions) {
    if (!isReportable(t) || t.amount_cents >= 0) continue;
    const cat = catMap.get(t.category_id);
    const parent = cat?.parent_id ? catMap.get(cat.parent_id) : cat;
    const key = parent?.id || "none";
    const row = map.get(key) || { id: key, name: parent?.name || "Ongecategoriseerd", color: parent?.color || "#94a3b8", cents: 0 };
    row.cents += -t.amount_cents;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.cents - a.cents);
}

export function balanceSeries(accounts, transactions) {
  const opening = accounts.reduce((s, a) => s + a.opening_balance_cents, 0);
  const rel = transactions.filter((t) => {
    const a = accounts.find((x) => x.id === t.account_id);
    return a && t.booking_date > a.opening_date;
  });
  const days = new Map();
  for (const t of rel) days.set(t.booking_date, (days.get(t.booking_date) || 0) + t.amount_cents);
  let run = opening;
  return [...days.keys()].sort().map((d) => {
    run += days.get(d);
    return { date: d, label: formatDate(d), balance: run / 100 };
  });
}

export function currentMonthKey(transactions) {
  const latest = transactions.reduce((m, t) => (t.booking_date > m ? t.booking_date : m), "");
  return latest ? ymOf(latest) : ymOf(new Date().toISOString());
}

export function prevMonthKey(ym) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
