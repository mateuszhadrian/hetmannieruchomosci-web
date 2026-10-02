// Słowniki wartości oferty (typ, transakcja, rynek, status, umeblowanie…)
// i ich typy — moduł BEZ zależności, bo importuje go także kod kliencki
// (wyspa wyszukiwarki 4.2 b). `schema.ts` buduje z nich `z.enum(...)`
// i re-eksportuje; sync i strona mogą importować z obu miejsc.
export const MAIN_TYPES = [
  "mieszkanie",
  "dom",
  "dzialka",
  "komercyjny",
] as const;
export const TRANSACTIONS = ["sprzedaz", "wynajem"] as const;
export const MARKETS = ["pierwotny", "wtorny"] as const;
export const OFFER_STATUSES = [
  "aktywna",
  "rezerwacja",
  "sprzedana",
  "wynajeta",
] as const;
export const FURNISHED = ["tak", "nie", "moze", "czesciowo"] as const;
export const CURRENCIES = ["PLN", "EUR", "USD"] as const;
export const PHOTO_KINDS = ["photo", "plan"] as const;
export const STREET_TYPES = ["ul.", "os."] as const;
export const EXPOSURES = ["N", "E", "S", "W"] as const;
export const METERS = ["prad", "cieplo", "woda", "gaz"] as const;
export const EXTRA_KEYS = [
  "balcony",
  "loggia",
  "terrace",
  "basement",
  "attic",
  "storage",
  "parking",
  "parkingUnderground",
  "garage",
  "garden",
  "entresol",
] as const;

export type MainType = (typeof MAIN_TYPES)[number];
export type Transaction = (typeof TRANSACTIONS)[number];
export type Market = (typeof MARKETS)[number];
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export type Furnished = (typeof FURNISHED)[number];
export type PhotoKind = (typeof PHOTO_KINDS)[number];
export type ExtraKey = (typeof EXTRA_KEYS)[number];
