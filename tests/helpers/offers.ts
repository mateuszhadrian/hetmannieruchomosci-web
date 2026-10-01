// Oferty czytane wprost z plików JSON — tak samo, jak robi to build.
// Odporny odczyt (Etap 0) + adresy ofert z danych (S2c). Selektory
// w rodzaju `pickOffer({ status, withVideo })` dochodzą w Etapie 3.
//
// PLIKÓW MOŻE NIE BYĆ. Katalog `data/` powstaje dopiero przy pierwszym
// syncu, a fixture przy pierwszym `pnpm fixtures:build` — brak pliku jest
// stanem dopuszczalnym i znaczy to samo co pusta lista (strona buduje się
// z zerem ofert). Goły `readFileSync` przy ładowaniu modułu wywracałby
// WSZYSTKIE specy, zanim cokolwiek się uruchomi — dlatego oferty czyta się
// wyłącznie przez ten helper (reguła: .claude/rules/testing.md).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { OffersFileSchema } from "../../src/lib/offers/schema";
import { offerRoutes } from "../../src/lib/offers/urls";

/** Dane produkcyjne — pisze je wyłącznie bot syncu. */
export const DATA_DIR = fileURLToPath(new URL("../../data", import.meta.url));

/** Zamrożony zestaw testów wizualnych — pisze go wyłącznie
 *  `pnpm fixtures:build`. */
export const FIXTURE_DIR = fileURLToPath(
  new URL("../fixtures/offers", import.meta.url),
);

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

/** Adresy ofert wyliczone z danych PRODUKCYJNYCH tak, jak robi to build
 *  (`offerRoutes()` na `data/offers.json`); puste przy zerze ofert.
 *  Oferty czytane odpornie, kształt adresowalny bierze `OfferSchema`
 *  (zły plik ma wywrócić test — to realny błąd danych). */
export function offerRoutesFromData(): { lists: string[]; details: string[] } {
  const offers = readOffers();
  if (offers.length === 0) return { lists: [], details: [] };
  return offerRoutes(OffersFileSchema.parse(offers));
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
  const offers = readFixtureOffers();
  if (offers.length === 0) return { lists: [], details: [] };
  return offerRoutes(OffersFileSchema.parse(offers));
}
