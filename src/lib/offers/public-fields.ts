// Allow-lista pól oferty z systemu CRM (D18). Do danych publicznych
// (`data/offers.json`) trafiają WYŁĄCZNIE pola z `PUBLIC_FIELDS`; wszystko
// inne sync odrzuca. Lista jest wklejona 1:1 ze źródła nadrzędnego
// (docs/kb part3 §1.3 — dokument lokalny, poza repo). Zmiana listy = jeden
// PR z listą, schematem, normalizacją, testami kontraktu i fixture'em
// (.claude/rules/data-sync.md).

export const PUBLIC_FIELDS = [
  // identyfikacja i klasyfikacja
  "id",
  "number",
  "mainTypeId",
  "typeName",
  "buildingType",
  "groundType",
  "commercialType",
  "commercialTypeAlternative",
  "market",
  "transaction",
  "status",
  "offerExport",
  "labelSold",
  "labelReserved",
  "labelNew",
  "labels",
  // daty
  "addDate",
  "activateDate",
  "updateDate",
  "availableDate",
  "availableDescription",
  // cena
  "price",
  "priceCurrency",
  "pricePermeter",
  "pricePrevious",
  "lastLowestPrice",
  "priceHide",
  "apartmentRent",
  "apartmentCharges",
  "apartmentDeposit",
  // powierzchnie
  "areaTotal",
  "areaUsable",
  "areaPlot",
  // mieszkanie
  "apartmentFloor",
  "apartmentRoomNumber",
  "apartmentBathroomNumber",
  "apartmentBedroomNumber",
  "apartmentToiletNumber",
  "apartmentLevelNumber",
  "apartmentFurnishings",
  "apartmentKitchen",
  "brightKitchen",
  "apartmentWindow",
  "apartmentBathroomType",
  "apartmentEquipment",
  "apartmentOwnership",
  "apartmentHeight",
  "apartmentHeightTo",
  "apartmentNorth",
  "apartmentEast",
  "apartmentSouth",
  "apartmentWest",
  "apartmentCurrentmeter",
  "apartmentHeatmeter",
  "apartmentWatermeter",
  "apartmentGasmeter",
  "descriptionRoom",
  "descriptionAdditional",
  // budynek
  "buildingFloornumber",
  "buildingYear",
  "buildingCondition",
  "buildingHeating",
  "buildingElevatornumber",
  "buildingMaterial",
  "buildingRoofmaterial",
  "buildingTwostorey",
  "buildingResidential",
  "buildingAirConditioning",
  "buildingGym",
  "buildingAdapted",
  "buildingRooftype",
  "buildingConstruction",
  "buildingFlooring",
  "buildingCarPark",
  "buildingSwimmingpool",
  "usableEnergyIndicator",
  "finalEnergyIndicator",
  "primaryEnergyIndicator",
  "co2EmissionUnit",
  "renewableEnergySourcesIndicator",
  // dodatki
  "additionalBalcony",
  "additionalLoggia",
  "additionalTerrace",
  "additionalBasement",
  "additionalAttic",
  "additionalStorage",
  "additionalEntresol",
  "additionalParking",
  "additionalParkingunderground",
  "additionalGarage",
  "additionalGarden",
  // bezpieczeństwo
  "securityIntercom",
  "securityVideointercom",
  "securityGuarded",
  "securityReception",
  "securityGated",
  "securitySecuredoor",
  "securityBlinds",
  "securityGrating",
  "securityVideocameras",
  "securityMonitoring",
  "securitySmokeDetector",
  "securityAccessControl",
  "securityAlarm",
  // media
  "mediaPhone",
  "mediaInternet",
  "mediaTelevision",
  "mediaGas",
  "mediaWater",
  "mediaWell",
  "mediaCurrent",
  "mediaSewerage",
  "mediaCesspool",
  "mediaWaterPurification",
  // okolica, komunikacja, rekreacja, typ lokalizacji
  "recreationForest",
  "recreationPark",
  "recreationLake",
  "recreationSea",
  "communicationPks",
  "communicationBus",
  "communicationSuburbanrailway",
  "communicationSubway",
  "communicationTram",
  "communicationTrolleybus",
  "communicationRailway",
  "neighborhoodFitness",
  "neighborhoodPool",
  "neighborhoodBank",
  "neighborhoodPharmacy",
  "neighborhoodHospital",
  "neighborhoodAirport",
  "neighborhoodBazaar",
  "neighborhoodShoppingcenter",
  "neighborhoodNursery",
  "neighborhoodKindergarten",
  "neighborhoodPlayground",
  "neighborhoodPrimaryschool",
  "neighborhoodSecondaryschool",
  "neighborhoodUniversity",
  "neighborhoodGrocery",
  "locationtypeCenter",
  "locationtypeOutsidecenter",
  "locationtypeSuburbs",
  "locationtypeOutsidecity",
  "locationtypeCountryside",
  "locationtypeOpenspace",
  "locationtypeOther",
  // działka i komercyjne
  "groundFencing",
  "groundRoad",
  "groundBuilding",
  "groundOwnership",
  "groundShape",
  "groundPlotwidth",
  "groundPlotheight",
  "groundConditions",
  "commercialLocalExposition",
  "commercialHallClearHeight",
  "commercialHallUnloadingType",
  // lokalizacja (bez numeru budynku, lokalu i kodu pocztowego)
  "locationCountryName",
  "locationProvinceName",
  "locationDistrictName",
  "locationCommuneName",
  "locationCityName",
  "locationParentPrecinctName",
  "locationPrecinctName",
  "locationPlaceName",
  "locationStreetName",
  "locationStreetType",
  "locationLatitude",
  "locationLongitude",
  // treść i media
  "portalTitle",
  "portalWwwTitle",
  "description",
  "descriptionWebsite",
  "tags",
  "tagList",
  "pictures",
  "picturesTypes",
  "main_picture",
  "videoLink",
  "tourLink",
] as const;

/** Pola czytane przez sync, ale NIE zapisywane do data/offers.json
 *  (sygnały kontrolne do ostrzeżeń i raportu prywatnego). */
export const CONTROL_FIELDS = [
  "agreementType",
  "exportDate",
  "exportGalleryDate",
  "numberExport",
] as const;

/** Kontrakt testowy: żadne z tych pól nie może wystąpić jako klucz
 *  w danych publicznych (skan głęboki na `data/` i na fixture). Wartości
 *  tych pól nie wolno wpisywać nigdzie — także w testach i fixture. */
export const FORBIDDEN_FIELDS = [
  "contactId",
  "contactFirstname",
  "contactLastname",
  "contactEmail",
  "contactPhone",
  "contactStatus",
  "contactDeleted",
  "offerConditions",
  "locationPostal",
  "locationBuildingnumber",
  "locationApartmentnumber",
  "groundPlotNumber",
  "agreementType",
  "officeProvisionSource",
  "estateOfferUuid",
  "customField1",
  "customField2",
  "customField3",
  "customField4",
  "customField5",
  "customField6",
  "customField7",
  "customField8",
  "customField9",
  "customField10",
] as const;

export type PublicField = (typeof PUBLIC_FIELDS)[number];
export type ControlField = (typeof CONTROL_FIELDS)[number];
export type ForbiddenField = (typeof FORBIDDEN_FIELDS)[number];

/** Surowy rekord z API — kształtu nie znamy poza tym, że to obiekt. */
export type RawRecord = Record<string, unknown>;

/** Rekord po allow-liście: same klucze z `PUBLIC_FIELDS`. */
export type PublicRecord = Partial<Record<PublicField, unknown>>;

const PUBLIC_SET: ReadonlySet<string> = new Set(PUBLIC_FIELDS);
const CONTROL_SET: ReadonlySet<string> = new Set(CONTROL_FIELDS);

/** Przepuszcza wyłącznie pola z allow-listy. Brakujące pola nie są
 *  dopisywane — wynik ma tylko te klucze, które były w źródle. */
export function pickPublic(raw: RawRecord): PublicRecord {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (PUBLIC_SET.has(key)) out[key] = raw[key];
  }
  return out as PublicRecord;
}

/** Sygnały kontrolne — do pamięci procesu syncu, nigdy do plików. */
export function pickControl(
  raw: RawRecord,
): Partial<Record<ControlField, unknown>> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (CONTROL_SET.has(key)) out[key] = raw[key];
  }
  return out as Partial<Record<ControlField, unknown>>;
}

/** Skan głęboki: zwraca ścieżki (`a.b[2].c`), pod którymi w strukturze
 *  występuje klucz z `FORBIDDEN_FIELDS`. Pusta tablica = czysto. */
export function findForbiddenKeys(value: unknown, path = ""): string[] {
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      found.push(...findForbiddenKeys(item, `${path}[${i}]`)),
    );
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const here = path ? `${path}.${key}` : key;
      if ((FORBIDDEN_FIELDS as readonly string[]).includes(key)) {
        found.push(here);
      }
      found.push(...findForbiddenKeys(child, here));
    }
  }
  return found;
}
