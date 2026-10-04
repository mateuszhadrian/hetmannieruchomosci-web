// /sprzedaj-z-nami/ (Etap 5A / PR 2, docs/analiza-formularze-a.md §5):
// hero ze zdjęciem pod przezroczystym paskiem (zdjęcie i h1 poza
// revealami), trzy kroki, formularz „Zgłoś nieruchomość" — kafle radio
// z wartościami słownika CRM, para e-mail / telefon, pola opcjonalne
// w rozwijanym bloku (błąd w zwiniętym bloku go otwiera), brak
// wymuszonego checkboxa, antyspam, stany wysyłki, wersja bez JS, ruch
// (reveale od kroków w dół, parallax hero z zapasem ≥ ruch), zero
// podmiotów trzecich, axe. Treść na `chromium-1920`; układ, formularz
// i ruch także na `chromium-pixel-5` i `webkit-iphone-14`. Endpoint
// i Turnstile ZAWSZE zaślepione (tests/helpers/forms.ts) — żaden test
// niczego nie wysyła. Wariant paska nad hero: navigation.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  FORM_ENDPOINT,
  FORM_SCROLL_GAP_PX,
  TURNSTILE_SRC,
} from "../../src/components/forms/form-config";
import {
  FORM_COPY,
  RESPONSE_TIME,
  SPRZEDAJ_FORM_COPY,
} from "../../src/components/forms/forms-copy";
import {
  PX_AMT_DESKTOP,
  PX_AMT_MOBILE,
} from "../../src/components/sections/content-config";
import {
  SELL_DESKTOP_MIN_PX,
  SELL_FORM_ID,
  SELL_HERO_DESKTOP_RATIO,
  SELL_HERO_TALL_BELOW_PX,
} from "../../src/components/sections/sell/sell-config";
import { SELL_COPY } from "../../src/components/sections/sell/sell-copy";
import {
  ESTATE_TYPES,
  MARKETING_CONSENT,
  MIN_FILL_MS,
  TRANSACTIONS,
} from "../../src/lib/contact-form";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";
import { ui } from "../../src/i18n/ui";
import { POLICY_PATH, SELL_PATH } from "../../src/lib/routes";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import {
  installClock,
  passFillTime,
  readPosts,
  recordPosts,
  STUB_TOKEN,
  stubEndpoint,
  stubTurnstile,
  TURNSTILE_HOST,
} from "../helpers/forms";
import { collectPageIssues, usePreviewGuard } from "../helpers/guards";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";
import { revealSweep } from "../helpers/visual";

usePreviewGuard();

const DESKTOP = "chromium-1920";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const FORM_PROJECTS = [DESKTOP, ...MOBILE_PROJECTS];
const A11Y_PROJECTS = [DESKTOP, "chromium-pixel-5"];
const SUBPIXEL_TOL_PX = 0.5;

const only = (testInfo: TestInfo, projects: string[], why: string) =>
  test.skip(!projects.includes(testInfo.project.name), why);

const HERO = "[data-sell-hero]";
const PHOTO = "[data-sell-photo]";
const SECTION = `section#${SELL_FORM_ID}`;
const form = (page: Page) => page.locator('form[data-form="sprzedaj"]');
const wrap = (page: Page, f: string) => form(page).locator(`[data-f="${f}"]`);
const submit = (page: Page) => page.locator("[data-form-submit]");
const details = (page: Page) => page.locator("[data-sell-details]");
const radio = (page: Page, group: "type" | "transaction", value: string) =>
  page.locator(`#sf-${group}-${value}`);

/** Kontrolki tekstowe formularza (bez kafli radio). */
const TEXT_CONTROLS = '[data-f] input:not([type="radio"]), [data-f] textarea';

/** Rozwija blok pól opcjonalnych (natywne <details>). */
async function openDetails(page: Page): Promise<void> {
  if (!(await details(page).evaluate((d: HTMLDetailsElement) => d.open))) {
    await details(page).locator("summary").click();
  }
  await expect(details(page)).toHaveAttribute("open", "");
}

/** Minimalne poprawne zgłoszenie: typ, transakcja, imię, sam telefon. */
async function fillRequired(page: Page): Promise<void> {
  await radio(page, "type", "2").check();
  await radio(page, "transaction", "131").check();
  await page.locator("#sf-name").fill("Anna Nowak");
  await page.locator("#sf-phone").fill("600 100 200");
}

/** Położenie elementu względem stałego paska i dolnej krawędzi okna. */
const placeUnderBar = (el: Element) => {
  const hdr = document.querySelector("[data-nav]")!;
  const r = el.getBoundingClientRect();
  return {
    clear: r.top - hdr.getBoundingClientRect().bottom,
    inView: r.bottom <= window.innerHeight,
  };
};

async function axeViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.describe("sprzedaj: hero", () => {
  test("h1, teksty z sell-copy, przycisk do formularza, zdjęcie priorytetowe", async ({
    page,
  }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "układ: desktop + dwa profile mobilne");
    const issues = collectPageIssues(page);
    await gotoReady(page, SELL_PATH);
    await expect(page).toHaveTitle(ui.pl["sellPage.title"]);
    const h1 = page.locator("main h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(`${SELL_COPY.title} ${SELL_COPY.accent}`);
    const hero = page.locator(HERO);
    await expect(hero.locator(".sx-eyebrow")).toHaveText(SELL_COPY.eyebrow);
    await expect(hero.getByText(SELL_COPY.lead)).toBeVisible();
    // jedna deklaracja czasu odpowiedzi w serwisie — pada na ekranie
    // potwierdzenia, nie w hero
    await expect(hero).not.toContainText(RESPONSE_TIME);
    await expect(hero).not.toContainText("tego samego dnia");
    const cta = hero.locator("a.sx-btn");
    await expect(cta).toHaveText(SELL_COPY.cta);
    await expect(cta).toHaveAttribute("href", `#${SELL_FORM_ID}`);

    // hero stoi POD paskiem: od góry okna; telefon — całe okno, desktop —
    // SELL_HERO_DESKTOP_RATIO okna. Pomiar sub-pikselowy.
    const m = await page.evaluate((sel) => {
      const r = document.querySelector(sel)!.getBoundingClientRect();
      const h = document.querySelector("main h1")!.getBoundingClientRect();
      return {
        top: r.top,
        height: r.height,
        vh: window.innerHeight,
        h1Bottom: h.bottom,
      };
    }, HERO);
    const desktop = (page.viewportSize()?.width ?? 0) >= SELL_DESKTOP_MIN_PX;
    expect(m.top).toBe(0);
    expect(
      Math.abs(m.height - m.vh * (desktop ? SELL_HERO_DESKTOP_RATIO : 1)),
    ).toBeLessThanOrEqual(SUBPIXEL_TOL_PX);
    expect(m.h1Bottom).toBeLessThanOrEqual(m.height);
    // element, z którego pasek liczy próg przemalowania
    await expect(hero).toHaveAttribute("data-nav-hero", "");

    const photo = page.locator(PHOTO);
    await expect(photo).toHaveAttribute("loading", "eager");
    await expect(photo).toHaveAttribute("fetchpriority", "high");
    await expect(photo).toHaveAttribute("width", /^\d+$/);
    await expect(photo).toHaveAttribute("height", /^\d+$/);
    await expect(photo).toHaveAttribute("alt", SELL_COPY.imageAlt);
    // kandydaci LCP poza revealami: zdjęcia i h1 nie chowa bramka ruchu
    await expect(photo).toHaveCSS("opacity", "1");
    await expect(h1).toHaveCSS("opacity", "1");
    await expect(page.locator(`${HERO} [data-rv]`)).toHaveCount(0);
    expect(await hero.evaluate((el) => el.closest("[data-rv]"))).toBeNull();
    expect(
      await photo.evaluate((el: HTMLImageElement) => el.naturalWidth),
    ).toBeGreaterThan(0);
    expect(issues()).toEqual([]);
  });

  test("surowy HTML: preload zdjęcia per kadr, bramka ruchu w <head>; kadr pionowy poniżej 768", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
    const raw = await (await page.request.get(SELL_PATH)).text();
    const head = raw.slice(0, raw.indexOf("</head>"));
    const preloads = head.match(
      /<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g,
    );
    expect(preloads?.length).toBe(2);
    expect(preloads?.[0]).toContain("sprzedaj-doradca-tall");
    expect(preloads?.[0]).toContain(
      `media="(max-width: ${SELL_HERO_TALL_BELOW_PX - 1}px)"`,
    );
    expect(preloads?.[1]).toContain(
      `media="(min-width: ${SELL_HERO_TALL_BELOW_PX}px)"`,
    );
    expect(preloads?.[1]).not.toContain("sprzedaj-doradca-tall");
    expect(head).toContain('classList.add("js-motion")');

    await gotoReady(page, SELL_PATH);
    const source = page.locator(`${HERO} picture source`);
    await expect(source).toHaveAttribute(
      "media",
      `(max-width: ${SELL_HERO_TALL_BELOW_PX - 1}px)`,
    );
    await expect(source).toHaveAttribute("width", "720");
    await expect(source).toHaveAttribute("height", "816");
    const src = () =>
      page.locator(PHOTO).evaluate((el: HTMLImageElement) => el.currentSrc);
    await page.setViewportSize({
      width: SELL_HERO_TALL_BELOW_PX - 1,
      height: 900,
    });
    await expect.poll(src).toContain("sprzedaj-doradca-tall");
    await page.setViewportSize({ width: SELL_HERO_TALL_BELOW_PX, height: 900 });
    await expect.poll(src).not.toContain("sprzedaj-doradca-tall");
  });

  test("przycisk hero przewija do formularza: sekcja staje pod stałym paskiem", async ({
    page,
  }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "kotwica: desktop + dwa profile mobilne");
    await gotoReady(page, SELL_PATH);
    await page.locator(`${HERO} a.sx-btn`).click();
    await expect(page).toHaveURL(new RegExp(`#${SELL_FORM_ID}$`));
    // górna krawędź białej sekcji = dolna krawędź paska (scroll-margin-top
    // z wysokości paska), nagłówek formularza w oknie
    await expect
      .poll(
        async () =>
          Math.abs((await page.locator(SECTION).evaluate(placeUnderBar)).clear),
        { message: "sekcja formularza pod paskiem" },
      )
      .toBeLessThanOrEqual(1.5);
    const heading = page.locator(`${SECTION} h2`);
    await expect(heading).toBeVisible();
    const place = await heading.evaluate(placeUnderBar);
    expect(place.clear).toBeGreaterThan(0);
    expect(place.inView).toBe(true);
    // blok spod zgięcia odsłania się po skoku (reveal nie zostaje pusty)
    await expect
      .poll(() =>
        page
          .locator(`${SECTION} .sf-head`)
          .evaluate((el) => getComputedStyle(el).opacity),
      )
      .toBe("1");
  });
});

test.describe("sprzedaj: treść i układ", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
  });

  test("trzy kroki i nagłówek formularza z sell-copy / forms-copy", async ({
    page,
  }) => {
    await gotoReady(page, SELL_PATH);
    const steps = page.locator("[data-sell-steps] ol > li");
    await expect(steps).toHaveCount(SELL_COPY.steps.length);
    for (const [i, step] of SELL_COPY.steps.entries()) {
      await expect(steps.nth(i).locator("h2")).toHaveText(step.title);
      await expect(steps.nth(i).locator("p")).toHaveText(step.text);
    }
    const section = page.locator(SECTION);
    await expect(section.locator("h2")).toHaveText(SPRZEDAJ_FORM_COPY.heading);
    await expect(section).toHaveAttribute(
      "aria-labelledby",
      (await section.locator("h2").getAttribute("id")) ?? "",
    );
    await expect(section.locator(".sf-lead")).toHaveText(
      SPRZEDAJ_FORM_COPY.lead,
    );
  });

  test("pola: kafle ze słownikiem CRM, para kontaktowa, blok opcjonalny, zgoda", async ({
    page,
  }) => {
    await gotoReady(page, SELL_PATH);
    // kafle: wartości = identyfikatory słownika, etykiety i kolejność
    // z interfejsu (Mieszkanie → Dom → Działka → Lokal komercyjny)
    const tiles = (f: string) =>
      wrap(page, f)
        .locator("label.fm-tile")
        .evaluateAll((labels) =>
          labels.map((label) => {
            const input = label.querySelector("input")!;
            return {
              value: input.value,
              label: label.textContent?.trim() ?? "",
              type: input.type,
              name: input.name,
              checked: input.checked,
              required: input.required,
            };
          }),
        );
    expect(await tiles("type")).toEqual(
      ESTATE_TYPES.map((o) => ({
        value: o.value,
        label: o.label,
        type: "radio",
        name: "type",
        checked: false,
        required: true,
      })),
    );
    expect(ESTATE_TYPES.map((o) => o.value)).toEqual(["2", "1", "3", "4"]);
    expect(ESTATE_TYPES.map((o) => o.label)).toEqual([
      "Mieszkanie",
      "Dom",
      "Działka",
      "Lokal komercyjny",
    ]);
    expect(await tiles("transaction")).toEqual(
      TRANSACTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        type: "radio",
        name: "transaction",
        checked: false,
        required: true,
      })),
    );
    expect(TRANSACTIONS.map((o) => o.value)).toEqual(["131", "132"]);
    // grupy to fieldset + legend
    await expect(page.locator('fieldset[data-f="type"] > legend')).toHaveText(
      SPRZEDAJ_FORM_COPY.type.legend,
    );
    await expect(
      page.locator('fieldset[data-f="transaction"] > legend'),
    ).toHaveText(SPRZEDAJ_FORM_COPY.transaction.legend);

    // komplet i kolejność kontrolek: bez „liczby pokoi"; E-mail przed
    // Telefonem; lokalizacja w bloku opcjonalnym
    expect(
      await form(page)
        .locator("[data-f] input, [data-f] textarea")
        .evaluateAll((els) => els.map((el) => el.id)),
    ).toEqual([
      "sf-type-2",
      "sf-type-1",
      "sf-type-3",
      "sf-type-4",
      "sf-transaction-131",
      "sf-transaction-132",
      "sf-name",
      "sf-email",
      "sf-phone",
      "sf-location",
      "sf-area",
      "sf-price",
      "sf-notes",
    ]);
    await expect(page.locator('label[for="sf-name"]')).toHaveText(
      FORM_COPY.name.label,
    );
    await expect(page.locator("#sf-name")).toHaveAttribute(
      "autocomplete",
      "name",
    );
    await expect(page.locator("#sf-name")).toHaveAttribute("required", "");
    await expect(page.locator("#sf-email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    await expect(page.locator("#sf-phone")).toHaveAttribute(
      "autocomplete",
      "tel",
    );
    await expect(page.locator("#sf-email")).not.toHaveAttribute("required");
    await expect(page.locator("#sf-phone")).not.toHaveAttribute("required");

    // blok opcjonalny: zwinięty, nagłówek z dopiskiem, pola bez dopisku
    // i bez `required`
    await expect(details(page)).not.toHaveAttribute("open");
    await expect(details(page).locator("summary")).toHaveText(
      `${SPRZEDAJ_FORM_COPY.details} ${FORM_COPY.optional}`,
    );
    await expect(page.locator("#sf-location")).toBeHidden();
    await openDetails(page);
    const optional = [
      { id: "sf-location", copy: SPRZEDAJ_FORM_COPY.location },
      { id: "sf-area", copy: SPRZEDAJ_FORM_COPY.area },
      { id: "sf-price", copy: SPRZEDAJ_FORM_COPY.price },
      { id: "sf-notes", copy: SPRZEDAJ_FORM_COPY.notes },
    ];
    for (const { id, copy } of optional) {
      await expect(page.locator(`label[for="${id}"]`)).toHaveText(copy.label);
      const control = page.locator(`#${id}`);
      await expect(control).toBeVisible();
      await expect(control).toHaveAttribute("placeholder", copy.placeholder);
      await expect(control).not.toHaveAttribute("required");
    }
    expect(await details(page).locator("#sf-location").count()).toBe(1);
    await expect(page.locator("#sf-area")).toHaveAttribute(
      "inputmode",
      "decimal",
    );
    await expect(page.locator("#sf-price")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    await expect(page.locator("#sf-price-hint")).toHaveText(
      SPRZEDAJ_FORM_COPY.price.hint,
    );
    await expect(page.locator("#sf-price")).toHaveAttribute(
      "aria-describedby",
      "sf-price-hint",
    );
    await expect(page.locator("textarea#sf-notes")).toBeVisible();

    // zgoda: prawdziwy checkbox, odznaczony, nigdy wymagany
    const consent = form(page).locator(
      'input[type="checkbox"][name="marketing"]',
    );
    await expect(consent).toHaveCount(1);
    await expect(consent).not.toBeChecked();
    await expect(consent).not.toHaveAttribute("required");
    await expect(form(page).locator("label.fm-consent")).toHaveText(
      MARKETING_CONSENT,
    );

    // kolejność bloku końcowego: zgoda → nota → przycisk → telefon
    const order = await form(page).evaluate((el) => {
      const top = (sel: string) =>
        el.querySelector(sel)!.getBoundingClientRect().top;
      return [
        top(".fm-consent"),
        top(".fm-note"),
        top("[data-form-submit]"),
        top(".sf-call"),
      ];
    });
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    await expect(form(page).locator(".fm-note")).toContainText(
      SPRZEDAJ_FORM_COPY.frame.purpose,
    );
    const policy = form(page).locator(".fm-note a");
    await expect(policy).toHaveAttribute("href", POLICY_PATH);
    expect(
      await policy.evaluate((a) => getComputedStyle(a).textDecorationLine),
    ).toContain("underline");
    await expect(submit(page)).toHaveText(SPRZEDAJ_FORM_COPY.frame.submit);

    // pułapka: readonly, poza Tab, ukryta wizualnie — nie display:none
    const hp = form(page).locator('input[name="firma"]');
    await expect(hp).toHaveAttribute("readonly", "");
    await expect(hp).toHaveAttribute("tabindex", "-1");
    expect(
      await hp.evaluate(
        (el) => getComputedStyle(el.closest(".fm-hp")!).display,
      ),
    ).not.toBe("none");
  });

  test("sloty: surowy <main> bez telefonu i e-maila; po JS tel: pod przyciskiem", async ({
    page,
  }) => {
    const raw = await (await page.request.get(SELL_PATH)).text();
    const main = raw.slice(raw.indexOf("<main"), raw.indexOf("</main>"));
    expect(main.length).toBeGreaterThan(1000);
    const digits = buildPhoneHref().replace(/\D/g, "");
    expect(main.replace(/[\s-]/g, "")).not.toContain(digits.slice(2));
    expect(main).not.toContain(buildEmail("biuro"));
    expect(main).not.toContain("tel:");
    expect(main).not.toContain("mailto:");
    // dwie puste kotwice (błąd wysyłki, „Wolisz przez telefon?") niosą
    // <span data-slot>; potwierdzenie tego formularza numeru nie ma
    expect(
      main.match(/<a[^>]*data-tel[^>]*hidden[^>]*>\s*<span data-slot/g)?.length,
    ).toBe(2);

    await gotoReady(page, SELL_PATH);
    const call = form(page).locator(".sf-call");
    await expect(call).toContainText(SPRZEDAJ_FORM_COPY.call);
    const tel = call.locator("a[data-tel]");
    await expect(tel).toBeVisible();
    await expect(tel).toHaveAttribute("href", buildPhoneHref());
    await expect(tel).toHaveText(buildPhoneDisplay());
  });

  test("próg 1025: kroki, kafle i wiersze pól", async ({ page }) => {
    await gotoReady(page, SELL_PATH);
    await openDetails(page);
    await expectBreakpointFlip(
      page,
      SELL_DESKTOP_MIN_PX,
      { steps: ".ss-list", stepBody: ".ss-body" },
      { steps: "flex", stepBody: "flex" },
      { steps: "grid", stepBody: "contents" },
    );
    const layout = () =>
      page.evaluate(() => {
        const rows = (sel: string) =>
          new Set(
            Array.from(document.querySelectorAll(sel)).map((el) =>
              Math.round(el.getBoundingClientRect().top),
            ),
          ).size;
        const cols = (sel: string) =>
          getComputedStyle(document.querySelector(sel)!)
            .gridTemplateColumns.split(" ")
            .filter((track) => parseFloat(track) > 0).length;
        return {
          typeRows: rows('[data-f="type"] .fm-tile'),
          transactionRows: rows('[data-f="transaction"] .fm-tile'),
          pair: cols(".fm-row2"),
          optional: cols(".fm-row3"),
          // ułamek wysokości okna (para: SELL_HERO_DESKTOP_RATIO)
          hero: parseFloat(
            getComputedStyle(
              document.querySelector("[data-sell-hero]")!,
            ).getPropertyValue("--sh-r"),
          ),
        };
      });
    // po `expectBreakpointFlip` okno ma szerokość progu (desktop)
    expect(await layout()).toEqual({
      typeRows: 1,
      transactionRows: 1,
      pair: 2,
      optional: 3,
      hero: SELL_HERO_DESKTOP_RATIO,
    });
    await page.setViewportSize({ width: SELL_DESKTOP_MIN_PX - 1, height: 900 });
    await settle(page, 150);
    expect(await layout()).toEqual({
      typeRows: 2,
      transactionRows: 1,
      pair: 1,
      optional: 1,
      hero: 1,
    });
  });

  test("bez JS (surowy HTML): komplet pól, method/action, <noscript>, komunikaty", async ({
    page,
  }) => {
    const raw = await (await page.request.get(SELL_PATH)).text();
    expect(raw).toMatch(
      new RegExp(
        `<form[^>]*data-form="sprzedaj"[^>]*method="post"[^>]*action="${FORM_ENDPOINT}"`,
      ),
    );
    expect(raw).toContain('<input type="hidden" name="form" value="sprzedaj"');
    for (const name of [
      "type",
      "transaction",
      "name",
      "email",
      "phone",
      "location",
      "area",
      "price",
      "notes",
      "marketing",
    ]) {
      expect(raw, name).toContain(`name="${name}"`);
    }
    // semantyka pól wymaganych zostaje w HTML (dymki natywne bez JS)
    expect(raw).toMatch(/<input[^>]*type="radio"[^>]*name="type"[^>]*required/);
    expect(raw).toMatch(
      /<input[^>]*type="radio"[^>]*name="transaction"[^>]*required/,
    );
    expect(raw).toMatch(/<input[^>]*id="sf-name"[^>]*required/);
    expect(raw).not.toContain("novalidate");
    // blok opcjonalny to natywne <details> — zwinięty, działa bez JS
    expect(raw).toMatch(/<details[^>]*data-sell-details[^>]*>/);
    expect(raw).not.toMatch(/<details[^>]*\sopen/);
    expect(raw).toContain(`<noscript><p class="fm-nojs">${FORM_COPY.noJs}`);
    // komunikaty błędów siedzą w HTML (pokazuje je CSS przy .err)
    for (const message of [
      SPRZEDAJ_FORM_COPY.errors.type,
      SPRZEDAJ_FORM_COPY.errors.transaction,
      FORM_COPY.errors.name,
      FORM_COPY.errors.contact,
      FORM_COPY.errors.email,
      FORM_COPY.errors.phone,
      SPRZEDAJ_FORM_COPY.errors.area,
      SPRZEDAJ_FORM_COPY.errors.price,
    ]) {
      expect(raw, message).toContain(message);
    }
    expect(raw).not.toContain(TURNSTILE_HOST);
  });
});

test.describe("sprzedaj: bez JS", () => {
  test.use({ javaScriptEnabled: false });

  test("strona kompletna: hero, kroki, formularz, blok opcjonalny rozwijany natywnie", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "wersja bez JS niezależna od profilu");
    await page.goto(SELL_PATH);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(PHOTO)).toBeVisible();
    for (const block of await page.locator("main [data-rv]").all()) {
      await expect(block).toHaveCSS("opacity", "1");
    }
    await expect(form(page)).toBeVisible();
    await expect(radio(page, "type", "2")).toBeVisible();
    // locator po klasie: silnik tekstowy Playwrighta pomija <noscript>
    await expect(form(page).locator(".fm-nojs")).toBeVisible();
    await expect(form(page).locator(".fm-nojs")).toHaveText(FORM_COPY.noJs);
    // numer składa JS — bez niego całe zdanie znika
    await expect(form(page).locator(".sf-call")).toBeHidden();
    await details(page).locator("summary").click();
    await expect(page.locator("#sf-location")).toBeVisible();
    await expect(page.locator("[data-form-done]")).toBeHidden();
    // pasek nad hero bez JS: pełne tło (nie ma kto go przemalować)
    await expect(page.locator(".hdr-bg")).toHaveCSS("opacity", "1");
  });
});

test.describe("sprzedaj: formularz", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "formularz: desktop + dwa profile mobilne");
    await recordPosts(page);
    await installClock(page);
  });

  test("pusta wysyłka: komunikaty grup i pól, fokus na pierwszym kaflu pod paskiem, zero żądań", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, SELL_PATH);
    for (const f of ["type", "transaction", "name", "contact"]) {
      await expect(wrap(page, f).locator("> [data-msg]")).toBeHidden();
    }
    await passFillTime(page);
    await submit(page).click();

    for (const f of ["type", "transaction", "name", "contact"]) {
      await expect(wrap(page, f)).toHaveClass(/err/);
    }
    for (const f of ["email", "phone", "area", "price"]) {
      await expect(wrap(page, f)).not.toHaveClass(/err/);
    }
    await expect(wrap(page, "type").locator("> [data-msg]")).toHaveText(
      SPRZEDAJ_FORM_COPY.errors.type,
    );
    await expect(wrap(page, "type").locator("> [data-msg]")).toBeVisible();
    await expect(wrap(page, "transaction").locator("> [data-msg]")).toHaveText(
      SPRZEDAJ_FORM_COPY.errors.transaction,
    );
    await expect(wrap(page, "name").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.name,
    );
    await expect(wrap(page, "contact").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.contact,
    );
    // pola opcjonalne nie blokują — blok zostaje zwinięty
    await expect(details(page)).not.toHaveAttribute("open");

    // fokus: pierwszy kafel pierwszej błędnej grupy; komunikat grupy
    // w opisie kontrolek dopiero przy aktywnym błędzie
    const first = radio(page, "type", "2");
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute("aria-describedby", "sf-type-err");
    await expect(radio(page, "transaction", "131")).toHaveAttribute(
      "aria-describedby",
      "sf-transaction-err",
    );
    // Grupa z fokusem (legenda + kafle) stoi POD stałym paskiem i w oknie.
    // Dosuwa ją skrypt, nie przeglądarka (WebKit na Linuksie przy samym
    // focus() zostawiał pole pod paskiem — czerwony `e2e` na PR #25).
    const place = await wrap(page, "type").evaluate(placeUnderBar);
    expect(place.clear).toBeGreaterThanOrEqual(FORM_SCROLL_GAP_PX - 1);
    expect(place.inView).toBe(true);

    expect(endpoint.count()).toBe(0);
    await expect(page.locator("[data-form-done]")).toBeHidden();

    // wybór kafla gasi błąd grupy (i zdejmuje komunikat z opisu)
    await radio(page, "type", "1").check();
    await expect(wrap(page, "type")).not.toHaveClass(/err/);
    await expect(first).not.toHaveAttribute("aria-describedby");
    await expect(wrap(page, "transaction")).toHaveClass(/err/);
  });

  test("błąd w ZWINIĘTYM bloku opcjonalnym otwiera go i stawia pole pod paskiem", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, SELL_PATH);
    await fillRequired(page);
    await openDetails(page);
    await page.locator("#sf-area").fill("ok. 50");
    await page.locator("#sf-price").fill("550 tys. zł");
    await details(page).locator("summary").click();
    await expect(details(page)).not.toHaveAttribute("open");
    await passFillTime(page);
    await submit(page).click();

    await expect(details(page)).toHaveAttribute("open", "");
    await expect(wrap(page, "area")).toHaveClass(/err/);
    await expect(wrap(page, "area").locator("> [data-msg]")).toHaveText(
      SPRZEDAJ_FORM_COPY.errors.area,
    );
    await expect(wrap(page, "price")).toHaveClass(/err/);
    await expect(wrap(page, "price").locator("> [data-msg]")).toHaveText(
      SPRZEDAJ_FORM_COPY.errors.price,
    );
    const area = page.locator("#sf-area");
    await expect(area).toBeFocused();
    await expect(area).toHaveAttribute("aria-invalid", "true");
    await expect(area).toHaveAttribute("aria-describedby", "sf-area-err");
    // podpowiedź przy cenie zostaje w opisie, komunikat dochodzi
    await expect(page.locator("#sf-price")).toHaveAttribute(
      "aria-describedby",
      "sf-price-hint sf-price-err",
    );
    const place = await wrap(page, "area").evaluate(placeUnderBar);
    expect(place.clear).toBeGreaterThanOrEqual(FORM_SCROLL_GAP_PX - 1);
    expect(place.inView).toBe(true);
    expect(endpoint.count()).toBe(0);

    // pisanie gasi błąd pola
    await area.fill("50");
    await expect(wrap(page, "area")).not.toHaveClass(/err/);
    await expect(wrap(page, "price")).toHaveClass(/err/);
  });

  test("minimum (typ, transakcja, imię, telefon): wysyłka → potwierdzenie w miejscu formularza", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, SELL_PATH);
    await fillRequired(page);
    await passFillTime(page);
    await submit(page).click();

    const done = page.locator("[data-form-done]");
    await expect(done).toBeVisible();
    await expect(form(page)).toBeHidden();
    await expect(page.locator("[data-form-frame]")).toHaveAttribute(
      "data-state",
      "sent",
    );
    const heading = done.locator("[data-done-h]");
    await expect(heading).toHaveText(SPRZEDAJ_FORM_COPY.frame.doneHeading);
    await expect(heading).toBeFocused();
    await expect(done).toContainText(SPRZEDAJ_FORM_COPY.frame.doneBefore);
    await expect(done).toContainText(RESPONSE_TIME);
    await expect(done).toContainText(SPRZEDAJ_FORM_COPY.frame.doneAfter.trim());
    // potwierdzenie zgłoszenia nie niesie numeru telefonu
    await expect(done.locator("a[data-tel]")).toHaveCount(0);
    const top = await heading.evaluate(placeUnderBar);
    expect(top.clear).toBeGreaterThanOrEqual(0);
    expect(top.inView).toBe(true);

    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.accept).toBe("application/json");
    expect(post.fields).toMatchObject({
      form: "sprzedaj",
      type: "2",
      transaction: "131",
      name: "Anna Nowak",
      email: "",
      phone: "600 100 200",
      location: "",
      area: "",
      price: "",
      notes: "",
      firma: "",
      "cf-turnstile-response": STUB_TOKEN,
    });
    // brak wymuszonego checkboxa: niezaznaczona zgoda nie jedzie wcale
    expect(post.fields).not.toHaveProperty("marketing");
    expect(Number(post.fields.elapsed)).toBeGreaterThanOrEqual(MIN_FILL_MS);

    // „kolejne zgłoszenie": pusty formularz, nic nie zaznaczone
    await done.locator("[data-form-again]").click();
    await expect(form(page)).toBeVisible();
    await expect(done).toBeHidden();
    await expect(page.locator("#sf-name")).toHaveValue("");
    await expect(radio(page, "type", "2")).not.toBeChecked();
    await expect(radio(page, "transaction", "131")).not.toBeChecked();
    await expect(page.locator("[data-form-frame]")).toHaveAttribute(
      "data-state",
      "form",
    );
  });

  test("komplet pól + zgoda: żądanie niesie lokalizację, powierzchnię, cenę i uwagi", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, SELL_PATH);
    await radio(page, "type", "4").check();
    await radio(page, "transaction", "132").check();
    await page.locator("#sf-name").fill("Jan Kowalski");
    await page.locator("#sf-email").fill("jan@example.com");
    await openDetails(page);
    await page.locator("#sf-location").fill("Poznań, Wilda");
    await page.locator("#sf-area").fill("52,5");
    await page.locator("#sf-price").fill("550 000");
    await page.locator("#sf-notes").fill("Lokal na parterze.");
    await form(page).locator('input[name="marketing"]').check();
    await passFillTime(page);
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.fields).toMatchObject({
      form: "sprzedaj",
      type: "4",
      transaction: "132",
      name: "Jan Kowalski",
      email: "jan@example.com",
      phone: "",
      location: "Poznań, Wilda",
      area: "52,5",
      price: "550 000",
      notes: "Lokal na parterze.",
      marketing: "1",
    });
  });

  test("antyspam: za szybka wysyłka i honeypot = udawany sukces bez żądania", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, SELL_PATH);
    await fillRequired(page);
    // bez przesunięcia zegara: szybciej niż MIN_FILL_MS
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(0);

    await page.locator("[data-form-again]").click();
    await fillRequired(page);
    await form(page)
      .locator('input[name="firma"]')
      .evaluate((el: HTMLInputElement) => {
        el.focus(); // focus zdejmuje readonly — bot „piszący" się łapie
        el.value = "ACME";
      });
    await passFillTime(page);
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(0);
    expect(await readPosts(page)).toEqual([]);
  });

  test("Turnstile: skrypt dopiero po focusie w formularzu (także na kaflu), dokładnie jeden", async ({
    page,
  }) => {
    await stubEndpoint(page);
    const turnstile = await stubTurnstile(page);
    await gotoReady(page, SELL_PATH);
    const scripts = () =>
      page.locator(`script[src^="https://${TURNSTILE_HOST}"]`).count();
    await scrollPageTo(
      page,
      await page.evaluate(() => document.body.scrollHeight),
    );
    await scrollPageTo(page, 0);
    expect(await scripts()).toBe(0);
    expect(turnstile.count()).toBe(0);

    await radio(page, "type", "2").focus();
    await expect
      .poll(scripts, { message: "skrypt po pierwszym focusie" })
      .toBe(1);
    expect(
      await page
        .locator(`script[src^="https://${TURNSTILE_HOST}"]`)
        .getAttribute("src"),
    ).toBe(TURNSTILE_SRC);
    await page.locator("#sf-name").focus();
    await page.locator("#sf-email").focus();
    expect(await scripts()).toBe(1);
    expect(turnstile.count()).toBe(1);
  });

  test("odpowiedzi serwera: 400 z polem ze zwiniętego bloku, 403, 500 → komunikat z numerem", async ({
    page,
  }) => {
    await stubTurnstile(page);
    await stubEndpoint(page, {
      status: 400,
      body: { ok: false, error: "fields", fields: ["price"] },
    });
    await gotoReady(page, SELL_PATH);
    await fillRequired(page);
    await passFillTime(page);
    await submit(page).click();
    // błąd z serwera zapala to samo opakowanie i otwiera blok opcjonalny
    await expect(details(page)).toHaveAttribute("open", "");
    await expect(wrap(page, "price")).toHaveClass(/err/);
    await expect(page.locator("#sf-price")).toBeFocused();
    await expect(page.locator("[data-form-error]")).toBeHidden();
    await expect(submit(page)).toBeEnabled();

    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, { status: 500 });
    await submit(page).click();
    const error = page.locator("[data-form-error]");
    await expect(error).toBeVisible();
    await expect(error).toContainText(SPRZEDAJ_FORM_COPY.frame.serverError);
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error.locator("a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    await expect(wrap(page, "price")).not.toHaveClass(/err/);
    // dane zostają, przycisk znów aktywny
    await expect(page.locator("#sf-name")).toHaveValue("Anna Nowak");
    await expect(radio(page, "type", "2")).toBeChecked();
    await expect(submit(page)).toBeEnabled();
    await expect(submit(page)).toHaveText(SPRZEDAJ_FORM_COPY.frame.submit);
    await expect(page.locator("[data-form-done]")).toBeHidden();
  });

  test("pola nie zoomują iOS: font-size ≥ 16 px; cele dotykowe kafli i zgody", async ({
    page,
  }) => {
    await gotoReady(page, SELL_PATH);
    await openDetails(page);
    const sizes = await form(page)
      .locator(TEXT_CONTROLS)
      .evaluateAll((els) =>
        els.map((el) => parseFloat(getComputedStyle(el).fontSize)),
      );
    expect(sizes.length).toBe(7);
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
    // kafel jest etykietą — cały jest celem dotyku
    const tiles = await form(page)
      .locator(".fm-tile")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(tiles.length).toBe(ESTATE_TYPES.length + TRANSACTIONS.length);
    for (const height of tiles) expect(height).toBeGreaterThanOrEqual(48);
    const box = await form(page)
      .locator('input[name="marketing"]')
      .boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
    const summary = await details(page).locator("summary").boundingBox();
    expect(summary?.height).toBeGreaterThanOrEqual(48);
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
    await gotoReady(page, SELL_PATH);
    await revealSweep(page);
    expect(foreign).toEqual([]);
  });

  test("axe: stan wyjściowy, blok opcjonalny, stan błędów i potwierdzenie bez naruszeń", async ({
    page,
  }, testInfo) => {
    only(testInfo, A11Y_PROJECTS, "skan a11y: desktop + jeden profil mobilny");
    await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, SELL_PATH);
    // reveale chowają treść spod zgięcia (opacity 0) — axe by ją pominął
    await revealSweep(page);
    await expect(
      page.locator("html.js-motion [data-rv]:not(.is-in)"),
    ).toHaveCount(0);
    expect(await axeViolations(page)).toEqual([]);

    await openDetails(page);
    await page.locator("#sf-price").fill("drogo");
    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "type")).toHaveClass(/err/);
    await expect(wrap(page, "price")).toHaveClass(/err/);
    expect(await axeViolations(page, "main")).toEqual([]);

    await fillRequired(page);
    await page.locator("#sf-price").fill("550000");
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    // Potwierdzenie staje w miejscu formularza, więc przycisk „kolejne
    // zgłoszenie" potrafi wylądować pod kursorem zostawionym na przycisku
    // wysyłki — axe trafiał wtedy w ŚRODEK przejścia hover (kolory
    // pośrednie). Kursor poza stronę + czas na dokończenie przejścia.
    await page.mouse.move(0, 0);
    await settle(page, 400);
    expect(await axeViolations(page, "main")).toEqual([]);
  });
});

test.describe("sprzedaj: ruch", () => {
  test("reveale: blok spod zgięcia startuje ukryty i odsłania się po wejściu w kadr", async ({
    page,
  }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, SELL_PATH);
    await expect(page.locator("html")).toHaveClass(/js-motion/);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "");
    // nagłówek formularza leży pod zgięciem na każdym profilu (kroki na
    // szerokim ekranie widać już przy wejściu)
    const block = page.locator(`${SECTION} .sf-head[data-rv]`);
    await expect(block).not.toHaveClass(/is-in/);
    await expect(block).toHaveCSS("opacity", "0");
    await expect(page.locator("[data-sell-steps] [data-rv]")).toHaveCount(
      SELL_COPY.steps.length,
    );
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

  test("parallax hero: zapas obrazu ≥ ruch (sonda układu), start bez przeskoku, obraz zakrywa kadr", async ({
    page,
  }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, SELL_PATH);
    const amt =
      (page.viewportSize()?.width ?? 0) >= SELL_DESKTOP_MIN_PX
        ? PX_AMT_DESKTOP
        : PX_AMT_MOBILE;
    const probe = () =>
      page.locator("[data-px]").evaluateAll((imgs) =>
        imgs.map((img) => {
          const frame = img.closest(".px-frame")!.getBoundingClientRect();
          const r = img.getBoundingClientRect();
          return {
            frameH: frame.height,
            above: frame.top - r.top,
            below: r.bottom - frame.bottom,
            slack: (r.height - frame.height) / 2,
            // przesunięcie wpisane przez moduł ruchu (inline) i pozycja
            // startowa z CSS (reguła pod html.js-motion)
            inline: new DOMMatrix((img as HTMLElement).style.transform).f,
            vh: window.innerHeight,
          };
        }),
      );
    const [start] = await probe();
    expect(await page.locator("[data-px]").count()).toBe(1);
    // zapas układu = amplituda × wysokość kadru (W PARZE: --px-a ↔ PX_AMT_*)
    expect(start.frameH).toBeGreaterThan(0);
    expect(start.slack).toBeGreaterThanOrEqual(
      amt * start.frameH - SUBPIXEL_TOL_PX,
    );
    // pozycja startowa z CSS = to, co moduł ruchu liczy dla scrolla 0
    // (zdjęcie pierwszego ekranu nie przeskakuje po wczytaniu modułu)
    const expected =
      (0.5 - start.vh / (start.vh + start.frameH)) * 2 * amt * start.frameH;
    expect(Math.abs(start.inline - expected)).toBeLessThanOrEqual(0.2);
    const css = await page.locator("[data-px]").evaluate((img) => {
      const el = img as HTMLElement;
      const inline = el.style.transform;
      el.style.transform = "";
      const y = new DOMMatrix(getComputedStyle(el).transform).f;
      el.style.transform = inline;
      return y;
    });
    expect(Math.abs(css - expected)).toBeLessThanOrEqual(1);

    // w każdej pozycji scrolla nad hero obraz zakrywa cały kadr
    for (const f of [0, 0.25, 0.5, 0.75, 1, 1.5]) {
      await scrollPageTo(page, f * start.frameH);
      const [p] = await probe();
      expect(p.above).toBeGreaterThanOrEqual(-SUBPIXEL_TOL_PX);
      expect(p.below).toBeGreaterThanOrEqual(-SUBPIXEL_TOL_PX);
    }
  });

  test("ruch ograniczony (reduce): treść widoczna od razu, zero transformów", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "ścieżka reduce — jeden profil");
    // PUNKTOWA emulacja reduce — dozwolony wyjątek od zakazu z testing.md:
    // ten test weryfikuje właśnie ścieżkę reduce.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoReady(page, SELL_PATH);
    await settle(page, 600);
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "");
    const below = page.locator(`${SECTION} .sf-head[data-rv]`);
    await expect(below).toHaveCSS("opacity", "1");
    await expect(below).not.toHaveClass(/is-in/);
    await expect(page.locator("[data-px]")).toHaveCSS("transform", "none");
    await scrollPageTo(page, 300);
    await expect(page.locator("[data-px]")).toHaveCSS("transform", "none");
    // formularz działa niezależnie od bramki ruchu
    await expect(form(page)).toHaveAttribute("novalidate", "");
  });

  test("scroll jest natywny (bez pośrednika i bez blokady dokumentu)", async ({
    page,
  }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "ruch: desktop + dwa profile mobilne");
    await gotoReady(page, SELL_PATH);
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
