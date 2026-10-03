// Dane strukturalne schema.org — JEDYNE źródło danych firmy dla JSON-LD.
// STAN Etapu 0: dane firmy wpisane, węzły NIERENDEROWANE. Wpięcie w strony
// (`/kontakt/` i `/`), ostateczny typ węzła i walidacja w
// validator.schema.org — Etap 6. Węzeł per oferta powstaje z detalem
// oferty (Etap 4).
// Strona główna dostaje @graph z WebSite + SAMODZIELNĄ Organization —
// nie zagnieżdżaj jej z powrotem w publisher (zagnieżdżona nie jest
// wykrywana przez narzędzia walidujące).
//
// KONTRAKT ANTYSCRAPINGOWY: ten moduł CELOWO nie zna telefonu ani e-maili
// i nie wolno mu ich poznać. Fragmenty numeru/adresów żyją wyłącznie
// w src/lib/contact-details.ts i są składane w JS po załadowaniu strony;
// JSON-LD renderuje się statycznie do dist/, więc pole `telephone` czy
// `email` wpisałoby pełny ciąg wprost do źródła.
// Pilnuje tego test unit (tests/unit/jsonld.test.ts).
//
// Firma nie prowadzi profili w mediach społecznościowych — węzły nie mają
// `sameAs`.
//
// Węzeł per oferta (4.3): `realEstateListing()` — adres do ULICY (bez
// numeru; pól numeru budynku/lokalu nie ma w danych), bez `geo`, cena
// pominięta przy „Zapytaj o cenę"; obrazy i opis podaje wołający (moduł
// nie zna hosta mediów ani parsera HTML).
import type { Offer } from "./offers/schema";

/** Dane firmy — wspólne dla wszystkich węzłów. Adres (`street`…) = biuro,
 *  w którym firma przyjmuje klientów; `seat*` = siedziba wg rejestru
 *  (adres do doręczeń) — drukowana w stopce i polityce, NIE w węzłach
 *  JSON-LD (adres `RealEstateAgent` to biuro). */
export const BUSINESS = {
  name: "HETMAN Nieruchomości",
  legalName: "HETMAN Nieruchomości Joanna Hetman",
  description:
    "Biuro nieruchomości w Poznaniu: sprzedaż, wynajem i zakup mieszkań, " +
    "domów, działek i lokali — z obsługą dokumentów.",
  street: "Os. Pod Lipami 104 lok. I/J",
  postalCode: "61-638",
  locality: "Poznań",
  country: "PL",
  seatStreet: "ul. Andrzeja Struga 5/10",
  seatPostalCode: "50-228",
  seatLocality: "Wrocław",
  vatID: "PL8951815332",
  /** REGON — drukowany w stopce; schema.org nie ma dla niego pola. */
  regon: "020518566",
  areaServed: "Poznań",
  /** Współrzędne biura. schema.org oczekuje liczb, nie ciągów. */
  latitude: 52.4298714,
  longitude: 16.9414254,
} as const;

/** Godziny biura pn.–pt. 11:00–17:00. Weekend nieobecny = zamknięte
 *  (schema.org czyta brak wpisu tak samo jak jawne zero godzin). */
const OPENING_HOURS = [
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "11:00",
    closes: "17:00",
  },
] as const;

const abs = (site: string | URL, path: string) =>
  new URL(path, typeof site === "string" ? site : site.href).href;

/** Węzeł firmy dla /kontakt/ — `RealEstateAgent` to podtyp
 *  `LocalBusiness` dla pośrednictwa w obrocie nieruchomościami. */
export function localBusiness(site: string | URL): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": abs(site, "/#firma"),
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    description: BUSINESS.description,
    url: abs(site, "/"),
    image: abs(site, "/og-image.png"),
    logo: abs(site, "/og-image.png"),
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      postalCode: BUSINESS.postalCode,
      addressLocality: BUSINESS.locality,
      addressCountry: BUSINESS.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    openingHoursSpecification: OPENING_HOURS.map((slot) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...slot.days],
      opens: slot.opens,
      closes: slot.closes,
    })),
    areaServed: { "@type": "City", name: BUSINESS.areaServed },
    vatID: BUSINESS.vatID,
  };
}

/** Strona główna: DWA węzły najwyższego poziomu w `@graph` — `WebSite`
 *  i `Organization`; `publisher` zostaje czystą referencją `@id`.
 *
 *  BEZ `SearchAction` — wyszukiwarka ofert działa w przeglądarce na
 *  indeksie JSON, nie ma endpointu zapytań, który można by zadeklarować. */
export function webSite(site: string | URL): Record<string, unknown> {
  const organizationId = abs(site, "/#firma");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": abs(site, "/#strona"),
        url: abs(site, "/"),
        name: BUSINESS.name,
        inLanguage: "pl-PL",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: BUSINESS.name,
        legalName: BUSINESS.legalName,
        description: BUSINESS.description,
        url: abs(site, "/"),
        logo: { "@type": "ImageObject", url: abs(site, "/og-image.png") },
        image: abs(site, "/og-image.png"),
      },
    ],
  };
}

export interface ListingExtras {
  /** opis bez HTML, ucięty na granicy zdania (`detail-meta.ts`) */
  description: string;
  /** absolutne adresy zdjęć w wariancie `hero` (kilka pierwszych) */
  images: readonly string[];
}

/** Detal oferty: `RealEstateListing` z `Offer` jako ofertą handlową.
 *  `provider` to referencja `@id` węzła firmy (bez duplikatu danych). */
export function realEstateListing(
  site: string | URL,
  offer: Offer,
  path: string,
  extras: ListingExtras,
): Record<string, unknown> {
  const url = abs(site, path);
  const loc = offer.location;
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${url}#oferta`,
    name: offer.title.trim() || offer.typeName,
    url,
    description: extras.description,
    datePosted: offer.addedAt,
    identifier: offer.number,
    address: {
      "@type": "PostalAddress",
      ...(loc.street
        ? { streetAddress: `${loc.streetType ?? "ul."} ${loc.street}` }
        : {}),
      addressLocality: loc.city,
      addressRegion: loc.province,
      addressCountry: "PL",
    },
    floorSize: {
      "@type": "QuantitativeValue",
      value: offer.area,
      unitCode: "MTK",
    },
    provider: { "@id": abs(site, "/#firma") },
  };
  if (extras.images.length) node.image = [...extras.images];
  if (offer.rooms) node.numberOfRooms = offer.rooms;
  if (offer.price !== null) {
    node.offers = {
      "@type": "Offer",
      price: offer.price,
      priceCurrency: offer.currency,
      url,
    };
  }
  return node;
}
