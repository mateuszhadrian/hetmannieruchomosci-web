// Wyspa wyszukiwarki `/oferty/` (4.2 b) na danych PRODUKCYJNYCH —
// oczekiwania liczone tą samą logiką co wyspa (`filters.ts`) na pobranym
// `/oferty/index.json` i `index-text.json`, więc test jest odporny na skład
// ofert (`pickOffer` + `test.skip` tam, gdzie potrzebna cecha). Kontrakty:
// hydratacja bez przerenderowania (zero mutacji siatki) i CLS, każdy filtr
// = `runSearch`, licznik „Pokaż N ofert" na żywo, adres ↔ stan (odświeżenie,
// wstecz/dalej, `pushState` na ścieżki SSG), paginacja, pigułki statusu,
// sortowanie (listbox z klawiatury), zero wyników, lista SSG z lokalizacją
// = zbiór SSG (R18), bez JS (surowy HTML), próg 1025, zero żądań do
// podmiotów trzecich, axe z rozwiniętym panelem. Media zaślepione.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  applyFilters,
  PAGE_SIZE,
  parseSearch,
  runSearch,
  serializeSearch,
  SORT_KEYS,
  sortEntries,
  STATUS_GROUPS,
  targetPath,
} from "../../src/lib/offers/filters";
import { formatShowCount, TYPE_LABEL } from "../../src/lib/offers/format";
import type { OffersIndex } from "../../src/lib/offers/index-entry";
import { isLeaf, nodeById, nodeLabel } from "../../src/lib/offers/locations-ui";
import { SORT_LABEL, ZERO_RESULTS } from "../../src/lib/offers/offers-ui";
import { listPath, OFFERS_PATH } from "../../src/lib/offers/urls";
import { DESKTOP_MIN_PX, MEDIA_BASE } from "../../src/lib/site-config";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import {
  useChromium1920Only,
  useMediaStub,
  usePreviewGuard,
} from "../helpers/guards";
import {
  offerRoutesFromData,
  pickOffer,
  readOffersTyped,
} from "../helpers/offers";
import { gotoReady, settle } from "../helpers/scroll";

const OFFERS = readOffersTyped();
const ROUTES = offerRoutesFromData();
const NO_OFFERS = "brak ofert w data/ (zero ofert = stan dopuszczalny)";

usePreviewGuard();
useMediaStub();
useChromium1920Only(
  "logika wyspy jest niezależna od profilu; próg mierzy setViewportSize",
);

let INDEX: OffersIndex = { offers: [], locations: { nodes: [], streets: {} } };
let TEXTS: Record<string, string> = {};
test.beforeAll(async ({ request }) => {
  INDEX = (await (
    await request.get(`${OFFERS_PATH}index.json`)
  ).json()) as OffersIndex;
  TEXTS = (await (
    await request.get(`${OFFERS_PATH}index-text.json`)
  ).json()) as Record<string, string>;
});

const ALL = () => INDEX.offers;
const NODES = () => INDEX.locations.nodes;

/** Numery WIDOCZNYCH kart (poza `li[hidden]`), w kolejności DOM. */
const visible = (page: Page) =>
  page
    .locator("[data-offers-grid] > li:not([hidden]) [data-offer-card]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-offer-card")));

const url = (page: Page) =>
  page.evaluate(() => location.pathname + location.search);

/** Stan z adresu strony — tak, jak czyta go wyspa. */
const stateAt = (path: string) => {
  const u = new URL(path, "http://x");
  return parseSearch(u.pathname, u.search);
};

async function expectListToMatch(page: Page, path: string) {
  const r = runSearch(ALL(), stateAt(path), TEXTS);
  await expect(page.locator("[data-offers-count]")).toHaveAttribute(
    "data-offers-count",
    String(r.total),
  );
  expect(await visible(page), path).toEqual(r.items.map((e) => e.number));
  const counts = await page
    .locator("[data-status-group] small")
    .evaluateAll((els) =>
      els.map((el) => Number(el.textContent?.replace(/\D/g, ""))),
    );
  expect(counts, `liczniki statusu ${path}`).toEqual(
    STATUS_GROUPS.map((g) => r.counts[g]),
  );
  return r;
}

const median = (xs: number[]) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

test.describe("hydratacja", () => {
  test("wejście bez parametrów: zero mutacji siatki po sparsowaniu, CLS < 0,05", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await page.addInitScript(() => {
      const w = window as unknown as {
        __gridMutations: string[];
        __cls: number;
      };
      w.__gridMutations = [];
      w.__cls = 0;
      let armed = false;
      const mo = new MutationObserver((records) => {
        if (!armed) return;
        for (const m of records) {
          const t =
            m.target.nodeType === 1
              ? (m.target as Element)
              : m.target.parentElement;
          if (t?.closest("[data-offers-grid]"))
            w.__gridMutations.push(`${m.type}:${m.attributeName ?? ""}`);
        }
      });
      mo.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      // parsowanie dodaje węzły siatki — uzbrajamy obserwator dopiero po
      // zakończeniu parsowania (przed skryptami deferred i hydratacją)
      document.addEventListener("readystatechange", () => {
        if (document.readyState === "interactive") {
          mo.takeRecords();
          armed = true;
        }
      });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        })[]) {
          if (!e.hadRecentInput) w.__cls += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await gotoReady(page, OFFERS_PATH);
    await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
    await settle(page, 300);
    const result = await page.evaluate(() => {
      const w = window as unknown as {
        __gridMutations: string[];
        __cls: number;
      };
      return { mutations: w.__gridMutations, cls: w.__cls };
    });
    expect(result.mutations).toEqual([]);
    expect(result.cls).toBeLessThan(0.05);
    // stan domyślny = SSR: wszystkie karty trasy w DOM, pierwsza strona widoczna
    await expect(page.locator("[data-offer-card]")).toHaveCount(OFFERS.length);
    await expectListToMatch(page, OFFERS_PATH);
  });
});

test.describe("filtry z adresu = runSearch", () => {
  test("każdy filtr zawęża albo zostawia liczbę wyników (adres → wyspa)", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    const all = ALL();
    const withStreet = all.find((e) => e.location.street);
    const word =
      Object.values(TEXTS)
        .flatMap((t) => t.split(" "))
        .find((w) => /^[a-z]{6,}$/.test(w)) ?? "garaz";
    const params = [
      "typ=mieszkanie",
      "transakcja=wynajem",
      "typ=dom&transakcja=sprzedaz",
      `lokalizacja=${encodeURIComponent(all[0].location.nodeId.split("/").slice(0, 3).join("/"))}`,
      withStreet
        ? `lokalizacja=${encodeURIComponent(withStreet.location.nodeId)}&ulica=${encodeURIComponent(withStreet.location.street!)}`
        : "ulica=brak-lokalizacji",
      `cena-od=${median(all.map((e) => e.price ?? 0))}`,
      `cena-do=${median(all.map((e) => e.price ?? 0))}`,
      `pow-od=${median(all.map((e) => e.area))}`,
      `pow-do=${median(all.map((e) => e.area))}`,
      `opis=${encodeURIComponent(word)}`,
      `numer=${all[0].number.toLowerCase()}`,
      "pokoje-od=2&pokoje-do=3",
      "pietro-od=0&pietro-do=0",
      "rok-od=2000",
      "rynek=wtorny",
      "winda=tak",
      "winda=nie",
      "umeblowane=tak",
      "pieter-do=4",
      "status=aktywna",
      "status=",
      "typ=zamek",
      "sort=priceAsc&strona=1",
    ];
    for (const q of params) {
      const path = `${OFFERS_PATH}?${q}`;
      await gotoReady(page, path);
      const r = await expectListToMatch(page, path);
      expect(r.total, q).toBeLessThanOrEqual(all.length);
    }
  });

  test("lista SSG z lokalizacją po hydratacji = dokładnie zbiór SSG (R18)", async ({
    page,
  }) => {
    const locList = ROUTES.lists.find((p) => p.split("/").length === 5);
    test.skip(!locList, NO_OFFERS);
    await gotoReady(page, locList!);
    const expected = OFFERS.filter((o) => listPath(o) === locList)
      .map((o) => o.number)
      .sort();
    expect((await visible(page)).sort()).toEqual(expected);
    await expect(page.locator("[data-offers-count]")).toHaveAttribute(
      "data-offers-count",
      String(expected.length),
    );
    // chip w panelu = lokalizacja z adresu
    await expect(page.locator("[data-offers-chips]")).toContainText(
      OFFERS.find((o) => listPath(o) === locList)!.location.placeName,
    );
  });
});

test.describe("panel: draft, licznik na żywo, pushState", () => {
  test("typ → transakcja → lokalizacja → cena: licznik, adres SSG, odświeżenie, wstecz/dalej", async ({
    page,
  }) => {
    const o = pickOffer({ mainType: "mieszkanie", transaction: "sprzedaz" });
    test.skip(!o, "brak mieszkania na sprzedaż w data/");
    await gotoReady(page, OFFERS_PATH);
    const apply = page.locator("[data-offers-apply]");
    const panel = page.locator("[data-offers-panel]");

    // typ: licznik na żywo = applyFilters(draft) PRZED „Pokaż"
    await panel
      .getByRole("button", { name: TYPE_LABEL.mieszkanie, exact: true })
      .click();
    const nType = applyFilters(
      ALL(),
      { ...stateAt(OFFERS_PATH), mainType: "mieszkanie" },
      TEXTS,
    ).length;
    await expect(apply).toHaveText(formatShowCount(nType));
    await apply.click();
    expect(await url(page)).toBe(`${OFFERS_PATH}?typ=mieszkanie`);
    await expectListToMatch(page, `${OFFERS_PATH}?typ=mieszkanie`);

    // transakcja: typ ∧ transakcja → ścieżka listy SSG, bez parametrów
    await panel.getByRole("button", { name: "Sprzedaż", exact: true }).click();
    await apply.click();
    const kindPath = listPath(o!, { withLocation: false });
    expect(await url(page)).toBe(kindPath);
    await expectListToMatch(page, kindPath);
    await expect(page.locator("main h1")).not.toHaveText("Oferty");

    // lokalizacja przez autocomplete: liść → ścieżka slugu, inaczej parametr
    const entry = ALL().find((e) => e.number === o!.number)!;
    const node = nodeById(NODES(), entry.location.nodeId)!;
    const label = nodeLabel(node);
    // ostatnie słowo etykiety (dzielnica) — jednoznaczne w ≤ 8 podpowiedziach
    await page.locator("#op-loc").fill(label.split(" ").pop()!.slice(0, 6));
    const option = page
      .getByRole("option", { name: new RegExp(`^${label}`) })
      .first();
    await expect(option).toBeVisible();
    await option.click();
    await expect(page.locator("[data-offers-chips]")).toContainText(label);
    await page.locator("[data-offers-more]").click();
    await expect(page.locator("#op-ulica")).toBeEnabled();
    await apply.click();
    const expectedTarget = targetPath(
      { ...stateAt(kindPath), location: node.id },
      ALL(),
      NODES(),
    );
    const expectedQs = serializeSearch(
      expectedTarget.state,
      expectedTarget.pathState,
    ).toString();
    const expectedUrl =
      expectedTarget.pathname + (expectedQs ? `?${expectedQs}` : "");
    expect(await url(page)).toBe(expectedUrl);
    if (isLeaf(NODES(), node.id))
      expect(expectedUrl).not.toContain("lokalizacja=");
    await expectListToMatch(page, expectedUrl);

    // cena + Enter → parametr na tej samej ścieżce
    const price = median(ALL().map((e) => e.price ?? 0));
    const priceInput = panel.locator('input[placeholder="od"]').first();
    await priceInput.fill(String(price));
    await priceInput.press("Enter");
    const afterPrice = await url(page);
    expect(afterPrice).toContain(`cena-od=${price}`);
    await expectListToMatch(page, afterPrice);

    // odświeżenie odtwarza kontrolki i listę
    await page.reload({ waitUntil: "networkidle" });
    await expectListToMatch(page, afterPrice);
    await expect(
      panel.getByRole("button", { name: TYPE_LABEL.mieszkanie, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(priceInput).toHaveValue(String(price));
    await expect(page.locator("[data-offers-chips]")).toContainText(label);

    // wstecz / dalej
    await page.goBack();
    await settle(page, 200);
    expect(await url(page)).toBe(expectedUrl);
    await expectListToMatch(page, expectedUrl);
    await page.goForward();
    await settle(page, 200);
    expect(await url(page)).toBe(afterPrice);
    await expectListToMatch(page, afterPrice);

    // Wyczyść = zeruje i stosuje: /oferty/ bez parametrów
    await panel.getByRole("button", { name: "Wyczyść" }).click();
    expect(await url(page)).toBe(OFFERS_PATH);
    await expectListToMatch(page, OFFERS_PATH);
  });

  test("więcej filtrów: pokoje, winda, zależność pól od typu; usunięcie chipa", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    const panel = page.locator("[data-offers-panel]");
    const more = page.locator("[data-offers-more]");
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#op-more")).toBeVisible();
    await panel.getByRole("button", { name: "2", exact: true }).click();
    await panel
      .getByRole("button", { name: "Tak", exact: true })
      .first()
      .click();
    await page.locator("[data-offers-apply]").click();
    const u = await url(page);
    expect(u).toContain("pokoje-od=2");
    expect(u).toContain("pokoje-do=2");
    expect(u).toContain("winda=tak");
    await expectListToMatch(page, u);
    // działka: pokoje, piętro, winda, umeblowanie znikają z panelu
    await panel
      .getByRole("button", { name: TYPE_LABEL.dzialka, exact: true })
      .click();
    await expect(page.locator("#op-pok-l")).toHaveCount(0);
    await expect(page.locator("#op-winda-l")).toHaveCount(0);
    await expect(page.locator("#op-rynek-l")).toHaveCount(1);
    await page.locator("[data-offers-apply]").click();
    const u2 = await url(page);
    expect(u2).not.toContain("pokoje-od");
    expect(u2).not.toContain("winda=");
    await expectListToMatch(page, u2);
    // ulica nieaktywna bez lokalizacji
    await expect(page.locator("#op-ulica")).toBeDisabled();
  });
});

test.describe("pigułki statusu, sortowanie, paginacja, zero wyników", () => {
  test("pigułki statusu przełączają filtr i adres; wszystkie wyłączone = zero wyników", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    const pill = (g: string) => page.locator(`[data-status-group="${g}"]`);
    await pill("archiwalne").click();
    expect(await url(page)).toBe(`${OFFERS_PATH}?status=aktywna%2Crezerwacja`);
    await expect(pill("archiwalne")).toHaveAttribute("aria-pressed", "false");
    await expectListToMatch(page, `${OFFERS_PATH}?status=aktywna%2Crezerwacja`);
    await pill("aktywna").click();
    await pill("rezerwacja").click();
    expect(await url(page)).toBe(`${OFFERS_PATH}?status=`);
    await expect(page.locator("[data-offers-zero]")).toBeVisible();
    await expect(page.locator("[data-offers-count]")).toHaveAttribute(
      "data-offers-count",
      "0",
    );
    await pill("archiwalne").click();
    await expectListToMatch(page, `${OFFERS_PATH}?status=archiwalne`);
  });

  test("sortowanie: kolejność = sortEntries dla 4 kluczy; listbox z klawiatury", async ({
    page,
  }) => {
    test.skip(OFFERS.length < 2, "za mało ofert, by sprawdzić kolejność");
    for (const key of SORT_KEYS) {
      const path = `${OFFERS_PATH}?sort=${key}`;
      await gotoReady(page, path);
      expect(await visible(page), key).toEqual(
        sortEntries(ALL(), key)
          .slice(0, PAGE_SIZE)
          .map((e) => e.number),
      );
      await expect(page.locator("[data-sort-label]")).toHaveText(
        SORT_LABEL[key],
      );
    }
    await gotoReady(page, OFFERS_PATH);
    const btn = page.locator(".ol-sort-btn");
    await btn.focus();
    await page.keyboard.press("Enter");
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.locator('[role="option"][aria-selected="true"]'),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    expect(await url(page)).toBe(`${OFFERS_PATH}?sort=oldest`);
    await expect(btn).toBeFocused();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await btn.click();
    // render Preact jest asynchroniczny — Escape dopiero, gdy fokus jest na opcji
    await expect(
      page.locator('[role="option"][aria-selected="true"]'),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    await expect(btn).toBeFocused();
    expect(await visible(page)).toEqual(
      sortEntries(ALL(), "oldest")
        .slice(0, PAGE_SIZE)
        .map((e) => e.number),
    );
  });

  test("paginacja: 12 widocznych, reszta hidden, ?strona=N, skrajne wyłączone, poza zakresem", async ({
    page,
  }) => {
    test.skip(
      OFFERS.length <= PAGE_SIZE,
      `≤ ${PAGE_SIZE} ofert w data/ — jedna strona`,
    );
    await gotoReady(page, OFFERS_PATH);
    const sorted = sortEntries(ALL(), "newest");
    const pages = Math.ceil(sorted.length / PAGE_SIZE);
    const nav = page.locator("[data-offers-pagination]");
    await expect(nav).toBeVisible();
    await expect(nav.locator("li")).toHaveCount(pages);
    await expect(nav.locator('[aria-current="page"]')).toHaveText("1");
    await expect(nav.getByText("Poprzednia strona")).toBeAttached();
    await expect(nav.locator('[aria-disabled="true"]')).toHaveCount(1);
    expect(await visible(page)).toEqual(
      sorted.slice(0, PAGE_SIZE).map((e) => e.number),
    );
    await expect(page.locator("[data-offers-grid] > li[hidden]")).toHaveCount(
      sorted.length - PAGE_SIZE,
    );
    await nav.getByRole("link", { name: "Strona 2" }).click();
    expect(await url(page)).toBe(`${OFFERS_PATH}?strona=2`);
    expect(await visible(page)).toEqual(
      sorted.slice(PAGE_SIZE, 2 * PAGE_SIZE).map((e) => e.number),
    );
    await expect(
      nav.getByRole("link", { name: "Poprzednia strona" }),
    ).toHaveAttribute("href", OFFERS_PATH);
    await page.goBack();
    await settle(page, 200);
    expect(await visible(page)).toEqual(
      sorted.slice(0, PAGE_SIZE).map((e) => e.number),
    );
    // poza zakresem: nagłówek z liczbą, zero widocznych (parytet)
    await gotoReady(page, `${OFFERS_PATH}?strona=99`);
    await expect(page.locator("[data-offers-count]")).toHaveAttribute(
      "data-offers-count",
      String(sorted.length),
    );
    expect(await visible(page)).toEqual([]);
    await expect(page.locator("[data-offers-page-empty]")).toBeVisible();
  });

  test("zero wyników: nagłówek i trzy podpowiedzi (parytet)", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, `${OFFERS_PATH}?numer=SW000000`);
    const zero = page.locator("[data-offers-zero]");
    await expect(zero.locator("h2")).toHaveText(ZERO_RESULTS.heading);
    await expect(zero.locator("li")).toHaveText([...ZERO_RESULTS.hints]);
    await expect(page.locator("[data-offers-count]")).toHaveAttribute(
      "data-offers-count",
      "0",
    );
    await expect(page.locator("[data-offer-card]")).toHaveCount(0);
  });
});

test.describe("bez JS, próg, sieć, a11y", () => {
  test("surowy HTML: panel w SSR, karty od 13. hidden, noscript odkrywa, paginacja tylko > 12", async ({
    request,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    const raw = await (await request.get(OFFERS_PATH)).text();
    expect(raw).toContain("data-offers-panel");
    expect((raw.match(/<li hidden/g) ?? []).length).toBe(
      Math.max(0, OFFERS.length - PAGE_SIZE),
    );
    expect(raw).toMatch(
      /<noscript>\s*<style>[\s\S]*li\[hidden\][\s\S]*<\/style>\s*<\/noscript>/,
    );
    expect(raw.includes("data-offers-pagination")).toBe(
      OFFERS.length > PAGE_SIZE,
    );
    expect(raw).toContain("astro-island");
    expect(raw).toContain('client="load"');
  });

  test("kolejność DOM = kolejność na ekranie: nagłówek → nawigacja (a) → panel → pasek → siatka (bez CSS order — CLS na mobile)", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    const kindList =
      ROUTES.lists.find((p) => p.split("/").length === 4) ?? OFFERS_PATH;
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReady(page, kindList);
    const order = await page.evaluate(() => {
      const sel = [
        ".ol-head",
        "nav.ol-nav",
        "[data-offers-panel]",
        ".ol-tools",
        "[data-offers-grid]",
      ];
      const els = sel.map((s) => document.querySelector(s)!);
      const domOk = els.every(
        (el, i) =>
          i === 0 ||
          Boolean(
            els[i - 1].compareDocumentPosition(el) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
      );
      const noOrder = els.every((el) => getComputedStyle(el).order === "0");
      const tops = els
        .filter((el) => getComputedStyle(el).display !== "none")
        .map((el) => el.getBoundingClientRect().top);
      const visualOk = tops.every((t, i) => i === 0 || t >= tops[i - 1]);
      return { domOk, noOrder, visualOk };
    });
    expect(order).toEqual({ domOk: true, noOrder: true, visualOk: true });
  });

  test("próg 1025: nawigacja (a) poniżej, panel od progu", async ({ page }) => {
    await gotoReady(page, OFFERS_PATH);
    await expectBreakpointFlip(
      page,
      DESKTOP_MIN_PX,
      { nav: ".ol-nav", panel: ".op", sort: ".ol-sort" },
      { nav: "flex", panel: "none", sort: "none" },
      { nav: "none", panel: "block", sort: "block" },
    );
  });

  test("zero żądań do podmiotów trzecich także po interakcjach", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    const hosts = new Set<string>();
    page.on("request", (req) => hosts.add(new URL(req.url()).host));
    const kindList =
      ROUTES.lists.find((p) => p.split("/").length === 4) ?? OFFERS_PATH;
    await gotoReady(page, kindList);
    await page.locator("[data-offers-more]").click();
    await page
      .locator("[data-offers-panel]")
      .getByRole("button", { name: "Wszystkie", exact: true })
      .first()
      .click();
    await page.locator("[data-offers-apply]").click();
    await page.locator("#op-opis").fill("a");
    await settle(page, 400);
    const allowed = new Set([
      new URL(page.url()).host,
      ...(MEDIA_BASE ? [new URL(MEDIA_BASE).host] : []),
    ]);
    expect([...hosts].filter((h) => !allowed.has(h))).toEqual([]);
  });

  test("axe: panel rozwinięty, podpowiedzi i listbox otwarte — zero naruszeń critical/serious", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    await page.locator("[data-offers-more]").click();
    await page.locator("#op-loc").fill(ALL()[0].location.city.slice(0, 3));
    await expect(page.locator("#op-loc-list")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );
    expect(
      serious.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);
    await page.locator("#op-loc").press("Escape");
    await page.locator(".ol-sort-btn").click();
    const results2 = await new AxeBuilder({ page }).analyze();
    expect(
      results2.violations
        .filter((v) => ["critical", "serious"].includes(v.impact ?? ""))
        .map((v) => v.id),
    ).toEqual([]);
  });
});
