// Widok /praca/ — stałe. Importują je sekcje, strona i testy e2e; @media
// w komponentach trzymać W PARZE (CSS nie zaimportuje stałej).
import { DESKTOP_MIN_PX, TABLET_MIN_PX } from "../../../lib/site-config";

/** Próg układu telefon i tablet ↔ desktop = breakpoint projektu. */
export const JOBS_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

/** Poniżej tej szerokości zdjęcie hero bierze mniejszy plik (`-m`). */
export const JOBS_HERO_SMALL_BELOW_PX = TABLET_MIN_PX;

/** Id sekcji formularza — cel powrotu po wysyłce bez JS (endpoint → 303). */
export const JOBS_FORM_ID = "formularz";

/** Id nagłówka strony — nazywa formularz (formularz nie ma własnego). */
export const JOBS_HEADING_ID = "praca-h";
