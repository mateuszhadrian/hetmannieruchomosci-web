// Meta detalu (4.3): tytuł, opis cięty na granicy zdania, fallback.
import { describe, expect, it } from "vitest";
import {
  cutAtSentence,
  DESCRIPTION_MAX,
  descriptionText,
  detailDescription,
  detailTitle,
  offerHeading,
} from "../../src/lib/offers/detail-meta";
import type { Offer } from "../../src/lib/offers/schema";
import { readFixtureOffersTyped } from "../helpers/offers";
import { FORBIDDEN_SENTINEL, syntheticFullOffers } from "../helpers/raw";

const base = syntheticFullOffers()[0];
const make = (patch: Partial<Offer>): Offer => ({ ...base, ...patch });

describe("tytuł", () => {
  it("niesie tytuł oferty, rodzaj, lokalizację i markę", () => {
    const o = make({
      title: "Milczańska 2 pokoje",
      mainType: "mieszkanie",
      transaction: "sprzedaz",
    });
    expect(detailTitle(o)).toBe(
      `Milczańska 2 pokoje — Mieszkanie na sprzedaż, ${o.location.placeName} · Hetman Nieruchomości`,
    );
  });
  it("pusty tytuł → nazwa typu z CRM", () => {
    const o = make({ title: "  ", typeName: "Dom (Bliźniak)" });
    expect(offerHeading(o)).toBe("Dom (Bliźniak)");
    expect(detailTitle(o).startsWith("Dom (Bliźniak) — ")).toBe(true);
  });
});

describe("cutAtSentence", () => {
  const sentence =
    "Pierwsze zdanie ma trochę słów. Drugie zdanie też ma kilka słów! Trzecie pyta?";
  it("krótki tekst bez zmian", () => {
    expect(cutAtSentence("Krótko.", 160)).toBe("Krótko.");
  });
  it("tnie na ostatnim zakończonym zdaniu w limicie", () => {
    expect(cutAtSentence(sentence, 70)).toBe(
      "Pierwsze zdanie ma trochę słów. Drugie zdanie też ma kilka słów!",
    );
    expect(cutAtSentence(sentence, 40)).toBe("Pierwsze zdanie ma trochę słów.");
  });
  it("bez zdania w limicie — ucięcie na spacji z wielokropkiem", () => {
    const got = cutAtSentence(sentence, 20);
    expect(got).toBe("Pierwsze zdanie ma…");
    expect(got.length).toBeLessThanOrEqual(20);
  });
  it("kropka w liczbie („49.84 m2”) nie kończy zdania", () => {
    const t =
      "Mieszkanie 49.84 m2 na drugim piętrze budynku z windą i garażem podziemnym. Koniec.";
    expect(cutAtSentence(t, 60)).toBe(
      "Mieszkanie 49.84 m2 na drugim piętrze budynku z windą i…",
    );
  });
});

describe("description", () => {
  it("tekst bez HTML, białe znaki scalone", () => {
    expect(
      descriptionText("<p>Ala  ma<br>kota.</p>\n<div>  I psa. </div>"),
    ).toBe("Ala makota. I psa.");
  });
  it("opis z HTML → tekst ≤ limitu, bez tagów", () => {
    const o = make({
      descriptionHtml:
        "<p><strong>Zapraszam</strong> do zapoznania się z ofertą. " +
        "Mieszkanie jest jasne i ciche. ".repeat(10) +
        "</p>",
    });
    const d = detailDescription(o);
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(d).not.toMatch(/<|>/);
    expect(d.endsWith(".")).toBe(true);
  });
  it("pusty opis → szablon z rodzaju, lokalizacji, ceny i numeru", () => {
    const o = make({
      descriptionHtml: "",
      price: 350000,
      transaction: "sprzedaz",
    });
    const d = detailDescription(o);
    expect(d).toContain(o.number);
    expect(d).toContain("350");
    expect(d).toContain("Hetman Nieruchomości");
  });
  it("fixture: każdy opis mieści się w limicie i nie niesie wartownika", () => {
    const fixture = readFixtureOffersTyped();
    for (const o of fixture) {
      const d = detailDescription(o);
      expect(d.length, o.number).toBeGreaterThan(0);
      expect(d.length, o.number).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(d).not.toContain(FORBIDDEN_SENTINEL);
    }
  });
});
