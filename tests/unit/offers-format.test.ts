// Formattery wartości oferty — test przeniesiony z analizy danych CRM.
import { describe, expect, it } from "vitest";
import {
  formatArea,
  formatDecimal,
  formatFloor,
  formatInt,
  formatKind,
  formatLocation,
  formatOffersCount,
  formatPrice,
  formatPricePerM2,
  formatRooms,
  plural,
  formatKindPlural,
  formatYear,
  TYPE_LABEL_PLURAL,
} from "../../src/lib/offers/format";

const S = " ";

describe("format", () => {
  it("liczebniki polskie", () => {
    const f = (n: number) => plural(n, "oferta", "oferty", "ofert");
    expect([
      f(1),
      f(2),
      f(4),
      f(5),
      f(12),
      f(14),
      f(22),
      f(45),
      f(112),
      f(0),
    ]).toEqual([
      "oferta",
      "oferty",
      "oferty",
      "ofert",
      "ofert",
      "ofert",
      "oferty",
      "ofert",
      "ofert",
      "ofert",
    ]);
    expect(formatOffersCount(45)).toBe(`45${S}ofert`);
    expect(formatOffersCount(1)).toBe(`1${S}oferta`);
    expect(formatOffersCount(0)).toBe("Brak ofert");
  });

  it("liczby: tysiące spacją niełamliwą, przecinek dziesiętny", () => {
    expect(formatInt(1669340)).toBe(`1${S}669${S}340`);
    expect(formatInt(649000)).toBe(`649${S}000`);
    expect(formatInt(999)).toBe("999");
    expect(formatDecimal(49.84)).toBe("49,84");
    expect(formatDecimal(65)).toBe("65");
    expect(formatDecimal(54.2)).toBe("54,2");
    expect(formatDecimal(4700)).toBe(`4${S}700`);
    expect(formatArea(49.84)).toBe(`49,84${S}m²`);
    expect(formatArea(4700)).toBe(`4${S}700${S}m²`);
  });

  it("cena: sprzedaż, wynajem, zapytaj o cenę, waluta", () => {
    expect(formatPrice(649000, "sprzedaz")).toBe(`649${S}000${S}zł`);
    expect(formatPrice(2500, "wynajem")).toBe(`2${S}500${S}zł${S}/${S}mies.`);
    expect(formatPrice(null, "sprzedaz")).toBe("Zapytaj o cenę");
    expect(formatPrice(0, "wynajem")).toBe("Zapytaj o cenę");
    expect(formatPrice(120000, "sprzedaz", "EUR")).toBe(`120${S}000${S}EUR`);
    expect(formatPricePerM2(13021.67, "sprzedaz")).toBe(`13${S}022${S}zł/m²`);
    expect(formatPricePerM2(46.13, "wynajem")).toBe(`46${S}zł/m²/mies.`);
    expect(formatPricePerM2(null, "sprzedaz")).toBeNull();
  });

  it("piętro: parter (0 = wartość), suterena, z N", () => {
    expect(formatFloor(0, 4)).toBe(`parter${S}z${S}4`);
    expect(formatFloor(0)).toBe("parter");
    expect(formatFloor(-1, 3)).toBe(`suterena${S}z${S}3`);
    expect(formatFloor(2, 4)).toBe(`2.${S}piętro${S}z${S}4`);
    expect(formatFloor(14, 16)).toBe(`14.${S}piętro${S}z${S}16`);
    expect(formatFloor(undefined, 4)).toBeNull();
  });

  it("pokoje, lokalizacja (ul./os.), rodzaj", () => {
    expect(formatRooms(1)).toBe(`1${S}pokój`);
    expect(formatRooms(3)).toBe(`3${S}pokoje`);
    expect(formatRooms(7)).toBe(`7${S}pokoi`);
    expect(formatRooms(undefined)).toBeNull();
    expect(
      formatLocation({
        city: "Poznań",
        district: "Malta",
        street: "Milczańska",
      }),
    ).toBe(`Poznań, Malta${S}·${S}ul.${S}Milczańska`);
    expect(
      formatLocation({
        city: "Poznań",
        district: "Winogrady",
        street: "Pod Lipami",
        streetType: "os.",
      }),
    ).toBe(`Poznań, Winogrady${S}·${S}os.${S}Pod Lipami`);
    expect(formatLocation({ city: "Poznań", street: "Wilczak" })).toBe(
      `Poznań${S}·${S}ul.${S}Wilczak`,
    );
    expect(formatLocation({ city: "Dworzyska" })).toBe("Dworzyska");
    expect(formatKind("dom", "sprzedaz", "Bliźniak")).toBe(
      "Dom (bliźniak) na sprzedaż",
    );
    expect(formatKind("mieszkanie", "wynajem")).toBe("Mieszkanie na wynajem");
    expect(formatKind("komercyjny", "sprzedaz", "Biuro")).toBe(
      "Lokal komercyjny (biuro) na sprzedaż",
    );
  });
});

describe("nagłówki list (4.2): liczba mnoga typów, rok", () => {
  it("formatKindPlural: „Lokale komercyjne na wynajem” (D16), „Działki na sprzedaż”", () => {
    expect(formatKindPlural("komercyjny", "wynajem")).toBe(
      "Lokale komercyjne na wynajem",
    );
    expect(formatKindPlural("dzialka", "sprzedaz")).toBe("Działki na sprzedaż");
    expect(formatKindPlural("mieszkanie", "sprzedaz")).toBe(
      "Mieszkania na sprzedaż",
    );
    expect(formatKindPlural("dom", "wynajem")).toBe("Domy na wynajem");
    expect(Object.keys(TYPE_LABEL_PLURAL)).toHaveLength(4);
  });

  it("formatYear: „2003 r.” ze spacją niełamliwą", () => {
    expect(formatYear(2003)).toBe(`2003${S}r.`);
  });
});
