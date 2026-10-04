// /polityka-prywatnosci/ (4.7) — regres wizualny, 6 profili:
// `polityka-top` (okno startowe: nagłówek, pasmo dokumentu, początek spisu)
// i `polityka-full` (pełna strona: spis, dwanaście sekcji, ramka sprzeciwu,
// pas kontaktu, stopka). Build z `build:visual` (useVisualFixtureGuard: rok
// w stopce pochodzi z BUILD_NOW; daty dokumentu to stałe z policy-config).
// Determinizm: freeze.css + settleImages (prepareSweep); widok nie ma ruchu
// ani obrazów. Znaczniki projektu („[do uzupełnienia…]") SĄ na obrazie —
// finalizacja treści regeneruje oba zrzuty. Zachowanie (kotwice, sticky,
// sloty) testuje e2e.
import { expect, test } from "@playwright/test";
import { POLICY_PATH } from "../../src/lib/routes";
import { useVisualFixtureGuard } from "../helpers/guards";
import { prepareSweep } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `oferty`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

test("polityka: okno startowe vs baseline", async ({ page }) => {
  await prepareSweep(page, POLICY_PATH);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page).toHaveScreenshot("polityka-top.png");
});

test("polityka: pełna strona vs baseline", async ({ page }) => {
  await prepareSweep(page, POLICY_PATH);
  // sloty kontaktowe wypełnione (sekcja administratora i pas kontaktu)
  await expect(page.locator("main a[data-mail], main a[data-tel]")).toHaveCount(
    4,
  );
  for (const slot of await page
    .locator("main a[data-mail], main a[data-tel]")
    .all()) {
    await expect(slot).not.toHaveAttribute("hidden", "");
  }
  await expect(page).toHaveScreenshot("polityka-full.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});
