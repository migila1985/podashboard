import { sha256 } from "./hash";
import { normalizeAccount, normalizeText } from "./import/normalize";

const baseKey = (userId, accountId, tx) =>
  [
    userId,
    accountId,
    tx.booking_date,
    tx.amount_cents,
    tx.currency,
    normalizeText(tx.counterparty),
    normalizeText(tx.description),
    normalizeText(tx.type),
    normalizeAccount(tx.counter_account)
  ].join("|");

/**
 * Layer 1: bank-supplied unique reference. Layer 2: SHA-256 over normalised fields plus an
 * occurrence index, so two genuinely identical same-day purchases stay distinct while
 * re-importing the same file produces identical fingerprints.
 */
export async function assignFingerprints(userId, accountId, txs) {
  const seen = new Map();
  const out = [];
  for (const tx of txs) {
    const base = baseKey(userId, accountId, tx);
    const dedupe_key = await sha256(base);
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const fingerprint = tx.external_id
      ? await sha256(`${userId}|${accountId}|ext|${tx.external_id}`)
      : await sha256(`${base}|${n}`);
    out.push({ ...tx, fingerprint, dedupe_key, occurrence: n });
  }
  return out;
}

/** Classifies parsed rows against already stored transactions. */
export function planImport(rows, existing) {
  const existingFp = new Set(existing.map((t) => t.fingerprint));
  const existingKeys = new Set(existing.map((t) => t.dedupe_key));
  const toInsert = [];
  const duplicates = [];
  const errors = [];
  for (const row of rows) {
    if (row.error) { errors.push(row); continue; }
    if (existingFp.has(row.tx.fingerprint)) { duplicates.push(row); continue; }
    const possible = row.tx.occurrence > 1 || existingKeys.has(row.tx.dedupe_key);
    toInsert.push({ ...row, possible_duplicate: possible });
  }
  return { toInsert, duplicates, errors };
}
