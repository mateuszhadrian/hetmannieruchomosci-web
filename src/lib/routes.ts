// Ścieżki stron hetmannieruchomosci.com (PL-only) — jedno źródło prawdy dla
// Navbara, stopki, sekcji, plików w src/pages i testów. Osiem tras
// statycznych + strona 404.
export const HOME_PATH = "/";
export const OFFERS_PATH = "/oferty/";
export const SELL_PATH = "/sprzedaj-z-nami/";
export const ABOUT_PATH = "/o-nas/";
export const SERVICES_PATH = "/uslugi/";
export const JOBS_PATH = "/praca/";
export const CONTACT_PATH = "/kontakt/";
export const POLICY_PATH = "/polityka-prywatnosci/";

/** Komplet tras statycznych — kolejność jak w menu, polityka na końcu. */
export const STATIC_PATHS = [
  HOME_PATH,
  OFFERS_PATH,
  SELL_PATH,
  ABOUT_PATH,
  SERVICES_PATH,
  JOBS_PATH,
  CONTACT_PATH,
  POLICY_PATH,
] as const;

// ── Trasy ofert (wzorzec adresów) ───────────────────────────────────────
//   /oferty/{typ}-na-{transakcja}/                        lista
//   /oferty/{typ}-na-{transakcja}/{lokalizacja}/          lista
//   /oferty/{typ}-na-{transakcja}/{lokalizacja}/{numer}/  detal
//   /oferty/index.json, /oferty/index-text.json           indeks wyszukiwarki
// STAN Etapu 0: istnieje tylko /oferty/ (szkielet). Trasy dynamiczne
// wchodzą w wersji szkieletowej w Etapie 2, widoki w Etapie 4.

export const OFFER_TYPE_SLUGS = [
  "mieszkanie",
  "dom",
  "dzialka",
  "lokal-komercyjny",
] as const;
export type OfferTypeSlug = (typeof OFFER_TYPE_SLUGS)[number];

export const OFFER_TRANSACTION_SLUGS = ["sprzedaz", "wynajem"] as const;
export type OfferTransactionSlug = (typeof OFFER_TRANSACTION_SLUGS)[number];

/** Pierwszy segment adresu ofert, np. `mieszkanie-na-sprzedaz`. */
export const offerKindSegment = (
  type: OfferTypeSlug,
  transaction: OfferTransactionSlug,
): string => `${type}-na-${transaction}`;

/** Lista ofert: typ × transakcja, opcjonalnie zawężona do lokalizacji. */
export function offerListPath(
  type: OfferTypeSlug,
  transaction: OfferTransactionSlug,
  locationSlug?: string,
): string {
  const base = `${OFFERS_PATH}${offerKindSegment(type, transaction)}/`;
  return locationSlug ? `${base}${locationSlug}/` : base;
}

/** Detal oferty. `number` = numer oferty z CRM; w adresie małymi literami. */
export function offerDetailPath(
  type: OfferTypeSlug,
  transaction: OfferTransactionSlug,
  locationSlug: string,
  number: string,
): string {
  return `${offerListPath(type, transaction, locationSlug)}${number.toLowerCase()}/`;
}
