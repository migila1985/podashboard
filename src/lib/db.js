import { isDemo, supabase } from "./supabaseClient";

export const TABLES = ["accounts", "categories", "transactions", "rules", "imports", "audit_log"];

const uuid = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

/* ---------- Demo (localStorage) adapter ---------- */
const LS_KEY = "mijn-uitgaven-demo-v1";
const DEMO_USER = { id: "00000000-0000-4000-8000-000000000001", email: "demo@example.com" };

const readAll = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
};
const writeAll = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));

const demoDb = {
  async list(table) { return readAll()[table] || []; },
  async insert(table, rows) {
    const all = readAll();
    const created = rows.map((r) => ({ id: uuid(), created_at: new Date().toISOString(), user_id: DEMO_USER.id, ...r }));
    const existing = all[table] || [];
    const fresh = table === "transactions"
      ? created.filter((r) => !existing.some((e) => e.account_id === r.account_id && e.fingerprint === r.fingerprint))
      : created;
    all[table] = [...existing, ...fresh];
    writeAll(all);
    return fresh;
  },
  async update(table, id, patch) {
    const all = readAll();
    all[table] = (all[table] || []).map((r) => (r.id === id ? { ...r, ...patch } : r));
    writeAll(all);
  },
  async remove(table, ids) {
    const set = new Set([].concat(ids));
    const all = readAll();
    all[table] = (all[table] || []).filter((r) => !set.has(r.id));
    writeAll(all);
  },
  async reset() { localStorage.removeItem(LS_KEY); }
};

const demoAuth = {
  async getUser() { return localStorage.getItem("demo-signed-out") ? null : DEMO_USER; },
  onChange() { return () => {}; },
  async signIn() { localStorage.removeItem("demo-signed-out"); return { user: DEMO_USER }; },
  async signUp() { localStorage.removeItem("demo-signed-out"); return { user: DEMO_USER }; },
  async signOut() { localStorage.setItem("demo-signed-out", "1"); }
};

/* ---------- Supabase adapter ---------- */
const PAGE = 1000;
const CHUNK = 500;

const check = ({ error, data }) => {
  if (error) throw new Error(error.message);
  return data;
};

const sbDb = {
  async list(table) {
    const out = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from(table).select("*").order("id").range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      out.push(...data);
      if (data.length < PAGE) break;
    }
    return out;
  },
  async insert(table, rows) {
    const out = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const q = table === "transactions"
        ? supabase.from(table).upsert(chunk, { onConflict: "user_id,account_id,fingerprint", ignoreDuplicates: true }).select()
        : supabase.from(table).insert(chunk).select();
      out.push(...check(await q));
    }
    return out;
  },
  async update(table, id, patch) { check(await supabase.from(table).update(patch).eq("id", id)); },
  async remove(table, ids) { check(await supabase.from(table).delete().in("id", [].concat(ids))); }
};

const sbAuth = {
  async getUser() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
  },
  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s?.user || null));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },
  async signOut() { await supabase.auth.signOut(); }
};

export const db = isDemo ? demoDb : sbDb;
export const auth = isDemo ? demoAuth : sbAuth;
export { uuid };

export const DEFAULT_CATEGORIES = [
  ["Boodschappen", "#16a34a", "expense"], ["Horeca", "#f97316", "expense"], ["Wonen", "#2563eb", "expense"],
  ["Energie", "#eab308", "expense"], ["Verzekeringen", "#0891b2", "expense"], ["Zorg", "#e11d48", "expense"],
  ["Vervoer", "#7c3aed", "expense"], ["Auto", "#475569", "expense"], ["Abonnementen", "#db2777", "expense"],
  ["Kleding", "#c026d3", "expense"], ["Vakantie", "#0ea5e9", "expense"], ["Vrije tijd", "#84cc16", "expense"],
  ["Belastingen", "#b45309", "expense"], ["Salaris", "#059669", "income"], ["Overboekingen", "#64748b", "both"],
  ["Overig", "#9ca3af", "both"]
];

export const defaultCategoryRows = (userId) =>
  DEFAULT_CATEGORIES.map(([name, color, kind], i) => ({
    user_id: userId, name, color, kind, icon: null, sort_order: i, archived: false, parent_id: null
  }));
