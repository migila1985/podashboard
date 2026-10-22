import Papa from "papaparse";
import {
  detectDateFormat,
  detectDecimal,
  detectDelimiter,
  normalizeAccount,
  parseAmountCents,
  parseDate
} from "./normalize";

const ALIASES = {
  booking_date: ["boekingsdatum", "datum", "date", "transactiedatum"],
  value_date: ["valutadatum"],
  amount: ["bedrag (eur)", "bedrag", "amount", "transactiebedrag"],
  direction: ["af bij", "af/bij", "afbij", "af of bij", "debet/credit"],
  counterparty: ["naam / omschrijving", "naam tegenpartij", "naam", "tegenpartij", "naam/omschrijving"],
  own_account: ["rekening", "rekeningnummer", "eigen rekening", "iban/bban"],
  counter_account: ["tegenrekening", "rekening tegenpartij", "tegenrekeningnummer", "iban tegenpartij"],
  type: ["mutatiesoort", "transactietype", "type", "code"],
  description: ["mededelingen", "omschrijving", "mededeling", "omschrijving-1"],
  external_id: ["kenmerk", "transactiekenmerk", "referentie", "volgnr"],
  currency: ["valuta", "munt", "currency"]
};

export const IMPORT_FIELDS = Object.keys(ALIASES);
export const REQUIRED_FIELDS = ["booking_date", "amount"];

const clean = (h) => String(h ?? "").trim().toLowerCase();

export function autoMap(headers) {
  const mapping = {};
  const used = new Set();
  for (const field of IMPORT_FIELDS) {
    for (const alias of ALIASES[field]) {
      const h = headers.find((x) => clean(x) === alias && !used.has(x));
      if (h) { mapping[field] = h; used.add(h); break; }
    }
  }
  return mapping;
}

const isIncomeWord = (s) => /^(bij|credit|cr|c)$/i.test(String(s).trim());
const isExpenseWord = (s) => /^(af|debet|db|d)$/i.test(String(s).trim());

/** @type {import("./normalize").CsvImportParser} */
export const IngCsvParser = {
  id: "ing-nl",
  name: "ING Bank Nederland",

  parse(text, mappingOverride) {
    const delimiter = detectDelimiter(text);
    const parsed = Papa.parse(text, { delimiter, skipEmptyLines: "greedy", header: false });
    const [headerRow = [], ...dataRows] = parsed.data;
    const headers = headerRow.map((h) => String(h ?? "").trim());
    const mapping = { ...autoMap(headers), ...(mappingOverride || {}) };
    Object.keys(mapping).forEach((k) => { if (!mapping[k]) delete mapping[k]; });
    const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f]);

    const col = (row, field) => {
      const idx = headers.indexOf(mapping[field]);
      return idx >= 0 ? String(row[idx] ?? "").trim() : "";
    };

    const dateFormat = mapping.booking_date
      ? detectDateFormat(dataRows.map((r) => col(r, "booking_date")))
      : "unknown";
    const decimal = mapping.amount ? detectDecimal(dataRows.map((r) => col(r, "amount"))) : ",";

    const rows = dataRows.map((row, i) => {
      const line = i + 2;
      if (missingRequired.length) return { line, tx: null, error: "Verplichte kolommen ontbreken" };
      const date = parseDate(col(row, "booking_date"), dateFormat);
      if (!date) return { line, tx: null, error: `Ongeldige datum "${col(row, "booking_date")}"` };
      const rawAmount = parseAmountCents(col(row, "amount"), decimal);
      if (rawAmount === null) return { line, tx: null, error: `Ongeldig bedrag "${col(row, "amount")}"` };

      let cents = rawAmount;
      const dir = mapping.direction ? col(row, "direction") : "";
      if (dir) {
        if (isExpenseWord(dir)) cents = -Math.abs(rawAmount);
        else if (isIncomeWord(dir)) cents = Math.abs(rawAmount);
        else return { line, tx: null, error: `Onbekende af/bij-waarde "${dir}"` };
      }

      const valueRaw = col(row, "value_date");
      const raw = {};
      headers.forEach((h, idx) => { raw[h || `kolom_${idx}`] = row[idx] ?? ""; });

      return {
        line,
        error: null,
        tx: {
          booking_date: date,
          value_date: valueRaw ? parseDate(valueRaw, detectDateFormat([valueRaw])) : null,
          amount_cents: cents,
          currency: (col(row, "currency") || "EUR").toUpperCase(),
          counterparty: col(row, "counterparty"),
          counter_account: normalizeAccount(col(row, "counter_account")) || null,
          description: col(row, "description"),
          type: col(row, "type"),
          own_account: normalizeAccount(col(row, "own_account")) || null,
          external_id: col(row, "external_id") || null,
          raw
        }
      };
    });

    return { delimiter, headers, mapping, missingRequired, rows, dateFormat, decimal };
  }
};

export const PARSERS = [IngCsvParser];
