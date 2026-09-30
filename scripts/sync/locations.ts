// Drzewo lokalizacji z NAZW (`data/locations.json`, docs/kb part3 §4.2):
// wyłącznie lokalizacje występujące w widocznych ofertach + przodkowie.
// Id węzła = ścieżka slugów
//   województwo/powiat[/gmina]/miejscowość[/dzielnica-nadrzędna][/dzielnica]
// Gmina wchodzi w ścieżkę tylko poza miastem, w którym gminy są dawnymi
// dzielnicami (nazwa gminy = `{miasto}-…`). Niejednoznaczne nazwy
// miejscowości rozstrzyga ścieżka, nie nazwa.
//
// Slug ADRESOWY oferty (`location.slug`, segment URL) to `slugify(placeName)`
// z normalizacji; tu dostaje sufiks `-2`, `-3`…, gdy ten sam slug wskazuje
// różne węzły (kolizja → ostrzeżenie SLUG_COLLISION).
import {
  type LocationLevel,
  type LocationNode,
  type LocationStreet,
  type LocationsFile,
  type NormalizedOffer,
  type OfferLocation,
} from "../../src/lib/offers/schema";
import { slugify } from "../../src/lib/offers/slug";
import { warning, type SyncWarning } from "./warnings";

/** Czy gmina to dawna dzielnica miasta (`Poznań-Wilda` dla `Poznań`). */
function communeIsCityPart(commune: string, city: string): boolean {
  return commune === city || commune.startsWith(`${city}-`);
}

interface PathStep {
  id: string;
  level: LocationLevel;
  name: string;
}

/** Ścieżka węzłów od województwa do najniższego poziomu lokalizacji. */
export function locationPath(loc: OfferLocation): PathStep[] {
  const steps: PathStep[] = [];
  const push = (level: LocationLevel, name: string) => {
    const parent = steps.at(-1)?.id;
    const seg = slugify(name);
    steps.push({ id: parent ? `${parent}/${seg}` : seg, level, name });
  };
  push("province", loc.province);
  push("county", loc.county);
  if (!communeIsCityPart(loc.commune, loc.city)) push("commune", loc.commune);
  push("city", loc.city);
  if (loc.parentDistrict && loc.parentDistrict !== loc.district) {
    push("district", loc.parentDistrict);
  }
  if (loc.district) {
    push(
      loc.parentDistrict && loc.parentDistrict !== loc.district
        ? "subdistrict"
        : "district",
      loc.district,
    );
  }
  return steps;
}

/** Id najniższego węzła lokalizacji oferty. */
export function leafId(loc: OfferLocation): string {
  return locationPath(loc).at(-1)!.id;
}

export interface BuildLocationsResult {
  locations: LocationsFile;
  /** oferty z rozstrzygniętymi slugami adresowymi (nowe obiekty) */
  offers: NormalizedOffer[];
  warnings: SyncWarning[];
}

/** Buduje drzewo, liczniki i ulice; rozstrzyga kolizje slugów adresowych. */
export function buildLocations(
  offers: readonly NormalizedOffer[],
): BuildLocationsResult {
  const nodes = new Map<string, LocationNode>();
  const communes = new Map<string, Set<string>>();
  const streets = new Map<string, Map<string, LocationStreet>>();
  const warnings: SyncWarning[] = [];

  for (const offer of offers) {
    const loc = offer.location;
    const path = locationPath(loc);
    path.forEach((step, i) => {
      let node = nodes.get(step.id);
      if (!node) {
        node = {
          id: step.id,
          level: step.level,
          name: step.name,
          parent: i === 0 ? null : path[i - 1].id,
          count: 0,
        };
        nodes.set(step.id, node);
      }
      node.count += 1;
    });
    const leaf = path.at(-1)!;
    const leafNode = nodes.get(leaf.id)!;
    leafNode.label ??= loc.placeName;
    if (leaf.level === "city" && !communeIsCityPart(loc.commune, loc.city)) {
      leafNode.info ??= `gm. ${loc.commune}, pow. ${loc.county}`;
    }
    const cityStep = path.find((s) => s.level === "city")!;
    if (communeIsCityPart(loc.commune, loc.city) && loc.commune !== loc.city) {
      let set = communes.get(cityStep.id);
      if (!set) communes.set(cityStep.id, (set = new Set()));
      set.add(loc.commune);
    }
    if (loc.street && loc.streetType) {
      let byName = streets.get(leaf.id);
      if (!byName) streets.set(leaf.id, (byName = new Map()));
      const key = `${loc.streetType} ${loc.street}`;
      const entry = byName.get(key) ?? {
        name: loc.street,
        type: loc.streetType,
        count: 0,
      };
      entry.count += 1;
      byName.set(key, entry);
    }
  }

  for (const [cityId, set] of communes) {
    nodes.get(cityId)!.communes = [...set].sort((a, b) =>
      a.localeCompare(b, "pl"),
    );
  }

  // ── slugi adresowe: ten sam slug → różne węzły = kolizja
  const slugOwners = new Map<string, string[]>();
  for (const offer of offers) {
    const id = leafId(offer.location);
    const owners = slugOwners.get(offer.location.slug) ?? [];
    if (!owners.includes(id)) owners.push(id);
    slugOwners.set(offer.location.slug, owners);
  }
  const resolvedSlug = new Map<string, string>(); // leafId → slug
  for (const [slug, owners] of slugOwners) {
    owners.sort();
    owners.forEach((id, i) => {
      const final = i === 0 ? slug : `${slug}-${i + 1}`;
      resolvedSlug.set(id, final);
      if (i > 0)
        warnings.push(
          warning("SLUG_COLLISION", undefined, `${slug} → ${final} (${id})`),
        );
    });
  }
  const resolvedOffers = offers.map((offer) => {
    const slug = resolvedSlug.get(leafId(offer.location))!;
    return slug === offer.location.slug
      ? offer
      : { ...offer, location: { ...offer.location, slug } };
  });

  const sortedNodes = [...nodes.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const streetsOut: LocationsFile["streets"] = {};
  for (const id of [...streets.keys()].sort()) {
    streetsOut[id] = [...streets.get(id)!.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pl"),
    );
  }

  return {
    locations: { nodes: sortedNodes, streets: streetsOut },
    offers: resolvedOffers,
    warnings,
  };
}
