import { useState } from "react";
import { useStore } from "../store";
import { Button, Card, Field, PageHeader, Sheet, inputCls } from "../components/ui";
import { centsToInput, formatDate, formatEuro, parseEuroInput } from "../lib/money";
import { accountBalance, accountWarnings } from "../lib/stats";

const today = () => new Date().toISOString().slice(0, 10);

export default function Accounts() {
  const { data, saveAccount, deleteAccount } = useStore();
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState("");

  const open = (a) => setEdit(a ? { ...a, balance: centsToInput(a.opening_balance_cents) } : { name: "", masked_number: "", currency: "EUR", balance: "0,00", opening_date: today() });

  const submit = async (e) => {
    e.preventDefault();
    const cents = parseEuroInput(edit.balance);
    if (Number.isNaN(cents)) { setErr("Ongeldig bedrag."); return; }
    setErr("");
    await saveAccount({
      ...(edit.id ? { id: edit.id } : {}),
      name: edit.name.trim(), masked_number: edit.masked_number || null, currency: edit.currency || "EUR",
      opening_balance_cents: cents, opening_date: edit.opening_date
    });
    setEdit(null);
  };

  const changed = edit?.id && data.accounts.find((a) => a.id === edit.id) &&
    (data.accounts.find((a) => a.id === edit.id).opening_date !== edit.opening_date ||
      data.accounts.find((a) => a.id === edit.id).opening_balance_cents !== parseEuroInput(edit.balance));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Rekeningen"><Button onClick={() => open()}>+ Rekening</Button></PageHeader>
      <Card className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Het berekende saldo is: <strong>beginsaldo + alle geïmporteerde transacties ná de peildatum</strong>. Transacties op of vóór de peildatum worden niet meegeteld, omdat het beginsaldo dan al het echte saldo op die datum is.
      </Card>
      <div className="space-y-3">
        {data.accounts.map((a) => {
          const warn = accountWarnings(a, data.transactions);
          return (
            <Card key={a.id}>
              <button className="w-full text-left" onClick={() => open(a)}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{a.name}</span>
                  <span className="text-lg font-semibold tabular-nums">{formatEuro(accountBalance(a, data.transactions))}</span>
                </div>
                <div className="text-sm text-slate-500">{a.masked_number} · beginsaldo {formatEuro(a.opening_balance_cents)} op {formatDate(a.opening_date)}</div>
              </button>
              {warn.map((w) => <p key={w} className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{w}</p>)}
            </Card>
          );
        })}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Rekening wijzigen" : "Nieuwe rekening"}>
        {edit && (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Naam"><input className={inputCls} required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Gemaskeerd rekeningnummer (optioneel)" hint="Bijv. NL00 INGB •••• 1234. Vul nooit het volledige nummer in.">
              <input className={inputCls} value={edit.masked_number || ""} onChange={(e) => setEdit({ ...edit, masked_number: e.target.value })} />
            </Field>
            <Field label="Beginsaldo (€)"><input className={inputCls} inputMode="decimal" required value={edit.balance} onChange={(e) => setEdit({ ...edit, balance: e.target.value })} /></Field>
            <Field label="Peildatum beginsaldo"><input type="date" className={inputCls} required value={edit.opening_date} onChange={(e) => setEdit({ ...edit, opening_date: e.target.value })} /></Field>
            {changed && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Let op: het wijzigen van het beginsaldo of de peildatum verandert het berekende saldo.</p>}
            {err && <p className="text-sm text-red-700">{err}</p>}
            <Button type="submit" className="w-full">Opslaan</Button>
            {edit.id && <Button variant="danger" className="w-full" onClick={async () => { if (window.confirm("Rekening en alle bijbehorende transacties verwijderen?")) { await deleteAccount(edit.id); setEdit(null); } }}>Verwijderen</Button>}
          </form>
        )}
      </Sheet>
    </div>
  );
}
