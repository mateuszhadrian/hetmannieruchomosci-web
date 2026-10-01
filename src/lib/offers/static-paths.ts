// Parametry i propsy tras ofert dla `getStaticPaths()` strony
// `src/pages/oferty/[...path].astro` — w module TS, bo logika jest
// testowalna, a frontmatter Astro zostaje trywialny.
import type { Offer } from "./schema";
import { listPath, offerPath, offerRoutes, OFFERS_PATH } from "./urls";

export type OfferRouteProps =
  | { kind: "list"; offers: Offer[] }
  | { kind: "detail"; offer: Offer };

export interface OfferStaticPath {
  params: { path: string };
  props: OfferRouteProps;
}

/** `/oferty/a/b/` → `a/b` (parametr rest bez prefiksu i ukośników). */
export function restParam(path: string): string {
  return path.slice(OFFERS_PATH.length).replace(/\/$/, "");
}

export function offerStaticPaths(offers: readonly Offer[]): OfferStaticPath[] {
  const routes = offerRoutes(offers);
  const lists: OfferStaticPath[] = routes.lists.map((path) => ({
    params: { path: restParam(path) },
    props: {
      kind: "list",
      offers: offers.filter(
        (o) =>
          listPath(o) === path || listPath(o, { withLocation: false }) === path,
      ),
    },
  }));
  const details: OfferStaticPath[] = offers.map((offer) => ({
    params: { path: restParam(offerPath(offer)) },
    props: { kind: "detail", offer },
  }));
  return [...lists, ...details];
}
