// Mapy na atrapach: 7 ofert w jednym punkcie = 1 żądanie; wpis
// w manifeście = 0 żądań; PNG → WebP bez kadrowania (wymiary zachowane,
// pasek atrybucji nietknięty); zmiana trybu znacznika = nowy klucz;
// goneSince; błąd Geoapify = MAP_FETCH; klucz API nie trafia do
// ostrzeżeń.
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { FetchLike } from "../../scripts/sync/esti-client";
import {
  MAP_HEIGHT,
  MAP_SCALE,
  MAP_WIDTH,
  geoapifyUrl,
  mapR2Key,
  syncMaps,
  type MapOffer,
} from "../../scripts/sync/maps";
import { createDryRunStore, type R2Store } from "../../scripts/sync/r2";
import { coordKey } from "../../src/lib/offers/map-key";
import { MAP_R2_KEY, MapsFileSchema } from "../../src/lib/offers/schema";

const API_KEY = "geo-sekret-abcdef";
const TODAY = "2026-10-01";
const W = MAP_WIDTH * MAP_SCALE;
const H = MAP_HEIGHT * MAP_SCALE;

async function png() {
  return new Uint8Array(
    await sharp({
      create: { width: W, height: H, channels: 3, background: "#ccc" },
    })
      .png()
      .toBuffer(),
  );
}

function server(opts: { status?: number; body?: Uint8Array } = {}) {
  const urls: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    urls.push(url);
    if (opts.status && opts.status !== 200)
      return new Response("", { status: opts.status });
    return new Response((opts.body ?? (await png())) as unknown as BodyInit, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  };
  return { fetchImpl, urls };
}

function recording(): R2Store & { puts: Array<[string, string, number]> } {
  const base = createDryRunStore();
  const puts: Array<[string, string, number]> = [];
  return {
    ...base,
    puts,
    async put(key, body, ct) {
      puts.push([key, ct, body.byteLength]);
      await base.put(key, body, ct);
    },
  };
}

const samePoint: MapOffer[] = Array.from({ length: 7 }, (_, i) => ({
  number: `SW90010${i}`,
  // drobne różnice poniżej 5. miejsca = ten sam punkt
  location: { lat: 52.381 + i * 1e-7, lon: 16.962 },
}));
const other: MapOffer = {
  number: "SW900200",
  location: { lat: 52.4325, lon: 16.93933 },
};

describe("coordKey i klucz R2", () => {
  it("coordKey ma 5 miejsc i skleja współrzędne", () => {
    expect(coordKey(52.381, 16.962)).toBe("52.38100,16.96200");
    expect(coordKey(-0.000001, 16.9)).toBe("0.00000,16.90000");
  });

  it("klucz R2 zależy od punktu i trybu znacznika", () => {
    const a = mapR2Key("52.38100,16.96200", "exact");
    expect(a).toMatch(MAP_R2_KEY);
    expect(mapR2Key("52.38100,16.96200", "circle")).not.toBe(a);
    expect(mapR2Key("52.38101,16.96200", "exact")).not.toBe(a);
  });

  it("adres Geoapify: styl, kadr, scaleFactor, marker/okrąg, klucz tylko w query", () => {
    const exact = geoapifyUrl(52.381, 16.962, "exact", API_KEY);
    const u = new URL(exact);
    expect(u.hostname).toBe("maps.geoapify.com");
    expect(u.searchParams.get("style")).toBe("osm-bright-grey");
    expect(u.searchParams.get("width")).toBe(String(MAP_WIDTH));
    expect(u.searchParams.get("height")).toBe(String(MAP_HEIGHT));
    expect(u.searchParams.get("scaleFactor")).toBe(String(MAP_SCALE));
    expect(u.searchParams.get("center")).toBe("lonlat:16.962,52.381");
    expect(u.searchParams.get("apiKey")).toBe(API_KEY);
    expect(exact).toContain("marker=lonlat:16.962,52.381;");
    const circle = geoapifyUrl(52.381, 16.962, "circle", API_KEY);
    expect(circle).toContain("geometry=circle:16.962,52.381,");
    expect(circle).not.toContain("marker=");
  });
});

describe("syncMaps", () => {
  it("7 ofert w jednym punkcie = 1 żądanie i 1 obiekt WebP w pełnych wymiarach", async () => {
    const srv = server();
    const store = recording();
    const out = await syncMaps({
      offers: samePoint,
      manifest: {},
      store,
      apiKey: API_KEY,
      today: TODAY,
      marker: "exact",
      fetch: srv.fetchImpl,
    });
    expect(srv.urls).toHaveLength(1);
    expect(out.stats).toEqual({
      points: 1,
      reused: 0,
      requested: 1,
      uploaded: 1,
      failed: 0,
      gone: 0,
    });
    expect(store.puts).toHaveLength(1);
    expect(store.puts[0][1]).toBe("image/webp");
    const key = coordKey(samePoint[0].location.lat, samePoint[0].location.lon);
    const entry = out.manifest[key];
    expect(entry.r2Key).toBe(mapR2Key(key, "exact"));
    // bez kadrowania: pasek atrybucji u dołu zostaje
    expect(entry.width).toBe(W);
    expect(entry.height).toBe(H);
    expect(MapsFileSchema.safeParse(out.manifest).success).toBe(true);
    expect(out.warnings).toEqual([]);
  });

  it("punkt z manifestu = 0 żądań; nowy punkt = 1 żądanie", async () => {
    const first = await syncMaps({
      offers: samePoint,
      manifest: {},
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      marker: "exact",
      fetch: server().fetchImpl,
    });
    const srv = server();
    const second = await syncMaps({
      offers: [...samePoint, other],
      manifest: first.manifest,
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: "2026-10-02",
      marker: "exact",
      fetch: srv.fetchImpl,
    });
    expect(srv.urls).toHaveLength(1);
    expect(second.stats).toMatchObject({ points: 2, reused: 1, requested: 1 });
    expect(Object.keys(second.manifest)).toHaveLength(2);
  });

  it("zmiana trybu znacznika → nowe żądanie i nowy klucz", async () => {
    const first = await syncMaps({
      offers: [other],
      manifest: {},
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      marker: "exact",
      fetch: server().fetchImpl,
    });
    const srv = server();
    const second = await syncMaps({
      offers: [other],
      manifest: first.manifest,
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      marker: "circle",
      fetch: srv.fetchImpl,
    });
    expect(srv.urls).toHaveLength(1);
    const key = coordKey(other.location.lat, other.location.lon);
    expect(second.manifest[key].r2Key).not.toBe(first.manifest[key].r2Key);
  });

  it("punkt bez ofert dostaje goneSince, wraca → goneSince znika", async () => {
    const first = await syncMaps({
      offers: [...samePoint, other],
      manifest: {},
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      marker: "exact",
      fetch: server().fetchImpl,
    });
    const gone = await syncMaps({
      offers: [other],
      manifest: first.manifest,
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: "2026-10-02",
      marker: "exact",
      fetch: server().fetchImpl,
    });
    const key = coordKey(samePoint[0].location.lat, samePoint[0].location.lon);
    expect(gone.manifest[key].goneSince).toBe("2026-10-02");
    expect(gone.stats.gone).toBe(1);
    const again = await syncMaps({
      offers: [...samePoint, other],
      manifest: gone.manifest,
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: "2026-10-03",
      marker: "exact",
      fetch: server().fetchImpl,
    });
    expect(again.manifest[key].goneSince).toBeUndefined();
    expect(again.stats.requested).toBe(0);
  });

  it("błąd Geoapify → MAP_FETCH z numerem pierwszej oferty, bez klucza API; poprzednia mapa zostaje", async () => {
    const srv = server({ status: 500 });
    const out = await syncMaps({
      offers: samePoint,
      manifest: {},
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      marker: "exact",
      fetch: srv.fetchImpl,
      sleep: async () => {},
    });
    // 5xx → jedno ponowienie
    expect(srv.urls).toHaveLength(2);
    expect(out.stats.failed).toBe(1);
    expect(Object.keys(out.manifest)).toEqual([]);
    expect(out.warnings).toEqual([
      expect.objectContaining({
        code: "MAP_FETCH",
        number: samePoint[0].number,
      }),
    ]);
    expect(JSON.stringify(out.warnings)).not.toContain(API_KEY);
    expect(out.warnings[0].detail).toContain("7 ofert");

    const ok = await syncMaps({
      offers: [other],
      manifest: {},
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      marker: "exact",
      fetch: server().fetchImpl,
    });
    const kept = await syncMaps({
      offers: [other],
      manifest: ok.manifest,
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      marker: "circle",
      fetch: server({ status: 403 }).fetchImpl,
      sleep: async () => {},
    });
    const key = coordKey(other.location.lat, other.location.lon);
    expect(kept.manifest[key]).toEqual(ok.manifest[key]);
    expect(kept.warnings[0].detail).toContain("poprzednia mapa");
  });

  it("odpowiedź niebędąca obrazem → MAP_FETCH, nie wyjątek", async () => {
    const out = await syncMaps({
      offers: [other],
      manifest: {},
      store: createDryRunStore(),
      apiKey: API_KEY,
      today: TODAY,
      fetch: server({ body: new Uint8Array([1, 2, 3]) }).fetchImpl,
    });
    expect(out.stats.failed).toBe(1);
    expect(out.warnings[0].detail).toContain("nie jest obrazem");
  });
});
