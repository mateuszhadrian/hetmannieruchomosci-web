// /uslugi/ (Etap 4.6, docs/analiza-uslugi.md §5): hero z trzema wejściami
// do sekcji (zdjęcie i h1 poza revealami; telefon — tekst na granacie nad
// polem zdjęcia, desktop — pełne okno z pasem wejść), kotwice `#sprzedaje`,
// `#kupuje`, `#pomoc-prawna` (klik wejścia, wejście z adresu, wejście ze
// strony głównej — z asercją położenia), „Sprzedaję", „Kupuję", „Pomoc
// prawna" z listami i pasami CTA, slot telefonu, progi układu, wersja bez
// JS, ruch (reveale, parallax z zapasem ≥ ruch, zdjęcie hero bez
// przesunięcia przy scrollu 0 na obu progach, kierunek odwrotny), zero
// podmiotów trzecich, axe. Treść na `chromium-1920`; hero, kotwice, układ
// i ruch także na `chromium-pixel-5` i `webkit-iphone-14`.
// Wariant paska nad hero: navigation.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  PX_AMT_DESKTOP,
  PX_AMT_MOBILE,
} from "../../src/components/sections/content-config";
import { HOME_COPY } from "../../src/components/sections/home/home-copy";
import {
  SERVICES_ANCHORS,
  SERVICES_DESKTOP_MIN_PX,
  SERVICES_HERO_TALL_BELOW_PX,
} from "../../src/components/sections/services/services-config";
import { SERVICES_COPY } from "../../src/components/sections/services/services-copy";
import { ui } from "../../src/i18n/ui";
import { buildPhoneHref } from "../../src/lib/contact-details";
import {
  CONTACT_PATH,
  HOME_PATH,
  OFFERS_PATH,
  SELL_PATH,
  SERVICES_PATH,
} from "../../src/lib/routes";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import {
  collectPageIssues,
  useMediaStub,
  usePreviewGuard,
} from "../helpers/guards";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";
import { revealSweep } from "../helpers/visual";

usePreviewGuard();
// test wejścia ze strony głównej otwiera „/" (kafle ofert z hosta mediów)
useMediaStub();

const DESKTOP = "chromium-1920";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const LAYOUT_PROJECTS = [DESKTOP, ...MOBILE_PROJECTS];
const A11Y_PROJECTS = [DESKTOP, "chromium-pixel-5"];
const SUBPIXEL_TOL_PX = 0.5;
/** Dopuszczalna odległość górnej krawędzi sekcji od celu po skoku. */
const ANCHOR_TOL_PX = 1.5;

const only = (testInfo: TestInfo, projects: string[], why: string) =>
  test.skip(!projects.includes(testInfo.project.name), why);

const isDesktop = (page: Page) =>
  (page.viewportSize()?.width ?? 0) >= SERVICES_DESKTOP_MIN_PX;

type SectionName = "sprzedaje" | "kupuje" | "pomoc-prawna";
const HERO = "[data-services-hero]";
const PHOTO = "[data-services-photo]";
const ENTRIES = "[data-services-entries]";
const section = (name: SectionName) => `section[data-services="${name}"]`;
const heading = (part: { title: string; accent: string }) =>
  `${part.title} ${part.accent}`;

const t = SERVICES_COPY;
const ANCHOR_IDS: SectionName[] = [
  SERVICES_ANCHORS.sell,
  SERVICES_ANCHORS.buy,
  SERVICES_ANCHORS.legal,
];

/** Przewinięcie + wymuszony przemalunek pętli parallaxu: WebKit potrafi
 *  nie dostarczyć zdarzenia `scroll` po programowym skoku (testing.md),
 *  a sonda porównuje przesunięcie z bieżącą pozycją. */
async function scrollAndPaint(page: Page, y: number): Promise<void> {
  await scrollPageTo(page, y);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await settle(page, 200);
}

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

/** Kontrakt kotwicy: sekcja `id` stoi w miejscu docelowym — poniżej progu
 *  jej górna krawędź leży na dolnej krawędzi stałego paska
 *  (`scroll-margin-top`), od progu na górnej krawędzi okna (dopełnienie
 *  sekcji zawiera wysokość paska); nagłówek w oknie i pod paskiem; bloki
 *  treści odsłonięte — także te przeskoczone po drodze. `expect.poll`:
 *  skok, korekta po wczytaniu i reveale są asynchroniczne. */
async function expectAtAnchor(page: Page, id: SectionName): Promise<void> {
  const desktop = isDesktop(page);
  const place = () =>
    page.evaluate(
      ({ sel, desktop }) => {
        const hdr = document.querySelector("[data-nav]")!;
        const bar = hdr.getBoundingClientRect().bottom;
        const sec = document.querySelector(sel)!.getBoundingClientRect();
        const h2 = document.querySelector(`${sel} h2`)!.getBoundingClientRect();
        return {
          off: desktop ? sec.top : sec.top - bar,
          h2Clear: h2.top - bar,
          h2InView: h2.bottom <= window.innerHeight,
        };
      },
      { sel: `#${id}`, desktop },
    );
  await expect
    .poll(async () => Math.abs((await place()).off), {
      message: `sekcja #${id} w miejscu docelowym`,
      timeout: 10_000,
    })
    .toBeLessThanOrEqual(ANCHOR_TOL_PX);
  const at = await place();
  expect(at.h2Clear).toBeGreaterThan(0);
  expect(at.h2InView).toBe(true);
  await expect(page.locator(`#${id} h2`)).toBeVisible();
  // pierwszy blok sekcji dochodzi do pełnego krycia, a żaden blok NAD
  // celem nie zostaje ukryty (reveal po skoku nie może zostać pusty)
  await expect
    .poll(
      () =>
        page
          .locator(`#${id} [data-rv]`)
          .first()
          .evaluate((el) => getComputedStyle(el).opacity),
      { timeout: 5_000 },
    )
    .toBe("1");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Array.from(
            document.querySelectorAll<HTMLElement>("main [data-rv]"),
          ).filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.height > 0 && r.bottom < 0 && !el.classList.contains("is-in")
            );
          }).length,
      ),
    )
    .toBe(0);
  // po skoku pasek jest pełny (hero zostało nad oknem)
  await expect(page.locator("[data-nav]")).toHaveAttribute("data-solid", "");
}

test.describe("usługi: hero", () => {
  test("h1, teksty z services-copy, zdjęcie priorytetowe, trzy wejścia, geometria per próg", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "układ: desktop + dwa profile mobilne");
    const issues = collectPageIssues(page);
    await gotoReady(page, SERVICES_PATH);
    await expect(page).toHaveTitle(ui.pl["servicesPage.title"]);
    const h1 = page.locator("main h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(heading(t.hero));
    const hero = page.locator(HERO);
    await expect(hero.locator(".uh-eyebrow")).toHaveText(t.hero.eyebrow);
    await expect(hero.getByText(t.hero.lead)).toBeVisible();

    // trzy wejścia do sekcji strony — zwykłe kotwice bez sufiksów gałęzi
    const nav = page.locator(ENTRIES);
    await expect(nav).toHaveAttribute("aria-label", t.hero.entriesLabel);
    const entries = nav.locator("a");
    await expect(entries).toHaveCount(t.hero.entries.length);
    const desktop = isDesktop(page);
    for (const [i, entry] of t.hero.entries.entries()) {
      const link = entries.nth(i);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", `#${ANCHOR_IDS[i]}`);
      await expect(link.locator(".uh-name")).toHaveText(entry.title);
      await expect(link.locator(".uh-kicker")).toHaveText(entry.kicker);
      // trzecie wejście poniżej progu to lżejszy link z samym tytułem
      const plain = !desktop && i === t.hero.entries.length - 1;
      if (plain) await expect(link.locator(".uh-kicker")).toBeHidden();
      else await expect(link.locator(".uh-kicker")).toBeVisible();
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(plain ? 44 : 48);
    }

    const photo = page.locator(PHOTO);
    await expect(photo).toHaveAttribute("loading", "eager");
    await expect(photo).toHaveAttribute("fetchpriority", "high");
    await expect(photo).toHaveAttribute("width", /^\d+$/);
    await expect(photo).toHaveAttribute("height", /^\d+$/);
    await expect(photo).toHaveAttribute("alt", "");
    // kandydaci LCP poza revealami: zdjęcia i h1 nie chowa bramka ruchu
    await expect(photo).toHaveCSS("opacity", "1");
    await expect(h1).toHaveCSS("opacity", "1");
    await expect(page.locator(`${HERO} [data-rv]`)).toHaveCount(0);
    expect(await hero.evaluate((el) => el.closest("[data-rv]"))).toBeNull();
    expect(
      await photo.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(0);
    // znacznik progu paska stoi na sekcji hero (ciemnej na obu progach)
    await expect(hero).toHaveAttribute("data-nav-hero", "");

    // geometria (sub-pikselowo)
    const m = await page.evaluate(
      ({ heroSel, entriesSel }) => {
        const rect = (sel: string) => {
          const r = document.querySelector(sel)!.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: r.height };
        };
        return {
          hero: rect(heroSel),
          frame: rect(".uh-media"),
          text: rect(".uh-text"),
          card: rect(".uh-card"),
          entries: rect(entriesSel),
          vh: window.innerHeight,
        };
      },
      { heroSel: HERO, entriesSel: ENTRIES },
    );
    expect(m.hero.top).toBe(0);
    expect(m.hero.height).toBeGreaterThanOrEqual(m.vh - SUBPIXEL_TOL_PX);
    if (desktop) {
      // pełne okno; kadr zdjęcia wypełnia sekcję; pas wejść u dołu hero
      expect(Math.abs(m.hero.height - m.vh)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(Math.abs(m.frame.top)).toBeLessThanOrEqual(SUBPIXEL_TOL_PX);
      expect(Math.abs(m.frame.height - m.hero.height)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(Math.abs(m.entries.bottom - m.hero.bottom)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(m.card.bottom).toBeLessThan(m.entries.top);
    } else {
      // tekst na granacie, pod nim pole zdjęcia do dolnej krawędzi hero,
      // wejścia w polu zdjęcia
      expect(Math.abs(m.frame.top - m.text.bottom)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(Math.abs(m.frame.bottom - m.hero.bottom)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(m.frame.height).toBeLessThan(m.hero.height - 100);
      expect(m.entries.top).toBeGreaterThan(m.frame.top);
      expect(m.entries.bottom).toBeLessThan(m.frame.bottom);
    }
    expect(issues()).toEqual([]);
  });

  test("surowy HTML: preload zdjęcia per plik, bramka ruchu w <head>; kadr pionowy poniżej 768", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
    const raw = await (await page.request.get(SERVICES_PATH)).text();
    const head = raw.slice(0, raw.indexOf("</head>"));
    const preloads = head.match(
      /<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g,
    );
    expect(preloads?.length).toBe(2);
    expect(preloads?.[0]).toContain("uslugi-hero-tall");
    expect(preloads?.[0]).toContain(
      `media="(max-width: ${SERVICES_HERO_TALL_BELOW_PX - 1}px)"`,
    );
    expect(preloads?.[1]).toContain(
      `media="(min-width: ${SERVICES_HERO_TALL_BELOW_PX}px)"`,
    );
    expect(preloads?.[1]).not.toContain("uslugi-hero-tall");
    expect(head).toContain('classList.add("js-motion")');
    // kotwice bez sufiksów gałęzi eksportu; bez płynnego przewijania
    for (const id of ANCHOR_IDS) {
      expect(raw).toContain(`id="${id}"`);
      expect(raw).toContain(`href="#${id}"`);
    }
    expect(raw).not.toMatch(/id="[a-z-]+-(m|d)"/);

    await gotoReady(page, SERVICES_PATH);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    const source = page.locator(`${HERO} picture source`);
    await expect(source).toHaveAttribute(
      "media",
      `(max-width: ${SERVICES_HERO_TALL_BELOW_PX - 1}px)`,
    );
    // kadr o PEŁNEJ wysokości źródła (analiza SV9)
    await expect(source).toHaveAttribute("width", "864");
    await expect(source).toHaveAttribute("height", "617");
    const src = () =>
      page.locator(PHOTO).evaluate((el: HTMLImageElement) => el.currentSrc);
    await page.setViewportSize({
      width: SERVICES_HERO_TALL_BELOW_PX - 1,
      height: 900,
    });
    await expect.poll(src).toContain("uslugi-hero-tall");
    await page.setViewportSize({
      width: SERVICES_HERO_TALL_BELOW_PX,
      height: 900,
    });
    await expect.poll(src).not.toContain("uslugi-hero-tall");
  });
});

test.describe("usługi: kotwice", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "kotwice: desktop + dwa profile mobilne");
  });

  for (const [i, id] of ANCHOR_IDS.entries()) {
    test(`wejście hero → #${id}: sekcja staje w miejscu docelowym`, async ({
      page,
    }) => {
      await gotoReady(page, SERVICES_PATH);
      await page.locator(`${ENTRIES} a`).nth(i).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expectAtAnchor(page, id);
    });

    test(`wejście z adresu ${SERVICES_PATH}#${id}`, async ({ page }) => {
      await gotoReady(page, `${SERVICES_PATH}#${id}`);
      await expectAtAnchor(page, id);
    });
  }

  test("ze strony głównej: kafle sekcji „Usługi” trafiają w sekcje", async ({
    page,
  }) => {
    const items = HOME_COPY.services.items;
    expect(items.map((item) => item.href)).toEqual(
      ANCHOR_IDS.map((id) => `${SERVICES_PATH}#${id}`),
    );
    for (const [i, id] of ANCHOR_IDS.entries()) {
      await gotoReady(page, HOME_PATH);
      await page.locator('[data-home="uslugi"] a.hsv-tile').nth(i).click();
      await expect(page).toHaveURL(new RegExp(`${SERVICES_PATH}#${id}$`));
      await page.waitForLoadState("load");
      await expectAtAnchor(page, id);
    }
  });
});

test.describe("usługi: treść i układ", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
  });

  test("sekcje: nagłówki, akapity, listy i zdjęcia z services-copy", async ({
    page,
  }) => {
    await gotoReady(page, SERVICES_PATH);
    for (const [name, part] of [
      ["sprzedaje", t.sell],
      ["kupuje", t.buy],
      ["pomoc-prawna", t.legal],
    ] as const) {
      const sec = page.locator(section(name));
      const id = `uslugi-${name}-h`;
      await expect(sec).toHaveAttribute("id", name);
      await expect(sec).toHaveAttribute("aria-labelledby", id);
      await expect(sec.locator("h2")).toHaveCount(1);
      await expect(sec.locator(`h2#${id}`)).toHaveText(heading(part));
      await expect(sec.locator(".sx-head .sx-eyebrow")).toHaveText(
        part.eyebrow,
      );
      await expect(sec.getByText(part.text, { exact: true })).toHaveCount(1);

      // lista numerowana: <ol>, pozycje w kolejności z services-copy
      const list = sec.locator("[data-services-list]");
      await expect(list).toHaveCount(1);
      expect(await list.evaluate((el) => el.tagName)).toBe("OL");
      const rows = list.locator("> li");
      await expect(rows).toHaveCount(part.items.length);
      for (const [i, item] of part.items.entries()) {
        await expect(rows.nth(i).locator("h3")).toHaveText(item.title);
        await expect(rows.nth(i).locator("p")).toHaveText(item.text);
      }
    }
    expect(t.sell.items.length).toBe(5);
    expect(t.buy.items.length).toBe(5);
    expect(t.legal.items.length).toBe(6);

    // zdjęcia w treści: opis, wymiary, lazy
    for (const [name, alts] of [
      ["sprzedaje", [t.sell.imageAlt]],
      ["kupuje", [t.buy.firstAlt, t.buy.secondAlt]],
      ["pomoc-prawna", [t.legal.firstAlt, t.legal.secondAlt]],
    ] as const) {
      for (const alt of alts) {
        const img = page.locator(`${section(name)} img[alt="${alt}"]`);
        await expect(img).toHaveCount(1);
        await expect(img).toHaveAttribute("loading", "lazy");
        await expect(img).toHaveAttribute("width", /^\d+$/);
        await expect(img).toHaveAttribute("height", /^\d+$/);
      }
    }
    // warianty zdjęć per próg: na desktopie w DOM, ukryte te spod progu
    for (const el of await page
      .locator('[data-services-extra="below"]')
      .all()) {
      await expect(el).toBeHidden();
    }
    await expect(page.locator('[data-services-extra="below"]')).toHaveCount(3);
    const desktopOnly = page.locator('[data-services-extra="desktop"]');
    await expect(desktopOnly).toHaveCount(2);
    for (const el of await desktopOnly.all()) {
      await expect(el).toBeVisible();
    }
  });

  test("pasy CTA i blok zamykający: teksty i cele linków", async ({ page }) => {
    await gotoReady(page, SERVICES_PATH);
    const sell = page.locator(`${section("sprzedaje")} [data-services-cta]`);
    await expect(sell.locator(".uc-eyebrow")).toHaveText(t.sell.cta.eyebrow);
    await expect(sell.locator(".uc-text")).toHaveText(t.sell.cta.text);
    const form = sell.locator("a.uc-ghost");
    await expect(form.locator(".uc-kicker")).toHaveText(t.sell.cta.formKicker);
    await expect(form.locator(".uc-name")).toHaveText(t.sell.cta.form);
    await expect(form).toHaveAttribute("href", SELL_PATH);

    const buy = page.locator(`${section("kupuje")} [data-services-cta]`);
    await expect(buy.locator(".uc-eyebrow")).toHaveText(t.buy.cta.eyebrow);
    await expect(buy.locator(".uc-text")).toHaveText(t.buy.cta.text);
    const contact = buy.locator("a.sx-btn");
    await expect(contact).toHaveText(t.buy.cta.contact);
    await expect(contact).toHaveAttribute("href", CONTACT_PATH);
    const offers = buy.locator("a.uc-ghost");
    await expect(offers.locator(".uc-name")).toHaveText(t.buy.cta.offers);
    await expect(offers).toHaveAttribute("href", OFFERS_PATH);

    const legal = page.locator(section("pomoc-prawna"));
    await expect(legal.locator(".ul-close-eyebrow")).toHaveText(
      t.legal.cta.eyebrow,
    );
    await expect(legal.locator(".ul-close-text")).toHaveText(t.legal.cta.text);
    const describe = legal.locator("a.sx-btn");
    await expect(describe).toHaveText(t.legal.cta.contact);
    await expect(describe).toHaveAttribute("href", CONTACT_PATH);

    for (const path of [SELL_PATH, CONTACT_PATH, OFFERS_PATH]) {
      expect((await page.request.get(path)).status()).toBeLessThan(400);
    }
  });

  test("slot telefonu: surowy <main> bez numeru; po JS przycisk dostaje tel:, etykieta zostaje", async ({
    page,
  }) => {
    const raw = await (await page.request.get(SERVICES_PATH)).text();
    const main = raw.slice(raw.indexOf("<main"), raw.indexOf("</main>"));
    expect(main.length).toBeGreaterThan(1000);
    const digits = buildPhoneHref().replace(/\D/g, "");
    expect(main.replace(/[\s-]/g, "")).not.toContain(digits.slice(2));
    expect(main).not.toContain("tel:");
    expect(main).not.toContain("mailto:");
    // jeden slot: przycisk z etykietą, cel podmieniany przez JS
    const slots = main.match(/<a[^>]*data-tel[^>]*>/g);
    expect(slots?.length).toBe(1);
    expect(slots?.[0]).toContain('data-fill="href"');
    expect(slots?.[0]).toContain(`href="${CONTACT_PATH}"`);

    await gotoReady(page, SERVICES_PATH);
    const call = page.locator(`${section("sprzedaje")} a[data-tel]`);
    await expect(call).toHaveCount(1);
    await expect(call).toHaveAttribute("href", buildPhoneHref());
    await expect(call).toHaveText(t.sell.cta.call);
  });

  test("próg 1025: hero, siatki sekcji, układy list, pasy CTA, zdjęcia per próg", async ({
    page,
  }) => {
    await gotoReady(page, SERVICES_PATH);
    await expectBreakpointFlip(
      page,
      SERVICES_DESKTOP_MIN_PX,
      {
        heroStage: ".uh-stage",
        entries: ENTRIES,
        sell: ".us-in",
        buyTop: ".ub-top",
        buyFirst: ".ub-frame--first",
        listCols: ".sl--cols",
        cta: ".uc-in",
        ctaBg: ".uc-bg--below",
        legal: ".ul-in",
        legalMain: ".ul-main",
        legalBg: ".ul-bg",
        legalSecond: ".ul-frame--second",
        closeBg: ".ul-close-bg",
      },
      {
        heroStage: "flex",
        entries: "flex",
        sell: "flex",
        buyTop: "flex",
        buyFirst: "none",
        listCols: "flex",
        cta: "flex",
        ctaBg: "block",
        legal: "flex",
        legalMain: "contents",
        legalBg: "none",
        legalSecond: "block",
        closeBg: "block",
      },
      {
        heroStage: "block",
        entries: "grid",
        sell: "grid",
        buyTop: "grid",
        buyFirst: "block",
        listCols: "grid",
        cta: "grid",
        ctaBg: "none",
        legal: "grid",
        legalMain: "flex",
        legalBg: "block",
        legalSecond: "none",
        closeBg: "none",
      },
    );

    // kadr zdjęcia hero: poniżej progu niższy od sekcji, od progu ją
    // wypełnia; pas CTA: poniżej progu w kolumnie treści, od progu na całą
    // szerokość okna; „Pomoc prawna": zdjęcia między akapitem i listą ↔
    // obok listy
    const probe = () =>
      page.evaluate(
        ({ heroSel, sellSel, legalSel }) => {
          const r = (sel: string) =>
            document.querySelector(sel)!.getBoundingClientRect();
          return {
            hero: r(heroSel).height,
            frame: r(".uh-media").height,
            ctaWidth: r(`${sellSel} [data-services-cta]`).width,
            vw: document.documentElement.clientWidth,
            text: r(`${legalSel} .ul-text`).bottom,
            photos: r(`${legalSel} .ul-photos`).top,
            list: r(`${legalSel} [data-services-list]`).top,
          };
        },
        {
          heroSel: HERO,
          sellSel: section("sprzedaje"),
          legalSel: section("pomoc-prawna"),
        },
      );
    const height = page.viewportSize()?.height ?? 900;
    await page.setViewportSize({ width: SERVICES_DESKTOP_MIN_PX - 1, height });
    await settle(page, 150);
    const below = await probe();
    expect(below.frame).toBeLessThan(below.hero - 100);
    expect(below.ctaWidth).toBeLessThan(below.vw - 20);
    expect(below.photos).toBeGreaterThanOrEqual(below.text);
    expect(below.list).toBeGreaterThan(below.photos);
    await page.setViewportSize({ width: SERVICES_DESKTOP_MIN_PX, height });
    await settle(page, 150);
    const above = await probe();
    expect(Math.abs(above.frame - above.hero)).toBeLessThanOrEqual(
      SUBPIXEL_TOL_PX,
    );
    expect(Math.abs(above.ctaWidth - above.vw)).toBeLessThanOrEqual(
      SUBPIXEL_TOL_PX,
    );
    expect(above.list).toBeGreaterThanOrEqual(above.text);
    expect(above.photos).toBeLessThan(above.text);
  });

  test("zero podmiotów trzecich przy wejściu i po przejeździe przez stronę", async ({
    page,
    baseURL,
  }) => {
    const own = new URL(baseURL ?? "http://localhost:4399").host;
    const foreign: string[] = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.protocol.startsWith("http") && url.host !== own) {
        foreign.push(url.host);
      }
    });
    await gotoReady(page, SERVICES_PATH);
    await revealSweep(page);
    expect(foreign).toEqual([]);
  });
});

test.describe("usługi: telefon", () => {
  test("zdjęcia spod progu, cele dotyku, brak przewijania w bok", async ({
    page,
  }, testInfo) => {
    only(testInfo, MOBILE_PROJECTS, "układ poniżej progu");
    await gotoReady(page, SERVICES_PATH);
    await revealSweep(page);
    // warianty zdjęć: widoczne te spod progu, ukryte desktopowe
    for (const el of await page
      .locator('[data-services-extra="below"]')
      .all()) {
      await el.scrollIntoViewIfNeeded();
      await expect(el).toBeVisible();
    }
    for (const el of await page
      .locator('[data-services-extra="desktop"]')
      .all()) {
      await expect(el).toBeHidden();
    }
    // przyciski pasów CTA i bloku zamykającego: cel dotyku ≥ 48 px
    const buttons = page.locator(
      "[data-services-cta] a, section[data-services] a.ul-btn",
    );
    await expect(buttons).toHaveCount(5);
    for (const button of await buttons.all()) {
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(48);
    }
    // pas CTA stoi w kolumnie treści (nie na całą szerokość okna)
    const cta = await page
      .locator(`${section("sprzedaje")} [data-services-cta]`)
      .boundingBox();
    const vw = page.viewportSize()?.width ?? 0;
    expect(cta?.x).toBeGreaterThan(10);
    expect((cta?.x ?? 0) + (cta?.width ?? 0)).toBeLessThan(vw - 10);
    // strona nie przewija się w bok
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
});

test.describe("usługi: bez JS", () => {
  test.use({ javaScriptEnabled: false });

  test("strona kompletna: hero, sekcje widoczne, kotwice i przycisk telefonu w HTML, pasek pełny", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "wersja bez JS niezależna od profilu");
    await page.goto(SERVICES_PATH);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(PHOTO)).toBeVisible();
    const blocks = await page.locator("main [data-rv]").all();
    expect(blocks.length).toBeGreaterThan(8);
    for (const block of blocks) {
      await expect(block).toHaveCSS("opacity", "1");
    }
    // wejścia hero to zwykłe kotwice; numer składa JS — bez niego przycisk
    // telefonu prowadzi na stronę kontaktu
    for (const [i, id] of ANCHOR_IDS.entries()) {
      await expect(page.locator(`${ENTRIES} a`).nth(i)).toHaveAttribute(
        "href",
        `#${id}`,
      );
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
    }
    const call = page.locator(`${section("sprzedaje")} a[data-tel]`);
    await expect(call).toBeVisible();
    await expect(call).toHaveAttribute("href", CONTACT_PATH);
    await expect(call).toHaveText(t.sell.cta.call);
    // pasek nad hero bez JS: pełne tło (nie ma kto go przemalować)
    await expect(page.locator(".hdr-bg")).toHaveCSS("opacity", "1");
  });
});

test.describe("usługi: ruch", () => {
  test("reveale: blok spod zgięcia startuje ukryty i odsłania się po wejściu w kadr", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, SERVICES_PATH);
    await expect(page.locator("html")).toHaveClass(/js-motion/);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "");
    // hero zajmuje co najmniej całe okno — „Sprzedaję" leży pod zgięciem
    const block = page.locator(`${section("sprzedaje")} [data-rv]`).first();
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
    // reveale stoją wyłącznie na blokach nieinteraktywnych
    const interactive = ["A", "BUTTON", "INPUT", "LABEL", "SUMMARY"];
    expect(
      (
        await page
          .locator("main [data-rv]")
          .evaluateAll((els) => els.map((el) => el.tagName))
      ).filter((tag) => interactive.includes(tag)),
    ).toEqual([]);
  });

  test("parallax: zapas obrazu ≥ ruch (sonda układu), hero bez przesunięcia na starcie, kierunek odwrotny", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, SERVICES_PATH);
    const desktop = isDesktop(page);
    const amt = desktop ? PX_AMT_DESKTOP : PX_AMT_MOBILE;
    // sonda: tylko kadry widoczne w układzie (warianty zdjęć spoza progu
    // są `display: none`)
    const probe = () =>
      page.locator("[data-px]").evaluateAll((imgs) =>
        imgs
          .map((img) => {
            const frame = img.closest(".px-frame")!.getBoundingClientRect();
            const r = img.getBoundingClientRect();
            return {
              mode: (img as HTMLElement).dataset.px ?? "",
              where:
                img
                  .closest("section[data-services]")
                  ?.getAttribute("data-services") ?? "",
              frameTop: frame.top,
              frameH: frame.height,
              above: frame.top - r.top,
              below: r.bottom - frame.bottom,
              slack: (r.height - frame.height) / 2,
              // przesunięcie wpisane przez moduł ruchu (inline)
              inline: new DOMMatrix((img as HTMLElement).style.transform).f,
              vh: window.innerHeight,
            };
          })
          .filter((p) => p.frameH > 0),
      );
    const start = await probe();
    // desktop: hero, klucze, tło pasa „Sprzedaję", dwa kadry „Kupuję", tło
    // „Pomocy prawnej", kadr „prawne 1"; poniżej progu: hero, klucze, tło
    // pasa „Sprzedaję", kadr „Kupuję", tło pasa „Kupuję", dwa kadry
    // „Pomocy prawnej", tło bloku zamykającego
    expect(start.length).toBe(desktop ? 7 : 8);
    // zapas układu = amplituda × wysokość kadru (W PARZE: --px-a ↔ PX_AMT_*)
    for (const p of start) {
      expect(p.slack).toBeGreaterThanOrEqual(amt * p.frameH - SUBPIXEL_TOL_PX);
    }

    // zdjęcie hero (`data-px="top"`): przy scrollu 0 przesunięcie 0 na OBU
    // progach — poniżej progu kadr NIE zaczyna się na górze strony (stoi
    // pod blokiem tekstu), punkt zerowy wynika z jego pozycji w dokumencie;
    // CSS nie daje pozycji startowej (transform bez stylu inline = brak)
    const hero = start.filter((p) => p.mode === "top");
    expect(hero.length).toBe(1);
    if (!desktop) expect(hero[0].frameTop).toBeGreaterThan(100);
    expect(Math.abs(hero[0].inline)).toBeLessThanOrEqual(0.2);
    expect(
      await page.locator(PHOTO).evaluate((img) => {
        const el = img as HTMLElement;
        const inline = el.style.transform;
        el.style.transform = "";
        const css = getComputedStyle(el).transform;
        el.style.transform = inline;
        return css;
      }),
    ).toBe("none");

    // w każdej pozycji scrolla obraz zakrywa cały kadr
    const total = await page.evaluate(
      () => document.body.scrollHeight - window.innerHeight,
    );
    for (const y of [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * total)) {
      await scrollAndPaint(page, y);
      for (const p of await probe()) {
        expect(p.above).toBeGreaterThanOrEqual(-SUBPIXEL_TOL_PX);
        expect(p.below).toBeGreaterThanOrEqual(-SUBPIXEL_TOL_PX);
      }
    }
    // zdjęcie hero po przewinięciu jedzie w górę (jak zwykły kadr)
    await scrollAndPaint(page, hero[0].frameH / 2);
    const moved = (await probe()).find((p) => p.mode === "top")!;
    expect(moved.inline).toBeLessThan(-1);

    // kierunek odwrotny: zdjęcie `data-px="-1"` ma przesunięcie o znaku
    // przeciwnym do wzoru zwykłego kadru; sąsiad — zgodne. Para: od progu
    // dwa kadry „Kupuję", poniżej progu dwa kadry „Pomocy prawnej".
    const where: SectionName = desktop ? "kupuje" : "pomoc-prawna";
    const reversedImg = page.locator(`${section(where)} [data-px="-1"]`);
    await expect(reversedImg).toHaveCount(1);
    const frameTop = await reversedImg.evaluate(
      (img) =>
        img.closest(".px-frame")!.getBoundingClientRect().top + window.scrollY,
    );
    const vh = await page.evaluate(() => window.innerHeight);
    // kadr w górnej części okna: postęp wyraźnie powyżej połowy
    await scrollAndPaint(page, frameTop - vh * 0.15);
    const pair = (await probe()).filter(
      (p) =>
        p.where === where &&
        Math.abs(p.frameTop - vh * 0.15) < vh * 0.25 &&
        p.frameH < vh,
    );
    const formula = (p: (typeof pair)[number]) => {
      const progress = Math.min(
        1,
        Math.max(0, (p.vh - p.frameTop) / (p.vh + p.frameH)),
      );
      return (0.5 - progress) * 2 * amt * p.frameH;
    };
    const reversed = pair.find((p) => p.mode === "-1")!;
    const regular = pair.find((p) => p.mode === "")!;
    expect(reversed).toBeTruthy();
    expect(regular).toBeTruthy();
    expect(Math.abs(reversed.inline + formula(reversed))).toBeLessThanOrEqual(
      0.2,
    );
    expect(Math.abs(regular.inline - formula(regular))).toBeLessThanOrEqual(
      0.2,
    );
    expect(reversed.inline).toBeGreaterThan(1);
    expect(regular.inline).toBeLessThan(-1);
  });

  test("ruch ograniczony (reduce): treść widoczna od razu, zero transformów, kotwice działają", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "ścieżka reduce — jeden profil");
    // PUNKTOWA emulacja reduce — dozwolony wyjątek od zakazu z testing.md:
    // ten test weryfikuje właśnie ścieżkę reduce.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoReady(page, SERVICES_PATH);
    await settle(page, 600);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "");
    const below = page.locator(`${section("sprzedaje")} [data-rv]`).first();
    await expect(below).toHaveCSS("opacity", "1");
    await expect(below).not.toHaveClass(/is-in/);
    await scrollPageTo(page, 300);
    for (const img of await page.locator("[data-px]").all()) {
      await expect(img).toHaveCSS("transform", "none");
    }
    // skok kotwicy bez modułu ruchu
    await scrollPageTo(page, 0);
    await page.locator(`${ENTRIES} a`).nth(1).click();
    await expect
      .poll(() =>
        page
          .locator(`#${SERVICES_ANCHORS.buy}`)
          .evaluate((el) => Math.abs(el.getBoundingClientRect().top)),
      )
      .toBeLessThanOrEqual(ANCHOR_TOL_PX);
  });

  test("scroll jest natywny (bez pośrednika i bez blokady dokumentu)", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, SERVICES_PATH);
    const state = await page.evaluate(() => {
      window.scrollTo(0, 600);
      return {
        y: window.scrollY,
        html: getComputedStyle(document.documentElement).overflowY,
        body: getComputedStyle(document.body).overflowY,
        position: getComputedStyle(document.body).position,
      };
    });
    expect(state.y).toBe(600);
    expect(state.html).not.toBe("hidden");
    expect(state.body).not.toBe("hidden");
    expect(state.position).not.toBe("fixed");
  });
});

test("usługi: axe bez naruszeń po odsłonięciu całej strony", async ({
  page,
}, testInfo) => {
  only(testInfo, A11Y_PROJECTS, "skan a11y: desktop + jeden profil mobilny");
  await gotoReady(page, SERVICES_PATH);
  // reveale chowają treść spod zgięcia (opacity 0) — axe by ją pominął
  await revealSweep(page);
  await expect(
    page.locator("html.js-motion [data-rv]:not(.is-in)"),
  ).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
});
