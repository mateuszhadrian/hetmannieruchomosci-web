// `fixtures:build` (2.9) na danych SYNTETYCZNYCH do katalogu tymczasowego,
// zdjęcia i mapy z atrap: dobór po `selection.numbers`, nadpisania
// (`price: null`, obniżka, `addedAt`, zdjęcie typu plan), kopie WebP
// ≤ 400 px pod ścieżkami `fixtureMediaPath()`, manifesty z kluczami
// wg wzorca produkcyjnego, `selection.json` nietknięty, brak ofert
// spoza zrzutu = błąd. Prawdziwy `selection.json` przechodzi schemat.
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../../scripts/sync/esti-client";
import {
  FIXTURE_DIR,
  FIXTURE_NOW,
  FIXTURE_PHOTO_PX,
  SELECTION_FILE,
  applyOverride,
  buildFixture,
  readSelection,
} from "../../scripts/sync/fixtures";
import { MAP_HEIGHT, MAP_SCALE, MAP_WIDTH } from "../../scripts/sync/maps";
import { normalize } from "../../scripts/sync/normalize";
import { fixtureMediaPath } from "../../src/lib/img";
import { clearOffersDataCache, DATA_FILES } from "../../src/lib/offers/data";
import { isNewOffer } from "../../src/lib/offers/time-rules";
import {
  MAP_R2_KEY,
  MapsFileSchema,
  OffersFileSchema,
  PHOTO_R2_KEY,
  PhotosFileSchema,
} from "../../src/lib/offers/schema";
import { readSyntheticDictionary, readSyntheticList } from "../helpers/raw";

const dictionary = readSyntheticDictionary();
const records = readSyntheticList();
let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
  clearOffersDataCache();
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "hetman-fixture-"));
  dirs.push(d);
  return d;
};

async function jpeg(seed: number) {
  return new Uint8Array(
    await sharp({
      create: {
        width: 1200,
        height: seed % 2 ? 900 : 1600,
        channels: 3,
        background: "#8aa",
      },
    })
      .jpeg()
      .toBuffer(),
  );
}
const photoFetch: FetchLike = async (url) =>
  new Response(
    (await jpeg(Number(/(\d+)_max/.exec(url)?.[1]))) as unknown as BodyInit,
    {
      status: 200,
      headers: { etag: `"f-${url.length}"` },
    },
  );
const mapFetch: FetchLike = async () =>
  new Response(
    (await sharp({
      create: {
        width: MAP_WIDTH * MAP_SCALE,
        height: MAP_HEIGHT * MAP_SCALE,
        channels: 3,
        background: "#ddd",
      },
    })
      .png()
      .toBuffer()) as unknown as BodyInit,
    { status: 200 },
  );

const selection = {
  numbers: ["SW900001", "SW900002", "SW900003"],
  overrides: {
    SW900001: { previousPrice: 999_999 },
    SW900002: { price: null },
    SW900003: { addedAt: "2026-09-27T10:00:00+02:00", planPhotos: [-1] },
  },
};

describe("buildFixture()", () => {
  it("buduje komplet plików i kopie WebP; nadpisania zastosowane", async () => {
    const out = tmp();
    writeFileSync(join(out, SELECTION_FILE), JSON.stringify(selection));
    const result = await buildFixture({
      records,
      dictionary,
      selection,
      outDir: out,
      photoFetch,
      mapFetch,
      geoapifyKey: "geo-test",
    });
    expect(result.outcome).toBe("ok");
    const offers = OffersFileSchema.parse(
      JSON.parse(readFileSync(join(out, DATA_FILES.offers), "utf8")),
    );
    expect(offers.map((o) => o.number)).toEqual(selection.numbers);
    const byNumber = Object.fromEntries(offers.map((o) => [o.number, o]));
    expect(byNumber.SW900001.previousPrice).toBe(999_999);
    expect(byNumber.SW900002.price).toBeNull();
    expect(byNumber.SW900002.pricePerM2).toBeNull();
    expect(isNewOffer(byNumber.SW900003.addedAt, FIXTURE_NOW)).toBe(true);
    expect(byNumber.SW900003.photos.at(-1)?.kind).toBe("plan");
    // kopie: każdy klucz R2 → plik WebP ≤ 400 px pod fixtureMediaPath()
    for (const o of offers) {
      for (const p of o.photos) {
        expect(p.r2Key).toMatch(PHOTO_R2_KEY);
        const file = join(out, fixtureMediaPath(p.r2Key).slice(1));
        expect(existsSync(file), file).toBe(true);
        const meta = await sharp(file).metadata();
        expect(meta.format).toBe("webp");
        expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(
          FIXTURE_PHOTO_PX,
        );
      }
    }
    const photos = PhotosFileSchema.parse(
      JSON.parse(readFileSync(join(out, DATA_FILES.photos), "utf8")),
    );
    expect(Object.keys(photos)).toHaveLength(6);
    const maps = MapsFileSchema.parse(
      JSON.parse(readFileSync(join(out, DATA_FILES.maps), "utf8")),
    );
    for (const e of Object.values(maps)) {
      expect(e.r2Key).toMatch(MAP_R2_KEY);
      expect(existsSync(join(out, fixtureMediaPath(e.r2Key).slice(1)))).toBe(
        true,
      );
    }
    expect(result.mediaFiles.length).toBe(6 + Object.keys(maps).length);
    // selection.json zostaje
    expect(existsSync(join(out, SELECTION_FILE))).toBe(true);
  });

  it("numer spoza zrzutu = błąd z listą brakujących", async () => {
    const out = tmp();
    await expect(
      buildFixture({
        records,
        dictionary,
        selection: { numbers: ["SW900001", "SW000000"], overrides: {} },
        outDir: out,
        photoFetch,
        mapFetch,
        skipMaps: true,
      }),
    ).rejects.toThrow(/SW000000/);
  });
});

describe("applyOverride()", () => {
  const offer = normalize(records[0], { dictionary }).offer;
  it("obniżka musi być wyższa od ceny; indeks planu w zakresie", () => {
    expect(() => applyOverride(offer, { previousPrice: 1 })).toThrow(
      /previousPrice/,
    );
    expect(() => applyOverride(offer, { planPhotos: [99] })).toThrow(
      /planPhotos/,
    );
    expect(() =>
      applyOverride({ ...offer, price: null }, { previousPrice: 5 }),
    ).toThrow();
  });
  it("nie mutuje wejścia", () => {
    const out = applyOverride(offer, { price: null, planPhotos: [0] });
    expect(offer.price).not.toBeNull();
    expect(offer.photos[0].kind).toBe("photo");
    expect(out.photos[0].kind).toBe("plan");
  });
});

describe("tests/fixtures/offers/selection.json", () => {
  it("przechodzi schemat: 8–10 numerów, nadpisania tylko dla wybranych", () => {
    const sel = readSelection(join(FIXTURE_DIR, SELECTION_FILE));
    expect(sel.numbers.length).toBeGreaterThanOrEqual(8);
    expect(sel.numbers.length).toBeLessThanOrEqual(10);
    expect(new Set(sel.numbers).size).toBe(sel.numbers.length);
    for (const n of Object.keys(sel.overrides))
      expect(sel.numbers).toContain(n);
  });
});
