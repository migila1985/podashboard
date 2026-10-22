import { useState } from "react";
import { useStore } from "../store";
import { Button, Card, CategoryDot, Field, PageHeader, Sheet, inputCls } from "../components/ui";

const KINDS = { expense: "Uitgave", income: "Inkomen", both: "Beide" };

export default function Categories() {
  const { data, saveCategory, deleteCategory } = useStore();
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState("");
  const sorted = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);
  const count = (id) => data.transactions.filter((t) => t.category_id === id).length;

  const move = async (c, dir) => {
    const i = sorted.findIndex((x) => x.id === c.id);
    const other = sorted[i + dir];
    if (!other) return;
    await saveCategory({ id: c.id, sort_order: other.sort_order });
    await saveCategory({ id: other.id, sort_order: c.sort_order });
  };

  const submit = async (e) => {
    e.preventDefault();
    const { id, name, color, kind, parent_id, archived } = edit;
    await saveCategory({
      ...(id ? { id } : { sort_order: data.categories.length, icon: null }),
      name: name.trim(), color, kind, parent_id: parent_id || null, archived: !!archived
    });
    setEdit(null);
  };

  const remove = async (c) => {
    if (count(c.id) > 0) {
      setMsg(`“${c.name}” heeft ${count(c.id)} transacties. Archiveer de categorie of verplaats de transacties eerst.`);
      setEdit(null);
      return;
    }
    await deleteCategory(c.id);
    setEdit(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Categorieën">
        <Button onClick={() => setEdit({ name: "", color: "#2d7ff9", kind: "expense", parent_id: "", archived: false })}>+ Nieuwe categorie</Button>
      </PageHeader>
      {msg && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{msg}</p>}
      <Card className="!p-0">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((c) => (
            <li key={c.id} className="flex min-h-[56px] items-center gap-2 px-3">
              <button className="flex min-h-[56px] flex-1 items-center gap-3 text-left" onClick={() => setEdit({ ...c, parent_id: c.parent_id || "" })}>
                <CategoryDot color={c.color} />
                <span className={c.archived ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}>
                  {c.parent_id ? "↳ " : ""}{c.name}
                </span>
                <span className="text-xs text-slate-500">{KINDS[c.kind]} · {count(c.id)}</span>
              </button>
              <button aria-label={`${c.name} omhoog`} className="h-11 w-11 text-slate-500" onClick={() => move(c, -1)}>▲</button>
              <button aria-label={`${c.name} omlaag`} className="h-11 w-11 text-slate-500" onClick={() => move(c, 1)}>▼</button>
            </li>
          ))}
        </ul>
      </Card>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Categorie wijzigen" : "Nieuwe categorie"}>
        {edit && (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Naam"><input className={inputCls} required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Kleur"><input type="color" className="h-11 w-full rounded-xl" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></Field>
            <Field label="Type">
              <select className={inputCls} value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>
                {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Hoofdcategorie (optioneel)">
              <select className={inputCls} value={edit.parent_id} onChange={(e) => setEdit({ ...edit, parent_id: e.target.value })}>
                <option value="">— geen (hoofdcategorie) —</option>
                {data.categories.filter((c) => !c.parent_id && c.id !== edit.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-6 w-6" checked={!!edit.archived} onChange={(e) => setEdit({ ...edit, archived: e.target.checked })} /> Gearchiveerd</label>
            <Button type="submit" className="w-full">Opslaan</Button>
            {edit.id && <Button variant="danger" className="w-full" onClick={() => remove(edit)}>Verwijderen</Button>}
          </form>
        )}
      </Sheet>
    </div>
  );
}
