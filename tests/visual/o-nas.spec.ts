// /o-nas/ (4.5) — regres wizualny, 6 profili: `o-nas-top` (okno startowe:
// hero pod przezroczystym paskiem) i `o-nas-full` (pełna strona po
// przejeździe odsłaniającym reveale). Build z `build:visual`
// (useVisualFixtureGuard: rok w stopce pochodzi z BUILD_NOW). Determinizm:
// freeze.css + settleImages (prepareSweep), revealSweep (wszystkie bloki
// `.is-in`, parallax policzony dla pozycji 0 — zdjęcie hero ma wtedy
// przesunięcie 0). Zachowanie (ruch, progi, sloty) testuje e2e.
import { expect, test } from "@playwright/test";
import { ABOUT_PATH } from "../../src/lib/routes";
import { useVisualFixtureGuard } from "../helpers/guards";
import { prepareSweep, revealSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `oferty`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

test("o nas: okno startowe (hero) vs baseline", async ({ page }) => {
  await prepareSweep(page, ABOUT_PATH);
  await expect(page.locator("[data-nav]")).not.toHaveAttribute(
    "data-solid",
    "",
  );
  await expect(page).toHaveScreenshot("o-nas-top.png");
});

test("o nas: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, ABOUT_PATH);
  await revealSweep(page);
  await expect(
    page.locator("html.js-motion [data-rv]:not(.is-in)"),
  ).toHaveCount(0);
  // sloty kontaktowe wypełnione (karta danych od 1025 px)
  await expect(
    page.locator("[data-about-contacts] a[data-tel]"),
  ).not.toHaveAttribute("hidden", "");
  await expect(page).toHaveScreenshot("o-nas-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});
