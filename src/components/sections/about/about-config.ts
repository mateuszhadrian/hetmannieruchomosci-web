// Widok /o-nas/ (Etap 4.5, docs/analiza-o-nas.md) — stałe. Importują je
// sekcje i testy e2e; @media w komponentach trzymać W PARZE (CSS nie
// zaimportuje stałej — reguła sections.md, kontrakt
// `expectBreakpointFlip`).
import { DESKTOP_MIN_PX, TABLET_MIN_PX } from "../../../lib/site-config";

/** Breakpoint widoku = breakpoint projektu (desktop ≥ 1025). */
export const ABOUT_DESKTOP_MIN_PX = DESKTOP_MIN_PX;
/** Poniżej tej szerokości zdjęcie hero dostaje mniejszy plik (`-m`).
 *  Pole zdjęcia na telefonie nie jest pionowe, więc osobny kadr nie jest
 *  potrzebny (analiza A11). */
export const ABOUT_HERO_SMALL_BELOW_PX = TABLET_MIN_PX;
