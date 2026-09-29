// Chrome globalny — regres wizualny elementów wspólnych niezależnie od
// widoków: pasek `[data-nav]` (desktop) i OTWARTY bottom sheet menu
// (mobile) — stan, którego zrzut strony nie łapie. Zrzuty na /kontakt/
// (chrome jest wspólny, jeden widok wystarczy).
// Determinizm: freeze.css (prepareSweep) zeruje przejścia, więc sheet
// otwiera się od razu w stanie końcowym.
// Baseline'y powstają w Etapie 3 (szkielet) i ponownie w Etapie 4.1.
import { expect, test } from "@playwright/test";
import { CONTACT_PATH } from "../../src/lib/routes";
import { usePreviewGuard } from "../helpers/guards";
import { settle } from "../helpers/scroll";
import { prepareSweep } from "../helpers/visual";

usePreviewGuard();

test("chrome: pasek desktop vs baseline", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "pasek desktop — profile desktop");
  await prepareSweep(page, CONTACT_PATH);
  await expect(page.locator("[data-nav]")).toHaveScreenshot("chrome-bar.png");
});

test("chrome: otwarty bottom sheet menu vs baseline", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "bottom sheet — profile mobile");
  await prepareSweep(page, CONTACT_PATH);
  await page.locator("[data-burger]").click();
  await expect(page.locator("#nav-sheet")).toHaveClass(/is-open/);
  // Slot tel w stopce sheeta wypełnia JS — gotoReady czekał na
  // networkidle, więc numer jest już złożony, nie pusty.
  await settle(page);
  await expect(page).toHaveScreenshot("chrome-sheet.png");
});
