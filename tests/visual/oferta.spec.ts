// Detal oferty (4.3 a) — regres wizualny na ZAMROŻONYM fixture
// (useVisualFixtureGuard): cztery warianty pełnej strony — mieszkanie
// (aktywna, film + spacer, obniżka), dom (działka, liczba pięter, zdjęcia
// pionowe), działka (bez ulicy, sprzedana, 22 zdjęcia) i lokal
// (rezerwacja, „Zapytaj o cenę", parter). Determinizm: freeze.css +
// settleImages (prepareSweep); zdjęcia i mapa lokalne z dist/media.
// Opis zwinięty (stan po JS), kotwice z pierwszą aktywną.
// (b): `oferta-lightbox` (zrzut okna po otwarciu od 2. kadru — sheet na
// profilach mobilnych, modal na desktopie) i `oferta-druk` (arkusz druku
// na szerokości kartki A4, tylko chromium-1920).
// 5B: formularz zapytania w sekcji kontaktu jest częścią czterech zrzutów
// pełnej strony; osobno `oferta-form-errors` (sekcja kontaktu po wysyłce
// bez imienia i kontaktu) i `oferta-form-done` (potwierdzenie w miejscu
// formularza) — endpoint i Turnstile zaślepione, zachowanie testuje e2e.
import { expect, test } from "@playwright/test";
import { offerDetailPath } from "../../src/lib/routes";
import { stubEndpoint, stubTurnstile } from "../helpers/forms";
import { useVisualFixtureGuard } from "../helpers/guards";
import { settle } from "../helpers/scroll";
import { prepareSweep, settleImages } from "../helpers/visual";

useVisualFixtureGuard();

/** Tolerancja fullPage (szum resamplingu WebKit dpr=2), jak `oferty`. */
const FULLPAGE_MAX_DIFF_RATIO = 0.001;

const VARIANTS = [
  {
    name: "mieszkanie",
    path: offerDetailPath(
      "mieszkanie",
      "sprzedaz",
      "poznan-winogrady",
      "SW486462",
    ),
  },
  {
    name: "dom",
    path: offerDetailPath("dom", "sprzedaz", "poznan-szczepankowo", "SW349452"),
  },
  {
    name: "dzialka",
    path: offerDetailPath("dzialka", "sprzedaz", "kornik-bnin", "SW184702"),
  },
  {
    name: "lokal",
    path: offerDetailPath(
      "lokal-komercyjny",
      "sprzedaz",
      "poznan-wilda",
      "SW372150",
    ),
  },
] as const;

for (const v of VARIANTS) {
  test(`oferta: detal ${v.name} vs baseline`, async ({ page }) => {
    await prepareSweep(page, v.path);
    await expect(page).toHaveScreenshot(`oferta-${v.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
    });
  });
}

test("oferta: lightbox otwarty od 2. kadru vs baseline", async ({ page }) => {
  await prepareSweep(page, VARIANTS[0].path);
  // klik z JS — bez przewijania strony do miniatury (pod scrimem sheetu
  // widać stronę, więc pozycja scrolla jest częścią zrzutu)
  await page
    .locator('[data-gal-thumb="1"]')
    .evaluate((el) => (el as HTMLElement).click());
  await expect(page.locator("#of-lightbox")).toHaveClass(/is-open/);
  await expect(page.locator("[data-lb-count]")).toHaveText(/^2 \/ /);
  await settleImages(page);
  await settle(page, 300);
  await expect(page).toHaveScreenshot("oferta-lightbox.png");
});

/** Szerokość kartki A4 w px CSS (210 mm przy 96 dpi) — zrzut druku ma
 *  pokazywać układ z papieru, nie z szerokiego okna. */
const PRINT_VIEWPORT = { width: 794, height: 1123 };

test("oferta: arkusz druku vs baseline", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-1920",
    "arkusz druku niezależny od profilu — jeden projekt wystarczy",
  );
  await prepareSweep(page, VARIANTS[0].path);
  await page.setViewportSize(PRINT_VIEWPORT);
  await page.emulateMedia({ media: "print" });
  // obrazy siatki druku są `lazy` — settleImages przełącza je na eager
  // i czeka na dekodowanie (jak `beforeprint` w skrypcie widoku)
  await settleImages(page);
  await settle(page, 300);
  await expect(page).toHaveScreenshot("oferta-druk.png", {
    fullPage: true,
    maxDiffPixelRatio: FULLPAGE_MAX_DIFF_RATIO,
  });
});

/** Zrzut ELEMENTU sekcji kontaktu: pasek fixed, pasek kotwic (sticky)
 *  i pasek dolny (telefon) wjeżdżałyby na zszywany zrzut — mają własne
 *  miejsce w zrzutach pełnej strony i w `chrome.spec`. */
const HIDE_BARS =
  ".hdr, [data-offer-anchors], .od-bar-host { visibility: hidden !important }";

test("oferta: formularz zapytania ze stanem błędów vs baseline", async ({
  page,
}) => {
  const endpoint = await stubEndpoint(page);
  await prepareSweep(page, VARIANTS[0].path);
  await page.locator("[data-offer-inquiry] [data-form-submit]").click();
  await expect(
    page.locator('[data-offer-inquiry] [data-f="contact"]'),
  ).toHaveClass(/err/);
  // fokus wraca z pola na dokument — obrys fokusu nie jest częścią stanu
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.addStyleTag({ content: HIDE_BARS });
  await settleImages(page);
  await settle(page, 300);
  await expect(page.locator("[data-offer-contact]")).toHaveScreenshot(
    "oferta-form-errors.png",
  );
  expect(endpoint.count()).toBe(0);
});

test("oferta: potwierdzenie zapytania vs baseline", async ({ page }) => {
  await stubEndpoint(page);
  await stubTurnstile(page);
  await prepareSweep(page, VARIANTS[0].path);
  await page.locator("#of-name").fill("Ewa Zielińska");
  await page.locator("#of-phone").fill("600 100 200");
  await page.locator("[data-offer-inquiry] [data-form-submit]").click();
  const done = page.locator("[data-offer-inquiry] [data-form-done]");
  await expect(done).toBeVisible();
  await expect(done.locator("a[data-tel]")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  // kursor zostaje na miejscu przycisku wysyłki — bez hover na zrzucie
  await page.mouse.move(0, 0);
  await page.addStyleTag({ content: HIDE_BARS });
  await settleImages(page);
  await settle(page, 300);
  await expect(page.locator("[data-offer-contact]")).toHaveScreenshot(
    "oferta-form-done.png",
  );
});
