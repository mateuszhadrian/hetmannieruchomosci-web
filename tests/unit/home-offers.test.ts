// Dobór ofert na stronę główną (`src/lib/offers/home-offers.ts`, 4.4,
// docs/analiza-home.md Q3): wyłącznie `aktywna`, najnowsze wg daty
// dodania, najwyżej `max`; mniej aktywnych = tyle, ile jest (bez
// dopełniania innymi statusami); zero = pusta lista. Dane SYNTETYCZNE
// + fixture (skip, gdy nie istnieje).
import { describe, expect, it } from "vitest";
import { HOME_OFFERS_MAX } from "../../src/components/sections/home/home-config";
import { pickHomeOffers } from "../../src/lib/offers/home-offers";
import type { Offer, OfferStatus } from "../../src/lib/offers/schema";
import { readFixtureOffersTyped } from "../helpers/offers";
import { syntheticFullOffers } from "../helpers/raw";

const base = syntheticFullOffers()[0];

function offer(number: string, status: OfferStatus, addedAt: string): Offer {
  return { ...base, number, status, addedAt };
}

const day = (d: string) => `${d}T12:00:00+02:00`;

describe("pickHomeOffers (dane syntetyczne)", () => {
  it("bierze tylko oferty aktywne, od najnowszej", () => {
    const picked = pickHomeOffers(
      [
        offer("SW000001", "aktywna", day("2026-05-01")),
        offer("SW000002", "sprzedana", day("2026-09-20")),
        offer("SW000003", "aktywna", day("2026-09-01")),
        offer("SW000004", "rezerwacja", day("2026-09-25")),
        offer("SW000005", "aktywna", day("2026-07-15")),
        offer("SW000006", "wynajeta", day("2026-09-28")),
        offer("SW000007", "aktywna", day("2026-01-10")),
      ],
      3,
    );
    expect(picked.map((e) => e.number)).toEqual([
      "SW000003",
      "SW000005",
      "SW000001",
    ]);
    expect(picked.every((e) => e.status === "aktywna")).toBe(true);
  });

  it("mniej aktywnych niż limit — tyle, ile jest, bez dopełniania", () => {
    const picked = pickHomeOffers(
      [
        offer("SW000001", "aktywna", day("2026-05-01")),
        offer("SW000002", "rezerwacja", day("2026-09-20")),
        offer("SW000003", "sprzedana", day("2026-09-21")),
      ],
      3,
    );
    expect(picked.map((e) => e.number)).toEqual(["SW000001"]);
  });

  it("zero aktywnych i zero ofert — pusta lista", () => {
    expect(pickHomeOffers([], 3)).toEqual([]);
    expect(
      pickHomeOffers([offer("SW000001", "sprzedana", day("2026-05-01"))], 3),
    ).toEqual([]);
  });

  it("limit 0 albo ujemny nie zwraca niczego", () => {
    const offers = [offer("SW000001", "aktywna", day("2026-05-01"))];
    expect(pickHomeOffers(offers, 0)).toEqual([]);
    expect(pickHomeOffers(offers, -1)).toEqual([]);
  });

  it("wynik to wpisy indeksu z adresem detalu (wejście kafla)", () => {
    const [entry] = pickHomeOffers(
      [offer("SW000001", "aktywna", day("2026-05-01"))],
      3,
    );
    expect(entry.path).toMatch(/^\/oferty\/.+\/sw000001\/$/);
    expect(entry).not.toHaveProperty("descriptionHtml");
  });
});

describe("pickHomeOffers (fixture)", () => {
  const fixture = readFixtureOffersTyped();

  it.skipIf(fixture.length === 0)(
    "fixture daje komplet kafli strony głównej — same aktywne, malejąco po dacie",
    () => {
      const picked = pickHomeOffers(fixture, HOME_OFFERS_MAX);
      const active = fixture.filter((o) => o.status === "aktywna");
      expect(picked).toHaveLength(Math.min(HOME_OFFERS_MAX, active.length));
      const dates = picked.map((e) => e.addedAt);
      expect([...dates].sort().reverse()).toEqual(dates);
    },
  );
});
