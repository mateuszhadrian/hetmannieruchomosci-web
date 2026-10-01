// Klient API na atrapie fetch: stronicowanie `list`, limit (429 →
// ponowienie), błąd sieci, odczekanie po `x-ratelimit-remaining: 0`,
// słownik zwalidowany schematem. Kontrakt bezpieczeństwa: token i adres
// zapytania nie występują w żadnym komunikacie błędu.
import { describe, expect, it } from "vitest";
import {
  EstiApiError,
  createEstiClient,
  type FetchLike,
} from "../../scripts/sync/esti-client";
import { lookup } from "../../scripts/sync/dictionary";
import { readDictionaryForTests, readSyntheticList } from "../helpers/raw";

const TOKEN = "sekret-token-0123456789abcdef";
const COMPANY = "7";

interface Call {
  path: string;
  params: URLSearchParams;
}

type Responder = (call: Call, n: number) => Response | Error;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function mockFetch(responder: Responder) {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  const fetchImpl: FetchLike = async (url) => {
    const u = new URL(url);
    const call = { path: u.pathname, params: u.searchParams };
    calls.push(call);
    const out = responder(call, calls.length);
    if (out instanceof Error) throw out;
    return out;
  };
  const client = createEstiClient({
    company: COMPANY,
    token: TOKEN,
    fetch: fetchImpl,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    pageSize: 2,
  });
  return { client, calls, sleeps };
}

const raws = readSyntheticList();

describe("żądania", () => {
  it("każde żądanie niesie company i token w query, metoda GET", async () => {
    const { client, calls } = mockFetch(() =>
      jsonResponse({ success: true, data: [] }),
    );
    await client.basicList();
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toBe("/apiClient/offer/basic-list");
    expect(calls[0].params.get("company")).toBe(COMPANY);
    expect(calls[0].params.get("token")).toBe(TOKEN);
    expect(calls[0].params.has("status")).toBe(false);
  });

  it("basic-list z listą statusów przekazuje je po przecinku i rzutuje pola", async () => {
    const { client, calls } = mockFetch(() =>
      jsonResponse({
        success: true,
        count: 1,
        data: [
          {
            id: "90000001",
            number: "SW900001",
            number_export: "SW900001",
            status: "52",
            update_date: "2026-09-24 18:43:00",
          },
        ],
      }),
    );
    const items = await client.basicList([3, 9, 52]);
    expect(calls[0].params.get("status")).toBe("3,9,52");
    expect(items).toEqual([
      expect.objectContaining({ id: 90000001, number: "SW900001", status: 52 }),
    ]);
  });
});

describe("stronicowanie list", () => {
  it("pobiera strony take/skip do wyczerpania i skleja wyniki", async () => {
    const pages = [raws.slice(0, 2), raws.slice(2, 4), []];
    const { client, calls } = mockFetch((call) => {
      const skip = Number(call.params.get("skip"));
      const take = Number(call.params.get("take"));
      expect(take).toBe(2);
      return jsonResponse({
        success: true,
        count: pages[skip / 2].length,
        totalCount: raws.length,
        data: pages[skip / 2],
      });
    });
    const all = await client.listAll();
    expect(all.map((r) => r.number)).toEqual(raws.map((r) => r.number));
    // totalCount = 4 → po drugiej stronie klient wie, że to koniec
    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.params.get("skip"))).toEqual(["0", "2"]);
    expect(client.requests).toBe(2);
  });

  it("bez totalCount kończy na krótszej stronie", async () => {
    const { client, calls } = mockFetch((call) => {
      const skip = Number(call.params.get("skip"));
      return jsonResponse({
        success: true,
        data: skip === 0 ? raws.slice(0, 2) : raws.slice(2, 3),
      });
    });
    const all = await client.listAll();
    expect(all).toHaveLength(3);
    expect(calls).toHaveLength(2);
  });
});

describe("limit i ponowienia", () => {
  it("429 → jedno ponowienie po odczekaniu (retry-after), potem wynik", async () => {
    const { client, calls, sleeps } = mockFetch((_, n) =>
      n === 1
        ? new Response("", { status: 429, headers: { "retry-after": "7" } })
        : jsonResponse({ success: true, data: [] }),
    );
    await expect(client.basicList()).resolves.toEqual([]);
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([7_000]);
  });

  it("dwa razy 429 → EstiApiError bez trzeciej próby", async () => {
    const { client, calls } = mockFetch(
      () => new Response("", { status: 429 }),
    );
    await expect(client.basicList()).rejects.toBeInstanceOf(EstiApiError);
    expect(calls).toHaveLength(2);
  });

  it("x-ratelimit-remaining: 0 → odczekanie przed KOLEJNYM żądaniem", async () => {
    const { client, sleeps } = mockFetch((_, n) =>
      jsonResponse(
        { success: true, data: [] },
        {
          headers: {
            "x-ratelimit-limit": "60",
            "x-ratelimit-remaining": n === 1 ? "0" : "59",
          },
        },
      ),
    );
    await client.basicList();
    expect(sleeps).toEqual([]);
    await client.basicList();
    expect(sleeps).toEqual([61_000]);
    await client.basicList();
    expect(sleeps).toEqual([61_000]);
  });

  it("błąd sieci → ponowienie; drugi błąd → EstiApiError", async () => {
    const { client, calls } = mockFetch(
      () => new TypeError(`fetch failed: https://x.invalid/?token=${TOKEN}`),
    );
    await expect(client.listAll()).rejects.toBeInstanceOf(EstiApiError);
    expect(calls).toHaveLength(2);
  });

  it("HTTP 404 → błąd od razu, bez ponowienia", async () => {
    const { client, calls } = mockFetch(
      () => new Response("", { status: 404 }),
    );
    await expect(client.dictionary()).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(1);
  });

  it("success=false i zły kształt → EstiApiError", async () => {
    const bad = mockFetch(() => jsonResponse({ success: false }));
    await expect(bad.client.basicList()).rejects.toBeInstanceOf(EstiApiError);
    const shape = mockFetch(() => jsonResponse({ success: true, data: "x" }));
    await expect(shape.client.listAll()).rejects.toBeInstanceOf(EstiApiError);
  });
});

describe("kontrakt bezpieczeństwa: brak tokena i adresu w błędach", () => {
  const scenarios: Array<[string, Responder]> = [
    ["429", () => new Response("", { status: 429 })],
    ["500", () => new Response("", { status: 500 })],
    ["404", () => new Response("", { status: 404 })],
    ["sieć", () => new TypeError(`ECONNRESET ?company=7&token=${TOKEN}`)],
    ["nie-JSON", () => new Response("<html>", { status: 200 })],
    ["kształt", () => jsonResponse({ success: true, data: [{ id: "x" }] })],
  ];
  for (const [name, responder] of scenarios) {
    it(`scenariusz ${name}`, async () => {
      const { client } = mockFetch(responder);
      let caught: unknown;
      try {
        await client.basicList();
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(EstiApiError);
      const text = [
        String(caught),
        (caught as Error).message,
        (caught as Error).stack ?? "",
        JSON.stringify(caught),
      ].join("\n");
      expect(text).not.toContain(TOKEN);
      expect(text).not.toContain("token=");
      expect(text).not.toContain("company=");
      expect(text).not.toContain("https://");
    });
  }
});

describe("słownik", () => {
  const { dictionary, real } = readDictionaryForTests();

  it(`dictionary() waliduje odpowiedź (${real ? "słownik realny" : "słownik syntetyczny"})`, async () => {
    const { client } = mockFetch(() => jsonResponse(dictionary));
    const dict = await client.dictionary();
    expect(Object.keys(dict.data).length).toBeGreaterThan(5);
    expect(lookup(dict, "types", 2)).toBe("Mieszkanie");
    expect(lookup(dict, "kitchenTypes", "nie-ma")).toBeUndefined();
  });

  it("zły kształt słownika → EstiApiError", async () => {
    const { client } = mockFetch(() =>
      jsonResponse({ success: true, data: { types: ["Dom"] } }),
    );
    await expect(client.dictionary()).rejects.toBeInstanceOf(EstiApiError);
  });
});
