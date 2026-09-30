// Schemat Offer: strict (klucz spoza schematu wywraca), 0 jest wartością,
// wariant roboczy przyjmuje zdjęcia bez danych z pobrania, pełny — nie.
import { describe, expect, it } from "vitest";
import { normalize } from "../../scripts/sync/normalize";
import {
  LegacyRedirectsSchema,
  LocationsFileSchema,
  NormalizedOfferSchema,
  OfferSchema,
  UrlLedgerSchema,
} from "../../src/lib/offers/schema";
import { readSyntheticDictionary, readSyntheticList } from "../helpers/raw";

const dictionary = readSyntheticDictionary();
const [first] = readSyntheticList();
const working = normalize(first, { dictionary }).offer;

function full() {
  return {
    ...working,
    photos: working.photos.map((p, i) => ({
      ...p,
      r2Key: `offers/${working.crmId}/${p.id}-0123abcd.jpg`,
      etag: `"etag-${i}"`,
      width: 1600,
      height: 1200,
    })),
  };
}

describe("OfferSchema (pełny)", () => {
  it("przyjmuje ofertę po kroku zdjęć", () => {
    expect(OfferSchema.safeParse(full()).success).toBe(true);
  });

  it("odrzuca ofertę roboczą (zdjęcia bez r2Key/etag/wymiarów)", () => {
    expect(OfferSchema.safeParse(working).success).toBe(false);
  });

  it("strict: nieznany klucz na ofercie, w lokalizacji i w zdjęciu wywraca", () => {
    expect(OfferSchema.safeParse({ ...full(), extra: 1 }).success).toBe(false);
    expect(
      OfferSchema.safeParse({
        ...full(),
        location: { ...working.location, locationPostal: "x" },
      }).success,
    ).toBe(false);
    const f = full();
    expect(
      OfferSchema.safeParse({
        ...f,
        photos: [{ ...f.photos[0], contactPhone: "x" }],
      }).success,
    ).toBe(false);
  });

  it("piętro 0 i licznik 0 są wartościami", () => {
    const r = OfferSchema.safeParse({
      ...full(),
      floor: 0,
      extras: { ...working.extras, balcony: 0 },
    });
    expect(r.success).toBe(true);
    expect(r.data?.floor).toBe(0);
  });

  it("legacyId jest opcjonalne, statusSource tylko 'title', agent tylko 'joanna'", () => {
    expect(OfferSchema.safeParse({ ...full(), legacyId: 206 }).success).toBe(
      true,
    );
    expect(
      OfferSchema.safeParse({ ...full(), statusSource: "label" }).success,
    ).toBe(false);
    expect(OfferSchema.safeParse({ ...full(), agent: "x" }).success).toBe(
      false,
    );
  });

  it("daty muszą mieć offset, numer wielkimi literami, slug małymi", () => {
    expect(
      OfferSchema.safeParse({ ...full(), addedAt: "2026-07-30 11:01:42" })
        .success,
    ).toBe(false);
    expect(OfferSchema.safeParse({ ...full(), number: "sw1" }).success).toBe(
      false,
    );
    expect(OfferSchema.safeParse({ ...full(), slug: "SW1" }).success).toBe(
      false,
    );
  });
});

describe("NormalizedOfferSchema (roboczy)", () => {
  it("przyjmuje wynik normalize() i jest strict", () => {
    expect(NormalizedOfferSchema.safeParse(working).success).toBe(true);
    expect(
      NormalizedOfferSchema.safeParse({ ...working, foo: 1 }).success,
    ).toBe(false);
  });
});

describe("pliki towarzyszące", () => {
  it("UrlLedgerSchema: numer → ścieżki /oferty/…", () => {
    expect(
      UrlLedgerSchema.safeParse({ SW1: ["/oferty/dom-na-sprzedaz/x/sw1/"] })
        .success,
    ).toBe(true);
    expect(UrlLedgerSchema.safeParse({ SW1: [] }).success).toBe(false);
    expect(UrlLedgerSchema.safeParse({ SW1: ["/sw1"] }).success).toBe(false);
  });

  it("LegacyRedirectsSchema i LocationsFileSchema", () => {
    expect(
      LegacyRedirectsSchema.safeParse({
        SW1: { legacyId: 206, paths: ["/offer/offer/206"] },
      }).success,
    ).toBe(true);
    expect(
      LocationsFileSchema.safeParse({
        nodes: [
          {
            id: "wielkopolskie",
            level: "province",
            name: "Wielkopolskie",
            parent: null,
            count: 1,
          },
        ],
        streets: {},
      }).success,
    ).toBe(true);
    expect(
      LocationsFileSchema.safeParse({ nodes: [], streets: {}, version: "x" })
        .success,
    ).toBe(false);
  });
});
