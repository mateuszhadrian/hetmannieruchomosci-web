// Zdjęcia ofert → R2 (2.5; part3 §3.2, §3.4; D29). Dla każdego zdjęcia
// widocznej oferty: GET z `If-None-Match` → 304 = nic do roboty, 200 →
// sha256, wymiary (sharp), klucz `offers/{crmId}/{photoId}-{sha256[:8]}.jpg`
// (hash treści w kluczu, bo transformacje cache'ują warianty po URL-u),
// zapis do R2. Manifest `data/photos.json` per adres źródłowy; wpisy
// zdjęć, których nie ma w widocznych ofertach, dostają `goneSince`
// (czyszczenie: r2.ts). Współbieżność ≤ 4. Źródło CRM jest hostem
// publicznym bez tokena — adres zdjęcia może być w komunikatach.
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  OfferSchema,
  type NormalizedOffer,
  type Offer,
  type OfferPhoto,
  type OfferStatus,
  type PhotoDraft,
  type PhotoManifest,
  type PhotoManifestEntry,
} from "../../src/lib/offers/schema";
import type { FetchLike } from "./esti-client";
import type { R2Store } from "./r2";
import { warning, type SyncWarning } from "./warnings";

export const PHOTO_CONCURRENCY = 4;
const RETRY_DELAY_MS = 2_000;

export interface SyncPhotosOptions {
  /** oferty widoczne po normalizacji */
  offers: readonly NormalizedOffer[];
  /** poprzedni manifest (`data/photos.json`), `{}` przy pierwszym syncu */
  manifest: PhotoManifest;
  /** numer → status z poprzedniego `data/offers.json` (do W6) */
  previousStatus?: ReadonlyMap<string, OfferStatus>;
  store: R2Store;
  /** data dzisiejsza `YYYY-MM-DD` (Europe/Warsaw) — do `goneSince` */
  today: string;
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  concurrency?: number;
}

export interface PhotoStats {
  total: number;
  /** 304 albo ta sama treść — bez zapisu */
  unchanged: number;
  downloaded: number;
  uploaded: number;
  /** nieudane pobrania (zdjęcie zostało z poprzednią kopią albo wypadło) */
  failed: number;
  /** wpisy manifestu, które dziś dostały `goneSince` */
  gone: number;
}

export interface SyncPhotosResult {
  offers: Offer[];
  manifest: PhotoManifest;
  warnings: SyncWarning[];
  stats: PhotoStats;
}

/** Błąd, po którym oferta nie przechodzi walidacji pełnego schematu. */
export class PhotoSyncError extends Error {
  constructor(
    public readonly number: string,
    public readonly field: string,
    reason: string,
  ) {
    super(`photos: pole ${field} — ${reason}`);
    this.name = "PhotoSyncError";
  }
}

export function photoR2Key(crmId: number, photoId: number, sha256: string) {
  return `offers/${crmId}/${photoId}-${sha256.slice(0, 8)}.jpg`;
}

export async function measure(
  buffer: Uint8Array,
): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("sharp: brak wymiarów obrazu");
  }
  // orientacja EXIF 5–8 = obraz zapisany „na boku"
  const swap = (meta.orientation ?? 1) >= 5;
  return swap
    ? { width: meta.height, height: meta.width }
    : { width: meta.width, height: meta.height };
}

type FetchOutcome =
  | { kind: "unchanged" }
  | { kind: "changed"; entry: PhotoManifestEntry; body: Uint8Array }
  | { kind: "failed"; reason: string };

async function fetchPhoto(
  crmId: number,
  draft: PhotoDraft,
  previous: PhotoManifestEntry | undefined,
  doFetch: FetchLike,
  sleep: (ms: number) => Promise<void>,
): Promise<FetchOutcome> {
  const headers: Record<string, string> = {};
  if (previous) headers["if-none-match"] = previous.etag;
  let res: Response | undefined;
  for (let attempt = 0; attempt < 2 && !res; attempt++) {
    try {
      const r = await doFetch(draft.sourceUrl, { method: "GET", headers });
      if (r.status >= 500 && attempt === 0) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      res = r;
    } catch {
      if (attempt === 0) await sleep(RETRY_DELAY_MS);
    }
  }
  if (!res) return { kind: "failed", reason: "błąd sieci" };
  if (res.status === 304 && previous) return { kind: "unchanged" };
  if (!res.ok) return { kind: "failed", reason: `HTTP ${res.status}` };

  const body = new Uint8Array(await res.arrayBuffer());
  if (!body.byteLength) return { kind: "failed", reason: "pusta odpowiedź" };
  const sha256 = createHash("sha256").update(body).digest("hex");
  let size: { width: number; height: number };
  try {
    size = await measure(body);
  } catch {
    return { kind: "failed", reason: "nie jest obrazem" };
  }
  const etag = res.headers.get("etag")?.trim() || `sha256:${sha256}`;
  return {
    kind: "changed",
    body,
    entry: {
      etag,
      bytes: body.byteLength,
      sha256,
      ...size,
      r2Key: photoR2Key(crmId, draft.id, sha256),
    },
  };
}

/** Pula współbieżności zachowująca kolejność wyników. */
async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function syncPhotos(
  options: SyncPhotosOptions,
): Promise<SyncPhotosResult> {
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const limit = options.concurrency ?? PHOTO_CONCURRENCY;
  const previousManifest = options.manifest;
  const manifest: PhotoManifest = {};
  const warnings: SyncWarning[] = [];
  const stats: PhotoStats = {
    total: 0,
    unchanged: 0,
    downloaded: 0,
    uploaded: 0,
    failed: 0,
    gone: 0,
  };

  // ── pobranie (pula ≤ 4 nad wszystkimi zdjęciami wszystkich ofert)
  interface Job {
    offer: NormalizedOffer;
    draft: PhotoDraft;
  }
  const jobs: Job[] = options.offers.flatMap((offer) =>
    offer.photos.map((draft) => ({ offer, draft })),
  );
  stats.total = jobs.length;
  const uploadedKeys = new Set<string>();

  const outcomes = await mapPool(jobs, limit, async ({ offer, draft }) => {
    const previous = previousManifest[draft.sourceUrl];
    const outcome = await fetchPhoto(
      offer.crmId,
      draft,
      previous,
      doFetch,
      sleep,
    );
    if (outcome.kind === "changed") {
      stats.downloaded += 1;
      if (previous && previous.sha256 === outcome.entry.sha256) {
        // nowy ETag, ta sama treść — klucz się nie zmienia, nic nie wgrywamy
        stats.unchanged += 1;
        return {
          entry: { ...previous, etag: outcome.entry.etag },
          changed: false,
        };
      }
      if (!uploadedKeys.has(outcome.entry.r2Key)) {
        uploadedKeys.add(outcome.entry.r2Key);
        await options.store.put(
          outcome.entry.r2Key,
          outcome.body,
          "image/jpeg",
        );
        stats.uploaded += 1;
      }
      // stary klucz zostaje w R2 jeszcze 30 dni (cache wariantów) — r2.ts
      const replaced =
        previous && previous.r2Key !== outcome.entry.r2Key
          ? [
              ...(previous.replaced ?? []).filter(
                (r) => r.r2Key !== outcome.entry.r2Key,
              ),
              { r2Key: previous.r2Key, goneSince: options.today },
            ]
          : previous?.replaced;
      return {
        entry: replaced?.length
          ? { ...outcome.entry, replaced }
          : outcome.entry,
        changed: true,
      };
    }
    if (outcome.kind === "unchanged") {
      stats.unchanged += 1;
      return { entry: previous!, changed: false };
    }
    stats.failed += 1;
    warnings.push(
      warning(
        "PHOTO_FETCH",
        offer.number,
        `${outcome.reason}; zdjęcie ${draft.id}${previous ? " — poprzednia kopia" : " — pominięte"}`,
      ),
    );
    return previous
      ? { entry: previous, changed: false }
      : { entry: undefined, changed: false };
  });

  // ── złożenie ofert pełnych + manifest bieżący
  const changedByOffer = new Map<string, boolean>();
  const photosByOffer = new Map<string, OfferPhoto[]>();
  jobs.forEach(({ offer, draft }, i) => {
    const { entry, changed } = outcomes[i];
    if (changed) changedByOffer.set(offer.number, true);
    if (!entry) return;
    const { goneSince: _gone, ...fresh } = entry;
    void _gone;
    manifest[draft.sourceUrl] = fresh;
    const list = photosByOffer.get(offer.number) ?? [];
    list.push({
      ...draft,
      r2Key: entry.r2Key,
      etag: entry.etag,
      width: entry.width,
      height: entry.height,
    });
    photosByOffer.set(offer.number, list);
  });

  const offers: Offer[] = options.offers.map((offer) => {
    const full = { ...offer, photos: photosByOffer.get(offer.number) ?? [] };
    const checked = OfferSchema.safeParse(full);
    if (!checked.success) {
      const first = checked.error.issues[0];
      throw new PhotoSyncError(
        offer.number,
        first?.path.join(".") || "?",
        first?.message ?? "walidacja",
      );
    }
    // W6: status przeszedł aktywna ↔ nieaktywna, a żadne zdjęcie oferty
    // się nie zmieniło — stempel na zdjęciach może być nieaktualny.
    const prev = options.previousStatus?.get(offer.number);
    if (
      prev !== undefined &&
      (prev === "aktywna") !== (offer.status === "aktywna") &&
      full.photos.length > 0 &&
      !changedByOffer.get(offer.number)
    ) {
      warnings.push(warning("W6", offer.number, `${prev} → ${offer.status}`));
    }
    return checked.data;
  });

  // ── wpisy, których dziś nie ma: goneSince (zachowane, dopóki r2.ts
  //    ich nie wyczyści)
  for (const [sourceUrl, entry] of Object.entries(previousManifest)) {
    if (manifest[sourceUrl]) continue;
    if (entry.goneSince === undefined) stats.gone += 1;
    manifest[sourceUrl] = {
      ...entry,
      goneSince: entry.goneSince ?? options.today,
    };
  }

  return { offers, manifest: sortKeys(manifest), warnings, stats };
}

/** Stabilna kolejność kluczy — diff manifestu w gicie ma pokazywać
 *  zmiany treści, nie kolejności. */
function sortKeys<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  );
}
