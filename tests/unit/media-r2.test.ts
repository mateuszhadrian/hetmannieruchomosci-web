// Media R2 (2.5): kształt adresów transformacji; każdy `r2Key` w danych
// produkcyjnych i w fixture pasuje do wzorca klucza (manifesty też);
// tryb CHECK_REMOTE_MEDIA=1 — HEAD na każdy oryginał w zasobniku.
// Zewnętrzna sieć = flaky ⇒ ten ostatni biega wyłącznie poza ścieżką PR
// (ręcznie i w /release-check); żaden workflow nie ustawia zmiennej.
// Oferty czytane przez helper — plików może nie być (reguła testing.md).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IMG_VARIANTS, imgAt, mediaUrl } from "../../src/lib/img";
import {
  MAP_R2_KEY,
  MapsFileSchema,
  PHOTO_R2_KEY,
  PhotosFileSchema,
} from "../../src/lib/offers/schema";
import { MEDIA_BASE } from "../../src/lib/site-config";
import {
  DATA_DIR,
  FIXTURE_DIR,
  readFixtureOffers,
  readOffers,
  type OfferRecord,
} from "../helpers/offers";

function photoKeys(offers: OfferRecord[]): string[] {
  return offers.flatMap((o) =>
    Array.isArray(o.photos)
      ? (o.photos as Array<{ r2Key?: unknown }>).map((p) => String(p.r2Key))
      : [],
  );
}

function readManifest(dir: string, file: string): unknown {
  const path = join(dir, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

const sets = [
  { name: "data/", dir: DATA_DIR, offers: readOffers() },
  { name: "fixture", dir: FIXTURE_DIR, offers: readFixtureOffers() },
];

describe("kształt adresów", () => {
  it("adres transformacji zaczyna się od MEDIA_BASE/cdn-cgi/image/ i kończy kluczem", () => {
    const key = "offers/1/2-0123abcd.jpg";
    for (const v of Object.keys(IMG_VARIANTS) as Array<
      keyof typeof IMG_VARIANTS
    >) {
      const url = imgAt(key, v);
      if (!import.meta.env.DEV) {
        expect(url.startsWith(`${MEDIA_BASE}/cdn-cgi/image/`)).toBe(true);
      }
      expect(
        url.endsWith(key) || url.endsWith(key.replace(".jpg", ".webp")),
      ).toBe(true);
    }
  });
});

for (const set of sets) {
  describe(`klucze R2: ${set.name}`, () => {
    const keys = photoKeys(set.offers);

    it.skipIf(set.offers.length === 0)(
      "każdy photos[].r2Key pasuje do wzorca klucza zdjęcia",
      () => {
        expect(keys.length).toBeGreaterThan(0);
        for (const k of keys) expect(k).toMatch(PHOTO_R2_KEY);
      },
    );

    const photos = readManifest(set.dir, "photos.json");
    it.skipIf(photos === undefined)(
      "photos.json przechodzi schemat i zna każdy klucz ofert",
      () => {
        const parsed = PhotosFileSchema.parse(photos);
        const known = new Set(Object.values(parsed).map((e) => e.r2Key));
        for (const k of keys) expect(known.has(k)).toBe(true);
      },
    );

    const maps = readManifest(set.dir, "maps.json");
    it.skipIf(maps === undefined)("maps.json przechodzi schemat", () => {
      const parsed = MapsFileSchema.parse(maps);
      for (const e of Object.values(parsed))
        expect(e.r2Key).toMatch(MAP_R2_KEY);
    });
  });
}

describe.skipIf(!process.env.CHECK_REMOTE_MEDIA)(
  "CHECK_REMOTE_MEDIA: każdy oryginał w zasobniku odpowiada na HEAD",
  () => {
    const keys = [...new Set(sets.flatMap((s) => photoKeys(s.offers)))];
    it.skipIf(keys.length === 0 || MEDIA_BASE === "")(
      "wszystkie zdjęcia istnieją w R2",
      { timeout: 120_000 },
      async () => {
        const results = await Promise.all(
          keys.map(async (key) => {
            const url = mediaUrl(key);
            try {
              const res = await fetch(url, { method: "HEAD" });
              return { url, ok: res.ok, status: res.status };
            } catch (error) {
              return { url, ok: false, status: String(error) };
            }
          }),
        );
        const broken = results.filter((r) => !r.ok);
        expect(
          broken,
          `Niedostępne media:\n${broken.map((b) => `${b.status} ${b.url}`).join("\n")}`,
        ).toEqual([]);
      },
    );
  },
);
