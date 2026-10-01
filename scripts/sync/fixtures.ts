// `pnpm fixtures:build` (2.9, U10): zamrożony zestaw ofert do testów
// wizualnych — TEN SAM kod co sync (allow-lista → normalizacja →
// sanityzacja → zdjęcia → mapy → rejestr), w trybie plikowym:
//  - wejście: `ESTI_RAW_SNAPSHOT` (zrzut `list` w devtools/, poza repo)
//    + `tests/fixtures/offers/selection.json` (numery ofert i nadpisania);
//  - słownik: `ESTI_DICTIONARY_FILE` (prawdziwy, spoza repo);
//  - zdjęcia: GET z hosta CRM, zmniejszone do ~400 px WebP pod ścieżki
//    `fixtureMediaPath()`; mapy: Geoapify (`GEOAPIFY_KEY`), 600 px WebP;
//  - manifesty z kluczami R2 identycznymi z produkcją (hash treści).
// Uruchamia WYŁĄCZNIE Mateusz (żądania do sieci). Wyjście w całości
// nadpisuje `tests/fixtures/offers/` poza `selection.json`. Fixture jest
// niezależny od `data/` — poprzedni stan to pusty katalog tymczasowy.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { fixtureMediaPath } from "../../src/lib/img";
import { DATA_FILES } from "../../src/lib/offers/data";
import type { RawRecord } from "../../src/lib/offers/public-fields";
import {
  NormalizedOfferSchema,
  type NormalizedOffer,
} from "../../src/lib/offers/schema";
import {
  DictionarySchema,
  EMPTY_DICTIONARY,
  type Dictionary,
} from "./dictionary";
import type { FetchLike } from "./esti-client";
import {
  recordsFromSnapshot,
  runPipeline,
  type PipelineResult,
} from "./pipeline";
import type { R2Store } from "./r2";
import { publicSummary } from "./report";

export const FIXTURE_DIR = "tests/fixtures/offers";
export const SELECTION_FILE = "selection.json";
/** „Teraz" fixture'u — W PARZE z `BUILD_NOW` w skrypcie `build:visual`
 *  (package.json): nadpisanie `addedAt` pod „Nowość" liczy się względem
 *  tej daty. */
export const FIXTURE_NOW = new Date("2026-10-01T12:00:00+02:00");
/** dłuższy bok kopii zdjęcia / szerokość kopii mapy (px) */
export const FIXTURE_PHOTO_PX = 400;
export const FIXTURE_MAP_PX = 600;

const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);

export const OverrideSchema = z.strictObject({
  /** `null` = „Zapytaj o cenę" */
  price: z.number().positive().nullable().optional(),
  /** obniżka: musi być wyższa od ceny */
  previousPrice: z.number().positive().optional(),
  addedAt: isoDateTime.optional(),
  availableFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** indeksy zdjęć, które mają dostać `kind: "plan"` (ujemne = od końca) */
  planPhotos: z.array(z.number().int()).optional(),
});
export type Override = z.infer<typeof OverrideSchema>;

export const SelectionSchema = z.strictObject({
  $comment: z.string().optional(),
  numbers: z.array(z.string().regex(/^[A-Z]+\d+$/)).min(1),
  overrides: z.record(z.string(), OverrideSchema).default({}),
});
export type Selection = z.infer<typeof SelectionSchema>;

/** Nadpisania fixture'u na ofercie po normalizacji (przed zdjęciami). */
export function applyOverride(
  offer: NormalizedOffer,
  override: Override,
): NormalizedOffer {
  const next: NormalizedOffer = { ...offer, photos: [...offer.photos] };
  if (override.price !== undefined) {
    next.price = override.price;
    if (override.price === null) {
      next.pricePerM2 = null;
      delete next.previousPrice;
      delete next.lowestPrice30d;
    } else {
      next.pricePerM2 = Math.round((override.price / next.area) * 100) / 100;
    }
  }
  if (override.previousPrice !== undefined) {
    if (next.price === null || override.previousPrice <= next.price) {
      throw new Error(
        `${offer.number}: previousPrice musi być wyższa od ceny oferty`,
      );
    }
    next.previousPrice = override.previousPrice;
  }
  if (override.addedAt !== undefined) next.addedAt = override.addedAt;
  if (override.availableFrom !== undefined)
    next.availableFrom = override.availableFrom;
  for (const idx of override.planPhotos ?? []) {
    const i = idx < 0 ? next.photos.length + idx : idx;
    if (i < 0 || i >= next.photos.length) {
      throw new Error(
        `${offer.number}: planPhotos[${idx}] poza zakresem (${next.photos.length} zdjęć)`,
      );
    }
    next.photos[i] = { ...next.photos[i], kind: "plan" };
  }
  return NormalizedOfferSchema.parse(next);
}

/** Magazyn fixture'u: zamiast R2 — zmniejszone kopie WebP na dysku pod
 *  ścieżkami `fixtureMediaPath(r2Key)` (prefiks `/media/` → katalog). */
export function createFixtureStore(
  mediaDir: string,
): R2Store & { files: string[] } {
  const stats = { puts: 0, deletes: 0, lists: 0 };
  const files: string[] = [];
  return {
    stats,
    files,
    async put(key, body) {
      stats.puts += 1;
      const rel = fixtureMediaPath(key).replace(/^\/media\//, "");
      const out = join(mediaDir, rel);
      mkdirSync(dirname(out), { recursive: true });
      const img = sharp(body).rotate();
      const resized = key.startsWith("maps/")
        ? img.resize({ width: FIXTURE_MAP_PX, withoutEnlargement: true })
        : img.resize({
            width: FIXTURE_PHOTO_PX,
            height: FIXTURE_PHOTO_PX,
            fit: "inside",
            withoutEnlargement: true,
          });
      writeFileSync(out, await resized.webp({ quality: 80 }).toBuffer());
      files.push(out);
    },
    async list() {
      stats.lists += 1;
      return [];
    },
    async remove(keys) {
      stats.deletes += keys.length;
    },
  };
}

export interface BuildFixtureOptions {
  records: readonly RawRecord[];
  dictionary: Dictionary;
  selection: Selection;
  outDir: string;
  photoFetch?: FetchLike;
  mapFetch?: FetchLike;
  geoapifyKey?: string;
  skipMaps?: boolean;
  now?: Date;
}

/** Buduje fixture do `outDir` (czyści poprzednie generaty, zostawia
 *  `selection.json`). */
export async function buildFixture(
  options: BuildFixtureOptions,
): Promise<PipelineResult & { mediaFiles: string[] }> {
  const wanted = new Set(options.selection.numbers);
  const records = options.records.filter(
    (r) => typeof r.number === "string" && wanted.has(r.number),
  );
  const found = new Set(records.map((r) => r.number as string));
  const missing = options.selection.numbers.filter((n) => !found.has(n));
  if (missing.length) {
    throw new Error(`w zrzucie nie ma ofert: ${missing.join(", ")}`);
  }

  for (const f of Object.values(DATA_FILES)) {
    rmSync(join(options.outDir, f), { force: true });
  }
  const mediaDir = join(options.outDir, "media");
  rmSync(mediaDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });
  const store = createFixtureStore(mediaDir);
  const previousDir = mkdtempSync(join(tmpdir(), "hetman-fixture-prev-"));

  try {
    const result = await runPipeline(
      {
        source: { kind: "file", records, dictionary: options.dictionary },
        store,
        photoFetch: options.photoFetch,
        mapFetch: options.mapFetch,
        geoapifyKey: options.geoapifyKey,
        transformOffers: (offers) =>
          offers.map((o) => {
            const override = options.selection.overrides[o.number];
            return override ? applyOverride(o, override) : o;
          }),
      },
      {
        previousDir,
        outDir: options.outDir,
        skipMaps: options.skipMaps,
        force: true,
        now: options.now ?? FIXTURE_NOW,
      },
    );
    return { ...result, mediaFiles: store.files };
  } finally {
    rmSync(previousDir, { recursive: true, force: true });
  }
}

export function readSelection(path: string): Selection {
  return SelectionSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

async function main(argv: readonly string[]): Promise<number> {
  const skipMaps = argv.includes("--skip-maps");
  const outArg = argv.find((a) => a.startsWith("--out="));
  const outDir = outArg ? outArg.slice("--out=".length) : FIXTURE_DIR;
  const env = process.env;
  if (!env.ESTI_RAW_SNAPSHOT) {
    console.error("fixtures:build: brak ESTI_RAW_SNAPSHOT (zrzut `list`)");
    return 1;
  }
  if (!skipMaps && !env.GEOAPIFY_KEY) {
    console.error("fixtures:build: brak GEOAPIFY_KEY (albo użyj --skip-maps)");
    return 1;
  }
  let dictionary = EMPTY_DICTIONARY;
  if (env.ESTI_DICTIONARY_FILE) {
    dictionary = DictionarySchema.parse(
      JSON.parse(readFileSync(env.ESTI_DICTIONARY_FILE, "utf8")),
    );
  } else {
    console.log(
      "fixtures:build: brak ESTI_DICTIONARY_FILE — etykiety słownikowe będą puste (DICT_MISS)",
    );
  }
  const selectionPath = join(outDir, SELECTION_FILE);
  if (!existsSync(selectionPath)) {
    console.error(`fixtures:build: brak ${selectionPath}`);
    return 1;
  }
  const result = await buildFixture({
    records: recordsFromSnapshot(
      JSON.parse(readFileSync(env.ESTI_RAW_SNAPSHOT, "utf8")),
    ),
    dictionary,
    selection: readSelection(selectionPath),
    outDir,
    geoapifyKey: env.GEOAPIFY_KEY,
    skipMaps,
  });
  console.log(publicSummary(result.report));
  console.log(
    `fixture: ${result.offers.length} ofert, ${result.mediaFiles.length} plików media → ${outDir}`,
  );
  for (const w of result.report.warnings) {
    // fixture = oferty publiczne; numery wolno pokazać lokalnie
    console.log(`  ${w.code} ${w.number ?? ""} ${w.detail ?? ""}`.trimEnd());
  }
  return result.outcome === "ok" ? 0 : 1;
}

if (
  process.argv[1] &&
  /scripts[\\/]sync[\\/]fixtures\.ts$/.test(process.argv[1])
) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(`fixtures:build: ${(e as Error).message}`);
      process.exit(1);
    },
  );
}
