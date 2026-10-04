// Formularz zapytania przy ofercie (Etap 5B / PR 1,
// docs/analiza-formularze-b.md §4) — stoi w sekcji kontaktu detalu, na
// ciemnym tle: ukryty numer oferty (JEDYNA dana oferty wysyłana przez
// klienta), para kontaktowa (wymagane co najmniej jedno), wiadomość
// z treścią startową, zgoda opcjonalna, antyspam i stany jak w pozostałych
// formularzach; fokus pierwszego błędu i potwierdzenie pod paskiem ORAZ
// paskiem kotwic; pasek dolny (telefon) znika na czas fokusu w formularzu.
// Dane PRODUKCYJNE (`readOffersTyped` + `test.skip` przy zerze ofert),
// media zaślepione. Treść na `chromium-1920`; formularz także na
// `chromium-pixel-5` i `webkit-iphone-14`. Endpoint i Turnstile ZAWSZE
// zaślepione (tests/helpers/forms.ts) — żaden test niczego nie wysyła.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  FORM_ENDPOINT,
  FORM_SCROLL_GAP_PX,
  TURNSTILE_SRC,
} from "../../src/components/forms/form-config";
import {
  FORM_COPY,
  OFERTA_FORM_COPY,
  RESPONSE_TIME,
} from "../../src/components/forms/forms-copy";
import { buildPhoneHref } from "../../src/lib/contact-details";
import { MARKETING_CONSENT } from "../../src/lib/contact-form";
import { DETAIL } from "../../src/lib/offers/offers-ui";
import { listPath, offerPath } from "../../src/lib/offers/urls";
import { POLICY_PATH } from "../../src/lib/routes";
import { DESKTOP_MIN_PX } from "../../src/lib/site-config";
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
import { useMediaStub, usePreviewGuard } from "../helpers/guards";
import { readOffersTyped } from "../helpers/offers";
import { gotoReady, settle } from "../helpers/scroll";

usePreviewGuard();
useMediaStub();

const DESKTOP = "chromium-1920";
const MOBILE_PROJECTS = ["chromium-pixel-5", "webkit-iphone-14"];
const FORM_PROJECTS = [DESKTOP, ...MOBILE_PROJECTS];
const A11Y_PROJECTS = [DESKTOP, "chromium-pixel-5"];
const NO_OFFERS = "brak ofert w data/ (zero ofert = stan dopuszczalny)";
const FIRST = readOffersTyped()[0];
const PATH = FIRST ? offerPath(FIRST) : "/";
const START = OFERTA_FORM_COPY.message.value;
const t = OFERTA_FORM_COPY.frame;

const only = (testInfo: TestInfo, projects: string[], why: string) =>
  test.skip(!projects.includes(testInfo.project.name), why);

const INQUIRY = "[data-offer-inquiry]";
const form = (page: Page) => page.locator('form[data-form="oferta"]');
const wrap = (page: Page, f: string) => form(page).locator(`[data-f="${f}"]`);
const submit = (page: Page) => form(page).locator("[data-form-submit]");
const done = (page: Page) => page.locator(`${INQUIRY} [data-form-done]`);
const srvError = (page: Page) => form(page).locator("[data-form-error]");

/** Poprawne zgłoszenie: imię + telefon; wiadomość zostaje startowa. */
async function fillValid(page: Page): Promise<void> {
  await page.locator("#of-name").fill("Ewa Zielińska");
  await page.locator("#of-phone").fill("600 100 200");
}

/** Odstęp elementu od dołu paska kotwic (który stoi pod stałym paskiem)
 *  i to, czy element mieści się w oknie. */
const placeUnderBars = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const hdr = document.querySelector("[data-nav]")!.getBoundingClientRect();
    const anchors = document
      .querySelector("[data-offer-anchors]")!
      .getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      clear: r.top - Math.max(hdr.bottom, anchors.bottom),
      anchorsUnderHeader: anchors.top - hdr.bottom,
      inView: r.bottom <= window.innerHeight,
    };
  });

async function axeViolations(page: Page, include: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .include(include)
    .analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

test.describe("zapytanie o ofertę: treść i układ (chromium-1920)", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, [DESKTOP], "treść i układ — jeden profil desktopowy");
    test.skip(!FIRST, NO_OFFERS);
  });

  test("formularz w sekcji kontaktu: nazwa z nagłówka sekcji, ukryty numer, pola, zgoda opcjonalna", async ({
    page,
  }) => {
    await gotoReady(page, PATH);
    const box = page.locator(INQUIRY);
    await expect(box).toHaveCount(1);
    await expect(box).toHaveAttribute("id", "formularz");
    await expect(box.locator("[data-form-frame]")).toHaveClass(
      /fm-frame--dark/,
    );
    // formularz nie ma własnego nagłówka — nazywa go `h2` sekcji
    await expect(form(page)).toHaveAttribute("aria-labelledby", "od-h-contact");
    await expect(
      page.getByRole("form", { name: DETAIL.contactHeading }),
    ).toHaveCount(1);
    await expect(page.locator("#od-h-contact")).toHaveText(
      DETAIL.contactHeading,
    );

    // z formularza wychodzi WYŁĄCZNIE numer oferty
    const hidden = form(page).locator('input[type="hidden"]');
    expect(
      await hidden.evaluateAll((els) =>
        els.map((el) => [
          (el as HTMLInputElement).name,
          (el as HTMLInputElement).value,
        ]),
      ),
    ).toEqual([
      ["form", "oferta"],
      ["offer", FIRST!.number],
    ]);
    expect(
      await form(page)
        .locator("[name]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("name"))),
    ).toEqual([
      "form",
      "offer",
      "name",
      "email",
      "phone",
      "message",
      "marketing",
      "firma",
    ]);

    // pola: kolejność, etykiety, autouzupełnianie
    expect(
      await form(page)
        .locator("[data-f] input, [data-f] textarea")
        .evaluateAll((els) => els.map((el) => el.id)),
    ).toEqual(["of-name", "of-email", "of-phone", "of-message"]);
    for (const [id, label, autocomplete] of [
      ["of-name", FORM_COPY.name.label, "name"],
      ["of-email", FORM_COPY.email.label, "email"],
      ["of-phone", FORM_COPY.phone.label, "tel"],
    ] as const) {
      await expect(page.locator(`label[for="${id}"]`)).toHaveText(label);
      await expect(page.locator(`#${id}`)).toHaveAttribute(
        "autocomplete",
        autocomplete,
      );
    }
    await expect(page.locator('label[for="of-message"]')).toHaveText(
      OFERTA_FORM_COPY.message.label,
    );
    // treść startowa wiadomości — bez numeru i tytułu (te niesie mail)
    await expect(page.locator("#of-message")).toHaveValue(START);
    expect(START).not.toContain(FIRST!.number);
    await expect(page.locator("#of-contact-hint")).toHaveText(
      FORM_COPY.contactHint,
    );

    // zgoda D21: opcjonalna, odznaczona; nota z linkiem do polityki
    const consent = form(page).locator('input[name="marketing"]');
    await expect(consent).not.toBeChecked();
    await expect(consent).not.toHaveAttribute("required");
    await expect(form(page).locator(".fm-consent")).toHaveText(
      MARKETING_CONSENT,
    );
    const policy = form(page).locator(".fm-note a");
    await expect(policy).toHaveAttribute("href", POLICY_PATH);
    expect(
      await policy.evaluate((el) => getComputedStyle(el).textDecorationLine),
    ).toContain("underline");
    await expect(form(page).locator(".fm-note")).toContainText(t.purpose);
    await expect(submit(page)).toHaveText(t.submit);

    // pułapka na boty jak w pozostałych formularzach
    const hp = form(page).locator('input[name="firma"]');
    await expect(hp).toHaveAttribute("readonly", "");
    await expect(hp).toHaveAttribute("tabindex", "-1");
    expect(
      await hp.evaluate((el) => getComputedStyle(el.parentElement!).display),
    ).not.toBe("none");

    // kolejność w DOM: karta agenta → formularz → powrót do listy
    const order = await page
      .locator("[data-offer-contact] .od-contact-in > *")
      .evaluateAll((els) => els.map((el) => el.className.split(" ")[0]));
    expect(order).toEqual(["od-contact-col", "od-inquiry", "od-back"]);
    await expect(page.locator("[data-offer-contact] .od-back")).toHaveAttribute(
      "href",
      listPath(FIRST!, { withLocation: false }),
    );
  });

  test("surowy HTML: method/action, komunikaty błędów w HTML, <noscript>, bez hosta Turnstile i bez danych kontaktowych w formularzu", async ({
    request,
  }) => {
    const raw = await (await request.get(PATH)).text();
    const html = raw.slice(
      raw.indexOf('data-form="oferta"'),
      raw.indexOf("od-back", raw.indexOf('data-form="oferta"')),
    );
    expect(html.length).toBeGreaterThan(500);
    const open = raw.slice(
      raw.lastIndexOf("<form", raw.indexOf('data-form="oferta"')),
      raw.indexOf(">", raw.indexOf('data-form="oferta"')),
    );
    expect(open).toContain('method="post"');
    expect(open).toContain(`action="${FORM_ENDPOINT}"`);
    expect(open).not.toContain("novalidate");
    expect(html).toContain(`name="offer" value="${FIRST!.number}"`);
    expect(html).toMatch(/id="of-name"[^>]*required/);
    expect(html).toMatch(/id="of-message"[^>]*required/);
    expect(html).not.toMatch(/name="marketing"[^>]*required/);
    for (const msg of [
      FORM_COPY.errors.name,
      FORM_COPY.errors.contact,
      FORM_COPY.errors.email,
      FORM_COPY.errors.phone,
      FORM_COPY.errors.message,
    ]) {
      expect(html, msg).toContain(msg);
    }
    expect(html).toContain("<noscript>");
    expect(html).toContain(FORM_COPY.noJs);
    expect(raw).not.toContain(TURNSTILE_HOST);
    // sloty telefonu w komunikatach są puste do czasu JS
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("mailto:");
  });

  test("próg 1025: formularz pod kartą agenta ↔ w prawej kolumnie; para pól 1 ↔ 2 kolumny", async ({
    page,
  }) => {
    await gotoReady(page, PATH);
    await expectBreakpointFlip(
      page,
      DESKTOP_MIN_PX,
      { grid: "[data-offer-contact] .od-contact-in" },
      { grid: "flex" },
      { grid: "grid" },
    );
    const layout = () =>
      page.evaluate(() => {
        const box = (sel: string) =>
          document.querySelector(sel)!.getBoundingClientRect();
        const col = box("[data-offer-contact] .od-contact-col");
        const inquiry = box("[data-offer-inquiry]");
        const back = box("[data-offer-contact] .od-back");
        return {
          cols: getComputedStyle(
            document.querySelector("[data-offer-inquiry] .fm-row2")!,
          ).gridTemplateColumns.split(" ").length,
          formRightOfCard: inquiry.left >= col.right,
          formUnderCard: inquiry.top >= col.bottom,
          backUnderForm: back.top >= inquiry.bottom,
          backUnderCard: back.top >= col.bottom && back.left < inquiry.left,
        };
      });
    expect(await layout()).toMatchObject({
      cols: 2,
      formRightOfCard: true,
      backUnderCard: true,
    });
    await page.setViewportSize({ width: DESKTOP_MIN_PX - 1, height: 900 });
    await settle(page, 150);
    expect(await layout()).toMatchObject({
      cols: 1,
      formUnderCard: true,
      backUnderForm: true,
    });
  });
});

test.describe("zapytanie o ofertę: bez JS", () => {
  test.use({ javaScriptEnabled: false });

  test("formularz kompletny, informacja o wymaganym JavaScripcie widoczna", async ({
    page,
  }, testInfo) => {
    only(testInfo, [DESKTOP], "wersja bez JS — jeden profil");
    test.skip(!FIRST, NO_OFFERS);
    await page.goto(PATH);
    await expect(page.locator("#of-name")).toBeVisible();
    await expect(page.locator("#of-message")).toHaveValue(START);
    // silnik tekstowy Playwrighta pomija <noscript> — locator po klasie
    await expect(page.locator(`${INQUIRY} .fm-nojs`)).toBeVisible();
    await expect(form(page)).not.toHaveAttribute("novalidate");
  });
});

test.describe("zapytanie o ofertę: formularz", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    only(testInfo, FORM_PROJECTS, "formularz: desktop + dwa profile mobilne");
    test.skip(!FIRST, NO_OFFERS);
    await recordPosts(page);
    await installClock(page);
  });

  test("brak imienia i kontaktu: komunikaty z HTML, fokus pod paskiem i kotwicami, zero żądań", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, PATH);
    await passFillTime(page);
    await submit(page).click();

    await expect(wrap(page, "name")).toHaveClass(/err/);
    await expect(wrap(page, "contact")).toHaveClass(/err/);
    // wiadomość ma treść startową — nie jest błędem
    await expect(wrap(page, "message")).not.toHaveClass(/err/);
    await expect(wrap(page, "email")).not.toHaveClass(/err/);
    await expect(wrap(page, "name").locator("> [data-msg]")).toHaveText(
      FORM_COPY.errors.name,
    );
    await expect(wrap(page, "contact").locator("> [data-msg]")).toBeVisible();
    await expect(srvError(page)).toBeHidden();

    const name = page.locator("#of-name");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAttribute("aria-describedby", "of-name-err");
    await expect(page.locator("#of-email")).toHaveAttribute(
      "aria-describedby",
      "of-contact-hint of-contact-err",
    );
    // Pole z fokusem (z etykietą) stoi pod stałym paskiem ORAZ pod paskiem
    // kotwic detalu — dosuwa je skrypt, nie przeglądarka (WebKit na
    // Linuksie zostawiał pole pod paskiem — PR #25).
    const place = await placeUnderBars(
      page,
      'form[data-form="oferta"] [data-f="name"]',
    );
    expect(Math.abs(place.anchorsUnderHeader)).toBeLessThanOrEqual(1);
    expect(place.clear).toBeGreaterThanOrEqual(FORM_SCROLL_GAP_PX - 1);
    expect(place.inView).toBe(true);
    expect(endpoint.count()).toBe(0);

    // pisanie gasi błąd pola; wpis w jedno pole pary gasi błąd pary
    await name.fill("E");
    await expect(wrap(page, "name")).not.toHaveClass(/err/);
    await expect(name).not.toHaveAttribute("aria-describedby");
    await page.locator("#of-phone").fill("6");
    await expect(wrap(page, "contact")).not.toHaveClass(/err/);

    // wyczyszczona wiadomość jest błędem pola
    await page.locator("#of-phone").fill("600 100 200");
    await page.locator("#of-message").fill("  ");
    await submit(page).click();
    await expect(wrap(page, "message")).toHaveClass(/err/);
    await expect(page.locator("#of-message")).toBeFocused();
    expect(endpoint.count()).toBe(0);
  });

  test("imię + telefon, bez zgody: jedno żądanie z numerem oferty → potwierdzenie w miejscu formularza", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();

    await expect(done(page)).toBeVisible();
    await expect(form(page)).toBeHidden();
    await expect(page.locator(`${INQUIRY} [data-form-frame]`)).toHaveAttribute(
      "data-state",
      "sent",
    );
    const heading = done(page).locator("[data-done-h]");
    await expect(heading).toHaveText(t.doneHeading);
    await expect(heading).toBeFocused();
    await expect(done(page)).toContainText(RESPONSE_TIME);
    await expect(done(page).locator("a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    // potwierdzenie stoi w oknie, pod paskiem i paskiem kotwic
    const place = await placeUnderBars(
      page,
      `${INQUIRY} [data-form-done] [data-done-h]`,
    );
    expect(place.clear).toBeGreaterThanOrEqual(0);
    expect(place.inView).toBe(true);

    expect(endpoint.count()).toBe(1);
    const [post] = await readPosts(page);
    expect(post.accept).toBe("application/json");
    // komplet pól: nic o ofercie poza numerem (tytuł i adres bierze funkcja
    // z indeksu), bez `marketing`
    expect(Object.keys(post.fields).sort()).toEqual(
      [
        "cf-turnstile-response",
        "elapsed",
        "email",
        "firma",
        "form",
        "message",
        "name",
        "offer",
        "phone",
      ].sort(),
    );
    expect(post.fields).toMatchObject({
      form: "oferta",
      offer: FIRST!.number,
      name: "Ewa Zielińska",
      email: "",
      phone: "600 100 200",
      message: START,
      firma: "",
      "cf-turnstile-response": STUB_TOKEN,
    });

    // „kolejna wiadomość": pola puste, wiadomość wraca do treści startowej
    await done(page).locator("[data-form-again]").click();
    await expect(form(page)).toBeVisible();
    await expect(page.locator("#of-name")).toHaveValue("");
    await expect(page.locator("#of-phone")).toHaveValue("");
    await expect(page.locator("#of-message")).toHaveValue(START);
    await expect(page.locator("#of-name")).toBeFocused();
  });

  test("e-mail + zgoda + własna treść: żądanie niesie marketing i zmienioną wiadomość", async ({
    page,
  }) => {
    await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, PATH);
    await page.locator("#of-name").fill("Jan Kowalski");
    await page.locator("#of-email").fill("jan@example.com");
    await page.locator("#of-message").fill("Czy cena jest do negocjacji?");
    await form(page).locator('input[name="marketing"]').check();
    await passFillTime(page);
    await submit(page).click();
    await expect(done(page)).toBeVisible();
    const [post] = await readPosts(page);
    expect(post.fields).toMatchObject({
      form: "oferta",
      offer: FIRST!.number,
      email: "jan@example.com",
      phone: "",
      message: "Czy cena jest do negocjacji?",
      marketing: "1",
    });
  });

  test("antyspam: za szybka wysyłka i honeypot = udawany sukces bez żądania", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, PATH);
    await fillValid(page);
    // bez przesunięcia zegara: szybciej niż minimalny czas wypełnienia
    await submit(page).click();
    await expect(done(page)).toBeVisible();
    expect(endpoint.count()).toBe(0);

    await done(page).locator("[data-form-again]").click();
    await fillValid(page);
    await form(page)
      .locator('input[name="firma"]')
      .evaluate((el: HTMLInputElement) => {
        el.focus();
        el.value = "ACME";
      });
    await passFillTime(page);
    await submit(page).click();
    await expect(done(page)).toBeVisible();
    expect(endpoint.count()).toBe(0);
    expect(await readPosts(page)).toEqual([]);
  });

  test("Turnstile: brak skryptu przy wejściu i po przewinięciu do formularza; po focusie dokładnie jeden", async ({
    page,
  }) => {
    await stubEndpoint(page);
    const turnstile = await stubTurnstile(page);
    await gotoReady(page, PATH);
    const scripts = () =>
      page.locator(`script[src^="https://${TURNSTILE_HOST}"]`).count();
    await page.locator(INQUIRY).scrollIntoViewIfNeeded();
    await settle(page, 300);
    expect(await scripts()).toBe(0);
    expect(turnstile.count()).toBe(0);

    await page.locator("#of-name").focus();
    await expect
      .poll(scripts, { message: "skrypt po pierwszym focusie" })
      .toBe(1);
    expect(
      await page
        .locator(`script[src^="https://${TURNSTILE_HOST}"]`)
        .getAttribute("src"),
    ).toBe(TURNSTILE_SRC);
    await page.locator("#of-message").focus();
    expect(await scripts()).toBe(1);
    expect(turnstile.count()).toBe(1);
  });

  test("odpowiedzi serwera: 400 z polem zapala .err; 400 `offer` (pole bez opakowania), 500 i brak sieci → komunikat błędu ze slotem telefonu", async ({
    page,
  }) => {
    await stubTurnstile(page);
    await stubEndpoint(page, {
      status: 400,
      body: { ok: false, error: "fields", fields: ["email"] },
    });
    await gotoReady(page, PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "email")).toHaveClass(/err/);
    await expect(page.locator("#of-email")).toBeFocused();
    await expect(srvError(page)).toBeHidden();
    await expect(submit(page)).toBeEnabled();

    // numer odrzucony przez serwer: nie ma pola, które mogłoby się zapalić
    // — użytkownik MUSI zobaczyć komunikat błędu wysyłki
    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, {
      status: 400,
      body: { ok: false, error: "fields", fields: ["offer"] },
    });
    await submit(page).click();
    await expect(srvError(page)).toBeVisible();
    await expect(srvError(page)).toHaveAttribute("role", "alert");
    await expect(srvError(page)).toContainText(t.serverError);
    await expect(srvError(page).locator("a[data-tel]")).toHaveAttribute(
      "href",
      buildPhoneHref(),
    );
    await expect(wrap(page, "email")).not.toHaveClass(/err/);
    await expect(done(page)).toBeHidden();

    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, { status: 500 });
    await submit(page).click();
    await expect(srvError(page)).toBeVisible();

    await page.unroute(`**${FORM_ENDPOINT}`);
    await stubEndpoint(page, (route) => route.abort());
    await submit(page).click();
    await expect(srvError(page)).toBeVisible();
    await expect(page.locator("#of-name")).toHaveValue("Ewa Zielińska");
    await expect(submit(page)).toBeEnabled();
    await expect(submit(page)).toHaveText(t.submit);
  });

  test("numer oferty zepsuty w DOM: walidacja kliencka → komunikat błędu, zero żądań", async ({
    page,
  }) => {
    const endpoint = await stubEndpoint(page);
    await gotoReady(page, PATH);
    await fillValid(page);
    await form(page)
      .locator('input[name="offer"]')
      .evaluate((el: HTMLInputElement) => (el.value = "nie numer"));
    await passFillTime(page);
    await submit(page).click();
    await expect(srvError(page)).toBeVisible();
    await expect(done(page)).toBeHidden();
    expect(endpoint.count()).toBe(0);
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
    await gotoReady(page, PATH);
    await fillValid(page);
    await passFillTime(page);
    await submit(page).click();
    await expect(submit(page)).toBeDisabled();
    await expect(submit(page)).toHaveText(FORM_COPY.sending);
    await expect(form(page)).toHaveAttribute("aria-busy", "true");
    release();
    await expect(done(page)).toBeVisible();
  });

  test("pola nie zoomują iOS: font-size ≥ 16 px; cel checkboxa ≥ 24 px; przycisk ≥ 48 px", async ({
    page,
  }) => {
    await gotoReady(page, PATH);
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
    expect((await submit(page).boundingBox())?.height).toBeGreaterThanOrEqual(
      48,
    );
  });

  test("axe: stan wyjściowy, stan błędów i potwierdzenie bez naruszeń (sekcja kontaktu)", async ({
    page,
  }, testInfo) => {
    only(testInfo, A11Y_PROJECTS, "skan a11y: desktop + jeden profil mobilny");
    await stubEndpoint(page);
    await stubTurnstile(page);
    await gotoReady(page, PATH);
    await page.locator(INQUIRY).scrollIntoViewIfNeeded();
    await settle(page, 300);
    expect(await axeViolations(page, "[data-offer-contact]")).toEqual([]);

    await passFillTime(page);
    await submit(page).click();
    await expect(wrap(page, "name")).toHaveClass(/err/);
    expect(await axeViolations(page, "[data-offer-contact]")).toEqual([]);

    await fillValid(page);
    await submit(page).click();
    await expect(done(page)).toBeVisible();
    // kursor zostaje na miejscu przycisku wysyłki — nowy element pod nim
    // byłby skanowany w środku przejścia hover (kolory pośrednie)
    await page.mouse.move(0, 0);
    await settle(page, 400);
    expect(await axeViolations(page, "[data-offer-contact]")).toEqual([]);
  });
});

test.describe("zapytanie o ofertę: pasek dolny (pixel-5, iphone-14)", () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    only(testInfo, MOBILE_PROJECTS, "pasek dolny — profile mobilne");
    test.skip(!FIRST, NO_OFFERS);
  });

  test("„Napisz” z paska prowadzi do sekcji kontaktu; pasek znika na czas fokusu w formularzu i wraca po wyjściu", async ({
    page,
  }) => {
    await gotoReady(page, PATH);
    const bar = page.locator("[data-offer-bar]");
    await expect(bar).toBeVisible();
    await bar.locator('a[href="#kontakt"]').click();
    await expect(page).toHaveURL(/#kontakt$/);
    // sekcja kontaktu ląduje pod paskiem i paskiem kotwic (poll — skok
    // kotwicy bywa dosuwany po zmianie wysokości paska)
    await expect
      .poll(async () => {
        const p = await placeUnderBars(page, "#kontakt");
        return Math.round(p.clear);
      })
      .toBeGreaterThanOrEqual(0);
    await expect(page.locator("#od-h-contact")).toBeInViewport();

    await page.locator("#of-name").focus();
    await expect(bar).toBeHidden();
    await page.locator("#of-message").focus();
    await expect(bar).toBeHidden();
    await submit(page).focus();
    await expect(bar).toBeHidden();
    // wyjście z formularza (link powrotu stoi w DOM tuż za nim)
    await page.locator("[data-offer-contact] .od-back").focus();
    await expect(bar).toBeVisible();
  });
});
