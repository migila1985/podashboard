import { describe, expect, it } from "vitest";
import { IngCsvParser } from "../src/lib/import/ingParser";
import { assignFingerprints, planImport } from "../src/lib/fingerprint";
import { applyRules } from "../src/lib/rules";
import { parseEuroInput } from "../src/lib/money";
import { sha256Sync } from "../src/lib/hash";

const CSV = [
  "Datum;Naam / Omschrijving;Rekening;Tegenrekening;Code;Af Bij;Bedrag (EUR);Mutatiesoort;Mededelingen",
  "20240105;Testwinkel;NL00TEST1;;BA;Af;1.234,56;Betaalautomaat;x",
  "20240106;Werkgever;NL00TEST1;NL00TEST2;OV;Bij;10,00;Overschrijving;y"
].join("\n");

describe("ING parser", () => {
  it("parses amounts to signed cents", () => {
    const r = IngCsvParser.parse(CSV);
    expect(r.rows.map((x) => x.tx.amount_cents)).toEqual([-123456, 1000]);
    expect(r.rows[0].tx.booking_date).toBe("2024-01-05");
  });
  it("reports errors per line", () => {
    const r = IngCsvParser.parse(CSV.replace("20240106", "xx"));
    expect(r.rows[1].error).toMatch(/datum/i);
  });
});

describe("dedupe", () => {
  it("is stable and keeps identical same-day rows distinct", async () => {
    const tx = IngCsvParser.parse(CSV).rows[0].tx;
    const a = await assignFingerprints("u", "a", [tx, tx]);
    const b = await assignFingerprints("u", "a", [tx, tx]);
    expect(a[0].fingerprint).toBe(b[0].fingerprint);
    expect(a[0].fingerprint).not.toBe(a[1].fingerprint);
    const plan = planImport(a.map((t) => ({ line: 2, tx: t, error: null })), [a[0]]);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.toInsert[0].possible_duplicate).toBe(true);
  });
  it("sha256 fallback matches known vector", () => {
    expect(sha256Sync(new TextEncoder().encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("rules", () => {
  it("never overrides manual categories", () => {
    const rules = [{ id: "r", active: true, priority: 1, category_id: "c", match_field: "counterparty", match_type: "contains", match_value: "shop" }];
    const txs = [
      { id: "1", counterparty: "SHOP", amount_cents: -1, category_source: "manual", category_id: "x" },
      { id: "2", counterparty: "SHOP", amount_cents: -1, category_source: "unassigned", category_id: null }
    ];
    expect(applyRules(txs, rules).changes.map((c) => c.id)).toEqual(["2"]);
  });
});

describe("money", () => {
  it("parses Dutch input", () => {
    expect(parseEuroInput("1.234,56")).toBe(123456);
    expect(parseEuroInput("-12,5")).toBe(-1250);
  });
});
