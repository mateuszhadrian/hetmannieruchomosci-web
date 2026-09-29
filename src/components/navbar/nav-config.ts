// Breakpoint chrome'u = breakpoint projektu (src/lib/site-config.ts).
// Stałą importuje skrypt Navbara i testy e2e; ten sam próg siedzi w @media
// komponentów chrome'u oraz w :root global.css — utrzymywać W PARZE (CSS
// nie zaimportuje stałej).
import { DESKTOP_MIN_PX } from "../../lib/site-config";

export const NAV_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

// ── Stan „solid" (tło + linia pod paskiem po zjechaniu z góry strony).
/** Z hero ([data-navref]): solid od `wysokość hero - zapas`. */
export const NAV_SOLID_HERO_PAD_PX = 40;
/** Bez hero (szkielety/strony treściowe): solid zaraz po ruszeniu scrolla. */
export const NAV_SOLID_FALLBACK_PX = 8;
