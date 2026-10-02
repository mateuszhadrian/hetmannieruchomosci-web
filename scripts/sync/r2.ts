// Zasobnik mediów (R2 przez API S3): zapis, lista, usuwanie oraz
// czyszczenie obiektów, których nie ma już w widocznych ofertach od
// `RETENTION_DAYS` (part3 §3.4 pkt 6, D14). Klient S3 jest parametrem —
// testy podstawiają atrapę `send()`; tryb `--dry-run` dostaje magazyn,
// który niczego nie wysyła. Poświadczenia przychodzą z konfiguracji syncu
// (sekrety Actions) i nie są nigdzie logowane.
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const RETENTION_DAYS = 30;
/** limit S3 na jedno `DeleteObjects` */
const DELETE_BATCH = 1000;

/** Jurysdykcja bucketu R2. Bucket utworzony z jurysdykcją (np. `eu`) jest
 *  dostępny WYŁĄCZNIE przez endpoint `{account}.eu.r2.cloudflarestorage.com`
 *  — endpoint domyślny odpowiada 403 niezależnie od uprawnień tokenu. */
export type R2Jurisdiction = "default" | "eu" | "fedramp";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  jurisdiction?: R2Jurisdiction;
}

/** Endpoint S3 dla konta i jurysdykcji. */
export function r2Endpoint(
  accountId: string,
  jurisdiction: R2Jurisdiction = "default",
): string {
  const segment = jurisdiction === "default" ? "" : `${jurisdiction}.`;
  return `https://${accountId}.${segment}r2.cloudflarestorage.com`;
}

/** Minimalny kontrakt klienta S3 — tyle, ile potrzebują testy do atrapy. */
export interface S3Like {
  send(command: unknown): Promise<unknown>;
}

export interface R2Store {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** wszystkie klucze pod prefiksem (stronicowanie w środku) */
  list(prefix: string): Promise<string[]>;
  remove(keys: readonly string[]): Promise<void>;
  /** liczby operacji — do podsumowania publicznego */
  readonly stats: { puts: number; deletes: number; lists: number };
}

export function createS3Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint(config.accountId, config.jurisdiction),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function createR2Store(bucket: string, client: S3Like): R2Store {
  const stats = { puts: 0, deletes: 0, lists: 0 };
  return {
    stats,
    async put(key, body, contentType) {
      stats.puts += 1;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // oryginał pod kluczem z hashem treści nigdy się nie zmienia
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },
    async list(prefix) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        stats.lists += 1;
        const out = (await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        )) as {
          Contents?: Array<{ Key?: string }>;
          IsTruncated?: boolean;
          NextContinuationToken?: string;
        };
        for (const obj of out.Contents ?? []) if (obj.Key) keys.push(obj.Key);
        token = out.IsTruncated ? out.NextContinuationToken : undefined;
      } while (token);
      return keys;
    },
    async remove(keys) {
      for (let i = 0; i < keys.length; i += DELETE_BATCH) {
        const batch = keys.slice(i, i + DELETE_BATCH);
        if (!batch.length) continue;
        stats.deletes += batch.length;
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
    },
  };
}

/** Magazyn trybu `--dry-run`: liczy operacje, niczego nie wysyła. */
export function createDryRunStore(): R2Store {
  const stats = { puts: 0, deletes: 0, lists: 0 };
  return {
    stats,
    async put() {
      stats.puts += 1;
    },
    async list() {
      stats.lists += 1;
      return [];
    },
    async remove(keys) {
      stats.deletes += keys.length;
    },
  };
}

// ── czyszczenie ─────────────────────────────────────────────────────────
export interface ReplacedKey {
  r2Key: string;
  goneSince: string;
}

export interface GoneEntry {
  r2Key: string;
  goneSince?: string;
  /** poprzednie klucze wpisu (zmiana treści zdjęcia) z datą zastąpienia */
  replaced?: ReplacedKey[];
}

/** Dni między datami `YYYY-MM-DD` (UTC, bez stref). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(to.slice(0, 4)),
    Number(to.slice(5, 7)) - 1,
    Number(to.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

/** Klucze manifestu, których obiekty są do skasowania: `goneSince`
 *  starsze niż `retentionDays` względem `today`. Czysta funkcja. */
export function planCleanup<T extends GoneEntry>(
  manifest: Record<string, T>,
  today: string,
  retentionDays = RETENTION_DAYS,
): string[] {
  return Object.entries(manifest)
    .filter(
      ([, e]) =>
        e.goneSince !== undefined &&
        daysBetween(e.goneSince, today) >= retentionDays,
    )
    .map(([key]) => key);
}

export interface CleanupResult<T> {
  manifest: Record<string, T>;
  /** klucze R2 skasowane */
  deleted: string[];
}

/** Kasuje przeterminowane obiekty (wpisy z `goneSince` oraz zastąpione
 *  klucze z `replaced`) i porządkuje manifest. Gdy jeden klucz R2 dzieli
 *  kilka wpisów (ten sam plik pod dwoma adresami), kasowany jest dopiero,
 *  gdy żaden żywy wpis go nie wskazuje. */
export async function cleanupGone<T extends GoneEntry>(
  manifest: Record<string, T>,
  store: R2Store,
  today: string,
  retentionDays = RETENTION_DAYS,
): Promise<CleanupResult<T>> {
  const expiredEntries = new Set(planCleanup(manifest, today, retentionDays));
  const isExpired = (date: string) => daysBetween(date, today) >= retentionDays;

  const next: Record<string, T> = {};
  const candidates = new Set<string>();
  for (const [key, entry] of Object.entries(manifest)) {
    if (expiredEntries.has(key)) {
      candidates.add(entry.r2Key);
      for (const r of entry.replaced ?? []) candidates.add(r.r2Key);
      continue;
    }
    const kept = (entry.replaced ?? []).filter((r) => {
      if (!isExpired(r.goneSince)) return true;
      candidates.add(r.r2Key);
      return false;
    });
    next[key] =
      kept.length === (entry.replaced ?? []).length
        ? entry
        : kept.length
          ? { ...entry, replaced: kept }
          : (({ replaced: _r, ...rest }) => (void _r, rest as T))(entry);
  }
  if (!candidates.size) return { manifest, deleted: [] };

  const stillUsed = new Set<string>();
  for (const entry of Object.values(next)) {
    stillUsed.add(entry.r2Key);
    for (const r of entry.replaced ?? []) stillUsed.add(r.r2Key);
  }
  const deleted = [...candidates].filter((k) => !stillUsed.has(k));
  if (deleted.length) await store.remove(deleted);
  return { manifest: next, deleted };
}

/** Obiekty w R2 bez wpisu w manifeście (diagnostyka do raportu). */
export function findOrphans(
  listedKeys: readonly string[],
  manifestKeys: Iterable<string>,
): string[] {
  const known = new Set(manifestKeys);
  return listedKeys.filter((k) => !known.has(k));
}
