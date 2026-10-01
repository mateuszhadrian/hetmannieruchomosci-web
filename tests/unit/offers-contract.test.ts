// Kontrakt danych ofert (2.9) — na `data/` ORAZ na fixture, przez helper
// (plików może nie być → skip z powodem): schemat strict każdego pliku,
// brak kluczy z FORBIDDEN_FIELDS (skan głęboki), zdjęcia: `photos[0]` to
// zdjęcie główne (kolejność z API, pierwsze = główne — part3 §1.4),
// unikalne id, klucz R2 z id oferty; manifesty znają każdy klucz; rejestr
// adresów zna aktualny adres każdej oferty.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DATA_FILES } from "../../src/lib/offers/data";
import { coordKey } from "../../src/lib/offers/map-key";
import { findForbiddenKeys } from "../../src/lib/offers/public-fields";
import {
  LegacyRedirectsSchema,
  LocationsFileSchema,
  MapsFileSchema,
  OffersFileSchema,
  PhotosFileSchema,
  UrlLedgerSchema,
} from "../../src/lib/offers/schema";
import { offerPath } from "../../src/lib/offers/urls";
import {
  DATA_DIR,
  FIXTURE_DIR,
  readFixtureOffers,
  readOffers,
} from "../helpers/offers";

const sets = [
  { name: "data/", dir: DATA_DIR, raw: readOffers() },
  { name: "fixture", dir: FIXTURE_DIR, raw: readFixtureOffers() },
];

function readJson(dir: string, file: string): unknown {
  const path = join(dir, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

for (const set of sets) {
  describe.skipIf(set.raw.length === 0)(`kontrakt danych: ${set.name}`, () => {
    const offers = OffersFileSchema.parse(set.raw);

    it("offers.json: schemat strict, numery unikalne, brak kluczy zabronionych", () => {
      expect(new Set(offers.map((o) => o.number)).size).toBe(offers.length);
      expect(findForbiddenKeys(set.raw)).toEqual([]);
    });

    it("zdjęcia: photos[0] = główne (kind photo), id unikalne, klucz z id oferty", () => {
      for (const o of offers) {
        const ids = o.photos.map((p) => p.id);
        expect(new Set(ids).size, o.number).toBe(ids.length);
        if (o.photos.some((p) => p.kind === "photo")) {
          expect(o.photos[0].kind, o.number).toBe("photo");
        }
        for (const p of o.photos) {
          expect(
            p.r2Key.startsWith(`offers/${o.crmId}/${p.id}-`),
            o.number,
          ).toBe(true);
        }
      }
    });

    for (const [file, schema] of [
      [DATA_FILES.locations, LocationsFileSchema],
      [DATA_FILES.photos, PhotosFileSchema],
      [DATA_FILES.maps, MapsFileSchema],
      [DATA_FILES.ledger, UrlLedgerSchema],
      [DATA_FILES.legacy, LegacyRedirectsSchema],
    ] as const) {
      const json = readJson(set.dir, file);
      it.skipIf(json === undefined)(
        `${file}: schemat strict, bez kluczy zabronionych`,
        () => {
          schema.parse(json);
          expect(findForbiddenKeys(json)).toEqual([]);
        },
      );
    }

    const photos = readJson(set.dir, DATA_FILES.photos);
    it.skipIf(photos === undefined)(
      "photos.json zna każdy klucz zdjęcia ofert",
      () => {
        const known = new Set(
          Object.values(PhotosFileSchema.parse(photos)).map((e) => e.r2Key),
        );
        for (const o of offers)
          for (const p of o.photos)
            expect(known.has(p.r2Key), p.r2Key).toBe(true);
      },
    );

    const maps = readJson(set.dir, DATA_FILES.maps);
    it.skipIf(maps === undefined)(
      "maps.json: wpis dla punktu oferty nie ma goneSince",
      () => {
        const parsed = MapsFileSchema.parse(maps);
        for (const o of offers) {
          const entry = parsed[coordKey(o.location.lat, o.location.lon)];
          if (entry) expect(entry.goneSince, o.number).toBeUndefined();
        }
      },
    );

    const ledger = readJson(set.dir, DATA_FILES.ledger);
    it.skipIf(ledger === undefined)(
      "url-ledger.json: ostatnia ścieżka = aktualny adres oferty",
      () => {
        const parsed = UrlLedgerSchema.parse(ledger);
        for (const o of offers)
          expect(parsed[o.number]?.at(-1), o.number).toBe(offerPath(o));
      },
    );

    it("lokalizacje: liczniki węzłów sumują się do liczby ofert na poziomie województwa", () => {
      const loc = readJson(set.dir, DATA_FILES.locations);
      if (loc === undefined) return;
      const nodes = LocationsFileSchema.parse(loc).nodes;
      const provinces = nodes.filter((n) => n.level === "province");
      expect(provinces.reduce((s, n) => s + n.count, 0)).toBe(offers.length);
    });
  });
}

describe("kontrakt danych: brak danych", () => {
  it("bez data/ i fixture'u test nie wywraca się (pusty stan dopuszczalny)", () => {
    expect(Array.isArray(readOffers())).toBe(true);
    expect(Array.isArray(readFixtureOffers())).toBe(true);
  });
});
