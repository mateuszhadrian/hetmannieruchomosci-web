// Kontrakt helpera ofert dla testów (`tests/helpers/offers.ts`, Etap 3):
// odczyt typowany odporny na brak plików, `matchesCriteria`/`filterOffers`
// na ofertach SYNTETYCZNYCH (kryteria liczone jawnie, `0` = dana),
// `pickOffer` zwraca `undefined` zamiast rzucać, gdy cechy nie ma;
// na fixture (skip, gdy nie istnieje): każda kryterium-para daje rozłączne
// zbiory, a `describeCriteria` nie gubi wartości `0`.
import { describe, expect, it } from "vitest";
import type { Offer } from "../../src/lib/offers/schema";
import {
  describeCriteria,
  filterOffers,
  matchesCriteria,
  pickOffer,
  pickOffers,
  readFixtureOffersTyped,
  readOffersTyped,
} from "../helpers/offers";
import { syntheticFullOffers } from "../helpers/raw";

const base = syntheticFullOffers();

/** Warianty cech na bazie oferty syntetycznej — bez dotykania fixture'u. */
function variant(patch: Partial<Offer>): Offer {
  return { ...base[0], ...patch };
}

describe("matchesCriteria (dane syntetyczne)", () => {
  it("puste kryteria pasują do każdej oferty", () => {
    for (const o of base) expect(matchesCriteria(o, {})).toBe(true);
  });

  it("status, typ, transakcja, rynek — równość pól", () => {
    const o = variant({
      status: "sprzedana",
      mainType: "dom",
      transaction: "sprzedaz",
      market: "wtorny",
    });
    expect(matchesCriteria(o, { status: "sprzedana" })).toBe(true);
    expect(matchesCriteria(o, { status: "aktywna" })).toBe(false);
    expect(
      matchesCriteria(o, { mainType: "dom", transaction: "sprzedaz" }),
    ).toBe(true);
    expect(matchesCriteria(o, { mainType: "mieszkanie" })).toBe(false);
    expect(matchesCriteria(o, { market: "pierwotny" })).toBe(false);
  });

  it("withVideo / withTour — obecność pola, obie strony", () => {
    const withBoth = variant({
      videoId: "dQw4w9WgXcQ",
      tourUrl: "https://tour.example.invalid/x",
    });
    const without = variant({ videoId: undefined, tourUrl: undefined });
    expect(matchesCriteria(withBoth, { withVideo: true, withTour: true })).toBe(
      true,
    );
    expect(
      matchesCriteria(without, { withVideo: false, withTour: false }),
    ).toBe(true);
    expect(matchesCriteria(without, { withVideo: true })).toBe(false);
    expect(matchesCriteria(withBoth, { withTour: false })).toBe(false);
  });

  it("withPlan — zdjęcie typu plan w galerii", () => {
    const photo = base[0].photos[0];
    const plan = variant({
      photos: [photo, { ...photo, id: photo.id + 1, kind: "plan" }],
    });
    const noPlan = variant({ photos: [photo] });
    expect(matchesCriteria(plan, { withPlan: true })).toBe(true);
    expect(matchesCriteria(noPlan, { withPlan: true })).toBe(false);
    expect(matchesCriteria(noPlan, { withPlan: false })).toBe(true);
  });

  it("floor: 0 (parter) jest daną, nie brakiem", () => {
    const parter = variant({ floor: 0 });
    const brak = variant({ floor: undefined });
    const pietro = variant({ floor: 3 });
    expect(matchesCriteria(parter, { floor: 0 })).toBe(true);
    expect(matchesCriteria(brak, { floor: 0 })).toBe(false);
    expect(matchesCriteria(pietro, { floor: 0 })).toBe(false);
    expect(matchesCriteria(pietro, { floor: 3 })).toBe(true);
  });

  it("withPreviousPrice, priceOnRequest, minPhotos, where", () => {
    const o = variant({ price: null, previousPrice: undefined });
    expect(matchesCriteria(o, { priceOnRequest: true })).toBe(true);
    expect(matchesCriteria(o, { priceOnRequest: false })).toBe(false);
    expect(matchesCriteria(o, { withPreviousPrice: false })).toBe(true);
    expect(
      matchesCriteria(variant({ previousPrice: 1 }), {
        withPreviousPrice: true,
      }),
    ).toBe(true);
    expect(matchesCriteria(o, { minPhotos: o.photos.length })).toBe(true);
    expect(matchesCriteria(o, { minPhotos: o.photos.length + 1 })).toBe(false);
    expect(matchesCriteria(o, { where: (x) => x.number === o.number })).toBe(
      true,
    );
    expect(matchesCriteria(o, { where: () => false })).toBe(false);
  });

  it("kryteria łączą się koniunkcją", () => {
    const o = variant({ status: "aktywna", videoId: "dQw4w9WgXcQ" });
    expect(matchesCriteria(o, { status: "aktywna", withVideo: true })).toBe(
      true,
    );
    expect(matchesCriteria(o, { status: "aktywna", withVideo: false })).toBe(
      false,
    );
  });

  it("filterOffers zachowuje kolejność wejścia", () => {
    const all = filterOffers(base, {});
    expect(all.map((o) => o.number)).toEqual(base.map((o) => o.number));
  });
});

describe("describeCriteria", () => {
  it("wypisuje pary klucz=wartość, nie gubi 0 ani false, funkcję skraca", () => {
    expect(describeCriteria({})).toBe("dowolna");
    expect(
      describeCriteria({ floor: 0, withVideo: false, status: "aktywna" }),
    ).toBe("floor=0, withVideo=false, status=aktywna");
    expect(describeCriteria({ where: () => true })).toBe("where=…");
  });
});

describe("odczyt typowany (plików może nie być)", () => {
  it("readOffersTyped / readFixtureOffersTyped zwracają tablice", () => {
    expect(Array.isArray(readOffersTyped("data"))).toBe(true);
    expect(Array.isArray(readFixtureOffersTyped())).toBe(true);
  });

  it("pickOffer bez trafienia daje undefined, nie wyjątek", () => {
    expect(pickOffer({ where: () => false })).toBeUndefined();
    expect(pickOffer({ where: () => false }, "fixture")).toBeUndefined();
    expect(pickOffers({ where: () => false })).toEqual([]);
  });
});

describe.skipIf(readFixtureOffersTyped().length === 0)(
  "pickOffer na fixture (zamrożony zestaw)",
  () => {
    it("fixture pokrywa warianty z selection.json: statusy, film, spacer, plan, parter, bez ceny, obniżka", () => {
      // Kryteria opisane w `selection.json` — gdy fixture się zmieni,
      // ten test wskaże, która cecha wypadła (specy widoków robią skip).
      const expected = [
        { status: "aktywna" },
        { status: "rezerwacja" },
        { status: "sprzedana" },
        { status: "wynajeta" },
        { withVideo: true },
        { withTour: true },
        { withPlan: true },
        { floor: 0 },
        { priceOnRequest: true },
        { withPreviousPrice: true },
        { mainType: "mieszkanie", transaction: "wynajem" },
        { mainType: "dzialka" },
        { mainType: "komercyjny" },
        { mainType: "dom" },
      ] as const;
      const missing = expected
        .filter((c) => !pickOffer(c, "fixture"))
        .map((c) => describeCriteria(c));
      expect(missing).toEqual([]);
    });

    it("cecha i jej zaprzeczenie dzielą fixture rozłącznie", () => {
      const all = readFixtureOffersTyped().length;
      for (const key of ["withVideo", "withTour", "withPlan"] as const) {
        const yes = pickOffers({ [key]: true }, "fixture").length;
        const no = pickOffers({ [key]: false }, "fixture").length;
        expect(yes + no, key).toBe(all);
      }
    });
  },
);
