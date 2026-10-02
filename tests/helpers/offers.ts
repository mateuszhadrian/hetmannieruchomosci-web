// Oferty czytane wprost z plików JSON — tak samo, jak robi to build.
// Odporny odczyt (Etap 0), adresy ofert z danych (S2c), odczyt typowany
// i selektor `pickOffer()` (Etap 3).
//
// PLIKÓW MOŻE NIE BYĆ. Katalog `data/` powstaje dopiero przy pierwszym
// syncu, a fixture przy pierwszym `pnpm fixtures:build` — brak pliku jest
// stanem dopuszczalnym i znaczy to samo co pusta lista (strona buduje się
// z zerem ofert). Goły `readFileSync` przy ładowaniu modułu wywracałby
// WSZYSTKIE specy, zanim cokolwiek się uruchomi — dlatego oferty czyta się
// wyłącznie przez ten helper (reguła: .claude/rules/testing.md).
//
// Test zależny od SKŁADU ofert (z filmem, sprzedana, z parteru…) bierze
// ofertę przez `pickOffer({...})` i robi `test.skip(!offer, powód)`, gdy
// takiej nie ma — dane produkcyjne zmieniają się co noc bez PR-a.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OffersFileSchema,
  type MainType,
  type Market,
  type Offer,
  type OfferStatus,
  type Transaction,
} from "../../src/lib/offers/schema";
import { offerRoutes } from "../../src/lib/offers/urls";

/** Dane produkcyjne — pisze je wyłącznie bot syncu. */
export const DATA_DIR = fileURLToPath(new URL("../../data", import.meta.url));

/** Zamrożony zestaw testów wizualnych — pisze go wyłącznie
 *  `pnpm fixtures:build`. */
export const FIXTURE_DIR = fileURLToPath(
  new URL("../fixtures/offers", import.meta.url),
);

/** Skąd czytać oferty: dane produkcyjne (`test:e2e`) albo fixture
 *  (`test:visual`, strażnik `assertVisualFixture`). */
export type OfferSource = "data" | "fixture";

const SOURCE_DIR: Record<OfferSource, string> = {
  data: DATA_DIR,
  fixture: FIXTURE_DIR,
};

/** Oferta w postaci surowej — do czasu wejścia schematu wiemy o niej tylko
 *  tyle, że jest obiektem. */
export type OfferRecord = Record<string, unknown>;

/** Tablica z pliku JSON; pusta, gdy pliku nie ma. Uszkodzony plik ma
 *  wywrócić test (to realny błąd), brak pliku — nie. */
function readArray(dir: string, file: string): OfferRecord[] {
  const path = join(dir, file);
  if (!existsSync(path)) return [];
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`${path}: oczekiwano tablicy ofert`);
  }
  return parsed as OfferRecord[];
}

/** Oferty produkcyjne (`data/offers.json`); pusta lista, gdy brak pliku. */
export function readOffers(): OfferRecord[] {
  return readArray(DATA_DIR, "offers.json");
}

/** Oferty fixture'u (`tests/fixtures/offers/offers.json`); pusta lista,
 *  gdy fixture jeszcze nie powstał. */
export function readFixtureOffers(): OfferRecord[] {
  return readArray(FIXTURE_DIR, "offers.json");
}

// ── Odczyt TYPOWANY (Etap 3) ─────────────────────────────────────────────
// Kształt bierze `OffersFileSchema` (strict) — zły plik ma wywrócić test,
// to realny błąd danych; brak pliku = pusta tablica. Wynik buforowany per
// źródło: specy czytają oferty przy ładowaniu modułu, a walidacja 46 ofert
// strict nie jest darmowa.

const typedCache = new Map<OfferSource, Offer[]>();

/** Oferty ze wskazanego źródła jako `Offer[]` (schemat strict). */
export function readOffersTyped(source: OfferSource = "data"): Offer[] {
  const cached = typedCache.get(source);
  if (cached) return cached;
  const raw = readArray(SOURCE_DIR[source], "offers.json");
  const offers = raw.length === 0 ? [] : OffersFileSchema.parse(raw);
  typedCache.set(source, offers);
  return offers;
}

/** Oferty fixture'u jako `Offer[]` — skrót dla `readOffersTyped("fixture")`. */
export function readFixtureOffersTyped(): Offer[] {
  return readOffersTyped("fixture");
}

/** Kryteria wyboru oferty o danej cesze. Każde pole jest opcjonalne;
 *  podane muszą zajść wszystkie naraz. Wartość `0` jest daną, nie brakiem
 *  (`floor: 0` = parter). */
export interface OfferCriteria {
  status?: OfferStatus;
  mainType?: MainType;
  transaction?: Transaction;
  market?: Market;
  /** oferta ma / nie ma filmu (`videoId`) */
  withVideo?: boolean;
  /** oferta ma / nie ma spaceru 3D (`tourUrl`) */
  withTour?: boolean;
  /** w galerii jest / nie ma zdjęcia typu `plan` */
  withPlan?: boolean;
  /** dokładne piętro (`0` = parter) */
  floor?: number;
  /** obniżka ceny (`previousPrice` obecne / nieobecne) */
  withPreviousPrice?: boolean;
  /** „Zapytaj o cenę" (`price === null`) / cena podana */
  priceOnRequest?: boolean;
  /** co najmniej tyle zdjęć */
  minPhotos?: number;
  /** własny warunek — dla cech, których nie opłaca się nazywać */
  where?: (offer: Offer) => boolean;
}

/** Czy oferta spełnia WSZYSTKIE podane kryteria (czysta funkcja — testowana
 *  na danych syntetycznych). */
export function matchesCriteria(offer: Offer, c: OfferCriteria): boolean {
  if (c.status !== undefined && offer.status !== c.status) return false;
  if (c.mainType !== undefined && offer.mainType !== c.mainType) return false;
  if (c.transaction !== undefined && offer.transaction !== c.transaction) {
    return false;
  }
  if (c.market !== undefined && offer.market !== c.market) return false;
  if (c.withVideo !== undefined && Boolean(offer.videoId) !== c.withVideo) {
    return false;
  }
  if (c.withTour !== undefined && Boolean(offer.tourUrl) !== c.withTour) {
    return false;
  }
  if (c.withPlan !== undefined) {
    const hasPlan = offer.photos.some((p) => p.kind === "plan");
    if (hasPlan !== c.withPlan) return false;
  }
  if (c.floor !== undefined && offer.floor !== c.floor) return false;
  if (
    c.withPreviousPrice !== undefined &&
    (offer.previousPrice !== undefined) !== c.withPreviousPrice
  ) {
    return false;
  }
  if (
    c.priceOnRequest !== undefined &&
    (offer.price === null) !== c.priceOnRequest
  ) {
    return false;
  }
  if (c.minPhotos !== undefined && offer.photos.length < c.minPhotos) {
    return false;
  }
  if (c.where && !c.where(offer)) return false;
  return true;
}

/** Filtr listy ofert kryteriami (kolejność wejścia zachowana). */
export function filterOffers(
  offers: readonly Offer[],
  criteria: OfferCriteria = {},
): Offer[] {
  return offers.filter((o) => matchesCriteria(o, criteria));
}

/** Wszystkie oferty spełniające kryteria (kolejność pliku = po numerze). */
export function pickOffers(
  criteria: OfferCriteria = {},
  source: OfferSource = "data",
): Offer[] {
  return filterOffers(readOffersTyped(source), criteria);
}

/** Pierwsza oferta spełniająca kryteria albo `undefined` — wtedy spec
 *  robi `test.skip(!offer, "brak oferty z …")`. */
export function pickOffer(
  criteria: OfferCriteria = {},
  source: OfferSource = "data",
): Offer | undefined {
  return pickOffers(criteria, source)[0];
}

/** Czytelny opis kryteriów do powodu skipa. */
export function describeCriteria(criteria: OfferCriteria): string {
  const parts = Object.entries(criteria)
    .filter(([, v]) => v !== undefined && typeof v !== "function")
    .map(([k, v]) => `${k}=${String(v)}`);
  if (typeof criteria.where === "function") parts.push("where=…");
  return parts.length ? parts.join(", ") : "dowolna";
}

// ── Adresy ofert ─────────────────────────────────────────────────────────

/** Adresy ofert wyliczone z danych PRODUKCYJNYCH tak, jak robi to build
 *  (`offerRoutes()` na `data/offers.json`); puste przy zerze ofert. */
export function offerRoutesFromData(): { lists: string[]; details: string[] } {
  return offerRoutes(readOffersTyped("data"));
}

/** Adres pierwszej oferty z danych produkcyjnych albo `undefined`. */
export function firstOfferPath(): string | undefined {
  return offerRoutesFromData().details[0];
}

/** Adresy ofert z FIXTURE'U (zamrożony zestaw testów wizualnych). */
export function offerRoutesFromFixture(): {
  lists: string[];
  details: string[];
} {
  return offerRoutes(readOffersTyped("fixture"));
}
