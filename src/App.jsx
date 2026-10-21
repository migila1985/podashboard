import { useEffect, useState } from "react";
import { StoreProvider, useStore } from "./store";
import AuthScreen from "./components/AuthScreen";
import Layout from "./components/Layout";
import { EMPTY_FILTERS } from "./components/FilterBar";
import { useRoute } from "./lib/router";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import ImportPage from "./pages/Import";
import Categories from "./pages/Categories";
import Accounts from "./pages/Accounts";
import Rules from "./pages/Rules";
import Duplicates from "./pages/Duplicates";
import Settings, { MorePage } from "./pages/Settings";

function Shell() {
  const { user, loading } = useStore();
  const route = useRoute();
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("theme") === "dark");
  }, []);

  if (user === undefined) return <div className="p-6 text-slate-500">Laden…</div>;
  if (!user) return <AuthScreen />;

  const page = {
    dashboard: <Dashboard filters={filters} setFilters={setFilters} />,
    transactions: <Transactions filters={filters} setFilters={setFilters} />,
    import: <ImportPage />,
    categories: <Categories />,
    accounts: <Accounts />,
    rules: <Rules />,
    duplicates: <Duplicates />,
    settings: <Settings />,
    more: <MorePage />
  }[route] || <Dashboard filters={filters} setFilters={setFilters} />;

  return <Layout route={route}>{loading && !page ? "Laden…" : page}</Layout>;
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
