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
