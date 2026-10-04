// Przełączniki i stałe projektu w JEDNYM miejscu. Wartości domyślne
// obowiązują do czasu odpowiedzi klientki albo decyzji Mateusza — zmiana
// przełącznika nie wymaga zmian w architekturze, tylko przebudowy strony.
// Uzasadnienia i pochodzenie wartości: docs/kb (part3 §11.5) oraz
// docs/plan (krok 0.3) — dokumenty lokalne, poza repo.
//
// Ten moduł NIE zna telefonu ani adresów e-mail (kontrakt antyscrapingowy
// — jedynym miejscem jest src/lib/contact-details.ts).

// ── Progi układu ────────────────────────────────────────────────────────
/** Breakpoint projektu: desktop ≥ 1025 px. Tablet 1024 px dostaje układ
 *  tabletowy. @media w komponentach trzymać W PARZE z tą stałą (CSS jej
 *  nie zaimportuje) — pilnuje kontrakt `expectBreakpointFlip`. */
export const DESKTOP_MIN_PX = 1025;
/** Drugi próg: telefon < 768 px ≤ tablet. */
export const TABLET_MIN_PX = 768;
/** Podmiana mapy kontaktu mobile ↔ desktop w `<picture>`. */
export const CONTACT_MAP_MIN_PX = 600;

// ── Widoczność podstron ─────────────────────────────────────────────────
/** Podstrona „Praca". Przestawia Mateusz na prośbę klientki. Wyłączona:
 *  pozycja znika z menu i stopki, strona wypada z sitemapy i dostaje
 *  `noindex`, zamiast formularza pokazuje krótką informację z linkiem do
 *  kontaktu, a funkcja formularzy odrzuca `form=praca`. Adres zostaje
 *  (stare linki nie kończą się 404). */
export const SHOW_PRACA: boolean = true;

// ── Oferty: prezentacja ─────────────────────────────────────────────────
/** Mapa przy ofercie: marker dokładny albo okrąg przybliżony. */
export const MAP_MARKER: "exact" | "circle" = "exact";
/** Czy oferty sprzedane i wynajęte pokazują cenę. */
export const SHOW_PRICE_WHEN_SOLD: boolean = true;
/** Czy tagi z CRM są widoczne na stronie. */
export const SHOW_TAGS: boolean = false;
/** Mapa interaktywna po kliknięciu (dodatkowy odbiorca danych w polityce). */
export const INTERACTIVE_MAP: boolean = false;
/** Pole, po którym sortuje „najnowsze". */
export const SORT_NEWEST_BY: "addedAt" | "activatedAt" = "addedAt";
/** Ile dni od dodania oferta nosi plakietkę „Nowość". */
export const NEW_BADGE_DAYS = 14;
/** Domyślny widok listy ofert na desktopie (przełącznik siatka/lista,
 *  4.2 c, R29): design = siatka; obecna strona klientki = lista. Stan
 *  nietrwały — każde wejście zaczyna od tej wartości. */
export const OFFERS_LIST_VIEW: "grid" | "list" = "grid";

// ── Agent ───────────────────────────────────────────────────────────────
/** Jedyny agent — stała, bo źródło danych nie wiąże oferty z opiekunem.
 *  Telefon i e-mail karty agenta idą przez sloty antyscrapingowe
 *  (`a[data-tel]`, `a[data-mail="joanna"]`). */
export const AGENT = {
  id: "joanna",
  name: "Joanna Hetman",
  initials: "JH",
  mailSlot: "joanna",
  /** rola i numer licencji — karta agenta detalu (4.3); stałe, jak reszta */
  role: "Pośrednik w obrocie nieruchomościami",
  licenseNo: "24178",
} as const;

// ── Detal oferty (4.3) ──────────────────────────────────────────────────
/** Próg zwijania opisu („Czytaj więcej"): opis krótszy niż ta wysokość
 *  nie dostaje przycisku. Mobile / desktop (W PARZE z `DESKTOP_MIN_PX`). */
export const OFFER_DESCRIPTION_COLLAPSE_PX = { mobile: 380, desktop: 420 };
/** Ile miniatur galerii ma `src` od razu; reszta dostaje `data-src`
 *  i dogrywa się, gdy wjeżdża w pasek (natywne `lazy` w poziomym pasku
 *  ładowało wszystkie). */
export const OFFER_THUMBS_EAGER = 6;
/** Ile zdjęć (poza pierwszym) trafia na wydruk / do JSON-LD `image`. */
export const OFFER_PRINT_PHOTOS = 6;
export const OFFER_JSONLD_IMAGES = 5;

// ── Media ───────────────────────────────────────────────────────────────
/** Host zdjęć ofert (R2 + transformacje obrazów), adres ABSOLUTNY bez
 *  końcowego ukośnika — jedna stała (Z2): do Etapu 8 host tymczasowy,
 *  potem domena klientki. Pusty ciąg = media niepodłączone (adresy
 *  względne, build nie pada). */
export const MEDIA_BASE: string = "https://hetman-media.hadrianm.pl";

// ── Sync ────────────────────────────────────────────────────────────────
/** Reguła widoczności oferty (Z9). `status-and-export` = status „aktywna
 *  publikacja" ORAZ włączony eksport (dziś równoważne, korelacja 100 %);
 *  `status-only` — gdyby pole eksportu nie przetrwało rezygnacji
 *  z poprzedniego serwisu. Przestawia Mateusz po odpowiedzi dostawcy CRM. */
export const VISIBILITY_RULE: "status-and-export" | "status-only" =
  "status-and-export";
