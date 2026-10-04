// Widok /sprzedaj-z-nami/ (Etap 5A, docs/analiza-formularze-a.md) — stałe.
// Importują je sekcje i testy e2e; @media w komponentach trzymać W PARZE
// (CSS nie zaimportuje stałej — reguła sections.md, kontrakt
// `expectBreakpointFlip`).
import { DESKTOP_MIN_PX, TABLET_MIN_PX } from "../../../lib/site-config";

/** Breakpoint widoku = breakpoint projektu (desktop ≥ 1025). */
export const SELL_DESKTOP_MIN_PX = DESKTOP_MIN_PX;
/** Poniżej tej szerokości hero dostaje PIONOWY kadr zdjęcia (F15). */
export const SELL_HERO_TALL_BELOW_PX = TABLET_MIN_PX;
/** Wysokość hero na desktopie jako ułamek wysokości okna (design: 66 %);
 *  poniżej progu hero wypełnia całe okno. W PARZE z `--sh-r`
 *  w SellHero.astro. */
export const SELL_HERO_DESKTOP_RATIO = 0.66;
/** Kotwica formularza — cel przycisku hero i powrotu po wysyłce bez JS. */
export const SELL_FORM_ID = "formularz";
