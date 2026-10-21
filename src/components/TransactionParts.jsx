import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Button, CategoryDot, Field, Sheet, inputCls } from "./ui";
import { formatDate, formatSigned } from "../lib/money";

const COLORS = ["#16a34a", "#f97316", "#2563eb", "#eab308", "#0891b2", "#e11d48", "#7c3aed", "#475569", "#db2777"];

export const categoryLabel = (id, categories) => {
  const c = categories.find((x) => x.id === id);
  if (!c) return "Ongecategoriseerd";
  const p = c.parent_id && categories.find((x) => x.id === c.parent_id);
  return p ? `${p.name} › ${c.name}` : c.name;
};

/** Touch-friendly category chooser. */
export function CategoryPicker({ categories, onPick, tx }) {
  const { createCategory } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const list = categories
    .filter((c) => !c.archived)
    .filter((c) => !tx || c.kind === "both" || (tx.amount_cents < 0 ? c.kind === "expense" : c.kind === "income"));

  const add = async () => {
    if (!name.trim()) return;
    const row = await createCategory({
      name: name.trim(), color: COLORS[categories.length % COLORS.length],
      kind: tx ? (tx.amount_cents < 0 ? "expense" : "income") : "both"
    });
    onPick(row.id);
  };

  return (
    <div className="space-y-2" data-testid="category-picker">
      <div className="grid grid-cols-2 gap-2">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="flex min-h-[52px] items-center gap-2 rounded-xl bg-slate-100 px-3 text-left text-base text-slate-900 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
          >
            <CategoryDot color={c.color} />
            <span className="truncate">{c.parent_id ? categoryLabel(c.id, categories) : c.name}</span>
          </button>
        ))}
      </div>
      {creating ? (
        <div className="flex gap-2">
          <input className={inputCls} autoFocus placeholder="Naam nieuwe categorie" aria-label="Naam nieuwe categorie" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={add}>Opslaan</Button>
        </div>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setCreating(true)}>+ Nieuwe categorie</Button>
      )}
    </div>
  );
}

/** Opens a category picker for one or many transactions and runs the "smart rule" follow-up. */
export function CategorizeSheet({ open, onClose, txs }) {
  const { data, categorize, bulkUpdate } = useStore();
  const [picked, setPicked] = useState(null);
  const single = txs.length === 1 ? txs[0] : null;
  const close = () => { setPicked(null); onClose(); };
  const catName = picked ? categoryLabel(picked, data.categories) : "";

  const onPick = async (id) => {
    if (single) {
      setPicked(id);
      await categorize(single, id, "single");
    } else {
      await bulkUpdate(txs.map((t) => t.id), { category_id: id, category_source: "manual", rule_id: null }, "bulkcategorie");
      close();
    }
  };

  const makeRule = async () => {
    await categorize(single, picked, "rule");
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={picked ? "Slimme regel maken?" : "Categorie kiezen"} testId="categorize-sheet">
      {!picked ? (
        <CategoryPicker categories={data.categories} onPick={onPick} tx={single} />
      ) : (
        <div className="space-y-3">
          <p className="text-base text-slate-700 dark:text-slate-200">
            Wil je dat vergelijkbare transacties voortaan automatisch als <strong>{catName}</strong> worden gecategoriseerd?
          </p>
          <Button className="w-full" onClick={makeRule}>Ja, maak slimme regel</Button>
          <Button variant="secondary" className="w-full" onClick={close}>Alleen deze transactie</Button>
        </div>
      )}
    </Sheet>
  );
}

const SOURCE = { manual: "Handmatig", rule: "Regel", unassigned: "Geen" };
export const sourceLabel = (s) => SOURCE[s] || "Geen";

export function TransactionDetail({ tx, onClose }) {
  const { data, updateTransaction } = useStore();
  const [picking, setPicking] = useState(false);
  const account = data.accounts.find((a) => a.id === tx?.account_id);
  const imp = data.imports.find((i) => i.id === tx?.import_id);
  const log = useMemo(
    () => data.audit_log.filter((l) => l.transaction_id === tx?.id).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [data.audit_log, tx]
  );
  if (!tx) return null;
  const rule = data.rules.find((r) => r.id === tx.rule_id);

  const toggle = (key, label) => (
    <label className="flex min-h-[48px] items-center justify-between gap-3">
      <span className="text-base text-slate-800 dark:text-slate-100">{label}</span>
      <input type="checkbox" className="h-6 w-6" checked={!!tx[key]} onChange={(e) => updateTransaction(tx.id, { [key]: e.target.checked }, label)} />
    </label>
  );

  return (
    <>
      <Sheet open={!picking} onClose={onClose} title="Transactiedetails" testId="tx-detail">
        <div className="space-y-4">
          <div>
            <div className={`text-3xl font-semibold ${tx.amount_cents < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatSigned(tx.amount_cents)}</div>
            <div className="mt-1 text-base font-medium text-slate-900 dark:text-slate-100">{tx.counterparty || "Onbekend"}</div>
            <div className="text-sm text-slate-500">{formatDate(tx.booking_date)}</div>
          </div>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Omschrijving</dt><dd className="break-words text-slate-800 dark:text-slate-200">{tx.description || "—"}</dd>
            <dt className="text-slate-500">Type</dt><dd className="text-slate-800 dark:text-slate-200">{tx.type || "—"}</dd>
            <dt className="text-slate-500">Rekening</dt><dd className="text-slate-800 dark:text-slate-200">{account?.name || "—"}</dd>
            <dt className="text-slate-500">Import</dt><dd className="break-all text-slate-800 dark:text-slate-200">{imp?.filename || "—"}</dd>
            <dt className="text-slate-500">Bron categorie</dt>
            <dd className="text-slate-800 dark:text-slate-200">{sourceLabel(tx.category_source)}{rule ? ` (${rule.name})` : ""}</dd>
          </dl>
          <button
            onClick={() => setPicking(true)}
            className="flex min-h-[56px] w-full items-center justify-between rounded-xl bg-slate-100 px-4 text-left dark:bg-slate-800"
            data-testid="change-category"
          >
            <span>
              <span className="block text-xs text-slate-500">Categorie</span>
              <span className="text-base font-medium text-slate-900 dark:text-slate-100">{categoryLabel(tx.category_id, data.categories)}</span>
            </span>
            <span className="text-sm text-brand-600">Wijzigen</span>
          </button>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {toggle("is_internal_transfer", "Interne overboeking")}
            {toggle("excluded", "Uitsluiten van rapportages")}
            {toggle("possible_duplicate", "Vermoedelijk duplicaat")}
          </div>
          {log.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Wijzigingslog</h3>
              <ul className="space-y-1 text-xs text-slate-500">
                {log.slice(0, 5).map((l) => <li key={l.id}>{(l.created_at || "").slice(0, 16).replace("T", " ")} — {l.action}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Sheet>
      <CategorizeSheet open={picking} onClose={() => { setPicking(false); onClose(); }} txs={[tx]} />
    </>
  );
}
