// Dane syntetyczne o kształcie API (tests/fixtures/raw/) — do testów kodu
// syncu. Rekordy są WYMYŚLONE (numery SW9000xx, host zdjęć .invalid);
// pola z FORBIDDEN_FIELDS niosą wartownika, którego nie wolno zobaczyć
// w żadnym wyniku.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Dictionary } from "../../scripts/sync/dictionary";
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
