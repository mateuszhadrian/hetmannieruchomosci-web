// /kontakt/ + wspólna mechanika formularzy (Etap 5A,
// docs/analiza-formularze-a.md §5): wstęp, mapa w naturalnych proporcjach
// z kartą danych POD mapą, sloty antyscrapingowe, formularz „Napisz do
// nas" — dwa osobne pola kontaktowe (wymagane co najmniej jedno), brak
// wymuszonego checkboxa, antyspam (honeypot, czas, Turnstile dopiero po
// focusie), stany wysyłki, wersja bez JS, zero podmiotów trzecich, axe.
// Treść na `chromium-1920`; formularz także na `chromium-pixel-5`
// i `webkit-iphone-14`. Endpoint i Turnstile ZAWSZE zaślepione
// (tests/helpers/forms.ts) — żaden test niczego nie wysyła.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  FORM_ENDPOINT,
  TURNSTILE_SRC,
} from "../../src/components/forms/form-config";
import {
  FORM_COPY,
  KONTAKT_FORM_COPY,
  RESPONSE_TIME,
} from "../../src/components/forms/forms-copy";
import {
  CONTACT_DESKTOP_MIN_PX,
  CONTACT_MAP_SWAP_PX,
  OFFICE_MAPS_URL,
} from "../../src/components/sections/contact/contact-config";
import { CONTACT_COPY } from "../../src/components/sections/contact/contact-copy";
import { MARKETING_CONSENT, MIN_FILL_MS } from "../../src/lib/contact-form";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";
import { ui } from "../../src/i18n/ui";
import { BUSINESS } from "../../src/lib/jsonld";
import { CONTACT_PATH, POLICY_PATH } from "../../src/lib/routes";
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

const DESKTOP = "chromium-1920";
const FORM_PROJECTS = [DESKTOP, "chromium-pixel-5", "webkit-iphone-14"];
const A11Y_PROJECTS = [DESKTOP, "chromium-pixel-5"];
const SUBPIXEL_TOL_PX = 0.5;

const only = (testInfo: TestInfo, projects: string[], why: string) =>
  test.skip(!projects.includes(testInfo.project.name), why);

const form = (page: Page) => page.locator('form[data-form="kontakt"]');
const wrap = (page: Page, f: string) => form(page).locator(`[data-f="${f}"]`);
const submit = (page: Page) => page.locator("[data-form-submit]");

/** Wypełnia poprawne zgłoszenie (sam e-mail, bez zgody). */
async function fillValid(page: Page): Promise<void> {
  await page.locator("#kf-name").fill("Anna Nowak");
  await page.locator("#kf-email").fill("anna@example.com");
  await page.locator("#kf-message").fill("Proszę o kontakt.");
}

async function axeViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.describe("kontakt: treść i układ", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, [DESKTOP], "treść niezależna od profilu");
  });

  test("wstęp i nagłówek formularza z contact-copy / forms-copy", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    await expect(page).toHaveTitle(ui.pl["contactPage.title"]);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveText(
      `${CONTACT_COPY.title} ${CONTACT_COPY.accent}`,
    );
    await expect(page.locator("main .sx-eyebrow")).toHaveText(
      CONTACT_COPY.eyebrow,
    );
    await expect(
      page.locator("main").getByText(CONTACT_COPY.lead),
    ).toBeVisible();
    const section = page.locator("section#formularz");
    await expect(section.locator("h2")).toHaveText(KONTAKT_FORM_COPY.heading);
    await expect(section).toHaveAttribute(
      "aria-labelledby",
      (await section.locator("h2").getAttribute("id")) ?? "",
    );
    await expect(section.getByText(KONTAKT_FORM_COPY.lead)).toBeVisible();
  });

  test("mapa: <picture> z progiem 600 px, naturalne proporcje, karta POD mapą", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    const map = page.locator("[data-contact-map]");
    await expect(map).toHaveAttribute("href", OFFICE_MAPS_URL);
    await expect(map).toHaveAttribute("target", "_blank");
    await expect(map).toHaveAttribute("rel", /noopener/);
    await expect(map).toContainText(CONTACT_COPY.mapLink);
    expect(OFFICE_MAPS_URL).toContain(encodeURIComponent(BUSINESS.street));

    const source = map.locator("picture source");
    await expect(source).toHaveAttribute(
      "media",
      `(min-width: ${CONTACT_MAP_SWAP_PX}px)`,
    );
    await expect(source).toHaveAttribute("srcset", /mapa-kontakt-desktop/);
    await expect(source).toHaveAttribute("width", "1206");
    await expect(source).toHaveAttribute("height", "838");
    const img = map.locator("img");
    await expect(img).toHaveAttribute("src", /mapa-kontakt-mobile/);
    await expect(img).toHaveAttribute("width", "880");
    await expect(img).toHaveAttribute("height", "694");
    await expect(img).toHaveAttribute("alt", CONTACT_COPY.mapAlt);

    // Atrybucja jest wypalona przy dolnej krawędzi obrazu: obraz nie może
    // być kadrowany (proporcje na ekranie = proporcje pliku), a karta
    // danych nie może na niego nachodzić. Pomiar sub-pikselowy.
    const height = page.viewportSize()?.height ?? 900;
    for (const width of [1920, CONTACT_DESKTOP_MIN_PX, 900, 600, 599, 390]) {
      await page.setViewportSize({ width, height });
      await settle(page, 200);
      const m = await page.evaluate(() => {
        const image = document.querySelector<HTMLImageElement>(
          "[data-contact-map] img",
        )!;
        const card = document.querySelector("[data-contact-card]")!;
        const r = image.getBoundingClientRect();
        return {
          ratio: r.width / r.height,
          natural: image.naturalWidth / image.naturalHeight,
          fit: getComputedStyle(image).objectFit,
          src: image.currentSrc,
          mapBottom: r.bottom,
          cardTop: card.getBoundingClientRect().top,
          radius: getComputedStyle(image.closest("a")!).borderBottomLeftRadius,
        };
      });
      expect(m.src, `plik przy ${width} px`).toContain(
        width >= CONTACT_MAP_SWAP_PX
          ? "mapa-kontakt-desktop"
          : "mapa-kontakt-mobile",
      );
      expect(
        Math.abs(m.ratio - m.natural),
        `proporcje przy ${width} px`,
      ).toBeLessThan(0.005);
      expect(m.fit, `object-fit przy ${width} px`).not.toBe("cover");
      expect(m.radius, `promień mapy przy ${width} px`).toBe("0px");
      expect(m.cardTop, `karta pod mapą przy ${width} px`).toBeGreaterThan(
        m.mapBottom - SUBPIXEL_TOL_PX,
      );
    }
  });

  test("sloty: surowy <main> bez telefonu i e-maila; po JS tel: i mailto:", async ({
    page,
  }) => {
    const raw = await (await page.request.get(CONTACT_PATH)).text();
    const main = raw.slice(raw.indexOf("<main"), raw.indexOf("</main>"));
    expect(main.length).toBeGreaterThan(1000);
    const digits = buildPhoneHref().replace(/\D/g, "");
    expect(main.replace(/[\s-]/g, "")).not.toContain(digits.slice(2));
    expect(main).not.toContain(buildEmail("biuro"));
    expect(main).not.toContain("tel:");
    expect(main).not.toContain("mailto:");
    // puste kotwice slotów niosą <span data-slot> (lint anchor-has-content)
    expect(
      main.match(/<a[^>]*data-(tel|mail)[^>]*hidden[^>]*>\s*<span data-slot/g)
        ?.length,
    ).toBe(4);

    await gotoReady(page, CONTACT_PATH);
    const card = page.locator("[data-contact-card]");
    const tel = card.locator("a[data-tel]");
    await expect(tel).toBeVisible();
    await expect(tel).toHaveAttribute("href", buildPhoneHref());
    await expect(tel).toHaveText(buildPhoneDisplay());
    const mail = card.locator('a[data-mail="biuro"]');
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute("href", `mailto:${buildEmail("biuro")}`);
    await expect(card).toContainText(BUSINESS.street);
    await expect(card).toContainText(
      `${BUSINESS.postalCode} ${BUSINESS.locality}`,
    );
    await expect(card).toContainText(CONTACT_COPY.hoursTime);
    // karta ma JEDEN adres — biuro; siedziba zostaje w stopce
    await expect(card).not.toContainText(BUSINESS.seatLocality);
  });

  test("pola: etykiety, autouzupełnianie, zgoda opcjonalna, pułapka", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    const fields = [
      { id: "kf-name", label: FORM_COPY.name.label, ac: "name", type: "text" },
      {
        id: "kf-email",
        label: FORM_COPY.email.label,
        ac: "email",
        type: "email",
      },
      { id: "kf-phone", label: FORM_COPY.phone.label, ac: "tel", type: "tel" },
    ];
    for (const f of fields) {
      await expect(page.locator(`label[for="${f.id}"]`)).toHaveText(f.label);
      const input = page.locator(`#${f.id}`);
      await expect(input).toHaveAttribute("autocomplete", f.ac);
      await expect(input).toHaveAttribute("type", f.type);
    }
    await expect(page.locator('label[for="kf-message"]')).toHaveText(
      KONTAKT_FORM_COPY.message.label,
    );
    await expect(page.locator("textarea#kf-message")).toBeVisible();
    // kolejność: E-mail przed Telefonem (jedna dla wszystkich formularzy)
    expect(
      await form(page)
        .locator("[data-f] input, [data-f] textarea")
        .evaluateAll((els) => els.map((el) => el.id)),
    ).toEqual(["kf-name", "kf-email", "kf-phone", "kf-message"]);
    await expect(form(page).getByText(FORM_COPY.contactHint)).toBeVisible();
    // pola pary NIE są wymagane pojedynczo
    await expect(page.locator("#kf-email")).not.toHaveAttribute("required");
    await expect(page.locator("#kf-phone")).not.toHaveAttribute("required");

    // zgoda: prawdziwy checkbox w <label>, odznaczony, nigdy wymagany
    const consent = form(page).locator(
      'input[type="checkbox"][name="marketing"]',
    );
    await expect(consent).toHaveCount(1);
    await expect(consent).not.toBeChecked();
    await expect(consent).not.toHaveAttribute("required");
    await expect(form(page).locator("label.fm-consent")).toHaveText(
      MARKETING_CONSENT,
    );
    await form(page).locator("label.fm-consent span").click();
    await expect(consent).toBeChecked();
    expect(MARKETING_CONSENT).not.toContain("*");

    // kolejność bloku końcowego: zgoda → nota → przycisk
    const order = await form(page).evaluate((el) => {
      const top = (sel: string) =>
        el.querySelector(sel)!.getBoundingClientRect().top;
      return [top(".fm-consent"), top(".fm-note"), top("[data-form-submit]")];
    });
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const policy = form(page).locator(".fm-note a");
    await expect(policy).toHaveAttribute("href", POLICY_PATH);
    await expect(policy).toHaveText(FORM_COPY.policyLink);
    expect(
      await policy.evaluate((a) => getComputedStyle(a).textDecorationLine),
    ).toContain("underline");
    expect((await page.request.get(POLICY_PATH)).status()).toBe(200);
    await expect(submit(page)).toHaveText(KONTAKT_FORM_COPY.frame.submit);

    // pułapka: readonly, poza Tab, ukryta wizualnie — nie display:none
    const hp = form(page).locator('input[name="firma"]');
    await expect(hp).toHaveAttribute("readonly", "");
    await expect(hp).toHaveAttribute("tabindex", "-1");
    const hpBox = await hp.evaluate((el) => {
      const box = el.closest(".fm-hp")!;
      return {
        display: getComputedStyle(box).display,
        left: box.getBoundingClientRect().right,
      };
    });
    expect(hpBox.display).not.toBe("none");
    expect(hpBox.left).toBeLessThan(0);
  });

  test("próg 1025: jedna kolumna ↔ dwie; para pól w wierszu", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    await expectBreakpointFlip(
      page,
      CONTACT_DESKTOP_MIN_PX,
      { grid: "[data-contact-grid]", sub: ".ki-sub" },
      { grid: "block", sub: "contents" },
      { grid: "grid", sub: "grid" },
    );
    const cols = () =>
      page
        .locator(".fm-row2")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        );
    expect(await cols()).toBe(2);
    await page.setViewportSize({
      width: CONTACT_DESKTOP_MIN_PX - 1,
      height: 900,
    });
    await settle(page, 150);
    expect(await cols()).toBe(1);
  });

  test("bez JS (surowy HTML): komplet pól, method/action, <noscript>", async ({
    page,
  }) => {
    const raw = await (await page.request.get(CONTACT_PATH)).text();
    expect(raw).toMatch(
      new RegExp(
        `<form[^>]*data-form="kontakt"[^>]*method="post"[^>]*action="${FORM_ENDPOINT}"`,
      ),
    );
    expect(raw).toContain('<input type="hidden" name="form" value="kontakt"');
    for (const name of ["name", "email", "phone", "message", "marketing"]) {
      expect(raw, name).toContain(`name="${name}"`);
    }
    // semantyka pól wymaganych zostaje w HTML (dymki natywne bez JS)
    expect(raw).toMatch(/<input[^>]*id="kf-name"[^>]*required/);
    expect(raw).toMatch(/<textarea[^>]*id="kf-message"[^>]*required/);
    expect(raw).not.toContain("novalidate");
    expect(raw).toContain(`<noscript><p class="fm-nojs">${FORM_COPY.noJs}`);
    expect(raw).toContain(CONTACT_COPY.noJs);
    // komunikaty błędów siedzą w HTML (pokazuje je CSS przy .err)
    for (const message of [
      FORM_COPY.errors.name,
      FORM_COPY.errors.contact,
      FORM_COPY.errors.email,
      FORM_COPY.errors.phone,
      FORM_COPY.errors.message,
    ]) {
      expect(raw, message).toContain(message);
    }
    // Turnstile: w HTML nie ma skryptu ani adresu dostawcy
    expect(raw).not.toContain(TURNSTILE_HOST);
  });
});

test.describe("kontakt: bez JS", () => {
  test.use({ javaScriptEnabled: false });

  test("formularz kompletny, wiersze slotów ukryte, informacja widoczna", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "wersja bez JS niezależna od profilu");
    await page.goto(CONTACT_PATH);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(form(page)).toBeVisible();
    await expect(page.locator("#kf-name")).toBeVisible();
    // locator po klasie: silnik tekstowy Playwrighta pomija <noscript>
    await expect(form(page).locator(".fm-nojs")).toBeVisible();
    await expect(form(page).locator(".fm-nojs")).toHaveText(FORM_COPY.noJs);
    const card = page.locator("[data-contact-card]");
    await expect(card.locator(".ki-row--tel")).toBeHidden();
    await expect(card.locator(".ki-row--mail")).toBeHidden();
    await expect(card.locator(".ki-nojs")).toBeVisible();
    await expect(card.locator(".ki-nojs")).toHaveText(CONTACT_COPY.noJs);
    await expect(card).toContainText(BUSINESS.street);
    await expect(page.locator("[data-form-done]")).toBeHidden();
  });
});

test.describe("kontakt: formularz", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "formularz: desktop + dwa profile mobilne");
    await recordPosts(page);
    await installClock(page);
  });

  test("pusta wysyłka: komunikaty z HTML, fokus na pierwszym polu, zero żądań", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, CONTACT_PATH);
    // przed próbą komunikaty są ukryte, a pola nie niosą ich w opisie
    for (const f of ["name", "contact", "message"]) {
      await expect(wrap(page, f).locator("> [data-msg]")).toBeHidden();
    }
    await passFillTime(page);
    await submit(page).click();

    await expect(wrap(page, "name")).toHaveClass(/err/);
    await expect(wrap(page, "contact")).toHaveClass(/err/);
    await expect(wrap(page, "message")).toHaveClass(/err/);
    await expect(wrap(page, "email")).not.toHaveClass(/err/);
    await expect(wrap(page, "phone")).not.toHaveClass(/err/);
    await expect(wrap(page, "name").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.name,
    );
    await expect(wrap(page, "contact").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.contact,
    );
    await expect(wrap(page, "contact").locator("> [data-msg]")).toBeVisible();
    await expect(wrap(page, "message").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.message,
    );
    await expect(wrap(page, "email").locator("> [data-msg]")).toBeHidden();

    const name = page.locator("#kf-name");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAttribute("aria-describedby", "kf-name-err");
    // pola pary: podpowiedź + komunikat pary
    await expect(page.locator("#kf-email")).toHaveAttribute(
      "aria-describedby",
      "kf-contact-hint kf-contact-err",
    );
    // pole z fokusem nie chowa się pod stałym paskiem
    const clear = await name.evaluate((el) => {
      const hdr = document.querySelector("[data-nav]")!;
      return (
        el.getBoundingClientRect().top - hdr.getBoundingClientRect().bottom
      );
    });
    expect(clear).toBeGreaterThan(0);

    expect(endpoint.count()).toBe(0);
    await expect(page.locator("[data-form-done]")).toBeHidden();

    // pisanie gasi błąd pola; wpis w jedno pole pary gasi błąd pary
    await name.fill("A");
    await expect(wrap(page, "name")).not.toHaveClass(/err/);
    await expect(name).toHaveAttribute("aria-invalid", "false");
    await expect(name).not.toHaveAttribute("aria-describedby");
    await page.locator("#kf-phone").fill("6");
    await expect(wrap(page, "contact")).not.toHaveClass(/err/);
    await expect(page.locator("#kf-email")).toHaveAttribute(
      "aria-describedby",
      "kf-contact-hint",
    );
    await expect(wrap(page, "message")).toHaveClass(/err/);
  });

  test("błędny e-mail / telefon: błąd POLA, nie pary", async ({ page }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, CONTACT_PATH);
    await fillValid(page);
    await page.locator("#kf-email").fill("anna@x");
    await page.locator("#kf-phone").fill("600 100 200");
    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "email")).toHaveClass(/err/);
    await expect(wrap(page, "email").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.email,
    );
    await expect(wrap(page, "contact")).not.toHaveClass(/err/);
    await expect(page.locator("#kf-email")).toBeFocused();

    await page.locator("#kf-email").fill("");
    await page.locator("#kf-phone").fill("12345");
    await submit(page).click();
    await expect(wrap(page, "phone")).toHaveClass(/err/);
    await expect(wrap(page, "phone").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.phone,
    );
    expect(endpoint.count()).toBe(0);
  });

  test("sam e-mail, bez zgody: wysyłka → potwierdzenie w miejscu formularza", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, CONTACT_PATH);
    await fillValid(page);
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
    await expect(heading).toHaveText(KONTAKT_FORM_COPY.frame.doneHeading);
    await expect(heading).toBeFocused();
    await expect(done).toContainText(RESPONSE_TIME);
    await expect(done.locator("a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    // potwierdzenie stoi w oknie, pod stałym paskiem
    const top = await heading.evaluate((el) => {
      const hdr = document.querySelector("[data-nav]")!;
      const r = el.getBoundingClientRect();
      return {
        below: r.top - hdr.getBoundingClientRect().bottom,
        inView: r.bottom < window.innerHeight,
      };
    });
    expect(top.below).toBeGreaterThanOrEqual(0);
    expect(top.inView).toBe(true);

    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.accept).toBe("application/json");
    expect(post.fields).toMatchObject({
      form: "kontakt",
      name: "Anna Nowak",
      email: "anna@example.com",
      phone: "",
      message: "Proszę o kontakt.",
      firma: "",
      "cf-turnstile-response": STUB_TOKEN,
    });
    // brak wymuszonego checkboxa: niezaznaczona zgoda nie jedzie wcale
    expect(post.fields).not.toHaveProperty("marketing");
    expect(Number(post.fields.elapsed)).toBeGreaterThanOrEqual(MIN_FILL_MS);

    // „kolejna wiadomość": pusty formularz, zegar od nowa
    await done.locator("[data-form-again]").click();
    await expect(form(page)).toBeVisible();
    await expect(done).toBeHidden();
    await expect(page.locator("#kf-name")).toHaveValue("");
    await expect(page.locator("#kf-name")).toBeFocused();
    await expect(page.locator("[data-form-frame]")).toHaveAttribute(
      "data-state",
      "form",
    );
  });

  test("sam telefon + zgoda: wysyłka niesie marketing", async ({ page }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, CONTACT_PATH);
    await page.locator("#kf-name").fill("Jan Kowalski");
    await page.locator("#kf-phone").fill("+48 600 100 200");
    await page.locator("#kf-message").fill("Proszę o telefon.");
    await form(page).locator('input[name="marketing"]').check();
    await passFillTime(page);
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.fields).toMatchObject({
      email: "",
      phone: "+48 600 100 200",
      marketing: "1",
    });
  });

  test("antyspam: za szybka wysyłka i honeypot = udawany sukces bez żądania", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, CONTACT_PATH);
    await fillValid(page);
    // bez przesunięcia zegara: szybciej niż MIN_FILL_MS
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(endpoint.count()).toBe(0);

    // po „kolejnej" zegar startuje od nowa; honeypot wypełniony po czasie
    await page.locator("[data-form-again]").click();
    await fillValid(page);
    await form(page)
      .locator('input[name="firma"]')
      .evaluate((el: HTMLInputElement) => {
        el.focus(); // focus zdejmuje readonly — bot „piszący" się łapie
        el.value = "ACME";
      });
    await expect(form(page).locator('input[name="firma"]')).not.toHaveAttribute(
      "readonly",
    );
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
    await gotoReady(page, CONTACT_PATH);
    const scripts = () =>
      page.locator(`script[src^="https://${TURNSTILE_HOST}"]`).count();
    await scrollPageTo(page, 600);
    await scrollPageTo(page, 0);
    expect(await scripts()).toBe(0);
    expect(turnstile.count()).toBe(0);

    await page.locator("#kf-name").focus();
    await expect
      .poll(scripts, { message: "skrypt po pierwszym focusie" })
      .toBe(1);
    expect(
      await page
        .locator(`script[src^="https://${TURNSTILE_HOST}"]`)
        .getAttribute("src"),
    ).toBe(TURNSTILE_SRC);
    await page.locator("#kf-message").focus();
    await page.locator("#kf-email").focus();
    expect(await scripts()).toBe(1);
    expect(turnstile.count()).toBe(1);
  });

  test("Turnstile zablokowany: pusty token → odmowa serwera → komunikat błędu", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page, {
      status: 403,
      body: { ok: false, error: "turnstile" },
    });
    await stubTurnstile(page, "blocked");
    await gotoReady(page, CONTACT_PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();

    const error = page.locator("[data-form-error]");
    await expect(error).toBeVisible();
    await expect(error).toContainText(KONTAKT_FORM_COPY.frame.serverError);
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error.locator("a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.fields["cf-turnstile-response"]).toBe("");
    // dane zostają, przycisk znów aktywny
    await expect(page.locator("#kf-name")).toHaveValue("Anna Nowak");
    await expect(submit(page)).toBeEnabled();
    await expect(submit(page)).toHaveText(KONTAKT_FORM_COPY.frame.submit);
    await expect(page.locator("[data-form-done]")).toBeHidden();
  });

  test("odpowiedzi serwera: 400 z polami zapala .err; 500 i brak sieci → błąd", async ({
    page,
  }) => {
    await stubTurnstile(page);
    await stubEndpoint(page, {
      status: 400,
      body: { ok: false, error: "fields", fields: ["phone"] },
    });
    await gotoReady(page, CONTACT_PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "phone")).toHaveClass(/err/);
    await expect(page.locator("#kf-phone")).toBeFocused();
    await expect(page.locator("[data-form-error]")).toBeHidden();
    await expect(submit(page)).toBeEnabled();

    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, { status: 500 });
    await submit(page).click();
    await expect(page.locator("[data-form-error]")).toBeVisible();
    await expect(wrap(page, "phone")).not.toHaveClass(/err/);

    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, (route) => route.abort());
    await submit(page).click();
    await expect(page.locator("[data-form-error]")).toBeVisible();
    await expect(page.locator("#kf-message")).toHaveValue("Proszę o kontakt.");
    await expect(page.locator("[data-form-done]")).toBeHidden();
  });

  test("stan wysyłania: przycisk wyłączony, aria-busy, etykieta z data-atrybutu", async ({
    page,
  }) => {
    await stubTurnstile(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    await stubEndpoint(page, async (route) => {
      await gate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: '{"ok":true}',
      });
    });
    await gotoReady(page, CONTACT_PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();
    await expect(submit(page)).toBeDisabled();
    await expect(submit(page)).toHaveText(FORM_COPY.sending);
    await expect(form(page)).toHaveAttribute("aria-busy", "true");
    release();
    await expect(page.locator("[data-form-done]")).toBeVisible();
  });

  test("pola nie zoomują iOS: font-size ≥ 16 px; cele dotykowe", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    const sizes = await form(page)
      .locator("[data-f] input, [data-f] textarea")
      .evaluateAll((els) =>
        els.map((el) => parseFloat(getComputedStyle(el).fontSize)),
      );
    expect(sizes.length).toBe(4);
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
    const box = await form(page)
      .locator('input[name="marketing"]')
      .boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
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
    await gotoReady(page, CONTACT_PATH);
    await scrollPageTo(
      page,
      await page.evaluate(() => document.body.scrollHeight),
    );
    await scrollPageTo(page, 0);
    expect(foreign).toEqual([]);
  });

  test("axe: stan wyjściowy, stan błędów i potwierdzenie bez naruszeń", async ({
    page,
  }, testInfo) => {
    only(testInfo, A11Y_PROJECTS, "skan a11y: desktop + jeden profil mobilny");
    await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, CONTACT_PATH);
    expect(await axeViolations(page)).toEqual([]);

    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "name")).toHaveClass(/err/);
    expect(await axeViolations(page, "main")).toEqual([]);

    await fillValid(page);
    await submit(page).click();
    await expect(page.locator("[data-form-done]")).toBeVisible();
    expect(await axeViolations(page, "main")).toEqual([]);
  });
});
