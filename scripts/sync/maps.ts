// Mapy ofert (2.6, D36): jeden statyczny obraz Geoapify per unikalna para
// współrzędnych (`coordKey`, 5 miejsc ≈ 1 m — 7 ofert w jednym punkcie =
// 1 żądanie), PNG → WebP przez sharp bez kadrowania (pasek atrybucji
// u dołu NIETKNIĘTY — darmowy plan Geoapify i licencja ODbL), klucz R2
// `maps/{hash}.webp`, manifest `data/maps.json` z `goneSince`.
// Klucz API jest w query adresu Geoapify — adres nie trafia do logów ani
// komunikatów. Geokodowania nie ma: schemat oferty wymaga współrzędnych
// (brak = oferta pada już w normalizacji).
import { createHash } from "node:crypto";
import sharp from "sharp";
import { coordKey } from "../../src/lib/offers/map-key";
import type { MapEntry, MapManifest } from "../../src/lib/offers/schema";
import { MAP_MARKER } from "../../src/lib/site-config";
import type { FetchLike } from "./esti-client";
import type { R2Store } from "./r2";
import { warning, type SyncWarning } from "./warnings";

export type MarkerMode = typeof MAP_MARKER;

/** Styl i zoom jak mapa kontaktu (docs/kb formularz-kontakt §4a). */
export const MAP_STYLE = "osm-bright-grey";
export const MAP_ZOOM = 15.5;
/** Kadr 4:3 (jak makieta detalu 900×675) + pasek atrybucji (~17 px
 *  logicznych); `scaleFactor=2` → plik 1200×934. */
export const MAP_WIDTH = 600;
export const MAP_HEIGHT = 467;
export const MAP_SCALE = 2;
/** promień okręgu przybliżonego (m) dla `MAP_MARKER = "circle"` */
export const CIRCLE_RADIUS_M = 250;
export const MAP_CONCURRENCY = 2;
const RETRY_DELAY_MS = 2_000;
const GEOAPIFY_BASE = "https://maps.geoapify.com/v1/staticmap";

export interface MapOffer {
  number: string;
  location: { lat: number; lon: number };
}

export interface SyncMapsOptions {
  offers: readonly MapOffer[];
  manifest: MapManifest;
  store: R2Store;
  apiKey: string;
  /** `YYYY-MM-DD` — do `goneSince` */
  today: string;
  marker?: MarkerMode;
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  concurrency?: number;
}

export interface MapStats {
  /** unikalne punkty w widocznych ofertach */
  points: number;
  /** wpisy manifestu użyte bez żądania */
  reused: number;
  requested: number;
  uploaded: number;
  failed: number;
  gone: number;
}

export interface SyncMapsResult {
  manifest: MapManifest;
  warnings: SyncWarning[];
  stats: MapStats;
}

/** Klucz R2 mapy: hash klucza współrzędnych i trybu znacznika — zmiana
 *  trybu daje nowe obrazy, stare wygasają przez `goneSince`. */
export function mapR2Key(key: string, marker: MarkerMode): string {
  const hash = createHash("sha256").update(`${key}|${marker}`).digest("hex");
  return `maps/${hash.slice(0, 16)}.webp`;
}

/** Adres obrazu Geoapify. Zawiera klucz API — tylko do żądania.
 *  Składany ręcznie: Geoapify czyta `;`, `:` i `,` w parametrach dosłownie,
 *  a URLSearchParams by je zakodował. */
export function geoapifyUrl(
  lat: number,
  lon: number,
  marker: MarkerMode,
  apiKey: string,
): string {
  // granat marki (`--navy` w src/styles/global.css; CSS nie da się tu
  // zaimportować — trzymać W PARZE)
  const color = "%23183a6b";
  const shape =
    marker === "exact"
      ? `marker=lonlat:${lon},${lat};type:material;color:${color};size:large`
      : `geometry=circle:${lon},${lat},${CIRCLE_RADIUS_M};linewidth:2;linecolor:${color};fillcolor:${color};fillopacity:0.2`;
  const params = [
    `style=${MAP_STYLE}`,
    `width=${MAP_WIDTH}`,
    `height=${MAP_HEIGHT}`,
    `center=lonlat:${lon},${lat}`,
    `zoom=${MAP_ZOOM}`,
    `scaleFactor=${MAP_SCALE}`,
    "format=png",
    shape,
    `apiKey=${encodeURIComponent(apiKey)}`,
  ];
  return `${GEOAPIFY_BASE}?${params.join("&")}`;
}

async function toWebp(
  png: Uint8Array,
): Promise<{ body: Uint8Array; width: number; height: number }> {
  const { data, info } = await sharp(png)
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { body: new Uint8Array(data), width: info.width, height: info.height };
}

async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(limit, items.length)) },
      async () => {
        while (next < items.length) {
          const i = next++;
          results[i] = await fn(items[i]);
        }
      },
    ),
  );
  return results;
}

export async function syncMaps(
  options: SyncMapsOptions,
): Promise<SyncMapsResult> {
  const marker = options.marker ?? MAP_MARKER;
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const warnings: SyncWarning[] = [];
  const stats: MapStats = {
    points: 0,
    reused: 0,
    requested: 0,
    uploaded: 0,
    failed: 0,
    gone: 0,
  };

  // ── unikalne punkty (zachowana kolejność pierwszego wystąpienia)
  const points = new Map<
    string,
    { lat: number; lon: number; numbers: string[] }
  >();
  for (const offer of options.offers) {
    const key = coordKey(offer.location.lat, offer.location.lon);
    const p = points.get(key);
    if (p) p.numbers.push(offer.number);
    else
      points.set(key, {
        lat: offer.location.lat,
        lon: offer.location.lon,
        numbers: [offer.number],
      });
  }
  stats.points = points.size;

  const manifest: MapManifest = {};
  const entries = await mapPool(
    [...points.entries()],
    options.concurrency ?? MAP_CONCURRENCY,
    async ([key, p]): Promise<[string, MapEntry | undefined]> => {
      const r2Key = mapR2Key(key, marker);
      const previous = options.manifest[key];
      if (previous && previous.r2Key === r2Key) {
        stats.reused += 1;
        const { goneSince: _g, ...fresh } = previous;
        void _g;
        return [key, fresh];
      }
      const url = geoapifyUrl(p.lat, p.lon, marker, options.apiKey);
      let res: Response | undefined;
      let reason = "błąd sieci";
      for (let attempt = 0; attempt < 2 && !res; attempt++) {
        try {
          stats.requested += 1;
          const r = await doFetch(url, { method: "GET" });
          if ((r.status === 429 || r.status >= 500) && attempt === 0) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          res = r;
        } catch {
          if (attempt === 0) await sleep(RETRY_DELAY_MS);
        }
      }
      if (res && !res.ok) reason = `HTTP ${res.status}`;
      let entry: MapEntry | undefined;
      if (res?.ok) {
        try {
          const png = new Uint8Array(await res.arrayBuffer());
          const webp = await toWebp(png);
          await options.store.put(r2Key, webp.body, "image/webp");
          stats.uploaded += 1;
          entry = { r2Key, width: webp.width, height: webp.height };
        } catch {
          reason = "odpowiedź nie jest obrazem";
        }
      }
      if (!entry) {
        stats.failed += 1;
        warnings.push(
          warning(
            "MAP_FETCH",
            p.numbers[0],
            `${reason}; punkt dzieli ${p.numbers.length} ofert${previous ? " — poprzednia mapa" : " — bez mapy"}`,
          ),
        );
        if (previous) {
          const { goneSince: _g, ...fresh } = previous;
          void _g;
          return [key, fresh];
        }
        return [key, undefined];
      }
      return [key, entry];
    },
  );
  for (const [key, entry] of entries) if (entry) manifest[key] = entry;

  // ── punkty, których dziś nie ma
  for (const [key, entry] of Object.entries(options.manifest)) {
    if (manifest[key]) continue;
    if (entry.goneSince === undefined) stats.gone += 1;
    manifest[key] = { ...entry, goneSince: entry.goneSince ?? options.today };
  }

  return {
    manifest: Object.fromEntries(
      Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
    ),
    warnings,
    stats,
  };
}
