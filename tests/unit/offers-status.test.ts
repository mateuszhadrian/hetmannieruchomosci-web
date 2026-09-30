// Parser prefiksu statusu (D38) na realnych tytułach z obecnej strony
// (tests/fixtures/raw/titles-45.json — bez numerów ofert) + przypadki
// brzegowe przeniesione z analizy.
import { describe, expect, it } from "vitest";
import { parseTitle } from "../../src/lib/offers/status";
import { readTitles45 } from "../helpers/raw";

describe("45 realnych tytułów", () => {
  it("status zgodny z ręczną klasyfikacją: 8 / 21 / 13 / 3", () => {
    const counts: Record<string, number> = {};
    for (const t of readTitles45()) {
      const p = parseTitle(t.title, t.transaction);
      expect(p.status, `tytuł: ${t.title}`).toBe(t.expectedStatus);
      expect(p.title, `prefiks nieusunięty: ${p.title}`).not.toMatch(
        /^(SPRZED|WYNAJ|REZERW)/i,
      );
      expect(p.title.length).toBeGreaterThan(5);
      expect(p.unknownPrefix).toBeNull();
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    expect(counts).toEqual({
      aktywna: 8,
      sprzedana: 21,
      wynajeta: 13,
      rezerwacja: 3,
    });
  });

  it("literówka SPRZEDEDANE jest rozpoznawana", () => {
    const typo = readTitles45().find((t) => /SPRZEDEDANE/i.test(t.title));
    expect(typo).toBeDefined();
    expect(parseTitle(typo!.title, typo!.transaction).status).toBe("sprzedana");
  });
});

describe("przypadki brzegowe", () => {
  it("0% prowizji staje się plakietką, nie statusem", () => {
    const p = parseTitle("0% Szczepankowo - ok. 100m², 4 pokoje", "sprzedaz");
    expect(p.status).toBe("aktywna");
    expect(p.badges).toEqual(["0% prowizji"]);
    expect(p.title).toBe("Szczepankowo - ok. 100m², 4 pokoje");
    const q = parseTitle("SPRZEDANE 0% Wilda - 4 pokoje", "sprzedaz");
    expect(q.status).toBe("sprzedana");
    expect(q.badges).toEqual(["0% prowizji"]);
    expect(q.title).toBe("Wilda - 4 pokoje");
  });

  it("separatory po prefiksie: myślnik, dwukropek, brak, małe litery", () => {
    expect(parseTitle("SPRZEDANE - Wilda APARTAMENT", "sprzedaz").title).toBe(
      "Wilda APARTAMENT",
    );
    expect(parseTitle("REZERWACJA: Rataje 70m²", "sprzedaz").title).toBe(
      "Rataje 70m²",
    );
    expect(parseTitle("WYNAJĘTE Naramowice", "wynajem").title).toBe(
      "Naramowice",
    );
    expect(parseTitle("sprzedane mieszkanie", "sprzedaz").status).toBe(
      "sprzedana",
    );
  });

  it("słowo w środku tytułu nie jest statusem", () => {
    const p = parseTitle("Mieszkanie do sprzedania, nie wynajęte", "sprzedaz");
    expect(p.status).toBe("aktywna");
    expect(p.title).toBe("Mieszkanie do sprzedania, nie wynajęte");
  });

  it("transakcja wygrywa ze słowem", () => {
    expect(parseTitle("SPRZEDANE kawalerka", "wynajem").status).toBe(
      "wynajeta",
    );
    expect(parseTitle("WYNAJĘTE dom", "sprzedaz").status).toBe("sprzedana");
  });

  it("nieznany prefiks (W5): ≥ 6 wielkich liter na początku, status aktywna", () => {
    const p = parseTitle("NOWOSC Wilda - lokal", "sprzedaz");
    expect(p.status).toBe("aktywna");
    expect(p.unknownPrefix).toBe("NOWOSC");
    expect(p.title).toBe("NOWOSC Wilda - lokal");
    expect(
      parseTitle("Wilda APARTAMENT 60 m²", "sprzedaz").unknownPrefix,
    ).toBeNull();
    expect(parseTitle("ABC dom", "sprzedaz").unknownPrefix).toBeNull();
  });

  it("pusty tytuł nie wywraca", () => {
    const p = parseTitle("", "sprzedaz");
    expect(p).toEqual({
      status: "aktywna",
      title: "",
      badges: [],
      matchedPrefix: null,
      unknownPrefix: null,
    });
  });
});
