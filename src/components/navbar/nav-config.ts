// Breakpoint chrome'u = breakpoint projektu (src/lib/site-config.ts).
// Stałą importuje skrypt Navbara i testy e2e; ten sam próg siedzi w @media
// komponentów chrome'u oraz w :root global.css — utrzymywać W PARZE (CSS
// nie zaimportuje stałej).
import { DESKTOP_MIN_PX } from "../../lib/site-config";

export const NAV_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

// ── Stan „solid" (tło + linia pod paskiem po zjechaniu z góry strony).
/** Trasy stałe (szkło widoczne zawsze): solid zaraz po ruszeniu scrolla. */
export const NAV_SOLID_FALLBACK_PX = 8;

// ── Wariant strony głównej (`[data-scroll-nav]`, tylko „/"): pasek
// przezroczysty nad hero, przemalowywany POZYCJĄ SCROLLA. Kontrakt to
// PRÓG SCROLLA liczony z wysokości okna, nie selektor sekcji hero (hero
// z 4.4 jest pełnoekranowe, więc wzór z designu zostaje identyczny:
// start = 0,32 × h, koniec = h − wysokość paska).
/** Ułamek wysokości okna, od którego zaczyna się przemalowanie. */
export const NAV_HOME_FADE_START = 0.32;
/** Dociąganie wartości w pętli rAF (ułamek dystansu na klatkę) — Safari
 *  dostarcza `scroll` rzadziej, niż przewija (reguła scroll.md). */
export const NAV_HOME_LERP = 0.3;
/** Poniżej tej różnicy pętla snapuje do celu i gaśnie. */
export const NAV_HOME_EPSILON = 0.002;
