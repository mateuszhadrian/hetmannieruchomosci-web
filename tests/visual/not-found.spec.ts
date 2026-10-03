// Strona 404 — regres wizualny: widok startowy (komunikat w pierwszym
// ekranie pod paskiem) i pełna strona ze stopką. Od 4.3 (b) strona niesie
// wariant świadomy ofert (3 najnowsze aktywne oferty) ⇒ zrzuty stoją na
// ZAMROŻONYM fixture (useVisualFixtureGuard). Zero ruchu ⇒ bez
// revealSweep — wystarczy prepareSweep (freeze.css + dekodowanie obrazów).
import { expect, test } from "@playwright/test";
import { useVisualFixtureGuard } from "../helpers/guards";
import { scrollPageTo, settle } from "../helpers/scroll";
import { prepareSweep } from "../helpers/visual";

useVisualFixtureGuard();

// dowolny nieistniejący adres — preview (jak Cloudflare Pages) serwuje
// pod nim dist/404.html
const PATH = "/nie-ma-takiej-strony/";
// wygasły adres oferty — ten sam plik, wariant ofertowy (skrypt inline)
const OFFER_PATH = "/oferty/mieszkanie-na-sprzedaz/poznan/sw000000/";

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2); globalny próg
 *  w playwright.config.ts zostaje 0.0005. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

test("404: widok startowy vs baseline", async ({ page }) => {
  await prepareSweep(page, PATH);
  // Mikro-scroll tam i z powrotem: WebKit trzyma warstwę paska fixed
  // w niższej rasteryzacji do pierwszego przemalowania.
  await scrollPageTo(page, 10);
  await scrollPageTo(page, 0);
  await settle(page, 300);
  await expect(page).toHaveScreenshot("not-found-top.png");
});

test("404: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, PATH);
  await expect(page).toHaveScreenshot("not-found-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("404: wariant ofertowy (pełna strona) vs baseline", async ({ page }) => {
  await prepareSweep(page, OFFER_PATH);
  await expect(page.locator("[data-nf-offer]")).toBeVisible();
  await expect(page).toHaveScreenshot("not-found-offer.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});
