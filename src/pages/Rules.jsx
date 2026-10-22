import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Button, Card, Field, PageHeader, Sheet, inputCls } from "../components/ui";
import { MATCH_FIELDS, MATCH_TYPES, ruleMatches } from "../lib/rules";
import { categoryLabel } from "../components/TransactionParts";
import { centsToInput, parseEuroInput } from "../lib/money";

const blank = (cat) => ({ name: "", category_id: cat, match_field: "counterparty", match_type: "contains", match_value: "", min: "", max: "", priority: 100, active: true });

export default function Rules() {
  const { data, saveRule, deleteRule, runRules } = useStore();
  const [edit, setEdit] = useState(null);
  const rules = [...data.rules].sort((a, b) => a.priority - b.priority);

  const open = (r) => setEdit(r ? { ...r, min: r.min_cents != null ? centsToInput(r.min_cents) : "", max: r.max_cents != null ? centsToInput(r.max_cents) : "" } : blank(data.categories[0]?.id));
  const toRule = (e) => ({
    ...(e.id ? { id: e.id } : {}),
    name: e.name || `${e.match_value} → ${categoryLabel(e.category_id, data.categories)}`,
    category_id: e.category_id, match_field: e.match_field, match_type: e.match_type, match_value: e.match_value,
    min_cents: e.min !== "" ? parseEuroInput(e.min) : null, max_cents: e.max !== "" ? parseEuroInput(e.max) : null,
    priority: Number(e.priority) || 100, active: e.active
  });

  const testCount = useMemo(() => (edit ? data.transactions.filter((t) => ruleMatches(toRule(edit), t)).length : 0), [edit, data.transactions]); // eslint-disable-line

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Slimme categorisatieregels"><Button onClick={() => open()}>+ Regel</Button></PageHeader>
      <Card className="mb-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p>Regels worden op prioriteit uitgevoerd (laagste nummer eerst). Handmatig ingestelde categorieën worden nooit overschreven.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => runRules(true)}>Toepassen op ongecategoriseerd</Button>
          <Button variant="secondary" onClick={() => runRules(false)}>Opnieuw toepassen op niet-handmatige</Button>
        </div>
      </Card>
      <div className="space-y-2">
        {rules.map((r) => (
          <Card key={r.id} className="!p-0">
            <div className="flex items-center gap-2 pr-3">
              <button className="min-h-[60px] flex-1 px-4 py-2 text-left" onClick={() => open(r)}>
                <div className={`font-medium ${r.active ? "" : "text-slate-400 line-through"}`}>{MATCH_FIELDS[r.match_field]} {MATCH_TYPES[r.match_type]} “{r.match_value}”</div>
                <div className="text-sm text-slate-500">→ {categoryLabel(r.category_id, data.categories)} · prioriteit {r.priority} · {r.times_applied || 0}× toegepast</div>
              </button>
              <input type="checkbox" className="h-6 w-6" aria-label="Actief" checked={r.active} onChange={(e) => saveRule({ id: r.id, active: e.target.checked })} />
            </div>
          </Card>
        ))}
        {!rules.length && <p className="text-center text-slate-500">Nog geen regels. Categoriseer een transactie en kies “Ja, maak slimme regel”.</p>}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Regel wijzigen" : "Nieuwe regel"}>
        {edit && (
          <form onSubmit={async (e) => { e.preventDefault(); await saveRule(toRule(edit)); setEdit(null); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Veld"><select className={inputCls} value={edit.match_field} onChange={(e) => setEdit({ ...edit, match_field: e.target.value })}>{Object.entries(MATCH_FIELDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Vergelijking"><select className={inputCls} value={edit.match_type} onChange={(e) => setEdit({ ...edit, match_type: e.target.value })}>{Object.entries(MATCH_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            </div>
            <Field label="Waarde"><input className={inputCls} required value={edit.match_value} onChange={(e) => setEdit({ ...edit, match_value: e.target.value })} /></Field>
            <Field label="Categorie">
              <select className={inputCls} value={edit.category_id} onChange={(e) => setEdit({ ...edit, category_id: e.target.value })}>
                {data.categories.filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{categoryLabel(c.id, data.categories)}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min. bedrag (€)"><input className={inputCls} inputMode="decimal" value={edit.min} onChange={(e) => setEdit({ ...edit, min: e.target.value })} /></Field>
              <Field label="Max. bedrag (€)"><input className={inputCls} inputMode="decimal" value={edit.max} onChange={(e) => setEdit({ ...edit, max: e.target.value })} /></Field>
            </div>
            <Field label="Prioriteit (laag = eerst)"><input className={inputCls} type="number" inputMode="numeric" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} /></Field>
            <p className="text-sm text-slate-500" data-testid="rule-test">Test: deze regel past op {testCount} bestaande transacties.</p>
            <Button type="submit" className="w-full">Opslaan</Button>
            {edit.id && <Button variant="danger" className="w-full" onClick={async () => { await deleteRule(edit.id); setEdit(null); }}>Verwijderen</Button>}
          </form>
        )}
      </Sheet>
    </div>
  );
}
