// Podpowiedzi lokalizacji i ulic dla wyspy wyszukiwarki (4.2 b) — czyste
// funkcje na drzewie z `index.json.locations` (part3 §4.2: słownik
// offline, `info` ZAWSZE pokazywane, gdy węzeł je ma — miejscowości poza
// Poznaniem). Logika FILTRA lokalizacji (prefiks po segmentach) zostaje
// w `filters.ts`/`location-path.ts`; tu jest wyłącznie dobór podpowiedzi.
import type { OfferIndexEntry } from "./index-entry";
import { matchesLocation } from "./location-path";
import type { LocationNode, LocationStreet, LocationsFile } from "./schema";
import { normalizeText } from "./text";

/** Poziomy w podpowiedziach (R21): placeholder designu „Miejscowość lub
 *  dzielnica" — powiat i województwo poza listą (`info` i tak niesie
 *  gminę i powiat). */
export const SUGGEST_LEVELS: readonly LocationNode["level"][] = [
  "city",
  "district",
  "subdistrict",
];
export const MAX_SUGGESTIONS = 8;

/** „Poznań Winogrady" / „Baranowo" — etykieta węzła w chipie i liście. */
export function nodeLabel(node: Pick<LocationNode, "label" | "name">): string {
  return node.label ?? node.name;
}

export function nodeById(
  nodes: readonly LocationNode[],
  id: string,
): LocationNode | undefined {
  return nodes.find((n) => n.id === id);
}

/** Liść drzewa = węzeł bez dzieci (zbiór prefiksowy = zbiór slugu). */
export function isLeaf(
  nodes: readonly { parent: string | null }[],
  id: string,
): boolean {
  return !nodes.some((n) => n.parent === id);
}

/** Id węzła dla segmentu adresu listy — z wpisów indeksu (slug adresowy
 *  ≠ id węzła; `data-sync.md`). */
export function nodeOfSlug(
  entries: readonly OfferIndexEntry[],
  slug: string,
): string | undefined {
  return entries.find((e) => e.location.slug === slug)?.location.nodeId;
}

function startsAtWord(haystack: string, needle: string): boolean {
  if (haystack.startsWith(needle)) return true;
  return haystack.split(" ").some((w) => w.startsWith(needle));
}

/** Podpowiedzi dla wpisanego tekstu: węzły poziomów `SUGGEST_LEVELS`
 *  z ofertami, dopasowanie prefiksem słowa po `normalizeText` (etykieta
 *  i nazwa); kolejność: dopasowanie od początku etykiety, potem liczba
 *  ofert malejąco, potem etykieta. */
export function suggestLocations(
  nodes: readonly LocationNode[],
  query: string,
  limit = MAX_SUGGESTIONS,
): LocationNode[] {
  const q = normalizeText(query);
  if (!q) return [];
  const scored = nodes
    .filter((n) => SUGGEST_LEVELS.includes(n.level) && n.count > 0)
    .map((n) => {
      const label = normalizeText(nodeLabel(n));
      const name = normalizeText(n.name);
      const prefix = label.startsWith(q) || name.startsWith(q);
      const word = startsAtWord(label, q) || startsAtWord(name, q);
      return { n, prefix, word };
    })
    .filter((s) => s.word);
  scored.sort(
    (a, b) =>
      Number(b.prefix) - Number(a.prefix) ||
      b.n.count - a.n.count ||
      nodeLabel(a.n).localeCompare(nodeLabel(b.n), "pl"),
  );
  return scored.slice(0, limit).map((s) => s.n);
}

/** Ulice pod węzłem (kaskada lokalizacja → ulica): ulice wszystkich
 *  węzłów o id będącym węzłem albo jego potomkiem, zsumowane po nazwie
 *  i typie, posortowane po nazwie. */
export function streetsUnder(
  streets: LocationsFile["streets"],
  nodeId: string,
): LocationStreet[] {
  const byKey = new Map<string, LocationStreet>();
  for (const [id, list] of Object.entries(streets)) {
    if (!matchesLocation(id, nodeId)) continue;
    for (const s of list) {
      const key = `${s.type} ${s.name}`;
      const prev = byKey.get(key);
      byKey.set(
        key,
        prev ? { ...prev, count: prev.count + s.count } : { ...s },
      );
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

/** Podpowiedzi ulic: prefiks słowa po normalizacji. */
export function suggestStreets(
  streets: readonly LocationStreet[],
  query: string,
  limit = MAX_SUGGESTIONS,
): LocationStreet[] {
  const q = normalizeText(query);
  if (!q) return [];
  return streets
    .filter((s) => startsAtWord(normalizeText(s.name), q))
    .slice(0, limit);
}
