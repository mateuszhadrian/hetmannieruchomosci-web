// Widok /kontakt/ — stałe. Importują je sekcje i testy e2e; @media
// w komponentach trzymać W PARZE (CSS nie zaimportuje stałej).
import { BUSINESS } from "../../../lib/jsonld";
import { CONTACT_MAP_MIN_PX, DESKTOP_MIN_PX } from "../../../lib/site-config";

/** Próg układu jedno- / dwukolumnowego = breakpoint projektu. */
export const CONTACT_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

/** Próg podmiany pliku mapy w `<picture>` (mobile ↔ desktop) — niżej niż
 *  breakpoint układu, żeby szeroki telefon dostał plik desktopowy. */
export const CONTACT_MAP_SWAP_PX = CONTACT_MAP_MIN_PX;

/** Link do map po ADRESIE biura — ten sam cel co w stopce; zwykła kotwica,
 *  nic się nie ładuje przed kliknięciem (zero żądań do podmiotów trzecich
 *  przy wejściu). */
export const OFFICE_MAPS_URL =
  "https://maps.google.com/?q=" +
  encodeURIComponent(
    `${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.locality}`,
  );
