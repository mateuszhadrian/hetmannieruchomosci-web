// Logika wyszukiwarki (`src/lib/offers/filters.ts`) — tabela
// „filtr → pole → reguła → test" z docs/analiza-oferty.md §4 na danych
// SYNTETYCZNYCH (4 oferty: mieszkanie sprzedaż aktywna z parterem, windą
// i obniżką; mieszkanie wynajem wynajęte; działka rezerwacja poza
// Poznaniem z „0% prowizji"; lokal komercyjny bez ceny i bez zdjęć)
// + warianty cech przez `variant()`; liczniki na fixture (skip bez niego).
import { describe, expect, it } from "vitest";
import {
  applyFilters,
  DEFAULT_STATE,
  isFieldRelevant,
  matchesEntry,
  PAGE_SIZE,
  paginate,
  parsePage,
  parsePath,
  parseSearch,
  runSearch,
  serializeSearch,
  sortEntries,
  STATUS_GROUPS,
  statusCounts,
  statusGroupOf,
  targetPath,
  type SearchState,
} from "../../src/lib/offers/filters";
import {
  toIndexEntry,
  toIndexText,
  type OfferIndexEntry,
} from "../../src/lib/offers/index-entry";
import { readOffersTyped } from "../helpers/offers";
import { syntheticFullOffers } from "../helpers/raw";

const offers = syntheticFullOffers();
const entries = offers.map(toIndexEntry);
const texts = Object.fromEntries(offers.map((o) => [o.number, toIndexText(o)]));
const numbers = (list: readonly OfferIndexEntry[]) => list.map((e) => e.number);
const state = (patch: Partial<SearchState>): SearchState => ({
  ...DEFAULT_STATE,
  ...patch,
});
const variant = (patch: Partial<OfferIndexEntry>): OfferIndexEntry => ({
  ...entries[0],
  ...patch,
});
const run = (patch: Partial<SearchState>, list = entries) =>
  numbers(applyFilters(list, state(patch), texts));

const ALL = ["SW900001", "SW900002", "SW900003", "SW900004"];

describe("parsePath", () => {
  it("rozpoznaje listy typ × transakcja [× lokalizacja]", () => {
    expect(parsePath("/oferty/")).toEqual({});
    expect(parsePath("/oferty/mieszkanie-na-sprzedaz/")).toEqual({
      mainType: "mieszkanie",
      transaction: "sprzedaz",
    });
    expect(
      parsePath("/oferty/lokal-komercyjny-na-wynajem/poznan-wilda/"),
    ).toEqual({
      mainType: "komercyjny",
      transaction: "wynajem",
      locationSlug: "poznan-wilda",
    });
  });
  it("adres spoza wzorca (detal, nieznany typ, inna ścieżka) → pusty stan", () => {
    expect(parsePath("/oferty/mieszkanie-na-sprzedaz/poznan/sw1/")).toEqual({});
    expect(parsePath("/oferty/zamek-na-sprzedaz/")).toEqual({});
    expect(parsePath("/oferty/mieszkanie-na-dzierzawe/")).toEqual({});
    expect(parsePath("/kontakt/")).toEqual({});
  });
});

describe("parseSearch / serializeSearch", () => {
  it("brak parametrów = stan domyślny (bez presetów, wszystkie statusy, najnowsze, strona 1)", () => {
    const s = parseSearch("/oferty/", "");
    expect(s).toEqual(DEFAULT_STATE);
    expect(serializeSearch(s).toString()).toBe("");
  });

  it("ścieżka ma pierwszeństwo przed parametrami; segment lokalizacji = locationSlug (dokładny), ?lokalizacja= = prefiks", () => {
    const s = parseSearch(
      "/oferty/dom-na-sprzedaz/kornik-bnin/",
      "?typ=mieszkanie&transakcja=wynajem&lokalizacja=wielkopolskie/poznan",
    );
    expect(s.mainType).toBe("dom");
    expect(s.transaction).toBe("sprzedaz");
    expect(s.locationSlug).toBe("kornik-bnin");
    expect(s.location).toBe("wielkopolskie/poznan");
    expect(
      parseSearch("/oferty/dom-na-sprzedaz/", "").locationSlug,
    ).toBeUndefined();
  });

  it("liczby: spacje i NBSP usuwane, tekst ignorowany bez błędu; strona 0/-1/abc → 1", () => {
    const s = parseSearch(
      "/oferty/",
      "?cena-od=500 000&cena-do=abc&pow-od=60,5&strona=0",
    );
    expect(s.priceFrom).toBe(500000);
    expect(s.priceTo).toBeUndefined();
    expect(s.areaFrom).toBe(60.5);
    expect(s.page).toBe(1);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("2.5")).toBe(1);
  });

  it("status: lista grup; nieznane wartości wypadają; pusty parametr = żadna grupa", () => {
    expect(
      parseSearch("/oferty/", "?status=aktywna,archiwalne,foo").statuses,
    ).toEqual(["aktywna", "archiwalne"]);
    expect(parseSearch("/oferty/", "?status=").statuses).toEqual([]);
    // pusty zbiór musi przetrwać serializację (`status=`), inaczej adres
    // „żadna grupa" czytałby się jako stan domyślny
    expect(serializeSearch(state({ statuses: [] })).toString()).toBe("status=");
    expect(
      parseSearch("/oferty/", serializeSearch(state({ statuses: [] })))
        .statuses,
    ).toEqual([]);
  });

  it("nieznany sort → najnowsze; nieznana winda/rynek/umeblowanie → ignorowane", () => {
    const s = parseSearch(
      "/oferty/",
      "?sort=foo&winda=moze&rynek=x&umeblowane=y",
    );
    expect(s.sort).toBe("newest");
    expect(s.elevator).toBeUndefined();
    expect(s.market).toBeUndefined();
    expect(s.furnished).toBeUndefined();
    expect(s.invalid).toBeUndefined();
  });

  it("nieznana wartość typu albo transakcji w parametrze = 0 wyników (parytet)", () => {
    const s = parseSearch("/oferty/", "?typ=zamek");
    expect(s.invalid).toBe(true);
    expect(applyFilters(entries, s)).toEqual([]);
    expect(parseSearch("/oferty/", "?transakcja=dzierzawa").invalid).toBe(true);
    // na liście SSG typ ze ścieżki wygrywa — parametr nie unieważnia
    expect(
      parseSearch("/oferty/dom-na-sprzedaz/", "?typ=zamek").invalid,
    ).toBeUndefined();
  });

  it("serializacja pomija wartości domyślne i to, co niesie ścieżka; adres jest deterministyczny", () => {
    const s = state({
      mainType: "mieszkanie",
      transaction: "sprzedaz",
      location: "wielkopolskie/poznan/poznan",
      priceTo: 800000,
      statuses: ["archiwalne", "aktywna"],
      sort: "priceAsc",
      page: 2,
    });
    expect(serializeSearch(s).toString()).toBe(
      "typ=mieszkanie&transakcja=sprzedaz&lokalizacja=wielkopolskie%2Fpoznan%2Fpoznan&cena-do=800000&status=aktywna%2Carchiwalne&sort=priceAsc&strona=2",
    );
    expect(
      serializeSearch(s, {
        mainType: "mieszkanie",
        transaction: "sprzedaz",
      }).toString(),
    ).toBe(
      "lokalizacja=wielkopolskie%2Fpoznan%2Fpoznan&cena-do=800000&status=aktywna%2Carchiwalne&sort=priceAsc&strona=2",
    );
    // slug z adresu listy nigdy nie jest parametrem
    expect(
      serializeSearch(state({ locationSlug: "poznan-winogrady" })).toString(),
    ).toBe("");
  });

  it("parseSearch ∘ serializeSearch zachowuje stan", () => {
    const s = state({
      roomsFrom: 2,
      floorTo: 0,
      elevator: "nie",
      furnished: "czesciowo",
      description: "garaż",
      number: "sw900001",
      statuses: ["rezerwacja"],
    });
    const round = parseSearch("/oferty/", serializeSearch(s));
    expect(round).toEqual(s);
  });
});

describe("filtry (AND) na danych syntetycznych", () => {
  it("bez filtrów — wszystkie; typ i transakcja zawężają", () => {
    expect(run({})).toEqual(ALL);
    expect(run({ mainType: "mieszkanie" })).toEqual(["SW900001", "SW900002"]);
    expect(run({ mainType: "dzialka", transaction: "sprzedaz" })).toEqual([
      "SW900003",
    ]);
    expect(run({ mainType: "dom" })).toEqual([]);
  });

  it("lokalizacja: prefiks po segmentach (Poznań obejmuje dzielnice, województwo wszystko, obcy prefiks nic)", () => {
    expect(run({ location: "wielkopolskie" })).toEqual(ALL);
    expect(run({ location: "wielkopolskie/poznan/poznan" })).toEqual([
      "SW900001",
      "SW900002",
      "SW900004",
    ]);
    expect(
      run({ location: "wielkopolskie/poznan/poznan/stare-miasto" }),
    ).toEqual(["SW900001"]);
    expect(run({ location: "wielkopolskie/poznanski" })).toEqual(["SW900003"]);
    expect(run({ location: "wielkopolskie/poznan" })).not.toContain("SW900003");
    expect(run({ location: "dolnoslaskie" })).toEqual([]);
  });

  it("slug z adresu listy: dopasowanie DOKŁADNE do location.slug (R18); AND z ?lokalizacja=", () => {
    // „poznan" to miejscowość z dzielnicami: prefiks dałby 3 wpisy, slug — 1
    expect(run({ locationSlug: "poznan" })).toEqual(["SW900004"]);
    expect(run({ location: "wielkopolskie/poznan/poznan" })).toHaveLength(3);
    expect(run({ locationSlug: "poznan-winogrady" })).toEqual(["SW900001"]);
    expect(run({ locationSlug: "poznan-nieznane" })).toEqual([]);
    expect(
      run({
        locationSlug: "poznan-winogrady",
        location: "wielkopolskie/poznanski",
      }),
    ).toEqual([]);
    expect(
      parseSearch("/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/", "")
        .locationSlug,
    ).toBe("poznan-winogrady");
  });

  it("ulica: tylko w kaskadzie z lokalizacją, bez wielkości liter i diakrytyków", () => {
    expect(run({ street: "Pod Lipami" })).toEqual(ALL);
    expect(run({ location: "wielkopolskie", street: "pod lipami" })).toEqual([
      "SW900001",
    ]);
    expect(run({ location: "wielkopolskie", street: "Glogowska" })).toEqual([
      "SW900002",
    ]);
    expect(run({ location: "wielkopolskie", street: "Nieznana" })).toEqual([]);
  });

  it("cena: zakres domknięty na jednej skali; „Zapytaj o cenę” odpada przy dowolnym limicie", () => {
    expect(run({ priceFrom: 300000 })).toEqual(["SW900001"]);
    expect(run({ priceTo: 3000 })).toEqual(["SW900002"]);
    expect(run({ priceFrom: 120000, priceTo: 120000 })).toEqual(["SW900003"]);
    expect(run({ priceFrom: 0 })).not.toContain("SW900004");
  });

  it("powierzchnia: zakres (działka = powierzchnia działki)", () => {
    expect(run({ areaFrom: 60 })).toEqual(["SW900003", "SW900004"]);
    expect(run({ areaTo: 30 })).toEqual(["SW900001"]);
  });

  it("szukaj w opisie obejmuje tytuł; bez tekstu wpis odpada; diakrytyki obojętne", () => {
    expect(run({ description: "balkon" })).toEqual(["SW900002"]);
    expect(run({ description: "KAWALERKA" })).toEqual(["SW900001"]);
    expect(run({ description: "garaż" })).toEqual(["SW900002"]);
    expect(run({ description: "garaz" })).toEqual(["SW900002"]);
    expect(run({ description: "brak-takiej-frazy" })).toEqual([]);
    expect(
      numbers(applyFilters(entries, state({ description: "balkon" }))),
    ).toEqual([]);
  });

  it("numer: dokładny bez wielkości liter; fragment → 0", () => {
    expect(run({ number: "sw900001" })).toEqual(["SW900001"]);
    expect(run({ number: " SW900001 " })).toEqual(["SW900001"]);
    expect(run({ number: "900001" })).toEqual([]);
  });

  it("pokoje, rok, rynek, umeblowanie, liczba pięter", () => {
    expect(run({ roomsFrom: 2 })).toEqual(["SW900002"]);
    expect(run({ roomsTo: 1 })).toEqual(["SW900001"]);
    expect(run({ yearFrom: 2010 })).toEqual(["SW900004"]);
    expect(run({ yearTo: 1980 })).toEqual(["SW900001"]);
    expect(run({ market: "pierwotny" })).toEqual(["SW900004"]);
    expect(run({ furnished: "tak" })).toEqual(["SW900001"]);
    expect(run({ furnished: "czesciowo" })).toEqual(["SW900002"]);
    expect(run({ floorsTo: 4 })).toEqual(["SW900002"]);
  });

  it("piętro: `0` jest wartością — „tylko parter” działa (świadoma poprawka)", () => {
    expect(run({ floorFrom: 0, floorTo: 0 })).toEqual(["SW900001"]);
    expect(run({ floorTo: 0 })).toEqual(["SW900001"]);
    expect(run({ floorFrom: 3 })).toEqual(["SW900002"]);
    expect(run({ floorFrom: -1, floorTo: 10 })).toEqual([
      "SW900001",
      "SW900002",
    ]);
  });

  it("winda: tak = > 0, nie = dokładnie 0, brak danych odpada w obu (R14)", () => {
    const list = [
      variant({ number: "E2", elevators: 2 }),
      variant({ number: "E0", elevators: 0 }),
      variant({ number: "EX", elevators: undefined }),
    ];
    expect(run({ elevator: "tak" }, list)).toEqual(["E2"]);
    expect(run({ elevator: "nie" }, list)).toEqual(["E0"]);
    expect(run({}, list)).toEqual(["E2", "E0", "EX"]);
  });

  it("status: grupy; archiwalne = sprzedane ∪ wynajęte; pusty zbiór = pusty wynik", () => {
    expect(statusGroupOf("sprzedana")).toBe("archiwalne");
    expect(statusGroupOf("wynajeta")).toBe("archiwalne");
    expect(run({ statuses: ["aktywna"] })).toEqual(["SW900001", "SW900004"]);
    expect(run({ statuses: ["archiwalne"] })).toEqual(["SW900002"]);
    expect(run({ statuses: ["rezerwacja", "archiwalne"] })).toEqual([
      "SW900002",
      "SW900003",
    ]);
    expect(run({ statuses: [] })).toEqual([]);
  });

  it("pola zależne od typu: filtr nieadekwatny do wybranego typu jest ignorowany", () => {
    expect(isFieldRelevant("dzialka", "rooms")).toBe(false);
    expect(isFieldRelevant("dom", "floor")).toBe(false);
    expect(isFieldRelevant("komercyjny", "furnished")).toBe(false);
    expect(isFieldRelevant(undefined, "furnished")).toBe(true);
    expect(
      run({ mainType: "dzialka", roomsFrom: 3, floorTo: 0, furnished: "tak" }),
    ).toEqual(["SW900003"]);
    expect(run({ mainType: "komercyjny", furnished: "tak" })).toEqual([
      "SW900004",
    ]);
    // bez typu te same filtry działają normalnie
    expect(run({ roomsFrom: 3 })).toEqual([]);
  });

  it("filtry łączą się AND", () => {
    expect(
      run({ mainType: "mieszkanie", priceTo: 3000, statuses: ["archiwalne"] }),
    ).toEqual(["SW900002"]);
    expect(
      run({ mainType: "mieszkanie", priceTo: 3000, statuses: ["aktywna"] }),
    ).toEqual([]);
  });

  it("matchesEntry = applyFilters na jednym wpisie", () => {
    expect(matchesEntry(entries[0], state({ floorTo: 0 }))).toBe(true);
    expect(matchesEntry(entries[1], state({ floorTo: 0 }))).toBe(false);
  });
});

describe("sortowanie", () => {
  it("najnowsze = addedAt malejąco (domyślne), najstarsze rosnąco; remis → numer", () => {
    expect(numbers(sortEntries(entries, "newest"))).toEqual([
      "SW900004",
      "SW900001",
      "SW900002",
      "SW900003",
    ]);
    expect(numbers(sortEntries(entries, "oldest"))).toEqual([
      "SW900003",
      "SW900002",
      "SW900001",
      "SW900004",
    ]);
    const tie = [
      variant({ number: "B", addedAt: "2026-01-01T00:00:00+01:00" }),
      variant({ number: "A", addedAt: "2026-01-01T00:00:00+01:00" }),
    ];
    expect(numbers(sortEntries(tie, "newest"))).toEqual(["A", "B"]);
  });

  it("cena przy mieszanych transakcjach: rosnąco wynajem przed sprzedażą, malejąco odwrotnie; „Zapytaj o cenę” na końcu", () => {
    const list = [
      variant({ number: "S2", transaction: "sprzedaz", price: 500000 }),
      variant({ number: "W2", transaction: "wynajem", price: 3000 }),
      variant({ number: "N", transaction: "sprzedaz", price: null }),
      variant({ number: "S1", transaction: "sprzedaz", price: 100000 }),
      variant({ number: "W1", transaction: "wynajem", price: 1000 }),
    ];
    expect(numbers(sortEntries(list, "priceAsc"))).toEqual([
      "W1",
      "W2",
      "S1",
      "S2",
      "N",
    ]);
    expect(numbers(sortEntries(list, "priceDesc"))).toEqual([
      "S2",
      "S1",
      "W2",
      "W1",
      "N",
    ]);
  });

  it("sortowanie nie zmienia wejścia", () => {
    const before = numbers(entries);
    sortEntries(entries, "priceDesc");
    expect(numbers(entries)).toEqual(before);
  });
});

describe("paginacja i liczniki", () => {
  const many = Array.from({ length: 25 }, (_, i) =>
    variant({ number: `P${i}` }),
  );

  it("12 na stronę; strony 1–3 z 25; poza zakresem pusta strona z nagłówkiem (parytet)", () => {
    expect(PAGE_SIZE).toBe(12);
    const p1 = paginate(many, 1);
    expect(p1.pages).toBe(3);
    expect(p1.total).toBe(25);
    expect(p1.items).toHaveLength(12);
    expect(paginate(many, 3).items).toHaveLength(1);
    const beyond = paginate(many, 4);
    expect(beyond.items).toEqual([]);
    expect(beyond.total).toBe(25);
    expect(paginate([], 1).pages).toBe(1);
  });

  it("liczniki statusu per grupa", () => {
    expect(statusCounts(entries)).toEqual({
      aktywna: 2,
      rezerwacja: 1,
      archiwalne: 1,
    });
  });

  it("runSearch: liczniki liczone w kontekście pozostałych filtrów, bez filtra statusu", () => {
    const r = runSearch(
      entries,
      state({ mainType: "mieszkanie", statuses: ["aktywna"] }),
      texts,
    );
    expect(numbers(r.items)).toEqual(["SW900001"]);
    expect(r.counts).toEqual({ aktywna: 1, rezerwacja: 0, archiwalne: 1 });
    expect(r.total).toBe(1);
  });
});

describe("targetPath — adres dla stanu (pushState wyspy)", () => {
  const nodes = [
    { id: "wielkopolskie", parent: null },
    { id: "wielkopolskie/poznan", parent: "wielkopolskie" },
    { id: "wielkopolskie/poznan/poznan", parent: "wielkopolskie/poznan" },
    {
      id: "wielkopolskie/poznan/poznan/stare-miasto",
      parent: "wielkopolskie/poznan/poznan",
    },
    {
      id: "wielkopolskie/poznan/poznan/stare-miasto/winogrady",
      parent: "wielkopolskie/poznan/poznan/stare-miasto",
    },
    {
      id: "wielkopolskie/poznan/poznan/grunwald",
      parent: "wielkopolskie/poznan/poznan",
    },
    {
      id: "wielkopolskie/poznan/poznan/grunwald/lazarz",
      parent: "wielkopolskie/poznan/poznan/grunwald",
    },
    { id: "wielkopolskie/poznanski", parent: "wielkopolskie" },
    {
      id: "wielkopolskie/poznanski/tarnowo-podgorne",
      parent: "wielkopolskie/poznanski",
    },
    {
      id: "wielkopolskie/poznanski/tarnowo-podgorne/baranowo",
      parent: "wielkopolskie/poznanski/tarnowo-podgorne",
    },
  ];
  const WINOGRADY = "wielkopolskie/poznan/poznan/stare-miasto/winogrady";
  const POZNAN = "wielkopolskie/poznan/poznan";

  it("bez typu albo transakcji → /oferty/ + parametry; slug z adresu wraca do id węzła", () => {
    const t = targetPath(state({ mainType: "mieszkanie" }), entries, nodes);
    expect(t.pathname).toBe("/oferty/");
    expect(t.pathState).toEqual({});
    expect(serializeSearch(t.state, t.pathState).toString()).toBe(
      "typ=mieszkanie",
    );
    const u = targetPath(state({ locationSlug: "poznan" }), entries, nodes);
    expect(u.state.location).toBe(POZNAN);
    expect(u.state.locationSlug).toBeUndefined();
  });

  it("typ ∧ transakcja → ścieżka listy; liść z listą → segment slugu, miejscowość z dzielnicami → parametr", () => {
    const leaf = targetPath(
      state({
        mainType: "mieszkanie",
        transaction: "sprzedaz",
        location: WINOGRADY,
      }),
      entries,
      nodes,
    );
    expect(leaf.pathname).toBe(
      "/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/",
    );
    expect(leaf.pathState).toEqual({
      mainType: "mieszkanie",
      transaction: "sprzedaz",
      locationSlug: "poznan-winogrady",
    });
    expect(leaf.state.location).toBeUndefined();
    expect(leaf.state.locationSlug).toBe("poznan-winogrady");
    expect(serializeSearch(leaf.state, leaf.pathState).toString()).toBe("");

    const city = targetPath(
      state({
        mainType: "mieszkanie",
        transaction: "sprzedaz",
        location: POZNAN,
      }),
      entries,
      nodes,
    );
    expect(city.pathname).toBe("/oferty/mieszkanie-na-sprzedaz/");
    expect(serializeSearch(city.state, city.pathState).toString()).toBe(
      "lokalizacja=wielkopolskie%2Fpoznan%2Fpoznan",
    );

    // liść bez listy tego rodzaju (Winogrady ma tylko sprzedaż) → parametr
    const none = targetPath(
      state({
        mainType: "mieszkanie",
        transaction: "wynajem",
        location: WINOGRADY,
      }),
      entries,
      nodes,
    );
    expect(none.pathname).toBe("/oferty/mieszkanie-na-wynajem/");
    expect(none.state.location).toBe(WINOGRADY);
  });

  it("slug z adresu zostaje, gdy nowy rodzaj ma tę listę; inaczej wraca do id węzła", () => {
    const keep = targetPath(
      state({
        mainType: "mieszkanie",
        transaction: "sprzedaz",
        locationSlug: "poznan-winogrady",
      }),
      entries,
      nodes,
    );
    expect(keep.pathname).toBe(
      "/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/",
    );
    const moved = targetPath(
      state({
        mainType: "dom",
        transaction: "sprzedaz",
        locationSlug: "poznan-winogrady",
      }),
      entries,
      nodes,
    );
    expect(moved.pathname).toBe("/oferty/dom-na-sprzedaz/");
    expect(moved.state.location).toBe(WINOGRADY);
    expect(moved.state.locationSlug).toBeUndefined();
  });
});

describe("liczniki na fixture", () => {
  const fixture = readOffersTyped("fixture");
  it.skipIf(fixture.length === 0)(
    "statusy 3 / 1 / 6 i filtry z selection.json",
    () => {
      const fx = fixture.map(toIndexEntry);
      expect(statusCounts(fx)).toEqual({
        aktywna: 3,
        rezerwacja: 1,
        archiwalne: 6,
      });
      expect(run({ floorFrom: 0, floorTo: 0 }, fx)).toHaveLength(2);
      expect(run({ priceFrom: 500000 }, fx)).toEqual(["SW303888", "SW349452"]);
      expect(run({ areaFrom: 60 }, fx)).toHaveLength(6);
      expect(run({ floorsTo: 4 }, fx)).toHaveLength(4);
      expect(run({ furnished: "tak" }, fx)).toHaveLength(2);
      expect(run({ market: "pierwotny" }, fx)).toHaveLength(3);
      expect(STATUS_GROUPS).toHaveLength(3);
    },
  );
});
