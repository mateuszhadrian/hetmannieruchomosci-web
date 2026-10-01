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

describe("offerRoutes() i offerStaticPaths()", async () => {
  const { offerRoutes } = await import("../../src/lib/offers/urls");
  const { offerStaticPaths, restParam } =
    await import("../../src/lib/offers/static-paths");
  const { syntheticFullOffers } = await import("../helpers/raw");
  const offers = syntheticFullOffers();

  it("listy: typ×transakcja i typ×transakcja×lokalizacja, bez duplikatów; detale per oferta", () => {
    const routes = offerRoutes(offers);
    expect(routes.details).toHaveLength(offers.length);
    expect(new Set(routes.lists).size).toBe(routes.lists.length);
    expect(routes.lists).toContain("/oferty/mieszkanie-na-sprzedaz/");
    expect(routes.lists).toContain(
      "/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/",
    );
    expect(routes.lists.length).toBeGreaterThan(routes.details.length / 2);
  });

  it("static paths: każda lista ma ≥ 1 ofertę, parametr bez prefiksu i ukośników", () => {
    const paths = offerStaticPaths(offers);
    expect(paths.filter((p) => p.props.kind === "detail")).toHaveLength(
      offers.length,
    );
    for (const p of paths) {
      expect(p.params.path).not.toMatch(/^\/|\/$/);
      if (p.props.kind === "list")
        expect(p.props.offers.length).toBeGreaterThan(0);
    }
    expect(restParam("/oferty/dom-na-sprzedaz/baranowo/sw900003/")).toBe(
      "dom-na-sprzedaz/baranowo/sw900003",
    );
  });
});
