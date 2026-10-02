// Formatowanie wartości oferty do tekstu (ceny, m², piętra, liczebniki).
// Kod przeniesiony z analizy danych CRM; formaty wg designu:
// `649 000 zł`, `2 500 zł / mies.`, `13 022 zł/m²`, `46 zł/m²/mies.`.
// Separator tysięcy = spacja niełamliwa.
import type { MainType, Transaction } from "./schema";

const NBSP = " ";

/** 1 oferta / 2 oferty / 5 ofert — odmiana wg reguły 2–4 (poza 12–14). */
export function plural(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const last = abs % 10;
  const last2 = abs % 100;
  if (last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14)) return few;
  return many;
}

export function countLabel(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  return `${formatInt(n)}${NBSP}${plural(n, one, few, many)}`;
}

/** 1669340 → „1 669 340" (spacja niełamliwa). */
export function formatInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 49.84 → „49,84", 65 → „65", 54.2 → „54,2" (max 2 miejsca, bez zer). */
export function formatDecimal(n: number, maxFraction = 2): string {
  const fixed = n.toFixed(maxFraction).replace(/\.?0+$/, "");
  const [int, frac] = fixed.split(".");
  return frac ? `${formatInt(Number(int))},${frac}` : formatInt(Number(int));
}

export function formatArea(m2: number): string {
  return `${formatDecimal(m2)}${NBSP}m²`;
}

export const ASK_FOR_PRICE = "Zapytaj o cenę";

export function formatPrice(
  price: number | null,
  transaction: Transaction,
  currency = "PLN",
): string {
  if (price === null || price <= 0) return ASK_FOR_PRICE;
  const unit = currency === "PLN" ? "zł" : currency;
  const base = `${formatInt(price)}${NBSP}${unit}`;
  return transaction === "wynajem" ? `${base}${NBSP}/${NBSP}mies.` : base;
}

export function formatPricePerM2(
  value: number | null,
  transaction: Transaction,
  currency = "PLN",
): string | null {
  if (value === null || value <= 0) return null;
  const unit = currency === "PLN" ? "zł" : currency;
  const base = `${formatInt(value)}${NBSP}${unit}/m²`;
  return transaction === "wynajem" ? `${base}/mies.` : base;
}

/** floor: 0 = parter, ujemne = suterena, n = n. piętro. Wartość `0` jest
 *  daną, nie brakiem. */
export function formatFloor(
  floor: number | undefined,
  floorsInBuilding?: number,
): string | null {
  if (floor === undefined || floor === null) return null;
  let label: string;
  if (floor < 0) label = "suterena";
  else if (floor === 0) label = "parter";
  else label = `${floor}.${NBSP}piętro`;
  if (
    floorsInBuilding !== undefined &&
    floorsInBuilding !== null &&
    floorsInBuilding > 0
  ) {
    label += `${NBSP}z${NBSP}${floorsInBuilding}`;
  }
  return label;
}

export function formatRooms(rooms: number | undefined): string | null {
  if (!rooms) return null;
  return countLabel(rooms, "pokój", "pokoje", "pokoi");
}

export function formatPhotosCount(n: number): string {
  return countLabel(n, "zdjęcie", "zdjęcia", "zdjęć");
}

export function formatOffersCount(n: number): string {
  if (n === 0) return "Brak ofert";
  return countLabel(n, "oferta", "oferty", "ofert");
}

/** „Poznań, Malta · ul. Milczańska". Typ ulicy z danych (`ul.`/`os.`),
 *  domyślnie `ul.`. */
export function formatLocation(loc: {
  city: string;
  district?: string;
  street?: string;
  streetType?: string;
}): string {
  const head = loc.district ? `${loc.city}, ${loc.district}` : loc.city;
  if (!loc.street) return head;
  const type = loc.streetType ?? "ul.";
  return `${head}${NBSP}·${NBSP}${type}${NBSP}${loc.street}`;
}

export const TYPE_LABEL: Record<MainType, string> = {
  mieszkanie: "Mieszkanie",
  dom: "Dom",
  dzialka: "Działka",
  komercyjny: "Lokal komercyjny",
};
/** Liczba mnoga typów — nagłówki list SSG („Mieszkania na sprzedaż"). */
export const TYPE_LABEL_PLURAL: Record<MainType, string> = {
  mieszkanie: "Mieszkania",
  dom: "Domy",
  dzialka: "Działki",
  komercyjny: "Lokale komercyjne",
};
export const TRANSACTION_LABEL: Record<Transaction, string> = {
  sprzedaz: "Sprzedaż",
  wynajem: "Wynajem",
};
const TR_LABEL: Record<Transaction, string> = {
  sprzedaz: "na sprzedaż",
  wynajem: "na wynajem",
};

/** „Domy na sprzedaż" — nagłówek listy typ × transakcja. */
export function formatKindPlural(
  mainType: MainType,
  transaction: Transaction,
): string {
  return `${TYPE_LABEL_PLURAL[mainType]} ${TR_LABEL[transaction]}`;
}

/** „2003 r." */
export function formatYear(year: number): string {
  return `${year}${NBSP}r.`;
}

/** „Dom (bliźniak) na sprzedaż". */
export function formatKind(
  mainType: MainType,
  transaction: Transaction,
  subType?: string,
): string {
  const type = subType
    ? `${TYPE_LABEL[mainType]} (${subType.toLowerCase()})`
    : TYPE_LABEL[mainType];
  return `${type} ${TR_LABEL[transaction]}`;
}
