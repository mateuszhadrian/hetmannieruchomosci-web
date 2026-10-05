// Parametry i propsy tras ofert dla `getStaticPaths()` — w module TS, bo
// logika jest testowalna, a frontmatter Astro zostaje trywialny.
// DWIE trasy, żeby każdy widok ładował wyłącznie własne arkusze (Astro
// linkuje CSS per plik trasy, nie per gałąź renderowania):
//   src/pages/oferty/[...path].astro                    — listy
//   src/pages/oferty/[kind]/[location]/[number].astro   — detale
import type { Offer } from "./schema";
import {
  listPath,
  offerKindSegment,
  offerRoutes,
  OFFERS_PATH,
  TRANSACTION_SLUG,
  TYPE_SLUG,
} from "./urls";

export interface OfferListStaticPath {
  params: { path: string };
  props: { offers: Offer[] };
}

export interface OfferDetailStaticPath {
  params: { kind: string; location: string; number: string };
  props: { offer: Offer };
}

/** `/oferty/a/b/` → `a/b` (parametr rest bez prefiksu i ukośników). */
export function restParam(path: string): string {
  return path.slice(OFFERS_PATH.length).replace(/\/$/, "");
}

/** Listy typ × transakcja [× lokalizacja] — wyłącznie z ≥ 1 ofertą. */
export function offerListStaticPaths(
  offers: readonly Offer[],
): OfferListStaticPath[] {
  return offerRoutes(offers).lists.map((path) => ({
    params: { path: restParam(path) },
    props: {
      offers: offers.filter(
        (o) =>
          listPath(o) === path || listPath(o, { withLocation: false }) === path,
      ),
    },
  }));
}

/** Detale: segmenty adresu `offerPath(offer)` jako trzy parametry trasy
 *  (numer w adresie małymi literami — jak w `offerDetailPath`). */
export function offerDetailStaticPaths(
  offers: readonly Offer[],
): OfferDetailStaticPath[] {
  return offers.map((offer) => ({
    params: {
      kind: offerKindSegment(
        TYPE_SLUG[offer.mainType],
        TRANSACTION_SLUG[offer.transaction],
      ),
      location: offer.location.slug,
      number: offer.number.toLowerCase(),
    },
    props: { offer },
  }));
}
