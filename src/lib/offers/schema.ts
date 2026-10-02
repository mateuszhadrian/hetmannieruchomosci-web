// Schemat oferty na stronie (`data/offers.json` = tablica `Offer`). Tryb
// strict: klucz spoza schematu wywraca walidację, a więc build. Źródło
// nadrzędne: docs/kb part3 §1.4 (dokument lokalny). Dwa warianty:
//  - `OfferSchema` — pełny, po kroku zdjęć syncu (r2Key, etag, wymiary);
//  - `NormalizedOfferSchema` — wynik `normalize()` (2.2): zdjęcia znają
//    tylko id, adres źródłowy, rodzaj i alt. Pola zdjęć dochodzą w 2.5.
import { z } from "zod";

// Słowniki wartości i ich typy żyją w `enums.ts` (moduł BEZ zoda), bo
// trafiają do przeglądarki razem z wyspą wyszukiwarki (4.2 b: import
// stąd wciągałby cały zod do bundla). Tu re-eksport dla dotychczasowych
// konsumentów.
import {
  CURRENCIES,
  EXPOSURES,
  EXTRA_KEYS,
  FURNISHED,
  MAIN_TYPES,
  MARKETS,
  METERS,
  OFFER_STATUSES,
  PHOTO_KINDS,
  STREET_TYPES,
  TRANSACTIONS,
} from "./enums";

export {
  CURRENCIES,
  EXPOSURES,
  EXTRA_KEYS,
  FURNISHED,
  MAIN_TYPES,
  MARKETS,
  METERS,
  OFFER_STATUSES,
  PHOTO_KINDS,
  STREET_TYPES,
  TRANSACTIONS,
};
import type { ExtraKey } from "./enums";
export type {
  ExtraKey,
  Furnished,
  MainType,
  Market,
  OfferStatus,
  PhotoKind,
  Transaction,
} from "./enums";

/** Data-czas ISO 8601 z offsetem (`2026-07-30T11:01:42+02:00`). */
const isoDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
/** Sama data (`YYYY-MM-DD`). */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nonNegInt = z.number().int().nonnegative();
const positive = z.number().positive();

/** Zdjęcie po normalizacji (2.2) — bez danych z pobrania. */
export const PhotoDraftSchema = z.strictObject({
  /** id zdjęcia w CRM (z nazwy pliku) */
  id: z.number().int().positive(),
  /** adres oryginału `_max` na hoście CRM */
  sourceUrl: z.url(),
  /** picturesTypes: '119' → photo, '120' → plan */
  kind: z.enum(PHOTO_KINDS),
  /** `${title} – zdjęcie N` (CRM nie ma podpisów) */
  alt: z.string().min(1),
});

/** Zdjęcie pełne (po kroku 2.5 syncu). */
export const OfferPhotoSchema = PhotoDraftSchema.extend({
  /** offers/{crmId}/{id}-{sha256[:8]}.jpg (wzorzec: `PHOTO_R2_KEY` niżej) */
  r2Key: z.string().regex(/^offers\/\d+\/\d+-[0-9a-f]{8}\.jpg$/),
  etag: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const OfferLocationSchema = z.strictObject({
  province: z.string().min(1),
  county: z.string().min(1),
  commune: z.string().min(1),
  city: z.string().min(1),
  parentDistrict: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  /** `locationPlaceName.trim()` ('Poznań Winogrady') */
  placeName: z.string().min(1),
  street: z.string().min(1).optional(),
  streetType: z.enum(STREET_TYPES).optional(),
  /** segment adresu ('poznan-winogrady'); kolizje → sufiks `-2` */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const offerShape = {
  crmId: z.number().int().positive(),
  /** numer z CRM (NIE numberExport), np. 'SW486462' */
  number: z.string().regex(/^[A-Z]+\d+$/),
  /** id oferty w poprzednim serwisie — tylko do mapy 301 */
  legacyId: z.number().int().positive().optional(),
  /** część adresu (D31): `number.toLowerCase()` */
  slug: z.string().regex(/^[a-z]+\d+$/),

  mainType: z.enum(MAIN_TYPES),
  typeName: z.string().min(1),
  subTypeId: z.number().int().optional(),
  subType: z.string().min(1).optional(),
  transaction: z.enum(TRANSACTIONS),
  market: z.enum(MARKETS),

  status: z.enum(OFFER_STATUSES),
  statusSource: z.literal("title"),
  badges: z.array(z.string().min(1)),
  crmStatus: z.number().int(),
  labels: z.strictObject({
    sold: z.number().int(),
    reserved: z.number().int(),
    new: z.number().int().nullable(),
  }),

  title: z.string(),
  rawTitle: z.string(),
  descriptionHtml: z.string(),
  tags: z.array(z.string().min(1)),

  addedAt: isoDateTime,
  activatedAt: isoDateTime.optional(),
  updatedAt: isoDateTime,
  availableFrom: isoDate.optional(),
  availableNote: z.string().min(1).optional(),

  price: positive.nullable(),
  currency: z.enum(CURRENCIES),
  pricePerM2: positive.nullable(),
  previousPrice: positive.optional(),
  lowestPrice30d: positive.optional(),
  rent: positive.optional(),
  charges: positive.optional(),
  deposit: positive.optional(),

  area: positive,
  usableArea: positive.optional(),
  plotArea: positive.optional(),

  rooms: nonNegInt.optional(),
  bathrooms: nonNegInt.optional(),
  bedrooms: nonNegInt.optional(),
  toilets: nonNegInt.optional(),
  levels: nonNegInt.optional(),
  /** 0 = parter, ujemne = suterena — wartość, nie brak */
  floor: z.number().int().optional(),
  floorsInBuilding: nonNegInt.optional(),
  buildingYear: z.number().int().optional(),
  /** liczba wind; undefined = brak danych, nie „brak windy" */
  elevators: nonNegInt.optional(),
  furnished: z.enum(FURNISHED).optional(),
  kitchen: z.string().min(1).optional(),
  brightKitchen: z.boolean().optional(),
  windows: z.number().int().optional(),
  bathroomType: z.number().int().optional(),
  equipment: z.array(z.string().min(1)).optional(),
  ownership: z.string().min(1).optional(),
  condition: z.string().min(1).optional(),
  heating: z.string().min(1).optional(),
  material: z.string().min(1).optional(),
  exposure: z.array(z.enum(EXPOSURES)).optional(),
  meters: z.array(z.enum(METERS)).optional(),
  energy: z
    .strictObject({
      usable: z.number().optional(),
      final: z.number().optional(),
      primary: z.number().optional(),
      co2: z.number().optional(),
      renewable: z.number().optional(),
    })
    .optional(),

  /** liczniki przynależności (0 = brak) */
  extras: z.strictObject(
    Object.fromEntries(EXTRA_KEYS.map((k) => [k, nonNegInt])) as Record<
      ExtraKey,
      typeof nonNegInt
    >,
  ),
  security: z.array(z.string().min(1)),
  media: z.array(z.string().min(1)),
  surroundings: z.array(z.string().min(1)),
  plot: z
    .strictObject({
      fencing: z.string().min(1).optional(),
      road: z.string().min(1).optional(),
      building: z.string().min(1).optional(),
      ownership: z.string().min(1).optional(),
      shape: z.number().int().optional(),
      width: positive.optional(),
      height: positive.optional(),
    })
    .optional(),
  commercial: z
    .strictObject({
      alternativeTypes: z.array(z.string().min(1)).optional(),
      shopWindow: z.boolean().optional(),
    })
    .optional(),

  location: OfferLocationSchema,
  photos: z.array(OfferPhotoSchema),
  /** 11 znaków z YouTube */
  videoId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{11}$/)
    .optional(),
  tourUrl: z.url().optional(),

  /** stała konfiguracyjna — API nie daje opiekuna */
  agent: z.literal("joanna"),
};

export const OfferSchema = z.strictObject(offerShape);
export const OffersFileSchema = z.array(OfferSchema);

/** Wynik `normalize()` — jak `Offer`, ale zdjęcia bez danych z pobrania. */
export const NormalizedOfferSchema = z.strictObject({
  ...offerShape,
  photos: z.array(PhotoDraftSchema),
});

export type Offer = z.infer<typeof OfferSchema>;
export type OfferPhoto = z.infer<typeof OfferPhotoSchema>;
export type PhotoDraft = z.infer<typeof PhotoDraftSchema>;
export type OfferLocation = z.infer<typeof OfferLocationSchema>;
export type NormalizedOffer = z.infer<typeof NormalizedOfferSchema>;

// ── Manifest zdjęć (`data/photos.json`, part3 §3.4 z odstępstwem) ───────
/** sha256 treści w hex */
const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/);
/** Klucz R2 zdjęcia: offers/{crmId}/{photoId}-{sha256[:8]}.jpg */
export const PHOTO_R2_KEY = /^offers\/\d+\/\d+-[0-9a-f]{8}\.jpg$/;

/** Wpis manifestu per adres źródłowy zdjęcia. Bez `seenAt` — jedyna data
 *  to `goneSince`: od kiedy zdjęcia nie ma w widocznych ofertach (po 30
 *  dniach obiekt w R2 jest kasowany). */
export const PhotoManifestEntrySchema = z.strictObject({
  etag: z.string().min(1),
  bytes: nonNegInt,
  sha256: sha256Hex,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  r2Key: z.string().regex(PHOTO_R2_KEY),
  goneSince: isoDate.optional(),
  /** poprzednie klucze tego zdjęcia (zmiana treści = nowy klucz); stary
   *  obiekt żyje jeszcze 30 dni, bo cache wariantów może go wskazywać */
  replaced: z
    .array(
      z.strictObject({
        r2Key: z.string().regex(PHOTO_R2_KEY),
        goneSince: isoDate,
      }),
    )
    .optional(),
});
export const PhotosFileSchema = z.record(z.url(), PhotoManifestEntrySchema);
export type PhotoManifestEntry = z.infer<typeof PhotoManifestEntrySchema>;
export type PhotoManifest = z.infer<typeof PhotosFileSchema>;

// ── Manifest map (`data/maps.json`, D36) ────────────────────────────────
/** Klucz R2 mapy: maps/{hash}.webp (hash z klucza współrzędnych i trybu
 *  znacznika) */
export const MAP_R2_KEY = /^maps\/[0-9a-f]{16}\.webp$/;
/** Klucz współrzędnych `lat,lon` z pięcioma miejscami (`coordKey()`). */
export const COORD_KEY = /^-?\d{1,2}\.\d{5},-?\d{1,3}\.\d{5}$/;

export const MapEntrySchema = z.strictObject({
  r2Key: z.string().regex(MAP_R2_KEY),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  goneSince: isoDate.optional(),
});
export const MapsFileSchema = z.record(
  z.string().regex(COORD_KEY),
  MapEntrySchema,
);
export type MapEntry = z.infer<typeof MapEntrySchema>;
export type MapManifest = z.infer<typeof MapsFileSchema>;

// ── Drzewo lokalizacji (`data/locations.json`, part3 §4.2) ──────────────
export const LOCATION_LEVELS = [
  "province",
  "county",
  "commune",
  "city",
  "district",
  "subdistrict",
] as const;
export type LocationLevel = (typeof LOCATION_LEVELS)[number];

export const LocationNodeSchema = z.strictObject({
  /** ścieżka slugów: `wielkopolskie/poznan/poznan/stare-miasto/winogrady` */
  id: z.string().min(1),
  level: z.enum(LOCATION_LEVELS),
  name: z.string().min(1),
  /** etykieta do podpowiedzi ('Poznań Winogrady', 'Baranowo') */
  label: z.string().min(1).optional(),
  /** doprecyzowanie poza Poznaniem ('gm. Tarnowo Podgórne, pow. poznański') */
  info: z.string().min(1).optional(),
  parent: z.string().min(1).nullable(),
  /** gminy miasta (Poznań: dawne dzielnice administracyjne) */
  communes: z.array(z.string().min(1)).optional(),
  count: nonNegInt,
});

export const LocationStreetSchema = z.strictObject({
  name: z.string().min(1),
  type: z.enum(STREET_TYPES),
  count: z.number().int().positive(),
});

export const LocationsFileSchema = z.strictObject({
  nodes: z.array(LocationNodeSchema),
  /** id najniższego węzła → ulice */
  streets: z.record(z.string(), z.array(LocationStreetSchema)),
});

export type LocationNode = z.infer<typeof LocationNodeSchema>;
export type LocationStreet = z.infer<typeof LocationStreetSchema>;
export type LocationsFile = z.infer<typeof LocationsFileSchema>;

// ── Rejestr adresów (`data/url-ledger.json`, D31) ───────────────────────
/** numer oferty → wszystkie ścieżki kiedykolwiek opublikowane (rosnąco
 *  w czasie; ostatnia = najświeższa znana). Rejestr tylko dopisuje. */
export const UrlLedgerSchema = z.record(
  z.string().regex(/^[A-Z]+\d+$/),
  z.array(z.string().startsWith("/oferty/")).min(1),
);
export type UrlLedger = z.infer<typeof UrlLedgerSchema>;

// ── Dawne adresy (`data/legacy-redirects.json`, D11) ────────────────────
/** numer oferty → id w poprzednim serwisie i jego ścieżki. */
export const LegacyRedirectsSchema = z.record(
  z.string().regex(/^[A-Z]+\d+$/),
  z.strictObject({
    legacyId: z.number().int().positive(),
    paths: z.array(z.string().startsWith("/")).min(1),
  }),
);
export type LegacyRedirects = z.infer<typeof LegacyRedirectsSchema>;
