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
/** Podstrona „Praca" w menu i stopce. Przestawia Mateusz na prośbę
 *  klientki. STAN Etapu 0: steruje pozycjami nawigacji; trasa buduje się
 *  zawsze. */
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

// ── Agent ───────────────────────────────────────────────────────────────
/** Jedyny agent — stała, bo źródło danych nie wiąże oferty z opiekunem.
 *  Telefon i e-mail karty agenta idą przez sloty antyscrapingowe
 *  (`a[data-tel]`, `a[data-mail="joanna"]`). */
export const AGENT = {
  id: "joanna",
  name: "Joanna Hetman",
  initials: "JH",
  mailSlot: "joanna",
} as const;

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
