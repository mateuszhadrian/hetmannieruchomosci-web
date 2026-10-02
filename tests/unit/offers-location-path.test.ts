// `src/lib/offers/location-path.ts` to JEDYNE źródło reguły ścieżki
// slugów; `scripts/sync/locations.ts` re-eksportuje ją (scalone po 4.2 a).
// Test pilnuje, że re-eksport syncu wskazuje tę samą implementację (synt.,
// fixture, `data/` — przez helper, plików może nie być), że każdy id
// oferty istnieje w drzewie `locations.json` obok niej, a liczniki węzłów
// = liczba ofert w poddrzewie (kontrakt filtra prefiksowego).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  leafId as syncLeafId,
  locationPath as syncLocationPath,
} from "../../scripts/sync/locations";
import {
  leafId,
  locationPath,
  matchesLocation,
} from "../../src/lib/offers/location-path";
import { LocationsFileSchema } from "../../src/lib/offers/schema";
import { DATA_DIR, FIXTURE_DIR, readOffersTyped } from "../helpers/offers";
import { syntheticFullOffers } from "../helpers/raw";

describe("locationPath / leafId (dane syntetyczne)", () => {
  const offers = syntheticFullOffers();

  it("ścieżka = ta sama, którą buduje sync", () => {
    for (const o of offers) {
      expect(locationPath(o.location)).toEqual(syncLocationPath(o.location));
      expect(leafId(o.location)).toBe(syncLeafId(o.location));
    }
  });

  it("gmina poza miastem wchodzi w ścieżkę, gmina-dzielnica Poznania nie", () => {
    const outside = offers.find((o) => o.location.city === "Baranowo")!;
    expect(leafId(outside.location)).toBe(
      "wielkopolskie/poznanski/tarnowo-podgorne/baranowo",
    );
    const poznan = offers.find((o) => o.location.district === "Winogrady")!;
    expect(leafId(poznan.location)).toBe(
      "wielkopolskie/poznan/poznan/stare-miasto/winogrady",
    );
    const noDistrict = offers.find(
      (o) => o.location.district === undefined && o.location.city === "Poznań",
    )!;
    expect(leafId(noDistrict.location)).toBe("wielkopolskie/poznan/poznan");
  });
});

describe("matchesLocation (prefiks po segmentach)", () => {
  const node = "wielkopolskie/poznan/poznan/stare-miasto/winogrady";
  it("pusty prefiks = dowolna lokalizacja", () => {
    expect(matchesLocation(node, "")).toBe(true);
  });
  it("każdy przodek i sam węzeł pasują", () => {
    for (const p of [
      "wielkopolskie",
      "wielkopolskie/poznan",
      "wielkopolskie/poznan/poznan",
      "wielkopolskie/poznan/poznan/stare-miasto",
      node,
    ]) {
      expect(matchesLocation(node, p), p).toBe(true);
    }
  });
  it("granica segmentu: `poznan` nie pasuje do `poznanski`, potomek nie pasuje do rodzica", () => {
    expect(
      matchesLocation("wielkopolskie/poznanski/kornik", "wielkopolskie/poznan"),
    ).toBe(false);
    expect(matchesLocation("wielkopolskie/poznan", node)).toBe(false);
    expect(matchesLocation(node, "wielkopolskie/poznan/poznan/wilda")).toBe(
      false,
    );
  });
});

for (const set of [
  { name: "fixture", source: "fixture" as const, dir: FIXTURE_DIR },
  { name: "data/", source: "data" as const, dir: DATA_DIR },
]) {
  const offers = readOffersTyped(set.source);
  describe.skipIf(offers.length === 0)(
    `równoważność z syncem i spójność z locations.json: ${set.name}`,
    () => {
      it("leafId strony = leafId syncu dla każdej oferty", () => {
        for (const o of offers) {
          expect(leafId(o.location), o.number).toBe(syncLeafId(o.location));
        }
      });

      it("id każdej oferty istnieje w drzewie, a liczniki węzłów = liczba ofert w poddrzewie", () => {
        const file = join(set.dir, "locations.json");
        expect(existsSync(file)).toBe(true);
        const tree = LocationsFileSchema.parse(
          JSON.parse(readFileSync(file, "utf8")),
        );
        const ids = new Set(tree.nodes.map((n) => n.id));
        for (const o of offers) {
          expect(ids.has(leafId(o.location)), o.number).toBe(true);
        }
        for (const n of tree.nodes) {
          const inSubtree = offers.filter((o) =>
            matchesLocation(leafId(o.location), n.id),
          ).length;
          expect(inSubtree, n.id).toBe(n.count);
        }
      });
    },
  );
}
