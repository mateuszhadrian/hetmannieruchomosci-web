// Strona 404 — kontrakty: PRAWDZIWY status 404 pod nieistniejącym adresem
// (bez 404.html Cloudflare Pages serwuje stronę główną z kodem 200 —
// soft-404), noindex bez canonicala/og:url i bez JSON-LD, komunikat +
// jedna akcja „Powrót na stronę główną", pełny chrome (navbar + stopka),
// tło = baza strony, zero JS widoku. Ten sam dokument odpowiada pod adresem dowolnej
// głębokości — stąd warianty ścieżek.
// WARIANT ŚWIADOMY OFERT (4.3 b): pod wygasłym adresem oferty (`/oferty/…`
// albo krótki `/SW…`) skrypt inline podmienia komunikat na „Ta oferta jest
// już niedostępna" + do 3 najnowszych aktywnych ofert (render statyczny,
// w `<template>`); status, noindex i komplet modułów bez zmian; bez JS
// zostaje komunikat generyczny. Dane produkcyjne przez helper (zero ofert
// aktywnych = sam komunikat), media zaślepione.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sortEntries } from "../../src/lib/offers/filters";
import { toIndexEntry } from "../../src/lib/offers/index-entry";
import { DETAIL } from "../../src/lib/offers/offers-ui";
import { OFFERS_PATH } from "../../src/lib/offers/urls";
import { HOME_PATH } from "../../src/lib/routes";
import { MEDIA_BASE } from "../../src/lib/site-config";
import { useMediaStub, usePreviewGuard } from "../helpers/guards";
import { pickOffers } from "../helpers/offers";
import { gotoReady } from "../helpers/scroll";

usePreviewGuard();
useMediaStub();

const MISSING = ["/fgsdfgsdf", "/nie-ma-takiej-strony/", "/a/b/c/"];
/** Wygasłe adresy ofert: pełny, krótki i krótki wielkimi literami. */
const MISSING_OFFER = ["/oferty/x/y/sw000000/", "/sw000000", "/SW000000/"];
/** 3 najnowsze aktywne oferty — ta sama reguła co strona (`sortEntries`
 *  czyta `SORT_NEWEST_BY`); pusta lista = sam komunikat. */
const LATEST = sortEntries(
  pickOffers({ status: "aktywna" }).map(toIndexEntry),
  "newest",
).slice(0, 3);
const TEXT =
  "Strona o podanym adresie nie istnieje. Sprawdź adres i spróbuj ponownie.";

test("nieistniejący adres odpowiada statusem 404 (nie soft-404 z kodem 200)", async ({
  request,
}) => {
  for (const path of MISSING) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(404);
    expect(await res.text(), path).toContain("404");
  }
});

test("meta: tytuł, noindex, BEZ canonicala, og:url i JSON-LD", async ({
  page,
}) => {
  await gotoReady(page, MISSING[1]);
  const head = page.locator("head");
  await expect(page).toHaveTitle(
    "Nie znaleziono strony — Hetman Nieruchomości",
  );
  await expect(head.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
  await expect(head.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(head.locator('meta[property="og:url"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    0,
  );
});

test.describe("bez JS strona jest kompletna", () => {
  test.use({ javaScriptEnabled: false });

  test("h1 z pełną nazwą błędu, komunikat i przycisk na stronę główną", async ({
    page,
  }) => {
    await page.goto(MISSING[0]);
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    // wizualnie samo „404", dla czytników pełna nazwa błędu
    await expect(h1).toHaveAccessibleName(/Błąd 404.*nie znaleziono strony/);
    await expect(page.locator(".nf-txt")).toHaveText(TEXT);
    const btn = page.getByRole("link", { name: "Powrót na stronę główną" });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("href", HOME_PATH);
    // pełny chrome: z błędnego adresu da się wyjść w każde miejsce serwisu
    await expect(page.locator("header.hdr")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);
  });
});

test("przycisk prowadzi na stronę główną także z adresu zagnieżdżonego", async ({
  page,
}) => {
  await gotoReady(page, MISSING[2]);
  await page.getByRole("link", { name: "Powrót na stronę główną" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(new URL(page.url()).pathname).toBe(HOME_PATH);
});

test("komunikat zajmuje środek pierwszego ekranu pod paskiem", async ({
  page,
}) => {
  await gotoReady(page, MISSING[1]);
  const geo = await page.evaluate(() => {
    const box = document.querySelector(".nf-in")!.getBoundingClientRect();
    const main = document.querySelector(".nf")!.getBoundingClientRect();
    const hdr = document.querySelector(".hdr")!.getBoundingClientRect();
    return {
      top: box.top,
      bottom: box.bottom,
      cx: box.left + box.width / 2,
      // Środek liczony z pudełka `main`, NIE z okna: na linuksowym runnerze
      // pasek przewijania jest klasyczny (15 px), a `scrollbar-gutter:
      // stable` na html rezerwuje mu miejsce — środek okna i środek obszaru
      // treści rozjeżdżają się o pół paska. Na macOS paski są nakładkowe,
      // więc lokalnie tego nie widać.
      mainCx: main.left + main.width / 2,
      hdrBottom: hdr.bottom,
      vh: window.innerHeight,
    };
  });
  expect(geo.top).toBeGreaterThanOrEqual(geo.hdrBottom);
  expect(geo.bottom).toBeLessThanOrEqual(geo.vh);
  expect(Math.abs(geo.cx - geo.mainCx)).toBeLessThanOrEqual(1);
});

test("tło = baza strony", async ({ page }) => {
  await gotoReady(page, MISSING[0]);
  const tla = await page.evaluate(() => ({
    bodyImage: getComputedStyle(document.body).backgroundImage,
    bodyColor: getComputedStyle(document.body).backgroundColor,
    mainColor: getComputedStyle(document.querySelector(".nf")!).backgroundColor,
  }));
  expect(tla.bodyImage).toBe("none");
  expect(tla.bodyColor).toBe(tla.mainColor);
});

test("zero JS widoku: jedyne moduły to chrome (navbar i stopka)", async ({
  request,
}) => {
  const html = await (await request.get(MISSING[0])).text();
  const modules = [
    ...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g),
  ].map((m) => m[1]);
  expect(modules.length).toBeGreaterThan(0);
  for (const src of modules) {
    expect(src, "moduł spoza chrome'u").toMatch(/\/(Navbar|Footer)\.astro_/);
  }
});

test.describe("wariant świadomy ofert (wygasły adres oferty)", () => {
  test("status 404 także pod adresem oferty; surowy HTML niesie oba warianty", async ({
    request,
  }) => {
    for (const path of MISSING_OFFER) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(404);
      const html = await res.text();
      // bez JS: komunikat generyczny w dokumencie, ofertowy w <template>
      expect(html, path).toContain("data-nf-generic");
      expect(html, path).toMatch(/<template[^>]*data-nf-tpl/);
      expect(html, path).toContain(DETAIL.nfHeading);
    }
  });

  test("adres oferty: jeden h1 z komunikatem o ofercie, link do listy, 3 najnowsze aktywne oferty", async ({
    page,
  }) => {
    for (const path of MISSING_OFFER) {
      await gotoReady(page, path);
      await expect(page.locator("[data-nf-offer]"), path).toBeVisible();
      await expect(page.locator("[data-nf-generic]"), path).toHaveCount(0);
      const h1 = page.locator("h1");
      await expect(h1, path).toHaveCount(1);
      await expect(h1, path).toHaveText(DETAIL.nfHeading);
      await expect(page).toHaveTitle(new RegExp(`^${DETAIL.nfHeading} — `));
      // noindex zostaje, canonicala nadal nie ma
      await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex",
      );
      await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
      const link = page.locator("[data-nf-link]");
      await expect(link).toHaveText(DETAIL.nfLink);
      await expect(link).toHaveAttribute("href", OFFERS_PATH);
      // karty = najnowsze aktywne (kolejność jak na liście); zero = sam komunikat
      const cards = page.locator("[data-nf-cards] [data-offer-card]");
      expect(
        await cards.evaluateAll((els) =>
          els.map((el) => el.getAttribute("data-offer-card")),
        ),
        path,
      ).toEqual(LATEST.map((e) => e.number));
      await expect(page.locator(".nf-txt")).toHaveText(
        LATEST.length > 0 ? DETAIL.nfText : DETAIL.nfTextEmpty,
      );
      if (LATEST.length > 0) {
        await expect(
          page.getByRole("heading", { level: 2, name: DETAIL.nfLatest }),
        ).toBeVisible();
      } else {
        await expect(page.locator("[data-nf-cards]")).toHaveCount(0);
      }
    }
  });

  test("link „Wszystkie oferty” i karta prowadzą na istniejące strony", async ({
    page,
    request,
  }) => {
    await gotoReady(page, MISSING_OFFER[0]);
    const hrefs = await page
      .locator("[data-nf-offer] a[href]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")!));
    expect(hrefs.length).toBe(1 + LATEST.length);
    for (const href of hrefs) {
      expect((await request.get(href)).status(), href).toBe(200);
    }
    await page.locator("[data-nf-link]").click();
    expect(new URL(page.url()).pathname).toBe(OFFERS_PATH);
  });

  test("adres spoza ofert: komunikat generyczny, bez kart i bez żądań do hosta mediów", async ({
    page,
  }) => {
    const media: string[] = [];
    page.on("request", (r) => {
      if (MEDIA_BASE && r.url().startsWith(MEDIA_BASE)) media.push(r.url());
    });
    for (const path of MISSING) {
      await gotoReady(page, path);
      await expect(page.locator("[data-nf-generic]"), path).toBeVisible();
      await expect(page.locator("[data-nf-offer]"), path).toHaveCount(0);
      await expect(page.locator(".nf-txt"), path).toHaveText(TEXT);
    }
    expect(media).toEqual([]);
  });

  test("zero modułów widoku także w wariancie ofertowym; żądania tylko do własnego hosta i hosta mediów", async ({
    page,
  }) => {
    const hosts = new Set<string>();
    const modules: string[] = [];
    page.on("request", (r) => {
      hosts.add(new URL(r.url()).host);
      if (r.resourceType() === "script")
        modules.push(new URL(r.url()).pathname);
    });
    await gotoReady(page, MISSING_OFFER[0]);
    await expect(page.locator("[data-nf-offer]")).toBeVisible();
    const allowed = new Set([
      new URL(page.url()).host,
      ...(MEDIA_BASE ? [new URL(MEDIA_BASE).host] : []),
    ]);
    expect([...hosts].filter((h) => !allowed.has(h))).toEqual([]);
    // wyłącznie chrome i jego współdzielone chunki — żadnej wyspy ani
    // skryptu widoku ofert
    for (const src of modules) {
      expect(src, "skrypt spoza chrome'u").not.toMatch(
        /SearchIsland|OfferDetailPage|offer-lightbox|preact|client\./,
      );
    }
  });

  test("axe: wariant ofertowy bez naruszeń WCAG 2 A/AA", async ({ page }) => {
    await gotoReady(page, MISSING_OFFER[0]);
    await expect(page.locator("[data-nf-offer]")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);
  });

  test.describe("bez JS", () => {
    test.use({ javaScriptEnabled: false });

    test("pod adresem oferty zostaje komunikat generyczny (jeden h1, bez kart)", async ({
      page,
    }) => {
      for (const path of MISSING_OFFER) {
        await page.goto(path);
        const h1 = page.locator("h1");
        await expect(h1, path).toHaveCount(1);
        await expect(h1, path).toHaveAccessibleName(
          /Błąd 404.*nie znaleziono strony/,
        );
        await expect(page.locator("[data-nf-generic]"), path).toBeVisible();
        await expect(page.locator(".nf-txt"), path).toHaveText(TEXT);
        await expect(page.locator("[data-nf-offer]"), path).toHaveCount(0);
        await expect(page.locator("[data-offer-card]"), path).toHaveCount(0);
      }
    });
  });
});
