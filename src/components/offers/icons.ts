// Ikony listy ofert z eksportu designu (`oferty.html`): wszystkie
// `viewBox 0 0 24 24`, obrys `currentColor` 1,75, zaokrąglone końce;
// rozmiar steruje `font-size` rodzica (`width/height="1em"`). Jedna
// tablica ścieżek dla karty (Preact) i komponentów `.astro`.
export const ICON_VIEWBOX = "0 0 24 24";

export const ICONS = {
  /** pinezka — lokalizacja na karcie */
  pin: "M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z M12 11m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0",
  /** narożniki kadru — powierzchnia */
  area: "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5",
  /** drzwi — pokoje */
  rooms: "M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17 M3 21h18 M14 12h.01",
  /** schodki — piętro */
  floor: "M3 20h4v-4h4v-4h4V8h4V4",
  /** kalendarz — rok budowy */
  year: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M8 3v4 M16 3v4 M4 11h16",
  /** warstwy — działka */
  plot: "M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5",
  /** aparat — liczba zdjęć */
  camera:
    "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 13.5m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0",
  /** play (wypełniony) — film */
  play: "M8 5v14l11-7z",
  /** budynek — stan bez zdjęć */
  building:
    "M4 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16 M16 9h3a1 1 0 0 1 1 1v11 M3 21h18 M8 8h2 M8 12h2 M8 16h2 M12 8h2 M12 12h2 M11 21v-4h3v4",
  /** X — zamknięcie, usunięcie chipa */
  close: "M6 6l12 12M18 6L6 18",
  /** ptaszek — wybrana opcja */
  check: "M5 12l5 5L20 7",
  chevronDown: "M6 9l6 6 6-6",
  chevronLeft: "M15 5l-7 7 7 7",
  chevronRight: "M9 5l7 7-7 7",
  /** dwie strzałki — sortowanie */
  sort: "M7 4v16 M4 17l3 3 3-3 M17 20V4 M14 7l3-3 3 3",
  /** lupa — pole lokalizacji */
  search: "M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M20 20l-4-4",
  /** siatka — przełącznik widoku */
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  /** lista — przełącznik widoku */
  list: "M4 5h16v5H4z M4 14h16v5H4z",
  /** suwaki — przycisk „Filtruj" */
  filters:
    "M4 7h16 M4 12h16 M4 17h16 M8 7m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M15 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M10 17m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0",
} as const;

export type IconName = keyof typeof ICONS;

/** Ikony rysowane wypełnieniem, nie obrysem. */
export const FILLED_ICONS: ReadonlySet<IconName> = new Set(["play"]);
