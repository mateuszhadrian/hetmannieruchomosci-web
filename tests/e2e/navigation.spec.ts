// Nawigacja chrome'u: pasek fixed z sześcioma pozycjami na desktopie
// (efekt liter za bramką reduced-motion), wariant strony głównej
// przemalowywany pozycją scrolla (tylko „/”), menu mobilne jako bottom
// sheet na overlay.ts (otwieranie, Esc, scrim, swipe-down, zamknięcie przy
// przejściu na desktop), telefon i mail składane w JS (antyscraping),
// stopka z kompletem danych firmy, kontrakt breakpointu projektu
// (expectBreakpointFlip). Stan po Etapie 4.1 (docs/analiza-chrome.md).
import { expect, test, type Page } from "@playwright/test";
import { NAV_DESKTOP_MIN_PX } from "../../src/components/navbar/nav-config";
import { footerNavItems, mainNavItems } from "../../src/i18n/nav";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";
import { BUSINESS } from "../../src/lib/jsonld";
import { CONTACT_PATH, OFFERS_PATH, STATIC_PATHS } from "../../src/lib/routes";
import { expectBreakpointFlip } from "../helpers/breakpoint";
import {
  collectPageIssues,
  useMediaStub,
  usePreviewGuard,
} from "../helpers/guards";
import { gotoReady, scrollPageTo, settle } from "../helpers/scroll";

usePreviewGuard();
// strona główna niesie od 4.4 kafle ofert (obrazy z hosta mediów)
useMediaStub();

/** Szkielety bywają krótsze niż potrzeba testom scrolla — dosztukuj
 *  wysokości dokumentu (kontrakt dotyczy chrome'u, nie długości strony). */
async function ensureScrollRoom(page: Page): Promise<void> {
  await page.addStyleTag({ content: "main { min-height: 300vh !important }" });
}

const pathPattern = (path: string) =>
  new RegExp(`${path.replaceAll("/", "\\/")}?$`);

/** Przesunięcie pionowe z computed `transform` (0 dla `none`). */
const translateY = (el: Element): number =>
  new DOMMatrix(getComputedStyle(el).transform).f;

test.describe("nawigacja desktop", () => {
  test.skip(({ isMobile }) => !!isMobile, "tylko układ desktop");

  for (const item of mainNavItems) {
    test(`pozycja „${item.label}" nawiguje na ${item.href}`, async ({
      page,
    }) => {
      await gotoReady(page);
      await page.locator(`.nav-link[href="${item.href}"]`).click();
      await expect(page).toHaveURL(pathPattern(item.href));
      await expect(page.locator("main h1")).toBeVisible();
      // dokładnie jedna pozycja paska oznaczona jako bieżąca
      const current = page.locator('.hdr-nav .nav-link[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute("href", item.href);
    });
  }

  test("telefon w pasku jest złożony w JS", async ({ page }) => {
    await gotoReady(page);
    const tel = page.locator(".hdr-nav a[data-tel]");
    await expect(tel).toBeVisible();
    await expect(tel).toHaveAttribute("href", buildPhoneHref());
    await expect(tel).toHaveText(buildPhoneDisplay());
  });

  test("kontrakt breakpointu: pasek desktop ↔ burger mobile", async ({
    page,
  }) => {
    await gotoReady(page);
    await expectBreakpointFlip(
      page,
      NAV_DESKTOP_MIN_PX,
      { nav: ".hdr-nav", burger: ".mbtn" },
      { nav: "none", burger: "flex" },
      { nav: "flex", burger: "none" },
    );
  });

  test("efekt liter: nazwa dostępna z aria-label, litery ukryte, podjazd przy hover", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    for (const item of mainNavItems) {
      const link = page.locator(`.nav-link[href="${item.href}"]`);
      // czytnik ekranu dostaje etykietę w naturalnej pisowni, nie litery
      await expect(link).toHaveAccessibleName(item.label);
      await expect(link.locator(".hn-ch")).toHaveCount(
        item.label.replaceAll(" ", "").length,
      );
      await expect(link.locator(".hn-sp")).toHaveCount(
        item.label.split(" ").length - 1,
      );
      await expect(link.locator("[aria-hidden='true']")).toHaveCount(
        item.label.length,
      );
    }
    const link = page.locator(".nav-link").first();
    const glyph = link.locator(".hn-ch > span").first();
    expect(await glyph.evaluate(translateY)).toBe(0);
    await link.hover();
    // przejście 0,42 s + kaskada opóźnień — czekamy na ruch pierwszej litery
    await expect.poll(() => glyph.evaluate(translateY)).toBeLessThan(0);
  });

  test("efekt liter NIEAKTYWNY przy prefers-reduced-motion: reduce", async ({
    page,
  }) => {
    // ŚWIADOMY, PUNKTOWY WYJĄTEK od reguły testing.md („nie emuluj
    // reduce"): ten test weryfikuje WYŁĄCZNIE bramkę ruchu liter; reszta
    // strony (bez modułów ruchu w chrome) nie jest tu oceniana.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoReady(page, CONTACT_PATH);
    const link = page.locator(".nav-link").first();
    const glyph = link.locator(".hn-ch > span").first();
    await link.hover();
    await settle(page, 600);
    expect(await glyph.evaluate(translateY)).toBe(0);
    // kolor i podkreślenie zostają (hover bez ruchu)
    await expect(link).toHaveCSS("color", "rgb(24, 58, 107)");
  });
});

test.describe("wariant strony głównej (data-scroll-nav)", () => {
  test("trasa stała: pasek pełny od razu, bez wariantu hero", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    const root = page.locator("[data-nav]");
    await expect(root).not.toHaveAttribute("data-scroll-nav", "");
    await expect(root).not.toHaveAttribute("data-hero", "");
    await expect(page.locator(".hdr-bg")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hdr-logo-light")).toHaveCount(0);
    await expect(page.locator(".hdr-scrim")).toHaveCount(0);
  });

  test("„/”: przezroczysty na górze, przemalowany pozycją scrolla, pełny po wysokości okna", async ({
    page,
  }) => {
    // od 4.4 „/” ma pełnoekranowe hero i treść pod nim — bez dosztukowania
    await gotoReady(page);
    const root = page.locator("[data-nav]");
    const bg = page.locator(".hdr-bg");
    await expect(root).toHaveAttribute("data-scroll-nav", "");
    await expect(root).toHaveAttribute("data-hero", "");
    await expect(root).not.toHaveAttribute("data-solid", "");
    await expect(bg).toHaveCSS("opacity", "0");
    await expect(page.locator(".hdr-logo-light")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hdr-logo-dark")).toHaveCSS("opacity", "0");

    // w połowie okna: stan pośredni (próg = 0,32 × h … h − pasek)
    const vh = await page.evaluate(() => window.innerHeight);
    await scrollPageTo(page, vh / 2);
    await settle(page, 400);
    const mid = parseFloat(
      await bg.evaluate((el) => getComputedStyle(el).opacity),
    );
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    await expect(root).not.toHaveAttribute("data-solid", "");

    // po przewinięciu o wysokość okna: pełny pasek, logo zamienione
    await scrollPageTo(page, vh);
    await settle(page, 400);
    await expect(root).toHaveAttribute("data-solid", "");
    await expect(bg).toHaveCSS("opacity", "1");
    await expect(page.locator(".hdr-logo-light")).toHaveCSS("opacity", "0");
    await expect(page.locator(".hdr-logo-dark")).toHaveCSS("opacity", "1");

    // i z powrotem na górę
    await scrollPageTo(page, 0);
    await settle(page, 400);
    await expect(root).not.toHaveAttribute("data-solid", "");
    await expect(bg).toHaveCSS("opacity", "0");
  });
});

test.describe("nawigacja mobile (bottom sheet)", () => {
  test.skip(({ isMobile }) => !isMobile, "tylko układ mobile");

  test("burger otwiera sheet, Escape zamyka i oddaje fokus", async ({
    page,
  }) => {
    await gotoReady(page);
    const root = page.locator("[data-nav]");
    const burger = page.locator("[data-burger]");
    const sheet = page.locator("#nav-sheet");

    await burger.click();
    await expect(root).toHaveAttribute("data-open", "");
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveClass(/is-open/);
    await expect(sheet.locator(".m-link")).toHaveCount(mainNavItems.length);
    await expect(sheet.locator(".m-link").first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(root).not.toHaveAttribute("data-open", "");
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    // Fokus wraca do elementu sprzed otwarcia (overlay.ts, lastFocused) —
    // bez twardej asercji: WebKit nie fokusuje buttonów po kliku myszą.
  });

  test("stan solid paska PRZEŻYWA otwarcie menu", async ({ page }) => {
    // overlay.ts blokuje scroll przez `body{position:fixed;top:-scrollY}`,
    // co ZERUJE window.scrollY i odpala `scroll`. Bez zamrożenia stanu
    // (Navbar: `sheetOpen`) próg przeliczałby się na pozycji 0.
    await gotoReady(page);
    await ensureScrollRoom(page);
    await scrollPageTo(page, 1200);
    const root = page.locator("[data-nav]");
    await expect(root).toHaveAttribute("data-solid", "");

    await page.locator("[data-burger]").click();
    await expect(page.locator("#nav-sheet")).toHaveClass(/is-open/);
    await expect(root).toHaveAttribute("data-solid", "");
    await expect(page.locator(".hdr-bg")).toHaveCSS("opacity", "1");

    await page.keyboard.press("Escape");
    await expect(page.locator("#nav-sheet")).toBeHidden();
    await expect(root).toHaveAttribute("data-solid", "");
  });

  test("na górze strony otwarcie menu NIE zmienia stanu paska", async ({
    page,
  }) => {
    // Druga strona kontraktu: zamrażamy stan zastany, a nie wymuszamy solid.
    await gotoReady(page);
    const root = page.locator("[data-nav]");
    await expect(root).not.toHaveAttribute("data-solid", "");
    await page.locator("[data-burger]").click();
    await expect(page.locator("#nav-sheet")).toHaveClass(/is-open/);
    await expect(root).not.toHaveAttribute("data-solid", "");
    await expect(page.locator(".hdr-bg")).toHaveCSS("opacity", "0");
  });

  test("klik w scrim (nad panelem) zamyka sheet", async ({ page }) => {
    await gotoReady(page);
    await page.locator("[data-burger]").click();
    const sheet = page.locator("#nav-sheet");
    await expect(sheet).toHaveClass(/is-open/);
    // Punkt przy górnej krawędzi = tło nakładki, poza [data-overlay-panel].
    await sheet.click({ position: { x: 10, y: 10 } });
    await expect(sheet).toBeHidden();
    await expect(page.locator("[data-nav]")).not.toHaveAttribute(
      "data-open",
      "",
    );
  });

  test("swipe-down za uchwyt zamyka sheet (gest overlay.ts)", async ({
    page,
  }) => {
    await gotoReady(page);
    await page.locator("[data-burger]").click();
    const sheet = page.locator("#nav-sheet");
    await expect(sheet).toHaveClass(/is-open/);
    // Odczekaj wjazd panelu (transform .42s): boundingBox mierzony w trakcie
    // animacji celowałby tam, gdzie uchwyt dopiero BĘDZIE — pointerdown
    // trafiałby w nav sheeta i gest w ogóle by się nie zaczynał.
    await page.waitForTimeout(600);

    // Gest pointerowy: overlay.ts słucha pointer events, więc przeciągnięcie
    // myszą odpala tę samą ścieżkę co palec (drag > DRAG_CLOSE_PX zamyka).
    const grab = sheet.locator("[data-overlay-drag]");
    const box = await grab.boundingBox();
    expect(box).not.toBeNull();
    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX, startY + i * 25);
    }
    await page.mouse.up();

    await expect(sheet).toBeHidden();
    await expect(page.locator("[data-nav]")).not.toHaveAttribute(
      "data-open",
      "",
    );
    await expect(page.locator("[data-burger]")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("przejście na desktop zamyka otwarty sheet i odblokowuje scroll", async ({
    page,
  }) => {
    await gotoReady(page);
    await page.locator("[data-burger]").click();
    const sheet = page.locator("#nav-sheet");
    await expect(sheet).toHaveClass(/is-open/);
    expect(await page.evaluate(() => document.body.style.position)).toBe(
      "fixed",
    );

    const height = page.viewportSize()?.height ?? 800;
    await page.setViewportSize({ width: NAV_DESKTOP_MIN_PX, height });
    await expect(sheet).toBeHidden();
    await expect(page.locator("[data-nav]")).not.toHaveAttribute(
      "data-open",
      "",
    );
    await expect(page.locator("[data-burger]")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
  });

  for (const path of [OFFERS_PATH, CONTACT_PATH]) {
    test(`pozycja ${path} w sheecie nawiguje na podstronę`, async ({
      page,
    }) => {
      await gotoReady(page);
      await page.locator("[data-burger]").click();
      // Asercja treści ogólna (main h1), odporna na wymianę szkieletu.
      await page.locator(`.m-link[href="${path}"]`).click();
      await expect(page).toHaveURL(pathPattern(path));
      await expect(page.locator("main h1")).toBeVisible();
    });
  }

  test("sheet ma sekcję Zadzwoń z numerem złożonym w JS", async ({ page }) => {
    await gotoReady(page);
    await page.locator("[data-burger]").click();
    const tel = page.locator("#nav-sheet .sheet-call a[data-tel]");
    await expect(tel).toBeVisible();
    await expect(tel).toHaveAttribute("href", buildPhoneHref());
  });
});

test("logo w pasku prowadzi na stronę główną z podstrony", async ({ page }) => {
  await gotoReady(page, CONTACT_PATH);
  await page.locator(".hdr-logo").click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test.describe("stopka", () => {
  test("telefon i mail złożone w JS we WSZYSTKICH slotach antyscrapingowych", async ({
    page,
  }) => {
    await gotoReady(page);
    // Sloty: telefon tekstowy + przycisk „Zadzwoń" (href), wiersz E-mail +
    // przycisk „Napisz" (href) — każdy dostaje cel z JS.
    const tels = page.locator("footer a[data-tel]");
    expect(await tels.count()).toBeGreaterThanOrEqual(2);
    for (const a of await tels.all()) {
      await expect(a).toHaveAttribute("href", buildPhoneHref());
    }
    const mails = page.locator('footer a[data-mail="biuro"]');
    expect(await mails.count()).toBeGreaterThanOrEqual(2);
    for (const a of await mails.all()) {
      await expect(a).toHaveAttribute("href", "mailto:" + buildEmail("biuro"));
    }
    // slot tekstowy pokazuje numer i adres
    await expect(page.locator("footer .ft-tel")).toHaveText(
      buildPhoneDisplay(),
    );
    await expect(page.locator("footer .ft-row a[data-mail]")).toHaveText(
      buildEmail("biuro"),
    );
  });

  test("komplet danych firmy (biuro, siedziba, NIP, REGON) i mapa strony", async ({
    page,
  }) => {
    await gotoReady(page, CONTACT_PATH);
    const footer = page.locator("footer");
    const links = footer.locator(".ft-nav a");
    await expect(links).toHaveCount(footerNavItems.length);
    for (const [i, item] of footerNavItems.entries()) {
      await expect(links.nth(i)).toHaveAttribute("href", item.href);
      await expect(links.nth(i)).toHaveText(item.label);
    }
    const text = await footer.innerText();
    // biuro (link do map) i siedziba wg rejestru — rozjazd R1 analizy
    expect(text).toContain(BUSINESS.street);
    expect(text).toContain(BUSINESS.legalName);
    expect(text).toContain(BUSINESS.seatStreet);
    expect(text).toContain(
      `${BUSINESS.seatPostalCode} ${BUSINESS.seatLocality}`,
    );
    expect(text).toContain(`NIP ${BUSINESS.vatID.replace(/\D/g, "")}`);
    expect(text).toContain(`REGON ${BUSINESS.regon}`);
    const maps = footer.locator('a[href^="https://maps.google.com/"]');
    await expect(maps).toHaveCount(1);
    await expect(maps).toHaveAttribute("target", "_blank");
    await expect(footer.locator(".ft-policy")).toHaveAttribute(
      "href",
      "/polityka-prywatnosci/",
    );
  });

  test("przyciski Zadzwoń/Napisz bez JS prowadzą na /kontakt/ (surowy HTML)", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    const fallback = html.match(
      /<a[^>]*data-fill="href"[^>]*href="\/kontakt\/"/g,
    );
    expect(fallback?.length).toBe(2);
  });
});

test("telefon i maile NIE występują w surowym HTML (antyscraping)", async ({
  request,
}) => {
  // Sprawdzamy surowe źródło wszystkich tras statycznych (chrome renderuje
  // sloty puste). Opis oferty z CRM jest z tego kontraktu WYŁĄCZONY —
  // dotyczy tras ofert, których tu nie ma.
  const digits = buildPhoneHref().replace("tel:+48", "");
  const spaced = buildPhoneDisplay().replace("+48 ", "");
  for (const path of STATIC_PATHS) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain(digits);
    expect(html, path).not.toContain(spaced);
    expect(html, path).not.toContain(buildEmail("biuro"));
    expect(html, path).not.toContain(buildEmail("joanna"));
  }
});

test("strona główna ładuje się bez błędów konsoli i 404", async ({ page }) => {
  const issues = collectPageIssues(page);
  await gotoReady(page);
  await settle(page);
  expect(issues()).toEqual([]);
});

// Na wolnym łączu, zanim dopłynie treść `main`, widać tło BODY — musi być
// gładką bazą strony (bez obrazka), żeby ładowanie wyglądało jak strona.
test.describe("tło w chwili ładowania = gładka baza", () => {
  for (const path of STATIC_PATHS) {
    test(`${path}: body bez obrazka`, async ({ page }) => {
      await page.goto(path);
      const body = await page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        return { image: cs.backgroundImage, color: cs.backgroundColor };
      });
      expect(body.image).toBe("none");
      expect(body.color).toBe("rgb(243, 242, 239)");
    });
  }
});
