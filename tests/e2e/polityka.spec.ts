// /polityka-prywatnosci/ (Etap 4.7, docs/analiza-polityka.md §6): nagłówek
// z pasmem daty i wersji, spis treści = nagłówki sekcji, kotwice z asercją
// położenia (klik w spis, wejście z adresu, „wstecz"), `sticky` spisu od
// 1025 px (także niskie okno), sloty antyscrapingowe i wersja bez JS
// (dokument identyfikuje administratora ze statycznego HTML), wyróżnione
// prawo sprzeciwu, zgodność treści z formularzami i ze stanem strony
// (nic nie jest zapisywane w urządzeniu), druk, zero podmiotów trzecich,
// axe. Treść na `chromium-1920`; kotwice, układ i sloty także na
// `chromium-pixel-5` i `webkit-iphone-14`.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  formatPolicyDate,
  POLICY_DESKTOP_MIN_PX,
  POLICY_DRAFT,
  POLICY_EFFECTIVE,
  POLICY_HEADING,
  POLICY_OBJECTION_ID,
  POLICY_SECTIONS,
  POLICY_UPDATED,
  POLICY_VERSION,
  policyHeadingId,
} from "../../src/components/sections/policy/policy-config";
import { ui } from "../../src/i18n/ui";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";
import {
  FUTURE_RECRUITMENT_CONSENT,
  MARKETING_CONSENT,
} from "../../src/lib/contact-form";
import { BUSINESS } from "../../src/lib/jsonld";
import { CONTACT_PATH, POLICY_PATH } from "../../src/lib/routes";
import { SHOW_PRACA } from "../../src/lib/site-config";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import { usePreviewGuard } from "../helpers/guards";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";

usePreviewGuard();

const DESKTOP = "chromium-1920";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const LAYOUT_PROJECTS = [DESKTOP, ...MOBILE_PROJECTS];
const A11Y_PROJECTS = [DESKTOP, "chromium-pixel-5"];
const SUBPIXEL_TOL_PX = 0.5;
/** Dopuszczalna odległość górnej krawędzi sekcji od celu po skoku. */
const ANCHOR_TOL_PX = 1.5;
/** Odstęp sekcji od paska po skoku (`--pp-gap` w policy.css). */
const ANCHOR_GAP_PX = { mobile: 16, desktop: 24 };
/** Odstęp przyklejonego spisu od paska (`--pp-toc-top` w policy.css). */
const TOC_TOP_PX = 24;

const IDS = POLICY_SECTIONS.map((s) => s.id);
const TOC = "[data-policy-toc]";
const NIP = BUSINESS.vatID.replace(/\D/g, "");

const only = (testInfo: TestInfo, projects: string[], why: string) =>
  test.skip(!projects.includes(testInfo.project.name), why);

const isDesktop = (page: Page) =>
  (page.viewportSize()?.width ?? 0) >= POLICY_DESKTOP_MIN_PX;

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

/** Kontrakt kotwicy: górna krawędź sekcji `id` stoi pod stałym paskiem
 *  w odstępie z `scroll-margin-top`, a jej nagłówek jest w oknie.
 *  `expect.poll`: skok i korekta po wczytaniu są asynchroniczne. */
async function expectAtAnchor(page: Page, id: string): Promise<void> {
  const gap = isDesktop(page) ? ANCHOR_GAP_PX.desktop : ANCHOR_GAP_PX.mobile;
  const place = () =>
    page.evaluate((sel) => {
      const bar = document
        .querySelector("[data-nav]")!
        .getBoundingClientRect().bottom;
      const sec = document.querySelector(sel)!.getBoundingClientRect();
      const h2 = document.querySelector(`${sel} h2`)!.getBoundingClientRect();
      return {
        clear: sec.top - bar,
        h2Clear: h2.top - bar,
        h2InView: h2.bottom <= window.innerHeight,
      };
    }, `#${id}`);
  await expect
    .poll(async () => Math.abs((await place()).clear - gap), {
      message: `sekcja #${id} pod paskiem w odstępie ${gap} px`,
      timeout: 10_000,
    })
    .toBeLessThanOrEqual(ANCHOR_TOL_PX);
  const at = await place();
  expect(at.h2Clear).toBeGreaterThan(0);
  expect(at.h2InView).toBe(true);
  await expect(page.locator(`#${id} h2`)).toBeVisible();
}

test.describe("polityka: treść", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
  });

  test("nagłówek, pasmo dokumentu i oznaczenie projektu", async ({ page }) => {
    await gotoReady(page, POLICY_PATH);
    await expect(page).toHaveTitle(ui.pl["policyPage.title"]);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText(POLICY_HEADING);

    const meta = page.locator("[data-policy-meta]");
    await expect(meta.locator("dt")).toHaveText([
      "Obowiązuje od",
      "Ostatnia aktualizacja",
      "Wersja",
    ]);
    await expect(meta.locator("[data-policy-updated] time")).toHaveText(
      formatPolicyDate(POLICY_UPDATED),
    );
    await expect(meta.locator("[data-policy-updated] time")).toHaveAttribute(
      "datetime",
      POLICY_UPDATED,
    );
    await expect(meta.locator("[data-policy-version]")).toHaveText(
      POLICY_VERSION,
    );
    const effective = meta.locator("[data-policy-effective]");
    if (POLICY_EFFECTIVE) {
      await expect(effective.locator("time")).toHaveText(
        formatPolicyDate(POLICY_EFFECTIVE),
      );
    } else {
      await expect(effective.locator("[data-policy-todo]")).toHaveCount(1);
    }
    // sekcja „Zmiany" powtarza wersję i datę z tych samych stałych
    await expect(page.locator("#zmiany")).toContainText(
      `Wersja ${POLICY_VERSION} z ${formatPolicyDate(POLICY_UPDATED)}`,
    );

    // projekt: informacja + znaczniki; wersja ostateczna: ani jednego
    const todos = page.locator("[data-policy-todo]");
    if (POLICY_DRAFT) {
      await expect(page.locator("[data-policy-draft]")).toBeVisible();
      expect(await todos.count()).toBeGreaterThan(0);
      for (const text of await todos.allTextContents()) {
        expect(text).toMatch(/^\[do (uzupełnienia|potwierdzenia)(: .+)?\]$/s);
      }
    } else {
      await expect(page.locator("[data-policy-draft]")).toHaveCount(0);
      await expect(todos).toHaveCount(0);
    }
  });

  test("spis treści = nagłówki sekcji, w tej samej kolejności", async ({
    page,
  }) => {
    await gotoReady(page, POLICY_PATH);
    const toc = page.locator(TOC);
    await expect(toc).toHaveAttribute("aria-labelledby", "pp-toc-h");
    expect(await toc.locator("ol").count()).toBe(1);
    const links = toc.locator("ol > li > a");
    await expect(links).toHaveCount(POLICY_SECTIONS.length);
    await expect(links).toHaveText(POLICY_SECTIONS.map((s) => s.title));
    expect(
      await links.evaluateAll((els) => els.map((a) => a.getAttribute("href"))),
    ).toEqual(IDS.map((id) => `#${id}`));

    const sections = page.locator("[data-policy-body] > [data-policy-section]");
    await expect(sections).toHaveCount(POLICY_SECTIONS.length);
    expect(await sections.evaluateAll((els) => els.map((el) => el.id))).toEqual(
      IDS,
    );
    for (const s of POLICY_SECTIONS) {
      const sec = page.locator(`section#${s.id}`);
      await expect(sec).toHaveAttribute(
        "aria-labelledby",
        policyHeadingId(s.id),
      );
      await expect(sec.locator("h2")).toHaveCount(1);
      await expect(sec.locator(`h2#${policyHeadingId(s.id)}`)).toHaveText(
        s.title,
      );
    }
    // hierarchia: h3 tylko wewnątrz sekcji z h2
    expect(
      await page
        .locator("main h3")
        .evaluateAll((els) =>
          els.every((el) => !!el.closest("[data-policy-section]")),
        ),
    ).toBe(true);
    // odnośniki w treści do sekcji trafiają w istniejące kotwice
    const inner = await page
      .locator('[data-policy-body] a[href^="#"]')
      .evaluateAll((els) => els.map((a) => a.getAttribute("href")!.slice(1)));
    expect(inner.length).toBeGreaterThan(0);
    for (const id of inner) expect(IDS as readonly string[]).toContain(id);
  });

  test("administrator i dane firmy z BUSINESS, organ nadzorczy", async ({
    page,
  }) => {
    await gotoReady(page, POLICY_PATH);
    const admin = page.locator("#administrator");
    await expect(admin.locator("strong").first()).toHaveText(
      BUSINESS.legalName,
    );
    await expect(admin.locator("[data-policy-seat]")).toHaveText(
      `${BUSINESS.seatStreet}, ${BUSINESS.seatPostalCode} ${BUSINESS.seatLocality}`,
    );
    await expect(admin).toContainText(`NIP ${NIP}`);
    await expect(admin).toContainText(`REGON ${BUSINESS.regon}`);
    await expect(admin.locator("[data-policy-office]")).toHaveText(
      `${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.locality}`,
    );
    await expect(page.locator("[data-policy-contact]")).toContainText(
      BUSINESS.legalName,
    );
    const authority = page.locator("#skarga");
    await expect(authority.locator("[data-policy-authority]")).not.toBeEmpty();
    const uodo = authority.locator('a[href^="https://uodo.gov.pl"]');
    await expect(uodo).toHaveAttribute("rel", /noopener/);
  });

  test("treść zgadza się z formularzami: grupy, zgody, okresy", async ({
    page,
  }) => {
    await gotoReady(page, POLICY_PATH);
    const groups = page.locator("#cele [data-policy-group]");
    expect(
      await groups.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-policy-group")),
      ),
    ).toEqual([
      "odwiedziny",
      "zapytanie",
      "zgloszenie",
      "umowa",
      "aml",
      "marketing",
      "rekrutacja",
    ]);
    for (const group of await groups.all()) {
      await expect(group.locator("h3")).toHaveCount(1);
      await expect(group.locator("dl > dt")).toHaveText([
        "Jakie dane",
        "Po co",
        "Podstawa prawna",
      ]);
    }
    // brzmienia zgód ze STAŁYCH formularzy — zmiana zgody zmienia dokument
    await expect(page.locator('[data-policy-consent="marketing"]')).toHaveText(
      MARKETING_CONSENT,
    );
    const future = page.locator('[data-policy-consent="rekrutacja"]');
    if (SHOW_PRACA) {
      await expect(future).toHaveText(FUTURE_RECRUITMENT_CONSENT);
    } else {
      await expect(future).toHaveCount(0);
    }
    await expect(page.locator("[data-policy-voluntary]")).toBeVisible();

    const table = page.locator("table[data-policy-retention]");
    await expect(table.locator("caption")).not.toBeEmpty();
    await expect(table.locator('thead th[scope="col"]')).toHaveCount(2);
    const rows = table.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThanOrEqual(6);
    for (const row of await rows.all()) {
      await expect(row.locator('th[scope="row"]')).toHaveCount(1);
      await expect(row.locator("td")).toHaveCount(1);
      await expect(row.locator("td")).not.toBeEmpty();
    }
    await expect(page.locator("#prawa [data-policy-rights] > li")).toHaveCount(
      8,
    );
  });

  test("prawo sprzeciwu: osobna, wyróżniona sekcja", async ({ page }) => {
    await gotoReady(page, POLICY_PATH);
    const sec = page.locator(`section#${POLICY_OBJECTION_ID}`);
    await expect(sec).toHaveAttribute("data-policy-objection", "");
    await expect(page.locator("[data-policy-objection]")).toHaveCount(1);
    await expect(sec.locator("h2")).toHaveCount(1);
    await expect(
      page.locator(`${TOC} a[href="#${POLICY_OBJECTION_ID}"]`),
    ).toHaveCount(1);
    // nie punkt listy praw: żaden przodek nie jest listą
    expect(await sec.evaluate((el) => !!el.closest("li, ol, ul"))).toBe(false);
    const bg = (sel: string) =>
      page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await bg(`section#${POLICY_OBJECTION_ID}`)).toBe("rgb(24, 58, 107)");
    expect(await bg("section#prawa")).not.toBe(
      await bg(`section#${POLICY_OBJECTION_ID}`),
    );
  });

  test("widok bez ruchu, pasek stały, scroll natywny", async ({ page }) => {
    await gotoReady(page, POLICY_PATH);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("[data-rv], [data-px]")).toHaveCount(0);
    await expect(page.locator("[data-nav]")).not.toHaveAttribute(
      "data-scroll-nav",
      "",
    );
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    await page.evaluate(() => window.scrollTo(0, 900));
    expect(await page.evaluate(() => window.scrollY)).toBe(900);
  });

  test("surowy HTML: indeksowana, bez hostów trzecich, kotwice bez JS", async ({
    request,
  }) => {
    const html = await (await request.get(POLICY_PATH)).text();
    expect(html).not.toMatch(/<meta name="robots" content="noindex"/);
    expect(html).toMatch(/<link rel="canonical"/);
    for (const id of IDS) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toMatch(new RegExp(`<section[^>]*\\sid="${id}"`));
    }
    // jedyne adresy zewnętrzne to zwykłe odnośniki (organ nadzorczy,
    // mapy i wykonawca w stopce) — żadnych skryptów, ramek ani obrazów
    expect(html).not.toMatch(/<(script|iframe|img)[^>]*\ssrc="https?:/);
    expect(html).not.toMatch(/<link[^>]*rel="stylesheet"[^>]*href="https?:/);
  });

  test("druk: dokument bez paska, stopki i spisu", async ({ page }) => {
    await gotoReady(page, POLICY_PATH);
    await page.emulateMedia({ media: "print" });
    for (const sel of ["header.hdr", "footer.ft", TOC]) {
      await expect(page.locator(sel)).toBeHidden();
    }
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("#administrator")).toBeVisible();
    const objection = page.locator(`section#${POLICY_OBJECTION_ID}`);
    await expect(objection).toBeVisible();
    // tła nie są drukowane — ramka ma obrys i ciemny tekst
    expect(
      await objection.evaluate((el) => {
        const cs = getComputedStyle(el);
        return [cs.backgroundColor, cs.color, cs.borderTopStyle];
      }),
    ).toEqual(["rgba(0, 0, 0, 0)", "rgb(0, 0, 0)", "solid"]);
  });
});

test.describe("polityka: kotwice", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "kotwice: desktop i dwa profile mobilne");
  });

  test("klik w spis stawia sekcję pod paskiem", async ({ page }) => {
    await gotoReady(page, POLICY_PATH);
    // desktop: wszystkie pozycje; telefon: pierwsza, sprzeciw, ostatnia
    const ids = isDesktop(page)
      ? IDS
      : [IDS[0]!, POLICY_OBJECTION_ID, IDS[IDS.length - 1]!];
    for (const id of ids) {
      await page.locator(`${TOC} a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expectAtAnchor(page, id);
    }
  });

  for (const id of ["okresy", POLICY_OBJECTION_ID, "zmiany"]) {
    test(`wejście z adresu ${POLICY_PATH}#${id}`, async ({ page }) => {
      await gotoReady(page, `${POLICY_PATH}#${id}`);
      await expectAtAnchor(page, id);
    });
  }

  test("„wstecz” po skoku wraca do spisu, nie opuszcza strony", async ({
    page,
  }) => {
    await gotoReady(page, POLICY_PATH);
    await page.locator(`${TOC} a[href="#prawa"]`).click();
    await expectAtAnchor(page, "prawa");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${POLICY_PATH}$`));
    await expect(page.locator("main h1")).toHaveText(POLICY_HEADING);
  });

  test("odnośnik w treści prowadzi do sekcji", async ({ page }) => {
    await gotoReady(page, POLICY_PATH);
    await page.locator('#cele a[href="#okresy"]').first().click();
    await expect(page).toHaveURL(/#okresy$/);
    await expectAtAnchor(page, "okresy");
  });
});

test.describe("polityka: układ", () => {
  test("próg 1025: spis nad treścią ↔ przyklejona lewa kolumna", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "kontrakt progu na profilu desktop");
    await gotoReady(page, POLICY_PATH);
    await expectBreakpointFlip(
      page,
      POLICY_DESKTOP_MIN_PX,
      { grid: "[data-policy-grid]", toc: TOC },
      { grid: "block", toc: "block" },
      { grid: "grid", toc: "block" },
    );
    const probe = () =>
      page.evaluate((tocSel) => {
        const toc = document.querySelector(tocSel)!;
        const body = document.querySelector("[data-policy-body]")!;
        const t = toc.getBoundingClientRect();
        const b = body.getBoundingClientRect();
        return {
          position: getComputedStyle(toc).position,
          sideBySide: t.right <= b.left,
          stacked: t.bottom <= b.top,
        };
      }, TOC);
    const height = page.viewportSize()!.height;
    await page.setViewportSize({ width: POLICY_DESKTOP_MIN_PX - 1, height });
    await settle(page, 150);
    expect(await probe()).toEqual({
      position: "static",
      sideBySide: false,
      stacked: true,
    });
    await page.setViewportSize({ width: POLICY_DESKTOP_MIN_PX, height });
    await settle(page, 150);
    expect(await probe()).toEqual({
      position: "sticky",
      sideBySide: true,
      stacked: false,
    });
  });

  test("desktop: spis przyklejony pod paskiem przez całą treść", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "sticky tylko od progu");
    await gotoReady(page, POLICY_PATH);
    // żaden przodek spisu nie przycina — inaczej sticky nie ma po czym jechać
    expect(
      await page.evaluate((tocSel) => {
        const bad: string[] = [];
        let el = document.querySelector(tocSel)!.parentElement;
        while (el) {
          const cs = getComputedStyle(el);
          if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
            bad.push(`${el.tagName}.${el.className}`);
          }
          el = el.parentElement;
        }
        return bad;
      }, TOC),
    ).toEqual([]);

    const probe = () =>
      page.evaluate((tocSel) => {
        const bar = document
          .querySelector("[data-nav]")!
          .getBoundingClientRect().bottom;
        const toc = document.querySelector(tocSel)!.getBoundingClientRect();
        const grid = document
          .querySelector("[data-policy-grid]")!
          .getBoundingClientRect();
        const body = document
          .querySelector("[data-policy-body]")!
          .getBoundingClientRect();
        return {
          clear: toc.top - bar,
          bottom: toc.bottom,
          vh: window.innerHeight,
          // szerokości porównywane z KONTENEREM, nie z oknem (rynna paska
          // przewijania na Linuksie)
          left: toc.left - grid.left,
          right: grid.right - body.right,
        };
      }, TOC);

    const start = await probe();
    expect(Math.abs(start.left)).toBeLessThanOrEqual(SUBPIXEL_TOL_PX);
    expect(Math.abs(start.right)).toBeLessThanOrEqual(SUBPIXEL_TOL_PX);

    const sectionTop = (id: string) =>
      page.evaluate(
        (sel) =>
          document.querySelector(sel)!.getBoundingClientRect().top +
          window.scrollY,
        `#${id}`,
      );
    for (const id of ["cele", "okresy", "skarga"]) {
      await scrollPageTo(page, await sectionTop(id));
      const at = await probe();
      expect(Math.abs(at.clear - TOC_TOP_PX), `spis przy #${id}`).toBeLessThan(
        SUBPIXEL_TOL_PX,
      );
      expect(at.bottom).toBeLessThanOrEqual(at.vh);
    }
    // koniec dokumentu: spis nie nachodzi na stopkę
    await scrollPageTo(
      page,
      await page.evaluate(() => document.documentElement.scrollHeight),
    );
    expect(
      await page.evaluate((tocSel) => {
        const toc = document.querySelector(tocSel)!.getBoundingClientRect();
        const footer = document
          .querySelector("footer.ft")!
          .getBoundingClientRect();
        return toc.bottom <= footer.top + 0.5;
      }, TOC),
    ).toBe(true);
  });

  test("desktop, niskie okno: spis przewija się sam i jest osiągalny z klawiatury", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "sticky tylko od progu");
    await page.setViewportSize({ width: 1366, height: 480 });
    await gotoReady(page, POLICY_PATH);
    // spis przyklejony (przy niskim oknie nagłówek dokumentu zajmuje cały
    // pierwszy ekran)
    await scrollPageTo(
      page,
      await page.evaluate(
        () =>
          document.querySelector("#cele")!.getBoundingClientRect().top +
          window.scrollY,
      ),
    );
    const toc = page.locator(TOC);
    const box = await toc.evaluate((el) => ({
      scrollable: el.scrollHeight > el.clientHeight + 1,
      overflowY: getComputedStyle(el).overflowY,
      bottom: el.getBoundingClientRect().bottom,
      vh: window.innerHeight,
    }));
    expect(box.scrollable).toBe(true);
    expect(box.overflowY).toBe("auto");
    expect(box.bottom).toBeLessThanOrEqual(box.vh);
    // ostatnia pozycja po fokusie wjeżdża w widoczną część spisu
    const last = toc.locator("a").last();
    await last.focus();
    await expect(last).toBeFocused();
    expect(
      await last.evaluate((a) => {
        const r = a.getBoundingClientRect();
        const t = a.closest("nav")!.getBoundingClientRect();
        return r.top >= t.top - 1 && r.bottom <= t.bottom + 1;
      }),
    ).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
  });

  test("telefon: spis nad treścią, cele dotyku, brak przewijania w bok", async ({
    page,
  }, testInfo) => {
    only(testInfo, MOBILE_PROJECTS, "układ mobilny");
    await gotoReady(page, POLICY_PATH);
    const toc = page.locator(TOC);
    expect(await toc.evaluate((el) => getComputedStyle(el).position)).toBe(
      "static",
    );
    for (const link of await toc.locator("a").all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 700 });
      await settle(page, 150);
      // ta sama miara po obu stronach — bez udziału rynny paska przewijania
      const fit = await page.evaluate(() => {
        const root = document.documentElement;
        const main = document.querySelector("main")!;
        const table = document.querySelector("[data-policy-retention]")!;
        return {
          page: root.scrollWidth - root.clientWidth,
          table: table.scrollWidth - table.clientWidth,
          tableInMain:
            table.getBoundingClientRect().right <=
            main.getBoundingClientRect().right + 0.5,
        };
      });
      expect(fit, `szerokość ${width}`).toEqual({
        page: 0,
        table: 0,
        tableInMain: true,
      });
    }
  });
});

test.describe("polityka: dane kontaktowe (sloty)", () => {
  test("surowy HTML bez telefonu i e-maili; dane rejestrowe w HTML", async ({
    request,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "surowy HTML niezależny od profilu");
    const html = await (await request.get(POLICY_PATH)).text();
    const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? "";
    expect(main.length).toBeGreaterThan(1000);
    expect(main).not.toContain(buildPhoneHref().replace("tel:+48", ""));
    expect(main).not.toContain(buildPhoneDisplay().replace("+48 ", ""));
    expect(main).not.toContain(buildEmail("biuro"));
    expect(main).not.toContain(buildEmail("joanna"));
    expect(main).not.toContain("tel:");
    expect(main).not.toContain("mailto:");
    // sloty: puste, ukryte, z dzieckiem [data-slot], cel bez JS = kontakt
    const slots = main.match(/<a[^>]*data-(?:tel|mail)[^>]*>[\s\S]*?<\/a>/g);
    expect(slots?.length).toBe(4);
    for (const slot of slots ?? []) {
      expect(slot).toMatch(/\shidden/);
      expect(slot).toContain(`href="${CONTACT_PATH}"`);
      expect(slot).toMatch(/><span data-slot><\/span><\/a>$/);
    }
    // dokument identyfikuje administratora bez JS
    for (const value of [
      BUSINESS.legalName,
      BUSINESS.seatStreet,
      `${BUSINESS.seatPostalCode} ${BUSINESS.seatLocality}`,
      `NIP ${NIP}`,
      `REGON ${BUSINESS.regon}`,
      BUSINESS.street,
    ]) {
      expect(main, value).toContain(value);
    }
    expect((main.match(/<noscript>/g) ?? []).length).toBe(2);
  });

  test("po JS sloty niosą adres biura i numer telefonu", async ({
    page,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "sloty: desktop i dwa profile mobilne");
    await gotoReady(page, POLICY_PATH);
    for (const scope of ["#administrator", "[data-policy-contact]"]) {
      const mail = page.locator(`${scope} a[data-mail="biuro"]`);
      await expect(mail).toHaveCount(1);
      await expect(mail).toBeVisible();
      await expect(mail).toHaveAttribute(
        "href",
        `mailto:${buildEmail("biuro")}`,
      );
      await expect(mail).toHaveText(buildEmail("biuro"));
      const tel = page.locator(`${scope} a[data-tel]`);
      await expect(tel).toHaveCount(1);
      await expect(tel).toHaveAttribute("href", buildPhoneHref());
      await expect(tel).toHaveText(buildPhoneDisplay());
    }
    await expect(
      page.locator("main a[data-mail], main a[data-tel]"),
    ).toHaveCount(4);
  });
});

test.describe("polityka: bez JS", () => {
  test.use({ javaScriptEnabled: false });

  test("administrator w całości, adres listowny, informacja o slotach", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "wersja bez JS niezależna od profilu");
    await page.goto(POLICY_PATH);
    await expect(page.locator("main h1")).toHaveText(POLICY_HEADING);
    const admin = page.locator("#administrator");
    await expect(admin).toContainText(BUSINESS.legalName);
    await expect(admin.locator("[data-policy-seat]")).toBeVisible();
    await expect(admin).toContainText(`NIP ${NIP}`);
    await expect(admin).toContainText(`REGON ${BUSINESS.regon}`);
    await expect(admin.locator("[data-policy-office]")).toBeVisible();
    // wiersze slotów znikają, zostaje droga listowna i wyjaśnienie
    await expect(admin.locator("li.pp-row")).toHaveCount(2);
    for (const row of await admin.locator("li.pp-row").all()) {
      await expect(row).toBeHidden();
    }
    await expect(admin.locator("ul.pp-list > li:not(.pp-row)")).toBeVisible();
    // locator po klasie: silnik tekstowy Playwrighta pomija <noscript>
    await expect(admin.locator(".pp-nojs")).toBeVisible();
    const contact = page.locator("[data-policy-contact]");
    await expect(contact.locator(".pp-row")).toHaveCount(2);
    for (const row of await contact.locator(".pp-row").all()) {
      await expect(row).toBeHidden();
    }
    await expect(contact.locator(".pp-nojs")).toBeVisible();
    await expect(contact).toContainText(BUSINESS.seatStreet);
    // spis działa bez skryptu
    await page.locator(`${TOC} a[href="#okresy"]`).click();
    await expect(page).toHaveURL(/#okresy$/);
    await expect(page.locator("#okresy h2")).toBeInViewport();
  });
});

test.describe("polityka: zgodność ze stanem strony", () => {
  test("strona niczego nie zapisuje w urządzeniu (także po przejściu wewnętrznym)", async ({
    page,
    context,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "zachowanie niezależne od profilu");
    const stored = () =>
      page.evaluate(() => ({
        cookie: document.cookie,
        local: localStorage.length,
        session: sessionStorage.length,
      }));
    const empty = { cookie: "", local: 0, session: 0 };

    // wejście z zewnątrz: bez bramki przejścia
    await gotoReady(page, CONTACT_PATH);
    await expect(page.locator("html")).not.toHaveClass(/nav-fade/);
    expect(await stored()).toEqual(empty);

    // przejście wewnętrzne (stopka → polityka): krótkie przejście jest
    // rozpoznawane po adresie odsyłającym, bez zapisu w przeglądarce
    await page.locator("footer .ft-policy").click();
    await expect(page).toHaveURL(new RegExp(`${POLICY_PATH}$`));
    await expect(page.locator("html")).toHaveClass(/nav-fade/);
    await expect(page.locator("html")).toHaveClass(/fonts-in/);
    await expect(page.locator("body")).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-policy-nostorage]")).toBeVisible();
    expect(await stored()).toEqual(empty);
    expect(await context.cookies()).toEqual([]);
  });

  test("zero podmiotów trzecich przy wejściu i po przejeździe przez stronę", async ({
    page,
    baseURL,
  }, testInfo) => {
    only(testInfo, LAYOUT_PROJECTS, "desktop i dwa profile mobilne");
    const own = new URL(baseURL ?? "http://localhost:4399").host;
    const foreign: string[] = [];
    page.on("request", (req) => {
      const url = new URL(req.url());
      if (url.protocol.startsWith("http") && url.host !== own) {
        foreign.push(url.host);
      }
    });
    await gotoReady(page, POLICY_PATH);
    await scrollPageTo(
      page,
      await page.evaluate(() => document.documentElement.scrollHeight),
    );
    await page.locator(`${TOC} a[href="#cookies"]`).click();
    await settle(page, 300);
    expect(foreign).toEqual([]);
  });
});

test.describe("polityka: a11y", () => {
  test("axe WCAG 2 A/AA bez naruszeń", async ({ page }, testInfo) => {
    only(testInfo, A11Y_PROJECTS, "a11y: desktop + jeden profil mobilny");
    await gotoReady(page, POLICY_PATH);
    await expect(
      page.locator('#administrator a[data-mail="biuro"]'),
    ).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});
