// Podpowiedzi lokalizacji i ulic (`src/lib/offers/locations-ui.ts`) —
// drzewo syntetyczne + fixture (skip bez fixture'u). Logika filtra
// lokalizacji ma własne testy w `offers-filters`.
import { describe, expect, it } from "vitest";
import { loadOffersData } from "../../src/lib/offers/data";
import { toIndexEntry } from "../../src/lib/offers/index-entry";
import {
  isLeaf,
  nodeLabel,
  nodeOfSlug,
  streetsUnder,
  suggestLocations,
  suggestStreets,
} from "../../src/lib/offers/locations-ui";
import type { LocationNode, LocationsFile } from "../../src/lib/offers/schema";
import { FIXTURE_DIR, readOffersTyped } from "../helpers/offers";
import { syntheticFullOffers } from "../helpers/raw";

const node = (
  id: string,
  level: LocationNode["level"],
  name: string,
  count: number,
  extra: Partial<LocationNode> = {},
): LocationNode => ({
  id,
  level,
  name,
  parent: id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : null,
  count,
  ...extra,
});

const NODES: LocationNode[] = [
  node("wielkopolskie", "province", "Wielkopolskie", 5),
  node("wielkopolskie/poznan", "county", "Poznań", 4),
  node("wielkopolskie/poznan/poznan", "city", "Poznań", 4, { label: "Poznań" }),
  node(
    "wielkopolskie/poznan/poznan/stare-miasto",
    "district",
    "Stare Miasto",
    2,
    {
      label: "Poznań Stare Miasto",
    },
  ),
  node(
    "wielkopolskie/poznan/poznan/stare-miasto/winogrady",
    "subdistrict",
    "Winogrady",
    2,
    { label: "Poznań Winogrady" },
  ),
  node("wielkopolskie/poznan/poznan/grunwald", "district", "Grunwald", 1, {
    label: "Poznań Grunwald",
  }),
  node(
    "wielkopolskie/poznan/poznan/grunwald/lazarz",
    "subdistrict",
    "Łazarz",
    1,
    {
      label: "Poznań Łazarz",
    },
  ),
  node("wielkopolskie/poznanski", "county", "poznański", 1),
  node(
    "wielkopolskie/poznanski/tarnowo-podgorne",
    "commune",
    "Tarnowo Podgórne",
    1,
  ),
  node(
    "wielkopolskie/poznanski/tarnowo-podgorne/baranowo",
    "city",
    "Baranowo",
    1,
    { label: "Baranowo", info: "gm. Tarnowo Podgórne, pow. poznański" },
  ),
  node("wielkopolskie/poznan/poznan/wilda", "district", "Wilda", 0, {
    label: "Poznań Wilda",
  }),
];

const STREETS: LocationsFile["streets"] = {
  "wielkopolskie/poznan/poznan": [{ name: "Wilczak", type: "ul.", count: 1 }],
  "wielkopolskie/poznan/poznan/stare-miasto/winogrady": [
    { name: "Pod Lipami", type: "os.", count: 2 },
  ],
  "wielkopolskie/poznan/poznan/grunwald/lazarz": [
    { name: "Głogowska", type: "ul.", count: 1 },
    { name: "Pod Lipami", type: "os.", count: 1 },
  ],
  "wielkopolskie/poznanski/tarnowo-podgorne/baranowo": [
    { name: "Szamotulska", type: "ul.", count: 1 },
  ],
};

describe("suggestLocations", () => {
  it("prefiks słowa po normalizacji; tylko miejscowość/dzielnica/poddzielnica z ofertami", () => {
    const ids = (q: string) => suggestLocations(NODES, q).map((n) => n.id);
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
    // „Poznań" (miejscowość) przed dzielnicami: dopasowanie od początku
    // etykiety, potem liczba ofert
    expect(ids("poz")[0]).toBe("wielkopolskie/poznan/poznan");
    expect(ids("poz")).not.toContain("wielkopolskie/poznan"); // powiat
    expect(ids("poz")).not.toContain("wielkopolskie/poznanski");
    expect(ids("poz")).not.toContain("wielkopolskie/poznan/poznan/wilda"); // 0 ofert
    // słowo w środku etykiety („Poznań Winogrady" ← „wino")
    expect(ids("wino")).toEqual([
      "wielkopolskie/poznan/poznan/stare-miasto/winogrady",
    ]);
    // diakrytyki obojętne w obie strony
    expect(ids("ŁAZ")).toEqual(["wielkopolskie/poznan/poznan/grunwald/lazarz"]);
    expect(ids("laz")).toEqual(["wielkopolskie/poznan/poznan/grunwald/lazarz"]);
    expect(ids("bar")).toEqual([
      "wielkopolskie/poznanski/tarnowo-podgorne/baranowo",
    ]);
    // gmina nie jest podpowiedzią (R21)
    expect(ids("tarn")).toEqual([]);
  });

  it("limit i etykieta; info zostaje na węźle (zawsze pokazywane w UI)", () => {
    expect(suggestLocations(NODES, "p", 2)).toHaveLength(2);
    const baranowo = suggestLocations(NODES, "baran")[0];
    expect(nodeLabel(baranowo)).toBe("Baranowo");
    expect(baranowo.info).toBe("gm. Tarnowo Podgórne, pow. poznański");
    expect(nodeLabel({ name: "Winogrady" })).toBe("Winogrady");
  });
});

describe("isLeaf / nodeOfSlug / ulice", () => {
  it("liść = bez dzieci", () => {
    expect(
      isLeaf(NODES, "wielkopolskie/poznan/poznan/stare-miasto/winogrady"),
    ).toBe(true);
    expect(isLeaf(NODES, "wielkopolskie/poznan/poznan")).toBe(false);
    expect(isLeaf(NODES, "nie-ma")).toBe(true);
  });

  it("nodeOfSlug z wpisów indeksu", () => {
    const entries = syntheticFullOffers().map(toIndexEntry);
    expect(nodeOfSlug(entries, "poznan-winogrady")).toBe(
      "wielkopolskie/poznan/poznan/stare-miasto/winogrady",
    );
    expect(nodeOfSlug(entries, "poznan")).toBe("wielkopolskie/poznan/poznan");
    expect(nodeOfSlug(entries, "x")).toBeUndefined();
  });

  it("streetsUnder sumuje ulice węzła i potomków (kaskada), sortuje po nazwie", () => {
    const poznan = streetsUnder(STREETS, "wielkopolskie/poznan/poznan");
    expect(poznan.map((s) => `${s.type} ${s.name} ${s.count}`)).toEqual([
      "ul. Głogowska 1",
      "os. Pod Lipami 3",
      "ul. Wilczak 1",
    ]);
    expect(
      streetsUnder(STREETS, "wielkopolskie/poznan/poznan/grunwald"),
    ).toEqual([
      { name: "Głogowska", type: "ul.", count: 1 },
      { name: "Pod Lipami", type: "os.", count: 1 },
    ]);
    // granica segmentu: „poznan" nie obejmuje „poznanski"
    expect(streetsUnder(STREETS, "wielkopolskie/poznan")).toHaveLength(3);
    expect(streetsUnder(STREETS, "wielkopolskie")).toHaveLength(4);
    expect(suggestStreets(poznan, "pod")).toEqual([
      { name: "Pod Lipami", type: "os.", count: 3 },
    ]);
    expect(suggestStreets(poznan, "lip")).toHaveLength(1);
    expect(suggestStreets(poznan, "")).toEqual([]);
  });
});

describe("fixture", () => {
  const fixture = readOffersTyped("fixture");
  it.skipIf(fixture.length === 0)(
    "każdy wpis fixture'u ma węzeł wśród podpowiedzi po swojej nazwie; info tylko poza Poznaniem",
    () => {
      const { locations } = loadOffersData(FIXTURE_DIR);
      for (const o of fixture) {
        const e = toIndexEntry(o);
        const leafName = o.location.district ?? o.location.city;
        const found = suggestLocations(locations.nodes, leafName, 50);
        expect(
          found.map((n) => n.id),
          `${e.number}: ${leafName}`,
        ).toContain(e.location.nodeId);
      }
      for (const n of locations.nodes) {
        if (n.info)
          expect(n.id.startsWith("wielkopolskie/poznan/")).toBe(false);
      }
    },
  );
});
