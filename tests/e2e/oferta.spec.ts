// Detal oferty (4.3 a) — kontrakty widoku na danych PRODUKCYJNYCH
// (`pickOffer` + `test.skip` z powodem; media zaślepione): nagłówek
// (kicker, h1, lokalizacja, cena, plakietka statusu), galeria (tor snap
// ze wszystkimi zdjęciami, licznik, ‹ ›, klawiatura, miniatury, pion
// `contain`), meta (kopiuj numer/link, „Dodano", udostępnij), kotwice
// (warianty wg obecności filmu/spaceru/mapy), tabela = `detailRows()`
// (ten sam moduł, te same dane), opis z „Czytaj więcej", film i spacer
// jako linki — iframe DOPIERO po kliknięciu, mapa statyczna, kontakt
// (sloty antyscrapingowe, miejsce na formularz 5B), panel boczny
// (desktop) / pasek dolny (mobile), okruszki, meta/OG/JSON-LD, zero
// żądań do podmiotów trzecich. Treść na chromium-1920; gesty i pasek
// dolny na profilach mobilnych.
import { expect, test, type Page } from "@playwright/test";
import { buildPhoneHref, buildEmail } from "../../src/lib/contact-details";
import { IMG_VARIANTS, mediaUrl, type ImgVariant } from "../../src/lib/img";
import {
  detailDescription,
  detailTitle,
  offerHeading,
} from "../../src/lib/offers/detail-meta";
import { detailRows, priceVisible } from "../../src/lib/offers/details-rows";
import {
  formatDateShort,
  formatKind,
  formatLocation,
  formatPrice,
} from "../../src/lib/offers/format";
import { coordKey } from "../../src/lib/offers/map-key";
import { listPath, offerPath, OFFERS_PATH } from "../../src/lib/offers/urls";
import {
  AGENT,
  DESKTOP_MIN_PX,
  MEDIA_BASE,
  SHOW_PRICE_WHEN_SOLD,
} from "../../src/lib/site-config";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import {
  collectPageIssues,
  useMediaStub,
  usePreviewGuard,
} from "../helpers/guards";
import { pickOffer, readMapsTyped, readOffersTyped } from "../helpers/offers";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";

const SITE = "https://hetmannieruchomosci.com";
/** Adres wariantu obrazu jak `imgAt()` w buildzie produkcyjnym (sam
 *  `imgAt` czyta `import.meta.env`, którego Node testów nie ma). */
const imgAt = (r2Key: string, variant: ImgVariant) =>
  `${MEDIA_BASE}/cdn-cgi/image/${IMG_VARIANTS[variant]}/${r2Key}`;
const OFFERS = readOffersTyped();
const MAPS = readMapsTyped();
const NO_OFFERS = "brak ofert w data/ (zero ofert = stan dopuszczalny)";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const FIRST = OFFERS[0];
const hasMap = (o: (typeof OFFERS)[number]) => {
  const e = MAPS[coordKey(o.location.lat, o.location.lon)];
  return Boolean(e && !e.goneSince);
};

usePreviewGuard();
useMediaStub();

/** Hosty widziane przez stronę (do kontraktu „zero podmiotów trzecich"). */
function watchHosts(page: Page): Set<string> {
  const hosts = new Set<string>();
  page.on("request", (req) => hosts.add(new URL(req.url()).host));
  return hosts;
}
const allowedHosts = (page: Page) =>
  new Set([
    new URL(page.url()).host,
    ...(MEDIA_BASE ? [new URL(MEDIA_BASE).host] : []),
  ]);

test.describe("detal oferty — treść (chromium-1920)", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-1920",
      "treść niezależna od profilu — jeden projekt wystarczy",
    );
  });

  test("nagłówek: kicker, h1, lokalizacja → lista, cena; kontrakty szkieletu", async ({
    page,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const o = FIRST!;
    const issues = collectPageIssues(page);
    const res = await page.goto(offerPath(o), { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(detailTitle(o));
    const main = page.locator("main[data-offer-detail]");
    await expect(main).toHaveAttribute("data-offer-detail", o.number);
    await expect(page.locator("main h1")).toHaveText(offerHeading(o));
    await expect(page.locator(".od-head .od-kicker")).toHaveText(
      formatKind(o.mainType, o.transaction),
    );
    const loc = page.locator(".od-head .od-loc a");
    await expect(loc).toHaveText(formatLocation(o.location));
    await expect(loc).toHaveAttribute("href", listPath(o));
    await expect(page.locator("[data-offer-number]")).toHaveText(o.number);
    const price = page.locator(".od-head [data-offer-price]");
    await expect(price).not.toBeEmpty();
    if (priceVisible(o, SHOW_PRICE_WHEN_SOLD)) {
      await expect(price.locator(".od-amount")).toHaveText(
        formatPrice(o.price, o.transaction, o.currency),
      );
    }
    expect(issues()).toEqual([]);
  });

  for (const status of ["sprzedana", "wynajeta", "rezerwacja"] as const) {
    test(`plakietka statusu na hero: ${status}`, async ({ page }) => {
      const o = pickOffer({ status, minPhotos: 1 });
      test.skip(!o, `brak oferty ${status} ze zdjęciem w data/`);
      await gotoReady(page, offerPath(o!));
      const badge = page.locator(".od-hero .od-badge");
      await expect(badge).toHaveCount(1);
      await expect(badge).toHaveText(
        {
          sprzedana: "Sprzedane",
          wynajeta: "Wynajęte",
          rezerwacja: "Rezerwacja",
        }[status],
      );
    });
  }

  test("„Zapytaj o cenę”: bez kwoty i bez ceny za m² (hero, panel, wiersz)", async ({
    page,
  }) => {
    const o = pickOffer({ priceOnRequest: true });
    test.skip(!o, "brak oferty „Zapytaj o cenę” w data/");
    await gotoReady(page, offerPath(o!));
    await expect(page.locator(".od-head [data-offer-price]")).toHaveText(
      "Zapytaj o cenę",
    );
    await expect(page.locator(".od-head .od-ppm")).toHaveCount(0);
    await expect(page.locator('[data-row="pricePerM2"]')).toHaveCount(0);
  });

  test("obniżka: poprzednia cena przekreślona w nagłówku i wierszu Cena", async ({
    page,
  }) => {
    const o = pickOffer({
      where: (x) =>
        x.price !== null &&
        x.previousPrice !== undefined &&
        x.previousPrice > x.price,
    });
    test.skip(!o, "brak oferty z obniżką ceny w data/");
    await gotoReady(page, offerPath(o!));
    const prev = formatPrice(o!.previousPrice!, o!.transaction, o!.currency);
    await expect(page.locator(".od-head .od-prev")).toHaveText(prev);
    await expect(page.locator('[data-row="price"] s')).toHaveText(prev);
  });

  test("galeria: wszystkie zdjęcia w torze (hero), pierwsze eager, reszta lazy; ‹ › i klawiatura; miniatury", async ({
    page,
  }) => {
    const o = pickOffer({ minPhotos: 3 });
    test.skip(!o, "brak oferty z ≥ 3 zdjęciami w data/");
    await gotoReady(page, offerPath(o!));
    const slides = page.locator("[data-gal-slide]");
    await expect(slides).toHaveCount(o!.photos.length);
    const imgs = page.locator("[data-gal-slide] img.od-img");
    const srcs = await imgs.evaluateAll((els) =>
      els.map((el) => ({
        src: el.getAttribute("src"),
        loading: el.getAttribute("loading"),
        w: el.getAttribute("width"),
        h: el.getAttribute("height"),
        alt: el.getAttribute("alt"),
      })),
    );
    expect(srcs.map((s) => s.src)).toEqual(
      o!.photos.map((p) => imgAt(p.r2Key, "hero")),
    );
    expect(srcs[0].loading).toBe("eager");
    expect(srcs.slice(1).every((s) => s.loading === "lazy")).toBe(true);
    for (const [i, s] of srcs.entries()) {
      expect(s.w, `width ${i}`).toBe(String(o!.photos[i].width));
      expect(s.h, `height ${i}`).toBe(String(o!.photos[i].height));
      expect(s.alt, `alt ${i}`).toBe(o!.photos[i].alt);
    }
    await expect(page.locator("[data-offer-photo]")).toHaveCount(1);
    const count = page.locator("[data-gal-count]");
    await expect(count).toHaveText(`1 / ${o!.photos.length}`);
    await page.locator("[data-gal-next]").click();
    await expect(count).toHaveText(`2 / ${o!.photos.length}`);
    await expect(page.locator('[data-gal-thumb="1"]')).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.locator('[data-gal-thumb="0"]')).not.toHaveAttribute(
      "aria-current",
      "true",
    );
    await page.locator("[data-gal-prev]").click();
    await expect(count).toHaveText(`1 / ${o!.photos.length}`);
    // klawiatura przy fokusie na torze
    await page.locator("[data-gal-track]").focus();
    await page.keyboard.press("ArrowRight");
    await expect(count).toHaveText(`2 / ${o!.photos.length}`);
    await page.keyboard.press("ArrowLeft");
    await expect(count).toHaveText(`1 / ${o!.photos.length}`);
    // miniatura przewija hero do kadru
    await page.locator('[data-gal-thumb="2"]').click();
    await expect(count).toHaveText(`3 / ${o!.photos.length}`);
    // tor przewinął się dokładnie o dwa kadry (snap; płynny dojazd)
    await settle(page, 600);
    const pos = await page
      .locator("[data-gal-track]")
      .evaluate((t) => Math.round(t.scrollLeft / t.clientWidth));
    expect(pos).toBe(2);
  });

  test("zdjęcie pionowe: kadr `contain` na rozmytym tle", async ({ page }) => {
    const o = pickOffer({
      where: (x) => x.photos.some((p) => p.height > p.width),
    });
    test.skip(!o, "brak oferty ze zdjęciem pionowym w data/");
    await gotoReady(page, offerPath(o!));
    const i = o!.photos.findIndex((p) => p.height > p.width);
    const slide = page.locator(`[data-gal-slide="${i}"]`);
    await expect(slide).toHaveAttribute("data-portrait", "");
    await expect(slide.locator("img.od-blur")).toHaveCount(1);
    expect(
      await slide
        .locator("img.od-img")
        .evaluate((el) => getComputedStyle(el).objectFit),
    ).toBe("contain");
  });

  test("rzuty: osobna sekcja tylko gdy są zdjęcia typu plan", async ({
    page,
  }) => {
    const o = pickOffer({ withPlan: true });
    test.skip(!o, "brak oferty z rzutem w data/");
    await gotoReady(page, offerPath(o!));
    const plans = o!.photos.filter((p) => p.kind === "plan").length;
    await expect(page.locator("[data-offer-plans] .od-plan")).toHaveCount(
      plans,
    );
  });

  test("brak sekcji rzutów bez planów", async ({ page }) => {
    const o = pickOffer({ withPlan: false });
    test.skip(!o, NO_OFFERS);
    await gotoReady(page, offerPath(o!));
    await expect(page.locator("[data-offer-plans]")).toHaveCount(0);
  });

  test("kotwice: zestaw zależny od filmu, spaceru i mapy; klik przewija pod paski", async ({
    page,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const o = FIRST!;
    await gotoReady(page, offerPath(o));
    const expected = [
      "szczegoly",
      ...(o.descriptionHtml.trim() ? ["opis"] : []),
      ...(o.videoId ? ["film"] : []),
      ...(o.tourUrl ? ["spacer"] : []),
      ...(hasMap(o) ? ["mapa"] : []),
      "kontakt",
    ];
    const ids = await page
      .locator("[data-offer-anchors] a[data-anchor]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-anchor")));
    expect(ids).toEqual(expected);
    await expect(
      page.locator('[data-offer-anchors] a[aria-current="true"]'),
    ).toHaveAttribute("data-anchor", "szczegoly");
    await page.locator('[data-offer-anchors] a[data-anchor="kontakt"]').click();
    await settle(page, 400);
    const geo = await page.evaluate(() => {
      const sec = document.getElementById("kontakt")!.getBoundingClientRect();
      const bar = document
        .querySelector("[data-offer-anchors]")!
        .getBoundingClientRect();
      return { secTop: sec.top, barBottom: bar.bottom, y: window.scrollY };
    });
    expect(geo.y).toBeGreaterThan(0);
    expect(geo.secTop).toBeGreaterThanOrEqual(geo.barBottom - 1);
    await expect(
      page.locator('[data-offer-anchors] a[aria-current="true"]'),
    ).toHaveAttribute("data-anchor", "kontakt");
  });

  test("dane szczegółowe = detailRows() na tej samej ofercie", async ({
    page,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const o = FIRST!;
    await gotoReady(page, offerPath(o));
    const now = new Date(
      (await page.locator("[data-build-now]").getAttribute("data-build-now")) ??
        Date.now(),
    );
    const rows = detailRows(o, {
      now,
      showPrice: priceVisible(o, SHOW_PRICE_WHEN_SOLD),
    });
    const got = await page
      .locator("[data-offer-rows] [data-row]")
      .evaluateAll((els) =>
        els.map((el) => ({
          id: el.getAttribute("data-row"),
          label: el.querySelector("dt")!.textContent,
          text: el.querySelector("dd > span")!.textContent,
        })),
      );
    expect(got).toEqual(
      rows.map((r) => ({ id: r.id, label: r.label, text: r.value.text })),
    );
  });

  test("parter: wiersz Piętro = „parter”; winda bez danych = brak wiersza", async ({
    page,
  }) => {
    const o = pickOffer({ floor: 0 });
    test.skip(!o, "brak oferty z parteru w data/");
    await gotoReady(page, offerPath(o!));
    await expect(page.locator('[data-row="floor"] dd')).toContainText("parter");
    if (o!.elevators === undefined) {
      await expect(page.locator('[data-row="elevator"]')).toHaveCount(0);
    }
  });

  test("opis: HTML z CRM bez skryptów; długi opis zwija się z „Czytaj więcej”", async ({
    page,
    request,
  }) => {
    const o = pickOffer({ where: (x) => x.descriptionHtml.length > 2500 });
    test.skip(!o, "brak oferty z długim opisem w data/");
    const raw = await (await request.get(offerPath(o!))).text();
    // surowy HTML niesie pełny opis (bez JS nic nie jest zwinięte)
    expect(raw).toContain("data-offer-desc");
    expect(raw).not.toMatch(/data-collapsed/);
    await gotoReady(page, offerPath(o!));
    const desc = page.locator("[data-offer-desc]");
    await expect(desc).not.toBeEmpty();
    expect(await desc.locator("script, iframe, img").count()).toBe(0);
    const wrap = page.locator("[data-offer-desc-wrap]");
    const btn = page.locator("[data-offer-desc-btn]");
    await expect(wrap).toHaveAttribute("data-collapsed", "");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("aria-expanded", "false");
    const before = await wrap.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    await btn.click();
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    const after = await wrap.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect(after).toBeGreaterThan(before);
    await expect(wrap).not.toHaveAttribute("data-collapsed", "");
  });

  test("film: przed kliknięciem brak iframe (kafel = link do YouTube); po kliknięciu iframe youtube-nocookie bez mikrofonu", async ({
    page,
  }) => {
    const o = pickOffer({ withVideo: true });
    test.skip(!o, "brak oferty z filmem w data/");
    const hosts = watchHosts(page);
    await page.route("https://www.youtube-nocookie.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html>",
      }),
    );
    await gotoReady(page, offerPath(o!));
    await expect(page.locator("iframe")).toHaveCount(0);
    const tile = page.locator("[data-offer-video]");
    await expect(tile).toHaveAttribute(
      "href",
      `https://www.youtube.com/watch?v=${o!.videoId}`,
    );
    await expect(tile).toHaveAttribute("target", "_blank");
    expect([...hosts].filter((h) => !allowedHosts(page).has(h))).toEqual([]);
    await tile.click();
    const frame = page.locator("iframe");
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute(
      "src",
      new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${o!.videoId}`),
    );
    const allow = (await frame.getAttribute("allow")) ?? "";
    expect(allow).not.toContain("microphone");
    expect(await frame.getAttribute("title")).toBeTruthy();
    const extra = [...hosts].filter((h) => !allowedHosts(page).has(h));
    expect(extra).toEqual(["www.youtube-nocookie.com"]);
  });

  test("spacer 360: link do spaceru, iframe dopiero po kliknięciu, allow bez mikrofonu", async ({
    page,
  }) => {
    const o = pickOffer({ withTour: true });
    test.skip(!o, "brak oferty ze spacerem w data/");
    const tourHost = new URL(o!.tourUrl!).host;
    await page.route(`https://${tourHost}/**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html>",
      }),
    );
    await gotoReady(page, offerPath(o!));
    await expect(page.locator("iframe")).toHaveCount(0);
    const tile = page.locator("[data-offer-tour]");
    await expect(tile).toHaveAttribute("href", o!.tourUrl!);
    await tile.click();
    const frame = page.locator("iframe");
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute("src", o!.tourUrl!);
    expect((await frame.getAttribute("allow")) ?? "").not.toContain(
      "microphone",
    );
  });

  test("oferta bez filmu i spaceru: brak sekcji i kotwic", async ({ page }) => {
    const o = pickOffer({ withVideo: false, withTour: false });
    test.skip(!o, "każda oferta w data/ ma film albo spacer");
    await gotoReady(page, offerPath(o!));
    await expect(page.locator("#film, #spacer")).toHaveCount(0);
    await expect(
      page.locator('[data-anchor="film"], [data-anchor="spacer"]'),
    ).toHaveCount(0);
  });

  test("mapa: obraz z manifestu (wymiary, adres R2), „Otwórz w mapach” po kliknięciu, bez mapy interaktywnej", async ({
    page,
  }) => {
    const o = pickOffer({ where: hasMap });
    test.skip(!o, "brak oferty z mapą w maps.json");
    await gotoReady(page, offerPath(o!));
    const entry = MAPS[coordKey(o!.location.lat, o!.location.lon)];
    const img = page.locator("img[data-offer-map]");
    await expect(img).toHaveAttribute("src", mediaUrl(entry.r2Key));
    await expect(img).toHaveAttribute("width", String(entry.width));
    await expect(img).toHaveAttribute("height", String(entry.height));
    // naturalne proporcje (pasek atrybucji nie jest obcięty)
    const ratio = await img.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.width / r.height;
    });
    expect(Math.abs(ratio - entry.width / entry.height)).toBeLessThan(0.02);
    const link = page.locator("[data-offer-map-link]");
    await expect(link).toHaveAttribute(
      "href",
      `https://maps.google.com/?q=${o!.location.lat},${o!.location.lon}`,
    );
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(
      page.getByRole("button", { name: /interaktywn/i }),
    ).toHaveCount(0);
  });

  test("oferta bez mapy: sekcja i kotwica znikają", async ({ page }) => {
    const o = pickOffer({ where: (x) => !hasMap(x) });
    test.skip(!o, "każda oferta w data/ ma mapę");
    await gotoReady(page, offerPath(o!));
    await expect(page.locator("#mapa")).toHaveCount(0);
    await expect(page.locator('[data-anchor="mapa"]')).toHaveCount(0);
  });

  test("kontakt: karta agenta, sloty (surowy HTML bez kontaktów poza opisem z CRM), miejsce na formularz, powrót do listy", async ({
    page,
    request,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const o = FIRST!;
    const raw = await (await request.get(offerPath(o))).text();
    // kontrakt antyscrapingowy NIE obejmuje opisu z CRM — wycinamy blok opisu
    const withoutDesc = raw.replace(
      /<div class="od-desc"[\s\S]*?<\/div>\s*<\/div>/,
      "",
    );
    expect(withoutDesc).not.toContain("tel:+");
    expect(withoutDesc).not.toContain(buildEmail("joanna"));
    expect(withoutDesc).not.toContain(buildEmail("biuro"));
    expect(withoutDesc).not.toContain(buildPhoneHref().replace("tel:+48", ""));
    // przyciski bez JS prowadzą na /kontakt/
    expect(withoutDesc).toMatch(/data-tel data-fill="href" href="\/kontakt\/"/);
    await gotoReady(page, offerPath(o));
    const contact = page.locator("[data-offer-contact]");
    await expect(contact.locator(".od-agent-name")).toHaveText(AGENT.name);
    await expect(contact.locator(".od-agent-role")).toContainText(AGENT.role);
    await expect(contact.locator(".od-agent-role")).toContainText(
      AGENT.licenseNo,
    );
    await expect(contact.locator("a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    await expect(contact.locator('a[data-mail="joanna"]')).toHaveAttribute(
      "href",
      `mailto:${buildEmail("joanna")}`,
    );
    await expect(contact.locator('a[data-mail="joanna"]')).toContainText(
      buildEmail("joanna"),
    );
    await expect(page.locator("[data-offer-inquiry]")).toHaveCount(1);
    await expect(page.locator("[data-offer-inquiry]")).toBeEmpty();
    const back = contact.locator(".od-back");
    await expect(back).toHaveAttribute(
      "href",
      listPath(o, { withLocation: false }),
    );
    expect(
      (await request.get(listPath(o, { withLocation: false }))).status(),
    ).toBe(200);
  });

  test("panel boczny (desktop): sticky, cena, „Zadzwoń” ze slotem, agent; pasek dolny ukryty; flip progu 1025", async ({
    page,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const o = FIRST!;
    await gotoReady(page, offerPath(o));
    const panel = page.locator("[data-offer-panel]");
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((el) => getComputedStyle(el).position)).toBe(
      "sticky",
    );
    if (priceVisible(o, SHOW_PRICE_WHEN_SOLD)) {
      await expect(panel.locator(".od-amount")).toHaveText(
        formatPrice(o.price, o.transaction, o.currency),
      );
    }
    await expect(panel.locator("a[data-tel][data-fill]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    await expect(panel.locator(".od-agent-name")).toHaveText(AGENT.name);
    await expect(page.locator("[data-offer-bar]")).toBeHidden();
    await expectBreakpointFlip(
      page,
      DESKTOP_MIN_PX,
      {
        panel: "[data-offer-panel]",
        bar: "[data-offer-bar]",
        tiles: ".od-tiles",
      },
      { panel: "none", bar: "grid", tiles: "none" },
      { panel: "flex", bar: "none", tiles: "grid" },
    );
  });

  test("meta: kopiuj numer i link (schowek), „Dodano”, udostępnianie z absolutnym adresem", async ({
    page,
    context,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const o = FIRST!;
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoReady(page, offerPath(o));
    await expect(page.locator(".od-added")).toHaveText(
      `Dodano ${formatDateShort(o.addedAt)}`,
    );
    await page.locator('[data-offer-copy="number"]').click();
    await expect(page.locator("[data-offer-copied]")).toHaveText("Skopiowano");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      o.number,
    );
    await page.locator('[data-offer-copy="link"]').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${SITE}${offerPath(o)}`,
    );
    const shares = await page.locator("[data-offer-share]").evaluateAll((els) =>
      els.map((el) => ({
        kind: el.getAttribute("data-offer-share"),
        href: el.getAttribute("href")!,
        target: el.getAttribute("target"),
        rel: el.getAttribute("rel"),
      })),
    );
    expect(shares.map((s) => s.kind)).toEqual(["facebook", "whatsapp", "x"]);
    for (const s of shares) {
      expect(decodeURIComponent(s.href)).toContain(`${SITE}${offerPath(o)}`);
      expect(s.target).toBe("_blank");
      expect(s.rel).toContain("noopener");
    }
    // natywne udostępnianie zastępuje ikony TYLKO gdy navigator.share istnieje
    const hasShare = await page.evaluate(
      () => typeof navigator.share === "function",
    );
    const native = page.locator("[data-offer-share-native]");
    if (hasShare) {
      await expect(native).toBeVisible();
      await expect(page.locator(".od-share-links")).toBeHidden();
    } else {
      await expect(native).toBeHidden();
      await expect(page.locator(".od-share-links")).toBeVisible();
    }
  });

  test("„Drukuj / PDF” woła window.print", async ({ page }) => {
    test.skip(!FIRST, NO_OFFERS);
    await gotoReady(page, offerPath(FIRST!));
    await page.evaluate(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed += 1;
      };
    });
    await page.locator("[data-offer-print]").click();
    expect(
      await page.evaluate(
        () => (window as unknown as { __printed: number }).__printed,
      ),
    ).toBe(1);
  });

  test("head: description, canonical, og:url, og:image = pierwsze zdjęcie 1200×630; JSON-LD RealEstateListing bez kontaktu", async ({
    request,
  }) => {
    const o = pickOffer({ minPhotos: 1 });
    test.skip(!o, NO_OFFERS);
    const path = offerPath(o!);
    const html = await (await request.get(path)).text();
    expect(html).toContain(`<link rel="canonical" href="${SITE}${path}"`);
    expect(html).toContain(`<meta property="og:url" content="${SITE}${path}"`);
    expect(html).toContain(
      `<meta name="description" content="${detailDescription(o!).replaceAll('"', "&quot;")}"`,
    );
    const og = html.match(/property="og:image" content="([^"]+)"/)![1];
    expect(og).toBe(new URL(imgAt(o!.photos[0].r2Key, "og"), SITE).href);
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    const nodes = [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ].map((m) => JSON.parse(m[1]) as Record<string, unknown>);
    expect(nodes).toHaveLength(1);
    const node = nodes[0];
    expect(node["@type"]).toBe("RealEstateListing");
    expect(node.url).toBe(`${SITE}${path}`);
    const serialized = JSON.stringify(node);
    expect(serialized).not.toContain("telephone");
    expect(serialized).not.toContain('"email"');
    expect(serialized).not.toContain('"geo"');
    expect(serialized).not.toContain(buildEmail("joanna"));
    expect(serialized).not.toContain(buildPhoneHref().replace("tel:+48", ""));
    if (o!.price === null) expect(node).not.toHaveProperty("offers");
    else expect((node.offers as { price: number }).price).toBe(o!.price);
  });

  test("okruszki: Oferty › rodzaj › lokalizacja › numer; linki odpowiadają < 400", async ({
    page,
    request,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const o = FIRST!;
    await gotoReady(page, offerPath(o));
    const crumbs = page.locator("[data-offer-crumbs] a");
    await expect(crumbs).toHaveCount(3);
    const hrefs = await crumbs.evaluateAll((els) =>
      els.map((el) => el.getAttribute("href")!),
    );
    expect(hrefs).toEqual([
      OFFERS_PATH,
      listPath(o, { withLocation: false }),
      listPath(o),
    ]);
    for (const href of hrefs) {
      expect((await request.get(href)).status(), href).toBeLessThan(400);
    }
    await expect(
      page.locator('[data-offer-crumbs] [aria-current="page"]'),
    ).toHaveText(o.number);
  });

  test("zero żądań do podmiotów trzecich przy wejściu i po przewinięciu", async ({
    page,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    const hosts = watchHosts(page);
    await gotoReady(page, offerPath(FIRST!));
    await scrollPageTo(page, 2000);
    await settle(page, 300);
    expect([...hosts].filter((h) => !allowedHosts(page).has(h))).toEqual([]);
  });
});

test.describe("detal oferty — mobile (pixel-5, iphone-14)", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      !MOBILE_PROJECTS.includes(testInfo.project.name),
      "gesty i pasek dolny — profile mobilne",
    );
  });

  test("nagłówek nad hero, pasek dolny przypięty do dołu okna i znika na stopce", async ({
    page,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    await gotoReady(page, offerPath(FIRST!));
    await expect(page.locator("[data-offer-panel]")).toBeHidden();
    const bar = page.locator("[data-offer-bar]");
    await expect(bar).toBeVisible();
    const geo = await page.evaluate(() => {
      const bar = document
        .querySelector("[data-offer-bar]")!
        .getBoundingClientRect();
      const head = document.querySelector(".od-head")!.getBoundingClientRect();
      const hero = document.querySelector(".od-hero")!.getBoundingClientRect();
      return {
        barBottom: bar.bottom,
        vh: window.innerHeight,
        headBottom: head.bottom,
        heroBottom: hero.bottom,
      };
    });
    expect(Math.abs(geo.barBottom - geo.vh)).toBeLessThanOrEqual(1);
    // nagłówek leży w obrębie hero (nakładka), nie pod nim
    expect(geo.headBottom).toBeLessThanOrEqual(geo.heroBottom + 1);
    await expect(bar.locator("a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    await expect(bar.locator('a[href="#kontakt"]')).toBeVisible();
    // na stopce pasek znika (sticky kończy się z `main`)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await settle(page, 400);
    const after = await page.evaluate(() => {
      const bar = document
        .querySelector("[data-offer-bar]")!
        .getBoundingClientRect();
      return { top: bar.top, vh: window.innerHeight };
    });
    expect(after.top).toBeLessThan(after.vh - 1);
  });

  test("swipe po hero (mysz) przewija dokładnie o jeden kadr; licznik nadąża", async ({
    page,
  }) => {
    const o = pickOffer({ minPhotos: 3 });
    test.skip(!o, "brak oferty z ≥ 3 zdjęciami w data/");
    await gotoReady(page, offerPath(o!));
    const track = page.locator("[data-gal-track]");
    // scroll-snap mierzony programowo: przewinięcie o 1,4 kadru ląduje na 2. kadrze
    await track.evaluate((t) => {
      t.scrollBy({ left: t.clientWidth * 1.4, behavior: "auto" });
    });
    await settle(page, 500);
    const idx = await track.evaluate((t) =>
      Math.round(t.scrollLeft / t.clientWidth),
    );
    expect([1, 2]).toContain(idx);
    await expect(page.locator("[data-gal-count]")).toHaveText(
      `${idx + 1} / ${o!.photos.length}`,
    );
    const snap = await track.evaluate(
      (t) => getComputedStyle(t).scrollSnapType,
    );
    expect(snap).toContain("x");
    const stop = await page
      .locator("[data-gal-slide]")
      .first()
      .evaluate((el) => getComputedStyle(el).scrollSnapStop);
    expect(stop).toBe("always");
  });
});
