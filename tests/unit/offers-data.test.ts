// `data.ts` (2.8): brak katalogu = pusty stan; pusta tablica = zero ofert;
// błędny rekord (klucz spoza schematu, zła wartość, zły JSON) WYWRACA
// odczyt — czyli build; komunikat niesie ścieżkę pola, nie wartość;
// bufor per katalog; BUILD_NOW z env.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearOffersDataCache,
  DATA_FILES,
  EMPTY_LOCATIONS,
  loadOffersData,
  OffersDataError,
  readDataFile,
} from "../../src/lib/offers/data";
import { OffersFileSchema } from "../../src/lib/offers/schema";
import { syntheticFullOffers } from "../helpers/raw";

const offers = syntheticFullOffers();
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "hetman-data-"));
  clearOffersDataCache();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function write(file: string, value: unknown) {
  writeFileSync(join(dir, file), JSON.stringify(value));
}

describe("loadOffersData()", () => {
  it("brak katalogu = pusty stan (strona buduje się z zerem ofert)", () => {
    const data = loadOffersData(join(dir, "nie-ma"));
    expect(data.offers).toEqual([]);
    expect(data.locations).toEqual(EMPTY_LOCATIONS);
    expect(data.photos).toEqual({});
    expect(data.maps).toEqual({});
    expect(data.ledger).toEqual({});
    expect(data.legacy).toEqual({});
  });

  it("pusta tablica ofert = zero ofert, reszta plików opcjonalna", () => {
    write(DATA_FILES.offers, []);
    expect(loadOffersData(dir).offers).toEqual([]);
  });

  it("komplet poprawnych plików przechodzi i jest buforowany", () => {
    write(DATA_FILES.offers, offers);
    write(DATA_FILES.ledger, { [offers[0].number]: ["/oferty/x/y/z/"] });
    const first = loadOffersData(dir);
    expect(first.offers).toHaveLength(offers.length);
    expect(first.offers[0].number).toBe(offers[0].number);
    write(DATA_FILES.offers, []);
    expect(loadOffersData(dir)).toBe(first);
    clearOffersDataCache();
    expect(loadOffersData(dir).offers).toEqual([]);
  });

  it("błędny rekord (nieznany klucz) wywraca odczyt z nazwą pola bez wartości", () => {
    write(DATA_FILES.offers, [{ ...offers[0], contactEmail: "tajne@x.pl" }]);
    let error: unknown;
    try {
      loadOffersData(dir);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(OffersDataError);
    const message = (error as Error).message;
    expect(message).toContain(DATA_FILES.offers);
    expect(message).not.toContain("tajne@x.pl");
  });

  it("zła wartość pola wywraca odczyt", () => {
    write(DATA_FILES.offers, [{ ...offers[0], price: "dużo" }]);
    expect(() => loadOffersData(dir)).toThrow(/price/);
  });

  it("uszkodzony JSON wywraca odczyt", () => {
    writeFileSync(join(dir, DATA_FILES.offers), "[{");
    expect(() => loadOffersData(dir)).toThrow(/JSON/);
  });

  it("błędny manifest zdjęć albo rejestr adresów też wywraca", () => {
    write(DATA_FILES.offers, offers);
    write(DATA_FILES.photos, { "not-a-url": { r2Key: "x" } });
    expect(() => loadOffersData(dir)).toThrow(OffersDataError);
    clearOffersDataCache();
    rmSync(join(dir, DATA_FILES.photos));
    write(DATA_FILES.ledger, { sw1: ["/oferty/a/"] });
    expect(() => loadOffersData(dir)).toThrow(OffersDataError);
  });
});

describe("readDataFile()", () => {
  it("zwraca fallback tylko przy braku pliku", () => {
    expect(readDataFile(dir, "x.json", OffersFileSchema, [])).toEqual([]);
    write("x.json", offers);
    expect(readDataFile(dir, "x.json", OffersFileSchema, [])).toHaveLength(
      offers.length,
    );
  });
});
