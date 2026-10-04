// /uslugi/ (4.6) — regres wizualny, 6 profili: `uslugi-top` (okno startowe:
// hero pod przezroczystym paskiem) i `uslugi-full` (pełna strona po
// przejeździe odsłaniającym reveale). Build z `build:visual`
// (useVisualFixtureGuard: rok w stopce pochodzi z BUILD_NOW). Determinizm:
// freeze.css + settleImages (prepareSweep), revealSweep (wszystkie bloki
// `.is-in`, parallax policzony dla pozycji 0 — zdjęcie hero ma wtedy
// przesunięcie 0). Zachowanie (kotwice, ruch, progi, slot) testuje e2e.
import { expect, test } from "@playwright/test";
import { SERVICES_PATH } from "../../src/lib/routes";
import { useVisualFixtureGuard } from "../helpers/guards";
import { prepareSweep, revealSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `oferty`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

test("usługi: okno startowe (hero) vs baseline", async ({ page }) => {
  await prepareSweep(page, SERVICES_PATH);
  await expect(page.locator("[data-nav]")).not.toHaveAttribute(
    "data-solid",
    "",
  );
  await expect(page).toHaveScreenshot("uslugi-top.png");
});

test("usługi: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, SERVICES_PATH);
  await revealSweep(page);
  await expect(
    page.locator("html.js-motion [data-rv]:not(.is-in)"),
  ).toHaveCount(0);
  // slot telefonu wypełniony (przycisk pasa CTA „Sprzedaję")
  await expect(page.locator("[data-services-cta] a[data-tel]")).toHaveAttribute(
    "href",
    /^tel:/,
  );
  await expect(page).toHaveScreenshot("uslugi-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});
