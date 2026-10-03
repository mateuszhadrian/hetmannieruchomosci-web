// Detal oferty (4.3 a) — regres wizualny na ZAMROŻONYM fixture
// (useVisualFixtureGuard): cztery warianty pełnej strony — mieszkanie
// (aktywna, film + spacer, obniżka), dom (działka, liczba pięter, zdjęcia
// pionowe), działka (bez ulicy, sprzedana, 22 zdjęcia) i lokal
// (rezerwacja, „Zapytaj o cenę", parter). Determinizm: freeze.css +
// settleImages (prepareSweep); zdjęcia i mapa lokalne z dist/media.
// Opis zwinięty (stan po JS), kotwice z pierwszą aktywną.
import { expect, test } from "@playwright/test";
import { offerDetailPath } from "../../src/lib/routes";
import { useVisualFixtureGuard } from "../helpers/guards";
import { prepareSweep } from "../helpers/visual";

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
