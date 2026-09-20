import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("shows the German shell with navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Weinkeller");
  await expect(page.locator("html")).toHaveAttribute("lang", "de-CH");
  for (const linkName of ["Keller", "Bald", "Essen", "Mehr"]) {
    await expect(page.getByRole("link", { name: linkName, exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Etikett fotografieren")).toBeAttached();
});

test("shows an inviting empty cellar", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Noch keine Weine" })).toBeVisible();
  await expect(page.getByLabel("Suche")).toBeVisible();
  await expect(page.getByLabel("Weintyp")).toBeVisible();
  await expect(page.getByLabel("Trinkreife")).toBeVisible();
});

const LABEL_FIXTURE = "e2e/fixtures/label.jpg";

test("captures a wine from a label photo and confirms it", async ({ page }) => {
  await page.goto("/capture");
  await page.getByLabel("Etikett fotografieren").first().setInputFiles(LABEL_FIXTURE);

  const captureEntry = page.getByRole("link", { name: /Tignanello 2018/ });
  await expect(captureEntry).toContainText("bitte bestätigen", { timeout: 15_000 });
  await captureEntry.click();

  await expect(page.getByRole("heading", { name: "Stimmt das so?" })).toBeVisible();
  await expect(page.getByLabel("Weingut")).toHaveValue("Marchesi Antinori");
  await page.getByLabel("Anzahl Flaschen").fill("6");
  await page.getByLabel("Lagerort").fill("Regal 2, Fach C");
  await page.getByLabel("Kaufpreis pro Flasche").fill("95");
  await page.getByRole("button", { name: "In den Keller legen" }).click();

  await expect(page.getByRole("heading", { name: "Tignanello 2018" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Tignanello 2018/ })).toContainText("6×");
});

test("never calls the API for a non-numeric wine id", async ({ page }) => {
  const wineApiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/wines/")) wineApiRequests.push(request.url());
  });

  await page.goto("/wines/abc");

  await expect(page.getByText("Dieser Eintrag existiert nicht mehr.")).toBeVisible();
  expect(wineApiRequests).toEqual([]);
});

test("shows the assessment and records a tasting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Tignanello 2018/ }).click();

  await expect(page.getByText("95 Pkt")).toBeVisible();
  await expect(page.getByRole("img", { name: /Trinkfenster 2023 bis 2038/ })).toBeVisible();
  await expect(page.getByText("Bistecca alla fiorentina")).toBeVisible();
  const sourceLink = page.getByRole("link", { name: /Beispielquelle/ });
  await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText("Regal 2, Fach C")).toBeVisible();

  await page.getByRole("button", { name: "Flasche getrunken" }).click();
  await page.getByRole("radio", { name: "4 Sterne" }).check();
  await page.getByLabel("Verkostungsnotiz").fill("Dunkle Kirsche, sehr lang.");
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText("5 Flaschen")).toBeVisible();
  await expect(page.getByText("Dunkle Kirsche, sehr lang.")).toBeVisible();
});

test("edits cellar data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Tignanello 2018/ }).click();
  await page.getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByLabel("Lagerort").fill("Regal 1");
  await page.getByRole("button", { name: "Änderungen speichern" }).click();

  await expect(page.getByText("Regal 1")).toBeVisible();
});

test("lists nothing urgent for a young cellar", async ({ page }) => {
  await page.goto("/soon");
  await expect(page.getByRole("heading", { name: "Nichts eilt" })).toBeVisible();
});

test("recommends wines for a dish and reuses the stored answer", async ({ page }) => {
  await page.goto("/pairing");
  await page.getByLabel("Was gibt es zu essen?").fill("Rindsfilet mit Morcheln");
  await page.getByRole("button", { name: "Wein empfehlen" }).click();

  await expect(page.getByRole("link", { name: /Tignanello 2018/ })).toBeVisible();
  await expect(page.getByText("Neue Empfehlung")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Rindsfilet mit Morcheln" }).click();
  await expect(page.getByText("Gespeicherte Antwort, ohne KI-Kosten")).toBeVisible();
});

test("shows cellar value, AI usage and tasting history", async ({ page }) => {
  await page.goto("/more");
  await expect(page.getByText("5 Flaschen in 1 Wein")).toBeVisible();
  await expect(page.getByText(/Einkaufswert.*475/)).toBeVisible();
  await expect(page.getByText(/KI-Aufrufe diesen Monat: \d+ von 300/)).toBeVisible();

  await page.getByRole("link", { name: "Verkostungen" }).click();
  await expect(page.getByText("Dunkle Kirsche, sehr lang.")).toBeVisible();
});

test("saves settings", async ({ page }) => {
  await page.goto("/more/settings");
  await page.getByLabel("Monatliche Obergrenze für KI-Aufrufe").fill("120");
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByText("Gespeichert")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Monatliche Obergrenze für KI-Aufrufe")).toHaveValue("120");
});

test("recognises a wine that is already in the cellar and merges the bottles", async ({ page }) => {
  await page.goto("/capture");
  await page.getByLabel("Etikett fotografieren").first().setInputFiles(LABEL_FIXTURE);
  const captureEntry = page.getByRole("link", { name: /Tignanello 2018/ });
  await expect(captureEntry).toContainText("bitte bestätigen", { timeout: 15_000 });
  await captureEntry.click();

  await expect(page.getByRole("heading", { name: "Schon im Keller" })).toBeVisible();
  await page.getByLabel("Zusätzliche Flaschen").fill("3");
  await page.getByRole("button", { name: "Bestand erhöhen" }).click();

  await expect(page.getByText("8 Flaschen")).toBeVisible();
});

test("serves a web app manifest for installation", async ({ page }) => {
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  const webManifest = await manifestResponse.json();

  expect(webManifest.name).toBe("Weinkeller");
  expect(webManifest.display).toBe("standalone");
});
