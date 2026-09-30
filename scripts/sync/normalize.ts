// Normalizacja surowego rekordu API → oferta robocza (`NormalizedOffer`).
// Kolejność: allow-lista → rzutowanie typów → słownik → sanityzacja →
// walidacja Zod. Surowy rekord istnieje wyłącznie w pamięci; do wyniku
// trafiają tylko pola z `PUBLIC_FIELDS`, do ostrzeżeń — kody, numer
// oferty (raport prywatny) i nic z pól kontrolnych.
// Mapowanie: docs/kb part3 §1.4 (dokument lokalny).
import {
  pickControl,
  pickPublic,
  type PublicRecord,
  type RawRecord,
} from "../../src/lib/offers/public-fields";
import {
  NormalizedOfferSchema,
  type ExtraKey,
  type Furnished,
  type MainType,
  type Market,
  type NormalizedOffer,
  type OfferLocation,
  type PhotoDraft,
  type Transaction,
} from "../../src/lib/offers/schema";
import { parseTitle } from "../../src/lib/offers/status";
import { slugify } from "../../src/lib/offers/slug";
import { AGENT } from "../../src/lib/site-config";
import { toIsoDate, toIsoWarsaw } from "./dates";
import { lookup, type Dictionary, type DictionaryGroup } from "./dictionary";
import { sameDescription, sanitizeDescription } from "./sanitize";
import { warning, type SyncWarning } from "./warnings";

export interface NormalizeOptions {
  dictionary: Dictionary;
  /** Sygnały kontrolne do ostrzeżeń W1/W2 (part3 §2.2). Wartość id umowy
   *  „zgłoszenie klienta" NIE jest wpisana w repo (reguła 4) — podaje ją
   *  konfiguracja syncu; brak = ostrzeżenia W1/W2 nie są liczone. */
  agreementSignalId?: number;
}

export interface NormalizeResult {
  offer: NormalizedOffer;
  warnings: SyncWarning[];
}

/** Błąd danych, którego nie da się znormalizować (brak pola kluczowego).
 *  `message` nie zawiera numeru oferty — ten jest w `number`. */
export class NormalizeError extends Error {
  constructor(
    public readonly field: string,
    public readonly number: string | undefined,
    reason: string,
  ) {
    super(`normalize: pole ${field} — ${reason}`);
    this.name = "NormalizeError";
  }
}

// ── mapy wartości ───────────────────────────────────────────────────────
const MAIN_TYPE: Record<number, MainType> = {
  1: "dom",
  2: "mieszkanie",
  3: "dzialka",
  4: "komercyjny",
};
const TRANSACTION: Record<number, Transaction> = {
  131: "sprzedaz",
  132: "wynajem",
};
const MARKET: Record<number, Market> = { 10: "pierwotny", 11: "wtorny" };
const CURRENCY: Record<number, "PLN" | "EUR" | "USD"> = {
  1: "EUR",
  2: "PLN",
  3: "USD",
};
const FURNISHED: Record<number, Furnished> = {
  150: "tak",
  151: "nie",
  152: "moze",
  153: "czesciowo",
};
/** słownik `custom`: 154 = Tak, 155 = Nie */
const YES = 154;
const NO = 155;
/** znaczniki „nieoznaczona" (part3 §2.2) */
const LABEL_SOLD_UNSET = 55;
const LABEL_RESERVED_UNSET = 57;
const PHOTO_PLAN_TYPE = "120";

const EXTRAS: Record<ExtraKey, string> = {
  balcony: "additionalBalcony",
  loggia: "additionalLoggia",
  terrace: "additionalTerrace",
  basement: "additionalBasement",
  attic: "additionalAttic",
  storage: "additionalStorage",
  parking: "additionalParking",
  parkingUnderground: "additionalParkingunderground",
  garage: "additionalGarage",
  garden: "additionalGarden",
  entresol: "additionalEntresol",
};

const SURROUNDING_PREFIXES = [
  "neighborhood",
  "communication",
  "recreation",
  "locationtype",
];

const YOUTUBE_ID = /(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/;

// ── rzutowania ──────────────────────────────────────────────────────────
function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function int(v: unknown): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.trunc(n);
}

function positive(v: unknown): number | undefined {
  const n = num(v);
  return n !== undefined && n > 0 ? n : undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s === "" ? undefined : s;
}

function isOn(v: unknown): boolean {
  return int(v) === 1;
}

function csvIds(v: unknown): number[] {
  const s = str(v);
  if (!s) return [];
  return s
    .split(",")
    .map((x) => int(x))
    .filter((x): x is number => x !== undefined);
}

/** „WIELKOPOLSKIE" → „Wielkopolskie" (tylko gdy całość wielkimi). */
function titleCaseIfUpper(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`,
    );
}

/** Klucze z prefiksem o wartości 1 → nazwy bez prefiksu
 *  (`securityIntercom` → `intercom`, `securitySmokeDetector` → `smokeDetector`). */
function flags(rec: PublicRecord, prefix: string): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(rec)) {
    if (key.startsWith(prefix) && key.length > prefix.length && isOn(value)) {
      const rest = key.slice(prefix.length);
      out.push(rest[0].toLowerCase() + rest.slice(1));
    }
  }
  return out.sort();
}

function omitUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

function hasAny(obj: object): boolean {
  return Object.values(obj).some((v) => v !== undefined);
}

// ── normalizacja ────────────────────────────────────────────────────────
export function normalize(
  raw: RawRecord,
  options: NormalizeOptions,
): NormalizeResult {
  const { dictionary } = options;
  const rec = pickPublic(raw);
  const control = pickControl(raw);
  const warnings: SyncWarning[] = [];
  const number = str(rec.number);

  const require = <T>(value: T | undefined, field: string): T => {
    if (value === undefined) {
      throw new NormalizeError(field, number, "brak wartości");
    }
    return value;
  };
  const dict = (
    group: DictionaryGroup,
    id: number | undefined,
    field: string,
  ): string | undefined => {
    if (id === undefined) return undefined;
    const label = lookup(dictionary, group, id);
    if (label === undefined) {
      warnings.push(warning("DICT_MISS", number, `${field}=${id}`));
    }
    return label;
  };

  const crmId = require(int(rec.id), "id");
  const numberValue = require(number, "number");
  const mainTypeId = require(int(rec.mainTypeId), "mainTypeId");
  const mainType = MAIN_TYPE[mainTypeId];
  if (!mainType) {
    throw new NormalizeError("mainTypeId", number, "nieznana wartość");
  }
  const transactionId = require(int(rec.transaction), "transaction");
  const transaction = TRANSACTION[transactionId];
  if (!transaction) {
    throw new NormalizeError("transaction", number, "nieznana wartość");
  }
  const marketId = require(int(rec.market), "market");
  const market = MARKET[marketId];
  if (!market) throw new NormalizeError("market", number, "nieznana wartość");

  // ── tytuł i status (D38; part3 §5.1: prefiks z portalTitle, tekst
  //    z portalWwwTitle, gdy istnieje)
  const rawTitle = str(rec.portalTitle) ?? "";
  const parsed = parseTitle(rawTitle, transaction);
  const wwwTitle = str(rec.portalWwwTitle);
  let title = parsed.title;
  const badges = [...parsed.badges];
  if (wwwTitle) {
    const parsedWww = parseTitle(wwwTitle, transaction);
    title = parsedWww.title;
    for (const b of parsedWww.badges) if (!badges.includes(b)) badges.push(b);
  }
  if (parsed.unknownPrefix) {
    warnings.push(warning("W5", number, parsed.unknownPrefix));
  }
  if (options.agreementSignalId !== undefined) {
    const agreement = int(control.agreementType);
    if (parsed.matchedPrefix && agreement !== options.agreementSignalId) {
      warnings.push(warning("W1", number));
    }
    if (!parsed.matchedPrefix && agreement === options.agreementSignalId) {
      warnings.push(warning("W2", number));
    }
  }

  const labelSold = int(rec.labelSold) ?? LABEL_SOLD_UNSET;
  const labelReserved = int(rec.labelReserved) ?? LABEL_RESERVED_UNSET;
  const labelNew = int(rec.labelNew) ?? null;
  const labelsList = Array.isArray(rec.labels) ? rec.labels : [];
  if (
    labelSold !== LABEL_SOLD_UNSET ||
    labelReserved !== LABEL_RESERVED_UNSET ||
    labelsList.length > 0
  ) {
    warnings.push(warning("W3", number));
  }

  // ── opis
  const description = str(rec.description) ?? "";
  const descriptionWww = str(rec.descriptionWebsite);
  if (
    descriptionWww &&
    description &&
    !sameDescription(descriptionWww, description)
  ) {
    warnings.push(warning("DESCRIPTION_DIFF", number));
  }
  const descriptionHtml = sanitizeDescription(descriptionWww ?? description);

  // ── tagi
  const tags = Array.isArray(rec.tags)
    ? rec.tags
        .map((t) =>
          t && typeof t === "object" ? str((t as RawRecord).name) : undefined,
        )
        .filter((t): t is string => t !== undefined)
    : (str(rec.tagList)
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? []);

  // ── cena
  const priceHidden = int(rec.priceHide) === 1;
  const price = priceHidden ? null : (positive(rec.price) ?? null);
  const pricePerM2 =
    price === null ? null : (positive(rec.pricePermeter) ?? null);
  const pricePrevious = positive(rec.pricePrevious);
  const lastLowest = positive(rec.lastLowestPrice);
  const currency = CURRENCY[int(rec.priceCurrency) ?? 2] ?? "PLN";

  // ── powierzchnie
  const area = require(positive(rec.areaTotal), "areaTotal");
  const plotArea = mainType === "dzialka" ? area : positive(rec.areaPlot);

  // ── zdjęcia
  const pictures = Array.isArray(rec.pictures) ? rec.pictures : [];
  const pictureTypes = Array.isArray(rec.picturesTypes)
    ? rec.picturesTypes
    : [];
  const photos: PhotoDraft[] = [];
  pictures.forEach((url, i) => {
    if (typeof url !== "string") return;
    const id = /(\d+)_max\.jpg$/.exec(url)?.[1];
    if (!id) return;
    photos.push({
      id: Number(id),
      sourceUrl: url,
      kind:
        String(pictureTypes[i] ?? "") === PHOTO_PLAN_TYPE ? "plan" : "photo",
      alt: `${title || numberValue} – zdjęcie ${photos.length + 1}`,
    });
  });
  const mainPicture = int(rec.main_picture);
  if (
    photos.length &&
    mainPicture !== undefined &&
    photos[0].id !== mainPicture
  ) {
    warnings.push(warning("MAIN_PICTURE", number));
  }

  // ── wideo, spacer
  const videoLink = str(rec.videoLink);
  const videoId = videoLink ? YOUTUBE_ID.exec(videoLink)?.[1] : undefined;
  if (videoLink && !videoId) warnings.push(warning("VIDEO_LINK", number));
  const tourLink = str(rec.tourLink);
  const tourUrl =
    tourLink && /^https?:\/\//.test(tourLink) ? tourLink : undefined;

  // ── lokalizacja
  const city = require(str(rec.locationCityName), "locationCityName");
  const district = str(rec.locationPrecinctName);
  const streetTypeRaw = str(rec.locationStreetType);
  const street = str(rec.locationStreetName);
  let streetType: OfferLocation["streetType"];
  if (street && streetTypeRaw) {
    if (streetTypeRaw === "ul." || streetTypeRaw === "os.")
      streetType = streetTypeRaw;
    else warnings.push(warning("STREET_TYPE", number, streetTypeRaw));
  }
  const placeName =
    str(rec.locationPlaceName) ?? (district ? `${city} ${district}` : city);
  const location: OfferLocation = omitUndefined({
    province: titleCaseIfUpper(
      require(str(rec.locationProvinceName), "locationProvinceName"),
    ),
    county: require(str(rec.locationDistrictName), "locationDistrictName"),
    commune: require(str(rec.locationCommuneName), "locationCommuneName"),
    city,
    parentDistrict: str(rec.locationParentPrecinctName),
    district,
    placeName,
    street,
    streetType,
    slug: slugify(placeName),
    lat: require(num(rec.locationLatitude), "locationLatitude"),
    lon: require(num(rec.locationLongitude), "locationLongitude"),
  });

  // ── podtyp
  const subTypeId =
    int(rec.buildingType) ?? int(rec.groundType) ?? int(rec.commercialType);

  // ── ekspozycja, liczniki, energia
  const exposure = (
    [
      ["N", "apartmentNorth"],
      ["E", "apartmentEast"],
      ["S", "apartmentSouth"],
      ["W", "apartmentWest"],
    ] as const
  )
    .filter(([, key]) => isOn(rec[key]))
    .map(([dir]) => dir);
  const meters = (
    [
      ["prad", "apartmentCurrentmeter"],
      ["cieplo", "apartmentHeatmeter"],
      ["woda", "apartmentWatermeter"],
      ["gaz", "apartmentGasmeter"],
    ] as const
  )
    .filter(([, key]) => isOn(rec[key]))
    .map(([name]) => name);
  const energy = omitUndefined({
    usable: num(rec.usableEnergyIndicator),
    final: num(rec.finalEnergyIndicator),
    primary: num(rec.primaryEnergyIndicator),
    co2: num(rec.co2EmissionUnit),
    renewable: num(rec.renewableEnergySourcesIndicator),
  });

  const extras = Object.fromEntries(
    (Object.keys(EXTRAS) as ExtraKey[]).map((k) => [
      k,
      Math.max(0, int(rec[EXTRAS[k] as keyof PublicRecord]) ?? 0),
    ]),
  ) as Record<ExtraKey, number>;

  const surroundings = Object.entries(rec)
    .filter(
      ([key, value]) =>
        SURROUNDING_PREFIXES.some((p) => key.startsWith(p)) && isOn(value),
    )
    .map(([key]) => key)
    .sort();

  const plot = omitUndefined({
    fencing: dict("fence", int(rec.groundFencing), "groundFencing"),
    road: dict("road", int(rec.groundRoad), "groundRoad"),
    building: dict(
      "developmentArea",
      int(rec.groundBuilding),
      "groundBuilding",
    ),
    ownership: dict(
      "ownershipGround",
      int(rec.groundOwnership),
      "groundOwnership",
    ),
    shape: int(rec.groundShape),
    width: positive(rec.groundPlotwidth),
    height: positive(rec.groundPlotheight),
  });

  const alternativeIds = csvIds(rec.commercialTypeAlternative);
  const alternativeTypes = alternativeIds
    .map((id) => dict("types", id, "commercialTypeAlternative"))
    .filter((x): x is string => x !== undefined);
  const exposition = int(rec.commercialLocalExposition);
  const commercial = omitUndefined({
    alternativeTypes: alternativeTypes.length ? alternativeTypes : undefined,
    shopWindow:
      exposition === YES ? true : exposition === NO ? false : undefined,
  });

  const equipment = csvIds(rec.apartmentEquipment)
    .map((id) => dict("apartmentEquipments", id, "apartmentEquipment"))
    .filter((x): x is string => x !== undefined);
  const brightKitchen = int(rec.brightKitchen);
  const furnishedId = int(rec.apartmentFurnishings);

  const offer: NormalizedOffer = omitUndefined({
    crmId,
    number: numberValue,
    slug: numberValue.toLowerCase(),

    mainType,
    typeName: str(rec.typeName) ?? numberValue,
    subTypeId,
    subType: dict("types", subTypeId, "subType"),
    transaction,
    market,

    status: parsed.status,
    statusSource: "title" as const,
    badges,
    crmStatus: require(int(rec.status), "status"),
    labels: { sold: labelSold, reserved: labelReserved, new: labelNew },

    title,
    rawTitle,
    descriptionHtml,
    tags,

    addedAt: require(toIsoWarsaw(rec.addDate), "addDate"),
    activatedAt: toIsoWarsaw(rec.activateDate),
    updatedAt: require(toIsoWarsaw(rec.updateDate), "updateDate"),
    availableFrom: toIsoDate(rec.availableDate),
    availableNote: str(rec.availableDescription),

    price,
    currency,
    pricePerM2,
    previousPrice:
      price !== null && pricePrevious !== undefined && pricePrevious > price
        ? pricePrevious
        : undefined,
    lowestPrice30d:
      price !== null && lastLowest !== undefined && lastLowest < price
        ? lastLowest
        : undefined,
    rent: positive(rec.apartmentRent),
    charges: positive(rec.apartmentCharges),
    deposit: positive(rec.apartmentDeposit),

    area,
    usableArea: positive(rec.areaUsable),
    plotArea,

    rooms: int(rec.apartmentRoomNumber),
    bathrooms: int(rec.apartmentBathroomNumber),
    bedrooms: int(rec.apartmentBedroomNumber),
    toilets: int(rec.apartmentToiletNumber),
    levels: int(rec.apartmentLevelNumber),
    floor: int(rec.apartmentFloor),
    floorsInBuilding: int(rec.buildingFloornumber),
    buildingYear: int(rec.buildingYear),
    elevators: int(rec.buildingElevatornumber),
    furnished: furnishedId === undefined ? undefined : FURNISHED[furnishedId],
    kitchen: dict(
      "kitchenTypes",
      int(rec.apartmentKitchen),
      "apartmentKitchen",
    ),
    brightKitchen:
      brightKitchen === YES ? true : brightKitchen === NO ? false : undefined,
    windows: int(rec.apartmentWindow),
    bathroomType: int(rec.apartmentBathroomType),
    equipment: equipment.length ? equipment : undefined,
    ownership: dict(
      "ownership",
      int(rec.apartmentOwnership),
      "apartmentOwnership",
    ),
    condition: dict(
      "buildingCondition",
      int(rec.buildingCondition),
      "buildingCondition",
    ),
    heating: dict("heating", int(rec.buildingHeating), "buildingHeating"),
    material: dict(
      "buildingMaterials",
      int(rec.buildingMaterial),
      "buildingMaterial",
    ),
    exposure: exposure.length ? exposure : undefined,
    meters: meters.length ? meters : undefined,
    energy: hasAny(energy) ? energy : undefined,

    extras,
    security: flags(rec, "security"),
    media: flags(rec, "media"),
    surroundings,
    plot: hasAny(plot) ? plot : undefined,
    commercial: hasAny(commercial) ? commercial : undefined,

    location,
    photos,
    videoId,
    tourUrl,

    agent: AGENT.id,
  });

  const checked = NormalizedOfferSchema.safeParse(offer);
  if (!checked.success) {
    const first = checked.error.issues[0];
    throw new NormalizeError(
      first?.path.join(".") || "?",
      number,
      first?.message ?? "walidacja",
    );
  }
  return { offer: checked.data, warnings };
}
