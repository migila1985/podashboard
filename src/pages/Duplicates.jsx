import { useMemo } from "react";
import { useStore } from "../store";
import { Button, Card, PageHeader } from "../components/ui";
import { formatDate, formatSigned } from "../lib/money";
import { suggestTransfers } from "../lib/rules";

const Row = ({ t, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 py-2">
    <div className="min-w-0">
      <div className="truncate font-medium">{t.counterparty}</div>
      <div className="text-sm text-slate-500">{formatDate(t.booking_date)} · {formatSigned(t.amount_cents)}</div>
    </div>
    <div className="flex gap-2">{children}</div>
  </div>
);

export default function Duplicates() {
  const { data, bulkUpdate, updateTransaction } = useStore();
  const dupes = data.transactions.filter((t) => t.possible_duplicate && !t.duplicate_reviewed);
  const pairs = useMemo(() => suggestTransfers(data.transactions), [data.transactions]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Dubbele transacties" />
      <Card>
        <h2 className="mb-1 font-semibold">Vermoedelijke duplicaten</h2>
        <p className="mb-2 text-sm text-slate-500">Deze transacties lijken sterk op een andere transactie (zelfde dag, bedrag en tegenpartij). Er wordt niets verwijderd zonder jouw keuze.</p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {dupes.map((t) => (
            <Row key={t.id} t={t}>
              <Button variant="secondary" onClick={() => updateTransaction(t.id, { duplicate_reviewed: true }, "geen duplicaat")}>Is geen duplicaat</Button>
              <Button variant="danger" onClick={() => updateTransaction(t.id, { excluded: true, duplicate_reviewed: true }, "duplicaat uitgesloten")}>Uitsluiten</Button>
            </Row>
          ))}
          {!dupes.length && <p className="py-2 text-sm text-slate-500">Geen vermoedelijke duplicaten.</p>}
        </div>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">Voorgestelde interne overboekingen</h2>
        <p className="mb-2 text-sm text-slate-500">Tegengestelde bedragen op verschillende rekeningen binnen 3 dagen.</p>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {pairs.map(([a, b]) => (
            <Row key={a.id} t={a}>
              <Button onClick={() => bulkUpdate([a.id, b.id], { is_internal_transfer: true }, "interne overboeking")}>Markeer als overboeking</Button>
            </Row>
          ))}
          {!pairs.length && <p className="py-2 text-sm text-slate-500">Geen voorstellen.</p>}
        </div>
      </Card>
    </div>
  );
}
