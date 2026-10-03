// „Dane szczegółowe" detalu (4.3): jedna deklaratywna lista wierszy
// (docs/analiza-oferta.md §3.2). Testy na danych SYNTETYCZNYCH
// (`syntheticFullOffers()`) z nadpisaniami pól; fixture ze skipem.
import { describe, expect, it } from "vitest";
import {
  DETAIL_ROW_IDS,
  DETAIL_ROWS,
  detailRows,
  formatTypeRow,
  LOWEST_PRICE_NOTE,
  priceVisible,
  type DetailRowId,
} from "../../src/lib/offers/details-rows";
import { ASK_FOR_PRICE } from "../../src/lib/offers/format";
import type { Offer } from "../../src/lib/offers/schema";
import { readFixtureOffersTyped } from "../helpers/offers";
import { syntheticFullOffers } from "../helpers/raw";

const S = "\u00a0";
const NOW = new Date("2026-10-01T12:00:00+02:00");
const CTX = { now: NOW, showPrice: true };

const base = syntheticFullOffers()[0];
const make = (patch: Partial<Offer>): Offer => ({ ...base, ...patch });
const ids = (o: Offer, ctx = CTX) => detailRows(o, ctx).map((r) => r.id);
const row = (o: Offer, id: DetailRowId, ctx = CTX) =>
  detailRows(o, ctx).find((r) => r.id === id);

const flat = make({
  mainType: "mieszkanie",
  transaction: "sprzedaz",
  area: 49.84,
  rooms: 2,
  floor: 2,
  floorsInBuilding: 4,
  buildingYear: 2003,
  market: "wtorny",
  elevators: 1,
  furnished: "czesciowo",
  extras: {
    ...base.extras,
    balcony: 0,
    loggia: 1,
    terrace: 0,
    garage: 0,
    parkingUnderground: 1,
    parking: 0,
    basement: 0,
    storage: 1,
  },
  heating: "miejskie",
  condition: "do zamieszkania",
  rent: 620,
  availableFrom: undefined,
  price: 649000,
  pricePerM2: 13022,
  previousPrice: undefined,
  lowestPrice30d: undefined,
  subType: undefined,
  status: "aktywna",
});

describe("lista wierszy", () => {
  it("DETAIL_ROWS to komplet DETAIL_ROW_IDS w tej samej kolejności, bez powtórek", () => {
    expect(DETAIL_ROWS.map((r) => r.id)).toEqual([...DETAIL_ROW_IDS]);
    expect(new Set(DETAIL_ROW_IDS).size).toBe(DETAIL_ROW_IDS.length);
    for (const r of DETAIL_ROWS) expect(r.label.length).toBeGreaterThan(0);
  });

  it("mieszkanie z kompletem danych = 19 wierszy designu w kolejności", () => {
    const rows = detailRows(flat, CTX);
    expect(rows.map((r) => r.id)).toEqual([
      "transaction",
      "type",
      "location",
      "area",
      "rooms",
      "floor",
      "year",
      "market",
      "elevator",
      "furnished",
      "balcony",
      "garage",
      "basement",
      "heating",
      "condition",
      "rent",
      "number",
      "price",
      "pricePerM2",
    ]);
    expect(rows).toHaveLength(19);
    const text = Object.fromEntries(rows.map((r) => [r.id, r.value.text]));
    expect(text).toMatchObject({
      transaction: "Sprzedaż",
      type: "Mieszkanie",
      area: `49,84${S}m²`,
      rooms: "2",
      floor: `2.${S}piętro${S}z${S}4`,
      year: `2003${S}r.`,
      market: "Wtórny",
      elevator: "tak",
      furnished: "Częściowo",
      balcony: "loggia",
      garage: "miejsce w hali garażowej",
      basement: "komórka lokatorska",
      heating: "miejskie",
      condition: "do zamieszkania",
      rent: `620${S}zł${S}/${S}mies.`,
      number: flat.number,
      price: `649${S}000${S}zł`,
      pricePerM2: `13${S}022${S}zł/m²`,
    });
    for (const r of rows) {
      expect(r.value.text).not.toMatch(/undefined|NaN|null/);
    }
  });
});

describe("warunki wierszy", () => {
  it("piętro 0 = parter (wartość, nie brak)", () => {
    expect(row(make({ ...flat, floor: 0 }), "floor")?.value.text).toBe(
      `parter${S}z${S}4`,
    );
    expect(ids(make({ ...flat, floor: undefined }))).not.toContain("floor");
  });

  it("winda: brak danych → brak wiersza; 0 → „nie”; 2 → „tak (2)”", () => {
    expect(ids(make({ ...flat, elevators: undefined }))).not.toContain(
      "elevator",
    );
    expect(row(make({ ...flat, elevators: 0 }), "elevator")?.value.text).toBe(
      "nie",
    );
    expect(row(make({ ...flat, elevators: 2 }), "elevator")?.value.text).toBe(
      "tak (2)",
    );
  });

  it("czynsz: 0 albo brak → brak wiersza", () => {
    expect(ids(make({ ...flat, rent: undefined }))).not.toContain("rent");
  });

  it("liczebniki przynależności: „2 balkony, loggia, taras”, „2 miejsca parkingowe”", () => {
    const o = make({
      ...flat,
      extras: {
        ...flat.extras,
        balcony: 2,
        loggia: 1,
        terrace: 1,
        garage: 1,
        parkingUnderground: 0,
        parking: 2,
        basement: 1,
        storage: 2,
      },
    });
    expect(row(o, "balcony")?.value.text).toBe(`2${S}balkony, loggia, taras`);
    expect(row(o, "garage")?.value.text).toBe(`garaż, 2${S}miejsca parkingowe`);
    expect(row(o, "basement")?.value.text).toBe(
      `piwnica, 2${S}komórki lokatorskie`,
    );
    const none = make({
      ...flat,
      extras: Object.fromEntries(
        Object.keys(flat.extras).map((k) => [k, 0]),
      ) as Offer["extras"],
    });
    for (const id of ["balcony", "garage", "basement"] as const) {
      expect(ids(none)).not.toContain(id);
    }
  });

  it("„Zapytaj o cenę”: wiersz ceny bez kwoty, bez ceny za m²", () => {
    const o = make({ ...flat, price: null, pricePerM2: null });
    expect(row(o, "price")?.value.text).toBe(ASK_FOR_PRICE);
    expect(ids(o)).not.toContain("pricePerM2");
  });

  it("showPrice=false (sprzedane wg przełącznika) chowa Cenę i Cenę za m²", () => {
    const got = ids(flat, { ...CTX, showPrice: false });
    expect(got).not.toContain("price");
    expect(got).not.toContain("pricePerM2");
    expect(got).toContain("number");
  });

  it("obniżka: poprzednia cena przekreślona + Omnibus, gdy jest najniższa z 30 dni", () => {
    const o = make({ ...flat, previousPrice: 679000, lowestPrice30d: 639000 });
    const r = row(o, "price")!;
    expect(r.value.previous).toBe(`679${S}000${S}zł`);
    expect(r.value.note).toBe(`${LOWEST_PRICE_NOTE}: 639${S}000${S}zł`);
    // podwyżka albo równa cena = bez przekreślenia i bez dopisku
    const same = row(make({ ...flat, previousPrice: 649000 }), "price")!;
    expect(same.value.previous).toBeUndefined();
    expect(same.value.note).toBeUndefined();
    const up = row(
      make({ ...flat, previousPrice: 600000, lowestPrice30d: 600000 }),
      "price",
    )!;
    expect(up.value.previous).toBeUndefined();
  });

  it("dom: powierzchnia działki i liczba pięter zamiast piętra; bez windy i umeblowania", () => {
    const dom = make({
      ...flat,
      mainType: "dom",
      plotArea: 800,
      floor: undefined,
      floorsInBuilding: 2,
    });
    const got = ids(dom);
    expect(got).toContain("plotArea");
    expect(got).toContain("floors");
    expect(got).not.toContain("floor");
    expect(got).not.toContain("elevator");
    expect(got).not.toContain("furnished");
    expect(row(dom, "plotArea")?.value.text).toBe(`800${S}m²`);
    expect(row(dom, "floors")?.value.text).toBe("2");
    expect(got.indexOf("plotArea")).toBe(got.indexOf("area") + 1);
  });

  it("działka: bez pokoi, piętra, roku, windy, umeblowania", () => {
    const got = ids(make({ ...flat, mainType: "dzialka" }));
    for (const id of ["rooms", "floor", "year", "elevator", "furnished"]) {
      expect(got).not.toContain(id);
    }
    expect(got).toContain("area");
    expect(got).toContain("market");
  });

  it("typ niesie podtyp małą literą", () => {
    expect(
      formatTypeRow(make({ ...flat, mainType: "dom", subType: "Bliźniak" })),
    ).toBe("Dom (bliźniak)");
    expect(
      formatTypeRow(
        make({ ...flat, mainType: "komercyjny", subType: "Biuro" }),
      ),
    ).toBe("Lokal komercyjny (biuro)");
  });

  it("„Dostępne od” tylko dla daty dzisiejszej lub przyszłej", () => {
    expect(ids(make({ ...flat, availableFrom: "2026-09-30" }))).not.toContain(
      "availableFrom",
    );
    const r = row(
      make({ ...flat, availableFrom: "2026-10-15" }),
      "availableFrom",
    );
    expect(r?.value.text).toBe(`15${S}paź${S}2026`);
    expect(ids(make({ ...flat, availableFrom: "2026-10-01" }))).toContain(
      "availableFrom",
    );
  });

  it("priceVisible: aktywne zawsze, sprzedane/wynajęte wg przełącznika", () => {
    expect(priceVisible(make({ ...flat, status: "sprzedana" }), false)).toBe(
      false,
    );
    expect(priceVisible(make({ ...flat, status: "wynajeta" }), false)).toBe(
      false,
    );
    expect(priceVisible(make({ ...flat, status: "sprzedana" }), true)).toBe(
      true,
    );
    expect(priceVisible(make({ ...flat, status: "rezerwacja" }), false)).toBe(
      true,
    );
  });
});

describe("fixture", () => {
  const fixture = readFixtureOffersTyped();
  it.skipIf(fixture.length === 0)(
    "każda oferta ma wiersze obowiązkowe i żadna wartość nie jest pusta",
    () => {
      for (const o of fixture) {
        const rows = detailRows(o, CTX);
        const got = rows.map((r) => r.id);
        for (const id of [
          "transaction",
          "type",
          "location",
          "area",
          "market",
          "number",
        ]) {
          expect(got, o.number).toContain(id);
        }
        for (const r of rows) {
          expect(
            r.value.text.trim().length,
            `${o.number}/${r.id}`,
          ).toBeGreaterThan(0);
          expect(r.value.text, `${o.number}/${r.id}`).not.toMatch(
            /undefined|NaN/,
          );
        }
      }
    },
  );
});
