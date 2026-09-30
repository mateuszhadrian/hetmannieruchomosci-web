// Dawne adresy ofert w poprzednim serwisie → `data/legacy-redirects.json`
// (D11, D31). Uruchamia i commituje Mateusz (`pnpm redirects:legacy`).
//   --from-file <plik.json>  zapis analizy (pola: numer, id, url)
//   --from-site [adres]      strony listy obecnej witryny, WYŁĄCZNIE GET
//   --out <plik>             domyślnie data/legacy-redirects.json
// Dla każdej oferty: /nieruchomosci/{typ}/{lokalizacja}/{id},
// /offer/offer/{id}, /offer/offer-print/{id}.
import { DomUtils, parseDocument } from "htmlparser2";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  LegacyRedirectsSchema,
  type LegacyRedirects,
} from "../src/lib/offers/schema";

export interface LegacyEntry {
  number: string;
  legacyId: number;
  /** ścieżka detalu w poprzednim serwisie */
  path: string;
}

const DETAIL_PATH = /^\/nieruchomosci\/[^/]+\/[^/]+\/(\d+)\/?$/;
const NUMBER = /Nr oferty:\s*([A-Z]+\d+)/;

function pathOf(href: string): string | undefined {
  try {
    return new URL(href, "https://example.invalid").pathname;
  } catch {
    return undefined;
  }
}

/** Karty ofert z HTML listy: link detalu (id) + „Nr oferty: …". */
export function parseLegacyList(html: string): LegacyEntry[] {
  const doc = parseDocument(html);
  const out: LegacyEntry[] = [];
  const cards = DomUtils.findAll(
    (el) =>
      el.name === "article" && /\bdownload-card\b/.test(el.attribs.class ?? ""),
    doc.children,
  );
  for (const card of cards) {
    const link = DomUtils.findOne(
      (el) =>
        el.name === "a" &&
        DETAIL_PATH.test(pathOf(el.attribs.href ?? "") ?? ""),
      card.children,
    );
    const path = link ? pathOf(link.attribs.href) : undefined;
    const id = path ? DETAIL_PATH.exec(path)?.[1] : undefined;
    const number = NUMBER.exec(DomUtils.textContent(card))?.[1];
    if (!path || !id || !number) continue;
    out.push({ number, legacyId: Number(id), path: path.replace(/\/$/, "") });
  }
  return out;
}

/** Zapis analizy (`oferty-45.json`): `numer`, `id`, `url`. */
export function parseLegacyFile(json: string): LegacyEntry[] {
  const rows = JSON.parse(json) as Array<{
    numer?: string;
    id?: number;
    url?: string;
  }>;
  return rows
    .filter((r) => r.numer && r.id && r.url)
    .map((r) => ({
      number: r.numer!,
      legacyId: Number(r.id),
      path: r.url!.replace(/\/$/, ""),
    }));
}

/** Wpisy → mapa numer → { legacyId, paths } (3 wzorce adresu, klucze
 *  posortowane). Powtórzony numer: pierwszy wpis wygrywa. */
export function toLegacyRedirects(
  entries: readonly LegacyEntry[],
): LegacyRedirects {
  const map: LegacyRedirects = {};
  for (const e of entries) {
    if (map[e.number]) continue;
    map[e.number] = {
      legacyId: e.legacyId,
      paths: [
        e.path,
        `/offer/offer/${e.legacyId}`,
        `/offer/offer-print/${e.legacyId}`,
      ],
    };
  }
  return Object.fromEntries(
    Object.keys(map)
      .sort()
      .map((k) => [k, map[k]]),
  );
}

/** Strony listy (`?searchIndex=1,2,…`) aż do pustej — tylko GET. */
export async function collectFromSite(
  base: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LegacyEntry[]> {
  const all: LegacyEntry[] = [];
  for (let page = 1; page <= 50; page++) {
    const url = new URL("/lista-ofert", base);
    url.searchParams.set("searchIndex", String(page));
    url.searchParams.set("sort", "add_date_desc");
    const res = await fetchImpl(url, { method: "GET" });
    if (!res.ok) throw new Error(`lista: HTTP ${res.status} (strona ${page})`);
    const entries = parseLegacyList(await res.text());
    if (entries.length === 0) break;
    const fresh = entries.filter(
      (e) => !all.some((a) => a.number === e.number),
    );
    if (fresh.length === 0) break;
    all.push(...fresh);
  }
  return all;
}

async function main(argv: string[]) {
  const arg = (name: string) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const out = arg("--out") ?? "data/legacy-redirects.json";
  let entries: LegacyEntry[];
  if (argv.includes("--from-file")) {
    const file = arg("--from-file");
    if (!file) throw new Error("--from-file wymaga ścieżki");
    entries = parseLegacyFile(readFileSync(file, "utf8"));
  } else if (argv.includes("--from-site")) {
    const base = arg("--from-site")?.startsWith("http")
      ? arg("--from-site")!
      : "https://hetmannieruchomosci.com";
    entries = await collectFromSite(base);
  } else {
    throw new Error("podaj --from-file <plik> albo --from-site [adres]");
  }
  const data = LegacyRedirectsSchema.parse(toLegacyRedirects(entries));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
  console.log(`legacy-redirects: ${Object.keys(data).length} ofert → ${out}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  main(process.argv.slice(2)).catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
