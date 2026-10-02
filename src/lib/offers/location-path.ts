// Ścieżka węzłów drzewa lokalizacji dla lokalizacji oferty — JEDNO
// źródło reguły dla syncu (buduje `data/locations.json` —
// `scripts/sync/locations.ts` importuje stąd) i strony (docs/kb part3
// §4.2): id węzła = ścieżka slugów
//   województwo/powiat[/gmina]/miejscowość[/dzielnica-nadrzędna][/dzielnica]
// Gmina wchodzi tylko poza miastem, w którym gminy są dawnymi dzielnicami
// (nazwa gminy = `{miasto}-…`).
//
// Strona potrzebuje id najniższego węzła do filtra lokalizacji
// (dopasowanie PREFIKSOWE po segmentach — jak dziś `location=a|b|c…`),
// a `offers.json` go nie niesie — liczy go `index-entry.ts`. Spójność
// z drzewem pilnuje `tests/unit/offers-location-path.test.ts`.
import type { LocationLevel, OfferLocation } from "./schema";
import { slugify } from "./slug";

export interface LocationPathStep {
  id: string;
  level: LocationLevel;
  name: string;
}

/** Czy gmina to dawna dzielnica miasta (`Poznań-Wilda` dla `Poznań`). */
export function communeIsCityPart(commune: string, city: string): boolean {
  return commune === city || commune.startsWith(`${city}-`);
}

/** Ścieżka węzłów od województwa do najniższego poziomu lokalizacji. */
export function locationPath(
  loc: Pick<
    OfferLocation,
    "province" | "county" | "commune" | "city" | "parentDistrict" | "district"
  >,
): LocationPathStep[] {
  const steps: LocationPathStep[] = [];
  const push = (level: LocationLevel, name: string) => {
    const parent = steps.at(-1)?.id;
    const seg = slugify(name);
    steps.push({ id: parent ? `${parent}/${seg}` : seg, level, name });
  };
  push("province", loc.province);
  push("county", loc.county);
  if (!communeIsCityPart(loc.commune, loc.city)) push("commune", loc.commune);
  push("city", loc.city);
  const hasParent =
    loc.parentDistrict !== undefined && loc.parentDistrict !== loc.district;
  if (hasParent) push("district", loc.parentDistrict!);
  if (loc.district) push(hasParent ? "subdistrict" : "district", loc.district);
  return steps;
}

/** Id najniższego węzła lokalizacji oferty (`location.nodeId` w indeksie). */
export function leafId(loc: Parameters<typeof locationPath>[0]): string {
  return locationPath(loc).at(-1)!.id;
}

/** Dopasowanie prefiksowe po segmentach: `prefix` to id węzła
 *  (`wielkopolskie/poznan/poznan`), `nodeId` — id najniższego węzła oferty.
 *  Pusty prefiks = dowolna lokalizacja. `poznan` NIE pasuje do
 *  `poznanski` (granica segmentu). */
export function matchesLocation(nodeId: string, prefix: string): boolean {
  if (!prefix) return true;
  return nodeId === prefix || nodeId.startsWith(`${prefix}/`);
}
