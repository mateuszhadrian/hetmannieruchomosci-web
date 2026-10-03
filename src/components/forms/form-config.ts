// Formularze — stałe konfiguracyjne wspólne dla wszystkich formularzy
// serwisu (Etap 5A, docs/analiza-formularze-a.md). Importują je moduł
// kliencki (form-ui.ts), komponenty i testy e2e.

/** Pages Function w tym repo (functions/api/kontakt.ts) — jeden endpoint,
 *  rodzaj formularza niesie pole `form`. */
export const FORM_ENDPOINT = "/api/kontakt";

/** Klucz PUBLICZNY widgetu Turnstile — wchodzi do HTML-u produkcji, więc
 *  jego miejsce jest w repo. PUSTY do czasu założenia widgetu (krok 5.1
 *  instrukcji); pusty klucz zawodzi głośno (formularz pokazuje komunikat
 *  błędu wysyłki), zamiast przepuszczać zgłoszenia. Sekret tego samego
 *  widgetu żyje WYŁĄCZNIE w zmiennych projektu Pages jako
 *  TURNSTILE_SECRET_KEY i weryfikuje token po stronie
 *  functions/api/kontakt.ts. */
export const TURNSTILE_SITE_KEY = "";
export const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Ile czekamy na token — challenge w trybie managed może wymagać
 *  interakcji użytkownika, więc limit musi być ludzki, nie sieciowy. */
export const TURNSTILE_TIMEOUT_MS = 90_000;

/** Odstęp od stałego paska, gdy skrypt dosuwa w okno pierwsze błędne pole
 *  albo ramkę z potwierdzeniem (potwierdzenie jest niższe od formularza —
 *  bez dosunięcia użytkownik zostałby w stopce). */
export const FORM_SCROLL_GAP_PX = 16;
