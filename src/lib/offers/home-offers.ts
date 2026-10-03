// Dobór ofert na stronę główną (sekcja 02, docs/analiza-home.md Q3):
// wyłącznie oferty `aktywna`, najnowsze wg `SORT_NEWEST_BY` (czyta je
// `sortEntries`), najwyżej `max`. Mniej aktywnych niż `max` → tyle, ile
// jest, BEZ dopełniania innymi statusami; zero → pusta lista (sekcja
// zostaje bez siatki kafli). Ta sama reguła co „najnowsze oferty"
// na stronie 404.
import { sortEntries } from "./filters";
import { toIndexEntry, type OfferIndexEntry } from "./index-entry";
import type { Offer } from "./schema";

export function pickHomeOffers(
  offers: readonly Offer[],
  max: number,
): OfferIndexEntry[] {
  return sortEntries(
    offers.filter((o) => o.status === "aktywna").map(toIndexEntry),
    "newest",
  ).slice(0, Math.max(0, max));
}
