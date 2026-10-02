// Kontrakt indeksu wyszukiwarki (`src/lib/offers/index-entry.ts`, D30):
// wpis ma WYŁĄCZNIE klucze z allow-listy `INDEX_FIELDS` (zagnieżdżone:
// `INDEX_LOCATION_FIELDS`, `INDEX_PHOTO_FIELDS`), żadnej nazwy
// z FORBIDDEN_FIELDS, bez opisu HTML; adres = `offerPath`; tekst do
// „szukaj w opisie" bez tagów, znormalizowany, z tytułem. Na danych
// syntetycznych (wartownik w polach zabronionych) oraz na fixture
// i `data/` przez helper (skip bez plików).
import { describe, expect, it } from "vitest";
import {
  buildIndex,
  buildIndexText,
  INDEX_FIELDS,
  INDEX_LOCATION_FIELDS,
  INDEX_PHOTO_FIELDS,
  toIndexEntry,
  toIndexText,
} from "../../src/lib/offers/index-entry";
import { leafId } from "../../src/lib/offers/location-path";
import { findForbiddenKeys } from "../../src/lib/offers/public-fields";
import { normalizeText } from "../../src/lib/offers/text";
import { offerPath } from "../../src/lib/offers/urls";
import { EMPTY_LOCATIONS } from "../../src/lib/offers/data";
import { readOffersTyped } from "../helpers/offers";
import { FORBIDDEN_SENTINEL, syntheticFullOffers } from "../helpers/raw";

const synthetic = syntheticFullOffers();

function expectKeysWithin(
  obj: object,
  allowed: readonly string[],
  label: string,
) {
  for (const key of Object.keys(obj)) {
    expect(allowed, `${label}: klucz „${key}" spoza allow-listy`).toContain(
      key,
    );
  }
}

describe("toIndexEntry (dane syntetyczne)", () => {
  it("klucze wpisu, lokalizacji i zdjęcia ⊆ allow-listy; brak pól zabronionych i opisu", () => {
    for (const o of synthetic) {
      const e = toIndexEntry(o);
      expectKeysWithin(e, INDEX_FIELDS, o.number);
      expectKeysWithin(
        e.location,
        INDEX_LOCATION_FIELDS,
        `${o.number}.location`,
      );
      if (e.photo)
        expectKeysWithin(e.photo, INDEX_PHOTO_FIELDS, `${o.number}.photo`);
      expect(findForbiddenKeys(e)).toEqual([]);
      expect(JSON.stringify(e)).not.toContain("descriptionHtml");
      expect(JSON.stringify(e)).not.toContain(FORBIDDEN_SENTINEL);
    }
  });

  it("pola pochodne: path, nodeId, zdjęcie główne, liczniki i flagi mediów", () => {
    const withMedia = toIndexEntry(synthetic[0]);
    expect(withMedia.path).toBe(offerPath(synthetic[0]));
    expect(withMedia.location.nodeId).toBe(leafId(synthetic[0].location));
    expect(withMedia.photo).toEqual({
      r2Key: synthetic[0].photos[0].r2Key,
      width: 1200,
      height: 900,
      alt: synthetic[0].photos[0].alt,
    });
    expect(withMedia.photosCount).toBe(synthetic[0].photos.length);
    expect(withMedia.hasVideo).toBe(true);
    expect(withMedia.hasTour).toBe(true);
    expect(withMedia.previousPrice).toBe(390000);
    expect(withMedia.floor).toBe(0);

    const noPhotos = toIndexEntry(
      synthetic.find((o) => o.photos.length === 0)!,
    );
    expect(noPhotos.photo).toBeUndefined();
    expect("photo" in noPhotos).toBe(false);
    expect(noPhotos.photosCount).toBe(0);
    expect(noPhotos.hasVideo).toBe(false);
    expect(noPhotos.price).toBeNull();
  });

  it("wartości undefined wypadają z wpisu (porównania jednoznaczne)", () => {
    const plot = toIndexEntry(synthetic.find((o) => o.mainType === "dzialka")!);
    expect("rooms" in plot).toBe(false);
    expect("floor" in plot).toBe(false);
    expect("district" in plot.location).toBe(false);
  });
});

describe("toIndexText", () => {
  it("tytuł + opis bez tagów, znormalizowany; bez wartownika pól zabronionych", () => {
    for (const o of synthetic) {
      const t = toIndexText(o);
      expect(t).not.toMatch(/<[a-z]/i);
      expect(t).toBe(normalizeText(t));
      expect(t).toContain(normalizeText(o.title));
      expect(t).not.toContain(normalizeText(FORBIDDEN_SENTINEL));
    }
    const kawalerka = synthetic.find((o) => o.number === "SW900001")!;
    expect(toIndexText(kawalerka)).toContain("kawalerka po remoncie");
    expect(toIndexText(kawalerka)).toContain("blisko parku");
  });
});

describe("buildIndex / buildIndexText", () => {
  it("indeks = wpisy w kolejności ofert + drzewo; teksty per numer", () => {
    const idx = buildIndex({ offers: synthetic, locations: EMPTY_LOCATIONS });
    expect(idx.offers.map((e) => e.number)).toEqual(
      synthetic.map((o) => o.number),
    );
    expect(idx.locations).toEqual(EMPTY_LOCATIONS);
    expect(Object.keys(buildIndexText(synthetic)).sort()).toEqual(
      synthetic.map((o) => o.number).sort(),
    );
  });
});

for (const source of ["fixture", "data"] as const) {
  const offers = readOffersTyped(source);
  describe.skipIf(offers.length === 0)(`indeks na ${source}`, () => {
    it("każdy wpis trzyma allow-listę i nie niesie pól zabronionych", () => {
      for (const o of offers) {
        const e = toIndexEntry(o);
        expectKeysWithin(e, INDEX_FIELDS, o.number);
        expectKeysWithin(e.location, INDEX_LOCATION_FIELDS, o.number);
        if (e.photo) expectKeysWithin(e.photo, INDEX_PHOTO_FIELDS, o.number);
      }
      expect(findForbiddenKeys(offers.map(toIndexEntry))).toEqual([]);
    });
  });
}
