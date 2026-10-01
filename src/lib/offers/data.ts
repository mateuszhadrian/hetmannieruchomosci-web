// JEDYNE miejsce, w którym strona czyta dane ofert (2.8). Katalog
// `OFFERS_DATA_DIR` (domyślnie `./data`; `build:visual` wskazuje fixture).
// Każdy plik przechodzi walidację Zod STRICT — błędne dane WYWRACAJĄ build
// (lepiej brak deployu niż strona z dziurami). Brak pliku albo katalogu =
// pusty stan (strona buduje się z zerem ofert — stan dopuszczalny).
// „Teraz" dla prezentacji zależnej od daty: `BUILD_NOW` (env, ISO) —
// `build:visual` zamraża je, żeby zrzuty nie zmieniały się z czasem.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { z } from "zod";
import {
  LegacyRedirectsSchema,
  LocationsFileSchema,
  MapsFileSchema,
  OffersFileSchema,
  PhotosFileSchema,
  UrlLedgerSchema,
  type LegacyRedirects,
  type LocationsFile,
  type MapManifest,
  type Offer,
  type PhotoManifest,
  type UrlLedger,
} from "./schema";

export const DEFAULT_DATA_DIR = "./data";

/** Katalog danych bieżącego builda (względem katalogu roboczego). */
export function offersDataDir(): string {
  return process.env.OFFERS_DATA_DIR || DEFAULT_DATA_DIR;
}

function parseBuildNow(raw: string | undefined): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`BUILD_NOW: niepoprawna data „${raw}" (oczekiwano ISO)`);
  }
  return d;
}

/** „Teraz" builda — jedno dla całej strony. */
export const BUILD_NOW: Date = parseBuildNow(process.env.BUILD_NOW);

export const DATA_FILES = {
  offers: "offers.json",
  locations: "locations.json",
  photos: "photos.json",
  maps: "maps.json",
  ledger: "url-ledger.json",
  legacy: "legacy-redirects.json",
} as const;

export interface OffersData {
  offers: Offer[];
  locations: LocationsFile;
  photos: PhotoManifest;
  maps: MapManifest;
  ledger: UrlLedger;
  legacy: LegacyRedirects;
}

export const EMPTY_LOCATIONS: LocationsFile = { nodes: [], streets: {} };

export class OffersDataError extends Error {
  constructor(
    public readonly file: string,
    reason: string,
  ) {
    super(`${file}: ${reason}`);
    this.name = "OffersDataError";
  }
}

/** Odczyt i walidacja jednego pliku; brak pliku → `fallback`.
 *  Komunikat błędu niesie ścieżkę pola i powód — nigdy wartości. */
export function readDataFile<T>(
  dir: string,
  file: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  const path = join(dir, file);
  if (!existsSync(path)) return fallback;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new OffersDataError(path, "plik nie jest poprawnym JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? issue.path.join(".") : "(korzeń)";
    throw new OffersDataError(
      path,
      `niepoprawne dane — ${where}: ${issue?.message ?? "walidacja"} (${parsed.error.issues.length} problemów)`,
    );
  }
  return parsed.data;
}

const cache = new Map<string, OffersData>();

/** Komplet danych z katalogu; wynik buforowany per katalog (build czyta
 *  go z wielu stron). */
export function loadOffersData(dir: string = offersDataDir()): OffersData {
  const key = resolve(dir);
  const cached = cache.get(key);
  if (cached) return cached;
  const data: OffersData = {
    offers: readDataFile(dir, DATA_FILES.offers, OffersFileSchema, []),
    locations: readDataFile(
      dir,
      DATA_FILES.locations,
      LocationsFileSchema,
      EMPTY_LOCATIONS,
    ),
    photos: readDataFile(dir, DATA_FILES.photos, PhotosFileSchema, {}),
    maps: readDataFile(dir, DATA_FILES.maps, MapsFileSchema, {}),
    ledger: readDataFile(dir, DATA_FILES.ledger, UrlLedgerSchema, {}),
    legacy: readDataFile(dir, DATA_FILES.legacy, LegacyRedirectsSchema, {}),
  };
  cache.set(key, data);
  return data;
}

/** Do testów: zapomnij zbuforowane katalogi. */
export function clearOffersDataCache(): void {
  cache.clear();
}
