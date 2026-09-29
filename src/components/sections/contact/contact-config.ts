// Formularze — stałe konfiguracyjne. STAN Etapu 0: mechanika
// odziedziczona z szablonu; pola, komunikaty i klucze wchodzą w Etapie 5.
import { DESKTOP_MIN_PX } from "../../../lib/site-config";

/** Próg desktop/mobile — breakpoint projektu. Trzymaj W PARZE z `@media`
 *  w sekcjach: CSS nie zaimportuje stałej. Importują ją testy e2e (nie
 *  hardkodują progu). */
export const CONTACT_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

/** Pages Function w tym repo (functions/api/kontakt.ts). */
export const CONTACT_ENDPOINT = "/api/kontakt";

/** Klucz PUBLICZNY widgetu Turnstile — wchodzi do HTML-u produkcji, więc
 *  jego miejsce jest w repo. PUSTY do czasu założenia widgetu (Etap 5);
 *  pusty klucz zawodzi głośno, zamiast przepuszczać zgłoszenia. Sekret
 *  tego samego widgetu żyje WYŁĄCZNIE w zmiennych projektu Pages jako
 *  TURNSTILE_SECRET_KEY i weryfikuje token po stronie
 *  functions/api/kontakt.ts. */
export const TURNSTILE_SITE_KEY = "";
export const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Ile czekamy na token — challenge w trybie managed może wymagać
 *  interakcji użytkownika, więc limit musi być ludzki, nie sieciowy. */
export const TURNSTILE_TIMEOUT_MS = 90_000;
