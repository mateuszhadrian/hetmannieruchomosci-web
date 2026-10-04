// /o-nas/ (Etap 4.5, docs/analiza-o-nas.md §5): hero ze zdjęciem pod
// przezroczystym paskiem (zdjęcie i h1 poza revealami; telefon — zdjęcie
// od góry okna z nasuniętą kartą, desktop — pełne okno z pasem liczb),
// historia, specjalizacja, wejście na kontakt (sloty antyscrapingowe),
// progi układu, wersja bez JS, ruch (reveale, parallax z zapasem ≥ ruch,
// zdjęcie hero bez przesunięcia przy scrollu 0, kierunek odwrotny zdjęcia
// założycielki), zero podmiotów trzecich, axe. Treść na `chromium-1920`;
// hero, układ i ruch także na `chromium-pixel-5` i `webkit-iphone-14`.
// Wariant paska nad hero: navigation.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  ABOUT_DESKTOP_MIN_PX,
  ABOUT_HERO_SMALL_BELOW_PX,
} from "../../src/components/sections/about/about-config";
import { ABOUT_COPY } from "../../src/components/sections/about/about-copy";
import {
  PX_AMT_DESKTOP,
  PX_AMT_MOBILE,
} from "../../src/components/sections/content-config";
import { ui } from "../../src/i18n/ui";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";
import { BUSINESS } from "../../src/lib/jsonld";
import { ABOUT_PATH, CONTACT_PATH } from "../../src/lib/routes";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import { collectPageIssues, usePreviewGuard } from "../helpers/guards";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";
import { revealSweep } from "../helpers/visual";

usePreviewGuard();

const DESKTOP = "chromium-1920";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const LAYOUT_PROJECTS = [DESKTOP, ...MOBILE_PROJECTS];
const A11Y_PROJECTS = [DESKTOP, "chromium-pixel-5"];
const SUBPIXEL_TOL_PX = 0.5;

const only = (testInfo: TestInfo, projects: string[], why: string) =>
  test.skip(!projects.includes(testInfo.project.name), why);

const isDesktop = (page: Page) =>
  (page.viewportSize()?.width ?? 0) >= ABOUT_DESKTOP_MIN_PX;

const HERO = "[data-about-hero]";
const PHOTO = "[data-about-photo]";
const FRAME = `${HERO} [data-nav-hero]`;
const section = (name: "historia" | "specjalizacja" | "kontakt") =>
  `section[data-about="${name}"]`;
const heading = (part: { title: string; accent: string }) =>
  `${part.title} ${part.accent}`;

const t = ABOUT_COPY;

/** Przewinięcie + wymuszony przemalunek pętli parallaxu: WebKit potrafi
 *  nie dostarczyć zdarzenia `scroll` po programowym skoku (testing.md,
 *  `revealSweep`), a sonda porównuje przesunięcie z bieżącą pozycją. */
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

test.describe("o nas: hero", () => {
  test("h1, teksty z about-copy, zdjęcie priorytetowe, geometria per próg", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "układ: desktop + dwa profile mobilne");
    const issues = collectPageIssues(page);
    await gotoReady(page, ABOUT_PATH);
    await expect(page).toHaveTitle(ui.pl["aboutPage.title"]);
    const h1 = page.locator("main h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(heading(t.hero));
    const hero = page.locator(HERO);
    await expect(hero.locator(".ah-eyebrow")).toHaveText(t.hero.eyebrow);
    await expect(hero.getByText(t.hero.lead)).toBeVisible();

    // pas liczb na OBU progach (analiza Q1): trzy pozycje z about-copy
    const stats = hero.locator("[data-about-stats] li");
    await expect(stats).toHaveCount(t.hero.stats.length);
    for (const [i, s] of t.hero.stats.entries()) {
      await expect(stats.nth(i)).toBeVisible();
      await expect(stats.nth(i).locator("strong")).toHaveText(s.value);
      await expect(stats.nth(i).locator("span")).toHaveText(s.label);
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

    // geometria (sub-pikselowo): kadr zdjęcia = element, z którego pasek
    // liczy próg przemalowania
    await expect(page.locator(FRAME)).toHaveCount(1);
    const m = await page.evaluate(
      ({ heroSel, frameSel }) => {
        const rect = (sel: string) => {
          const r = document.querySelector(sel)!.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: r.height };
        };
        return {
          hero: rect(heroSel),
          frame: rect(frameSel),
          card: rect(".ah-card"),
          h1: rect("main h1"),
          stats: rect("[data-about-stats]"),
          vw: window.innerWidth,
          vh: window.innerHeight,
        };
      },
      { heroSel: HERO, frameSel: FRAME },
    );
    expect(m.hero.top).toBe(0);
    expect(m.frame.top).toBe(0);
    if (isDesktop(page)) {
      // pełne okno; kadr zdjęcia wypełnia sekcję; pas liczb u dołu hero
      expect(Math.abs(m.hero.height - m.vh)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(Math.abs(m.frame.height - m.hero.height)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(Math.abs(m.stats.bottom - m.hero.bottom)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(m.h1.bottom).toBeLessThan(m.stats.top);
    } else {
      // zdjęcie od góry okna, niższe od okna (wysokość z szerokości);
      // karta nasunięta na jego dół; hero co najmniej na wysokość okna
      const expected = Math.min(460, Math.max(300, 0.88 * m.vw));
      expect(Math.abs(m.frame.height - expected)).toBeLessThanOrEqual(
        SUBPIXEL_TOL_PX,
      );
      expect(m.frame.height).toBeLessThan(m.vh);
      expect(m.card.top).toBeLessThan(m.frame.bottom);
      expect(m.card.bottom).toBeGreaterThan(m.frame.bottom);
      expect(m.hero.height).toBeGreaterThanOrEqual(m.vh - SUBPIXEL_TOL_PX);
      expect(m.stats.top).toBeGreaterThan(m.card.bottom);
    }
    expect(issues()).toEqual([]);
  });

  test("surowy HTML: preload zdjęcia per plik, bramka ruchu w <head>; mniejszy plik poniżej 768", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
    const raw = await (await page.request.get(ABOUT_PATH)).text();
    const head = raw.slice(0, raw.indexOf("</head>"));
    const preloads = head.match(
      /<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g,
    );
    expect(preloads?.length).toBe(2);
    expect(preloads?.[0]).toContain("onas-hero-m");
    expect(preloads?.[0]).toContain(
      `media="(max-width: ${ABOUT_HERO_SMALL_BELOW_PX - 1}px)"`,
    );
    expect(preloads?.[1]).toContain(
      `media="(min-width: ${ABOUT_HERO_SMALL_BELOW_PX}px)"`,
    );
    expect(preloads?.[1]).not.toContain("onas-hero-m");
    expect(head).toContain('classList.add("js-motion")');

    await gotoReady(page, ABOUT_PATH);
    const source = page.locator(`${HERO} picture source`);
    await expect(source).toHaveAttribute(
      "media",
      `(max-width: ${ABOUT_HERO_SMALL_BELOW_PX - 1}px)`,
    );
    await expect(source).toHaveAttribute("width", "1024");
    await expect(source).toHaveAttribute("height", "574");
    const src = () =>
      page.locator(PHOTO).evaluate((el: HTMLImageElement) => el.currentSrc);
    await page.setViewportSize({
      width: ABOUT_HERO_SMALL_BELOW_PX - 1,
      height: 900,
    });
    await expect.poll(src).toContain("onas-hero-m");
    await page.setViewportSize({
      width: ABOUT_HERO_SMALL_BELOW_PX,
      height: 900,
    });
    await expect.poll(src).not.toContain("onas-hero-m");
  });
});

test.describe("o nas: treść i układ", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
  });

  test("historia, specjalizacja, kontakt: nagłówki i teksty z about-copy", async ({
    page,
  }) => {
    await gotoReady(page, ABOUT_PATH);
    for (const [name, part] of [
      ["historia", t.history],
      ["specjalizacja", t.focus],
      ["kontakt", t.contact],
    ] as const) {
      const sec = page.locator(section(name));
      const id = `about-${name}-h`;
      await expect(sec).toHaveAttribute("aria-labelledby", id);
      await expect(sec.locator("h2")).toHaveCount(1);
      await expect(sec.locator(`h2#${id}`)).toHaveText(heading(part));
      await expect(sec.locator(".sx-eyebrow")).toHaveText(part.eyebrow);
    }

    // historia: dwa akapity, dwa zdjęcia z opisem i wymiarami, podpis
    const history = page.locator(section("historia"));
    const paragraphs = history.locator(".ay-body p");
    await expect(paragraphs).toHaveCount(t.history.paragraphs.length);
    for (const [i, p] of t.history.paragraphs.entries()) {
      await expect(paragraphs.nth(i)).toHaveText(p);
    }
    for (const alt of [t.history.founderAlt, t.history.documentsAlt]) {
      const img = history.locator(`img[alt="${alt}"]`);
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute("loading", "lazy");
      await expect(img).toHaveAttribute("width", /^\d+$/);
      await expect(img).toHaveAttribute("height", /^\d+$/);
    }
    const caption = history.locator("figcaption");
    await expect(caption).toContainText(t.history.founderName);
    await expect(caption.locator("span")).toHaveText(t.history.founderRole);

    // specjalizacja: jedna treść (akapit, dopisek, lista trzech pozycji)
    const focus = page.locator(section("specjalizacja"));
    await expect(focus.locator(".af-text")).toHaveText(t.focus.text);
    await expect(focus.locator(".af-note")).toHaveText(t.focus.note);
    const items = focus.locator(".af-list li");
    await expect(items).toHaveCount(t.focus.items.length);
    for (const [i, item] of t.focus.items.entries()) {
      await expect(items.nth(i)).toHaveText(item);
    }
    await expect(
      focus.locator(`img[alt="${t.focus.contractAlt}"]`),
    ).toBeVisible();
    // drugie zdjęcie tylko poniżej progu — na desktopie w DOM, ukryte
    await expect(
      focus.locator(`img[alt="${t.focus.paperworkAlt}"]`),
    ).toHaveCount(1);
    await expect(focus.locator("[data-about-extra]")).toBeHidden();

    // kontakt: akapit i wejście na /kontakt/
    const contact = page.locator(section("kontakt"));
    await expect(contact.locator(".ac-text")).toHaveText(t.contact.text);
    const cta = contact.locator("a.sx-btn");
    await expect(cta).toHaveText(t.contact.cta);
    await expect(cta).toHaveAttribute("href", CONTACT_PATH);
    expect((await page.request.get(CONTACT_PATH)).status()).toBeLessThan(400);
  });

  test("sloty: surowy <main> bez telefonu i e-maila; po JS tel: i mailto: w karcie kontaktu", async ({
    page,
  }) => {
    const raw = await (await page.request.get(ABOUT_PATH)).text();
    const main = raw.slice(raw.indexOf("<main"), raw.indexOf("</main>"));
    expect(main.length).toBeGreaterThan(1000);
    const digits = buildPhoneHref().replace(/\D/g, "");
    expect(main.replace(/[\s-]/g, "")).not.toContain(digits.slice(2));
    expect(main).not.toContain(buildEmail("biuro"));
    expect(main).not.toContain("tel:");
    expect(main).not.toContain("mailto:");
    // dwie puste, ukryte kotwice z <span data-slot> (e-mail, telefon)
    expect(
      main.match(/<a[^>]*data-(?:tel|mail)[^>]*hidden[^>]*>\s*<span data-slot/g)
        ?.length,
    ).toBe(2);

    await gotoReady(page, ABOUT_PATH);
    const list = page.locator("[data-about-contacts]");
    const rows = list.locator("li");
    await expect(rows).toHaveCount(3);
    const labels = t.contact.labels;
    await expect(rows.nth(0).locator(".ac-k")).toHaveText(labels.mail);
    await expect(rows.nth(1).locator(".ac-k")).toHaveText(labels.phone);
    await expect(rows.nth(2).locator(".ac-k")).toHaveText(labels.office);
    const mail = list.locator('a[data-mail="biuro"]');
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute("href", `mailto:${buildEmail("biuro")}`);
    await expect(mail).toHaveText(buildEmail("biuro"));
    const tel = list.locator("a[data-tel]");
    await expect(tel).toBeVisible();
    await expect(tel).toHaveAttribute("href", buildPhoneHref());
    await expect(tel).toHaveText(buildPhoneDisplay());
    // adres biura z jednego źródła danych firmy
    const office = rows.nth(2).locator(".ac-v");
    await expect(office).toContainText(BUSINESS.street);
    await expect(office).toContainText(BUSINESS.postalCode);
    await expect(office).toContainText(BUSINESS.locality);
  });

  test("próg 1025: hero, siatki sekcji, drugie zdjęcie, lista kontaktu", async ({
    page,
  }) => {
    await gotoReady(page, ABOUT_PATH);
    await expectBreakpointFlip(
      page,
      ABOUT_DESKTOP_MIN_PX,
      {
        heroIn: ".ah-in",
        history: ".ay-in",
        focus: ".af",
        focusMedia: ".af-media",
        extra: "[data-about-extra]",
        contact: ".ac-in",
        contacts: "[data-about-contacts]",
      },
      {
        heroIn: "block",
        history: "flex",
        focus: "flex",
        focusMedia: "grid",
        extra: "block",
        contact: "flex",
        contacts: "none",
      },
      {
        heroIn: "flex",
        history: "grid",
        focus: "grid",
        focusMedia: "flex",
        extra: "none",
        contact: "grid",
        contacts: "flex",
      },
    );

    // kadr zdjęcia hero (znacznik paska): poniżej progu niższy od sekcji,
    // od progu wypełnia ją całą; zdjęcie specjalizacji na całą wysokość
    const frames = () =>
      page.evaluate(
        ({ heroSel, frameSel }) => ({
          hero: document.querySelector(heroSel)!.getBoundingClientRect().height,
          frame: document.querySelector(frameSel)!.getBoundingClientRect()
            .height,
          focus: document.querySelector(".af")!.getBoundingClientRect().height,
          contract: document
            .querySelector(".af-frame--main")!
            .getBoundingClientRect().height,
        }),
        { heroSel: HERO, frameSel: FRAME },
      );
    const height = page.viewportSize()?.height ?? 900;
    await page.setViewportSize({ width: ABOUT_DESKTOP_MIN_PX - 1, height });
    await settle(page, 150);
    const below = await frames();
    expect(below.frame).toBeLessThan(below.hero - 100);
    expect(below.contract).toBeLessThan(below.focus / 2);
    await page.setViewportSize({ width: ABOUT_DESKTOP_MIN_PX, height });
    await settle(page, 150);
    const above = await frames();
    expect(Math.abs(above.frame - above.hero)).toBeLessThanOrEqual(
      SUBPIXEL_TOL_PX,
    );
    expect(Math.abs(above.contract - above.focus)).toBeLessThanOrEqual(
      SUBPIXEL_TOL_PX,
    );
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
    await gotoReady(page, ABOUT_PATH);
    await revealSweep(page);
    expect(foreign).toEqual([]);
  });
});

test.describe("o nas: telefon", () => {
  test("sekcja kontaktu bez listy danych — nagłówek, akapit, przycisk", async ({
    page,
  }, testInfo) => {
    only(testInfo, MOBILE_PROJECTS, "układ poniżej progu");
    await gotoReady(page, ABOUT_PATH);
    const contact = page.locator(section("kontakt"));
    await expect(contact.locator("[data-about-contacts]")).toBeHidden();
    const cta = contact.locator("a.sx-btn");
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
    // drugie zdjęcie specjalizacji widoczne tylko tutaj
    await expect(
      page.locator(`${section("specjalizacja")} [data-about-extra]`),
    ).toBeVisible();
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

test.describe("o nas: bez JS", () => {
  test.use({ javaScriptEnabled: false });

  test("strona kompletna: hero, sekcje widoczne, sloty ukryte, pasek pełny", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "wersja bez JS niezależna od profilu");
    await page.goto(ABOUT_PATH);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(PHOTO)).toBeVisible();
    const blocks = await page.locator("main [data-rv]").all();
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) {
      await expect(block).toHaveCSS("opacity", "1");
    }
    // numer i adres składa JS — bez niego wiersze slotów znikają, zostają
    // adres biura i przycisk
    const list = page.locator("[data-about-contacts]");
    await expect(list.locator("li:visible")).toHaveCount(1);
    await expect(list.locator("li:visible .ac-v")).toContainText(
      BUSINESS.street,
    );
    await expect(
      page.locator(`${section("kontakt")} a.sx-btn`),
    ).toHaveAttribute("href", CONTACT_PATH);
    // pasek nad hero bez JS: pełne tło (nie ma kto go przemalować)
    await expect(page.locator(".hdr-bg")).toHaveCSS("opacity", "1");
  });
});

test.describe("o nas: ruch", () => {
  test("reveale: blok spod zgięcia startuje ukryty i odsłania się po wejściu w kadr", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, ABOUT_PATH);
    await expect(page.locator("html")).toHaveClass(/js-motion/);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "");
    // hero zajmuje co najmniej całe okno — historia leży pod zgięciem
    const block = page.locator(`${section("historia")} .ay-card[data-rv]`);
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
    await gotoReady(page, ABOUT_PATH);
    const desktop = isDesktop(page);
    const amt = desktop ? PX_AMT_DESKTOP : PX_AMT_MOBILE;
    // sonda: tylko kadry widoczne w układzie (drugie zdjęcie specjalizacji
    // jest na desktopie `display: none`)
    const probe = () =>
      page.locator("[data-px]").evaluateAll((imgs) =>
        imgs
          .map((img) => {
            const frame = img.closest(".px-frame")!.getBoundingClientRect();
            const r = img.getBoundingClientRect();
            return {
              mode: (img as HTMLElement).dataset.px ?? "",
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
    // hero, tło historii, dwa zdjęcia historii, zdjęcie(-a) specjalizacji,
    // tło kontaktu
    expect(start.length).toBe(desktop ? 6 : 7);
    // zapas układu = amplituda × wysokość kadru (W PARZE: --px-a ↔ PX_AMT_*)
    for (const p of start) {
      expect(p.slack).toBeGreaterThanOrEqual(amt * p.frameH - SUBPIXEL_TOL_PX);
    }

    // zdjęcie hero (`data-px="top"`): przy scrollu 0 przesunięcie 0 — moduł
    // ruchu niczego nie przestawia po wczytaniu; CSS nie daje pozycji
    // startowej (transform bez stylu inline = brak)
    const hero = start.filter((p) => p.mode === "top");
    expect(hero.length).toBe(1);
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

    // kierunek odwrotny: zdjęcie założycielki ma przesunięcie o znaku
    // przeciwnym do wzoru zwykłego kadru; sąsiad (dokumenty) — zgodne
    const founder = page.locator(`${section("historia")} [data-px="-1"]`);
    await expect(founder).toHaveCount(1);
    const frameTop = await founder.evaluate(
      (img) =>
        img.closest(".px-frame")!.getBoundingClientRect().top + window.scrollY,
    );
    const vh = await page.evaluate(() => window.innerHeight);
    // kadr w górnej części okna: postęp wyraźnie powyżej połowy
    await scrollAndPaint(page, frameTop - vh * 0.15);
    const pair = (await probe()).filter(
      (p) => Math.abs(p.frameTop - vh * 0.15) < vh * 0.25 && p.mode !== "top",
    );
    const formula = (p: (typeof pair)[number]) => {
      const progress = Math.min(
        1,
        Math.max(0, (p.vh - p.frameTop) / (p.vh + p.frameH)),
      );
      return (0.5 - progress) * 2 * amt * p.frameH;
    };
    const reversed = pair.find((p) => p.mode === "-1")!;
    const regular = pair.find((p) => p.mode === "" && p.frameH < vh)!;
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

  test("ruch ograniczony (reduce): treść widoczna od razu, zero transformów", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "ścieżka reduce — jeden profil");
    // PUNKTOWA emulacja reduce — dozwolony wyjątek od zakazu z testing.md:
    // ten test weryfikuje właśnie ścieżkę reduce.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoReady(page, ABOUT_PATH);
    await settle(page, 600);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "");
    const below = page.locator(`${section("historia")} .ay-card[data-rv]`);
    await expect(below).toHaveCSS("opacity", "1");
    await expect(below).not.toHaveClass(/is-in/);
    await scrollPageTo(page, 300);
    for (const img of await page.locator("[data-px]").all()) {
      await expect(img).toHaveCSS("transform", "none");
    }
  });

  test("scroll jest natywny (bez pośrednika i bez blokady dokumentu)", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, ABOUT_PATH);
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

test("o nas: axe bez naruszeń po odsłonięciu całej strony", async ({
  page,
}, testInfo) => {
  only(testInfo, A11Y_PROJECTS, "skan a11y: desktop + jeden profil mobilny");
  await gotoReady(page, ABOUT_PATH);
  // reveale chowają treść spod zgięcia (opacity 0) — axe by ją pominął
  await revealSweep(page);
  await expect(
    page.locator("html.js-motion [data-rv]:not(.is-in)"),
  ).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
});
