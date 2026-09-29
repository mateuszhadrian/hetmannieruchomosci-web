// Konfiguracja stron treściowych. Stałe importują moduł ruchu
// (content-motion.ts) ORAZ testy e2e; @media w .astro trzymać W PARZE
// (CSS nie zaimportuje stałej — .claude/rules/sections.md).

import { DESKTOP_MIN_PX } from "../../lib/site-config";

/** Breakpoint stron treściowych = breakpoint projektu. */
export const CONTENT_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

// ── Stałe ruchu odziedziczone z szablonu (konsument: content-motion.ts).
// Wartości do weryfikacji z designem przy porcie reveali w Etapie 4.
/** Tempo tekstury tła względem treści (dryf tła, desktop). */
export const PAPER_BG_SPEED = 0.85;
/** Maksymalne wychylenie elementów [data-plxr] (px). */
export const PLXR_MAX_PX = 15;
/** Amplituda zdjęć [data-plx]: ruch ±(amt/2)·wysokość kadru, a zapas kadru
 *  w CSS to top −(amt/2)·100 % / height (100+amt·100) % — zapas ≥ ruch.
 *  Zmiana amplitudy wymaga zmiany PARY (top/height w komponencie sekcji). */
export const PLX_AMT = 0.18;
