// Orkiestracja syncu (2.8) w trybie plikowym na danych SYNTETYCZNYCH:
// zdjęcia i mapy z atrap, zasobnik dry-run, katalogi tymczasowe.
// Pierwszy bieg zapisuje 5 plików; powtórka bez zmian = brak zapisu;
// bezpieczniki (0 ofert, spadek o połowę) przerywają bez zapisu, `force`
// je omija; dry-run nic nie pisze; przebudowa zależna od daty; wyjście
// publiczne bez numerów ofert; CLI: flagi, wymagane zmienne, GITHUB_OUTPUT.
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../../scripts/sync/esti-client";
import { main, missingEnv, parseArgs } from "../../scripts/sync/index";
import { MAP_HEIGHT, MAP_SCALE, MAP_WIDTH } from "../../scripts/sync/maps";
import {
  recordsFromSnapshot,
  runPipeline,
  type PipelineDeps,
} from "../../scripts/sync/pipeline";
import { createDryRunStore } from "../../scripts/sync/r2";
import { publicSummary } from "../../scripts/sync/report";
import { clearOffersDataCache, DATA_FILES } from "../../src/lib/offers/data";
import { findForbiddenKeys } from "../../src/lib/offers/public-fields";
import {
  LocationsFileSchema,
  MapsFileSchema,
  OffersFileSchema,
  PhotosFileSchema,
  UrlLedgerSchema,
} from "../../src/lib/offers/schema";
import type { RawRecord } from "../../src/lib/offers/public-fields";
import {
  FORBIDDEN_SENTINEL,
  readSyntheticDictionary,
  readSyntheticList,
} from "../helpers/raw";

const NOW = new Date("2026-10-01T04:15:00+02:00");
const dictionary = readSyntheticDictionary();
const records = readSyntheticList();

let dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "hetman-sync-"));
  dirs.push(d);
  return d;
};
beforeEach(() => clearOffersDataCache());
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
  clearOffersDataCache();
});

async function jpeg(seed: number) {
  return new Uint8Array(
    await sharp({
      create: {
        width: 1200,
        height: 900,
        channels: 3,
        background: { r: (seed * 37) % 256, g: 80, b: seed % 256 },
      },
    })
      .jpeg({ quality: 60 })
      .toBuffer(),
  );
}
async function png() {
  return new Uint8Array(
    await sharp({
      create: {
        width: MAP_WIDTH * MAP_SCALE,
        height: MAP_HEIGHT * MAP_SCALE,
        channels: 3,
        background: "#ccc",
      },
    })
      .png()
      .toBuffer(),
  );
}

function photoServer() {
  const requests: string[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    requests.push(url);
    const id = Number(/(\d+)_max\.jpg$/.exec(url)?.[1] ?? 1);
    if (init?.headers?.["if-none-match"] === `"e-${id}"`)
      return new Response(null, { status: 304 });
    return new Response((await jpeg(id)) as unknown as BodyInit, {
      status: 200,
      headers: { etag: `"e-${id}"`, "content-type": "image/jpeg" },
    });
  };
  return { fetchImpl, requests };
}
function mapServer() {
  const requests: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    requests.push(url);
    return new Response((await png()) as unknown as BodyInit, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  };
  return { fetchImpl, requests };
}

function deps(
  recs: readonly RawRecord[] = records,
  extra: Partial<PipelineDeps> = {},
): PipelineDeps {
  return {
    source: { kind: "file", records: recs, dictionary },
    store: createDryRunStore(),
    photoFetch: photoServer().fetchImpl,
    mapFetch: mapServer().fetchImpl,
    geoapifyKey: "geo-test-key",
    ...extra,
  };
}

const ALL_FILES = Object.values(DATA_FILES).filter(
  (f) => f !== DATA_FILES.legacy,
);

describe("runPipeline() — tryb plikowy", () => {
  it("pierwszy bieg: 5 plików, schematy strict, bez pól zabronionych", async () => {
    const out = tmp();
    const res = await runPipeline(deps(), {
      previousDir: join(out, "brak"),
      outDir: out,
      now: NOW,
    });
    expect(res.outcome).toBe("ok");
    expect(res.changed).toBe(true);
    expect(res.written).toBe(out);
    for (const f of ALL_FILES) expect(existsSync(join(out, f))).toBe(true);
    const read = (f: string) => JSON.parse(readFileSync(join(out, f), "utf8"));
    const offers = OffersFileSchema.parse(read(DATA_FILES.offers));
    expect(offers).toHaveLength(4);
    expect(offers.map((o) => o.number)).toEqual(
      [...offers.map((o) => o.number)].sort(),
    );
    LocationsFileSchema.parse(read(DATA_FILES.locations));
    const photos = PhotosFileSchema.parse(read(DATA_FILES.photos));
    expect(Object.keys(photos)).toHaveLength(6);
    const maps = MapsFileSchema.parse(read(DATA_FILES.maps));
    expect(Object.keys(maps).length).toBeGreaterThan(0);
    const ledger = UrlLedgerSchema.parse(read(DATA_FILES.ledger));
    expect(Object.keys(ledger)).toHaveLength(4);
    for (const f of ALL_FILES) {
      const text = readFileSync(join(out, f), "utf8");
      expect(text).not.toContain(FORBIDDEN_SENTINEL);
      expect(findForbiddenKeys(JSON.parse(text))).toEqual([]);
    }
    expect(res.report.stats.photos?.uploaded).toBe(6);
    expect(res.report.stats.maps?.requested).toBeGreaterThan(0);
  });

  it("powtórka na tym samym stanie: bez zmian = brak zapisu", async () => {
    const data = tmp();
    await runPipeline(deps(), { previousDir: data, outDir: data, now: NOW });
    const stamp = readFileSync(join(data, DATA_FILES.offers), "utf8");
    clearOffersDataCache();
    const again = await runPipeline(deps(), {
      previousDir: data,
      outDir: data,
      now: NOW,
    });
    expect(again.outcome).toBe("no-changes");
    expect(again.changed).toBe(false);
    expect(again.written).toBeNull();
    expect(readFileSync(join(data, DATA_FILES.offers), "utf8")).toBe(stamp);
    // ETag-i znane → 304, nic nie wgrano
    expect(again.report.stats.photos?.unchanged).toBe(6);
    expect(again.report.stats.photos?.uploaded).toBe(0);
    expect(again.report.stats.maps?.requested).toBe(0);
  });

  it("katalog wyjściowy inny niż poprzedni (lokalnie): pliki zawsze zapisane", async () => {
    const data = tmp();
    const out = tmp();
    await runPipeline(deps(), { previousDir: data, outDir: data, now: NOW });
    clearOffersDataCache();
    const res = await runPipeline(deps(), {
      previousDir: data,
      outDir: out,
      now: NOW,
    });
    expect(res.outcome).toBe("no-changes");
    expect(res.written).toBe(out);
    expect(existsSync(join(out, DATA_FILES.offers))).toBe(true);
  });

  it("bezpiecznik: 0 widocznych ofert → przerwanie bez zapisu", async () => {
    const out = tmp();
    const hidden = records.map((r) => ({ ...r, status: 9, offerExport: 0 }));
    const res = await runPipeline(deps(hidden), {
      previousDir: join(out, "brak"),
      outDir: out,
      now: NOW,
    });
    expect(res.outcome).toBe("aborted");
    expect(res.written).toBeNull();
    expect(existsSync(join(out, DATA_FILES.offers))).toBe(false);
    expect(res.report.errors?.[0]).toMatch(/0 widocznych/);
  });

  it("bezpiecznik: spadek o ponad połowę → przerwanie; force omija", async () => {
    const data = tmp();
    await runPipeline(deps(), { previousDir: data, outDir: data, now: NOW });
    const before = readFileSync(join(data, DATA_FILES.offers), "utf8");
    clearOffersDataCache();
    const one = records.slice(0, 1);
    const aborted = await runPipeline(deps(one), {
      previousDir: data,
      outDir: data,
      now: NOW,
    });
    expect(aborted.outcome).toBe("aborted");
    expect(aborted.report.errors?.[0]).toMatch(/połowę/);
    expect(readFileSync(join(data, DATA_FILES.offers), "utf8")).toBe(before);
    // diff widoczności do raportu prywatnego: 3 zniknęły (status z listy)
    expect(aborted.report.visibility?.gone).toHaveLength(3);
    clearOffersDataCache();
    const forced = await runPipeline(deps(one), {
      previousDir: data,
      outDir: data,
      now: NOW,
      force: true,
    });
    expect(forced.outcome).toBe("ok");
    expect(
      OffersFileSchema.parse(
        JSON.parse(readFileSync(join(data, DATA_FILES.offers), "utf8")),
      ),
    ).toHaveLength(1);
    // manifest zdjęć: wpisy ofert, które zniknęły, dostają goneSince
    const photos = PhotosFileSchema.parse(
      JSON.parse(readFileSync(join(data, DATA_FILES.photos), "utf8")),
    );
    expect(
      Object.values(photos).filter((e) => e.goneSince === "2026-10-01"),
    ).toHaveLength(4);
    // rejestr tylko dopisuje — stare numery zostają
    const ledger = UrlLedgerSchema.parse(
      JSON.parse(readFileSync(join(data, DATA_FILES.ledger), "utf8")),
    );
    expect(Object.keys(ledger)).toHaveLength(4);
  });

  it("dry-run: nic nie zapisuje, zasobnik liczy operacje", async () => {
    const out = tmp();
    const store = createDryRunStore();
    const res = await runPipeline(deps(records, { store }), {
      previousDir: join(out, "brak"),
      outDir: out,
      dryRun: true,
      now: NOW,
    });
    expect(res.outcome).toBe("dry-run");
    expect(res.written).toBeNull();
    expect(existsSync(join(out, DATA_FILES.offers))).toBe(false);
    expect(store.stats.puts).toBeGreaterThan(0);
  });

  it("skip-photos i skip-maps: bez żądań; nowe zdjęcia i mapy odłożone z ostrzeżeniem", async () => {
    const out = tmp();
    const photos = photoServer();
    const maps = mapServer();
    const res = await runPipeline(
      deps(records, {
        photoFetch: photos.fetchImpl,
        mapFetch: maps.fetchImpl,
        geoapifyKey: undefined,
      }),
      {
        previousDir: join(out, "brak"),
        outDir: out,
        skipPhotos: true,
        skipMaps: true,
        now: NOW,
      },
    );
    expect(photos.requests).toEqual([]);
    expect(maps.requests).toEqual([]);
    const codes = new Set(res.report.warnings.map((w) => w.code));
    expect(codes.has("PHOTO_FETCH")).toBe(true);
    expect(codes.has("MAP_FETCH")).toBe(true);
    const offers = OffersFileSchema.parse(
      JSON.parse(readFileSync(join(out, DATA_FILES.offers), "utf8")),
    );
    expect(offers.every((o) => o.photos.length === 0)).toBe(true);
  });

  it("przebudowa zależna od daty: dzień, w którym mija próg Nowość", async () => {
    const out = tmp();
    // SW900004 dodana 2026-09-25 → nowość do 2026-10-09 włącznie
    const run = (now: Date) =>
      runPipeline(deps(), {
        previousDir: join(out, "brak"),
        outDir: out,
        dryRun: true,
        now,
      });
    expect((await run(new Date("2026-10-09T04:15:00+02:00"))).rebuild).toBe(
      false,
    );
    expect((await run(new Date("2026-10-10T04:15:00+02:00"))).rebuild).toBe(
      true,
    );
    expect((await run(new Date("2026-10-11T04:15:00+02:00"))).rebuild).toBe(
      false,
    );
  });

  it("wyjście publiczne nie zawiera numerów ofert ani wartowników", async () => {
    const out = tmp();
    const res = await runPipeline(deps(), {
      previousDir: join(out, "brak"),
      outDir: out,
      now: NOW,
    });
    const summary = publicSummary(res.report);
    expect(summary).not.toMatch(/SW9\d{5}/);
    expect(summary).not.toContain(FORBIDDEN_SENTINEL);
    expect(summary).toContain("oferty widoczne: 4");
  });

  it("zły poprzedni stan = błąd przebiegu (nie cicha nadpiska)", async () => {
    const data = tmp();
    await runPipeline(deps(), { previousDir: data, outDir: data, now: NOW });
    clearOffersDataCache();
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(data, DATA_FILES.ledger), '{"sw1":[]}');
    await expect(
      runPipeline(deps(), { previousDir: data, outDir: data, now: NOW }),
    ).rejects.toThrow(/poprzedni stan/);
  });
});

describe("recordsFromSnapshot()", () => {
  it("przyjmuje tablicę i obiekt z `data`; inne kształty odrzuca", () => {
    expect(recordsFromSnapshot([{ a: 1 }])).toHaveLength(1);
    expect(
      recordsFromSnapshot({ success: true, data: [{ a: 1 }, null] }),
    ).toHaveLength(1);
    expect(() => recordsFromSnapshot({ x: 1 })).toThrow();
  });
});

describe("CLI", () => {
  it("parseArgs: flagi i wartości domyślne", () => {
    const a = parseArgs([
      "--source=file",
      "--dry-run",
      "--skip-photos",
      "--skip-maps",
      "--force",
      "--out=/tmp/x",
      "--report=none",
    ]);
    expect(a).toMatchObject({
      source: "file",
      dryRun: true,
      skipPhotos: true,
      skipMaps: true,
      force: true,
      out: "/tmp/x",
      report: "none",
      prev: "data",
    });
    expect(parseArgs([]).source).toBe("api");
    // pnpm przekazuje separator `--` dosłownie
    expect(parseArgs(["--", "--report=stdout"]).report).toBe("stdout");
    expect(() => parseArgs(["--source=xml"])).toThrow();
    expect(() => parseArgs(["--nope"])).toThrow();
  });

  it("missingEnv: zależy od trybu (api/file, dry-run, skip-maps)", () => {
    expect(missingEnv(parseArgs([]), {})).toEqual([
      "ESTICRM_COMPANY",
      "ESTICRM_TOKEN",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "GEOAPIFY_KEY",
    ]);
    expect(
      missingEnv(parseArgs(["--source=file", "--dry-run", "--skip-maps"]), {
        ESTI_RAW_SNAPSHOT: "x",
      }),
    ).toEqual([]);
  });

  it("main(): tryb plikowy dry-run bez sieci, GITHUB_OUTPUT z outcome/changed/rebuild", async () => {
    const out = tmp();
    const ghOut = join(out, "gh-output.txt");
    const code = await main(
      [
        "--source=file",
        "--dry-run",
        "--skip-photos",
        "--skip-maps",
        "--report=none",
        `--out=${out}`,
        `--prev=${join(out, "brak")}`,
      ],
      {
        ESTI_RAW_SNAPSHOT: fileURLToPath(
          new URL("../fixtures/raw/synthetic-list.json", import.meta.url),
        ),
        ESTI_DICTIONARY_FILE: fileURLToPath(
          new URL("../fixtures/raw/dictionary-synthetic.json", import.meta.url),
        ),
        GITHUB_OUTPUT: ghOut,
      },
    );
    expect(code).toBe(0);
    const lines = readFileSync(ghOut, "utf8").trim().split("\n");
    expect(lines).toContain("outcome=dry-run");
    expect(lines).toContain("changed=true");
    expect(lines).toContain("rebuild=false");
    expect(existsSync(join(out, DATA_FILES.offers))).toBe(false);
  });

  it("main(): brak zmiennych = kod 1 z nazwami zmiennych (bez wartości)", async () => {
    expect(await main([], {})).toBe(1);
  });
});
