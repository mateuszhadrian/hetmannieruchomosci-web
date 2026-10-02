// Logika wyszukiwarki ofert — CZYSTE funkcje bez DOM (part2 §4.2 komplet
// filtrów + filtr statusu D12; świadome poprawki part2 §9: parter jako
// wartość, „winda: nie" filtruje, szukanie obejmuje tytuł, sortowanie po
// cenie grupuje transakcje, pola zależne od typu). Konsumenci: strona SSG
// (stan ze ścieżki) i wyspa wyszukiwarki (4.2 b; czyta ścieżkę
// i `URLSearchParams`, woła wyłącznie ten moduł). Filtry łączą się AND;
// puste i nienumeryczne wartości są pomijane bez błędu (parytet).
import { SORT_NEWEST_BY } from "../site-config";
import type { OfferIndexEntry } from "./index-entry";
import { matchesLocation } from "./location-path";
import {
  FURNISHED,
  MAIN_TYPES,
  MARKETS,
  TRANSACTIONS,
  type Furnished,
  type MainType,
  type Market,
  type OfferStatus,
  type Transaction,
} from "./enums";
import { normalizeText } from "./text";
import {
  offerListPath,
  OFFERS_PATH,
  OFFER_TRANSACTION_SLUGS,
  OFFER_TYPE_SLUGS,
  TRANSACTION_SLUG,
  TYPE_SLUG,
  type OfferTransactionSlug,
  type OfferTypeSlug,
} from "./urls";

/** Kart na stronę (part2 §4.3: 12). */
export const PAGE_SIZE = 12;

export const SORT_KEYS = ["newest", "oldest", "priceAsc", "priceDesc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = "newest";

/** Grupy filtra statusu (D12/O1): trzy pigułki; „archiwalne" = sprzedane
 *  i wynajęte. */
export const STATUS_GROUPS = ["aktywna", "rezerwacja", "archiwalne"] as const;
export type StatusGroup = (typeof STATUS_GROUPS)[number];

export function statusGroupOf(status: OfferStatus): StatusGroup {
  return status === "aktywna" || status === "rezerwacja"
    ? status
    : "archiwalne";
}

export const ELEVATOR_OPTIONS = ["tak", "nie"] as const;
export type ElevatorOption = (typeof ELEVATOR_OPTIONS)[number];

export interface SearchState {
  mainType?: MainType;
  transaction?: Transaction;
  /** id węzła drzewa lokalizacji (`?lokalizacja=`) — dopasowanie prefiksowe */
  location?: string;
  /** segment lokalizacji z adresu listy SSG (`/…/poznan-winogrady/`) —
   *  dopasowanie DOKŁADNE do `location.slug` wpisu (R18: lista SSG
   *  z lokalizacją = dokładnie oferty tego slugu; hydratacja nie może
   *  zmieniać zawartości strony). Nigdy nie trafia do parametrów. */
  locationSlug?: string;
  /** nazwa ulicy (działa tylko razem z `location` — kaskada) */
  street?: string;
  priceFrom?: number;
  priceTo?: number;
  areaFrom?: number;
  areaTo?: number;
  /** fraza do „szukaj w opisie" (obejmuje tytuł) */
  description?: string;
  number?: string;
  roomsFrom?: number;
  roomsTo?: number;
  floorFrom?: number;
  floorTo?: number;
  yearFrom?: number;
  yearTo?: number;
  market?: Market;
  elevator?: ElevatorOption;
  furnished?: Furnished;
  /** liczba pięter w budynku — tylko „do" (parytet) */
  floorsTo?: number;
  /** włączone grupy statusu; domyślnie wszystkie (M3b) */
  statuses: readonly StatusGroup[];
  sort: SortKey;
  /** strona od 1 */
  page: number;
  /** adres niósł nieznaną wartość typu albo transakcji → 0 wyników
   *  (parytet: nieznana wartość `main_type_id` nie jest ignorowana) */
  invalid?: true;
}

export const DEFAULT_STATE: SearchState = Object.freeze({
  statuses: STATUS_GROUPS,
  sort: DEFAULT_SORT,
  page: 1,
});

/** Nazwy parametrów adresu (po polsku, jak reszta adresów serwisu). */
export const PARAM = {
  mainType: "typ",
  transaction: "transakcja",
  location: "lokalizacja",
  street: "ulica",
  priceFrom: "cena-od",
  priceTo: "cena-do",
  areaFrom: "pow-od",
  areaTo: "pow-do",
  description: "opis",
  number: "numer",
  roomsFrom: "pokoje-od",
  roomsTo: "pokoje-do",
  floorFrom: "pietro-od",
  floorTo: "pietro-do",
  yearFrom: "rok-od",
  yearTo: "rok-do",
  market: "rynek",
  elevator: "winda",
  furnished: "umeblowane",
  floorsTo: "pieter-do",
  statuses: "status",
  sort: "sort",
  page: "strona",
} as const satisfies Record<
  Exclude<keyof SearchState, "invalid" | "locationSlug">,
  string
>;

// ── Parsowanie ──────────────────────────────────────────────────────────

const TYPE_BY_SLUG = Object.fromEntries(
  (Object.entries(TYPE_SLUG) as [MainType, OfferTypeSlug][]).map(([k, v]) => [
    v,
    k,
  ]),
) as Record<OfferTypeSlug, MainType>;
const TRANSACTION_BY_SLUG = Object.fromEntries(
  (
    Object.entries(TRANSACTION_SLUG) as [Transaction, OfferTransactionSlug][]
  ).map(([k, v]) => [v, k]),
) as Record<OfferTransactionSlug, Transaction>;

export interface PathState {
  mainType?: MainType;
  transaction?: Transaction;
  /** segment lokalizacji z adresu listy (`poznan-winogrady`) */
  locationSlug?: string;
}

/** `/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/` → typ, transakcja,
 *  slug. Adres spoza wzorca (w tym `/oferty/`) → pusty stan. */
export function parsePath(pathname: string): PathState {
  if (!pathname.startsWith(OFFERS_PATH)) return {};
  const rest = pathname.slice(OFFERS_PATH.length).replace(/\/$/, "");
  if (!rest) return {};
  const [kind, slug, ...more] = rest.split("/");
  if (more.length > 0 || !kind) return {};
  const m = /^([a-z-]+)-na-([a-z]+)$/.exec(kind);
  if (!m) return {};
  const type = m[1] as OfferTypeSlug;
  const tr = m[2] as OfferTransactionSlug;
  if (!OFFER_TYPE_SLUGS.includes(type) || !OFFER_TRANSACTION_SLUGS.includes(tr))
    return {};
  const state: PathState = {
    mainType: TYPE_BY_SLUG[type],
    transaction: TRANSACTION_BY_SLUG[tr],
  };
  if (slug) state.locationSlug = slug;
  return state;
}

/** Liczba z parametru: spacje (także niełamliwe) usunięte; tekst
 *  nienumeryczny → `undefined` (ignorowany bez błędu — parytet). */
export function parseNumber(
  raw: string | null | undefined,
): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  const cleaned = raw.replace(/[\s ]/g, "").replace(",", ".");
  if (cleaned === "") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** Numer strony: `0`, `-1`, `abc`, brak → 1 (parytet). */
export function parsePage(raw: string | null | undefined): number {
  const n = parseNumber(raw);
  return n !== undefined && Number.isInteger(n) && n >= 1 ? n : 1;
}

function oneOf<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | undefined {
  return raw !== null && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined;
}

function text(raw: string | null): string | undefined {
  const t = raw?.trim();
  return t ? t : undefined;
}

/** Stan z adresu: ścieżka (typ, transakcja) ma pierwszeństwo przed
 *  parametrami; segment lokalizacji z adresu listy trafia do
 *  `locationSlug` (dokładny), a `?lokalizacja=` do `location` (prefiks) —
 *  oba mogą współistnieć (AND). */
export function parseSearch(
  pathname: string,
  search: string | URLSearchParams = "",
): SearchState {
  const q = typeof search === "string" ? new URLSearchParams(search) : search;
  const path = parsePath(pathname);
  const get = (key: keyof typeof PARAM) => q.get(PARAM[key]);

  const statusesRaw = get("statuses");
  const statuses =
    statusesRaw === null
      ? DEFAULT_STATE.statuses
      : statusesRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is StatusGroup =>
            (STATUS_GROUPS as readonly string[]).includes(s),
          );

  const state: SearchState = {
    mainType: path.mainType ?? oneOf(get("mainType"), MAIN_TYPES),
    transaction: path.transaction ?? oneOf(get("transaction"), TRANSACTIONS),
    location: text(get("location")),
    locationSlug: path.locationSlug,
    street: text(get("street")),
    priceFrom: parseNumber(get("priceFrom")),
    priceTo: parseNumber(get("priceTo")),
    areaFrom: parseNumber(get("areaFrom")),
    areaTo: parseNumber(get("areaTo")),
    description: text(get("description")),
    number: text(get("number")),
    roomsFrom: parseNumber(get("roomsFrom")),
    roomsTo: parseNumber(get("roomsTo")),
    floorFrom: parseNumber(get("floorFrom")),
    floorTo: parseNumber(get("floorTo")),
    yearFrom: parseNumber(get("yearFrom")),
    yearTo: parseNumber(get("yearTo")),
    market: oneOf(get("market"), MARKETS),
    elevator: oneOf(get("elevator"), ELEVATOR_OPTIONS),
    furnished: oneOf(get("furnished"), FURNISHED),
    floorsTo: parseNumber(get("floorsTo")),
    statuses: statusesRaw === null ? statuses : [...new Set(statuses)],
    sort: oneOf(get("sort"), SORT_KEYS) ?? DEFAULT_SORT,
    page: parsePage(get("page")),
  };
  const typRaw = get("mainType");
  const trRaw = get("transaction");
  if (
    (path.mainType === undefined &&
      typRaw !== null &&
      typRaw !== "" &&
      state.mainType === undefined) ||
    (path.transaction === undefined &&
      trRaw !== null &&
      trRaw !== "" &&
      state.transaction === undefined)
  ) {
    state.invalid = true;
  }
  return compactState(state);
}

function compactState(state: SearchState): SearchState {
  return Object.fromEntries(
    Object.entries(state).filter(([, v]) => v !== undefined),
  ) as unknown as SearchState;
}

/** Parametry adresu dla stanu — tylko wartości różne od domyślnych
 *  i od tego, co niesie ścieżka (`pathState`); `locationSlug` nigdy nie
 *  jest parametrem (żyje w ścieżce). Kolejność stała = adres
 *  deterministyczny. */
export function serializeSearch(
  state: SearchState,
  pathState: PathState = {},
): URLSearchParams {
  const q = new URLSearchParams();
  const put = (key: keyof typeof PARAM, value: unknown) => {
    if (value === undefined || value === "") return;
    q.set(PARAM[key], String(value));
  };
  if (state.mainType !== pathState.mainType) put("mainType", state.mainType);
  if (state.transaction !== pathState.transaction)
    put("transaction", state.transaction);
  put("location", state.location);
  put("street", state.street);
  put("priceFrom", state.priceFrom);
  put("priceTo", state.priceTo);
  put("areaFrom", state.areaFrom);
  put("areaTo", state.areaTo);
  put("description", state.description);
  put("number", state.number);
  put("roomsFrom", state.roomsFrom);
  put("roomsTo", state.roomsTo);
  put("floorFrom", state.floorFrom);
  put("floorTo", state.floorTo);
  put("yearFrom", state.yearFrom);
  put("yearTo", state.yearTo);
  put("market", state.market);
  put("elevator", state.elevator);
  put("furnished", state.furnished);
  put("floorsTo", state.floorsTo);
  // pusty zbiór statusów = `status=` (pusta wartość jest tu znacząca:
  // „żadna grupa"), więc bez `put`, które pomija puste
  if (!sameStatuses(state.statuses, DEFAULT_STATE.statuses))
    q.set(PARAM.statuses, [...state.statuses].sort().join(","));
  if (state.sort !== DEFAULT_SORT) put("sort", state.sort);
  if (state.page > 1) put("page", state.page);
  return q;
}

function sameStatuses(
  a: readonly StatusGroup[],
  b: readonly StatusGroup[],
): boolean {
  return (
    a.length === b.length &&
    STATUS_GROUPS.every((s) => a.includes(s) === b.includes(s))
  );
}

// ── Zależność pól od typu (part2 §9; macierz w docs/analiza-oferty.md §3) ──

export const TYPE_FIELDS = [
  "plotArea",
  "rooms",
  "floor",
  "floorsTo",
  "year",
  "elevator",
  "furnished",
] as const;
export type TypeField = (typeof TYPE_FIELDS)[number];

const RELEVANT: Record<MainType, readonly TypeField[]> = {
  mieszkanie: ["rooms", "floor", "floorsTo", "year", "elevator", "furnished"],
  dom: ["plotArea", "rooms", "floorsTo", "year"],
  dzialka: [],
  komercyjny: ["rooms", "floor", "floorsTo", "year", "elevator"],
};

/** Czy pole dotyczy typu; bez wybranego typu — zawsze tak. */
export function isFieldRelevant(
  mainType: MainType | undefined,
  field: TypeField,
): boolean {
  return mainType === undefined || RELEVANT[mainType].includes(field);
}

// ── Dopasowanie ─────────────────────────────────────────────────────────

function inRange(
  value: number | undefined,
  from: number | undefined,
  to: number | undefined,
): boolean {
  if (from === undefined && to === undefined) return true;
  if (value === undefined) return false;
  if (from !== undefined && value < from) return false;
  if (to !== undefined && value > to) return false;
  return true;
}

/** Czy wpis spełnia WSZYSTKIE filtry stanu (bez sortowania i strony).
 *  `text` = wpis z `index-text.json` dla „szukaj w opisie" — gdy fraza
 *  jest ustawiona, a tekstu brak, wpis odpada. */
export function matchesEntry(
  entry: OfferIndexEntry,
  state: SearchState,
  text?: string,
): boolean {
  if (state.invalid) return false;
  if (state.mainType !== undefined && entry.mainType !== state.mainType)
    return false;
  if (
    state.transaction !== undefined &&
    entry.transaction !== state.transaction
  )
    return false;
  if (!state.statuses.includes(statusGroupOf(entry.status))) return false;
  if (
    state.location !== undefined &&
    !matchesLocation(entry.location.nodeId, state.location)
  )
    return false;
  if (
    state.locationSlug !== undefined &&
    entry.location.slug !== state.locationSlug
  )
    return false;
  // ulica tylko w kaskadzie z lokalizacją (part2 §4.2)
  if (state.street !== undefined && state.location !== undefined) {
    if (
      entry.location.street === undefined ||
      normalizeText(entry.location.street) !== normalizeText(state.street)
    )
      return false;
  }
  if (state.priceFrom !== undefined || state.priceTo !== undefined) {
    if (entry.price === null) return false;
    if (!inRange(entry.price, state.priceFrom, state.priceTo)) return false;
  }
  if (!inRange(entry.area, state.areaFrom, state.areaTo)) return false;
  if (state.number !== undefined) {
    if (normalizeText(entry.number) !== normalizeText(state.number))
      return false;
  }
  if (state.description !== undefined) {
    const phrase = normalizeText(state.description);
    if (phrase && (text === undefined || !text.includes(phrase))) return false;
  }
  if (state.market !== undefined && entry.market !== state.market) return false;

  const t = state.mainType;
  if (
    isFieldRelevant(t, "rooms") &&
    !inRange(entry.rooms, state.roomsFrom, state.roomsTo)
  )
    return false;
  if (
    isFieldRelevant(t, "floor") &&
    !inRange(entry.floor, state.floorFrom, state.floorTo)
  )
    return false;
  if (
    isFieldRelevant(t, "year") &&
    !inRange(entry.buildingYear, state.yearFrom, state.yearTo)
  )
    return false;
  if (
    isFieldRelevant(t, "floorsTo") &&
    !inRange(entry.floorsInBuilding, undefined, state.floorsTo)
  )
    return false;
  if (isFieldRelevant(t, "elevator") && state.elevator !== undefined) {
    // brak danych ≠ „nie ma windy" (schemat `elevators`; D14 — nie
    // wnioskujemy): odpada w obu wariantach
    if (entry.elevators === undefined) return false;
    if (state.elevator === "tak" && entry.elevators <= 0) return false;
    if (state.elevator === "nie" && entry.elevators !== 0) return false;
  }
  if (
    isFieldRelevant(t, "furnished") &&
    state.furnished !== undefined &&
    entry.furnished !== state.furnished
  )
    return false;
  return true;
}

export function applyFilters(
  entries: readonly OfferIndexEntry[],
  state: SearchState,
  texts?: Readonly<Record<string, string>>,
): OfferIndexEntry[] {
  return entries.filter((e) => matchesEntry(e, state, texts?.[e.number]));
}

// ── Sortowanie ──────────────────────────────────────────────────────────

const byNumber = (a: OfferIndexEntry, b: OfferIndexEntry) =>
  a.number < b.number ? -1 : a.number > b.number ? 1 : 0;

function newestKey(e: OfferIndexEntry): string {
  return (
    (SORT_NEWEST_BY === "activatedAt" ? e.activatedAt : undefined) ?? e.addedAt
  );
}

/** Grupa transakcji przy sortowaniu po cenie (part2 §9): rosnąco —
 *  wynajem (kwoty miesięczne) przed sprzedażą; malejąco — odwrotnie.
 *  „Zapytaj o cenę" (`null`) zawsze na końcu. */
function priceCompare(dir: 1 | -1) {
  return (a: OfferIndexEntry, b: OfferIndexEntry): number => {
    if (a.price === null || b.price === null) {
      if (a.price === b.price) return byNumber(a, b);
      return a.price === null ? 1 : -1;
    }
    if (a.transaction !== b.transaction) {
      const order = a.transaction === "wynajem" ? -1 : 1;
      return order * dir;
    }
    if (a.price !== b.price) return (a.price - b.price) * dir;
    return byNumber(a, b);
  };
}

export function sortEntries(
  entries: readonly OfferIndexEntry[],
  sort: SortKey,
): OfferIndexEntry[] {
  const out = [...entries];
  switch (sort) {
    case "oldest":
      return out.sort(
        (a, b) => newestKey(a).localeCompare(newestKey(b)) || byNumber(a, b),
      );
    case "priceAsc":
      return out.sort(priceCompare(1));
    case "priceDesc":
      return out.sort(priceCompare(-1));
    case "newest":
    default:
      return out.sort(
        (a, b) => newestKey(b).localeCompare(newestKey(a)) || byNumber(a, b),
      );
  }
}

// ── Paginacja ───────────────────────────────────────────────────────────

export interface Page<T> {
  /** numer strony (jak w adresie; może wykraczać poza zakres — parytet) */
  page: number;
  /** liczba stron (≥ 1) */
  pages: number;
  total: number;
  items: T[];
}

export function paginate<T>(
  items: readonly T[],
  page: number,
  size = PAGE_SIZE,
): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const start = (page - 1) * size;
  return {
    page,
    pages,
    total: items.length,
    items: start >= 0 ? items.slice(start, start + size) : [],
  };
}

// ── Liczniki pigułek statusu ────────────────────────────────────────────

/** Liczniki per grupa dla przekazanych wpisów — wołający przekazuje wpisy
 *  po WSZYSTKICH filtrach poza statusem (pigułki liczą swój kontekst). */
export function statusCounts(
  entries: readonly OfferIndexEntry[],
): Record<StatusGroup, number> {
  const counts: Record<StatusGroup, number> = {
    aktywna: 0,
    rezerwacja: 0,
    archiwalne: 0,
  };
  for (const e of entries) counts[statusGroupOf(e.status)] += 1;
  return counts;
}

/** Pełny przebieg: filtry → sortowanie → strona; plus liczniki statusu
 *  w kontekście pozostałych filtrów. */
export function runSearch(
  entries: readonly OfferIndexEntry[],
  state: SearchState,
  texts?: Readonly<Record<string, string>>,
): Page<OfferIndexEntry> & { counts: Record<StatusGroup, number> } {
  const withoutStatus = applyFilters(
    entries,
    { ...state, statuses: STATUS_GROUPS },
    texts,
  );
  const matched = withoutStatus.filter((e) =>
    state.statuses.includes(statusGroupOf(e.status)),
  );
  const sorted = sortEntries(matched, state.sort);
  return {
    ...paginate(sorted, state.page),
    counts: statusCounts(withoutStatus),
  };
}

// ── Adres dla stanu (wyspa: pushState) ──────────────────────────────────

export interface TargetPath {
  pathname: string;
  pathState: PathState;
  /** stan po przeniesieniu lokalizacji między ścieżką a parametrem */
  state: SearchState;
}

/** Typ ∧ transakcja → ścieżka listy SSG; lokalizacja wchodzi do ścieżki
 *  (segment slugu), gdy wybrany węzeł jest LIŚCIEM drzewa i istnieje wpis
 *  tej kombinacji z tym slugiem (= lista SSG istnieje; liść ⇒ zbiór
 *  prefiksowy = zbiór slugu). W przeciwnym razie lokalizacja zostaje
 *  parametrem `?lokalizacja=`; slug z adresu bez listy dla nowego rodzaju
 *  wraca do id węzła (prefiks). Reszta stanu w parametrach
 *  (`serializeSearch(state, pathState)`). */
export function targetPath(
  state: SearchState,
  entries: readonly OfferIndexEntry[],
  nodes: readonly { id: string; parent: string | null }[],
): TargetPath {
  const next: SearchState = { ...state };
  delete next.locationSlug;
  const isLeaf = (id: string) => !nodes.some((n) => n.parent === id);
  const nodeOfSlug = (slug: string) =>
    entries.find((e) => e.location.slug === slug)?.location.nodeId;

  if (state.mainType === undefined || state.transaction === undefined) {
    if (state.location === undefined && state.locationSlug !== undefined) {
      const id = nodeOfSlug(state.locationSlug);
      if (id !== undefined) next.location = id;
    }
    return { pathname: OFFERS_PATH, pathState: {}, state: compactState(next) };
  }

  const { mainType, transaction } = state;
  const ofKind = (e: OfferIndexEntry) =>
    e.mainType === mainType && e.transaction === transaction;
  const pathState: PathState = { mainType, transaction };
  let slug: string | undefined;

  if (state.location !== undefined) {
    if (isLeaf(state.location)) {
      const loc = state.location;
      slug = entries.find((e) => ofKind(e) && e.location.nodeId === loc)
        ?.location.slug;
    }
    if (slug !== undefined) delete next.location;
  } else if (state.locationSlug !== undefined) {
    const s = state.locationSlug;
    if (entries.some((e) => ofKind(e) && e.location.slug === s)) slug = s;
    else {
      const id = nodeOfSlug(s);
      if (id !== undefined) next.location = id;
    }
  }

  if (slug !== undefined) {
    pathState.locationSlug = slug;
    next.locationSlug = slug;
  }
  return {
    pathname: offerListPath(
      TYPE_SLUG[mainType],
      TRANSACTION_SLUG[transaction],
      slug,
    ),
    pathState,
    state: compactState(next),
  };
}
