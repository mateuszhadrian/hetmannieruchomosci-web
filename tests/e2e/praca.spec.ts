// /praca/ (Etap 5B / PR 2, docs/analiza-formularze-b.md §4 i §11): hero ze
// zdjęciem, formularz rekrutacyjny z plikiem CV — para kontaktowa (zasada
// wspólna), JEDYNY checkbox = opcjonalna zgoda na przyszłe rekrutacje,
// pole pliku (brak, zły typ, za duży, poprawny, upuszczenie), komunikaty
// kierujące na e-mail biura, antyspam, stany wysyłki, wersja bez JS, zero
// podmiotów trzecich, axe. Treść na `chromium-1920`; formularz także na
// `chromium-pixel-5` i `webkit-iphone-14`.
// Endpoint i Turnstile ZAWSZE zaślepione (tests/helpers/forms.ts); pliki
// to bufory budowane w teście — żaden plik nie opuszcza przeglądarki
// testowej. Limit pliku i jego opis biorą się ze stałej `CV_MAX_BYTES`.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  FORM_ENDPOINT,
  FORM_SCROLL_GAP_PX,
  TURNSTILE_SRC,
} from "../../src/components/forms/form-config";
import {
  FORM_COPY,
  PRACA_FORM_COPY,
  RESPONSE_TIME,
} from "../../src/components/forms/forms-copy";
import {
  JOBS_DESKTOP_MIN_PX,
  JOBS_FORM_ID,
  JOBS_HEADING_ID,
  JOBS_HERO_SMALL_BELOW_PX,
} from "../../src/components/sections/jobs/jobs-config";
import { JOBS_COPY } from "../../src/components/sections/jobs/jobs-copy";
import { ui } from "../../src/i18n/ui";
import {
  FUTURE_RECRUITMENT_CONSENT,
  MIN_FILL_MS,
} from "../../src/lib/contact-form";
import { buildEmail, buildPhoneHref } from "../../src/lib/contact-details";
import {
  CV_MAX_BYTES,
  cvAccept,
  cvLimitLabel,
  cvTypesLabel,
  formatFileSize,
} from "../../src/lib/cv-file";
import { JOBS_PATH, POLICY_PATH } from "../../src/lib/routes";
import { SHOW_PRACA } from "../../src/lib/site-config";
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
import { usePreviewGuard } from "../helpers/guards";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";

usePreviewGuard();

// Stan WYŁĄCZONY przełącznika pilnuje warstwa unit (site-flags.test.ts);
// ten spec opisuje stronę z formularzem.
test.skip(!SHOW_PRACA, "podstrona „Praca” wyłączona przełącznikiem");

const DESKTOP = "chromium-1920";
const FORM_PROJECTS = [DESKTOP, "chromium-pixel-5", "webkit-iphone-14"];
const A11Y_PROJECTS = [DESKTOP, "chromium-pixel-5"];
const SUBPIXEL_TOL_PX = 0.5;
const MAILTO = `mailto:${buildEmail("biuro")}`;

const only = (testInfo: TestInfo, projects: string[], why: string) =>
  test.skip(!projects.includes(testInfo.project.name), why);

const form = (page: Page) => page.locator('form[data-form="praca"]');
const wrap = (page: Page, f: string) => form(page).locator(`[data-f="${f}"]`);
const submit = (page: Page) => page.locator("[data-form-submit]");
const cvInput = (page: Page) => page.locator("#pf-cv");
const zone = (page: Page) => page.locator("[data-file-zone]");

// ── pliki testowe: bufory budowane w teście ──
const PDF_HEAD = "%PDF-1.7\n";
const pdf = (name = "CV-Anna-Nowak.pdf", size = 34_567) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.alloc(size, PDF_HEAD),
});
const docx = (name = "Życiorys Anna Nowak.docx", size = 20_000) => ({
  name,
  mimeType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: Buffer.alloc(size, "PK\u0003\u0004"),
});

/** Poprawne zgłoszenie: imię, e-mail i plik PDF (bez treści i zgody). */
async function fillValid(page: Page, file = pdf()): Promise<void> {
  await page.locator("#pf-name").fill("Anna Nowak");
  await page.locator("#pf-email").fill("anna@example.com");
  await cvInput(page).setInputFiles(file);
}

/** Położenie elementu względem stałego paska i okna. */
const placeUnderBar = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const hdr = document.querySelector("[data-nav]")!;
    const r = el.getBoundingClientRect();
    return {
      clear: r.top - hdr.getBoundingClientRect().bottom,
      inView: r.bottom <= window.innerHeight,
    };
  });

async function axeViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.describe("praca: treść i układ", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
  });

  test("hero: nagłówek z jobs-copy, zdjęcie priorytetowe, pasek stały", async ({
    page,
  }) => {
    await gotoReady(page, JOBS_PATH);
    await expect(page).toHaveTitle(ui.pl["jobsPage.title"]);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText(
      `${JOBS_COPY.title} ${JOBS_COPY.accent}`,
    );
    await expect(page.locator("main h1")).toHaveAttribute(
      "id",
      JOBS_HEADING_ID,
    );
    await expect(page.locator("[data-jobs-hero] .sx-eyebrow")).toHaveText(
      JOBS_COPY.eyebrow,
    );
    // druga fraza nagłówka stoi w osobnej linii
    expect(
      await page
        .locator("main h1 span")
        .evaluate((el) => getComputedStyle(el).display),
    ).toBe("block");

    const photo = page.locator("[data-jobs-photo]");
    await expect(photo).toHaveAttribute("loading", "eager");
    await expect(photo).toHaveAttribute("fetchpriority", "high");
    await expect(photo).toHaveAttribute("alt", JOBS_COPY.imageAlt);
    await expect(photo).toHaveAttribute("width", /^\d+$/);
    await expect(photo).toHaveAttribute("height", /^\d+$/);
    await expect(photo).toHaveAttribute("src", /praca-hero\./);
    // kadr bez deformacji: zdjęcie WYPEŁNIA pole (cover), nie jest rozciągane
    const fit = await photo.evaluate((el: HTMLImageElement) => ({
      fit: getComputedStyle(el).objectFit,
      loaded: el.complete && el.naturalWidth > 0,
      opacity: getComputedStyle(el).opacity,
    }));
    expect(fit).toEqual({ fit: "cover", loaded: true, opacity: "1" });

    // widok bez ruchu i bez wariantu paska „nad hero"
    await expect(page.locator("header.hdr")).not.toHaveAttribute(
      "data-scroll-nav",
    );
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    await expect(page.locator("main [data-rv], main [data-px]")).toHaveCount(0);
  });

  test("zdjęcie: dwa preloady z media, mniejszy plik poniżej 768 px", async ({
    page,
  }) => {
    const raw = await (await page.request.get(JOBS_PATH)).text();
    const preloads = raw.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g);
    expect(preloads).toHaveLength(2);
    expect(preloads?.[0]).toContain("praca-hero-m.");
    expect(preloads?.[0]).toContain(
      `media="(max-width: ${JOBS_HERO_SMALL_BELOW_PX - 1}px)"`,
    );
    expect(preloads?.[1]).toMatch(/praca-hero\.[^"]*\.webp/);
    expect(preloads?.[1]).toContain(
      `media="(min-width: ${JOBS_HERO_SMALL_BELOW_PX}px)"`,
    );
    for (const link of preloads ?? []) {
      expect(link).toContain('fetchpriority="high"');
    }

    await gotoReady(page, JOBS_PATH);
    const source = page.locator("[data-jobs-hero] picture source");
    await expect(source).toHaveAttribute(
      "media",
      `(max-width: ${JOBS_HERO_SMALL_BELOW_PX - 1}px)`,
    );
    await expect(source).toHaveAttribute("srcset", /praca-hero-m\./);
    const current = () =>
      page
        .locator("[data-jobs-photo]")
        .evaluate((el: HTMLImageElement) => el.currentSrc);
    await page.setViewportSize({
      width: JOBS_HERO_SMALL_BELOW_PX - 1,
      height: 900,
    });
    await expect.poll(current).toMatch(/praca-hero-m\./);
    await page.setViewportSize({
      width: JOBS_HERO_SMALL_BELOW_PX,
      height: 900,
    });
    await expect.poll(current).toMatch(/praca-hero\.[^/]*\.webp/);
  });

  test("pola: etykiety, kolejność, autouzupełnianie, pole pliku", async ({
    page,
  }) => {
    await gotoReady(page, JOBS_PATH);
    const fields = [
      { id: "pf-name", label: FORM_COPY.name.label, ac: "name", type: "text" },
      {
        id: "pf-email",
        label: FORM_COPY.email.label,
        ac: "email",
        type: "email",
      },
      { id: "pf-phone", label: FORM_COPY.phone.label, ac: "tel", type: "tel" },
    ];
    for (const f of fields) {
      await expect(page.locator(`label[for="${f.id}"]`)).toHaveText(f.label);
      const input = page.locator(`#${f.id}`);
      await expect(input).toHaveAttribute("autocomplete", f.ac);
      await expect(input).toHaveAttribute("type", f.type);
    }
    // treść jest opcjonalna — mówi to dopisek w etykiecie
    await expect(page.locator('label[for="pf-message"]')).toHaveText(
      `${PRACA_FORM_COPY.message.label} ${FORM_COPY.optional}`,
    );
    await expect(page.locator("textarea#pf-message")).toHaveAttribute(
      "placeholder",
      PRACA_FORM_COPY.message.placeholder,
    );
    await expect(page.locator("#pf-message")).not.toHaveAttribute("required");
    // para kontaktowa: żadne z dwóch pól nie jest wymagane pojedynczo
    await expect(page.locator("#pf-email")).not.toHaveAttribute("required");
    await expect(page.locator("#pf-phone")).not.toHaveAttribute("required");
    await expect(form(page).getByText(FORM_COPY.contactHint)).toBeVisible();

    expect(
      await form(page)
        .locator("[data-f] input, [data-f] textarea")
        .evaluateAll((els) => els.map((el) => el.id)),
    ).toEqual(["pf-name", "pf-email", "pf-phone", "pf-message", "pf-cv"]);

    // pole pliku: natywny input na strefie, JEDNA etykieta, opis = dopisek
    const cv = cvInput(page);
    await expect(cv).toHaveAttribute("type", "file");
    await expect(cv).toHaveAttribute("name", "cv");
    await expect(cv).toHaveAttribute("required", "");
    await expect(cv).toHaveAttribute("accept", cvAccept());
    await expect(cv).not.toHaveAttribute("multiple");
    await expect(cv).toHaveAttribute("aria-describedby", "pf-cv-hint");
    await expect(page.locator('label[for="pf-cv"]')).toHaveCount(1);
    await expect(page.locator('label[for="pf-cv"]')).toHaveText(
      PRACA_FORM_COPY.cv.label,
    );
    await expect(page.locator("#pf-cv-hint")).toHaveText(
      `${cvTypesLabel()} · maks. ${cvLimitLabel()}`,
    );
    expect(PRACA_FORM_COPY.cv.hint).toContain(formatFileSize(CV_MAX_BYTES));
    await expect(zone(page)).toContainText(PRACA_FORM_COPY.cv.pick);
    await expect(page.locator("[data-file-name]")).toHaveText(
      PRACA_FORM_COPY.cv.idle,
    );
    await expect(page.locator("[data-file-size]")).toBeEmpty();
    // input leży na CAŁEJ strefie (klik i upuszczenie w dowolnym miejscu)
    const cover = await cv.evaluate((el) => {
      const a = el.getBoundingClientRect();
      const b = el.closest("[data-file-zone]")!.getBoundingClientRect();
      return {
        dw: Math.abs(a.width - b.width),
        dh: Math.abs(a.height - b.height),
        opacity: getComputedStyle(el).opacity,
        display: getComputedStyle(el).display,
      };
    });
    expect(cover.dw).toBeLessThan(3);
    expect(cover.dh).toBeLessThan(3);
    expect(cover.opacity).toBe("0");
    expect(cover.display).not.toBe("none");

    // nazwa dostępna formularza = nagłówek strony
    await expect(form(page)).toHaveAttribute(
      "aria-labelledby",
      JOBS_HEADING_ID,
    );
    await expect(
      page.getByRole("form", {
        name: `${JOBS_COPY.title} ${JOBS_COPY.accent}`,
      }),
    ).toHaveCount(1);
    await expect(page.locator(`section#${JOBS_FORM_ID}`)).toHaveCount(1);
  });

  test("zgody: JEDEN checkbox — przyszłe rekrutacje; bez zgody rekrutacyjnej i marketingowej", async ({
    page,
  }) => {
    await gotoReady(page, JOBS_PATH);
    const boxes = form(page).locator('input[type="checkbox"]');
    await expect(boxes).toHaveCount(1);
    await expect(boxes).toHaveAttribute("name", "future");
    await expect(boxes).not.toBeChecked();
    await expect(boxes).not.toHaveAttribute("required");
    await expect(form(page).locator("label.fm-consent")).toHaveText(
      FUTURE_RECRUITMENT_CONSENT,
    );
    expect(FUTURE_RECRUITMENT_CONSENT).not.toContain("*");
    await form(page).locator("label.fm-consent span").click();
    await expect(boxes).toBeChecked();
    for (const name of ["marketing", "consent_recruitment", "consent_future"]) {
      await expect(page.locator(`[name="${name}"]`), name).toHaveCount(0);
    }

    // nota informacyjna stoi osobno, z linkiem do polityki
    const note = form(page).locator(".fm-note");
    await expect(note).toContainText(PRACA_FORM_COPY.frame.purpose);
    const policy = note.locator("a");
    await expect(policy).toHaveAttribute("href", POLICY_PATH);
    await expect(policy).toHaveText(FORM_COPY.policyLink);
    expect(
      await policy.evaluate((a) => getComputedStyle(a).textDecorationLine),
    ).toContain("underline");
    expect((await page.request.get(POLICY_PATH)).status()).toBe(200);
    await expect(submit(page)).toHaveText(PRACA_FORM_COPY.frame.submit);

    // kolejność bloku końcowego: zgoda → nota → przycisk (→ „Wolisz mailem?")
    const order = await form(page).evaluate((el) => {
      const top = (sel: string) =>
        el.querySelector(sel)!.getBoundingClientRect().top;
      return [top(".fm-consent"), top(".fm-note"), top("[data-form-submit]")];
    });
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(
      await form(page).evaluate((el) =>
        [...el.children]
          .filter((c) => c.matches(".fm-consent, .fm-note, .fm-send, .jf-mail"))
          .map((c) => c.className.split(" ").pop()),
      ),
    ).toEqual(["fm-consent", "fm-note", "fm-send", "jf-mail"]);
  });

  test("sloty: surowy <main> bez adresów; po JS mailto: w trzech miejscach", async ({
    page,
  }) => {
    const raw = await (await page.request.get(JOBS_PATH)).text();
    const main = raw.slice(raw.indexOf("<main"), raw.indexOf("</main>"));
    expect(main.length).toBeGreaterThan(1000);
    const digits = buildPhoneHref().replace(/\D/g, "");
    expect(main.replace(/[\s-]/g, "")).not.toContain(digits.slice(2));
    expect(main).not.toContain(buildEmail("biuro"));
    expect(main).not.toContain("tel:");
    expect(main).not.toContain("mailto:");
    // trzy puste kotwice adresu (za duży plik, błąd wysyłki, „Wolisz
    // mailem?"), każda z <span data-slot>; telefonu w widoku nie ma
    expect(
      main.match(/<a[^>]*data-mail="biuro"[^>]*hidden[^>]*>\s*<span data-slot/g)
        ?.length,
    ).toBe(3);
    expect(main).not.toContain("data-tel");

    await gotoReady(page, JOBS_PATH);
    const mail = page.locator("a.jf-mail-a");
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute("href", MAILTO);
    await expect(mail).toHaveText(buildEmail("biuro"));
    await expect(page.locator(".jf-mail")).toContainText(PRACA_FORM_COPY.mail);
    // dwa pozostałe sloty są wypełnione, ale ich komunikaty — ukryte
    await expect(page.locator('main a[data-mail="biuro"]')).toHaveCount(3);
    for (const sel of [
      '[data-f="cv-size"] > [data-msg]',
      "[data-form-error]",
    ]) {
      await expect(page.locator(sel)).toBeHidden();
      await expect(page.locator(`${sel} a[data-mail]`)).toHaveAttribute(
        "href",
        MAILTO,
      );
    }
  });

  test("próg 1025: pola 1 ↔ 3 kolumny, strefa pliku wiersz ↔ kolumna", async ({
    page,
  }) => {
    await gotoReady(page, JOBS_PATH);
    await expectBreakpointFlip(
      page,
      JOBS_DESKTOP_MIN_PX,
      {
        row: "[data-jobs-row]",
        zone: "[data-file-zone]",
        drag: ".fm-zone-drag",
        form: 'form[data-form="praca"]',
      },
      { row: "flex", zone: "grid", drag: "none", form: "flex" },
      { row: "grid", zone: "flex", drag: "block", form: "grid" },
    );
    // desktop: imię | e-mail | telefon w jednym rzędzie, treść obok strefy
    // pliku (ta sama wysokość), przycisk i „Wolisz mailem?" w jednym wierszu
    const desktop = await page.evaluate(() => {
      const r = (sel: string) =>
        document.querySelector(sel)!.getBoundingClientRect();
      return {
        tops: ["#pf-name", "#pf-email", "#pf-phone"].map((s) => r(s).top),
        lefts: ["#pf-name", "#pf-email", "#pf-phone"].map((s) => r(s).left),
        widths: ["#pf-name", "#pf-email", "#pf-phone"].map((s) => r(s).width),
        area: r("#pf-message"),
        zone: r("[data-file-zone]"),
        cvLeft: r("[data-file-zone]").left,
        phoneLeft: r("#pf-phone").left,
        send: r("[data-form-submit]"),
        mail: r(".jf-mail"),
      };
    });
    expect(Math.max(...desktop.tops) - Math.min(...desktop.tops)).toBeLessThan(
      SUBPIXEL_TOL_PX,
    );
    expect(desktop.lefts[0]).toBeLessThan(desktop.lefts[1]);
    expect(desktop.lefts[1]).toBeLessThan(desktop.lefts[2]);
    expect(
      Math.max(...desktop.widths) - Math.min(...desktop.widths),
    ).toBeLessThan(1);
    expect(Math.abs(desktop.cvLeft - desktop.phoneLeft)).toBeLessThan(1);
    expect(Math.abs(desktop.area.top - desktop.zone.top)).toBeLessThan(1);
    expect(Math.abs(desktop.area.bottom - desktop.zone.bottom)).toBeLessThan(1);
    expect(desktop.mail.left).toBeGreaterThan(desktop.send.right);
    expect(desktop.mail.top).toBeLessThan(desktop.send.bottom);
    expect(desktop.mail.bottom).toBeGreaterThan(desktop.send.top);

    // telefon i tablet: wszystko jedno pod drugim
    await page.setViewportSize({ width: JOBS_DESKTOP_MIN_PX - 1, height: 900 });
    await settle(page, 150);
    const tops = await page.evaluate(() =>
      [
        "#pf-name",
        "#pf-email",
        "#pf-phone",
        "#pf-message",
        "[data-file-zone]",
        "[data-form-submit]",
        ".jf-mail",
      ].map((s) => document.querySelector(s)!.getBoundingClientRect().top),
    );
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(tops.length);
  });

  test("bez JS (surowy HTML): komplet pól, enctype, <noscript>, komunikaty", async ({
    page,
  }) => {
    const raw = await (await page.request.get(JOBS_PATH)).text();
    expect(raw).toMatch(
      new RegExp(
        `<form[^>]*data-form="praca"[^>]*method="post"[^>]*action="${FORM_ENDPOINT}"[^>]*enctype="multipart/form-data"`,
      ),
    );
    expect(raw).toContain('<input type="hidden" name="form" value="praca"');
    for (const name of ["name", "email", "phone", "message", "cv", "future"]) {
      expect(raw, name).toContain(`name="${name}"`);
    }
    expect(raw).not.toContain('name="marketing"');
    expect(raw).toMatch(/<input[^>]*id="pf-name"[^>]*required/);
    expect(raw).toMatch(/<input[^>]*id="pf-cv"[^>]*type="file"[^>]*required/);
    expect(raw).not.toMatch(/<textarea[^>]*id="pf-message"[^>]*required/);
    expect(raw).not.toContain("novalidate");
    expect(raw).toContain(`<noscript><p class="fm-nojs">${FORM_COPY.noJs}`);
    // komunikaty błędów siedzą w HTML (pokazuje je CSS przy .err)
    for (const message of [
      FORM_COPY.errors.name,
      FORM_COPY.errors.contact,
      FORM_COPY.errors.email,
      FORM_COPY.errors.phone,
      PRACA_FORM_COPY.errors.cv,
      PRACA_FORM_COPY.errors.cvType,
      PRACA_FORM_COPY.errors.cvSize,
      PRACA_FORM_COPY.frame.serverError,
    ]) {
      expect(raw, message).toContain(message);
    }
    // limit w komunikacie i dopisku pochodzi ze stałej
    expect(PRACA_FORM_COPY.errors.cvSize).toContain(cvLimitLabel());
    expect(raw).toContain(`maks. ${cvLimitLabel()}`);
    // potwierdzenie BEZ deklaracji czasu odpowiedzi
    const done = raw.slice(raw.indexOf("data-form-done"));
    expect(done.slice(0, done.indexOf("</div>"))).not.toContain(RESPONSE_TIME);
    expect(raw).not.toContain(TURNSTILE_HOST);
    // strona w indeksie (przełącznik włączony)
    expect(raw).not.toMatch(/<meta[^>]*name="robots"[^>]*noindex/);
    expect(raw).toContain('rel="canonical"');
  });
});

test.describe("praca: bez JS", () => {
  test.use({ javaScriptEnabled: false });

  test("formularz kompletny, informacja widoczna, zdanie ze slotem ukryte", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "wersja bez JS niezależna od profilu");
    await page.goto(JOBS_PATH);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(form(page)).toBeVisible();
    await expect(page.locator("#pf-name")).toBeVisible();
    await expect(zone(page)).toBeVisible();
    await expect(cvInput(page)).toBeAttached();
    // locator po klasie: silnik tekstowy Playwrighta pomija <noscript>
    await expect(form(page).locator(".fm-nojs")).toBeVisible();
    await expect(form(page).locator(".fm-nojs")).toHaveText(FORM_COPY.noJs);
    await expect(page.locator(".jf-mail")).toBeHidden();
    await expect(page.locator("[data-form-done]")).toBeHidden();
    await expect(page.locator("[data-file-name]")).toHaveText(
      PRACA_FORM_COPY.cv.idle,
    );
  });
});

test.describe("praca: formularz", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "formularz: desktop + dwa profile mobilne");
    await recordPosts(page);
    await installClock(page);
  });

  test("pusta wysyłka: imię, para i plik; fokus na pierwszym polu, zero żądań", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, JOBS_PATH);
    for (const f of ["name", "contact", "cv", "cv-type", "cv-size"]) {
      await expect(wrap(page, f).locator("> [data-msg]")).toBeHidden();
    }
    await passFillTime(page);
    await submit(page).click();

    for (const f of ["name", "contact", "cv"]) {
      await expect(wrap(page, f), f).toHaveClass(/err/);
    }
    for (const f of ["email", "phone", "message", "cv-type", "cv-size"]) {
      await expect(wrap(page, f), f).not.toHaveClass(/err/);
    }
    await expect(wrap(page, "cv").locator("> [data-msg]")).toHaveText(
      PRACA_FORM_COPY.errors.cv,
    );
    await expect(wrap(page, "cv").locator("> [data-msg]")).toBeVisible();
    await expect(wrap(page, "cv-type").locator("> [data-msg]")).toBeHidden();
    await expect(wrap(page, "cv-size").locator("> [data-msg]")).toBeHidden();

    await expect(page.locator("#pf-name")).toBeFocused();
    const place = await placeUnderBar(page, '[data-f="name"]');
    expect(place.clear).toBeGreaterThanOrEqual(FORM_SCROLL_GAP_PX - 1);
    expect(place.inView).toBe(true);
    expect(endpoint.count()).toBe(0);
    await expect(page.locator("[data-form-done]")).toBeHidden();
  });

  test("brak pliku: błąd `cv`, fokus na polu pliku pod paskiem; wybór pliku gasi błąd", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, JOBS_PATH);
    await page.locator("#pf-name").fill("Anna Nowak");
    await page.locator("#pf-phone").fill("600 100 200");
    await passFillTime(page);
    await submit(page).click();

    await expect(wrap(page, "cv")).toHaveClass(/err/);
    await expect(wrap(page, "name")).not.toHaveClass(/err/);
    await expect(wrap(page, "contact")).not.toHaveClass(/err/);
    await expect(cvInput(page)).toBeFocused();
    await expect(cvInput(page)).toHaveAttribute("aria-invalid", "true");
    // opis pola = dopisek (stały) + komunikat aktywnego błędu
    await expect(cvInput(page)).toHaveAttribute(
      "aria-describedby",
      "pf-cv-hint pf-cv-err",
    );
    const place = await placeUnderBar(page, '[data-f="cv"]');
    expect(place.clear).toBeGreaterThanOrEqual(FORM_SCROLL_GAP_PX - 1);
    expect(place.inView).toBe(true);
    // strefa w stanie błędu: czerwony obrys (asercja z ponawianiem — kolor
    // obrysu ma przejście)
    await expect(zone(page)).toHaveCSS(
      "border-top-color",
      await wrap(page, "cv")
        .locator("> [data-msg]")
        .evaluate((el) => getComputedStyle(el).color),
    );
    expect(endpoint.count()).toBe(0);

    await cvInput(page).setInputFiles(pdf());
    await expect(wrap(page, "cv")).not.toHaveClass(/err/);
    await expect(cvInput(page)).toHaveAttribute("aria-invalid", "false");
    await expect(cvInput(page)).toHaveAttribute(
      "aria-describedby",
      "pf-cv-hint",
    );
  });

  test("zły typ pliku (.txt, .jpg): błąd `cv-type`, zero żądań", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, JOBS_PATH);
    await passFillTime(page);
    for (const file of [
      { name: "cv.txt", mimeType: "text/plain", buffer: Buffer.from("CV") },
      {
        name: "zdjecie.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]),
      },
      // plik pusty też nie jest dokumentem
      { name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(0) },
    ]) {
      await fillValid(page, file);
      await expect(page.locator("[data-file-name]")).toHaveText(file.name);
      await submit(page).click();
      await expect(wrap(page, "cv-type"), file.name).toHaveClass(/err/);
      await expect(wrap(page, "cv-type").locator("> [data-msg]")).toHaveText(
        PRACA_FORM_COPY.errors.cvType,
      );
      await expect(wrap(page, "cv")).not.toHaveClass(/err/);
      await expect(wrap(page, "cv-size")).not.toHaveClass(/err/);
      await expect(cvInput(page)).toBeFocused();
      await expect(cvInput(page)).toHaveAttribute(
        "aria-describedby",
        "pf-cv-hint pf-cv-type-err",
      );
    }
    expect(endpoint.count()).toBe(0);
    await expect(page.locator("[data-form-done]")).toBeHidden();
  });

  test("plik większy niż limit: błąd `cv-size` z adresem e-mail, zero żądań", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, JOBS_PATH);
    await fillValid(page, pdf("Portfolio.pdf", CV_MAX_BYTES + 1));
    await expect(page.locator("[data-file-name]")).toHaveText("Portfolio.pdf");
    await passFillTime(page);
    await submit(page).click();

    await expect(wrap(page, "cv-size")).toHaveClass(/err/);
    await expect(wrap(page, "cv-type")).not.toHaveClass(/err/);
    await expect(wrap(page, "cv")).not.toHaveClass(/err/);
    const message = wrap(page, "cv-size").locator("> [data-msg]");
    await expect(message).toBeVisible();
    await expect(message).toContainText(PRACA_FORM_COPY.errors.cvSize);
    await expect(message).toContainText(cvLimitLabel());
    // nie ślepy zaułek: adres biura jest klikalny
    const mail = message.locator('a[data-mail="biuro"]');
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute("href", MAILTO);
    await expect(mail).toHaveText(buildEmail("biuro"));
    await expect(cvInput(page)).toBeFocused();
    await expect(cvInput(page)).toHaveAttribute(
      "aria-describedby",
      "pf-cv-hint pf-cv-size-err",
    );
    const place = await placeUnderBar(page, '[data-f="cv-size"]');
    expect(place.clear).toBeGreaterThanOrEqual(FORM_SCROLL_GAP_PX - 1);
    expect(place.inView).toBe(true);
    expect(endpoint.count()).toBe(0);
    // pola zachowane
    await expect(page.locator("#pf-name")).toHaveValue("Anna Nowak");

    // plik o rozmiarze DOKŁADNIE limitu przechodzi walidację kliencką
    await cvInput(page).setInputFiles(pdf("cv.pdf", CV_MAX_BYTES));
    await expect(wrap(page, "cv-size")).not.toHaveClass(/err/);
    await stubTurnstile(page);
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.files.cv.size).toBe(CV_MAX_BYTES);
  });

  test("poprawny PDF: nazwa i rozmiar w strefie, jedno żądanie z plikiem; potwierdzenie bez czasu odpowiedzi", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, JOBS_PATH);
    const file = pdf();
    await fillValid(page, file);
    await expect(page.locator("[data-file-name]")).toHaveText(file.name);
    await expect(page.locator("[data-file-size]")).toHaveText(
      formatFileSize(file.buffer.length),
    );
    await passFillTime(page);
    await submit(page).click();

    const done = page.locator("[data-form-done]");
    await expect(done).toBeVisible();
    await expect(form(page)).toBeHidden();
    const heading = done.locator("[data-done-h]");
    await expect(heading).toHaveText(PRACA_FORM_COPY.frame.doneHeading);
    await expect(heading).toBeFocused();
    await expect(done).toContainText(PRACA_FORM_COPY.frame.doneBefore);
    // rekrutacja nie deklaruje czasu odpowiedzi i nie podaje kontaktu
    await expect(done).not.toContainText(RESPONSE_TIME);
    await expect(done.locator("strong")).toHaveCount(0);
    await expect(done.locator("a")).toHaveCount(0);
    const top = await placeUnderBar(page, "[data-done-h]");
    expect(top.clear).toBeGreaterThanOrEqual(0);
    expect(top.inView).toBe(true);

    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.accept).toBe("application/json");
    // KOMPLET kluczy żądania — nic ponad pola formularza i antyspam
    expect(Object.keys(post.fields).sort()).toEqual(
      [
        "cf-turnstile-response",
        "elapsed",
        "email",
        "firma",
        "form",
        "message",
        "name",
        "phone",
      ].sort(),
    );
    expect(post.fields).toMatchObject({
      form: "praca",
      name: "Anna Nowak",
      email: "anna@example.com",
      phone: "",
      message: "",
      firma: "",
      "cf-turnstile-response": STUB_TOKEN,
    });
    expect(Number(post.fields.elapsed)).toBeGreaterThanOrEqual(MIN_FILL_MS);
    expect(Object.keys(post.files)).toEqual(["cv"]);
    expect(post.files.cv).toEqual({
      name: file.name,
      size: file.buffer.length,
      type: "application/pdf",
    });

    // „kolejne zgłoszenie": pusty formularz, plik wyczyszczony
    await done.locator("[data-form-again]").click();
    await expect(form(page)).toBeVisible();
    await expect(page.locator("#pf-name")).toHaveValue("");
    await expect(page.locator("#pf-name")).toBeFocused();
    await expect(page.locator("[data-file-name]")).toHaveText(
      PRACA_FORM_COPY.cv.idle,
    );
    await expect(page.locator("[data-file-size]")).toBeEmpty();
    expect(
      await cvInput(page).evaluate((el: HTMLInputElement) => el.files?.length),
    ).toBe(0);
  });

  test("DOCX + sam telefon + treść + zgoda na przyszłe rekrutacje", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, JOBS_PATH);
    const file = docx();
    await page.locator("#pf-name").fill("Jan Kowalski");
    await page.locator("#pf-phone").fill("+48 600 100 200");
    await page
      .locator("#pf-message")
      .fill("Od pięciu lat pracuję w sprzedaży.");
    await cvInput(page).setInputFiles(file);
    await form(page).locator('input[name="future"]').check();
    await passFillTime(page);
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.fields).toMatchObject({
      email: "",
      phone: "+48 600 100 200",
      message: "Od pięciu lat pracuję w sprzedaży.",
      future: "1",
    });
    expect(post.fields).not.toHaveProperty("marketing");
    expect(post.files.cv.name).toBe(file.name);
    expect(post.files.cv.size).toBe(file.buffer.length);
  });

  test("para kontaktowa: brak obu → błąd pary; błędny e-mail → błąd pola", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, JOBS_PATH);
    await page.locator("#pf-name").fill("Anna Nowak");
    await cvInput(page).setInputFiles(pdf());
    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "contact")).toHaveClass(/err/);
    await expect(wrap(page, "contact").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.contact,
    );
    await expect(page.locator("#pf-email")).toBeFocused();

    await page.locator("#pf-email").fill("anna@x");
    await submit(page).click();
    await expect(wrap(page, "email")).toHaveClass(/err/);
    await expect(wrap(page, "contact")).not.toHaveClass(/err/);
    // plik został w polu mimo nieudanych prób
    await expect(page.locator("[data-file-name]")).toHaveText(pdf().name);
    expect(endpoint.count()).toBe(0);
  });

  test("odpowiedzi serwera: 413 → błąd rozmiaru, 400 `cv-type` (sygnatura), 500 → błąd z adresem e-mail", async ({
    page,
  }) => {
    await stubTurnstile(page);
    await stubEndpoint(page, {
      status: 413,
      body: { ok: false, error: "too-large" },
    });
    await gotoReady(page, JOBS_PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "cv-size")).toHaveClass(/err/);
    await expect(
      wrap(page, "cv-size").locator('> [data-msg] a[data-mail="biuro"]'),
    ).toHaveAttribute("href", MAILTO);
    await expect(cvInput(page)).toBeFocused();
    await expect(page.locator("[data-form-error]")).toBeHidden();
    await expect(submit(page)).toBeEnabled();

    // sygnatura nie zgadza się z rozszerzeniem — rozstrzyga funkcja
    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, {
      status: 400,
      body: { ok: false, error: "fields", fields: ["cv-type"] },
    });
    await submit(page).click();
    await expect(wrap(page, "cv-type")).toHaveClass(/err/);
    await expect(wrap(page, "cv-size")).not.toHaveClass(/err/);
    await expect(cvInput(page)).toBeFocused();
    await expect(page.locator("[data-form-error]")).toBeHidden();

    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, { status: 500 });
    await submit(page).click();
    const error = page.locator("[data-form-error]");
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error).toContainText(PRACA_FORM_COPY.frame.serverError);
    // kandydat ma wysłać plik mailem, nie dzwonić
    await expect(error.locator('a[data-mail="biuro"]')).toHaveAttribute(
      "href",
      MAILTO,
    );
    await expect(error.locator("a[data-tel]")).toHaveCount(0);
    await expect(wrap(page, "cv-type")).not.toHaveClass(/err/);

    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, (route) => route.abort());
    await submit(page).click();
    await expect(error).toBeVisible();
    // dane i plik zostają
    await expect(page.locator("#pf-name")).toHaveValue("Anna Nowak");
    await expect(page.locator("[data-file-name]")).toHaveText(pdf().name);
    await expect(page.locator("[data-form-done]")).toBeHidden();
  });

  test("upuszczenie pliku na strefę: plik trafia do pola, błąd gaśnie", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "przeciągnij i upuść: desktop");
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, JOBS_PATH);
    await expect(page.locator(".fm-zone-drag")).toBeVisible();
    await expect(page.locator(".fm-zone-drag")).toHaveText(
      PRACA_FORM_COPY.cv.drag,
    );
    await page.locator("#pf-name").fill("Anna Nowak");
    await page.locator("#pf-email").fill("anna@example.com");
    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "cv")).toHaveClass(/err/);

    const transfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      dt.items.add(
        new File(["%PDF-1.7 upuszczony"], "Upuszczone-CV.pdf", {
          type: "application/pdf",
        }),
      );
      dt.items.add(new File(["drugi"], "drugi.pdf"));
      return dt;
    });
    await zone(page).dispatchEvent("dragover", { dataTransfer: transfer });
    await expect(zone(page)).toHaveAttribute("data-drag", "");
    await zone(page).dispatchEvent("drop", { dataTransfer: transfer });
    await expect(zone(page)).not.toHaveAttribute("data-drag");
    await expect(page.locator("[data-file-name]")).toHaveText(
      "Upuszczone-CV.pdf",
    );
    // pole przyjmuje JEDEN plik — pierwszy z upuszczonych
    expect(
      await cvInput(page).evaluate((el: HTMLInputElement) =>
        [...(el.files ?? [])].map((f) => f.name),
      ),
    ).toEqual(["Upuszczone-CV.pdf"]);
    await expect(wrap(page, "cv")).not.toHaveClass(/err/);

    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.files.cv.name).toBe("Upuszczone-CV.pdf");
  });

  test("antyspam: za szybka wysyłka i honeypot = udawany sukces bez żądania", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, JOBS_PATH);
    await fillValid(page);
    // bez przesunięcia zegara: szybciej niż MIN_FILL_MS
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(0);

    await page.locator("[data-form-again]").click();
    await fillValid(page);
    await form(page)
      .locator('input[name="firma"]')
      .evaluate((el: HTMLInputElement) => {
        el.focus();
        el.value = "ACME";
      });
    await passFillTime(page);
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(0);
    expect(await readPosts(page)).toEqual([]);
  });

  test("Turnstile: skrypt dopiero po focusie w formularzu, dokładnie jeden", async ({
    page,
  }) => {
    await stubEndpoint(page);
    const turnstile = await stubTurnstile(page);
    await gotoReady(page, JOBS_PATH);
    const scripts = () =>
      page.locator(`script[src^="https://${TURNSTILE_HOST}"]`).count();
    await scrollPageTo(page, 600);
    await scrollPageTo(page, 0);
    expect(await scripts()).toBe(0);
    expect(turnstile.count()).toBe(0);

    // fokus na POLU PLIKU też uzbraja (ktoś może zacząć od załącznika)
    await cvInput(page).focus();
    await expect
      .poll(scripts, { message: "skrypt po pierwszym focusie" })
      .toBe(1);
    expect(
      await page
        .locator(`script[src^="https://${TURNSTILE_HOST}"]`)
        .getAttribute("src"),
    ).toBe(TURNSTILE_SRC);
    await page.locator("#pf-name").focus();
    await page.locator("#pf-message").focus();
    expect(await scripts()).toBe(1);
    expect(turnstile.count()).toBe(1);
  });

  test("stan wysyłania: przycisk wyłączony, aria-busy, etykieta z data-atrybutu", async ({
    page,
  }) => {
    await stubTurnstile(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const endpoint = await stubEndpoint(page, async (route) => {
      await gate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"ok":true}',
      });
    });
    await gotoReady(page, JOBS_PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();
    await expect(submit(page)).toBeDisabled();
    await expect(submit(page)).toHaveText(FORM_COPY.sending);
    await expect(form(page)).toHaveAttribute("aria-busy", "true");
    // ponowna próba w trakcie wysyłki nie tworzy drugiego żądania
    await form(page).evaluate((el: HTMLFormElement) => el.requestSubmit());
    release();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(1);
  });

  test("pola nie zoomują iOS: font-size ≥ 16 px; cele dotykowe; długa nazwa pliku", async ({
    page,
  }) => {
    await gotoReady(page, JOBS_PATH);
    const sizes = await form(page)
      .locator("[data-f] input, [data-f] textarea")
      .evaluateAll((els) =>
        els.map((el) => parseFloat(getComputedStyle(el).fontSize)),
      );
    expect(sizes.length).toBe(5);
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
    const box = await form(page).locator('input[name="future"]').boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
    const zoneBox = await zone(page).boundingBox();
    expect(zoneBox?.height).toBeGreaterThanOrEqual(48);
    expect((await submit(page).boundingBox())?.height).toBeGreaterThanOrEqual(
      48,
    );

    // długa nazwa nie rozpycha strefy (wielokropek), rozmiar zostaje widoczny
    const before = await zone(page).boundingBox();
    await cvInput(page).setInputFiles(
      pdf(`${"Bardzo-dluga-nazwa-pliku-z-zyciorysem-".repeat(4)}2026.pdf`),
    );
    await expect(page.locator("[data-file-size]")).toBeVisible();
    const after = await zone(page).boundingBox();
    expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThan(
      SUBPIXEL_TOL_PX,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const name = await page.locator("[data-file-name]").evaluate((el) => ({
      clipped: el.scrollWidth > el.clientWidth,
      overflow: getComputedStyle(el).textOverflow,
    }));
    expect(name).toEqual({ clipped: true, overflow: "ellipsis" });
  });

  test("fokus z klawiatury na polu pliku pokazuje obrys strefy", async ({
    page,
  }, testInfo) => {
    // WebKit: Tab pomija kontrolki inne niż pola tekstowe (ustawienie
    // systemowe) — kolejność i obrys sprawdzamy na Chromium
    only(testInfo, [DESKTOP, "chromium-pixel-5"], "Tab: profile Chromium");
    await gotoReady(page, JOBS_PATH);
    await page.locator("#pf-message").focus();
    await page.keyboard.press("Tab");
    await expect(cvInput(page)).toBeFocused();
    const outline = await zone(page).evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).toBe("solid");
    expect(outline.width).toBeGreaterThanOrEqual(2);
    await page.keyboard.press("Tab");
    await expect(form(page).locator('input[name="future"]')).toBeFocused();
  });

  test("zero podmiotów trzecich przy wejściu i po przewinięciu", async ({
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
    await gotoReady(page, JOBS_PATH);
    await scrollPageTo(
      page,
      await page.evaluate(() => document.body.scrollHeight),
    );
    await scrollPageTo(page, 0);
    expect(foreign).toEqual([]);
  });

  test("axe: stan wyjściowy, błędy, plik wybrany i potwierdzenie bez naruszeń", async ({
    page,
  }, testInfo) => {
    only(testInfo, A11Y_PROJECTS, "skan a11y: desktop + jeden profil mobilny");
    await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, JOBS_PATH);
    expect(await axeViolations(page)).toEqual([]);

    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "cv")).toHaveClass(/err/);
    expect(await axeViolations(page, "main")).toEqual([]);

    // za duży plik: komunikat z adresem e-mail
    await fillValid(page, pdf("Portfolio.pdf", CV_MAX_BYTES + 1));
    await submit(page).click();
    await expect(wrap(page, "cv-size")).toHaveClass(/err/);
    expect(await axeViolations(page, "main")).toEqual([]);

    await cvInput(page).setInputFiles(pdf());
    await expect(page.locator("[data-file-size]")).toBeVisible();
    expect(await axeViolations(page, "main")).toEqual([]);

    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    // przycisk „kolejne zgłoszenie" ląduje pod kursorem zostawionym na
    // przycisku wysyłki — skan trafiałby w środek przejścia hover
    await page.mouse.move(0, 0);
    await settle(page, 400);
    expect(await axeViolations(page, "main")).toEqual([]);
  });
});
