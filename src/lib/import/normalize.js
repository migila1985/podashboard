/**
 * @typedef {Object} NormalizedTransaction
 * @property {string} booking_date      ISO yyyy-mm-dd
 * @property {string|null} value_date
 * @property {number} amount_cents      negative = expense, positive = income
 * @property {string} currency
 * @property {string} counterparty
 * @property {string|null} counter_account
 * @property {string} description
 * @property {string} type
 * @property {string|null} own_account
 * @property {string|null} external_id
 * @property {Object} raw
 *
 * @typedef {Object} ImportValidationResult
 * @property {string} delimiter
 * @property {string[]} headers
 * @property {Object<string,string>} mapping   field -> header
 * @property {string[]} missingRequired
 * @property {{line:number, tx:NormalizedTransaction|null, error:string|null}[]} rows
 * @property {string} dateFormat
 * @property {string} decimal
 *
 * @typedef {Object} CsvImportParser
 * @property {string} id
 * @property {string} name
 * @property {(text:string, mappingOverride?:Object)=>ImportValidationResult} parse
 */

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const normalizeAccount = (value) => String(value ?? "").replace(/\s+/g, "").toUpperCase();

export function decodeCsvBuffer(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function detectDelimiter(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || "";
  const counts = [",", ";", "\t"].map((d) => ({ d, n: first.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

export function detectDateFormat(samples) {
  const s = samples.find(Boolean) || "";
  if (/^\d{8}$/.test(s)) return "yyyymmdd";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return "yyyy-mm-dd";
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(s)) return "dd-mm-yyyy";
  return "unknown";
}

export function parseDate(value, format) {
  const s = String(value ?? "").trim();
  let y, m, d;
  if (format === "yyyymmdd" && /^\d{8}$/.test(s)) {
    [y, m, d] = [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8)];
  } else if (format === "yyyy-mm-dd" && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    [y, m, d] = s.slice(0, 10).split("-");
  } else if (format === "dd-mm-yyyy") {
    const match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (!match) return null;
    [, d, m, y] = match;
  } else {
    return null;
  }
  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function detectDecimal(samples) {
  const withComma = samples.filter((s) => /,\d{1,2}\s*$/.test(s)).length;
  const withDot = samples.filter((s) => /\.\d{1,2}\s*$/.test(s)).length;
  return withComma >= withDot ? "," : ".";
}

// Returns integer cents (signed if the input has a sign), or null when invalid.
export function parseAmountCents(value, decimal) {
  let s = String(value ?? "").trim().replace(/[€\s]/g, "");
  if (!s) return null;
  let neg = false;
  if (s.startsWith("-")) { neg = true; s = s.slice(1); }
  else if (s.startsWith("+")) s = s.slice(1);
  if (decimal === ",") s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  const cents = Number(i) * 100 + Number((f + "00").slice(0, 2));
  return neg ? -cents : cents;
}
