import { normalizeAccount, normalizeText } from "./import/normalize";

export const MATCH_FIELDS = {
  counterparty: "Tegenpartij",
  description: "Omschrijving",
  counter_account: "Rekening tegenpartij",
  type: "Transactietype"
};

export const MATCH_TYPES = { contains: "bevat", equals: "is exact" };

const fieldValue = (tx, field) =>
  field === "counter_account" ? normalizeAccount(tx[field]) : normalizeText(tx[field]);

export function ruleMatches(rule, tx) {
  const needle = rule.match_field === "counter_account" ? normalizeAccount(rule.match_value) : normalizeText(rule.match_value);
  if (!needle) return false;
  const hay = fieldValue(tx, rule.match_field);
  const textOk = rule.match_type === "equals" ? hay === needle : hay.includes(needle);
  if (!textOk) return false;
  const abs = Math.abs(tx.amount_cents);
  if (rule.min_cents != null && abs < rule.min_cents) return false;
  if (rule.max_cents != null && abs > rule.max_cents) return false;
  return true;
}

const byPriority = (a, b) => (a.priority ?? 100) - (b.priority ?? 100);

export function findRule(tx, rules) {
  return [...rules].filter((r) => r.active).sort(byPriority).find((r) => ruleMatches(r, tx)) || null;
}

/** Never touches manually categorised transactions. Returns changed rows + rule hit counts. */
export function applyRules(transactions, rules, { onlyUnassigned = false } = {}) {
  const changes = [];
  const hits = {};
  for (const tx of transactions) {
    if (tx.category_source === "manual") continue;
    if (onlyUnassigned && tx.category_id) continue;
    const rule = findRule(tx, rules);
    if (rule) {
      if (tx.category_id !== rule.category_id || tx.category_source !== "rule" || tx.rule_id !== rule.id) {
        changes.push({ id: tx.id, patch: { category_id: rule.category_id, category_source: "rule", rule_id: rule.id } });
      }
      hits[rule.id] = (hits[rule.id] || 0) + 1;
    } else if (tx.category_source === "rule") {
      changes.push({ id: tx.id, patch: { category_id: null, category_source: "unassigned", rule_id: null } });
    }
  }
  return { changes, hits };
}

export function suggestRule(tx, categoryId) {
  const value = tx.counterparty?.trim() || tx.description?.trim() || "";
  const field = tx.counterparty?.trim() ? "counterparty" : "description";
  return {
    name: `${value.slice(0, 40)} → categorie`,
    category_id: categoryId,
    match_field: field,
    match_type: "contains",
    match_value: value.slice(0, 60),
    min_cents: null,
    max_cents: null,
    priority: 100,
    active: true
  };
}

/** Proposes (never applies) internal transfers: opposite amounts, near dates, different accounts. */
export function suggestTransfers(transactions) {
  const pool = transactions.filter((t) => !t.is_internal_transfer && !t.excluded);
  const used = new Set();
  const pairs = [];
  for (const a of pool) {
    if (a.amount_cents >= 0 || used.has(a.id)) continue;
    const b = pool.find(
      (c) =>
        !used.has(c.id) &&
        c.account_id !== a.account_id &&
        c.amount_cents === -a.amount_cents &&
        Math.abs((Date.parse(c.booking_date) - Date.parse(a.booking_date)) / 86400000) <= 3
    );
    if (b) { used.add(a.id); used.add(b.id); pairs.push([a, b]); }
  }
  return pairs;
}
