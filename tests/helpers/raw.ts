// Dane syntetyczne o kształcie API (tests/fixtures/raw/) — do testów kodu
// syncu. Rekordy są WYMYŚLONE (numery SW9000xx, host zdjęć .invalid);
// pola z FORBIDDEN_FIELDS niosą wartownika, którego nie wolno zobaczyć
// w żadnym wyniku.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Dictionary } from "../../scripts/sync/dictionary";
import { buildLocations } from "../../scripts/sync/locations";
import { normalize } from "../../scripts/sync/normalize";
import { OfferSchema } from "../../src/lib/offers/schema";
import type { RawRecord } from "../../src/lib/offers/public-fields";

export const FORBIDDEN_SENTINEL = "FORBIDDEN_SENTINEL";

const RAW_DIR = new URL("../fixtures/raw/", import.meta.url);

function readJson<T>(name: string): T {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(name, RAW_DIR)), "utf8"),
  ) as T;
}

export function readSyntheticList(): RawRecord[] {
  return readJson<RawRecord[]>("synthetic-list.json");
}

export function readSyntheticDictionary(): Dictionary {
  return readJson<Dictionary>("dictionary-synthetic.json");
}

export function readTitles45(): Array<{
  title: string;
  transaction: "sprzedaz" | "wynajem";
  expectedStatus: "aktywna" | "rezerwacja" | "sprzedana" | "wynajeta";
}> {
  return readJson("titles-45.json");
}

export function readListFragment(): string {
  return readFileSync(
    fileURLToPath(new URL("lista-fragment.html", RAW_DIR)),
    "utf8",
  );
}

/** Prawdziwy słownik API (same etykiety), jeśli leży w katalogu analizy
 *  POZA repo (`../draftdata/analiza-crm-dane/slownik-api.json` albo
 *  `ESTI_DICTIONARY_FILE`); inaczej słownik syntetyczny. Plik nie trafia do
 *  repo: jedna z grup niesie etykietę sygnału kontrolnego umowy. */
export function readDictionaryForTests(): {
  dictionary: Dictionary;
  real: boolean;
} {
  const candidates = [
    process.env.ESTI_DICTIONARY_FILE,
    fileURLToPath(
      new URL(
        "../../../draftdata/analiza-crm-dane/slownik-api.json",
        import.meta.url,
      ),
    ),
  ].filter((p): p is string => Boolean(p));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    return {
      dictionary: JSON.parse(readFileSync(path, "utf8")) as Dictionary,
      real: true,
    };
  }
  return { dictionary: readSyntheticDictionary(), real: false };
}

/** Oferty syntetyczne w PEŁNYM kształcie `Offer` (po kroku zdjęć):
 *  normalizacja + lokalizacje + zmyślone dane pobrania zdjęć (klucz R2 wg
 *  wzorca, ETag, wymiary). Do testów warstwy danych strony, która nie
 *  pobiera niczego. */
export function syntheticFullOffers(): import("../../src/lib/offers/schema").Offer[] {
  const dictionary = readSyntheticDictionary();
  const normalized = readSyntheticList().map(
    (raw) => normalize(raw, { dictionary }).offer,
  );
  const { offers } = buildLocations(normalized);
  return offers.map((offer) =>
    OfferSchema.parse({
      ...offer,
      photos: offer.photos.map((p, i) => ({
        ...p,
        r2Key: `offers/${offer.crmId}/${p.id}-${(i + 1).toString(16).padStart(8, "0")}.jpg`,
        etag: `"etag-${p.id}"`,
        width: 1200,
        height: 900,
      })),
    }),
  );
}
