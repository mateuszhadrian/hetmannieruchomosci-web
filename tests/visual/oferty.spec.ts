// Lista ofert (4.2 a + b) — regres wizualny na ZAMROŻONYM fixture
// (useVisualFixtureGuard): pełna strona `/oferty/` (karty, ≥ 1025 panel
// filtrów i sortowanie, < 1025 nawigacja po listach, pigułki statusu,
// CTA), karta jako element (lista `mieszkanie-na-sprzedaz`: obniżka ceny +
// plakietka „Sprzedane"), lista z lokalizacją (jedna karta: parter +
// „Nowość" względem BUILD_NOW; ≥ 1025 chip lokalizacji), panel podstawowy
// i rozwinięty (tylko profile ≥ 1025), lista z filtrem w adresie, zero
// wyników, paginacja (gdy fixture ma > 12 ofert). 4.2 c: pasek narzędzi
// mobile (element), otwarte sheety „Filtry" i „Sortuj" (zrzut strony,
// profile mobilne), widok LISTA na desktopie. Determinizm: freeze.css
// + settleImages (prepareSweep); zdjęcia lokalne z dist/media. Zero ruchu
// w widoku — bez revealSweep; skeleton nie występuje (stan z propsów).
import { expect, test } from "@playwright/test";
import { PAGE_SIZE } from "../../src/lib/offers/filters";
import { OFFERS_PATH, offerListPath } from "../../src/lib/offers/urls";
import { DESKTOP_MIN_PX } from "../../src/lib/site-config";
import { useVisualFixtureGuard } from "../helpers/guards";
import { readFixtureOffersTyped } from "../helpers/offers";
import { settle } from "../helpers/scroll";
import { prepareSweep } from "../helpers/visual";

useVisualFixtureGuard();

const FIXTURE_COUNT = readFixtureOffersTyped().length;
/** Panel i sortowanie istnieją wyłącznie ≥ 1025 (W PARZE z CSS). */
const skipBelowDesktop = (width: number | undefined) =>
  test.skip(
    (width ?? 0) < DESKTOP_MIN_PX,
    "panel filtrów i przełącznik widoku tylko ≥ 1025 px (mobile: sheety)",
  );
/** Pasek narzędzi i sheety istnieją wyłącznie < 1025 (W PARZE z CSS). */
const skipFromDesktop = (width: number | undefined) =>
  test.skip(
    (width ?? 0) >= DESKTOP_MIN_PX,
    "pasek narzędzi i sheety tylko < 1025 px (desktop: panel inline)",
  );

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

test("oferty: panel filtrów (podstawowy) vs baseline", async ({ page }) => {
  skipBelowDesktop(page.viewportSize()?.width);
  await prepareSweep(page, OFFERS_PATH);
  await expect(page.locator("[data-offers-panel]")).toHaveScreenshot(
    "oferty-panel.png",
  );
});

test("oferty: panel filtrów rozwinięty (więcej filtrów) vs baseline", async ({
  page,
}) => {
  skipBelowDesktop(page.viewportSize()?.width);
  await prepareSweep(page, OFFERS_PATH);
  await page.locator("[data-offers-more]").click();
  await expect(page.locator("#op-more")).toBeVisible();
  await settle(page, 200);
  await expect(page.locator("[data-offers-panel]")).toHaveScreenshot(
    "oferty-panel-more.png",
  );
});

test("oferty: lista z filtrem w adresie (cena od) vs baseline", async ({
  page,
}) => {
  await prepareSweep(page, `${OFFERS_PATH}?cena-od=500000`);
  await expect(page).toHaveScreenshot("oferty-list-filtered.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("oferty: zero wyników vs baseline", async ({ page }) => {
  await prepareSweep(page, `${OFFERS_PATH}?numer=SW000000`);
  await expect(page.locator("[data-offers-zero]")).toBeVisible();
  await expect(page).toHaveScreenshot("oferty-zero.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("oferty: paginacja (strona 2) vs baseline", async ({ page }) => {
  test.skip(
    FIXTURE_COUNT <= PAGE_SIZE,
    `fixture ma ${FIXTURE_COUNT} ofert (≤ ${PAGE_SIZE}) — jedna strona; zrzut po przebudowie fixture'u`,
  );
  await prepareSweep(page, `${OFFERS_PATH}?strona=2`);
  await expect(page).toHaveScreenshot("oferty-pagination.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("oferty: pasek narzędzi mobile (Filtruj / Sortuj + statusy) vs baseline", async ({
  page,
}) => {
  skipFromDesktop(page.viewportSize()?.width);
  await prepareSweep(page, OFFERS_PATH);
  await expect(page.locator(".ol-tools")).toHaveScreenshot(
    "oferty-tools-mobile.png",
  );
});

test("oferty: otwarty sheet filtrów vs baseline", async ({ page }) => {
  skipFromDesktop(page.viewportSize()?.width);
  await prepareSweep(page, OFFERS_PATH);
  await page.locator("[data-offers-filters]").click();
  await expect(page.locator("#ol-sheet-filters")).toHaveClass(/is-open/);
  await settle(page, 300);
  await expect(page).toHaveScreenshot("oferty-sheet-filtry.png");
});

test("oferty: otwarty sheet sortowania vs baseline", async ({ page }) => {
  skipFromDesktop(page.viewportSize()?.width);
  await prepareSweep(page, OFFERS_PATH);
  await page.locator("[data-offers-sort-btn]").click();
  await expect(page.locator("#ol-sheet-sort")).toHaveClass(/is-open/);
  await settle(page, 300);
  await expect(page).toHaveScreenshot("oferty-sheet-sortuj.png");
});

test("oferty: widok lista (desktop) vs baseline", async ({ page }) => {
  skipBelowDesktop(page.viewportSize()?.width);
  await prepareSweep(page, OFFERS_PATH);
  await page.locator('[data-view-set="list"]').click();
  await expect(page.locator("[data-offers-grid]")).toHaveAttribute(
    "data-view",
    "list",
  );
  await settle(page, 300);
  await expect(page).toHaveScreenshot("oferty-list-view-list.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});
