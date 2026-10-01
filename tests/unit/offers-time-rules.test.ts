// Reguły zależne od daty (strona + sync): „Nowość" po datach kalendarzowych
// w czasie polskim; „dostępne od" tylko dzisiejsze i przyszłe; odcisk
// zmienia się dokładnie w dniu, w którym zmienia się prezentacja.
import { describe, expect, it } from "vitest";
import { NEW_BADGE_DAYS } from "../../src/lib/site-config";
import {
  dateDependentFingerprint,
  daysBetween,
  isNewOffer,
  showsAvailableFrom,
  warsawDate,
} from "../../src/lib/offers/time-rules";

describe("warsawDate()", () => {
  it("liczy datę w czasie polskim, nie UTC", () => {
    // 23:30 UTC 30 września = 01:30 1 października w Warszawie (CEST)
    expect(warsawDate(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(warsawDate(new Date("2026-10-01T10:00:00+02:00"))).toBe(
      "2026-10-01",
    );
  });
});

describe("isNewOffer()", () => {
  const now = new Date("2026-10-01T12:00:00+02:00");
  it("dodana dziś i NEW_BADGE_DAYS dni temu = nowość; dzień później już nie", () => {
    expect(isNewOffer("2026-10-01T09:00:00+02:00", now)).toBe(true);
    const edge = new Date(now);
    edge.setDate(edge.getDate() - NEW_BADGE_DAYS);
    expect(isNewOffer(edge.toISOString(), now)).toBe(true);
    edge.setDate(edge.getDate() - 1);
    expect(isNewOffer(edge.toISOString(), now)).toBe(false);
  });
  it("data z przyszłości nie jest nowością", () => {
    expect(isNewOffer("2026-10-02T09:00:00+02:00", now)).toBe(false);
  });
});

describe("showsAvailableFrom()", () => {
  const now = new Date("2026-10-01T12:00:00+02:00");
  it("brak daty = nie; przeszła = nie; dzisiejsza i przyszła = tak", () => {
    expect(showsAvailableFrom(undefined, now)).toBe(false);
    expect(showsAvailableFrom("2026-09-30", now)).toBe(false);
    expect(showsAvailableFrom("2026-10-01", now)).toBe(true);
    expect(showsAvailableFrom("2027-01-01", now)).toBe(true);
  });
});

describe("dateDependentFingerprint()", () => {
  const offers = [
    { addedAt: "2026-09-17T10:00:00+02:00" },
    { addedAt: "2026-01-01T10:00:00+01:00", availableFrom: "2026-10-01" },
  ];
  it("zmienia się między wczoraj i dziś, gdy mija próg lub data", () => {
    const yesterday = new Date("2026-09-30T04:00:00+02:00");
    const today = new Date("2026-10-01T04:00:00+02:00");
    const tomorrow = new Date("2026-10-02T04:00:00+02:00");
    expect(dateDependentFingerprint(offers, yesterday)).toBe("N--A");
    expect(dateDependentFingerprint(offers, today)).toBe("N--A");
    expect(dateDependentFingerprint(offers, tomorrow)).toBe("----");
  });
  it("daysBetween liczy pełne dni", () => {
    expect(daysBetween("2026-09-30", "2026-10-01")).toBe(1);
    expect(daysBetween("2026-10-01", "2026-09-30")).toBe(-1);
  });
});
