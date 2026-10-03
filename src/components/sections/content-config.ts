// Konfiguracja stron treściowych. Stałe importują moduł ruchu
// (content-motion.ts) ORAZ testy e2e; @media w .astro i w content.css
// trzymać W PARZE (CSS nie zaimportuje stałej — .claude/rules/sections.md).

import { DESKTOP_MIN_PX } from "../../lib/site-config";

/** Breakpoint stron treściowych = breakpoint projektu. */
export const CONTENT_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

// ── Reveale [data-rv] (design site.js §10) ──
/** Blok odsłania się, gdy jego górna krawędź minie ten ułamek wysokości
 *  okna (design: 0,92). IntersectionObserver dostaje z tego rootMargin. */
export const RV_TRIGGER = 0.92;

// ── Parallax zdjęć [data-px] (design site.js §10) ──
/** Amplituda: obraz jedzie o ±(amt × wysokość kadru). Zapas kadru w CSS
 *  (`--px-a` w content.css: top −amt·100 %, height 100 % + 2·amt·100 %)
 *  to DOKŁADNIE ten sam ułamek — zapas ≥ ruch. Zmiana amplitudy wymaga
 *  zmiany PARY (stała tutaj + `--px-a` w content.css); pilnuje sonda
 *  układu w e2e. */
export const PX_AMT_DESKTOP = 0.1;
export const PX_AMT_MOBILE = 0.08;
