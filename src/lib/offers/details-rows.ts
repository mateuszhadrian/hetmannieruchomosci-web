// „Dane szczegółowe" detalu oferty (4.3) — JEDNA deklaratywna lista
// wierszy: etykieta + funkcja wartości z warunkiem. Dołożenie wiersza to
// jedna pozycja w `DETAIL_ROWS`; wiersz bez danych (`null`) znika.
// Kolejność i komplet 19 wierszy = design (`docs/analiza-oferta.md` §3.2);
// wiersze parytetu domu (powierzchnia działki, liczba pięter) i reguła
// daty („Dostępne od") wchodzą obok sąsiadów. Reguły: piętro `0` =
// parter; winda — brak danych ≠ „nie" (`undefined` → wiersz ukryty,
// `0` → „nie"); cena wg `showPrice` (SHOW_PRICE_WHEN_SOLD) i wariant
// „Zapytaj o cenę"; obniżka = poprzednia cena + Omnibus (R18).
// Bez DOM i bez `data.ts` — czysta funkcja testowana na danych
// syntetycznych (tests/unit/offers-details-rows.test.ts).
import { isFieldRelevant } from "./filters";
import {
  ASK_FOR_PRICE,
  countNoun,
  formatArea,
  formatDateShort,
  formatFloor,
  formatInt,
  formatLocation,
  formatPrice,
  formatPricePerM2,
  formatYear,
  TRANSACTION_LABEL,
  TYPE_LABEL,
} from "./format";
import { FURNISHED_LABEL, MARKET_LABEL } from "./offers-ui";
import type { ExtraKey, Offer } from "./schema";
import { showsAvailableFrom } from "./time-rules";

export interface DetailRowsContext {
  /** „teraz" builda (`BUILD_NOW`) — reguła „Dostępne od" */
  now: Date;
  /** czy pokazywać cenę (sprzedane/wynajęte wg `SHOW_PRICE_WHEN_SOLD`) */
  showPrice: boolean;
}

export interface DetailValue {
  text: string;
  /** poprzednia cena (przekreślona) przy obniżce */
  previous?: string;
  /** dopisek pod wartością (Omnibus: najniższa cena z 30 dni) */
  note?: string;
}

export const DETAIL_ROW_IDS = [
  "transaction",
  "type",
  "location",
  "area",
  "plotArea",
  "rooms",
  "floor",
  "floors",
  "year",
  "market",
  "elevator",
  "furnished",
  "balcony",
  "garage",
  "basement",
  "heating",
  "condition",
  "rent",
  "availableFrom",
  "number",
  "price",
  "pricePerM2",
] as const;
export type DetailRowId = (typeof DETAIL_ROW_IDS)[number];

export interface DetailRowDef {
  id: DetailRowId;
  label: string;
  value: (offer: Offer, ctx: DetailRowsContext) => string | DetailValue | null;
}

export interface DetailRow {
  id: DetailRowId;
  label: string;
  value: DetailValue;
}

/** Omnibus — dopisek przy obniżce. */
export const LOWEST_PRICE_NOTE = "najniższa cena z 30 dni";

type Forms = [string, string, string];
const EXTRA_FORMS: Partial<Record<ExtraKey, Forms>> = {
  balcony: ["balkon", "balkony", "balkonów"],
  loggia: ["loggia", "loggie", "loggii"],
  terrace: ["taras", "tarasy", "tarasów"],
  garage: ["garaż", "garaże", "garaży"],
  parkingUnderground: [
    "miejsce w hali garażowej",
    "miejsca w hali garażowej",
    "miejsc w hali garażowej",
  ],
  parking: ["miejsce parkingowe", "miejsca parkingowe", "miejsc parkingowych"],
  basement: ["piwnica", "piwnice", "piwnic"],
  storage: [
    "komórka lokatorska",
    "komórki lokatorskie",
    "komórek lokatorskich",
  ],
};

/** „balkon", „2 balkony, loggia" — liczniki przynależności w kolejności
 *  podanych kluczy; same zera → `null`. */
function extrasText(offer: Offer, keys: readonly ExtraKey[]): string | null {
  const parts: string[] = [];
  for (const key of keys) {
    const n = offer.extras[key];
    const forms = EXTRA_FORMS[key];
    if (!n || !forms) continue;
    parts.push(countNoun(n, ...forms));
  }
  return parts.length ? parts.join(", ") : null;
}

/** „Mieszkanie", „Dom (bliźniak)", „Lokal komercyjny (biuro)". */
export function formatTypeRow(offer: Offer): string {
  const base = TYPE_LABEL[offer.mainType];
  return offer.subType ? `${base} (${offer.subType.toLowerCase()})` : base;
}

export const DETAIL_ROWS: readonly DetailRowDef[] = [
  {
    id: "transaction",
    label: "Transakcja",
    value: (o) => TRANSACTION_LABEL[o.transaction],
  },
  { id: "type", label: "Typ", value: (o) => formatTypeRow(o) },
  {
    id: "location",
    label: "Lokalizacja",
    value: (o) => formatLocation(o.location),
  },
  { id: "area", label: "Powierzchnia", value: (o) => formatArea(o.area) },
  {
    id: "plotArea",
    label: "Powierzchnia działki",
    value: (o) =>
      o.mainType === "dom" && o.plotArea !== undefined
        ? formatArea(o.plotArea)
        : null,
  },
  {
    id: "rooms",
    label: "Pokoje",
    value: (o) =>
      isFieldRelevant(o.mainType, "rooms") && o.rooms
        ? formatInt(o.rooms)
        : null,
  },
  {
    id: "floor",
    label: "Piętro",
    value: (o) =>
      isFieldRelevant(o.mainType, "floor")
        ? formatFloor(o.floor, o.floorsInBuilding)
        : null,
  },
  {
    id: "floors",
    label: "Liczba pięter",
    value: (o) =>
      o.mainType === "dom" && o.floorsInBuilding
        ? formatInt(o.floorsInBuilding)
        : null,
  },
  {
    id: "year",
    label: "Rok budowy",
    value: (o) =>
      isFieldRelevant(o.mainType, "year") && o.buildingYear !== undefined
        ? formatYear(o.buildingYear)
        : null,
  },
  { id: "market", label: "Rynek", value: (o) => MARKET_LABEL[o.market] },
  {
    id: "elevator",
    label: "Winda",
    value: (o) => {
      if (!isFieldRelevant(o.mainType, "elevator") || o.elevators === undefined)
        return null;
      if (o.elevators === 0) return "nie";
      return o.elevators === 1 ? "tak" : `tak (${formatInt(o.elevators)})`;
    },
  },
  {
    id: "furnished",
    label: "Umeblowanie",
    value: (o) =>
      isFieldRelevant(o.mainType, "furnished") && o.furnished
        ? FURNISHED_LABEL[o.furnished]
        : null,
  },
  {
    id: "balcony",
    label: "Balkon / loggia",
    value: (o) => extrasText(o, ["balcony", "loggia", "terrace"]),
  },
  {
    id: "garage",
    label: "Garaż",
    value: (o) => extrasText(o, ["garage", "parkingUnderground", "parking"]),
  },
  {
    id: "basement",
    label: "Piwnica",
    value: (o) => extrasText(o, ["basement", "storage"]),
  },
  { id: "heating", label: "Ogrzewanie", value: (o) => o.heating ?? null },
  { id: "condition", label: "Stan", value: (o) => o.condition ?? null },
  {
    id: "rent",
    label: "Czynsz administracyjny",
    value: (o) =>
      o.rent && o.rent > 0 ? formatPrice(o.rent, "wynajem") : null,
  },
  {
    id: "availableFrom",
    label: "Dostępne od",
    value: (o, ctx) =>
      showsAvailableFrom(o.availableFrom, ctx.now)
        ? formatDateShort(o.availableFrom!)
        : null,
  },
  { id: "number", label: "Numer oferty", value: (o) => o.number },
  {
    id: "price",
    label: "Cena",
    value: (o, ctx) => {
      if (!ctx.showPrice) return null;
      if (o.price === null) return ASK_FOR_PRICE;
      const text = formatPrice(o.price, o.transaction, o.currency);
      const discount =
        o.previousPrice !== undefined && o.previousPrice > o.price;
      if (!discount) return text;
      const value: DetailValue = {
        text,
        previous: formatPrice(o.previousPrice!, o.transaction, o.currency),
      };
      if (o.lowestPrice30d !== undefined) {
        value.note = `${LOWEST_PRICE_NOTE}: ${formatPrice(o.lowestPrice30d, o.transaction, o.currency)}`;
      }
      return value;
    },
  },
  {
    id: "pricePerM2",
    label: "Cena za m²",
    value: (o, ctx) =>
      ctx.showPrice && o.price !== null
        ? formatPricePerM2(o.pricePerM2, o.transaction, o.currency)
        : null,
  },
];

/** Wiersze do renderu — w kolejności listy, bez wierszy bez danych. */
export function detailRows(offer: Offer, ctx: DetailRowsContext): DetailRow[] {
  const rows: DetailRow[] = [];
  for (const def of DETAIL_ROWS) {
    const v = def.value(offer, ctx);
    if (v === null) continue;
    rows.push({
      id: def.id,
      label: def.label,
      value: typeof v === "string" ? { text: v } : v,
    });
  }
  return rows;
}

/** Czy cena jest widoczna: aktywne/rezerwacje zawsze, sprzedane
 *  i wynajęte wg przełącznika. */
export function priceVisible(offer: Offer, showWhenSold: boolean): boolean {
  const sold = offer.status === "sprzedana" || offer.status === "wynajeta";
  return !sold || showWhenSold;
}
