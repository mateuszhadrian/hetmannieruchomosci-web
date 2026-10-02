// Lista ofert (4.2 a) na danych PRODUKCYJNYCH: `/oferty/` i listy SSG
// typ × transakcja [× lokalizacja] — nagłówek, licznik, komplet kart
// z danych (wszystkie w HTML, wzorzec E5), karta (link na detal, zdjęcie
// z wymiarami, cena z `format.ts`, parter, plakietki, „0% prowizji",
// „Nowość" względem `data-build-now`), nawigacja po listach SSG, indeks
// JSON (klucze ⊆ allow-listy), kontrakt progów 1025/768 (karta: wiersz na
// tablecie, kolumna na desktopie i telefonie), slot „Zadzwoń", zero żądań
// do podmiotów trzecich. Oferty przez helper + `pickOffer` + `test.skip`
// z powodem (skład `data/` zmienia się co noc); media zaślepione.
// Treść jest niezależna od profilu — biega na chromium-1920 (progi
// mierzone przez setViewportSize).
import { expect, test, type Page } from "@playwright/test";
import { buildPhoneHref } from "../../src/lib/contact-details";
import { INDEX_FIELDS } from "../../src/lib/offers/index-entry";
import { formatPrice } from "../../src/lib/offers/format";
import { isNewOffer } from "../../src/lib/offers/time-rules";
import { listPath, OFFERS_PATH, offerPath } from "../../src/lib/offers/urls";
import {
  DESKTOP_MIN_PX,
  MEDIA_BASE,
  TABLET_MIN_PX,
} from "../../src/lib/site-config";
import {
  collectPageIssues,
  useChromium1920Only,
  useMediaStub,
  usePreviewGuard,
} from "../helpers/guards";
import {
  describeCriteria,
  offerRoutesFromData,
  pickOffer,
  readOffersTyped,
  type OfferCriteria,
} from "../helpers/offers";
import { gotoReady, settle } from "../helpers/scroll";

const OFFERS = readOffersTyped();
const ROUTES = offerRoutesFromData();
const NO_OFFERS = "brak ofert w data/ (zero ofert = stan dopuszczalny)";
const SUBPIXEL_TOL_PX = 0.5;

usePreviewGuard();
useMediaStub();
useChromium1920Only(
  "treść listy jest niezależna od profilu; progi mierzy setViewportSize",
);

const card = (page: Page, number: string) =>
  page.locator(`[data-offer-card="${number}"]`);

/** Oferta o cesze albo skip z powodem. */
function need(criteria: OfferCriteria) {
  const o = pickOffer(criteria);
  test.skip(!o, `brak oferty: ${describeCriteria(criteria)} w data/`);
  return o!;
}

test.describe("/oferty/ — lista wszystkich ofert", () => {
  test("200, h1, licznik i komplet kart = oferty z data/ (bez błędów)", async ({
    page,
  }) => {
    const issues = collectPageIssues(page);
    const res = await page.goto(OFFERS_PATH, { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("main h1")).toHaveText("Oferty");
    await expect(page.locator("[data-offers-count]")).toHaveAttribute(
      "data-offers-count",
      String(OFFERS.length),
    );
    const cards = page.locator("[data-offer-card]");
    await expect(cards).toHaveCount(OFFERS.length);
    if (OFFERS.length === 0) {
      await expect(page.locator("[data-offers-empty]")).toBeVisible();
    }
    expect(issues()).toEqual([]);
  });

  test("każda karta linkuje na swój detal; kolejność = najnowsze (addedAt malejąco)", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    const numbers = await page
      .locator("[data-offer-card]")
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-offer-card")),
      );
    const expected = [...OFFERS]
      .sort(
        (a, b) =>
          b.addedAt.localeCompare(a.addedAt) ||
          a.number.localeCompare(b.number),
      )
      .map((o) => o.number);
    expect(numbers).toEqual(expected);
    for (const o of OFFERS) {
      await expect(card(page, o.number).locator("a.oc-link")).toHaveAttribute(
        "href",
        offerPath(o),
      );
    }
  });

  test("karta: zdjęcie główne z wymiarami i alt, cena z format.ts, numer, kicker", async ({
    page,
  }) => {
    const o = need({ minPhotos: 1 });
    await gotoReady(page, OFFERS_PATH);
    const c = card(page, o.number);
    const img = c.locator("img.oc-img");
    await expect(img).toHaveAttribute("width", String(o.photos[0].width));
    await expect(img).toHaveAttribute("height", String(o.photos[0].height));
    await expect(img).toHaveAttribute("alt", o.photos[0].alt);
    await expect(c.locator(".oc-amount")).toContainText(
      formatPrice(o.price, o.transaction, o.currency),
    );
    await expect(c.locator(".oc-num")).toHaveText(o.number);
    await expect(c.locator(".oc-kicker")).not.toBeEmpty();
    await expect(c.locator(".oc-title")).not.toBeEmpty();
    // liczba zdjęć w pastylce mediów
    await expect(c.locator(".oc-pill").first()).toContainText(
      String(o.photos.length),
    );
  });

  test("parter: piętro 0 jest wartością („parter”), nie brakiem", async ({
    page,
  }) => {
    const o = need({ floor: 0, mainType: "mieszkanie" });
    await gotoReady(page, OFFERS_PATH);
    await expect(card(page, o.number).locator(".oc-facts")).toContainText(
      "parter",
    );
  });

  for (const [status, label] of [
    ["sprzedana", "Sprzedane"],
    ["wynajeta", "Wynajęte"],
    ["rezerwacja", "Rezerwacja"],
  ] as const) {
    test(`plakietka „${label}” dla statusu ${status}`, async ({ page }) => {
      const o = need({ status });
      await gotoReady(page, OFFERS_PATH);
      await expect(
        card(page, o.number).locator(`.oc-badge[data-badge="${label}"]`),
      ).toBeVisible();
    });
  }

  test("„0% prowizji” z badges na karcie", async ({ page }) => {
    const o = need({ where: (x) => x.badges.some((b) => /^0\s?%/.test(b)) });
    await gotoReady(page, OFFERS_PATH);
    await expect(card(page, o.number).locator(".oc-tag")).toContainText("0%");
  });

  test("„Zapytaj o cenę” bez wiersza cena/m²", async ({ page }) => {
    const o = need({ priceOnRequest: true });
    await gotoReady(page, OFFERS_PATH);
    const c = card(page, o.number);
    await expect(c.locator(".oc-amount")).toContainText("Zapytaj o cenę");
    await expect(c.locator(".oc-ppm")).toHaveCount(0);
  });

  test("„Nowość” dokładnie wtedy, gdy isNewOffer względem data-build-now", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    const nowIso = await page
      .locator("[data-offers-list]")
      .getAttribute("data-build-now");
    expect(nowIso).toBeTruthy();
    const now = new Date(nowIso!);
    for (const o of OFFERS) {
      const expected = o.status === "aktywna" && isNewOffer(o.addedAt, now);
      await expect(
        card(page, o.number).locator('.oc-badge[data-badge="Nowość"]'),
        o.number,
      ).toHaveCount(expected ? 1 : 0);
    }
  });

  test("pigułki statusu: liczniki sumują się do liczby ofert", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    const counts = await page
      .locator("[data-status-group] small")
      .evaluateAll((els) =>
        els.map((el) => Number((el.textContent ?? "").replace(/\D/g, ""))),
      );
    expect(counts).toHaveLength(3);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(OFFERS.length);
  });

  test("nawigacja po listach SSG: jedna pozycja bieżąca, każdy link odpowiada < 400", async ({
    page,
    request,
  }) => {
    await gotoReady(page, OFFERS_PATH);
    await expect(
      page.locator('[data-offers-kinds] a[aria-current="page"]'),
    ).toHaveCount(1);
    const hrefs = await page
      .locator("nav.ol-nav a[href]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")!));
    expect(hrefs.length).toBeGreaterThan(0);
    const kinds = new Set(
      OFFERS.map((o) => listPath(o, { withLocation: false })),
    );
    expect(hrefs.length).toBe(1 + kinds.size);
    for (const href of hrefs) {
      expect((await request.get(href)).status(), href).toBeLessThan(400);
    }
  });

  test("CTA „Zadzwoń”: bez JS → /kontakt/, z JS → tel:", async ({
    page,
    request,
  }) => {
    const raw = await (await request.get(OFFERS_PATH)).text();
    expect(raw).toMatch(
      /<a[^>]*class="ol-btn"[^>]*data-tel[^>]*href="\/kontakt\/"/,
    );
    expect(raw).not.toContain("tel:+");
    await gotoReady(page, OFFERS_PATH);
    await expect(page.locator(".ol-cta a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
  });

  test("zero żądań do podmiotów trzecich przy wejściu", async ({ page }) => {
    const hosts = new Set<string>();
    page.on("request", (req) => hosts.add(new URL(req.url()).host));
    await gotoReady(page, OFFERS_PATH);
    const allowed = new Set([
      new URL(page.url()).host,
      ...(MEDIA_BASE ? [new URL(MEDIA_BASE).host] : []),
    ]);
    expect([...hosts].filter((h) => !allowed.has(h))).toEqual([]);
  });

  test("kontrakt progów: karta w wierszu na tablecie (768–1024), w kolumnie na telefonie i desktopie", async ({
    page,
  }) => {
    test.skip(OFFERS.length === 0, NO_OFFERS);
    await gotoReady(page, OFFERS_PATH);
    const direction = async () =>
      page
        .locator(".oc-link")
        .first()
        .evaluate((el) => getComputedStyle(el).flexDirection);
    const columns = async () =>
      page
        .locator("[data-offers-grid]")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        );
    for (const [width, expected] of [
      [TABLET_MIN_PX - 1, "column"],
      [TABLET_MIN_PX, "row"],
      [DESKTOP_MIN_PX - 1, "row"],
      [DESKTOP_MIN_PX, "column"],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await settle(page, 150);
      expect(await direction(), `${width} px`).toBe(expected);
    }
    // desktop ≥ 1025: siatka 3 kolumn przy 1366 px (design: maks. 3)
    await page.setViewportSize({ width: 1366, height: 900 });
    await settle(page, 150);
    if (OFFERS.length >= 3) expect(await columns()).toBe(3);
    // zdjęcie karty trzyma proporcje 3:2 w kolumnie (sub-pikselowo)
    const box = await page.locator(".oc-media").first().boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.width / box!.height - 1.5)).toBeLessThan(
      SUBPIXEL_TOL_PX / 100,
    );
  });
});

test.describe("listy SSG typ × transakcja [× lokalizacja]", () => {
  test("każda lista ma DOKŁADNIE oferty swojej kombinacji; nagłówek i lokalizacje", async ({
    page,
  }) => {
    test.skip(ROUTES.lists.length === 0, NO_OFFERS);
    // pierwsza lista rodzaju + pierwsza lista z lokalizacją (kontrakt
    // szablonu, nie konkretnych ofert)
    const kindList = ROUTES.lists.find((p) => p.split("/").length === 4)!;
    const locList = ROUTES.lists.find((p) => p.split("/").length === 5)!;
    for (const path of [kindList, locList]) {
      const res = await page.goto(path, { waitUntil: "networkidle" });
      expect(res?.status(), path).toBe(200);
      const expected = OFFERS.filter(
        (o) =>
          listPath(o) === path || listPath(o, { withLocation: false }) === path,
      )
        .map((o) => o.number)
        .sort();
      const cards = await page
        .locator("[data-offer-card]")
        .evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-offer-card")!),
        );
      expect(cards.sort(), path).toEqual(expected);
      await expect(page.locator("main h1")).not.toHaveText("Oferty");
      await expect(page.locator("[data-offers-count]")).toHaveAttribute(
        "data-offers-count",
        String(expected.length),
      );
      // pastylki lokalizacji: „Wszystkie" + każda lokalizacja rodzaju
      await expect(
        page.locator("[data-offers-locations] a").first(),
      ).toBeVisible();
      await expect(
        page.locator('[data-offers-locations] a[aria-current="page"]'),
      ).toHaveCount(1);
    }
    // nagłówek listy z lokalizacją niesie etykietę lokalizacji
    const first = OFFERS.find((o) => listPath(o) === locList)!;
    await expect(page.locator("main h1")).toContainText(
      first.location.placeName,
    );
  });
});

test.describe("indeks wyszukiwarki", () => {
  test("/oferty/index.json: JSON, wpis per oferta, klucze ⊆ INDEX_FIELDS, drzewo lokalizacji", async ({
    request,
  }) => {
    const res = await request.get(`${OFFERS_PATH}index.json`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    const idx = (await res.json()) as {
      offers: Record<string, unknown>[];
      locations: { nodes: unknown[] };
    };
    expect(idx.offers).toHaveLength(OFFERS.length);
    expect(Array.isArray(idx.locations.nodes)).toBe(true);
    for (const e of idx.offers) {
      for (const key of Object.keys(e)) {
        expect(INDEX_FIELDS as readonly string[], `klucz ${key}`).toContain(
          key,
        );
      }
      expect(e).not.toHaveProperty("descriptionHtml");
    }
    expect(idx.offers.map((e) => e.number).sort()).toEqual(
      OFFERS.map((o) => o.number).sort(),
    );
  });

  test("/oferty/index-text.json: tekst per numer, bez HTML", async ({
    request,
  }) => {
    const res = await request.get(`${OFFERS_PATH}index-text.json`);
    expect(res.status()).toBe(200);
    const texts = (await res.json()) as Record<string, string>;
    expect(Object.keys(texts).sort()).toEqual(
      OFFERS.map((o) => o.number).sort(),
    );
    for (const t of Object.values(texts)) expect(t).not.toMatch(/<[a-z]/i);
  });
});
