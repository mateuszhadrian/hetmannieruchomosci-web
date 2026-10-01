// Adresy ofert. Wzorzec i funkcje segmentów żyją w `src/lib/routes.ts`
// (jedno źródło prawdy dla całej nawigacji) — tu są re-eksportowane
// i opakowane w wersje przyjmujące obiekt oferty.
//   /oferty/{typ}-na-{transakcja}/{lokalizacja}/{numer}/
import {
  OFFERS_PATH,
  OFFER_TRANSACTION_SLUGS,
  OFFER_TYPE_SLUGS,
  offerDetailPath,
  offerKindSegment,
  offerListPath,
  type OfferTransactionSlug,
  type OfferTypeSlug,
} from "../routes";
import type { MainType, Transaction } from "./schema";

export {
  OFFERS_PATH,
  OFFER_TRANSACTION_SLUGS,
  OFFER_TYPE_SLUGS,
  offerDetailPath,
  offerKindSegment,
  offerListPath,
};
export type { OfferTransactionSlug, OfferTypeSlug };

/** `mainType` schematu → segment adresu (`komercyjny` → `lokal-komercyjny`). */
export const TYPE_SLUG: Record<MainType, OfferTypeSlug> = {
  mieszkanie: "mieszkanie",
  dom: "dom",
  dzialka: "dzialka",
  komercyjny: "lokal-komercyjny",
};

/** `transaction` schematu → segment adresu (dziś tożsame). */
export const TRANSACTION_SLUG: Record<Transaction, OfferTransactionSlug> = {
  sprzedaz: "sprzedaz",
  wynajem: "wynajem",
};

/** Minimalny wycinek oferty potrzebny do zbudowania adresu. */
export interface OfferAddressable {
  number: string;
  mainType: MainType;
  transaction: Transaction;
  location: { slug: string };
}

/** Adres detalu: `/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/sw486462/`. */
export function offerPath(offer: OfferAddressable): string {
  return offerDetailPath(
    TYPE_SLUG[offer.mainType],
    TRANSACTION_SLUG[offer.transaction],
    offer.location.slug,
    offer.number,
  );
}

/** Adres listy, na której oferta występuje (typ × transakcja × lokalizacja);
 *  `withLocation: false` → lista bez lokalizacji. */
export function listPath(
  offer: OfferAddressable,
  { withLocation = true }: { withLocation?: boolean } = {},
): string {
  return offerListPath(
    TYPE_SLUG[offer.mainType],
    TRANSACTION_SLUG[offer.transaction],
    withLocation ? offer.location.slug : undefined,
  );
}

/** Krótkie adresy `/{NUMER}` (D31, part3 §8.4) — dwie pisownie. */
export function shortPaths(number: string): [string, string] {
  return [`/${number.toUpperCase()}`, `/${number.toLowerCase()}`];
}

export interface OfferRoutes {
  /** listy typ×transakcja oraz typ×transakcja×lokalizacja (tylko z ≥ 1
   *  ofertą), posortowane */
  lists: string[];
  /** detale w kolejności ofert */
  details: string[];
}

/** Komplet adresów ofert do zbudowania (SSG) z danych — używany przez
 *  stronę (`getStaticPaths`) i testy (sitemapa, smoke). */
export function offerRoutes(offers: readonly OfferAddressable[]): OfferRoutes {
  const lists = new Set<string>();
  for (const offer of offers) {
    lists.add(listPath(offer, { withLocation: false }));
    lists.add(listPath(offer));
  }
  return {
    lists: [...lists].sort(),
    details: offers.map((o) => offerPath(o)),
  };
}
