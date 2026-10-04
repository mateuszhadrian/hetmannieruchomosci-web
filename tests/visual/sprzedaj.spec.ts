// /sprzedaj-z-nami/ (5A / PR 2) — regres wizualny, 6 profili:
// `sprzedaj-top` (okno startowe: hero pod przezroczystym paskiem),
// `sprzedaj-full` (pełna strona po przejeździe odsłaniającym reveale,
// blok pól opcjonalnych ROZWINIĘTY), `sprzedaj-form-errors` (sekcja
// formularza po pustej wysyłce — komunikaty grup i pól)
// i `sprzedaj-form-done` (ekran potwierdzenia w miejscu formularza).
// Build z `build:visual` (useVisualFixtureGuard: rok w stopce pochodzi
// z BUILD_NOW). Determinizm: freeze.css + settleImages (prepareSweep),
// revealSweep (wszystkie bloki `.is-in`, parallax hero policzony dla
// pozycji 0).
//
// Potwierdzenie bez sieci: endpoint i Turnstile są zaślepione. Zwykle
// wysyłka w teście jest szybsza niż minimalny czas wypełnienia i moduł
// pokazuje potwierdzenie bez żądania (pułapka na boty); na wolnym runnerze
// żądanie trafia w zaślepkę — ekran jest w obu przypadkach ten sam.
// Zachowanie formularza testuje e2e.
import { expect, test, type Page } from "@playwright/test";
import { SELL_FORM_ID } from "../../src/components/sections/sell/sell-config";
import { SELL_PATH } from "../../src/lib/routes";
import { stubEndpoint, stubTurnstile } from "../helpers/forms";
import { useVisualFixtureGuard } from "../helpers/guards";
import { settle } from "../helpers/scroll";
import { prepareSweep, revealSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `oferty`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

/** Zrzut ELEMENTU wyższego niż okno Playwright zszywa z kilku przewinięć,
 *  a pasek fixed wjeżdżałby na górę sekcji formularza (mobile). Pasek ma
 *  własne zrzuty (`chrome.spec`) — tu go chowamy. */
const HIDE_BAR = ".hdr { visibility: hidden !important }";

const SECTION = `section#${SELL_FORM_ID}`;

/** Start + przejazd: po nim żaden blok nie czeka na reveal. */
async function prepareRevealed(page: Page): Promise<void> {
  await prepareSweep(page, SELL_PATH);
  await revealSweep(page);
  await expect(
    page.locator("html.js-motion [data-rv]:not(.is-in)"),
  ).toHaveCount(0);
}

test("sprzedaj: okno startowe (hero) vs baseline", async ({ page }) => {
  await prepareSweep(page, SELL_PATH);
  await expect(page.locator("[data-nav]")).not.toHaveAttribute(
    "data-solid",
    "",
  );
  await expect(page).toHaveScreenshot("sprzedaj-top.png");
});

test("sprzedaj: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, SELL_PATH);
  // blok pól opcjonalnych rozwinięty — zrzut niesie komplet pól
  await page
    .locator("[data-sell-details]")
    .evaluate((d: HTMLDetailsElement) => (d.open = true));
  await revealSweep(page);
  await expect(
    page.locator("html.js-motion [data-rv]:not(.is-in)"),
  ).toHaveCount(0);
  await expect(page.locator(".sf-call a[data-tel]")).toBeVisible();
  await expect(page).toHaveScreenshot("sprzedaj-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("sprzedaj: formularz ze stanem błędów vs baseline", async ({ page }) => {
  const endpoint = await stubEndpoint(page);
  await prepareRevealed(page);
  await page.locator("[data-form-submit]").click();
  await expect(page.locator('[data-f="type"]')).toHaveClass(/err/);
  // fokus wraca z kafla na dokument — obrys fokusu nie jest częścią stanu
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({ content: HIDE_BAR });
  await settle(page, 300);
  await expect(page.locator(SECTION)).toHaveScreenshot(
    "sprzedaj-form-errors.png",
  );
  expect(endpoint.count()).toBe(0);
});

test("sprzedaj: ekran potwierdzenia vs baseline", async ({ page }) => {
  await stubEndpoint(page);
  await stubTurnstile(page);
  await prepareRevealed(page);
  await page.locator("#sf-type-2").check();
  await page.locator("#sf-transaction-131").check();
  await page.locator("#sf-name").fill("Anna Nowak");
  await page.locator("#sf-phone").fill("600 100 200");
  await page.locator("[data-form-submit]").click();
  await expect(page.locator("[data-form-done]")).toBeVisible();
  await page.addStyleTag({ content: HIDE_BAR });
  await settle(page, 300);
  await expect(page.locator(SECTION)).toHaveScreenshot(
    "sprzedaj-form-done.png",
  );
});
