// Kontrakt danych strukturalnych (dane wpisane w Etapie 0, węzły wchodzą
// na strony w Etapie 6). Najważniejsza asercja to antyscrapingowa:
// JSON-LD renderuje się statycznie do dist/, więc telefon albo e-mail
// w węźle złamałby kontrakt slotów contact-details.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";
import {
  BUSINESS,
  localBusiness,
  realEstateListing,
  webSite,
} from "../../src/lib/jsonld";
import type { Offer } from "../../src/lib/offers/schema";
import { syntheticFullOffers } from "../helpers/raw";

const SITE = "https://hetmannieruchomosci.com";
const business = localBusiness(SITE);
const site = webSite(SITE);

// Te same ciągi, których pilnuje test surowego HTML w navigation.spec.ts.
// Składane z contact-details, żeby pełne ciągi nie istniały także tutaj.
const FORBIDDEN = [
  buildEmail("biuro"),
  buildEmail("joanna"),
  buildPhoneHref().replace("tel:+48", ""),
  buildPhoneDisplay().replace("+48 ", ""),
];

// Węzeł oferty (4.3) na danych syntetycznych — adres do ulicy, bez numeru.
const offerBase = syntheticFullOffers()[0];
const makeOffer = (patch: Partial<Offer>): Offer => ({
  ...offerBase,
  ...patch,
});
const PATH = "/oferty/mieszkanie-na-sprzedaz/poznan/sw000001/";
const EXTRAS = {
  description: "Opis testowy. Drugie zdanie.",
  images: [`${SITE}/media/a.webp`, `${SITE}/media/b.webp`],
};
const listing = realEstateListing(SITE, offerBase, PATH, EXTRAS);

describe("antyscraping", () => {
  it("węzły nie niosą telefonów ani e-maila w żadnej postaci", () => {
    for (const node of [business, site, listing]) {
      const serialized = JSON.stringify(node);
      for (const needle of FORBIDDEN) {
        expect(serialized.includes(needle), `JSON-LD zawiera „${needle}”`).toBe(
          false,
        );
      }
      // Rekurencyjnie — węzły @graph siedzą w tablicy, więc sprawdzanie
      // kluczy samego korzenia niczego by nie pilnowało.
      const keysDeep = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.flatMap(keysDeep)
          : value && typeof value === "object"
            ? Object.entries(value).flatMap(([k, v]) => [k, ...keysDeep(v)])
            : [];
      expect(keysDeep(node)).not.toContain("telephone");
      expect(keysDeep(node)).not.toContain("email");
    }
  });

  it("moduł danych firmy nie importuje contact-details", () => {
    const source = readFileSync("src/lib/jsonld.ts", "utf8");
    expect(source).not.toMatch(/from\s+["'].*contact-details/);
  });
});

describe("localBusiness()", () => {
  it("jest podtypem LocalBusiness (pośrednictwo) z adresem biura i @id", () => {
    expect(business["@context"]).toBe("https://schema.org");
    expect(business["@type"]).toBe("RealEstateAgent");
    expect(business["@id"]).toBe(`${SITE}/#firma`);
    expect(business.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: "Os. Pod Lipami 104 lok. I/J",
      postalCode: "61-638",
      addressLocality: "Poznań",
      addressCountry: "PL",
    });
  });

  it("niesie geo jako LICZBY w granicach Poznania", () => {
    // schema.org dopuszcza też ciągi, ale walidatory czytają liczby bez
    // niespodzianek; ramka to sanity-check, że nikt nie przestawił lat↔lon.
    const geo = business.geo as {
      "@type": string;
      latitude: number;
      longitude: number;
    };
    expect(geo["@type"]).toBe("GeoCoordinates");
    expect(typeof geo.latitude).toBe("number");
    expect(typeof geo.longitude).toBe("number");
    expect(geo.latitude).toBeCloseTo(52.4298714, 6);
    expect(geo.longitude).toBeCloseTo(16.9414254, 6);
    expect(geo.latitude).toBeGreaterThan(geo.longitude);
  });

  it("adresy obrazów i strony są absolutne (podglądy i walidator wymagają URL)", () => {
    for (const url of [business.url, business.image, business.logo]) {
      expect(String(url).startsWith(`${SITE}/`)).toBe(true);
    }
  });

  it("godziny: pn.–pt. 11:00–17:00, bez weekendu", () => {
    const hours = business.openingHoursSpecification as {
      dayOfWeek: string[];
      opens: string;
      closes: string;
    }[];
    expect(hours).toHaveLength(1);
    expect(hours[0].dayOfWeek).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]);
    expect([hours[0].opens, hours[0].closes]).toEqual(["11:00", "17:00"]);
    expect(hours.flatMap((h) => h.dayOfWeek)).not.toContain("Saturday");
    expect(hours.flatMap((h) => h.dayOfWeek)).not.toContain("Sunday");
  });

  it("niesie NIP i zasięg; BEZ sameAs (firma nie ma profili social)", () => {
    expect(business.vatID).toBe("PL8951815332");
    expect(business.areaServed).toMatchObject({
      "@type": "City",
      name: "Poznań",
    });
    expect(business).not.toHaveProperty("sameAs");
  });
});

describe("webSite()", () => {
  const graph = site["@graph"] as Record<string, unknown>[];
  const node = (type: string) => graph.find((n) => n["@type"] === type)!;

  it("emituje DWA węzły najwyższego poziomu: WebSite i Organization", () => {
    // Zagnieżdżona Organization nie jest wykrywana przez Rich Results Test
    // na „/" — stąd @graph. Nie zwijaj tego z powrotem do publisher-obiektu.
    expect(graph).toHaveLength(2);
    expect(node("WebSite")).toBeTruthy();
    expect(node("Organization")).toBeTruthy();
  });

  it("WebSite wskazuje wydawcę SAMĄ referencją @id (bez duplikatu danych)", () => {
    const website = node("WebSite");
    expect(website.inLanguage).toBe("pl-PL");
    expect(website.publisher).toEqual({ "@id": business["@id"] });
  });

  it("Organization niesie logo i ten sam @id co węzeł firmy z /kontakt/", () => {
    const org = node("Organization");
    expect(org["@id"]).toBe(business["@id"]);
    expect(org.logo).toMatchObject({ "@type": "ImageObject" });
    expect(String((org.logo as { url: string }).url)).toContain(
      "/og-image.png",
    );
    expect(org.url).toBe(business.url);
    expect(org).not.toHaveProperty("sameAs");
  });

  it("NIE deklaruje SearchAction (wyszukiwarka nie ma endpointu)", () => {
    expect(JSON.stringify(site)).not.toContain("SearchAction");
  });
});

describe("realEstateListing()", () => {
  it("RealEstateListing z @id oferty, nazwą, opisem, datą i identyfikatorem", () => {
    expect(listing["@type"]).toBe("RealEstateListing");
    expect(listing["@id"]).toBe(`${SITE}${PATH}#oferta`);
    expect(listing.url).toBe(`${SITE}${PATH}`);
    expect(listing.name).toBe(offerBase.title.trim() || offerBase.typeName);
    expect(listing.description).toBe(EXTRAS.description);
    expect(listing.datePosted).toBe(offerBase.addedAt);
    expect(listing.identifier).toBe(offerBase.number);
    expect(listing.image).toEqual(EXTRAS.images);
    expect(listing.provider).toEqual({ "@id": business["@id"] });
  });

  it("adres do ULICY: bez numeru budynku i lokalu, bez geo", () => {
    const withStreet = realEstateListing(
      SITE,
      makeOffer({
        location: {
          ...offerBase.location,
          street: "Milczańska",
          streetType: "ul.",
        },
      }),
      PATH,
      EXTRAS,
    );
    const addr = withStreet.address as Record<string, string>;
    expect(addr["@type"]).toBe("PostalAddress");
    expect(addr.streetAddress).toBe("ul. Milczańska");
    expect(addr.streetAddress).not.toMatch(/\d/);
    expect(addr.addressLocality).toBe(offerBase.location.city);
    expect(addr.addressCountry).toBe("PL");
    expect(withStreet).not.toHaveProperty("geo");
    const noStreet = realEstateListing(
      SITE,
      makeOffer({
        location: {
          ...offerBase.location,
          street: undefined,
          streetType: undefined,
        },
      }),
      PATH,
      EXTRAS,
    );
    expect(noStreet.address).not.toHaveProperty("streetAddress");
  });

  it("cena jako Offer; przy „Zapytaj o cenę” węzeł ceny znika", () => {
    const priced = realEstateListing(
      SITE,
      makeOffer({ price: 649000, currency: "PLN" }),
      PATH,
      EXTRAS,
    );
    expect(priced.offers).toMatchObject({
      "@type": "Offer",
      price: 649000,
      priceCurrency: "PLN",
    });
    const ask = realEstateListing(
      SITE,
      makeOffer({ price: null }),
      PATH,
      EXTRAS,
    );
    expect(ask).not.toHaveProperty("offers");
    expect(JSON.stringify(ask)).not.toContain('"price"');
  });

  it("powierzchnia w m² (MTK) i pokoje tylko gdy są", () => {
    expect(listing.floorSize).toEqual({
      "@type": "QuantitativeValue",
      value: offerBase.area,
      unitCode: "MTK",
    });
    const noRooms = realEstateListing(
      SITE,
      makeOffer({ rooms: undefined }),
      PATH,
      EXTRAS,
    );
    expect(noRooms).not.toHaveProperty("numberOfRooms");
    const rooms = realEstateListing(
      SITE,
      makeOffer({ rooms: 3 }),
      PATH,
      EXTRAS,
    );
    expect(rooms.numberOfRooms).toBe(3);
  });

  it("bez zdjęć → bez pola image", () => {
    const none = realEstateListing(SITE, offerBase, PATH, {
      ...EXTRAS,
      images: [],
    });
    expect(none).not.toHaveProperty("image");
  });
});

describe("spójność z resztą strony", () => {
  it("stopka nie linkuje do mediów społecznościowych", () => {
    const footer = readFileSync("src/components/Footer.astro", "utf8");
    expect(footer).not.toMatch(/instagram\.com|facebook\.com/);
  });

  it("stopka bierze dane firmy z BUSINESS, nie z własnych literałów", () => {
    // Jedno źródło danych rejestrowych: NIP i REGON w stopce pochodzą
    // z tego samego obiektu co JSON-LD, więc nie mogą się rozjechać.
    const footer = readFileSync("src/components/Footer.astro", "utf8");
    expect(footer).toContain("BUSINESS.vatID");
    expect(footer).toContain("BUSINESS.regon");
    expect(footer).toContain("BUSINESS.legalName");
    expect(footer).not.toMatch(/\d{9,10}/);
    expect(BUSINESS.vatID).toMatch(/^PL\d{10}$/);
    expect(BUSINESS.regon).toMatch(/^\d{9}$/);
  });
});
