// Orkiestracja syncu (2.8) jako CZYSTY przebieg: wszystkie usługi
// zewnętrzne (API CRM, pobieranie zdjęć i map, zasobnik) przychodzą
// w `deps`, więc testy biegną na atrapach, a `fixtures.ts` używa tego
// samego kodu w trybie plikowym. Kolejność kroków = instrukcja 2.8:
//  1. basic-list widocznych + basic-list wszystkich statusów (tylko do
//     raportu prywatnego)            2. list (stronicowane)
//  3. filtr widoczności → normalizacja → walidacja
//  4. bezpieczniki (0 ofert / spadek > 50 %) → przerwanie BEZ zapisu
//  5. lokalizacje  6. zdjęcia → R2  7. mapy → R2  8. rejestr adresów
//  9. zapis + porównanie z poprzednim stanem („brak zmian")
// 10. wykrycie przebudowy zależnej od daty (sygnał dla workflow)
// 11. raport (dwa wyjścia) — składa wywołujący z `ReportInput`.
// Surowe rekordy żyją tylko w pamięci; do plików trafiają wyłącznie
// oferty po allow-liście i walidacji strict.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DATA_FILES,
  loadOffersData,
  type OffersData,
} from "../../src/lib/offers/data";
import type { RawRecord } from "../../src/lib/offers/public-fields";
import {
  LocationsFileSchema,
  MapsFileSchema,
  OffersFileSchema,
  PhotosFileSchema,
  UrlLedgerSchema,
  type NormalizedOffer,
  type Offer,
  type OfferStatus,
  type PhotoManifest,
} from "../../src/lib/offers/schema";
import {
  dateDependentFingerprint,
  warsawDate,
} from "../../src/lib/offers/time-rules";
import type { Dictionary } from "./dictionary";
import {
  BasicListItemSchema,
  type BasicListItem,
  type EstiClient,
  type FetchLike,
} from "./esti-client";
import { updateLedger } from "./ledger";
import { buildLocations } from "./locations";
import { syncMaps, type MarkerMode } from "./maps";
import { normalize, NormalizeError } from "./normalize";
import { syncPhotos } from "./photos";
import { cleanupGone, type R2Store } from "./r2";
import type { ReportInput, SyncOutcome, SyncStats } from "./report";
import {
  ALL_STATUSES,
  diffVisibility,
  exportWarning,
  isVisible,
} from "./visibility";
import type { SyncWarning } from "./warnings";

/** Spadek liczby widocznych ofert, powyżej którego sync się zatrzymuje. */
export const MAX_DROP_RATIO = 0.5;

export type PipelineSource =
  | { kind: "api"; client: EstiClient }
  | {
      /** zrzut odpowiedzi `list` (ESTI_RAW_SNAPSHOT) — tylko w pamięci */
      kind: "file";
      records: readonly RawRecord[];
      dictionary: Dictionary;
    };

export interface PipelineDeps {
  source: PipelineSource;
  store: R2Store;
  /** pobieranie zdjęć z hosta CRM (atrapa w testach) */
  photoFetch?: FetchLike;
  /** pobieranie map z Geoapify (atrapa w testach) */
  mapFetch?: FetchLike;
  geoapifyKey?: string;
  marker?: MarkerMode;
  /** id sygnału umowy do W1/W2 — wartość z konfiguracji, nigdy z repo */
  agreementSignalId?: number;
  sleep?: (ms: number) => Promise<void>;
  /** hak dla fixture'u: nadpisania ofert po normalizacji, przed zdjęciami */
  transformOffers?: (offers: NormalizedOffer[]) => NormalizedOffer[];
}

export interface PipelineOptions {
  /** poprzedni stan (zawsze `data/` — stan zacommitowany) */
  previousDir: string;
  /** katalog wyjściowy: lokalnie `.sync-out/`, w Actions `data/` */
  outDir: string;
  dryRun?: boolean;
  skipPhotos?: boolean;
  skipMaps?: boolean;
  /** obejście bezpieczników (świadome, z `workflow_dispatch`) */
  force?: boolean;
  /** „teraz" przebiegu */
  now?: Date;
}

export interface PipelineResult {
  outcome: SyncOutcome;
  /** pliki różnią się od poprzedniego stanu */
  changed: boolean;
  /** prezentacja zależna od daty zmienia się dziś → przebudowa bez
   *  zmiany danych */
  rebuild: boolean;
  /** czy pliki zostały zapisane (i gdzie) */
  written: string | null;
  /** oferty pełne (po zdjęciach) — do testów i fixture'u */
  offers: Offer[];
  report: ReportInput;
}

/** Błąd przebiegu z częściowym raportem (do maila o niepowodzeniu). */
export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly partial: ReportInput,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

/** Pozycja `basic-list` wyprowadzona z pełnego rekordu (tryb plikowy). */
function toBasicItem(rec: RawRecord): BasicListItem | undefined {
  const parsed = BasicListItemSchema.safeParse({
    id: rec.id,
    number: rec.number,
    status: rec.status,
    update_date: rec.updateDate,
  });
  return parsed.success ? parsed.data : undefined;
}

/** Atrapa pobierania przy `--skip-photos`: znane zdjęcia „bez zmian" (304),
 *  nowe — pominięte do następnego pełnego biegu (PHOTO_FETCH). */
const skipPhotoFetch: FetchLike = async (_url, init) =>
  new Response(null, { status: init?.headers?.["if-none-match"] ? 304 : 404 });

/** Atrapa map przy `--skip-maps`: znane punkty wracają z manifestu bez
 *  żądania; nowe zostają bez mapy (MAP_FETCH). */
const skipMapFetch: FetchLike = async () => new Response("", { status: 404 });

export async function runPipeline(
  deps: PipelineDeps,
  options: PipelineOptions,
): Promise<PipelineResult> {
  const now = options.now ?? new Date();
  const today = warsawDate(now);
  const runAt = now.toISOString();
  const startedAt = Date.now();
  const warnings: SyncWarning[] = [];
  const errors: string[] = [];
  const stats: SyncStats = { visible: 0 };
  let dictionary: Dictionary | undefined;

  const partial = (outcome: SyncOutcome): ReportInput => ({
    outcome,
    runAt,
    stats: { ...stats, durationMs: Date.now() - startedAt },
    warnings,
    dictionary,
    errors,
  });
  const fail = (message: string): never => {
    errors.push(message);
    throw new PipelineError(message, partial("failed"));
  };

  // ── poprzedni stan (strict; zły plik w repo = błąd, nie cicha nadpiska)
  let previous: OffersData;
  try {
    previous = loadOffersData(options.previousDir);
  } catch (e) {
    return fail(
      `poprzedni stan (${options.previousDir}): ${(e as Error).message}`,
    );
  }
  const previousNumbers = previous.offers.map((o) => o.number);
  const previousStatus = new Map<string, OfferStatus>(
    previous.offers.map((o) => [o.number, o.status]),
  );
  stats.previousVisible = previous.offers.length;

  // ── 1–2. listy z API (albo zrzut z pliku)
  let basicAll: BasicListItem[];
  let raw: readonly RawRecord[];
  if (deps.source.kind === "api") {
    const { client } = deps.source;
    try {
      await client.basicList();
      basicAll = await client.basicList(ALL_STATUSES);
      dictionary = await client.dictionary();
      raw = await client.listAll();
    } catch (e) {
      return fail(`API: ${(e as Error).message}`);
    }
    stats.requests = client.requests;
  } else {
    raw = deps.source.records;
    dictionary = deps.source.dictionary;
    basicAll = raw
      .map(toBasicItem)
      .filter((x): x is BasicListItem => x !== undefined);
  }
  stats.inCrm = basicAll.length;

  // ── 3. widoczność → normalizacja → walidacja
  const visibleRaw: RawRecord[] = [];
  for (const rec of raw) {
    const w4 = exportWarning(rec);
    if (w4) warnings.push(w4);
    if (isVisible(rec)) visibleRaw.push(rec);
  }
  let normalized: NormalizedOffer[] = [];
  for (const rec of visibleRaw) {
    try {
      const result = normalize(rec, {
        dictionary,
        agreementSignalId: deps.agreementSignalId,
      });
      normalized.push(result.offer);
      warnings.push(...result.warnings);
    } catch (e) {
      const number = e instanceof NormalizeError ? e.number : undefined;
      return fail(
        `${(e as Error).message}${number ? ` (oferta ${number})` : ""}`,
      );
    }
  }
  if (deps.transformOffers) normalized = deps.transformOffers(normalized);
  normalized.sort((a, b) => a.number.localeCompare(b.number));
  stats.visible = normalized.length;

  // ── 4. bezpieczniki
  const visibility = diffVisibility(
    previousNumbers,
    normalized.map((o) => o.number),
    basicAll,
  );
  const dropped =
    previous.offers.length > 0 &&
    normalized.length < previous.offers.length * (1 - MAX_DROP_RATIO);
  if (!options.force && (normalized.length === 0 || dropped)) {
    errors.push(
      normalized.length === 0
        ? "bezpiecznik: 0 widocznych ofert — przerwano bez zapisu (obejście: force)"
        : `bezpiecznik: spadek liczby ofert o ponad połowę (${previous.offers.length} → ${normalized.length}) — przerwano bez zapisu (obejście: force)`,
    );
    return {
      outcome: "aborted",
      changed: false,
      rebuild: false,
      written: null,
      offers: [],
      report: { ...partial("aborted"), visibility },
    };
  }

  // ── 5. lokalizacje
  const built = buildLocations(normalized);
  warnings.push(...built.warnings);

  // ── 6. zdjęcia
  let offers: Offer[];
  let photosManifest: PhotoManifest;
  try {
    const photos = await syncPhotos({
      offers: built.offers,
      manifest: previous.photos,
      previousStatus,
      store: deps.store,
      today,
      fetch: options.skipPhotos ? skipPhotoFetch : deps.photoFetch,
      sleep: deps.sleep,
    });
    offers = photos.offers;
    photosManifest = photos.manifest;
    warnings.push(...photos.warnings);
    stats.photos = photos.stats;
  } catch (e) {
    return fail(`zdjęcia: ${(e as Error).message}`);
  }

  // ── 7. mapy
  let mapsManifest = previous.maps;
  if (options.skipMaps || deps.geoapifyKey) {
    const maps = await syncMaps({
      offers,
      manifest: previous.maps,
      store: deps.store,
      apiKey: deps.geoapifyKey ?? "",
      today,
      marker: deps.marker,
      fetch: options.skipMaps ? skipMapFetch : deps.mapFetch,
      sleep: deps.sleep,
    });
    mapsManifest = maps.manifest;
    warnings.push(...maps.warnings);
    stats.maps = maps.stats;
  }

  // ── 8. rejestr adresów
  const ledger = updateLedger(previous.ledger, offers);

  // ── czyszczenie R2 (30 dni od goneSince) — porządkuje manifesty przed
  //    zapisem; błąd zasobnika NIE blokuje zapisu danych
  try {
    const p = await cleanupGone(photosManifest, deps.store, today);
    const m = await cleanupGone(mapsManifest, deps.store, today);
    photosManifest = p.manifest;
    mapsManifest = m.manifest;
    stats.cleaned = p.deleted.length + m.deleted.length;
  } catch (e) {
    errors.push(`czyszczenie R2 nie powiodło się: ${(e as Error).message}`);
  }

  // ── 9. zapis i porównanie
  // Każdy plik przechodzi przez schemat strict (ostatnia walidacja i
  // kolejność kluczy wg schematu — identyczna z odczytem poprzedniego
  // stanu, więc porównanie tekstów nie widzi fałszywych zmian).
  const files: Record<string, string> = {
    [DATA_FILES.offers]: stableJson(OffersFileSchema.parse(offers)),
    [DATA_FILES.locations]: stableJson(
      LocationsFileSchema.parse(built.locations),
    ),
    [DATA_FILES.photos]: stableJson(PhotosFileSchema.parse(photosManifest)),
    [DATA_FILES.maps]: stableJson(MapsFileSchema.parse(mapsManifest)),
    [DATA_FILES.ledger]: stableJson(UrlLedgerSchema.parse(ledger)),
  };
  const before: Record<string, string> = {
    [DATA_FILES.offers]: stableJson(previous.offers),
    [DATA_FILES.locations]: stableJson(previous.locations),
    [DATA_FILES.photos]: stableJson(previous.photos),
    [DATA_FILES.maps]: stableJson(previous.maps),
    [DATA_FILES.ledger]: stableJson(previous.ledger),
  };
  const changed =
    Object.keys(files).some((f) => files[f] !== before[f]) ||
    !existsSync(join(options.previousDir, DATA_FILES.offers));

  let written: string | null = null;
  const inPlace = resolve(options.outDir) === resolve(options.previousDir);
  if (!options.dryRun && (changed || !inPlace)) {
    mkdirSync(options.outDir, { recursive: true });
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(join(options.outDir, name), text);
    }
    written = options.outDir;
  }

  // ── 10. przebudowa zależna od daty: wczoraj vs dziś
  const yesterday = new Date(now.getTime() - 86_400_000);
  const rebuild =
    dateDependentFingerprint(offers, yesterday) !==
    dateDependentFingerprint(offers, now);

  const outcome: SyncOutcome = options.dryRun
    ? "dry-run"
    : changed
      ? "ok"
      : "no-changes";
  return {
    outcome,
    changed,
    rebuild,
    written,
    offers,
    report: { ...partial(outcome), visibility },
  };
}

/** Rekordy ze zrzutu odpowiedzi `list` (tablica albo `{ data: [...] }`). */
export function recordsFromSnapshot(parsed: unknown): RawRecord[] {
  const data = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? (parsed as { data?: unknown }).data
      : undefined;
  if (!Array.isArray(data)) {
    throw new Error(
      "zrzut: oczekiwano tablicy rekordów albo obiektu z polem `data`",
    );
  }
  return data.filter(
    (r): r is RawRecord => r !== null && typeof r === "object",
  );
}
