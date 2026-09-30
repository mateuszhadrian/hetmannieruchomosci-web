// Adresy ofert: opakowania nad routes.ts (P14) — jedno źródło wzorca.
import { describe, expect, it } from "vitest";
import { offerDetailPath, offerListPath } from "../../src/lib/routes";
import {
  TYPE_SLUG,
  listPath,
  offerPath,
  shortPaths,
} from "../../src/lib/offers/urls";

const offer = {
  number: "SW486462",
  mainType: "mieszkanie" as const,
  transaction: "sprzedaz" as const,
  location: { slug: "poznan-winogrady" },
};

describe("urls", () => {
  it("offerPath = offerDetailPath z routes.ts", () => {
    expect(offerPath(offer)).toBe(
      "/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/sw486462/",
    );
    expect(offerPath(offer)).toBe(
      offerDetailPath("mieszkanie", "sprzedaz", "poznan-winogrady", "SW486462"),
    );
  });

  it("listPath z lokalizacją i bez", () => {
    expect(listPath(offer)).toBe(
      "/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/",
    );
    expect(listPath(offer, { withLocation: false })).toBe(
      "/oferty/mieszkanie-na-sprzedaz/",
    );
    expect(listPath(offer)).toBe(
      offerListPath("mieszkanie", "sprzedaz", "poznan-winogrady"),
    );
  });

  it("komercyjny → lokal-komercyjny; wynajem", () => {
    expect(TYPE_SLUG.komercyjny).toBe("lokal-komercyjny");
    expect(
      offerPath({ ...offer, mainType: "komercyjny", transaction: "wynajem" }),
    ).toBe("/oferty/lokal-komercyjny-na-wynajem/poznan-winogrady/sw486462/");
  });

  it("krótkie adresy: wielkie i małe litery", () => {
    expect(shortPaths("SW486462")).toEqual(["/SW486462", "/sw486462"]);
  });
});
