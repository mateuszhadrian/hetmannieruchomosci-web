// Rejestr adresów tylko dopisuje: zmiana lokalizacji zostawia starą
// ścieżkę; zniknięcie oferty nie usuwa wpisu; klucze posortowane.
import { describe, expect, it } from "vitest";
import { currentPath, updateLedger } from "../../scripts/sync/ledger";
import { UrlLedgerSchema } from "../../src/lib/offers/schema";

const a = {
  number: "SW900001",
  mainType: "mieszkanie" as const,
  transaction: "sprzedaz" as const,
  location: { slug: "poznan-winogrady" },
};
const b = {
  ...a,
  number: "SW900002",
  transaction: "wynajem" as const,
  location: { slug: "poznan-lazarz" },
};

describe("updateLedger()", () => {
  it("pierwszy sync: jeden adres na ofertę", () => {
    const ledger = updateLedger({}, [b, a]);
    expect(ledger).toEqual({
      SW900001: ["/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/sw900001/"],
      SW900002: ["/oferty/mieszkanie-na-wynajem/poznan-lazarz/sw900002/"],
    });
    expect(UrlLedgerSchema.safeParse(ledger).success).toBe(true);
    expect(Object.keys(ledger)).toEqual(["SW900001", "SW900002"]);
  });

  it("zmiana lokalizacji → stara ścieżka zostaje, nowa na końcu", () => {
    const first = updateLedger({}, [a]);
    const moved = { ...a, location: { slug: "poznan-stare-miasto" } };
    const second = updateLedger(first, [moved]);
    expect(second.SW900001).toEqual([
      "/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/sw900001/",
      "/oferty/mieszkanie-na-sprzedaz/poznan-stare-miasto/sw900001/",
    ]);
    expect(currentPath(second, "SW900001")).toBe(
      "/oferty/mieszkanie-na-sprzedaz/poznan-stare-miasto/sw900001/",
    );
    // powrót do starej lokalizacji nie dubluje wpisu
    expect(updateLedger(second, [a]).SW900001).toHaveLength(2);
  });

  it("oferta zdjęta z CRM zostaje w rejestrze; wejście nie jest mutowane", () => {
    const first = updateLedger({}, [a, b]);
    const snapshot = JSON.stringify(first);
    const second = updateLedger(first, [a]);
    expect(second.SW900002).toEqual(first.SW900002);
    expect(JSON.stringify(first)).toBe(snapshot);
    expect(currentPath(second, "SW999999")).toBeUndefined();
  });
});
