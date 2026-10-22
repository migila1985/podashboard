import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { Button, Card, Field, PageHeader, inputCls } from "../components/ui";
import { IMPORT_FIELDS, IngCsvParser } from "../lib/import/ingParser";
import { decodeCsvBuffer } from "../lib/import/normalize";
import { assignFingerprints, planImport } from "../lib/fingerprint";
import { sha256 } from "../lib/hash";
import { formatBytes, formatDate, formatSigned } from "../lib/money";
import { navigate } from "../lib/router";

const MAX_BYTES = 5 * 1024 * 1024;
const FIELD_LABELS = {
  booking_date: "Boekingsdatum *", value_date: "Valutadatum", amount: "Bedrag *", direction: "Af/Bij",
  counterparty: "Naam tegenpartij", own_account: "Eigen rekening", counter_account: "Rekening tegenpartij",
  type: "Transactietype", description: "Omschrijving", external_id: "Uniek kenmerk", currency: "Valuta"
};

export default function ImportPage() {
  const { data, user, runImport, setError } = useStore();
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [mapping, setMapping] = useState({});
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!accountId && data.accounts[0]) setAccountId(data.accounts[0].id); }, [data.accounts, accountId]);

  const parsed = useMemo(() => (text ? IngCsvParser.parse(text, mapping) : null), [text, mapping]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!parsed || parsed.missingRequired.length || !accountId) { setPlan(null); return; }
      const valid = parsed.rows.filter((r) => !r.error);
      const fps = await assignFingerprints(user.id, accountId, valid.map((r) => r.tx));
      let i = 0;
      const rows = parsed.rows.map((r) => (r.error ? r : { ...r, tx: fps[i++] }));
      const existing = data.transactions.filter((t) => t.account_id === accountId);
      if (alive) setPlan(planImport(rows, existing));
    })();
    return () => { alive = false; };
  }, [parsed, accountId, data.transactions, user.id]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    setResult(null);
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name) && !/csv|text\/plain/.test(f.type)) { setError("Kies een CSV-bestand."); return; }
    if (f.size > MAX_BYTES) { setError("Bestand is te groot (maximaal 5 MB)."); return; }
    if (f.size === 0) { setError("Bestand is leeg."); return; }
    setError("");
    const buf = await f.arrayBuffer();
    setFile(f);
    setFileHash(await sha256(buf));
    setMapping({});
    setText(decodeCsvBuffer(buf));
  };

  const sameFile = fileHash && data.imports.some((i) => i.file_hash === fileHash && i.account_id === accountId);
  const account = data.accounts.find((a) => a.id === accountId);
  const before = plan && account ? plan.toInsert.filter((r) => r.tx.booking_date <= account.opening_date).length : 0;
  const possible = plan ? plan.toInsert.filter((r) => r.possible_duplicate).length : 0;

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await runImport({ accountId, filename: file.name, fileHash, rowsTotal: parsed.rows.length, plan });
      setResult({ ...r, read: parsed.rows.length, duplicates: plan.duplicates.length, errors: plan.errors.length });
      setFile(null); setText(""); setPlan(null);
    } catch { /* surfaced via store error */ }
    setBusy(false);
  };

  if (!data.accounts.length) {
    return (
      <div>
        <PageHeader title="Import" />
        <Card className="text-center">
          <p className="mb-3">Maak eerst een rekening aan voordat je kunt importeren.</p>
          <Button onClick={() => navigate("accounts")}>Rekening aanmaken</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="CSV-import (ING)" />
      <Card className="space-y-4">
        <Field label="Rekening">
          <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="CSV-bestand" hint="Kies een bestand uit de Bestanden-app, iCloud Drive of je computer. Maximaal 5 MB.">
          <input
            type="file"
            accept=".csv,text/csv,text/comma-separated-values,application/csv,text/plain"
            onChange={onFile}
            data-testid="csv-input"
            className="block min-h-[44px] w-full text-base file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-brand-600 file:px-4 file:text-sm file:font-medium file:text-white"
          />
        </Field>
      </Card>

      {result && (
        <Card className="mt-4">
          <h2 className="mb-2 font-semibold">Importresultaat</h2>
          <ul className="space-y-1 text-sm" data-testid="import-result">
            <li>Regels gelezen: {result.read}</li>
            <li>Nieuwe transacties: {result.inserted}</li>
            <li>Reeds bestaand: {result.duplicates}</li>
            <li>Foutieve regels: {result.errors}</li>
            <li>Automatisch gecategoriseerd: {result.auto}</li>
            <li>Ongecategoriseerd: {result.uncategorized}</li>
          </ul>
          <Button className="mt-3 w-full" onClick={() => navigate("transactions")}>Bekijk transacties</Button>
        </Card>
      )}

      {parsed && file && (
        <div className="mt-4 space-y-4">
          <Card>
            <div className="break-all font-medium">{file.name}</div>
            <div className="text-sm text-slate-500">{formatBytes(file.size)} · scheidingsteken “{parsed.delimiter === "\t" ? "tab" : parsed.delimiter}” · decimaalteken “{parsed.decimal}” · datumformaat {parsed.dateFormat}</div>
            {sameFile && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Let op: exact dit bestand is eerder geïmporteerd. Dubbele transacties worden overgeslagen.</p>}
          </Card>

          {(parsed.missingRequired.length > 0 || Object.keys(mapping).length > 0) && (
            <Card>
              <h2 className="mb-2 font-semibold">Kolommen koppelen</h2>
              {parsed.missingRequired.length > 0 && <p className="mb-2 text-sm text-red-700">Niet alle verplichte kolommen zijn herkend. Koppel ze hieronder.</p>}
              <div className="grid gap-3 md:grid-cols-2">
                {IMPORT_FIELDS.map((f) => (
                  <Field key={f} label={FIELD_LABELS[f]}>
                    <select className={inputCls} value={parsed.mapping[f] || ""} onChange={(e) => setMapping((m) => ({ ...parsed.mapping, ...m, [f]: e.target.value }))}>
                      <option value="">— niet gebruikt —</option>
                      {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
            </Card>
          )}

          {plan && (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="import-summary">
                <Card className="!p-3"><div className="text-xs text-slate-500">Gevonden</div><div className="text-xl font-semibold">{parsed.rows.length}</div></Card>
                <Card className="!p-3"><div className="text-xs text-slate-500">Nieuw</div><div className="text-xl font-semibold text-emerald-600">{plan.toInsert.length}</div></Card>
                <Card className="!p-3"><div className="text-xs text-slate-500">Duplicaten</div><div className="text-xl font-semibold text-amber-600">{plan.duplicates.length}</div></Card>
                <Card className="!p-3"><div className="text-xs text-slate-500">Fouten</div><div className="text-xl font-semibold text-red-600">{plan.errors.length}</div></Card>
              </div>
              {possible > 0 && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{possible} transactie(s) lijken sterk op bestaande transacties en worden gemarkeerd als vermoedelijk duplicaat.</p>}
              {before > 0 && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{before} transactie(s) liggen op of vóór de peildatum van het beginsaldo en tellen niet mee in het saldo.</p>}

              <Card>
                <h2 className="mb-2 font-semibold">Voorbeeld (eerste 20)</h2>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-testid="import-preview">
                  {parsed.rows.slice(0, 20).map((r) => (
                    <li key={r.line} className={`flex items-center justify-between gap-3 py-2 text-sm ${r.error ? "text-red-700" : ""}`}>
                      {r.error ? (
                        <span>Regel {r.line}: {r.error}</span>
                      ) : (
                        <>
                          <span className="min-w-0"><span className="block truncate font-medium">{r.tx.counterparty || r.tx.description || "—"}</span><span className="text-xs text-slate-500">{formatDate(r.tx.booking_date)}</span></span>
                          <span className={`shrink-0 tabular-nums ${r.tx.amount_cents < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatSigned(r.tx.amount_cents)}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>

              <Button className="w-full" disabled={busy || !plan.toInsert.length} onClick={confirm}>
                {busy ? "Importeren…" : `Importeer ${plan.toInsert.length} transacties`}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
