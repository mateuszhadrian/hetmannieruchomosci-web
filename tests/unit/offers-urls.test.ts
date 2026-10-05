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

describe("offerRoutes() i ścieżki statyczne tras", async () => {
  const { offerPath, offerRoutes } = await import("../../src/lib/offers/urls");
  const { offerDetailStaticPaths, offerListStaticPaths, restParam } =
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

  it("trasa list: każda lista ma ≥ 1 ofertę, parametr bez prefiksu i ukośników", () => {
    const paths = offerListStaticPaths(offers);
    expect(paths.map((p) => `/oferty/${p.params.path}/`)).toEqual(
      offerRoutes(offers).lists,
    );
    for (const p of paths) {
      expect(p.params.path).not.toMatch(/^\/|\/$/);
      // lista ma jeden albo dwa segmenty — trzy to adres detalu
      expect(p.params.path.split("/").length).toBeLessThanOrEqual(2);
      expect(p.props.offers.length).toBeGreaterThan(0);
    }
    expect(restParam("/oferty/dom-na-sprzedaz/baranowo/sw900003/")).toBe(
      "dom-na-sprzedaz/baranowo/sw900003",
    );
  });

  it("trasa detali: trzy parametry składają dokładnie adres oferty", () => {
    const paths = offerDetailStaticPaths(offers);
    expect(paths).toHaveLength(offers.length);
    for (const [i, p] of paths.entries()) {
      const { kind, location, number } = p.params;
      for (const segment of [kind, location, number]) {
        expect(segment).not.toContain("/");
        expect(segment.length).toBeGreaterThan(0);
      }
      expect(`/oferty/${kind}/${location}/${number}/`).toBe(
        offerPath(offers[i]!),
      );
      expect(p.props.offer).toBe(offers[i]);
    }
    // adresy detali i list nie nachodzą na siebie
    const lists = new Set(offerRoutes(offers).lists);
    for (const p of paths) {
      const { kind, location, number } = p.params;
      expect(lists.has(`/oferty/${kind}/${location}/${number}/`)).toBe(false);
    }
  });
});
