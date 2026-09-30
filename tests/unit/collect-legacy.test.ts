// Zbieranie dawnych adresów z HTML listy poprzedniego serwisu
// (tests/fixtures/raw/lista-fragment.html — 3 karty, bez tel:/mailto:
// i skryptów) i z zapisu analizy; złożenie mapy numer → 3 wzorce adresu.
import { describe, expect, it } from "vitest";
import {
  collectFromSite,
  parseLegacyFile,
  parseLegacyList,
  toLegacyRedirects,
} from "../../scripts/collect-legacy";
import { LegacyRedirectsSchema } from "../../src/lib/offers/schema";
import { readListFragment } from "../helpers/raw";

const html = readListFragment();

describe("fixture", () => {
  it("nie zawiera telefonów, adresów e-mail ani skryptów", () => {
    expect(html).not.toMatch(/tel:|mailto:|<script/i);
  });
});

describe("parseLegacyList()", () => {
  const entries = parseLegacyList(html);

  it("3 karty → 3 wpisy: numer, id, ścieżka detalu", () => {
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      number: "SW376101",
      legacyId: 208,
      path: "/nieruchomosci/mieszkanie-na-sprzedaz/poznan-malta/208",
    });
    expect(entries[1]).toEqual({
      number: "SW486462",
      legacyId: 206,
      path: "/nieruchomosci/mieszkanie-na-sprzedaz/poznan-winogrady/206",
    });
    expect(entries.map((e) => e.number)).toEqual([
      "SW376101",
      "SW486462",
      "SW964944",
    ]);
    for (const e of entries)
      expect(e.path.endsWith(`/${e.legacyId}`)).toBe(true);
  });

  it("karta bez numeru albo bez linku detalu jest pomijana; pusty HTML → []", () => {
    expect(parseLegacyList("")).toEqual([]);
    expect(
      parseLegacyList(
        '<article class="download-card"><a href="/nieruchomosci/a/b/5">x</a></article>',
      ),
    ).toEqual([]);
    expect(
      parseLegacyList(
        '<article class="download-card"><p>Nr oferty: SW1</p></article>',
      ),
    ).toEqual([]);
  });
});

describe("parseLegacyFile() i toLegacyRedirects()", () => {
  it("zapis analizy → wpisy; mapa z trzema wzorcami, klucze posortowane, walidacja", () => {
    const json = JSON.stringify([
      { numer: "SW2", id: 7, url: "/nieruchomosci/dom-na-sprzedaz/x/7" },
      {
        numer: "SW1",
        id: 5,
        url: "/nieruchomosci/mieszkanie-na-sprzedaz/y/5/",
      },
      { numer: "SW1", id: 6, url: "/nieruchomosci/mieszkanie-na-sprzedaz/y/6" },
      { numer: "", id: 8, url: "/x" },
    ]);
    const map = toLegacyRedirects(parseLegacyFile(json));
    expect(Object.keys(map)).toEqual(["SW1", "SW2"]);
    expect(map.SW1).toEqual({
      legacyId: 5,
      paths: [
        "/nieruchomosci/mieszkanie-na-sprzedaz/y/5",
        "/offer/offer/5",
        "/offer/offer-print/5",
      ],
    });
    expect(LegacyRedirectsSchema.safeParse(map).success).toBe(true);
  });
});

describe("collectFromSite() — atrapa fetch, wyłącznie GET", () => {
  it("czyta strony aż do pustej, bez duplikatów", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const fetchImpl = (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      calls.push({ url, method: init?.method });
      const page = new URL(url).searchParams.get("searchIndex");
      const body =
        page === "1"
          ? html
          : page === "2"
            ? parseLegacyList(html).length
              ? html
              : ""
            : "";
      return new Response(body, { status: 200 });
    }) as typeof fetch;
    const entries = await collectFromSite("https://example.invalid", fetchImpl);
    expect(entries).toHaveLength(3);
    // strona 2 = te same karty → brak nowych → stop
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.method).toBe("GET");
      expect(c.url).toMatch(
        /^https:\/\/example\.invalid\/lista-ofert\?searchIndex=\d&sort=add_date_desc$/,
      );
    }
  });

  it("HTTP ≠ 200 → błąd bez adresu", async () => {
    const fetchImpl = (async () =>
      new Response("", { status: 503 })) as typeof fetch;
    await expect(
      collectFromSite("https://example.invalid", fetchImpl),
    ).rejects.toThrow("HTTP 503");
  });
});
