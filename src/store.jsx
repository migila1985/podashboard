import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { auth, db, defaultCategoryRows } from "./lib/db";
import { isDemo } from "./lib/supabaseClient";
import { applyRules, findRule, suggestRule } from "./lib/rules";
import { assignFingerprints } from "./lib/fingerprint";
import { buildDemoData } from "./lib/demoData";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const EMPTY = { accounts: [], categories: [], transactions: [], rules: [], imports: [], audit_log: [] };

export function StoreProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    auth.getUser().then(setUser);
    return auth.onChange(setUser);
  }, []);

  const userId = user?.id;
  const reloadChain = useRef(Promise.resolve());

  const reload = useCallback(() => {
    if (!userId) return Promise.resolve();
    const run = async () => {
    setLoading(true);
    try {
      let [accounts, categories, transactions, rules, imports, audit_log] = await Promise.all(
        Object.keys(EMPTY).map((t) => db.list(t))
      );
      if (!categories.length) {
        categories = await db.insert("categories", defaultCategoryRows(userId));
        if (isDemo && import.meta.env.VITE_DEMO_SEED === "true" && !accounts.length) {
          const seed = await buildDemoData(userId, categories);
          const acc = (await db.insert("accounts", [seed.account]))[0];
          await db.insert("rules", seed.rules);
          const txs = await assignFingerprints(userId, acc.id, seed.transactions);
          await db.insert("transactions", txs.map((t) => ({ ...t, account_id: acc.id })));
          [accounts, rules, transactions] = await Promise.all(["accounts", "rules", "transactions"].map((t) => db.list(t)));
        }
      }
      setData({ accounts, categories, transactions, rules, imports, audit_log });
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    };
    reloadChain.current = reloadChain.current.then(run, run);
    return reloadChain.current;
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const mut = useCallback(async (fn) => {
    try { await fn(); await reload(); } catch (e) { setError(e.message); throw e; }
  }, [reload]);

  const audit = (transaction_id, action, detail) =>
    db.insert("audit_log", [{ user_id: user.id, transaction_id, action, detail }]);

  const actions = useMemo(() => ({
    reload,
    signOut: async () => { await auth.signOut(); setUser(null); setData(EMPTY); },
    signIn: async (e, p) => { const r = await auth.signIn(e, p); setUser(r.user); },
    signUp: async (e, p) => { const r = await auth.signUp(e, p); if (r.session || isDemo) setUser(r.user); return r; },

    saveAccount: (a) => mut(() => (a.id ? db.update("accounts", a.id, a) : db.insert("accounts", [{ ...a, user_id: user.id }]))),
    deleteAccount: (id) => mut(() => db.remove("accounts", id)),

    saveCategory: (c) => mut(() => (c.id ? db.update("categories", c.id, c) : db.insert("categories", [{ ...c, user_id: user.id }]))),
    deleteCategory: (id) => mut(() => db.remove("categories", id)),
    createCategory: async (c) => {
      const [row] = await db.insert("categories", [{
        user_id: user.id, icon: null, archived: false, parent_id: null, kind: "both",
        sort_order: data.categories.length, ...c
      }]);
      await reload();
      return row;
    },

    updateTransaction: (id, patch, action = "bewerkt") =>
      mut(async () => { await db.update("transactions", id, patch); await audit(id, action, JSON.stringify(patch)); }),
    bulkUpdate: (ids, patch, action) =>
      mut(async () => { for (const id of ids) { await db.update("transactions", id, patch); await audit(id, action || "bulk", JSON.stringify(patch)); } }),

    // mode: "single" | "rule"
    categorize: (tx, categoryId, mode = "single") =>
      mut(async () => {
        await db.update("transactions", tx.id, { category_id: categoryId, category_source: "manual", rule_id: null });
        await audit(tx.id, "categorie", `handmatig → ${categoryId}`);
        if (mode === "rule") {
          const [rule] = await db.insert("rules", [{
            user_id: user.id, ...suggestRule(tx, categoryId), times_applied: 0, last_applied_at: null
          }]);
          const others = data.transactions.filter((t) => t.id !== tx.id);
          const { changes, hits } = applyRules(others, [rule], { onlyUnassigned: true });
          for (const c of changes) await db.update("transactions", c.id, c.patch);
          await db.update("rules", rule.id, { times_applied: hits[rule.id] || 0, last_applied_at: new Date().toISOString() });
        }
      }),

    saveRule: (r) => mut(() => (r.id ? db.update("rules", r.id, r) : db.insert("rules", [{ ...r, user_id: user.id, times_applied: 0 }]))),
    deleteRule: (id) => mut(() => db.remove("rules", id)),
    runRules: (onlyUnassigned) =>
      mut(async () => {
        const { changes, hits } = applyRules(data.transactions, data.rules, { onlyUnassigned });
        for (const c of changes) await db.update("transactions", c.id, c.patch);
        for (const r of data.rules) {
          if (hits[r.id]) await db.update("rules", r.id, { times_applied: (r.times_applied || 0) + hits[r.id], last_applied_at: new Date().toISOString() });
        }
      }),

    runImport: async ({ accountId, filename, fileHash, rowsTotal, plan }) => {
      const importRow = (await db.insert("imports", [{
        user_id: user.id, account_id: accountId, filename, file_hash: fileHash,
        rows_total: rowsTotal, rows_inserted: 0, rows_duplicate: plan.duplicates.length, rows_error: plan.errors.length
      }]))[0];
      let auto = 0;
      const rows = plan.toInsert.map(({ tx, possible_duplicate }) => {
        const rule = findRule(tx, data.rules);
        if (rule) auto += 1;
        return {
          ...tx, user_id: user.id, account_id: accountId, import_id: importRow.id,
          category_id: rule?.category_id || null,
          category_source: rule ? "rule" : "unassigned",
          rule_id: rule?.id || null,
          excluded: false, is_internal_transfer: false,
          possible_duplicate, duplicate_reviewed: false
        };
      });
      const inserted = await db.insert("transactions", rows);
      await db.update("imports", importRow.id, { rows_inserted: inserted.length });
      await reload();
      return { inserted: inserted.length, auto, uncategorized: inserted.length - auto };
    }
  }), [reload, mut, user, data]);

  return (
    <Ctx.Provider value={{ user, data, loading, error, setError, ...actions }}>
      {children}
    </Ctx.Provider>
  );
}
