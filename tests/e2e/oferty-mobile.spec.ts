// `/oferty/` na mobile i tablecie (4.2 c) — dane PRODUKCYJNE, oczekiwania
// liczone `runSearch` na pobranym `/oferty/index.json` (odporność na skład
// ofert: `pickOffer` + `test.skip`). Kontrakty: pasek narzędzi „Filtruj" /
// „{sortowanie}" < 1025, panel inline NIEOBECNY, nawigacja (a) ukryta pod
// JS; sheety na overlay.ts (otwarcie, X, Esc, scrim, swipe-down,
// focus-trap, blokada scrolla `body{position:fixed}` z powrotem pozycji);
// „Pokaż" z sheetu = ten sam adres i wynik co `runSearch`, draft wspólny;
// „Sortuj" → „Zastosuj" vs porzucenie; przejście na desktop domyka sheet
// i przywraca panel inline; pigułki statusu i paginacja na mobile; tablet
// 768–1024 (karta w wierszu, sheet); flip progu 1025 (R33); zero żądań do
// podmiotów trzecich po interakcjach; axe z otwartymi sheetami. Profile:
// chromium-pixel-5 i webkit-iphone-14 (tablet przez setViewportSize).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  applyFilters,
  PAGE_SIZE,
  parseSearch,
  runSearch,
  sortEntries,
  STATUS_GROUPS,
} from "../../src/lib/offers/filters";
import { formatShowCount, TYPE_LABEL } from "../../src/lib/offers/format";
import type { OffersIndex } from "../../src/lib/offers/index-entry";
import { PANEL, SORT_LABEL } from "../../src/lib/offers/offers-ui";
import { OFFERS_PATH } from "../../src/lib/offers/urls";
import {
  DESKTOP_MIN_PX,
  MEDIA_BASE,
  TABLET_MIN_PX,
} from "../../src/lib/site-config";
import { ABSENT, expectBreakpointFlip } from "../helpers/breakpoint";
import { useMediaStub, usePreviewGuard } from "../helpers/guards";
import { pickOffer, readOffersTyped } from "../helpers/offers";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";

const OFFERS = readOffersTyped();
const NO_OFFERS = "brak ofert w data/ (zero ofert = stan dopuszczalny)";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const FILTERS = "#ol-sheet-filters";
const SORT = "#ol-sheet-sort";
/** wjazd panelu sheetu (transform .42 s) — przed pomiarem geometrii */
const SHEET_IN_MS = 600;

usePreviewGuard();
useMediaStub();
// eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
test.beforeEach(async ({}, testInfo) => {
  test.skip(
    !MOBILE_PROJECTS.includes(testInfo.project.name),
    "sheety i pasek narzędzi — profile mobilne (tablet przez setViewportSize)",
  );
});

let INDEX: OffersIndex = { offers: [], locations: { nodes: [], streets: {} } };
test.beforeAll(async ({ request }) => {
  INDEX = (await (
    await request.get(`${OFFERS_PATH}index.json`)
  ).json()) as OffersIndex;
});
const ALL = () => INDEX.offers;

const visible = (page: Page) =>
  page
    .locator("[data-offers-grid] > li:not([hidden]) [data-offer-card]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-offer-card")));
const url = (page: Page) =>
  page.evaluate(() => location.pathname + location.search);
const stateAt = (path: string) => {
  const u = new URL(path, "http://x");
  return parseSearch(u.pathname, u.search);
};
async function expectListToMatch(page: Page, path: string) {
  const r = runSearch(ALL(), stateAt(path), {});
  await expect(page.locator("[data-offers-count]")).toHaveAttribute(
    "data-offers-count",
    String(r.total),
  );
  expect(await visible(page), path).toEqual(r.items.map((e) => e.number));
  return r;
}

async function openSheet(page: Page, kind: "filters" | "sort") {
  await page
    .locator(
      kind === "filters" ? "[data-offers-filters]" : "[data-offers-sort-btn]",
    )
    .click();
  const sheet = page.locator(kind === "filters" ? FILTERS : SORT);
  await expect(sheet).toHaveClass(/is-open/);
  return sheet;
}

test.describe("pasek narzędzi i sheet filtrów", () => {
  test("< 1025: Filtruj + bieżące sortowanie; panel inline nieobecny; nawigacja (a) i sortowanie desktop ukryte", async ({
    page,
  }) => {
    await gotoReady(page, OFFERS_PATH);
    const tools = page.locator("[data-offers-mtools]");
    await expect(tools).toBeVisible();
    await expect(page.locator("[data-offers-filters]")).toHaveText(
      PANEL.filters,
    );
    await expect(page.locator("[data-sort-current]")).toHaveText(
      SORT_LABEL.newest,
    );
    await expect(page.locator("[data-offers-panel]")).toHaveCount(0);
    await expect(page.locator("nav.ol-nav")).toBeAttached();
    await expect(page.locator("nav.ol-nav")).toBeHidden();
    await expect(page.locator(".ol-sort")).toBeHidden();
    await expect(page.locator("[data-offers-view]")).toBeHidden();
    // powłoki sheetów powstają dopiero przy pierwszym otwarciu (chunk
    // ładowany dynamicznie) — nie ma ich w DOM po wejściu
    await expect(page.locator("[data-overlay][data-sheet]")).toHaveCount(0);
  });

  test("Filtruj otwiera dialog z panelem; X zamyka", async ({ page }) => {
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "filters");
    await expect(sheet).toHaveAttribute("role", "dialog");
    await expect(sheet.locator("h2")).toHaveText(PANEL.filtersSheet);
    await expect(sheet.locator("[data-offers-panel]")).toBeVisible();
    await expect(sheet.locator(".op--sheet")).toHaveCount(1);
    await expect(page.locator("[data-offers-filters]")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // panel istnieje TYLKO w sheecie (jeden SearchPanel, bez duplikatu)
    await expect(page.locator("[data-offers-panel]")).toHaveCount(1);
    await sheet.locator("[data-overlay-close]").click();
    await expect(sheet).toBeHidden();
    await expect(page.locator("[data-offers-filters]")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.locator("[data-offers-panel]")).toHaveCount(0);
  });

  test("Escape i klik w scrim zamykają sheet", async ({ page }) => {
    await gotoReady(page, OFFERS_PATH);
    let sheet = await openSheet(page, "filters");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    sheet = await openSheet(page, "filters");
    await page.waitForTimeout(SHEET_IN_MS);
    await sheet.click({ position: { x: 10, y: 10 } });
    await expect(sheet).toBeHidden();
  });

  test("swipe-down za uchwyt zamyka sheet (gest overlay.ts)", async ({
    page,
  }) => {
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "filters");
    await page.waitForTimeout(SHEET_IN_MS);
    const box = await sheet.locator("[data-overlay-drag]").boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + 8;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + i * 25);
    await page.mouse.up();
    await expect(sheet).toBeHidden();
  });

  test("blokada scrolla: body fixed przy otwartym sheecie, pozycja wraca po zamknięciu", async ({
    page,
  }) => {
    test.skip(OFFERS.length < 3, "za mało ofert, by strona była przewijalna");
    await gotoReady(page, OFFERS_PATH);
    // niewielkie przewinięcie: przycisk „Filtruj" ma zostać w kadrze
    // (klik w element poza kadrem przewinąłby stronę przed otwarciem)
    await scrollPageTo(page, 60);
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBe(60);
    const sheet = await openSheet(page, "filters");
    expect(await page.evaluate(() => document.body.style.position)).toBe(
      "fixed",
    );
    expect(await page.evaluate(() => document.body.style.top)).toBe(
      `-${before}px`,
    );
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await settle(page, 200);
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("focus-trap: Tab krąży wewnątrz sheetu", async ({
    page,
    browserName,
  }) => {
    // WebKit nie przenosi fokusu Tabem po przyciskach (jak w navigation.spec)
    test.skip(browserName === "webkit", "WebKit: Tab pomija przyciski");
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "filters");
    await page.waitForTimeout(SHEET_IN_MS);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(
        (id) => !!document.activeElement?.closest(id),
        FILTERS,
      );
      expect(inside, `Tab ×${i + 1}`).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("Pokaż z sheetu: licznik na żywo, adres i lista = runSearch, sheet zamknięty; draft wspólny; Wyczyść zostawia sheet", async ({
    page,
  }) => {
    const o = pickOffer({ mainType: "mieszkanie" });
    test.skip(!o, "brak mieszkania w data/");
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "filters");
    await sheet
      .getByRole("button", { name: TYPE_LABEL.mieszkanie, exact: true })
      .click();
    const n = applyFilters(
      ALL(),
      { ...stateAt(OFFERS_PATH), mainType: "mieszkanie" },
      {},
    ).length;
    const apply = sheet.locator("[data-offers-apply]");
    await expect(apply).toHaveText(formatShowCount(n));
    await apply.click();
    await expect(sheet).toBeHidden();
    expect(await url(page)).toBe(`${OFFERS_PATH}?typ=mieszkanie`);
    await expectListToMatch(page, `${OFFERS_PATH}?typ=mieszkanie`);
    // ponowne otwarcie: ten sam draft (pigułka wciśnięta)
    await openSheet(page, "filters");
    await expect(
      sheet.getByRole("button", { name: TYPE_LABEL.mieszkanie, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    // Wyczyść: zeruje i stosuje, sheet zostaje otwarty (R30)
    await sheet.getByRole("button", { name: PANEL.clear }).click();
    await expect(sheet).toHaveClass(/is-open/);
    expect(await url(page)).toBe(OFFERS_PATH);
    await expect(apply).toHaveText(formatShowCount(ALL().length));
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expectListToMatch(page, OFFERS_PATH);
  });

  test("Więcej filtrów w sheecie: pełny wiersz z podpowiedzią, rozwija pola rozszerzone", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "filters");
    const more = sheet.locator("[data-offers-more]");
    await expect(more).toContainText(PANEL.moreHint);
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expect(more).not.toContainText(PANEL.moreHint);
    await expect(sheet.locator("#op-more")).toBeVisible();
    await expect(sheet.locator("#op-pok-l")).toHaveCount(1);
    // akcje nie są w siatce panelu — tylko w stopce sheetu
    await expect(sheet.locator("[data-offers-apply]")).toHaveCount(1);
    await expect(sheet.locator(".ols-foot [data-offers-apply]")).toHaveCount(1);
  });
});

test.describe("sheet sortowania", () => {
  test("Zastosuj stosuje wybór (adres, etykieta, kolejność); Esc porzuca", async ({
    page,
  }) => {
    test.skip(OFFERS.length < 2, "za mało ofert, by sprawdzić kolejność");
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "sort");
    await expect(sheet.locator("h2")).toHaveText(PANEL.sortSheet);
    await expect(sheet.locator('[data-sort-option="newest"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sheet.locator('[data-sort-option="oldest"]').click();
    await expect(sheet.locator('[data-sort-option="oldest"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sheet.locator("[data-offers-sort-apply]").click();
    await expect(sheet).toBeHidden();
    expect(await url(page)).toBe(`${OFFERS_PATH}?sort=oldest`);
    await expect(page.locator("[data-sort-current]")).toHaveText(
      SORT_LABEL.oldest,
    );
    expect(await visible(page)).toEqual(
      sortEntries(ALL(), "oldest")
        .slice(0, PAGE_SIZE)
        .map((e) => e.number),
    );
    // porzucenie: wybór tymczasowy nie zmienia stanu
    await openSheet(page, "sort");
    await expect(sheet.locator('[data-sort-option="oldest"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sheet.locator('[data-sort-option="priceAsc"]').click();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    expect(await url(page)).toBe(`${OFFERS_PATH}?sort=oldest`);
    await expect(page.locator("[data-sort-current]")).toHaveText(
      SORT_LABEL.oldest,
    );
  });
});

test.describe("próg, tablet, statusy, paginacja", () => {
  test("przejście na desktop domyka sheet, odblokowuje scroll i przywraca panel inline", async ({
    page,
  }) => {
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "filters");
    expect(await page.evaluate(() => document.body.style.position)).toBe(
      "fixed",
    );
    const height = page.viewportSize()?.height ?? 800;
    await page.setViewportSize({ width: DESKTOP_MIN_PX, height });
    await expect(sheet).toBeHidden();
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
    await expect(page.locator(".op:not(.op--sheet)")).toBeVisible();
    await expect(page.locator("[data-offers-mtools]")).toBeHidden();
  });

  test("flip progu 1025: pasek narzędzi ↔ panel inline, widok, sortowanie (R33)", async ({
    page,
  }) => {
    await gotoReady(page, OFFERS_PATH);
    await expectBreakpointFlip(
      page,
      DESKTOP_MIN_PX,
      {
        mtools: "[data-offers-mtools]",
        panel: ".op",
        view: ".ol-dtools",
        sort: ".ol-sort",
      },
      { mtools: "grid", panel: ABSENT, view: "none", sort: "none" },
      { mtools: "none", panel: "block", view: "flex", sort: "block" },
    );
  });

  test("tablet 768–1024: pasek narzędzi, karta w wierszu, sheet działa", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await page.setViewportSize({ width: 900, height: 1200 });
    await gotoReady(page, OFFERS_PATH);
    await expect(page.locator("[data-offers-mtools]")).toBeVisible();
    expect(
      await page
        .locator(".oc-link")
        .first()
        .evaluate((el) => getComputedStyle(el).flexDirection),
    ).toBe("row");
    expect(900).toBeGreaterThanOrEqual(TABLET_MIN_PX);
    const sheet = await openSheet(page, "filters");
    await expect(sheet.locator("[data-offers-panel]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("pigułki statusu i paginacja działają na mobile", async ({ page }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    await page.locator('[data-status-group="archiwalne"]').click();
    expect(await url(page)).toBe(`${OFFERS_PATH}?status=aktywna%2Crezerwacja`);
    await expectListToMatch(page, `${OFFERS_PATH}?status=aktywna%2Crezerwacja`);
    await page.locator('[data-status-group="archiwalne"]').click();
    await expectListToMatch(page, OFFERS_PATH);
    const counts = await page
      .locator("[data-status-group] small")
      .evaluateAll((els) =>
        els.map((el) => Number(el.textContent?.replace(/\D/g, ""))),
      );
    expect(counts.reduce((a, b) => a + b, 0)).toBe(OFFERS.length);
    expect(counts.length).toBe(STATUS_GROUPS.length);
    test.skip(
      OFFERS.length <= PAGE_SIZE,
      `≤ ${PAGE_SIZE} ofert w data/ — jedna strona`,
    );
    const nav = page.locator("[data-offers-pagination]");
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Strona 2" }).click();
    expect(await url(page)).toBe(`${OFFERS_PATH}?strona=2`);
    await expectListToMatch(page, `${OFFERS_PATH}?strona=2`);
  });
});

test.describe("surowy HTML, sieć, a11y", () => {
  test("surowy HTML: pasek narzędzi w SSR, noscript chowa go i odkrywa nawigację, powłok sheetów nie ma", async ({
    request,
  }) => {
    const raw = await (await request.get(OFFERS_PATH)).text();
    expect(raw).toContain("data-offers-mtools");
    expect(raw).toMatch(
      /<noscript>\s*<style>[\s\S]*\.ol-mtools[\s\S]*<\/style>/,
    );
    expect(raw).toMatch(/<noscript>\s*<style>[\s\S]*\.ol-nav[\s\S]*<\/style>/);
    expect(raw).not.toContain("ol-sheet-filters");
    expect(raw).not.toContain("ol-sheet-sort");
  });

  test("zero żądań do podmiotów trzecich po interakcjach w sheetach", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    const hosts = new Set<string>();
    page.on("request", (req) => hosts.add(new URL(req.url()).host));
    await gotoReady(page, OFFERS_PATH);
    const sheet = await openSheet(page, "filters");
    await sheet.locator("[data-offers-more]").click();
    await sheet.locator("#op-opis").fill("a");
    await settle(page, 400);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await openSheet(page, "sort");
    await page.keyboard.press("Escape");
    const allowed = new Set([
      new URL(page.url()).host,
      ...(MEDIA_BASE ? [new URL(MEDIA_BASE).host] : []),
    ]);
    expect([...hosts].filter((h) => !allowed.has(h))).toEqual([]);
  });

  test("axe: otwarty sheet filtrów (rozwinięty) i sheet sortowania — zero naruszeń critical/serious", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    // przy otwartym sheecie skan obejmuje sam dialog: treść pod scrimem
    // i panelem jest zasłonięta (aria-modal), a axe liczyłby jej kontrast
    // przez nakładkę
    const serious = async (within?: string) =>
      (
        await (
          within
            ? new AxeBuilder({ page }).include(within)
            : new AxeBuilder({ page })
        ).analyze()
      ).violations
        .filter((v) => ["critical", "serious"].includes(v.impact ?? ""))
        .map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
    expect(await serious()).toEqual([]);
    const filters = await openSheet(page, "filters");
    await filters.locator("[data-offers-more]").click();
    await expect(filters.locator("#op-more")).toBeVisible();
    // skan po wjeździe sheetu (scrim .34 s, panel .42 s) — w trakcie
    // przejścia axe liczyłby kontrast przez opacity nakładki
    await page.waitForTimeout(SHEET_IN_MS);
    expect(await serious(FILTERS)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(filters).toBeHidden();
    await openSheet(page, "sort");
    await page.waitForTimeout(SHEET_IN_MS);
    expect(await serious(SORT)).toEqual([]);
  });
});
