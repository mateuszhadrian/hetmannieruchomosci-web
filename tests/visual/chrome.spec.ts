// Chrome globalny — regres wizualny elementów wspólnych niezależnie od
// widoków: pasek `[data-nav]` (desktop, wariant stały na /kontakt/),
// OTWARTY bottom sheet menu (mobile) — stan, którego zrzut strony nie
// łapie — oraz od Etapu 4.1: pasek na „/” w obu stanach wariantu
// przemalowywanego scrollem (nad hero / po przewinięciu o wysokość okna)
// i stopka. Determinizm: freeze.css (prepareSweep) zeruje przejścia,
// więc sheet otwiera się od razu w stanie końcowym; przemalowanie paska
// liczy pętla rAF ze scrolla (deterministyczne przy ustalonej pozycji).
// Zrzut paska na „/" niesie TREŚĆ pod przezroczystym paskiem — od 4.4
// to hero strony głównej, więc film hero jest odcięty (`blockHeroVideo`:
// zostaje zdjęcie; klatka filmu to loteria).
// Baseline'y: Etap 3 (szkielet), Etap 4.1 (wygląd docelowy chrome'u),
// Etap 4.4 (`chrome-home-*` nad docelowym hero).
import { expect, test } from "@playwright/test";
import { CONTACT_PATH, HOME_PATH } from "../../src/lib/routes";
import { usePreviewGuard } from "../helpers/guards";
import { scrollPageTo, settle } from "../helpers/scroll";
import { blockHeroVideo, prepareSweep } from "../helpers/visual";

usePreviewGuard();

test("chrome: pasek desktop vs baseline", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "pasek desktop — profile desktop");
  await prepareSweep(page, CONTACT_PATH);
  await expect(page.locator("[data-nav]")).toHaveScreenshot("chrome-bar.png");
});

test("chrome: otwarty bottom sheet menu vs baseline", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "bottom sheet — profile mobile");
  await prepareSweep(page, CONTACT_PATH);
  await page.locator("[data-burger]").click();
  await expect(page.locator("#nav-sheet")).toHaveClass(/is-open/);
  // Slot tel w stopce sheeta wypełnia JS — gotoReady czekał na
  // networkidle, więc numer jest już złożony, nie pusty.
  await settle(page);
  await expect(page).toHaveScreenshot("chrome-sheet.png");
});

test("chrome: pasek na „/” nad hero (przezroczysty) vs baseline", async ({
  page,
}) => {
  await blockHeroVideo(page);
  await prepareSweep(page, HOME_PATH);
  await expect(page.locator("[data-nav]")).toHaveScreenshot(
    "chrome-home-top.png",
  );
});

test("chrome: pasek na „/” po przewinięciu (pełny) vs baseline", async ({
  page,
}) => {
  await blockHeroVideo(page);
  await prepareSweep(page, HOME_PATH);
  const vh = await page.evaluate(() => window.innerHeight);
  await scrollPageTo(page, vh);
  await settle(page, 400);
  await expect(page.locator("[data-nav]")).toHaveAttribute("data-solid", "");
  await expect(page.locator("[data-nav]")).toHaveScreenshot(
    "chrome-home-solid.png",
  );
});

test("chrome: stopka vs baseline", async ({ page }) => {
  await prepareSweep(page, CONTACT_PATH);
  // Zrzut ELEMENTU wyższego niż okno Playwright zszywa z kilku przewinięć,
  // a pasek fixed wjeżdżałby na górę stopki (na mobile stopka jest
  // wyższa niż viewport). Pasek ma własne zrzuty — tu go chowamy.
  await page.addStyleTag({ content: ".hdr { visibility: hidden !important }" });
  const footer = page.locator("footer");
  await footer.scrollIntoViewIfNeeded();
  await settle(page, 300);
  await expect(footer).toHaveScreenshot("chrome-footer.png");
});
