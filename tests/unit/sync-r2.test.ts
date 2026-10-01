// Magazyn R2 na atrapie klienta S3: komendy put/list/delete, stronicowanie
// listy, partie usuwania, czyszczenie po 30 dniach od goneSince (także
// zastąpionych kluczy), klucz współdzielony przez dwa wpisy, tryb dry-run.
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import {
  RETENTION_DAYS,
  cleanupGone,
  createDryRunStore,
  createR2Store,
  daysBetween,
  findOrphans,
  planCleanup,
  type GoneEntry,
  type S3Like,
} from "../../scripts/sync/r2";

function fakeClient(listPages: Array<string[]> = []) {
  const sent: unknown[] = [];
  let page = 0;
  const client: S3Like = {
    async send(command) {
      sent.push(command);
      if (command instanceof ListObjectsV2Command) {
        const keys = listPages[page] ?? [];
        page += 1;
        return {
          Contents: keys.map((Key) => ({ Key })),
          IsTruncated: page < listPages.length,
          NextContinuationToken:
            page < listPages.length ? `t${page}` : undefined,
        };
      }
      return {};
    },
  };
  return { client, sent };
}

describe("createR2Store", () => {
  it("put: Bucket, Key, ContentType, cache immutable", async () => {
    const { client, sent } = fakeClient();
    const store = createR2Store("hetman-media", client);
    await store.put(
      "offers/1/2-abcdef01.jpg",
      new Uint8Array([1]),
      "image/jpeg",
    );
    expect(sent[0]).toBeInstanceOf(PutObjectCommand);
    const input = (sent[0] as PutObjectCommand).input;
    expect(input).toMatchObject({
      Bucket: "hetman-media",
      Key: "offers/1/2-abcdef01.jpg",
      ContentType: "image/jpeg",
    });
    expect(input.CacheControl).toContain("immutable");
    expect(store.stats.puts).toBe(1);
  });

  it("list: skleja strony po ContinuationToken", async () => {
    const { client, sent } = fakeClient([["a", "b"], ["c"]]);
    const store = createR2Store("b", client);
    expect(await store.list("offers/")).toEqual(["a", "b", "c"]);
    expect(sent).toHaveLength(2);
    expect((sent[1] as ListObjectsV2Command).input.ContinuationToken).toBe(
      "t1",
    );
    expect((sent[0] as ListObjectsV2Command).input.Prefix).toBe("offers/");
  });

  it("remove: partie po 1000 kluczy, pusta lista = brak żądania", async () => {
    const { client, sent } = fakeClient();
    const store = createR2Store("b", client);
    await store.remove([]);
    expect(sent).toHaveLength(0);
    const keys = Array.from({ length: 1001 }, (_, i) => `k${i}`);
    await store.remove(keys);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toBeInstanceOf(DeleteObjectsCommand);
    expect(
      (sent[0] as DeleteObjectsCommand).input.Delete?.Objects,
    ).toHaveLength(1000);
    expect(store.stats.deletes).toBe(1001);
  });

  it("dry-run: liczy operacje, nie dotyka klienta", async () => {
    const store = createDryRunStore();
    await store.put("k", new Uint8Array(), "image/jpeg");
    await store.remove(["a", "b"]);
    expect(await store.list("x")).toEqual([]);
    expect(store.stats).toEqual({ puts: 1, deletes: 2, lists: 1 });
  });
});

describe("czyszczenie po goneSince", () => {
  const today = "2026-10-31";
  const manifest: Record<string, GoneEntry> = {
    live: { r2Key: "offers/1/1-aaaaaaaa.jpg" },
    fresh: { r2Key: "offers/1/2-bbbbbbbb.jpg", goneSince: "2026-10-02" }, // 29 dni
    old: { r2Key: "offers/1/3-cccccccc.jpg", goneSince: "2026-10-01" }, // 30 dni
    older: { r2Key: "offers/1/4-dddddddd.jpg", goneSince: "2026-01-01" },
  };

  it("daysBetween liczy pełne dni", () => {
    expect(daysBetween("2026-10-01", "2026-10-31")).toBe(30);
    expect(daysBetween("2026-10-31", "2026-10-01")).toBe(-30);
  });

  it("planCleanup: dokładnie 30 dni już kasuje, 29 jeszcze nie", () => {
    expect(RETENTION_DAYS).toBe(30);
    expect(planCleanup(manifest, today)).toEqual(["old", "older"]);
  });

  it("cleanupGone usuwa obiekty i wpisy, bez zmian zwraca ten sam manifest", async () => {
    const store = createDryRunStore();
    const out = await cleanupGone(manifest, store, today);
    expect(out.deleted).toEqual([
      "offers/1/3-cccccccc.jpg",
      "offers/1/4-dddddddd.jpg",
    ]);
    expect(Object.keys(out.manifest)).toEqual(["live", "fresh"]);
    expect(store.stats.deletes).toBe(2);

    const same = await cleanupGone({ live: manifest.live }, store, today);
    expect(same.deleted).toEqual([]);
    expect(same.manifest).toBe(same.manifest);
  });

  it("klucz dzielony z żywym wpisem nie jest kasowany", async () => {
    const shared: Record<string, GoneEntry> = {
      a: { r2Key: "offers/1/1-aaaaaaaa.jpg" },
      b: { r2Key: "offers/1/1-aaaaaaaa.jpg", goneSince: "2026-01-01" },
    };
    const out = await cleanupGone(shared, createDryRunStore(), today);
    expect(out.deleted).toEqual([]);
    expect(Object.keys(out.manifest)).toEqual(["a"]);
  });

  it("zastąpione klucze (replaced) kasuje po 30 dniach i zdejmuje z listy", async () => {
    const withReplaced: Record<string, GoneEntry> = {
      a: {
        r2Key: "offers/1/1-ffffffff.jpg",
        replaced: [
          { r2Key: "offers/1/1-aaaaaaaa.jpg", goneSince: "2026-01-01" },
          { r2Key: "offers/1/1-bbbbbbbb.jpg", goneSince: "2026-10-30" },
        ],
      },
    };
    const out = await cleanupGone(withReplaced, createDryRunStore(), today);
    expect(out.deleted).toEqual(["offers/1/1-aaaaaaaa.jpg"]);
    expect(out.manifest.a.replaced).toEqual([
      { r2Key: "offers/1/1-bbbbbbbb.jpg", goneSince: "2026-10-30" },
    ]);
    const all = await cleanupGone(
      out.manifest,
      createDryRunStore(),
      "2027-01-01",
    );
    expect(all.manifest.a).toEqual({ r2Key: "offers/1/1-ffffffff.jpg" });
  });

  it("findOrphans: obiekty bez wpisu w manifeście", () => {
    expect(findOrphans(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });
});
