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
