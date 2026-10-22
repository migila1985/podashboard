// Purely synthetic demo data (no real persons or merchants' account data).
const MERCHANTS = [
  ["Albert Heijn", "Boodschappen", -4283, "Betaalautomaat"],
  ["Jumbo", "Boodschappen", -3120, "Betaalautomaat"],
  ["Shell", "Auto", -8644, "Betaalautomaat"],
  ["Thuisbezorgd", "Horeca", -2450, "Online bankieren"],
  ["Cafe De Hoek", "Horeca", -1875, "Betaalautomaat"],
  ["Woningcorporatie Voorbeeld", "Wonen", -52500, "Incasso"],
  ["Netflix", "Abonnementen", -1399, "Incasso"],
  ["NS Groep", "Vervoer", -2260, "Betaalautomaat"]
];

const pad = (n) => String(n).padStart(2, "0");

export async function buildDemoData(userId, categories) {
  const cat = (name) => categories.find((c) => c.name === name)?.id || null;
  const now = new Date();
  const transactions = [];
  for (let m = 3; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    transactions.push({
      booking_date: `${ym}-25`, value_date: null, amount_cents: 425000, currency: "EUR",
      counterparty: "Werkgever Voorbeeld BV", counter_account: "NL00TEST0000000001",
      description: `Salaris ${ym}`, type: "Overschrijving", own_account: "NL00TEST0123456789", external_id: null, raw: {},
      category_id: cat("Salaris"), category_source: "manual", rule_id: null, excluded: false,
      is_internal_transfer: false, possible_duplicate: false, duplicate_reviewed: false
    });
    MERCHANTS.forEach(([name, c, amount, type], i) => {
      const day = Math.min(1 + i * 3 + m, 27);
      const isRule = c === "Boodschappen" || c === "Auto";
      transactions.push({
        booking_date: `${ym}-${pad(day)}`, value_date: null, amount_cents: amount + (m * 137 % 900) * (amount < -10000 ? 0 : -1),
        currency: "EUR", counterparty: name, counter_account: null, description: `Pinbetaling ${name}`,
        type, own_account: "NL00TEST0123456789", external_id: null, raw: {},
        category_id: i % 4 === 3 ? null : cat(c), category_source: i % 4 === 3 ? "unassigned" : isRule ? "rule" : "manual",
        rule_id: null, excluded: false, is_internal_transfer: false, possible_duplicate: false, duplicate_reviewed: false
      });
    });
  }
  const opening = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  return {
    account: {
      user_id: userId, name: "Betaalrekening (demo)", masked_number: "NL00 TEST •••• 6789", currency: "EUR",
      opening_balance_cents: 500000, opening_date: `${opening.getFullYear()}-${pad(opening.getMonth() + 1)}-01`
    },
    rules: [
      { user_id: userId, name: "Albert Heijn → Boodschappen", category_id: cat("Boodschappen"), match_field: "counterparty", match_type: "contains", match_value: "albert heijn", min_cents: null, max_cents: null, priority: 100, active: true, times_applied: 0, last_applied_at: null },
      { user_id: userId, name: "Shell → Auto", category_id: cat("Auto"), match_field: "counterparty", match_type: "contains", match_value: "shell", min_cents: null, max_cents: null, priority: 100, active: true, times_applied: 0, last_applied_at: null }
    ],
    transactions
  };
}
