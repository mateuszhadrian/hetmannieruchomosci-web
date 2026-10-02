// Etykiety i teksty interfejsu listy ofert — jedno miejsce dla SSG
// (`OffersList.astro`), karty (`OfferCard.tsx`) i wyspy (4.2 b). Bez DOM,
// bez zależności node — moduł trafia do przeglądarki razem z wyspą.
// Etykiety typów i transakcji z `format.ts` (D16: „Lokal komercyjny").
import {
  formatArea,
  formatFloor,
  formatKind,
  formatKindPlural,
  formatOffersCount,
  formatRooms,
  formatYear,
} from "./format";
import type { OfferIndexEntry } from "./index-entry";
import { isFieldRelevant, type SortKey, type StatusGroup } from "./filters";
import type { OfferStatus } from "./schema";
import { isNewOffer } from "./time-rules";

const BRAND = "Hetman Nieruchomości";

/** Pigułki statusu (D12; M3a: termin klientki „archiwalne" w formie
 *  równoległej do „Aktywne"). */
export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  aktywna: "Aktywne",
  rezerwacja: "Rezerwacje",
  archiwalne: "Archiwalne",
};
export const STATUS_GROUP_TITLE: Record<StatusGroup, string> = {
  aktywna: "Oferty aktywne",
  rezerwacja: "Oferty zarezerwowane",
  archiwalne: "Oferty archiwalne — sprzedane i wynajęte",
};

/** Plakietka statusu na karcie; aktywna = bez plakietki. */
export const STATUS_BADGE: Partial<Record<OfferStatus, string>> = {
  rezerwacja: "Rezerwacja",
  sprzedana: "Sprzedane",
  wynajeta: "Wynajęte",
};
export const NEW_BADGE = "Nowość";

export const SORT_LABEL: Record<SortKey, string> = {
  newest: "Najnowsze",
  oldest: "Najstarsze",
  priceAsc: "Cena rosnąco",
  priceDesc: "Cena malejąco",
};

/** Teksty stanu zero wyników — parytet z obecną stroną (part2 §4.3). */
export const ZERO_RESULTS = {
  heading: "Nie znaleziono wyników spełniających kryteria wyszukiwania",
  hints: [
    "Ogranicz kryteria wyszukiwania.",
    "Poszerz zakres przeszukiwanych kryteriów (np. cenowych).",
    "Sprawdź, czy poprawnie wpisana została lokalizacja.",
  ],
} as const;

export const UI = {
  pageHeading: "Oferty",
  found: "Znaleziono",
  all: "Wszystkie",
  allOffers: "Wszystkie oferty",
  type: "Typ nieruchomości",
  transaction: "Transakcja",
  location: "Lokalizacja",
  status: "Status ofert",
  // PLACEHOLDER (U9): brzmienie z designu — stan karty bez zdjęć
  photosSoon: "Zdjęcia wkrótce",
  video: "Film",
  tour: "360°",
  photos: "zdjęć",
  // CTA pod listą — PLACEHOLDER (U9): drafty z designu
  ctaEyebrow: "Nie znalazłeś?",
  ctaHeading: "Nie ma tu tego, czego szukasz?",
  ctaHeadingAccent: "Opisz nam to.",
  ctaText:
    "Zostaw swoje kryteria w formularzu kontaktowym — odezwiemy się, gdy pojawi się pasująca oferta. Możesz też po prostu zadzwonić.",
  ctaPrimary: "Zostaw kryteria",
  ctaCall: "Zadzwoń",
} as const;

export interface ListContext {
  mainType?: OfferIndexEntry["mainType"];
  transaction?: OfferIndexEntry["transaction"];
  /** etykieta lokalizacji z adresu listy („Poznań Winogrady") */
  locationLabel?: string;
}

/** „Oferty" · „Mieszkania na sprzedaż" · „Mieszkania na sprzedaż —
 *  Poznań Winogrady". */
export function listHeading(ctx: ListContext): string {
  if (!ctx.mainType || !ctx.transaction) return UI.pageHeading;
  const kind = formatKindPlural(ctx.mainType, ctx.transaction);
  return ctx.locationLabel ? `${kind} — ${ctx.locationLabel}` : kind;
}

export function listTitle(ctx: ListContext): string {
  return `${listHeading(ctx)} — ${BRAND}`;
}

/** PLACEHOLDER (U9): szablon meta description list — szlif w Etapie 6. */
export function listDescription(ctx: ListContext, count: number): string {
  const where = ctx.locationLabel ?? "Poznaniu i okolicach";
  const what =
    ctx.mainType && ctx.transaction
      ? formatKindPlural(ctx.mainType, ctx.transaction).toLowerCase()
      : "mieszkania, domy, działki i lokale komercyjne na sprzedaż i wynajem";
  return `${capitalize(what)} — ${where}: ${formatOffersCount(count).toLowerCase()} biura ${BRAND}.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Karta ───────────────────────────────────────────────────────────────

export type FactIcon = "area" | "rooms" | "floor" | "year" | "plot";
export interface CardFact {
  icon: FactIcon;
  text: string;
}

/** Fakty karty wg macierzy pól per typ (docs/analiza-oferty.md §3):
 *  mieszkanie/lokal: m² · pokoje · piętro · rok; dom: m² · pokoje · rok ·
 *  działka; działka: m². Fakt bez danych znika. Piętro `0` = parter. */
export function cardFacts(e: OfferIndexEntry): CardFact[] {
  const t = e.mainType;
  const facts: CardFact[] = [{ icon: "area", text: formatArea(e.area) }];
  const rooms = isFieldRelevant(t, "rooms") ? formatRooms(e.rooms) : null;
  if (rooms) facts.push({ icon: "rooms", text: rooms });
  const floor = isFieldRelevant(t, "floor")
    ? formatFloor(e.floor, e.floorsInBuilding)
    : null;
  if (floor) facts.push({ icon: "floor", text: floor });
  if (isFieldRelevant(t, "year") && e.buildingYear !== undefined) {
    facts.push({ icon: "year", text: formatYear(e.buildingYear) });
  }
  if (
    isFieldRelevant(t, "plotArea") &&
    t === "dom" &&
    e.plotArea !== undefined
  ) {
    facts.push({ icon: "plot", text: `działka ${formatArea(e.plotArea)}` });
  }
  return facts;
}

/** Plakietki karty w kolejności designu: Nowość · status. `now` podaje
 *  wołający (SSG: `BUILD_NOW` z `data.ts` — jedno „teraz" projektu; wyspa:
 *  ta sama wartość przekazana z SSR) — moduł nie importuje `data.ts`, bo
 *  tamten czyta pliki i nie trafi do przeglądarki. */
export function cardBadges(e: OfferIndexEntry, now: Date): string[] {
  const badges: string[] = [];
  if (e.status === "aktywna" && isNewOffer(e.addedAt, now)) {
    badges.push(NEW_BADGE);
  }
  const status = STATUS_BADGE[e.status];
  if (status) badges.push(status);
  return badges;
}

/** Kicker karty: „Mieszkanie na sprzedaż" (R9: bez podtypu). */
export function cardKicker(e: OfferIndexEntry): string {
  return formatKind(e.mainType, e.transaction);
}
