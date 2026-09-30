// Drzewo lokalizacji z nazw: Poznań z 6 gminami-dzielnicami (gmina poza
// ścieżką), miejscowość poza Poznaniem (gmina w ścieżce, `info`), oferta
// bez dzielnicy, poddzielnica, liczniki, ulice, kolizja slugu adresowego.
import { describe, expect, it } from "vitest";
import {
  buildLocations,
  leafId,
  locationPath,
} from "../../scripts/sync/locations";
import { normalize } from "../../scripts/sync/normalize";
import {
  LocationsFileSchema,
  type NormalizedOffer,
  type OfferLocation,
} from "../../src/lib/offers/schema";
import { readSyntheticDictionary, readSyntheticList } from "../helpers/raw";

const dictionary = readSyntheticDictionary();
const base = readSyntheticList().map((r) => normalize(r, { dictionary }).offer);

function withLocation(
  offer: NormalizedOffer,
  number: string,
  loc: Partial<OfferLocation>,
): NormalizedOffer {
  return {
    ...offer,
    number,
    slug: number.toLowerCase(),
    location: { ...offer.location, ...loc },
  };
}

const poznan = (
  commune: string,
  parent?: string,
  district?: string,
  extra: Partial<OfferLocation> = {},
) => ({
  province: "Wielkopolskie",
  county: "Poznań",
  commune,
  city: "Poznań",
  parentDistrict: parent,
  district,
  placeName: district ? `Poznań ${district}` : "Poznań",
  slug: district
    ? `poznan-${district.toLowerCase().replace(/ł/g, "l").replace(/ /g, "-")}`
    : "poznan",
  ...extra,
});

describe("locationPath()", () => {
  it("Poznań: gmina-dzielnica poza ścieżką; dzielnica = nadrzędna → jeden węzeł district", () => {
    const loc = {
      ...base[0].location,
      ...poznan("Poznań-Grunwald", "Grunwald", "Grunwald"),
    };
    expect(locationPath(loc).map((s) => `${s.level}:${s.id}`)).toEqual([
      "province:wielkopolskie",
      "county:wielkopolskie/poznan",
      "city:wielkopolskie/poznan/poznan",
      "district:wielkopolskie/poznan/poznan/grunwald",
    ]);
  });

  it("poddzielnica: parent ≠ district → district + subdistrict", () => {
    expect(leafId(base[1].location)).toBe(
      "wielkopolskie/poznan/poznan/grunwald/lazarz",
    );
  });

  it("poza Poznaniem: gmina w ścieżce", () => {
    expect(leafId(base[2].location)).toBe(
      "wielkopolskie/poznanski/tarnowo-podgorne/baranowo",
    );
  });

  it("bez dzielnicy: liść = miasto", () => {
    expect(leafId(base[3].location)).toBe("wielkopolskie/poznan/poznan");
  });
});

describe("buildLocations() na danych syntetycznych + wariantach", () => {
  const offers: NormalizedOffer[] = [
    ...base,
    withLocation(
      base[0],
      "SW900011",
      poznan("Poznań-Jeżyce", "Jeżyce", "Jeżyce", {
        street: "Dąbrowskiego",
        streetType: "ul.",
      }),
    ),
    withLocation(
      base[0],
      "SW900012",
      poznan("Poznań-Nowe Miasto", "Nowe Miasto", "Rataje", {
        street: "Pod Lipami",
        streetType: "os.",
      }),
    ),
    withLocation(
      base[0],
      "SW900013",
      poznan("Poznań-Wilda", "Wilda", "Wilda", {
        street: undefined,
        streetType: undefined,
      }),
    ),
    withLocation(
      base[0],
      "SW900014",
      poznan("Poznań-Stare Miasto", "Stare Miasto", "Winogrady"),
    ),
    // drugie Baranowo w innej gminie — kolizja slugu adresowego
    withLocation(base[2], "SW900015", {
      county: "poznański",
      commune: "Mosina",
      city: "Baranowo",
      placeName: "Baranowo",
      slug: "baranowo",
    }),
  ];
  const result = buildLocations(offers);
  const { nodes, streets } = result.locations;
  const node = (id: string) => nodes.find((n) => n.id === id);

  it("wynik przechodzi schemat i jest posortowany po id", () => {
    expect(LocationsFileSchema.safeParse(result.locations).success).toBe(true);
    expect(nodes.map((n) => n.id)).toEqual([...nodes.map((n) => n.id)].sort());
  });

  it("Poznań: 5 gmin-dzielnic w `communes`, liczniki z potomkami", () => {
    const city = node("wielkopolskie/poznan/poznan")!;
    expect(city.level).toBe("city");
    expect(city.communes).toEqual([
      "Poznań-Grunwald",
      "Poznań-Jeżyce",
      "Poznań-Nowe Miasto",
      "Poznań-Stare Miasto",
      "Poznań-Wilda",
    ]);
    expect(city.count).toBe(7); // SW900001, 02, 04, 11–14
    expect(city.info).toBeUndefined();
    expect(node("wielkopolskie")!.count).toBe(offers.length);
    expect(node("wielkopolskie/poznan")!.count).toBe(7);
    expect(node("wielkopolskie/poznan/poznan/stare-miasto")!.count).toBe(2);
    expect(
      node("wielkopolskie/poznan/poznan/stare-miasto/winogrady"),
    ).toMatchObject({
      level: "subdistrict",
      name: "Winogrady",
      label: "Poznań Winogrady",
      parent: "wielkopolskie/poznan/poznan/stare-miasto",
      count: 2,
    });
    expect(node("wielkopolskie/poznan/poznan/grunwald/lazarz")!.level).toBe(
      "subdistrict",
    );
    expect(node("wielkopolskie/poznan/poznan/wilda")).toMatchObject({
      level: "district",
      count: 1,
    });
  });

  it("Baranowo ×2: dwa węzły rozróżnione gminą, `info`, brak węzła commune w Poznaniu", () => {
    expect(
      node("wielkopolskie/poznanski/tarnowo-podgorne/baranowo"),
    ).toMatchObject({
      level: "city",
      label: "Baranowo",
      info: "gm. Tarnowo Podgórne, pow. poznański",
      parent: "wielkopolskie/poznanski/tarnowo-podgorne",
      count: 1,
    });
    expect(node("wielkopolskie/poznanski/mosina/baranowo")?.info).toBe(
      "gm. Mosina, pow. poznański",
    );
    expect(node("wielkopolskie/poznanski/tarnowo-podgorne")?.level).toBe(
      "commune",
    );
    expect(
      nodes.filter((n) => n.level === "commune").map((n) => n.name),
    ).toEqual(["Mosina", "Tarnowo Podgórne"]);
  });

  it("ulice per najniższy węzeł, z typem i licznikiem", () => {
    expect(
      streets["wielkopolskie/poznan/poznan/stare-miasto/winogrady"],
    ).toEqual([{ name: "Pod Lipami", type: "os.", count: 2 }]);
    expect(streets["wielkopolskie/poznan/poznan/nowe-miasto/rataje"]).toEqual([
      { name: "Pod Lipami", type: "os.", count: 1 },
    ]);
    expect(streets["wielkopolskie/poznan/poznan"]).toEqual([
      { name: "Wilczak", type: "ul.", count: 1 },
    ]);
    expect(
      streets["wielkopolskie/poznanski/tarnowo-podgorne/baranowo"],
    ).toBeUndefined();
  });

  it("kolizja slugu adresowego → sufiks -2 dla drugiego węzła + SLUG_COLLISION", () => {
    const slugs = Object.fromEntries(
      result.offers.map((o) => [o.number, o.location.slug]),
    );
    expect(slugs.SW900015).toBe("baranowo");
    expect(slugs.SW900003).toBe("baranowo-2");
    expect(slugs.SW900001).toBe("poznan-winogrady");
    expect(slugs.SW900014).toBe("poznan-winogrady");
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "SLUG_COLLISION",
        detail: expect.stringContaining("baranowo → baranowo-2"),
      }),
    ]);
    // wejście nietknięte
    expect(offers[2].location.slug).toBe("baranowo");
  });

  it("bez kolizji: te same obiekty ofert, brak ostrzeżeń", () => {
    const r = buildLocations(base);
    expect(r.warnings).toEqual([]);
    expect(r.offers[0]).toBe(base[0]);
  });

  it("zero ofert → puste drzewo", () => {
    expect(buildLocations([])).toEqual({
      locations: { nodes: [], streets: {} },
      offers: [],
      warnings: [],
    });
  });
});
