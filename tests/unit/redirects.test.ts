// `_redirects`: wyłącznie reguły statyczne 301, < 2000, linia < 1000
// znaków, brak pętli, każdy cel = adres oferty z danych albo trasa
// z routes.ts; oferta nieobecna wypada. Istnienie celów w dist sprawdza
// `test:dist` (S2c).
import { describe, expect, it } from "vitest";
import { buildLocations } from "../../scripts/sync/locations";
import { updateLedger } from "../../scripts/sync/ledger";
import { normalize } from "../../scripts/sync/normalize";
import {
  MAX_RULE_LENGTH,
  MAX_STATIC_RULES,
  STATIC_REDIRECTS,
  buildRedirectRules,
  buildRedirects,
  parseRedirects,
} from "../../src/lib/offers/redirects";
import { offerPath } from "../../src/lib/offers/urls";
import { STATIC_PATHS } from "../../src/lib/routes";
import { readSyntheticDictionary, readSyntheticList } from "../helpers/raw";

const dictionary = readSyntheticDictionary();
const offers = buildLocations(
  readSyntheticList().map((r) => normalize(r, { dictionary }).offer),
).offers;
const ledger = updateLedger({}, offers);
const legacy = {
  SW900001: {
    legacyId: 206,
    paths: [
      "/nieruchomosci/mieszkanie-na-sprzedaz/poznan-winogrady/206",
      "/offer/offer/206",
      "/offer/offer-print/206",
    ],
  },
  // oferta, której nie ma w danych — jej reguły wypadają
  SW999999: { legacyId: 999, paths: ["/offer/offer/999"] },
};

describe("buildRedirectRules()", () => {
  const rules = buildRedirectRules({ offers, ledger, legacy });
  const targets = new Set([...offers.map(offerPath), ...STATIC_PATHS]);

  it("reguły stałe na początku, potem krótkie adresy w obu pisowniach", () => {
    expect(rules.slice(0, 3).map((r) => [r.from, r.to])).toEqual(
      STATIC_REDIRECTS.map((r) => [...r]),
    );
    expect(rules).toContainEqual({
      from: "/SW900001",
      to: offerPath(offers[0]),
      status: 301,
    });
    expect(rules).toContainEqual({
      from: "/sw900001",
      to: offerPath(offers[0]),
      status: 301,
    });
  });

  it("dawne adresy → aktualny adres; oferta nieobecna wypada", () => {
    for (const from of legacy.SW900001.paths) {
      expect(rules).toContainEqual({
        from,
        to: offerPath(offers[0]),
        status: 301,
      });
    }
    expect(rules.some((r) => r.from === "/offer/offer/999")).toBe(false);
  });

  it("stara ścieżka z rejestru → aktualny adres (zmiana lokalizacji)", () => {
    const moved = {
      ...offers[0],
      location: { ...offers[0].location, slug: "poznan-stare-miasto" },
    };
    const next = updateLedger(ledger, [moved]);
    const r = buildRedirectRules({ offers: [moved], ledger: next });
    expect(r).toContainEqual({
      from: offerPath(offers[0]),
      to: offerPath(moved),
      status: 301,
    });
    // aktualny adres nie przekierowuje sam na siebie
    expect(r.some((x) => x.from === offerPath(moved))).toBe(false);
  });

  it("każdy cel to adres oferty z danych albo trasa statyczna; wszystkie 301; brak pętli", () => {
    const froms = new Set(rules.map((r) => r.from));
    for (const r of rules) {
      expect(r.status).toBe(301);
      expect(targets.has(r.to), r.to).toBe(true);
      expect(froms.has(r.to), `pętla: ${r.from} → ${r.to}`).toBe(false);
      expect(r.from).not.toBe(r.to);
    }
    expect(froms.size).toBe(rules.length);
  });

  it("limity Pages: < 2000 reguł, linia < 1000 znaków; 4 oferty ≈ 3 + 8 + 3 reguł", () => {
    expect(rules.length).toBe(3 + offers.length * 2 + 3);
    expect(rules.length).toBeLessThan(MAX_STATIC_RULES);
    const text = buildRedirects({ offers, ledger, legacy });
    for (const line of text.trim().split("\n"))
      expect(line.length).toBeLessThan(MAX_RULE_LENGTH);
    expect(text.endsWith("\n")).toBe(true);
  });

  it("zero ofert → same reguły stałe; parser odtwarza reguły", () => {
    const text = buildRedirects({ offers: [] });
    expect(parseRedirects(text)).toEqual(
      STATIC_REDIRECTS.map(([from, to]) => ({ from, to, status: 301 })),
    );
    expect(parseRedirects("# komentarz\n\n" + text)).toHaveLength(3);
  });

  it("wynik jest deterministyczny niezależnie od kolejności ofert", () => {
    const reversed = buildRedirects({
      offers: [...offers].reverse(),
      ledger,
      legacy,
    });
    expect(reversed).toBe(buildRedirects({ offers, ledger, legacy }));
  });
});
