// Widok /uslugi/ (Etap 4.6, docs/analiza-uslugi.md) — stałe. Importują je
// sekcje i testy e2e; @media w komponentach trzymać W PARZE (CSS nie
// zaimportuje stałej — reguła sections.md, kontrakt
// `expectBreakpointFlip`).
import { DESKTOP_MIN_PX, TABLET_MIN_PX } from "../../../lib/site-config";

/** Breakpoint widoku = breakpoint projektu (desktop ≥ 1025). */
export const SERVICES_DESKTOP_MIN_PX = DESKTOP_MIN_PX;
/** Poniżej tej szerokości zdjęcie hero dostaje kadr o PEŁNEJ wysokości
 *  źródła (`-tall`): pole zdjęcia na telefonie jest pionowe albo zbliżone
 *  do kwadratu, więc liczy się wysokość pliku (analiza SV9). */
export const SERVICES_HERO_TALL_BELOW_PX = TABLET_MIN_PX;
/** Kotwice sekcji — cele wejść hero i linków sekcji „Usługi" strony
 *  głównej (`home-copy.ts`). Bez sufiksów gałęzi z eksportu designu. */
export const SERVICES_ANCHORS = {
  sell: "sprzedaje",
  buy: "kupuje",
  legal: "pomoc-prawna",
} as const;
