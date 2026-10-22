const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const eurRound = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

export const formatEuro = (cents) => eur.format((cents || 0) / 100);
export const formatEuroRound = (cents) => eurRound.format((cents || 0) / 100);

export const formatSigned = (cents) => {
  const base = eur.format(Math.abs(cents || 0) / 100);
  if (!cents) return base;
  return `${cents > 0 ? "+" : "-"}${base}`;
};

export const formatDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december"
];

export const formatDayLong = (iso) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

export const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`;
};

export const formatBytes = (n) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

// Parses user input like "1.234,56" or "12.5" into integer cents (no float math on the result).
export const parseEuroInput = (value) => {
  const s = String(value ?? "").trim().replace(/[€\s]/g, "");
  if (!s) return 0;
  const neg = s.startsWith("-");
  const body = s.replace(/^[+-]/, "");
  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");
  const sep = Math.max(lastComma, lastDot);
  let intPart = body;
  let frac = "";
  if (sep >= 0 && body.length - sep - 1 <= 2 && !(lastComma >= 0 && lastDot >= 0 && sep === lastDot && body.length - sep - 1 === 3)) {
    intPart = body.slice(0, sep);
    frac = body.slice(sep + 1);
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(frac)) return NaN;
  const cents = Number(intPart || "0") * 100 + Number((frac + "00").slice(0, 2));
  return neg ? -cents : cents;
};

export const centsToInput = (cents) => ((cents || 0) / 100).toFixed(2).replace(".", ",");
