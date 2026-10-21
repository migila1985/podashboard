import { useState } from "react";
import { useStore } from "../store";
import { Button, Card, PageHeader } from "../components/ui";
import { MORE, ICONS } from "../components/Layout";
import { navigate } from "../lib/router";
import { isDemo } from "../lib/supabaseClient";

export function MorePage() {
  const { signOut } = useStore();
  return (
    <div>
      <PageHeader title="Meer" />
      <Card className="!p-0">
        {MORE.map((n) => (
          <button key={n.key} onClick={() => navigate(n.key)} className="flex min-h-[56px] w-full items-center gap-3 border-b border-slate-100 px-4 text-left last:border-0 dark:border-slate-800">
            {ICONS[n.key]} {n.label}
          </button>
        ))}
        <button onClick={signOut} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left text-red-600">{ICONS.logout} Uitloggen</button>
      </Card>
    </div>
  );
}

export default function Settings() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Instellingen" />
      <Card className="flex items-center justify-between">
        <span>Donkere modus</span>
        <Button variant="secondary" onClick={toggle}>{dark ? "Uitzetten" : "Aanzetten"}</Button>
      </Card>
      <Card className="text-sm text-slate-600 dark:text-slate-300">
        <p>Mijn Uitgaven slaat alleen de benodigde transactiegegevens op in Supabase. Originele CSV-bestanden worden niet bewaard.</p>
        {isDemo && <p className="mt-2 text-amber-700">Demomodus: gegevens staan alleen in deze browser.</p>}
      </Card>
    </div>
  );
}
