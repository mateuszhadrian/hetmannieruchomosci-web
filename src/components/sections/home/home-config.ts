// Konfiguracja strony głównej (Etap 4.4, docs/analiza-home.md). Stałe
// importują komponenty, moduł hero (home-hero.ts) ORAZ testy e2e; @media
// w komponentach trzymać W PARZE (CSS nie zaimportuje stałej — reguła
// sections.md, kontrakt `expectBreakpointFlip`).
import { DESKTOP_MIN_PX, TABLET_MIN_PX } from "../../../lib/site-config";

/** Breakpoint strony głównej = breakpoint projektu (desktop ≥ 1025). */
export const HOME_DESKTOP_MIN_PX = DESKTOP_MIN_PX;
/** Poniżej tej szerokości hero dostaje PIONOWY kadr plakatu (H17). */
export const HOME_POSTER_TALL_BELOW_PX = TABLET_MIN_PX;

/** Liczba kafli ofert w sekcji 02 (design: 3; przy mniejszej liczbie
 *  ofert aktywnych — tyle, ile jest; przy zerze sekcja bez siatki). */
export const HOME_OFFERS_MAX = 3;

// ── Hero: zoom warstwy obrazu i gaśnięcie nagłówka przy scrollu (H10) ──
/** Przyrost skali warstwy obrazu po przewinięciu całego hero
 *  (`scale = 1 + ZOOM × postęp`; design site.js §9 liczy 0,30). */
export const HOME_HERO_ZOOM = 0.3;
/** O ile gaśnie `h1`, gdy dojedzie do górnej krawędzi okna (1 → 0,3). */
export const HOME_HERO_FADE = 0.7;
/** Dociąganie wartości w pętli rAF (ułamek dystansu na klatkę 60 Hz) —
 *  skok pozycji scrolla (zwijany pasek adresu) nie daje pyknięcia. */
export const HOME_HERO_LERP = 0.2;

// ── Hero: film → zdjęcie (H2, H3) ──
/** Ostatnie sekundy materiału, w których film zwalnia. */
export const HOME_VIDEO_TAIL_S = 1.5;
/** Tempo odtwarzania na samym końcu (1 → 0,2×). */
export const HOME_VIDEO_END_RATE = 0.2;
