// Zdjęcia na atrapach fetch i R2 (JPEG-i generowane sharpem w teście):
// pierwszy sync pobiera i wgrywa; 304 nie pobiera; zmiana treści = nowy
// klucz, stary trafia do `replaced`; błąd pobrania = ostrzeżenie
// PHOTO_FETCH; W6 przy zmianie statusu bez zmiany ETagów; goneSince dla
// zdjęć spoza widocznych ofert; współbieżność ≤ limit; orientacja EXIF.
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { FetchLike } from "../../scripts/sync/esti-client";
import { normalize } from "../../scripts/sync/normalize";
import {
  PHOTO_CONCURRENCY,
  measure,
  photoR2Key,
  syncPhotos,
} from "../../scripts/sync/photos";
import { createDryRunStore, type R2Store } from "../../scripts/sync/r2";
import {
  OfferSchema,
  PHOTO_R2_KEY,
  PhotosFileSchema,
  type NormalizedOffer,
  type PhotoManifest,
} from "../../src/lib/offers/schema";
import { readSyntheticDictionary, readSyntheticList } from "../helpers/raw";

const TODAY = "2026-10-01";
const dictionary = readSyntheticDictionary();
const offers: NormalizedOffer[] = readSyntheticList().map(
  (raw) => normalize(raw, { dictionary }).offer,
);
const allDrafts = offers.flatMap((o) => o.photos);
const withPhotos = offers.filter((o) => o.photos.length > 0);

async function jpeg(
  width: number,
  height: number,
  seed: number,
  orientation?: number,
) {
  let img = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: (seed * 37) % 256, g: (seed * 91) % 256, b: seed % 256 },
    },
  }).jpeg({ quality: 70 });
  if (orientation) img = img.withMetadata({ orientation });
  return new Uint8Array(await img.toBuffer());
}

interface Served {
  body: Uint8Array;
  etag: string;
}

function server(
  images: Map<string, Served>,
  opts: { fail?: Set<string> } = {},
) {
  const requests: Array<{ url: string; ifNoneMatch?: string }> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchImpl: FetchLike = async (url, init) => {
    const ifNoneMatch = init?.headers?.["if-none-match"];
    requests.push(ifNoneMatch ? { url, ifNoneMatch } : { url });
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 2));
    inFlight -= 1;
    if (opts.fail?.has(url)) return new Response("", { status: 500 });
    const served = images.get(url);
    if (!served) return new Response("", { status: 404 });
    if (ifNoneMatch === served.etag) return new Response(null, { status: 304 });
    return new Response(served.body as unknown as BodyInit, {
      status: 200,
      headers: { etag: served.etag, "content-type": "image/jpeg" },
    });
  };
  return { fetchImpl, requests, max: () => maxInFlight };
}

function recordingStore(): R2Store & { puts: Array<[string, string]> } {
  const base = createDryRunStore();
  const puts: Array<[string, string]> = [];
  return {
    ...base,
    puts,
    async put(key, body, contentType) {
      puts.push([key, contentType]);
      await base.put(key, body, contentType);
    },
  };
}

async function images(seedOffset = 0) {
  const map = new Map<string, Served>();
  for (const [i, d] of allDrafts.entries()) {
    const body = await jpeg(8 + i, 6, i + 1 + seedOffset);
    map.set(d.sourceUrl, { body, etag: `"e${i}-${seedOffset}"` });
  }
  return map;
}

describe("pierwszy sync", () => {
  it("pobiera, mierzy, wgrywa i buduje pełne oferty", async () => {
    const imgs = await images();
    const srv = server(imgs);
    const store = recordingStore();
    const out = await syncPhotos({
      offers,
      manifest: {},
      store,
      today: TODAY,
      fetch: srv.fetchImpl,
      sleep: async () => {},
    });
    expect(out.stats).toEqual({
      total: 6,
      unchanged: 0,
      downloaded: 6,
      uploaded: 6,
      failed: 0,
      gone: 0,
    });
    expect(srv.requests.every((r) => r.ifNoneMatch === undefined)).toBe(true);
    expect(out.warnings).toEqual([]);
    expect(PhotosFileSchema.safeParse(out.manifest).success).toBe(true);
    expect(Object.keys(out.manifest)).toHaveLength(6);
    for (const offer of out.offers) {
      expect(OfferSchema.safeParse(offer).success).toBe(true);
      for (const [i, p] of offer.photos.entries()) {
        expect(p.r2Key).toMatch(PHOTO_R2_KEY);
        expect(p.r2Key.startsWith(`offers/${offer.crmId}/${p.id}-`)).toBe(true);
        const entry = out.manifest[p.sourceUrl];
        expect(entry.r2Key).toBe(p.r2Key);
        expect(p.etag).toBe(imgs.get(p.sourceUrl)!.etag);
        const idx = allDrafts.findIndex((d) => d.sourceUrl === p.sourceUrl);
        expect(p.width).toBe(8 + idx);
        expect(p.height).toBe(6);
        expect(i).toBeGreaterThanOrEqual(0);
      }
    }
    expect(store.puts.map(([, ct]) => ct)).toEqual(Array(6).fill("image/jpeg"));
    expect(new Set(store.puts.map(([k]) => k)).size).toBe(6);
    // oferta bez zdjęć przechodzi walidację z pustą tablicą
    expect(out.offers.find((o) => o.photos.length === 0)).toBeDefined();
  });

  it("klucz = offers/{crmId}/{photoId}-{sha256[:8]}.jpg", () => {
    expect(photoR2Key(90000001, 500000001, "abcdef0123456789")).toBe(
      "offers/90000001/500000001-abcdef01.jpg",
    );
  });
});

describe("kolejny sync", () => {
  it("304 → nic nie pobiera ani nie wgrywa; If-None-Match = etag z manifestu", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const srv = server(imgs);
    const store = recordingStore();
    const second = await syncPhotos({
      offers,
      manifest: first.manifest,
      store,
      today: "2026-10-02",
      fetch: srv.fetchImpl,
    });
    expect(second.stats).toMatchObject({
      unchanged: 6,
      downloaded: 0,
      uploaded: 0,
    });
    expect(store.puts).toEqual([]);
    for (const r of srv.requests) {
      expect(r.ifNoneMatch).toBe(imgs.get(r.url)!.etag);
    }
    expect(second.manifest).toEqual(first.manifest);
    expect(second.offers).toEqual(first.offers);
  });

  it("zmiana ETag i treści → nowy klucz, stary w `replaced` z datą", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const target = withPhotos[0].photos[0].sourceUrl;
    const oldKey = first.manifest[target].r2Key;
    imgs.set(target, { body: await jpeg(20, 10, 99), etag: '"changed"' });
    const store = recordingStore();
    const second = await syncPhotos({
      offers,
      manifest: first.manifest,
      store,
      today: "2026-10-05",
      fetch: server(imgs).fetchImpl,
    });
    expect(second.stats).toMatchObject({
      downloaded: 1,
      uploaded: 1,
      unchanged: 5,
    });
    const entry = second.manifest[target];
    expect(entry.r2Key).not.toBe(oldKey);
    expect(entry.r2Key).toMatch(PHOTO_R2_KEY);
    expect(entry.width).toBe(20);
    expect(entry.replaced).toEqual([
      { r2Key: oldKey, goneSince: "2026-10-05" },
    ]);
    expect(store.puts).toEqual([[entry.r2Key, "image/jpeg"]]);
    const photo = second.offers
      .flatMap((o) => o.photos)
      .find((p) => p.sourceUrl === target)!;
    expect(photo.r2Key).toBe(entry.r2Key);
    expect(photo.etag).toBe('"changed"');
  });

  it("nowy ETag, ta sama treść → ten sam klucz, bez wgrywania", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const target = withPhotos[0].photos[0].sourceUrl;
    imgs.set(target, { ...imgs.get(target)!, etag: '"same-bytes-new-etag"' });
    const store = recordingStore();
    const second = await syncPhotos({
      offers,
      manifest: first.manifest,
      store,
      today: "2026-10-05",
      fetch: server(imgs).fetchImpl,
    });
    expect(store.puts).toEqual([]);
    expect(second.manifest[target].r2Key).toBe(first.manifest[target].r2Key);
    expect(second.manifest[target].etag).toBe('"same-bytes-new-etag"');
    expect(second.manifest[target].replaced).toBeUndefined();
  });

  it("zdjęcie spoza widocznych ofert dostaje goneSince raz, istniejące zostaje", async () => {
    const imgs = await images();
    const manifest: PhotoManifest = {
      "https://static.example.invalid/public/images/offers/11355/1/1_max.jpg": {
        etag: '"x"',
        bytes: 10,
        sha256: "a".repeat(64),
        width: 4,
        height: 3,
        r2Key: "offers/1/1-aaaaaaaa.jpg",
      },
      "https://static.example.invalid/public/images/offers/11355/1/2_max.jpg": {
        etag: '"y"',
        bytes: 10,
        sha256: "b".repeat(64),
        width: 4,
        height: 3,
        r2Key: "offers/1/2-bbbbbbbb.jpg",
        goneSince: "2026-09-01",
      },
    };
    const out = await syncPhotos({
      offers,
      manifest,
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    expect(out.stats.gone).toBe(1);
    const gone1 =
      out.manifest[
        "https://static.example.invalid/public/images/offers/11355/1/1_max.jpg"
      ];
    const gone2 =
      out.manifest[
        "https://static.example.invalid/public/images/offers/11355/1/2_max.jpg"
      ];
    expect(gone1.goneSince).toBe(TODAY);
    expect(gone2.goneSince).toBe("2026-09-01");
    expect(Object.keys(out.manifest)).toHaveLength(8);
    expect(PhotosFileSchema.safeParse(out.manifest).success).toBe(true);
  });

  it("goneSince znika, gdy zdjęcie wraca do widocznych", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const target = withPhotos[0].photos[0].sourceUrl;
    const stale: PhotoManifest = {
      ...first.manifest,
      [target]: { ...first.manifest[target], goneSince: "2026-09-01" },
    };
    const second = await syncPhotos({
      offers,
      manifest: stale,
      store: createDryRunStore(),
      today: "2026-10-02",
      fetch: server(imgs).fetchImpl,
    });
    expect(second.manifest[target].goneSince).toBeUndefined();
  });
});

describe("błędy pobrania", () => {
  it("bez poprzedniej kopii zdjęcie wypada, oferta przechodzi, PHOTO_FETCH z numerem", async () => {
    const imgs = await images();
    const victim = withPhotos.find((o) => o.photos.length >= 2)!;
    const url = victim.photos[1].sourceUrl;
    const srv = server(imgs, { fail: new Set([url]) });
    const out = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: srv.fetchImpl,
      sleep: async () => {},
    });
    expect(out.stats.failed).toBe(1);
    // 5xx → jedno ponowienie
    expect(srv.requests.filter((r) => r.url === url)).toHaveLength(2);
    const offer = out.offers.find((o) => o.number === victim.number)!;
    expect(offer.photos).toHaveLength(victim.photos.length - 1);
    expect(OfferSchema.safeParse(offer).success).toBe(true);
    expect(out.warnings).toEqual([
      expect.objectContaining({ code: "PHOTO_FETCH", number: victim.number }),
    ]);
    expect(out.warnings[0].message).not.toContain(victim.number);
    expect(out.manifest[url]).toBeUndefined();
  });

  it("z poprzednią kopią zdjęcie zostaje w starej wersji", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const url = withPhotos[0].photos[0].sourceUrl;
    const out = await syncPhotos({
      offers,
      manifest: first.manifest,
      store: createDryRunStore(),
      today: "2026-10-02",
      fetch: server(imgs, { fail: new Set([url]) }).fetchImpl,
      sleep: async () => {},
    });
    expect(out.manifest[url]).toEqual(first.manifest[url]);
    expect(out.offers).toEqual(first.offers);
    expect(out.warnings.map((w) => w.code)).toEqual(["PHOTO_FETCH"]);
    expect(out.warnings[0].detail).toContain("poprzednia kopia");
  });

  it("błąd sieci dwa razy → failed, bez wyjątku", async () => {
    const imgs = await images();
    let calls = 0;
    const broken: FetchLike = async () => {
      calls += 1;
      throw new TypeError("fetch failed");
    };
    const out = await syncPhotos({
      offers: [withPhotos[0]],
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: broken,
      sleep: async () => {},
    });
    expect(calls).toBe(withPhotos[0].photos.length * 2);
    expect(out.stats.failed).toBe(withPhotos[0].photos.length);
    void imgs;
  });
});

describe("W6 — stempel na zdjęciach", () => {
  it("status przeszedł aktywna ↔ nieaktywna, ETagi bez zmian → W6 z kierunkiem", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const target = withPhotos[0];
    const opposite = target.status === "aktywna" ? "sprzedana" : "aktywna";
    const out = await syncPhotos({
      offers,
      manifest: first.manifest,
      previousStatus: new Map([[target.number, opposite]]),
      store: createDryRunStore(),
      today: "2026-10-02",
      fetch: server(imgs).fetchImpl,
    });
    expect(out.warnings).toEqual([
      {
        code: "W6",
        message: expect.any(String),
        number: target.number,
        detail: `${opposite} → ${target.status}`,
      },
    ]);
    expect(out.warnings[0].message).not.toContain(target.number);
  });

  it("zmiana statusu ze zmianą choć jednego ETagu → bez W6", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const target = withPhotos[0];
    const opposite = target.status === "aktywna" ? "wynajeta" : "aktywna";
    const url = target.photos[0].sourceUrl;
    imgs.set(url, { body: await jpeg(12, 9, 77), etag: '"restamped"' });
    const out = await syncPhotos({
      offers,
      manifest: first.manifest,
      previousStatus: new Map([[target.number, opposite]]),
      store: createDryRunStore(),
      today: "2026-10-02",
      fetch: server(imgs).fetchImpl,
    });
    expect(out.warnings.filter((w) => w.code === "W6")).toEqual([]);
  });

  it("ten sam status (rezerwacja → sprzedana też nie przechodzi granicy aktywności) → bez W6", async () => {
    const imgs = await images();
    const first = await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: server(imgs).fetchImpl,
    });
    const out = await syncPhotos({
      offers,
      manifest: first.manifest,
      previousStatus: new Map(offers.map((o) => [o.number, o.status])),
      store: createDryRunStore(),
      today: "2026-10-02",
      fetch: server(imgs).fetchImpl,
    });
    expect(out.warnings).toEqual([]);
  });
});

describe("współbieżność i pomiar", () => {
  it("nie przekracza limitu równoległych pobrań", async () => {
    const imgs = await images();
    const srv = server(imgs);
    await syncPhotos({
      offers,
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: srv.fetchImpl,
      concurrency: 2,
    });
    expect(srv.max()).toBeLessThanOrEqual(2);
    expect(srv.max()).toBeGreaterThan(0);
    expect(PHOTO_CONCURRENCY).toBe(4);
  });

  it("orientacja EXIF 6 zamienia szerokość z wysokością", async () => {
    expect(await measure(await jpeg(10, 4, 1))).toEqual({
      width: 10,
      height: 4,
    });
    expect(await measure(await jpeg(10, 4, 1, 6))).toEqual({
      width: 4,
      height: 10,
    });
  });

  it("dane niebędące obrazem → failed, nie wyjątek", async () => {
    const bad: FetchLike = async () =>
      new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    const out = await syncPhotos({
      offers: [withPhotos[0]],
      manifest: {},
      store: createDryRunStore(),
      today: TODAY,
      fetch: bad,
    });
    expect(out.stats.failed).toBe(withPhotos[0].photos.length);
    expect(out.warnings[0].detail).toContain("nie jest obrazem");
  });
});
