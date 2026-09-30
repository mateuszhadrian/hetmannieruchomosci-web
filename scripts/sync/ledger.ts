// Rejestr adresów (`data/url-ledger.json`, D31): numer oferty → wszystkie
// ścieżki, pod którymi oferta była kiedykolwiek opublikowana. Rejestr
// TYLKO DOPISUJE — zmiana lokalizacji (nowy adres) zostawia stary adres
// w rejestrze, żeby generator `_redirects` mógł go przekierować.
import type { UrlLedger } from "../../src/lib/offers/schema";
import { offerPath, type OfferAddressable } from "../../src/lib/offers/urls";

export type LedgerOffer = OfferAddressable;

/** Nowy rejestr = stary + bieżące adresy (bez duplikatów, klucze
 *  posortowane — stabilny diff w gicie). Wejście nie jest mutowane. */
export function updateLedger(
  previous: UrlLedger,
  offers: readonly LedgerOffer[],
): UrlLedger {
  const next: Record<string, string[]> = {};
  for (const [number, paths] of Object.entries(previous)) {
    next[number] = [...paths];
  }
  for (const offer of offers) {
    const path = offerPath(offer);
    const paths = next[offer.number] ?? [];
    if (!paths.includes(path)) paths.push(path);
    next[offer.number] = paths;
  }
  return Object.fromEntries(
    Object.keys(next)
      .sort()
      .map((k) => [k, next[k]]),
  );
}

/** Aktualny adres oferty wg rejestru = ostatnia dopisana ścieżka. */
export function currentPath(
  ledger: UrlLedger,
  number: string,
): string | undefined {
  return ledger[number]?.at(-1);
}
