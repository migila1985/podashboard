import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const ROUTES = ["dashboard", "transactions", "import", "categories", "accounts", "rules", "duplicates", "settings"];

const noHorizontalScroll = async (page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/#/dashboard");
  await page.reload();
  await expect(page.getByTestId("balance")).toBeVisible();
});

for (const route of ROUTES) {
  test(`pagina ${route} is bruikbaar zonder horizontaal scrollen`, async ({ page }) => {
    await page.goto(`/#/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    await noHorizontalScroll(page);
  });
}

test("navigatie: sidebar op desktop, bottom nav op mobiel/tablet", async ({ page }) => {
  const width = page.viewportSize().width;
  if (width >= 1024) {
    await expect(page.getByTestId("sidebar")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toBeHidden();
  } else {
    await expect(page.getByTestId("bottom-nav")).toBeVisible();
    await expect(page.getByTestId("sidebar")).toBeHidden();
    await page.getByTestId("bottom-nav").getByRole("button", { name: "Meer" }).click();
    for (const label of ["Rekeningen", "Slimme categorisatieregels", "Instellingen", "Uitloggen"]) {
      await expect(page.getByRole("dialog").getByText(label)).toBeVisible();
    }
  }
});

test("touch targets in navigatie zijn minimaal 44px", async ({ page }) => {
  const sel = page.viewportSize().width >= 1024 ? '[data-testid="sidebar"] button' : '[data-testid="bottom-nav"] button';
  for (const b of await page.locator(sel).all()) {
    const box = await b.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test("dashboard toont saldo, maandkaarten en grafieken", async ({ page }) => {
  await expect(page.getByTestId("month-cards")).toContainText("Uitgaven");
  await expect(page.getByTestId("category-list")).toBeVisible();
  const charts = page.getByTestId("charts");
  await expect(charts.locator(".recharts-responsive-container").first()).toBeVisible();
  if (page.viewportSize().width < 1024) {
    const [a, b] = await charts.locator(".recharts-responsive-container").evaluateAll((els) => els.slice(0, 2).map((e) => e.getBoundingClientRect().top));
    expect(b).toBeGreaterThan(a);
  }
});

test("transacties: tabel op desktop, kaarten op mobiel; detail en categorie wijzigen", async ({ page }) => {
  await page.goto("/#/transactions");
  const desktop = page.viewportSize().width >= 1024;
  await expect(page.getByTestId(desktop ? "tx-table" : "tx-cards")).toBeVisible();
  await expect(page.getByTestId(desktop ? "tx-cards" : "tx-table")).toBeHidden();

  const first = desktop ? page.locator('[data-testid="tx-table"] tbody tr').first() : page.getByTestId("tx-card").first();
  await first.click();
  await expect(page.getByTestId("tx-detail")).toBeVisible();
  await page.getByTestId("change-category").click();
  await expect(page.getByTestId("category-picker")).toBeVisible();
  await page.getByTestId("category-picker").getByRole("button", { name: "Overig", exact: true }).click();
  await expect(page.getByText("Wil je dat vergelijkbare transacties voortaan automatisch als")).toBeVisible();
  await page.getByRole("button", { name: "Ja, maak slimme regel" }).click();
  await expect(page.getByRole("button", { name: "Ja, maak slimme regel" })).toBeHidden();
  await page.evaluate(() => { location.hash = "#/rules"; });
  await expect(page.getByText("0× toegepast").or(page.getByText(/× toegepast/)).first()).toBeVisible();
});

const CSV = [
  "Datum;Naam / Omschrijving;Rekening;Tegenrekening;Code;Af Bij;Bedrag (EUR);Mutatiesoort;Mededelingen",
  "20990101;Testwinkel Alfa;NL00TEST0000000009;;BA;Af;12,50;Betaalautomaat;Pinbetaling",
  "20990102;Testwinkel Alfa;NL00TEST0000000009;;BA;Af;12,50;Betaalautomaat;Pinbetaling",
  "20990103;Test Werkgever;NL00TEST0000000009;NL00TEST0000000001;OV;Bij;1.000,00;Overschrijving;Salaris",
  "kapot;Fout;NL00TEST0000000009;;BA;Af;abc;Betaalautomaat;x"
].join("\n");

test("CSV-import: preview, duplicaten en bevestiging", async ({ page }) => {
  await page.goto("/#/import");
  await page.getByTestId("csv-input").setInputFiles({ name: "test.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await expect(page.getByText("test.csv")).toBeVisible();
  const summary = page.getByTestId("import-summary");
  await expect(summary).toContainText("Nieuw");
  await expect(page.getByTestId("import-preview")).toContainText("Testwinkel Alfa");
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: /^Importeer 3 transacties/ }).click();
  await expect(page.getByTestId("import-result")).toContainText("Nieuwe transacties: 3");
  await expect(page.getByTestId("import-result")).toContainText("Foutieve regels: 1");

  // Dezelfde file opnieuw: alles is al bekend
  await page.goto("/#/import");
  await page.getByTestId("csv-input").setInputFiles({ name: "test.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await expect(page.getByText("exact dit bestand is eerder geïmporteerd")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Importeer 0 transacties/ })).toBeDisabled();
});

test("categorie-sheet past binnen het scherm", async ({ page }) => {
  await page.goto("/#/transactions");
  const desktop = page.viewportSize().width >= 1024;
  const first = desktop ? page.locator('[data-testid="tx-table"] tbody tr').first() : page.getByTestId("tx-card").first();
  await first.click();
  await page.getByTestId("change-category").click();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
});

test("PWA: manifest en iOS-meta aanwezig", async ({ page, request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.name).toBe("Mijn Uitgaven");
  expect(m.display).toBe("standalone");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  expect((await request.get("/icons/apple-touch-icon.png")).ok()).toBeTruthy();
});
