// /praca/ (5B / PR 2) — regres wizualny, 6 profili: `praca-full` (pełna
// strona: zdjęcie z nagłówkiem, formularz, stopka), `praca-form-errors`
// (sekcja formularza po pustej wysyłce — komunikaty pól i pola pliku),
// `praca-form-file` (strefa z wybranym plikiem: nazwa i rozmiar)
// i `praca-form-done` (ekran potwierdzenia w miejscu formularza).
// Build z `build:visual` (useVisualFixtureGuard: rok w stopce pochodzi
// z BUILD_NOW). Determinizm: freeze.css + settleImages (prepareSweep).
//
// Plik testowy to bufor budowany w teście; endpoint i Turnstile są
// zaślepione — nic nie opuszcza przeglądarki testowej. Dopisek limitu
// w strefie liczy się ze stałej `CV_MAX_BYTES`: zmiana stałej = regeneracja
// zrzutów tego speca. Zachowanie formularza testuje e2e.
import { expect, test, type Page } from "@playwright/test";
import { JOBS_PATH } from "../../src/lib/routes";
import { stubEndpoint, stubTurnstile } from "../helpers/forms";
import { useVisualFixtureGuard } from "../helpers/guards";
import { settle } from "../helpers/scroll";
import { prepareSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `kontakt`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

/** Zrzut ELEMENTU wyższego niż okno Playwright zszywa z kilku przewinięć,
 *  a pasek fixed wjeżdżałby na górę sekcji formularza. Pasek ma własne
 *  zrzuty (`chrome.spec`) — tu go chowamy. */
const HIDE_BAR = ".hdr { visibility: hidden !important }";

const CV = {
  name: "CV-Anna-Nowak.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.alloc(345_678, "%PDF-1.7\n"),
};

/** Zrzut sekcji formularza: fokus zdjęty, kursor poza stroną, pasek
 *  schowany. */
async function shootForm(page: Page, name: string): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.mouse.move(0, 0);
  await page.addStyleTag({ content: HIDE_BAR });
  await settle(page, 300);
  await expect(page.locator("section#formularz")).toHaveScreenshot(name);
}

test("praca: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, JOBS_PATH);
  await expect(page.locator("a.jf-mail-a")).toBeVisible();
  await expect(page).toHaveScreenshot("praca-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("praca: formularz ze stanem błędów vs baseline", async ({ page }) => {
  const endpoint = await stubEndpoint(page);
  await prepareSweep(page, JOBS_PATH);
  await page.locator("[data-form-submit]").click();
  await expect(page.locator('[data-f="name"]')).toHaveClass(/err/);
  await expect(page.locator('[data-f="cv"]')).toHaveClass(/err/);
  await shootForm(page, "praca-form-errors.png");
  expect(endpoint.count()).toBe(0);
});

test("praca: strefa z wybranym plikiem vs baseline", async ({ page }) => {
  await prepareSweep(page, JOBS_PATH);
  await page.locator("#pf-cv").setInputFiles(CV);
  await expect(page.locator("[data-file-name]")).toHaveText(CV.name);
  await expect(page.locator("[data-file-size]")).not.toBeEmpty();
  await shootForm(page, "praca-form-file.png");
});

test("praca: ekran potwierdzenia vs baseline", async ({ page }) => {
  await stubEndpoint(page);
  await stubTurnstile(page);
  await prepareSweep(page, JOBS_PATH);
  await page.locator("#pf-name").fill("Anna Nowak");
  await page.locator("#pf-email").fill("anna@example.com");
  await page.locator("#pf-cv").setInputFiles(CV);
  await page.locator("[data-form-submit]").click();
  await expect(page.locator("[data-form-done]")).toBeVisible();
  await shootForm(page, "praca-form-done.png");
});
