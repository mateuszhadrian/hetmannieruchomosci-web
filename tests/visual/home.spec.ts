// Strona główna (4.4) — regres wizualny na ZAMROŻONYM fixture
// (useVisualFixtureGuard: kafle ofert sekcji 02 pochodzą z danych):
// `home-top` (okno startowe: hero pod przezroczystym paskiem) i `home-full`
// (pełna strona po przejeździe odsłaniającym reveale), 6 profili.
// Determinizm: freeze.css + settleImages (prepareSweep), revealSweep
// (wszystkie bloki `.is-in`, parallax policzony dla pozycji 0), film hero
// ODCIĘTY (`blockHeroVideo`) — zrzut pokazuje stan „zdjęcie"; spec
// dodatkowo asertuje, że film nie gra. Odtwarzanie testuje e2e.
import { expect, test } from "@playwright/test";
import { HOME_PATH } from "../../src/lib/routes";
import { useVisualFixtureGuard } from "../helpers/guards";
import { blockHeroVideo, prepareSweep, revealSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `oferty`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

test.beforeEach(async ({ page }) => {
  await blockHeroVideo(page);
});

test("home: okno startowe (hero) vs baseline", async ({ page }) => {
  await prepareSweep(page, HOME_PATH);
  await expect(page.locator("[data-hero-video]")).not.toHaveAttribute(
    "data-state",
    "playing",
  );
  await expect(page).toHaveScreenshot("home-top.png");
});

test("home: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, HOME_PATH);
  await revealSweep(page);
  await expect(
    page.locator("html.js-motion [data-rv]:not(.is-in)"),
  ).toHaveCount(0);
  await expect(page.locator("[data-hero-video]")).not.toHaveAttribute(
    "data-state",
    "playing",
  );
  await expect(page).toHaveScreenshot("home-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});
