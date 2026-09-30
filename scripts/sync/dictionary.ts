// Słownik API (`GET /offer/dictionary`): { success, data: { grupa: { id:
// etykieta } } }. Normalizacja dostaje go jako parametr — pobieranie
// dochodzi do klienta API (2.4). Mapowanie pole → grupa: normalize.ts.
import { z } from "zod";

export const DictionarySchema = z.object({
  success: z.boolean().optional(),
  data: z.record(z.string(), z.record(z.string(), z.string())),
});

export type Dictionary = z.infer<typeof DictionarySchema>;

/** Grupy słownika używane przez normalizację. */
export const DICTIONARY_GROUPS = [
  "types",
  "kitchenTypes",
  "apartmentEquipments",
  "ownership",
  "buildingCondition",
  "heating",
  "buildingMaterials",
  "fence",
  "road",
  "developmentArea",
  "ownershipGround",
] as const;
export type DictionaryGroup = (typeof DICTIONARY_GROUPS)[number];

/** Etykieta dla id w grupie; `undefined`, gdy grupy albo id brak. */
export function lookup(
  dict: Dictionary,
  group: DictionaryGroup,
  id: number | string | null | undefined,
): string | undefined {
  if (id === null || id === undefined || id === "") return undefined;
  const label = dict.data[group]?.[String(id)];
  return label === undefined || label === "" ? undefined : label;
}

/** Pusty słownik — do testów i trybów bez pobierania. */
export const EMPTY_DICTIONARY: Dictionary = { success: true, data: {} };
