// Strona główna (Etap 4.4, docs/analiza-home.md §5): hero pełnoekranowe
// z plakatem jako obrazem priorytetowym, film startujący WYŁĄCZNIE na
// desktopie i tylko przy dozwolonym ruchu (przejście w zdjęcie po końcu
// materiału), sekcje 01–05 z linkami, kafle ofert z danych (dobór =
// najnowsze aktywne), sloty kontaktowe, progi 1025 / 768, reveale,
// parallax z zapasem ≥ ruch, zoom hero, scroll natywny, zero podmiotów
// trzecich, axe. Treść na `chromium-1920`; układ i hero także na
// `chromium-pixel-5` i `webkit-iphone-14`. Dane produkcyjne — kafle przez
// helper ofert (zero aktywnych ofert = wariant bez siatki, bez skipa).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  PX_AMT_DESKTOP,
  PX_AMT_MOBILE,
} from "../../src/components/sections/content-config";
import {
  HOME_DESKTOP_MIN_PX,
  HOME_OFFERS_MAX,
  HOME_POSTER_TALL_BELOW_PX,
} from "../../src/components/sections/home/home-config";
import { HOME_COPY } from "../../src/components/sections/home/home-copy";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";
import { IMG_VARIANTS, type ImgVariant } from "../../src/lib/img";
import { BUSINESS } from "../../src/lib/jsonld";
import { sortEntries } from "../../src/lib/offers/filters";
import { formatLocation, formatPrice } from "../../src/lib/offers/format";
import { toIndexEntry } from "../../src/lib/offers/index-entry";
import { cardKicker, NEW_BADGE } from "../../src/lib/offers/offers-ui";
import { isNewOffer } from "../../src/lib/offers/time-rules";
import {
  ABOUT_PATH,
  CONTACT_PATH,
  HOME_PATH,
  OFFERS_PATH,
  SELL_PATH,
  SERVICES_PATH,
} from "../../src/lib/routes";
import { MEDIA_BASE } from "../../src/lib/site-config";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import {
  collectPageIssues,
  useMediaStub,
  usePreviewGuard,
} from "../helpers/guards";
import { pickOffers } from "../helpers/offers";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";
import { revealSweep } from "../helpers/visual";

usePreviewGuard();
useMediaStub();

const DESKTOP = "chromium-1920";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const SUBPIXEL_TOL_PX = 0.5;

/** Adres wariantu obrazu jak `imgAt()` w buildzie produkcyjnym (sam
 *  `imgAt` czyta `import.meta.env`, którego Node testów nie ma). */
const imgAt = (r2Key: string, variant: ImgVariant) =>
  `${MEDIA_BASE}/cdn-cgi/image/${IMG_VARIANTS[variant]}/${r2Key}`;

/** Oczekiwane kafle: najnowsze AKTYWNE oferty (reguła z analizy Q3),
 *  złożone niezależnie od kodu strony — helper ofert + `sortEntries`. */
const EXPECTED = sortEntries(
  pickOffers({ status: "aktywna" }).map(toIndexEntry),
  "newest",
).slice(0, HOME_OFFERS_MAX);

const desktopOnly = (info: TestInfo) =>
  test.skip(info.project.name !== DESKTOP, "treść — tylko chromium-1920");
const mobileOnly = (info: TestInfo) =>
  test.skip(
    !MOBILE_PROJECTS.includes(info.project.name),
    "układ mobilny — chromium-pixel-5 i webkit-iphone-14",
  );
const layoutProjects = (info: TestInfo) =>
  test.skip(
    ![DESKTOP, ...MOBILE_PROJECTS].includes(info.project.name),
    "układ — chromium-1920 i dwa profile mobilne",
  );

/** Żądania do `/video/` widziane przez stronę. */
function watchVideo(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/video/")) seen.push(r.url());
  });
  return seen;
}

const HERO = '[data-home="hero"]';
const VIDEO = "video[data-hero-video]";
const section = (name: string) => `[data-home="${name}"]`;

test.describe("hero", () => {
  test("h1, pełna wysokość okna, plakat jako obraz priorytetowy", async ({
    page,
  }, testInfo) => {
    layoutProjects(testInfo);
    const issues = collectPageIssues(page);
    await gotoReady(page, HOME_PATH);
    const h1 = page.locator("main h1");
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(HOME_COPY.hero.heading);
    await expect(h1).toHaveCount(1);

    // hero wypełnia okno (pasek „/" liczy próg przemalowania z jego
    // wysokości); pomiar sub-pikselowy
    const { hero, vh, h1Bottom } = await page.evaluate((sel) => {
      const r = document.querySelector(sel)!.getBoundingClientRect();
      const h = document.querySelector("main h1")!.getBoundingClientRect();
      return { hero: r, vh: window.innerHeight, h1Bottom: h.bottom };
    }, HERO);
    expect(hero.top).toBe(0);
    expect(Math.abs(hero.height - vh)).toBeLessThanOrEqual(SUBPIXEL_TOL_PX);
    expect(h1Bottom).toBeLessThanOrEqual(hero.height);

    const photo = page.locator("[data-hero-photo]");
    await expect(photo).toHaveAttribute("loading", "eager");
    await expect(photo).toHaveAttribute("fetchpriority", "high");
    await expect(photo).toHaveAttribute("width", /^\d+$/);
    await expect(photo).toHaveAttribute("height", /^\d+$/);
    await expect(photo).toHaveAttribute("alt", "");
    // LCP: plakatu nie zasłania żadna bramka ruchu
    await expect(photo).toHaveCSS("opacity", "1");
    expect(await photo.evaluate((el) => el.closest("[data-rv]"))).toBeNull();
    expect(
      await photo.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(0);
    expect(issues()).toEqual([]);
  });

  test("surowy HTML: preload plakatu per kadr, wideo bez autoplay, MP4 przed WebM", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    const html = await (await page.request.get(HOME_PATH)).text();
    const head = html.slice(0, html.indexOf("</head>"));
    const preloads = [...head.matchAll(/<link[^>]+rel="preload"[^>]*>/g)]
      .map((m) => m[0])
      .filter((l) => /as="image"/.test(l));
    expect(preloads).toHaveLength(2);
    const tall = preloads.find((l) => l.includes("hero-poster-tall"));
    const wide = preloads.find((l) => !l.includes("hero-poster-tall"));
    expect(tall).toContain(
      `media="(max-width: ${HOME_POSTER_TALL_BELOW_PX - 1}px)"`,
    );
    expect(wide).toContain("hero-poster");
    expect(wide).toContain(
      `media="(min-width: ${HOME_POSTER_TALL_BELOW_PX}px)"`,
    );
    for (const l of preloads) expect(l).toContain('fetchpriority="high"');

    const video = html.match(/<video[^>]*data-hero-video[^>]*>/)?.[0] ?? "";
    expect(video).toContain("muted");
    expect(video).toContain("playsinline");
    expect(video).toContain('preload="none"');
    expect(video).toContain('data-state="idle"');
    expect(video).not.toContain("autoplay");
    expect(video).not.toContain("poster=");
    // adresy filmu w `data-src` — bez `src` przeglądarka nie ma czego
    // pobrać, dopóki JS nie zdecyduje o starcie (WebKit na Linuksie
    // pobierał pierwsze źródło mimo `preload="none"`)
    const block = html.match(/<video[^>]*data-hero-video[\s\S]*?<\/video>/);
    const sources = [...(block?.[0] ?? "").matchAll(/<source[^>]*>/g)].map(
      (m) => m[0],
    );
    expect(sources.map((s) => s.match(/data-src="([^"]+)"/)?.[1])).toEqual([
      "/video/hero.mp4",
      "/video/hero.webm",
    ]);
    for (const s of sources) expect(s).not.toMatch(/\ssrc=/);
    // bramka ruchu stoi w <head>, przed malowaniem
    expect(head).toContain("js-motion");
  });

  test("desktop: film startuje, a po końcu materiału przechodzi w zdjęcie", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await gotoReady(page, HOME_PATH);
    const video = page.locator(VIDEO);
    await expect(video).toHaveAttribute("data-state", "playing", {
      timeout: 10_000,
    });
    await expect
      .poll(() => video.evaluate((v) => getComputedStyle(v).opacity))
      .toBe("1");
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);

    // koniec materiału wywołany w teście (film trwa ok. 5 s)
    await video.evaluate((v) => v.dispatchEvent(new Event("ended")));
    await expect(video).toHaveAttribute("data-state", "photo");
    await expect
      .poll(() => video.evaluate((v) => getComputedStyle(v).opacity), {
        timeout: 5_000,
      })
      .toBe("0");
    await expect(page.locator("[data-hero-photo]")).toBeVisible();
  });

  test("desktop: zwężenie okna poniżej progu w trakcie filmu → zdjęcie", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await gotoReady(page, HOME_PATH);
    const video = page.locator(VIDEO);
    await expect(video).toHaveAttribute("data-state", "playing", {
      timeout: 10_000,
    });
    await page.setViewportSize({ width: HOME_DESKTOP_MIN_PX - 1, height: 900 });
    await expect(video).toHaveAttribute("data-state", "photo");
    await expect(video).toHaveCSS("display", "none");
  });

  test("mobile: film nie startuje i nie jest pobierany — samo zdjęcie", async ({
    page,
  }, testInfo) => {
    mobileOnly(testInfo);
    const requests = watchVideo(page);
    await gotoReady(page, HOME_PATH);
    await settle(page, 1200);
    const video = page.locator(VIDEO);
    await expect(video).toHaveAttribute("data-state", "idle");
    await expect(video).toHaveCSS("display", "none");
    expect(requests).toEqual([]);
    // telefon dostaje pionowy kadr plakatu (liczy się wysokość pliku)
    expect(
      await page
        .locator("[data-hero-photo]")
        .evaluate((el: HTMLImageElement) => el.currentSrc),
    ).toContain("hero-poster-tall");
  });

  test("ruch ograniczony (reduce): samo zdjęcie, treść widoczna od razu, zero transformów", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    // PUNKTOWA emulacja reduce — jedyny dozwolony wyjątek od zakazu
    // z testing.md: ten test weryfikuje właśnie ścieżkę reduce.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests = watchVideo(page);
    await gotoReady(page, HOME_PATH);
    await settle(page, 1200);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator(VIDEO)).toHaveAttribute("data-state", "idle");
    expect(requests).toEqual([]);
    // blok spod zgięcia jest widoczny bez przewijania
    const below = page.locator(`${section("kontakt")} [data-rv]`).first();
    await expect(below).toHaveCSS("opacity", "1");
    await expect(below).not.toHaveClass(/is-in/);
    for (const px of await page.locator("[data-px]").all()) {
      await expect(px).toHaveCSS("transform", "none");
    }
    await scrollPageTo(page, 400);
    await expect(page.locator("[data-hero-zoom]")).toHaveCSS(
      "transform",
      "none",
    );
    await expect(page.locator("main h1")).toHaveCSS("opacity", "1");
  });

  test.describe("bez JS", () => {
    test.use({ javaScriptEnabled: false });

    test("samo zdjęcie, pełna treść, kontakt przez /kontakt/", async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo);
      const requests = watchVideo(page);
      await page.goto(HOME_PATH);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("html")).not.toHaveClass(/js-motion/);
      await expect(page.locator(VIDEO)).toHaveAttribute("data-state", "idle");
      await expect(page.locator(VIDEO)).toHaveCSS("opacity", "0");
      expect(requests).toEqual([]);
      for (const name of ["o-nas", "oferty", "uslugi", "sprzedaj", "kontakt"]) {
        await expect(
          page.locator(`${section(name)} [data-rv]`).first(),
        ).toHaveCSS("opacity", "1");
      }
      // sloty zostają ukryte, do kontaktu prowadzi przycisk
      const contact = page.locator(section("kontakt"));
      await expect(contact.locator("a[data-tel]")).toBeHidden();
      await expect(contact.locator('a[data-mail="biuro"]')).toBeHidden();
      await expect(contact.locator("a.sx-btn")).toHaveAttribute(
        "href",
        CONTACT_PATH,
      );
    });
  });
});

test.describe("sekcje 01–05", () => {
  test("nagłówki, teksty i wejścia na podstrony", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await gotoReady(page, HOME_PATH);
    const cases = [
      { name: "o-nas", copy: HOME_COPY.about, href: ABOUT_PATH },
      { name: "oferty", copy: HOME_COPY.offers, href: OFFERS_PATH },
      { name: "sprzedaj", copy: HOME_COPY.sell, href: SELL_PATH },
      { name: "kontakt", copy: HOME_COPY.contact, href: CONTACT_PATH },
    ] as const;
    for (const c of cases) {
      const sec = page.locator(section(c.name));
      await expect(sec.locator("h2")).toHaveText(
        `${c.copy.title} ${c.copy.accent}`,
      );
      await expect(sec.locator(".sx-eyebrow")).toHaveText(c.copy.eyebrow);
      const cta = sec.locator("a.sx-btn");
      await expect(cta).toHaveText(c.copy.cta);
      await expect(cta).toHaveAttribute("href", c.href);
      // sekcja jest nazwana swoim nagłówkiem
      const labelledby = await sec.getAttribute("aria-labelledby");
      await expect(sec.locator(`#${labelledby}`)).toHaveCount(1);
    }

    const services = page.locator(section("uslugi"));
    await expect(services.locator("h2")).toHaveText(
      `${HOME_COPY.services.title} ${HOME_COPY.services.accent}`,
    );

    // hero: dwa CTA (desktop)
    const hero = page.locator(HERO);
    await expect(
      hero.getByRole("link", { name: HOME_COPY.hero.ctaOffers }),
    ).toHaveAttribute("href", OFFERS_PATH);
    await expect(
      hero.getByRole("link", { name: HOME_COPY.hero.ctaSell }),
    ).toHaveAttribute("href", SELL_PATH);

    // 01: liczby; 03: trzy ścieżki usług; 04: cztery kroki
    await expect(page.locator(`${section("o-nas")} .ha-stat`)).toHaveCount(
      HOME_COPY.about.stats.length,
    );
    const tiles = services.locator("a.hsv-tile");
    await expect(tiles).toHaveCount(HOME_COPY.services.items.length);
    for (const [i, item] of HOME_COPY.services.items.entries()) {
      await expect(tiles.nth(i)).toHaveAttribute("href", item.href);
      await expect(tiles.nth(i)).toContainText(item.title);
      expect(item.href.startsWith(SERVICES_PATH)).toBe(true);
    }
    const steps = page.locator(`${section("sprzedaj")} .hsl-step`);
    await expect(steps).toHaveCount(HOME_COPY.sell.steps.length);
    for (const [i, step] of HOME_COPY.sell.steps.entries()) {
      await expect(steps.nth(i).locator("h3")).toHaveText(step.title);
    }

    // 05: adres biura z danych firmy, godziny
    const contact = page.locator(section("kontakt"));
    await expect(contact).toContainText(BUSINESS.street);
    await expect(contact).toContainText(
      `${BUSINESS.postalCode} ${BUSINESS.locality}`,
    );
    await expect(contact).toContainText(HOME_COPY.contact.hours);
  });

  test("każdy link wewnętrzny strony odpowiada < 400", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await gotoReady(page, HOME_PATH);
    const hrefs = await page
      .locator("main.home a[href]")
      .evaluateAll((as) =>
        as.map((a) => a.getAttribute("href") ?? "").filter(Boolean),
      );
    // po JS sloty mają `tel:` / `mailto:` — sprawdzamy trasy serwisu
    // (kotwice usług powstaną w 4.6: liczy się status trasy)
    const paths = [
      ...new Set(
        hrefs.filter((h) => h.startsWith("/")).map((h) => h.split("#")[0]),
      ),
    ];
    expect(paths.length).toBeGreaterThanOrEqual(5);
    for (const path of paths) {
      const res = await page.request.get(path);
      expect(res.status(), path).toBeLessThan(400);
    }
  });
});

test.describe("kafle ofert (dane)", () => {
  test("dobór = najnowsze aktywne; treść i obraz kafla z danych", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await gotoReady(page, HOME_PATH);
    const sec = page.locator(section("oferty"));
    const grid = sec.locator("[data-home-offers]");
    const tiles = sec.locator("[data-home-offer]");

    if (EXPECTED.length === 0) {
      // zero aktywnych ofert: sekcja zostaje, znika sama siatka
      await expect(grid).toHaveCount(0);
      await expect(sec.locator("h2")).toBeVisible();
      await expect(sec.locator("a.sx-btn")).toHaveAttribute(
        "href",
        OFFERS_PATH,
      );
      return;
    }

    await expect(grid).toHaveAttribute("data-count", String(EXPECTED.length));
    expect(
      await tiles.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-home-offer")),
      ),
    ).toEqual(EXPECTED.map((e) => e.number));

    const now = new Date((await sec.getAttribute("data-build-now"))!);
    for (const [i, e] of EXPECTED.entries()) {
      const tile = tiles.nth(i);
      await expect(tile).toHaveAttribute("href", e.path);
      await expect(tile).toHaveAttribute("data-offer-status", "aktywna");
      await expect(tile.locator(".ht-kicker")).toHaveText(cardKicker(e));
      await expect(tile.locator("h3")).toHaveText(e.title || e.typeName);
      await expect(tile.locator(".ht-loc")).toContainText(
        formatLocation(e.location),
      );
      await expect(tile.locator("[data-home-offer-price]")).toContainText(
        formatPrice(e.price, e.transaction, e.currency),
      );
      await expect(tile.locator(`[data-badge="${NEW_BADGE}"]`)).toHaveCount(
        isNewOffer(e.addedAt, now) ? 1 : 0,
      );

      const img = tile.locator("img.ht-img");
      if (e.photo) {
        await expect(img).toHaveAttribute("src", imgAt(e.photo.r2Key, "card"));
        await expect(img).toHaveAttribute("width", String(e.photo.width));
        await expect(img).toHaveAttribute("height", String(e.photo.height));
        await expect(img).toHaveAttribute("alt", e.photo.alt);
        await expect(img).toHaveAttribute("loading", "lazy");
        // tylko DUŻY kafel pełnej trójki ma wariant @2× i tylko od progu
        // desktopu (telefon i małe kafle zostają na `card`)
        const source = tile.locator("picture source");
        if (i === 0 && EXPECTED.length === HOME_OFFERS_MAX) {
          await expect(source).toHaveAttribute(
            "media",
            `(min-width: ${HOME_DESKTOP_MIN_PX}px)`,
          );
          await expect(source).toHaveAttribute(
            "srcset",
            `${imgAt(e.photo.r2Key, "card")} 1x, ${imgAt(e.photo.r2Key, "hero")} 2x`,
          );
        } else {
          await expect(source).toHaveCount(0);
        }
      } else {
        await expect(img).toHaveCount(0);
      }
    }

    // każdy kafel prowadzi do istniejącego detalu
    for (const e of EXPECTED) {
      const res = await page.request.get(e.path);
      expect(res.status(), e.path).toBe(200);
    }
  });

  test("mobile: karuzela pozioma ze snapem o jeden kafel, bez przewijania strony w bok", async ({
    page,
  }, testInfo) => {
    mobileOnly(testInfo);
    test.skip(EXPECTED.length < 2, "karuzela wymaga co najmniej 2 kafli");
    await gotoReady(page, HOME_PATH);
    const grid = page.locator("[data-home-offers]");
    await grid.scrollIntoViewIfNeeded();
    await expect(grid).toHaveCSS("overflow-x", "auto");
    await expect(grid).toHaveCSS("scroll-snap-type", /x mandatory/);
    const item = grid.locator("li").first();
    await expect(item).toHaveCSS("scroll-snap-stop", "always");
    await expect(item).toHaveCSS("scroll-snap-align", "start");
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
    }));
    expect(overflow.doc).toBeLessThanOrEqual(overflow.win);
    expect(await grid.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true,
    );
  });
});

test.describe("sloty kontaktowe", () => {
  test("surowy HTML bez telefonu i e-maila; po JS tel: i mailto:", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    const raw = await (await page.request.get(HOME_PATH)).text();
    const main = raw.slice(raw.indexOf("<main"), raw.indexOf("</main>"));
    expect(main).not.toContain(buildPhoneDisplay());
    expect(main).not.toContain(buildPhoneHref());
    expect(main).not.toContain(buildEmail("biuro"));
    expect(main).not.toContain("mailto:");
    expect(main).not.toContain("tel:");
    // puste kotwice slotów niosą <span data-slot> i startują ukryte
    const slots = [...main.matchAll(/<a[^>]+data-(?:tel|mail)[^>]*>/g)].map(
      (m) => m[0],
    );
    expect(slots).toHaveLength(2);
    for (const s of slots) {
      expect(s).toContain("hidden");
      expect(s).toContain(`href="${CONTACT_PATH}"`);
    }
    expect(main.match(/<span[^>]*data-slot[^>]*><\/span>/g)).toHaveLength(2);

    await gotoReady(page, HOME_PATH);
    const contact = page.locator(section("kontakt"));
    const tel = contact.locator("a[data-tel]");
    await expect(tel).toBeVisible();
    await expect(tel).toHaveAttribute("href", buildPhoneHref());
    await expect(tel).toHaveText(buildPhoneDisplay());
    const mail = contact.locator('a[data-mail="biuro"]');
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute("href", `mailto:${buildEmail("biuro")}`);
    await expect(mail).toHaveText(buildEmail("biuro"));
  });
});

test.describe("progi układu", () => {
  test("1025: układ mobilny ↔ desktopowy; 768: kadr plakatu", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await gotoReady(page, HOME_PATH);
    const hasGrid = EXPECTED.length > 0;
    await expectBreakpointFlip(
      page,
      HOME_DESKTOP_MIN_PX,
      {
        eyebrow: ".hero-eyebrow",
        cta: ".hero-cta",
        logoStrip: ".hero-strip--logo",
        cols: ".hero-cols",
        video: VIDEO,
        about: ".ha-in",
        steps: ".hsl-steps",
        services: ".hsv-in",
        contact: ".hc-in",
        ...(hasGrid ? { offers: "[data-home-offers]" } : {}),
      },
      {
        eyebrow: "none",
        cta: "none",
        logoStrip: "flex",
        cols: "none",
        video: "none",
        about: "flex",
        steps: "flex",
        services: "flex",
        contact: "flex",
        ...(hasGrid ? { offers: "flex" } : {}),
      },
      {
        eyebrow: "block",
        cta: "flex",
        logoStrip: "none",
        cols: "grid",
        video: "block",
        about: "grid",
        steps: "grid",
        services: "grid",
        contact: "grid",
        ...(hasGrid ? { offers: "grid" } : {}),
      },
    );

    // drugi próg: poniżej 768 px pionowy kadr plakatu, od 768 px poziomy
    const src = () =>
      page
        .locator("[data-hero-photo]")
        .evaluate((el: HTMLImageElement) => el.currentSrc);
    await page.setViewportSize({
      width: HOME_POSTER_TALL_BELOW_PX - 1,
      height: 900,
    });
    await expect.poll(src).toContain("hero-poster-tall");
    await page.setViewportSize({
      width: HOME_POSTER_TALL_BELOW_PX,
      height: 900,
    });
    await expect.poll(src).not.toContain("hero-poster-tall");
  });
});

test.describe("ruch", () => {
  test("reveale: blok spod zgięcia startuje ukryty i odsłania się po wejściu w kadr", async ({
    page,
  }, testInfo) => {
    layoutProjects(testInfo);
    await gotoReady(page, HOME_PATH);
    await expect(page.locator("html")).toHaveClass(/js-motion/);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "");
    const block = page.locator(`${section("sprzedaj")} [data-rv]`).first();
    await expect(block).not.toHaveClass(/is-in/);
    await expect(block).toHaveCSS("opacity", "0");
    const top = await block.evaluate(
      (el) => el.getBoundingClientRect().top + window.scrollY,
    );
    const vh = await page.evaluate(() => window.innerHeight);
    await scrollPageTo(page, top - vh / 2);
    await expect(block).toHaveClass(/is-in/);
    await expect
      .poll(() => block.evaluate((el) => getComputedStyle(el).opacity), {
        timeout: 5_000,
      })
      .toBe("1");
    // hero nie bierze udziału w revealach (plakat = LCP)
    await expect(page.locator(`${HERO} [data-rv]`)).toHaveCount(0);
  });

  test("parallax: zapas obrazu ≥ ruch (sonda układu), obraz nigdy nie odsłania tła kadru", async ({
    page,
  }, testInfo) => {
    layoutProjects(testInfo);
    await gotoReady(page, HOME_PATH);
    const amt =
      (page.viewportSize()?.width ?? 0) >= HOME_DESKTOP_MIN_PX
        ? PX_AMT_DESKTOP
        : PX_AMT_MOBILE;
    const probe = () =>
      page.locator("[data-px]").evaluateAll((imgs) =>
        imgs.map((img) => {
          const frame = img.closest(".px-frame")!.getBoundingClientRect();
          const r = img.getBoundingClientRect();
          return {
            frameH: frame.height,
            // ile obrazu wystaje nad i pod kadrem PRZY bieżącym przesunięciu
            above: frame.top - r.top,
            below: r.bottom - frame.bottom,
            slack: (r.height - frame.height) / 2,
          };
        }),
      );
    const count = await page.locator("[data-px]").count();
    expect(count).toBe(4);

    // zapas układu = amplituda × wysokość kadru (W PARZE: --px-a ↔ PX_AMT_*)
    for (const p of await probe()) {
      expect(p.frameH).toBeGreaterThan(0);
      expect(p.slack).toBeGreaterThanOrEqual(amt * p.frameH - SUBPIXEL_TOL_PX);
    }
    // w każdej pozycji scrolla obraz zakrywa cały kadr
    const total = await page.evaluate(
      () => document.body.scrollHeight - window.innerHeight,
    );
    for (const y of [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * total)) {
      await scrollPageTo(page, y);
      for (const p of await probe()) {
        expect(p.above).toBeGreaterThanOrEqual(-SUBPIXEL_TOL_PX);
        expect(p.below).toBeGreaterThanOrEqual(-SUBPIXEL_TOL_PX);
      }
    }
  });

  test("zoom hero: warstwa obrazu rośnie, nagłówek gaśnie przy przewijaniu", async ({
    page,
  }, testInfo) => {
    layoutProjects(testInfo);
    await gotoReady(page, HOME_PATH);
    const layer = page.locator("[data-hero-zoom]");
    const scale = () =>
      layer.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(await scale()).toBe(1);
    await expect(page.locator("main h1")).toHaveCSS("opacity", "1");
    const vh = await page.evaluate(() => window.innerHeight);
    await scrollPageTo(page, vh / 2);
    await expect.poll(scale).toBeGreaterThan(1.1);
    await expect
      .poll(() =>
        page
          .locator("main h1")
          .evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
      )
      .toBeLessThan(1);
    // powrót na górę = stan wyjściowy
    await scrollPageTo(page, 0);
    await expect.poll(scale).toBe(1);
  });

  test("scroll jest natywny (bez pośrednika i bez blokady dokumentu)", async ({
    page,
  }, testInfo) => {
    layoutProjects(testInfo);
    await gotoReady(page, HOME_PATH);
    const state = await page.evaluate(() => {
      window.scrollTo(0, 600);
      return {
        y: window.scrollY,
        html: getComputedStyle(document.documentElement).overflowY,
        body: getComputedStyle(document.body).overflowY,
        position: getComputedStyle(document.body).position,
      };
    });
    // natywny scrollTo jest synchroniczny — wygładzacz dojeżdżałby klatkami
    expect(state.y).toBe(600);
    expect(state.html).not.toBe("hidden");
    expect(state.body).not.toBe("hidden");
    expect(state.position).not.toBe("fixed");
  });
});

test("zero żądań do podmiotów trzecich (wejście + przejazd przez stronę)", async ({
  page,
}, testInfo) => {
  layoutProjects(testInfo);
  const hosts = new Set<string>();
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith("http")) hosts.add(url.host);
  });
  await gotoReady(page, HOME_PATH);
  await revealSweep(page);
  const allowed = new Set([
    new URL(page.url()).host,
    ...(MEDIA_BASE ? [new URL(MEDIA_BASE).host] : []),
  ]);
  expect([...hosts].filter((h) => !allowed.has(h))).toEqual([]);
});

test("axe: brak naruszeń critical/serious po odsłonięciu całej strony", async ({
  page,
}, testInfo) => {
  layoutProjects(testInfo);
  await gotoReady(page, HOME_PATH);
  // reveale chowają treść spod zgięcia (opacity 0) — axe pominąłby ją
  await revealSweep(page);
  await expect(page.locator("[data-rv]:not(.is-in)")).toHaveCount(
    // bloki na szkle nie mają reveala poniżej progu desktopu — IO i tak
    // nadaje im klasę, więc po przejeździe nie zostaje nic
    0,
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const gating = results.violations
    .filter((v) => ["critical", "serious"].includes(v.impact ?? ""))
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
  expect(gating).toEqual([]);
});
