// normalize(): dane syntetyczne o kształcie API → oferta robocza.
// Przypadki brzegowe: parter 0, brak ceny / priceHide, oba formaty
// YouTube, końcowa spacja w placeName, czynsz 0.00, obniżka, Omnibus,
// rozjazd main_picture, nieznany prefiks (W5), słownik jako parametr.
import { describe, expect, it } from "vitest";
import { EMPTY_DICTIONARY } from "../../scripts/sync/dictionary";
import { NormalizeError, normalize } from "../../scripts/sync/normalize";
import { findForbiddenKeys } from "../../src/lib/offers/public-fields";
import { NormalizedOfferSchema } from "../../src/lib/offers/schema";
import {
  FORBIDDEN_SENTINEL,
  readSyntheticDictionary,
  readSyntheticList,
} from "../helpers/raw";

const dictionary = readSyntheticDictionary();
const raws = readSyntheticList();
const byNumber = (n: string) => raws.find((r) => r.number === n)!;
const run = (n: string, opts = {}) =>
  normalize(byNumber(n), { dictionary, ...opts });

describe("kontrakt ogólny", () => {
  it("każdy rekord syntetyczny przechodzi walidację strict i nie niesie wartownika", () => {
    for (const raw of raws) {
      const { offer } = normalize(raw, { dictionary });
      expect(NormalizedOfferSchema.safeParse(offer).success).toBe(true);
      const json = JSON.stringify(offer);
      expect(json).not.toContain(FORBIDDEN_SENTINEL);
      expect(findForbiddenKeys(offer)).toEqual([]);
    }
  });

  it("ostrzeżenia: message bez numeru oferty, numer w osobnym polu", () => {
    for (const raw of raws) {
      for (const w of normalize(raw, { dictionary }).warnings) {
        expect(w.message).not.toMatch(/SW\d+/);
        expect(w.number).toBe(raw.number);
      }
    }
  });
});

describe("SW900001 — mieszkanie, sprzedaż, parter, obniżka", () => {
  const { offer, warnings } = run("SW900001");

  it("identyfikacja, typ, status, agent", () => {
    expect(offer.crmId).toBe(90000001);
    expect(offer.number).toBe("SW900001");
    expect(offer.slug).toBe("sw900001");
    expect(offer.mainType).toBe("mieszkanie");
    expect(offer.subTypeId).toBe(16);
    expect(offer.subType).toBe("Blok mieszkalny");
    expect(offer.transaction).toBe("sprzedaz");
    expect(offer.market).toBe("wtorny");
    expect(offer.status).toBe("aktywna");
    expect(offer.statusSource).toBe("title");
    expect(offer.crmStatus).toBe(3);
    expect(offer.agent).toBe("joanna");
    expect(offer.legacyId).toBeUndefined();
  });

  it("piętro 0 = parter, liczby z stringów, windy jako liczba", () => {
    expect(offer.floor).toBe(0);
    expect(offer.area).toBe(27);
    expect(offer.floorsInBuilding).toBe(12);
    expect(offer.elevators).toBe(2);
    expect(offer.rooms).toBe(1);
  });

  it("cena: obniżka → previousPrice; lastLowestPrice = price → brak lowestPrice30d; czynsz > 0", () => {
    expect(offer.price).toBe(360000);
    expect(offer.pricePerM2).toBe(13333.33);
    expect(offer.currency).toBe("PLN");
    expect(offer.previousPrice).toBe(390000);
    expect(offer.lowestPrice30d).toBeUndefined();
    expect(offer.rent).toBe(450);
  });

  it("daty → ISO z offsetem Europe/Warsaw (lato +02:00)", () => {
    expect(offer.addedAt).toBe("2026-07-30T11:01:42+02:00");
    expect(offer.activatedAt).toBe("2026-07-30T11:05:00+02:00");
    expect(offer.updatedAt).toBe("2026-09-20T09:15:00+02:00");
  });

  it("lokalizacja: Title Case województwa, trim placeName, os., slug", () => {
    expect(offer.location).toEqual({
      province: "Wielkopolskie",
      county: "Poznań",
      commune: "Poznań-Stare Miasto",
      city: "Poznań",
      parentDistrict: "Stare Miasto",
      district: "Winogrady",
      placeName: "Poznań Winogrady",
      street: "Pod Lipami",
      streetType: "os.",
      slug: "poznan-winogrady",
      lat: 52.43252,
      lon: 16.93933,
    });
  });

  it("słownik: kuchnia, wyposażenie, własność, stan, ogrzewanie, materiał; umeblowanie; jasna kuchnia", () => {
    expect(offer.kitchen).toBe("Aneks");
    expect(offer.equipment).toEqual(["Pralka", "Zmywarka"]);
    expect(offer.ownership).toBe("Własność");
    expect(offer.condition).toBe("Bardzo dobry");
    expect(offer.heating).toBe("CO miejskie");
    expect(offer.material).toBe("Wielka płyta");
    expect(offer.furnished).toBe("tak");
    expect(offer.brightKitchen).toBe(true);
    expect(offer.windows).toBe(431);
    expect(offer.bathroomType).toBe(562);
  });

  it("flagi: ekspozycja, liczniki, dodatki, bezpieczeństwo, media, okolica", () => {
    expect(offer.exposure).toEqual(["E", "S"]);
    expect(offer.meters).toEqual(["prad", "woda"]);
    expect(offer.extras).toEqual({
      balcony: 1,
      loggia: 0,
      terrace: 0,
      basement: 1,
      attic: 0,
      storage: 0,
      parking: 0,
      parkingUnderground: 0,
      garage: 0,
      garden: 0,
      entresol: 0,
    });
    expect(offer.security).toEqual(["intercom", "securedoor"]);
    expect(offer.media).toEqual(["internet"]);
    expect(offer.surroundings).toEqual(["communicationTram", "recreationPark"]);
    expect(offer.plot).toBeUndefined();
    expect(offer.commercial).toBeUndefined();
  });

  it("opis: www i główny równe po normalizacji → bez DESCRIPTION_DIFF; sanityzacja", () => {
    expect(offer.descriptionHtml).toBe(
      '<div class="ta-justify"><strong>Kawalerka</strong> po remoncie.<br>Blisko parku.</div>',
    );
    expect(warnings.map((w) => w.code)).not.toContain("DESCRIPTION_DIFF");
    expect(offer.tags).toEqual(["Balkon", "Winda"]);
  });

  it("zdjęcia: zip pictures × picturesTypes, alt z tytułem; film youtube.com/watch; spacer", () => {
    expect(offer.photos).toEqual([
      {
        id: 500000001,
        sourceUrl:
          "https://static.example.invalid/public/images/offers/11355/90000001/500000001_max.jpg",
        kind: "photo",
        alt: "Winogrady - kawalerka 27 m² po remoncie – zdjęcie 1",
      },
      {
        id: 500000002,
        sourceUrl:
          "https://static.example.invalid/public/images/offers/11355/90000001/500000002_max.jpg",
        kind: "photo",
        alt: "Winogrady - kawalerka 27 m² po remoncie – zdjęcie 2",
      },
    ]);
    expect(offer.videoId).toBe("dQw4w9WgXcQ");
    expect(offer.tourUrl).toBe("https://sb360.online/abc123");
    expect(warnings.map((w) => w.code)).not.toContain("MAIN_PICTURE");
  });

  it("brak ostrzeżeń W1/W2 bez agreementSignalId; labelNew=1 nie daje W3", () => {
    expect(warnings).toEqual([]);
  });
});

describe("SW900002 — wynajem, WYNAJĘTE, czynsz 0.00, plan, youtu.be", () => {
  const { offer, warnings } = run("SW900002");

  it("status z prefiksu, tytuł bez prefiksu", () => {
    expect(offer.status).toBe("wynajeta");
    expect(offer.title).toBe("Łazarz - 2 pokoje z balkonami");
    expect(offer.rawTitle).toBe("WYNAJĘTE Łazarz - 2 pokoje z balkonami");
    expect(offer.badges).toEqual([]);
  });

  it("czynsz 0.00 → brak rent; opłaty i kaucja; toalety 0 = wartość; availableFrom", () => {
    expect(offer.rent).toBeUndefined();
    expect(offer.charges).toBe(300);
    expect(offer.deposit).toBe(5000);
    expect(offer.toilets).toBe(0);
    expect(offer.usableArea).toBe(48.5);
    expect(offer.availableFrom).toBe("2026-11-01");
    expect(offer.previousPrice).toBeUndefined();
    expect(offer.furnished).toBe("czesciowo");
    expect(offer.brightKitchen).toBe(false);
    expect(offer.extras.balcony).toBe(2);
    expect(offer.extras.parkingUnderground).toBe(1);
  });

  it("daty zimowe +01:00", () => {
    expect(offer.addedAt).toBe("2025-01-15T08:00:00+01:00");
    expect(offer.updatedAt).toBe("2026-03-01T12:00:00+01:00");
  });

  it("zdjęcia: typ 120 → plan; main_picture ≠ pierwsze → MAIN_PICTURE", () => {
    expect(offer.photos.map((p) => p.kind)).toEqual(["photo", "plan", "photo"]);
    expect(warnings.map((w) => w.code)).toContain("MAIN_PICTURE");
  });

  it("youtu.be → videoId; opis: b → strong, script wycięty, 4×<br> → 2", () => {
    expect(offer.videoId).toBe("abcdefghijk");
    expect(offer.descriptionHtml).toBe(
      "<p>Dwa <strong>balkony</strong>.<br><br>Garaż.</p>",
    );
    expect(offer.tags).toEqual([]);
  });

  it("lokalizacja z poddzielnicą (Grunwald / Łazarz)", () => {
    expect(offer.location.parentDistrict).toBe("Grunwald");
    expect(offer.location.district).toBe("Łazarz");
    expect(offer.location.slug).toBe("poznan-lazarz");
    expect(offer.location.streetType).toBe("ul.");
  });
});

describe("SW900003 — działka poza Poznaniem, REZERWACJA + 0%, znacznik W3, film nieznany", () => {
  const { offer, warnings } = run("SW900003");

  it("status rezerwacja, plakietka 0% prowizji, tytuł oczyszczony", () => {
    expect(offer.status).toBe("rezerwacja");
    expect(offer.badges).toEqual(["0% prowizji"]);
    expect(offer.title).toBe("Baranowo - działka leśna 30 a");
  });

  it("działka: plotArea = area; słowniki działki; pricePrevious null; Omnibus przy podwyżce brak", () => {
    expect(offer.plotArea).toBe(3000);
    expect(offer.area).toBe(3000);
    expect(offer.plot).toEqual({
      fencing: "Brak",
      road: "Polna",
      building: "Brak",
      ownership: "Własność",
      shape: 1,
      width: 30,
    });
    expect(offer.previousPrice).toBeUndefined();
    // lastLowestPrice (125 000) > price (120 000) → nic
    expect(offer.lowestPrice30d).toBeUndefined();
    expect(offer.subType).toBe("Leśna");
  });

  it("lokalizacja bez dzielnicy i bez ulicy; labelNew null", () => {
    expect(offer.location.district).toBeUndefined();
    expect(offer.location.street).toBeUndefined();
    expect(offer.location.streetType).toBeUndefined();
    expect(offer.location.placeName).toBe("Baranowo");
    expect(offer.location.slug).toBe("baranowo");
    expect(offer.location.county).toBe("poznański");
    expect(offer.labels).toEqual({ sold: 55, reserved: 56, new: null });
  });

  it("\\r\\n w opisie → \\n; media/okolica", () => {
    expect(offer.descriptionHtml).toBe("Cisza i las.\nDojazd drogą polną.");
    expect(offer.media).toEqual(["current"]);
    expect(offer.surroundings).toEqual([
      "locationtypeOutsidecity",
      "recreationForest",
    ]);
  });

  it("ostrzeżenia: W3 (labelReserved ≠ 57) i VIDEO_LINK (vimeo)", () => {
    expect(warnings.map((w) => w.code).sort()).toEqual(["VIDEO_LINK", "W3"]);
    expect(offer.videoId).toBeUndefined();
  });

  it("data tuż po zmianie czasu (30.03.2024 02:30 nie istnieje) nie wywraca", () => {
    expect(offer.addedAt).toMatch(/^2024-03-30T02:30:00\+0[12]:00$/);
  });
});

describe("SW900004 — komercyjny, priceHide, tytuł www, nieznany prefiks, bez zdjęć", () => {
  const { offer, warnings } = run("SW900004");

  it("priceHide=1 → price null, pricePerM2 null (Zapytaj o cenę)", () => {
    expect(offer.price).toBeNull();
    expect(offer.pricePerM2).toBeNull();
    expect(offer.market).toBe("pierwotny");
  });

  it("tekst z portalWwwTitle, status z portalTitle; W5 dla NOWOSC", () => {
    expect(offer.title).toBe("Wilda - lokal z witryną (www)");
    expect(offer.rawTitle).toBe("NOWOSC Wilda - lokal z witryną");
    expect(offer.status).toBe("aktywna");
    const w5 = warnings.find((w) => w.code === "W5");
    expect(w5?.detail).toBe("NOWOSC");
  });

  it("komercyjne: podtyp, alternatywy ze słownika, witryna; energia", () => {
    expect(offer.subType).toBe("Lokal handlowy/usługowy");
    expect(offer.commercial).toEqual({
      alternativeTypes: ["Biuro", "Magazyn"],
      shopWindow: true,
    });
    expect(offer.energy).toEqual({ usable: 45.2, final: 60.1 });
    expect(offer.condition).toBe("Deweloperski");
  });

  it("brak dzielnicy w Poznaniu: placeName = miasto; brak zdjęć = pusta tablica", () => {
    expect(offer.location.placeName).toBe("Poznań");
    expect(offer.location.slug).toBe("poznan");
    expect(offer.photos).toEqual([]);
    expect(offer.videoId).toBeUndefined();
    expect(offer.tourUrl).toBeUndefined();
  });

  it("opis: underline → klasa u, javascript: i onclick wycięte, link http zostaje", () => {
    expect(offer.descriptionHtml).toBe(
      '<span class="u">Witryna</span> od ulicy. <a>link</a> <a href="https://example.invalid/" rel="noopener" target="_blank">strona</a>',
    );
  });
});

describe("sygnał umowy (W1/W2) i słownik", () => {
  it("W1: prefiks statusu, a sygnał inny; W2: sygnał bez prefiksu", () => {
    const signal = 999;
    const withPrefix = { ...byNumber("SW900002"), agreementType: 1 };
    expect(
      normalize(withPrefix, {
        dictionary,
        agreementSignalId: signal,
      }).warnings.map((w) => w.code),
    ).toContain("W1");
    const noPrefix = { ...byNumber("SW900001"), agreementType: signal };
    expect(
      normalize(noPrefix, {
        dictionary,
        agreementSignalId: signal,
      }).warnings.map((w) => w.code),
    ).toContain("W2");
    const consistent = { ...byNumber("SW900002"), agreementType: signal };
    const codes = normalize(consistent, {
      dictionary,
      agreementSignalId: signal,
    }).warnings.map((w) => w.code);
    expect(codes).not.toContain("W1");
    expect(codes).not.toContain("W2");
  });

  it("pusty słownik: pola słownikowe pominięte, ostrzeżenie DICT_MISS per pole, walidacja przechodzi", () => {
    const { offer, warnings } = normalize(byNumber("SW900001"), {
      dictionary: EMPTY_DICTIONARY,
    });
    expect(offer.subType).toBeUndefined();
    expect(offer.kitchen).toBeUndefined();
    expect(offer.equipment).toBeUndefined();
    expect(offer.ownership).toBeUndefined();
    const miss = warnings.filter((w) => w.code === "DICT_MISS");
    expect(miss.length).toBeGreaterThanOrEqual(6);
    expect(miss[0].detail).toMatch(/^\w+=\d+$/);
  });
});

describe("błędy danych", () => {
  it("brak pola kluczowego → NormalizeError z nazwą pola, bez numeru w message", () => {
    const broken = { ...byNumber("SW900001"), areaTotal: null };
    expect(() => normalize(broken, { dictionary })).toThrow(NormalizeError);
    try {
      normalize(broken, { dictionary });
    } catch (e) {
      const err = e as NormalizeError;
      expect(err.field).toBe("areaTotal");
      expect(err.number).toBe("SW900001");
      expect(err.message).not.toContain("SW900001");
    }
  });

  it("nieznany typ transakcji / typ główny → błąd", () => {
    expect(() =>
      normalize({ ...byNumber("SW900001"), transaction: 999 }, { dictionary }),
    ).toThrow(NormalizeError);
    expect(() =>
      normalize({ ...byNumber("SW900001"), mainTypeId: 7 }, { dictionary }),
    ).toThrow(NormalizeError);
  });
});
