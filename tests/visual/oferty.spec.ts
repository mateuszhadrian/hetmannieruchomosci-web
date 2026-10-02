// Lista ofert (4.2 a) — regres wizualny na ZAMROŻONYM fixture
// (useVisualFixtureGuard): pełna strona `/oferty/` (10 kart, nawigacja po
// listach, pigułki statusu, CTA), karta jako element (lista
// `mieszkanie-na-sprzedaz`: obniżka ceny + plakietka „Sprzedane") i lista
// z lokalizacją (jedna karta: parter + „Nowość" względem BUILD_NOW).
// Determinizm: freeze.css + settleImages (prepareSweep); zdjęcia lokalne
// z dist/media. Zero ruchu w widoku — bez revealSweep.
import { expect, test } from "@playwright/test";
import { OFFERS_PATH, offerListPath } from "../../src/lib/offers/urls";
import { useVisualFixtureGuard } from "../helpers/guards";
import { settle } from "../helpers/scroll";
import { prepareSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `not-found`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

const KIND_LIST = offerListPath("mieszkanie", "sprzedaz");
const LOCATION_LIST = offerListPath("mieszkanie", "wynajem", "poznan-piatkowo");

test("oferty: pełna lista /oferty/ vs baseline", async ({ page }) => {
  await prepareSweep(page, OFFERS_PATH);
  await expect(page).toHaveScreenshot("oferty-list.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("oferty: karta (obniżka + Sprzedane) vs baseline", async ({ page }) => {
  await prepareSweep(page, KIND_LIST);
  const card = page.locator("[data-offer-card]").first();
  await card.scrollIntoViewIfNeeded();
  await settle(page, 200);
  await expect(card).toHaveScreenshot("oferty-card.png");
});

test("oferty: lista z lokalizacją (parter, Nowość) vs baseline", async ({
  page,
}) => {
  await prepareSweep(page, LOCATION_LIST);
  await expect(page).toHaveScreenshot("oferty-list-location.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});
