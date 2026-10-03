// /kontakt/ (5A) — regres wizualny, 6 profili: `kontakt-full` (pełna
// strona: wstęp, mapa, karta danych, formularz, stopka),
// `kontakt-form-errors` (karta formularza po pustej wysyłce — komunikaty
// błędów) i `kontakt-form-done` (ekran potwierdzenia w miejscu formularza).
// Build z `build:visual` (useVisualFixtureGuard: rok w stopce pochodzi
// z BUILD_NOW). Determinizm: freeze.css + settleImages (prepareSweep).
//
// Potwierdzenie bez sieci: endpoint i Turnstile są zaślepione. Zwykle
// wysyłka w teście jest szybsza niż minimalny czas wypełnienia i moduł
// pokazuje potwierdzenie bez żądania (pułapka na boty); na wolnym runnerze
// żądanie trafia w zaślepkę — ekran jest w obu przypadkach ten sam.
// Zachowanie formularza testuje e2e.
import { expect, test } from "@playwright/test";
import { CONTACT_PATH } from "../../src/lib/routes";
import { stubEndpoint, stubTurnstile } from "../helpers/forms";
import { useVisualFixtureGuard } from "../helpers/guards";
import { settle } from "../helpers/scroll";
import { prepareSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `oferty`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

/** Zrzut ELEMENTU wyższego niż okno Playwright zszywa z kilku przewinięć,
 *  a pasek fixed wjeżdżałby na górę karty formularza (mobile). Pasek ma
 *  własne zrzuty (`chrome.spec`) — tu go chowamy. */
const HIDE_BAR = ".hdr { visibility: hidden !important }";

test("kontakt: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, CONTACT_PATH);
  await expect(page.locator("[data-contact-card] a[data-tel]")).toBeVisible();
  await expect(page).toHaveScreenshot("kontakt-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

test("kontakt: formularz ze stanem błędów vs baseline", async ({ page }) => {
  const endpoint = await stubEndpoint(page);
  await prepareSweep(page, CONTACT_PATH);
  await page.locator("[data-form-submit]").click();
  await expect(page.locator('[data-f="name"]')).toHaveClass(/err/);
  // fokus wraca z pola na dokument — obrys fokusu nie jest częścią stanu
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({ content: HIDE_BAR });
  await settle(page, 300);
  await expect(page.locator("section#formularz")).toHaveScreenshot(
    "kontakt-form-errors.png",
  );
  expect(endpoint.count()).toBe(0);
});

test("kontakt: ekran potwierdzenia vs baseline", async ({ page }) => {
  await stubEndpoint(page);
  await stubTurnstile(page);
  await prepareSweep(page, CONTACT_PATH);
  await page.locator("#kf-name").fill("Anna Nowak");
  await page.locator("#kf-email").fill("anna@example.com");
  await page.locator("#kf-message").fill("Proszę o kontakt.");
  await page.locator("[data-form-submit]").click();
  await expect(page.locator("[data-form-done]")).toBeVisible();
  await expect(page.locator("[data-form-done] a[data-tel]")).toBeVisible();
  await page.addStyleTag({ content: HIDE_BAR });
  await settle(page, 300);
  await expect(page.locator("section#formularz")).toHaveScreenshot(
    "kontakt-form-done.png",
  );
});
