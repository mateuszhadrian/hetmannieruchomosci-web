// Kontrakt allow-listy (D18): wynik pickPublic() ma klucze ⊆ PUBLIC_FIELDS,
// wartownicy z pól zabronionych nie występują w JSON-ie wyniku, listy są
// rozłączne.
import { describe, expect, it } from "vitest";
import {
  CONTROL_FIELDS,
  FORBIDDEN_FIELDS,
  PUBLIC_FIELDS,
  findForbiddenKeys,
  pickControl,
  pickPublic,
} from "../../src/lib/offers/public-fields";
import { FORBIDDEN_SENTINEL, readSyntheticList } from "../helpers/raw";

const PUBLIC = new Set<string>(PUBLIC_FIELDS);

describe("listy pól", () => {
  it("PUBLIC, CONTROL i FORBIDDEN nie mają wspólnych nazw poza agreementType (kontrolne i zabronione)", () => {
    for (const f of CONTROL_FIELDS) expect(PUBLIC.has(f)).toBe(false);
    for (const f of FORBIDDEN_FIELDS) expect(PUBLIC.has(f)).toBe(false);
    const both = CONTROL_FIELDS.filter((f) =>
      (FORBIDDEN_FIELDS as readonly string[]).includes(f),
    );
    expect(both).toEqual(["agreementType"]);
  });

  it("nie ma duplikatów", () => {
    expect(new Set(PUBLIC_FIELDS).size).toBe(PUBLIC_FIELDS.length);
    expect(new Set(FORBIDDEN_FIELDS).size).toBe(FORBIDDEN_FIELDS.length);
  });
});

describe("pickPublic() na danych syntetycznych", () => {
  const raws = readSyntheticList();

  it("dane wejściowe mają wartowników we wszystkich polach zabronionych", () => {
    for (const raw of raws) {
      for (const f of FORBIDDEN_FIELDS) expect(raw).toHaveProperty(f);
      expect(JSON.stringify(raw)).toContain(FORBIDDEN_SENTINEL);
    }
  });

  it("wynik ma wyłącznie klucze z allow-listy", () => {
    for (const raw of raws) {
      const pub = pickPublic(raw);
      for (const key of Object.keys(pub)) expect(PUBLIC.has(key)).toBe(true);
      expect(Object.keys(pub).length).toBeGreaterThan(50);
    }
  });

  it("wartownik z pól zabronionych nie występuje w JSON-ie wyniku", () => {
    for (const raw of raws) {
      const json = JSON.stringify(pickPublic(raw));
      expect(json).not.toContain(FORBIDDEN_SENTINEL);
      expect(findForbiddenKeys(pickPublic(raw))).toEqual([]);
    }
  });

  it("pickControl() daje same pola kontrolne", () => {
    const ctrl = pickControl(raws[0]);
    expect(Object.keys(ctrl).sort()).toEqual([...CONTROL_FIELDS].sort());
  });
});

describe("findForbiddenKeys()", () => {
  it("znajduje klucz zagnieżdżony i w tablicy", () => {
    const bad = { a: { photos: [{ ok: 1 }, { contactPhone: "x" }] } };
    expect(findForbiddenKeys(bad)).toEqual(["a.photos[1].contactPhone"]);
    expect(findForbiddenKeys({ a: [1, "b", null] })).toEqual([]);
  });
});
