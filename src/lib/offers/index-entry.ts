// Indeks wyszukiwarki (D30, part2 §9, part3 §7.2): `/oferty/index.json`
// = pola filtrów + dane karty, BEZ opisu; opis osobno
// w `/oferty/index-text.json` (ładowany dopiero przy „szukaj w opisie").
// Wpis indeksu jest też JEDYNYM wejściem karty oferty (`OfferCard.tsx`)
// — SSG buduje go z `Offer`, wyspa czyta z pliku; jeden kształt = jeden
// szablon karty.
//
// Allow-lista `INDEX_FIELDS` jest kontraktem testowym: klucz spoza listy
// w wyjściu = czerwony test (`tests/unit/offers-index.test.ts`); nazwy
// z `FORBIDDEN_FIELDS` nie mogą się tu pojawić (skan `test:dist`
// obejmuje `dist/**/*.json`).
import { DomUtils, parseDocument } from "htmlparser2";
import { leafId } from "./location-path";
import type {
  Furnished,
  LocationsFile,
  MainType,
  Market,
  Offer,
  OfferStatus,
  Transaction,
} from "./schema";
import { normalizeText } from "./text";
import { offerPath } from "./urls";

export const INDEX_FIELDS = [
  "number",
  "path",
  "title",
  "typeName",
  "mainType",
  "transaction",
  "market",
  "status",
  "badges",
  "addedAt",
  "activatedAt",
  "price",
  "pricePerM2",
  "previousPrice",
  "currency",
  "area",
  "plotArea",
  "rooms",
  "floor",
  "floorsInBuilding",
  "buildingYear",
  "elevators",
  "furnished",
  "location",
  "photo",
  "photosCount",
  "hasVideo",
  "hasTour",
  "hasPlan",
] as const;

export const INDEX_LOCATION_FIELDS = [
  "city",
  "district",
  "street",
  "streetType",
  "placeName",
  "slug",
  "nodeId",
] as const;

export const INDEX_PHOTO_FIELDS = ["r2Key", "width", "height", "alt"] as const;

export interface IndexLocation {
  city: string;
  district?: string;
  street?: string;
  streetType?: string;
  /** „Poznań Winogrady" — etykieta w podpowiedziach i nagłówku listy */
  placeName: string;
  /** segment adresu listy (`poznan-winogrady`) */
  slug: string;
  /** id najniższego węzła drzewa lokalizacji (filtr prefiksowy) */
  nodeId: string;
}

export interface IndexPhoto {
  r2Key: string;
  width: number;
  height: number;
  alt: string;
}

export interface OfferIndexEntry {
  number: string;
  /** adres detalu */
  path: string;
  title: string;
  typeName: string;
  mainType: MainType;
  transaction: Transaction;
  market: Market;
  status: OfferStatus;
  badges: string[];
  addedAt: string;
  activatedAt?: string;
  price: number | null;
  pricePerM2: number | null;
  previousPrice?: number;
  currency: string;
  area: number;
  plotArea?: number;
  rooms?: number;
  /** 0 = parter — wartość, nie brak */
  floor?: number;
  floorsInBuilding?: number;
  buildingYear?: number;
  /** liczba wind; brak pola = brak danych (nie „bez windy") */
  elevators?: number;
  furnished?: Furnished;
  location: IndexLocation;
  /** zdjęcie główne; brak = oferta bez zdjęć */
  photo?: IndexPhoto;
  photosCount: number;
  hasVideo: boolean;
  hasTour: boolean;
  hasPlan: boolean;
}

export interface OffersIndex {
  offers: OfferIndexEntry[];
  /** drzewo lokalizacji (autocomplete i liczniki offline) */
  locations: LocationsFile;
}

/** Klucze o wartości `undefined` wypadają (JSON i tak by je pominął —
 *  tu po to, by porównania w testach i w wyspie były jednoznaczne). */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export function toIndexEntry(offer: Offer): OfferIndexEntry {
  const first = offer.photos[0];
  return compact({
    number: offer.number,
    path: offerPath(offer),
    title: offer.title,
    typeName: offer.typeName,
    mainType: offer.mainType,
    transaction: offer.transaction,
    market: offer.market,
    status: offer.status,
    badges: offer.badges,
    addedAt: offer.addedAt,
    activatedAt: offer.activatedAt,
    price: offer.price,
    pricePerM2: offer.pricePerM2,
    previousPrice: offer.previousPrice,
    currency: offer.currency,
    area: offer.area,
    plotArea: offer.plotArea,
    rooms: offer.rooms,
    floor: offer.floor,
    floorsInBuilding: offer.floorsInBuilding,
    buildingYear: offer.buildingYear,
    elevators: offer.elevators,
    furnished: offer.furnished,
    location: compact({
      city: offer.location.city,
      district: offer.location.district,
      street: offer.location.street,
      streetType: offer.location.streetType,
      placeName: offer.location.placeName,
      slug: offer.location.slug,
      nodeId: leafId(offer.location),
    }),
    photo: first
      ? {
          r2Key: first.r2Key,
          width: first.width,
          height: first.height,
          alt: first.alt,
        }
      : undefined,
    photosCount: offer.photos.length,
    hasVideo: offer.videoId !== undefined,
    hasTour: offer.tourUrl !== undefined,
    hasPlan: offer.photos.some((p) => p.kind === "plan"),
  });
}

/** Tekst do „szukaj w opisie": tytuł + opis bez HTML, znormalizowany
 *  (`normalizeText`). Szukanie obejmuje tytuł — świadoma poprawka
 *  względem obecnej strony (part2 §9). */
export function toIndexText(offer: Offer): string {
  const description = DomUtils.textContent(
    parseDocument(offer.descriptionHtml),
  );
  return normalizeText(`${offer.title} ${description}`);
}

export function buildIndex(data: {
  offers: readonly Offer[];
  locations: LocationsFile;
}): OffersIndex {
  return {
    offers: data.offers.map(toIndexEntry),
    locations: data.locations,
  };
}

export function buildIndexText(
  offers: readonly Offer[],
): Record<string, string> {
  return Object.fromEntries(offers.map((o) => [o.number, toIndexText(o)]));
}
