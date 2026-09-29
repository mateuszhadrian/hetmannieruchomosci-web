// SEO/linki: canonical, meta OG/Twitter, ikony, sitemap, robots.txt, crawl
// wewnętrznych linków (< 400). Meta są identyczne między profilami — biega
// tylko na chromium-1920.
// STAN Etapu 0: JSON-LD nie jest jeszcze renderowany (wchodzi w Etapie 6,
// węzeł per oferta w Etapie 4) — kontrakt pilnuje, że nie ma go nigdzie.
// Oferty w sitemapie dochodzą razem z trasami ofert (Etap 2).
import { type APIRequestContext, expect, test } from "@playwright/test";
import { STATIC_PATHS } from "../../src/lib/routes";
import { useChromium1920Only } from "../helpers/guards";
import { gotoReady } from "../helpers/scroll";

const SITE = "https://hetmannieruchomosci.com";

// Wszystkie trasy statyczne mają własny canonical w domenie głównej
// (także na podglądzie — podgląd chroni nagłówek noindex).
const CANONICAL_ROUTES: readonly string[] = STATIC_PATHS;

useChromium1920Only(
  "meta/sitemap/crawl są niezależne od profilu — jeden projekt wystarczy",
);

test("head /: canonical + OG/Twitter", async ({ page }) => {
  await gotoReady(page, "/");
  const head = page.locator("head");

  // Canonical i og:url są absolutne (domena z astro.config — także na preview).
  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${SITE}/`,
  );
  await expect(head.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `${SITE}/`,
  );
  await expect(head.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    `${SITE}/og-image.png`,
  );
  await expect(head.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "pl_PL",
  );
  const ogTitle = await head
    .locator('meta[property="og:title"]')
    .getAttribute("content");
  expect(ogTitle).toBe(await page.title());
  // Kadr og-image i typ karty chodzą w parze: 1200×630 + karta „large".
  await expect(head.locator('meta[property="og:image:width"]')).toHaveAttribute(
    "content",
    "1200",
  );
  await expect(
    head.locator('meta[property="og:image:height"]'),
  ).toHaveAttribute("content", "630");
  await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
});

// Ikony marki: komplet jest generatem `node scripts/make-icons.mjs`.
// Sprawdzamy, że pliki wychodzą z builda niepuste i są tym, za co się
// podają. Wektorowy favicon.svg dochodzi w Etapie 6.
test("ikony marki i manifest odpowiadają 200 i mają właściwy format", async ({
  request,
}) => {
  const MAGIC: Record<string, (b: Buffer) => boolean> = {
    "/favicon.ico": (b) => b.readUInt32LE(0) === 0x00010000, // reserved=0, typ=1
    "/apple-touch-icon.png": (b) =>
      b.subarray(1, 4).toString("latin1") === "PNG",
    "/icon-192.png": (b) => b.subarray(1, 4).toString("latin1") === "PNG",
    "/icon-512.png": (b) => b.subarray(1, 4).toString("latin1") === "PNG",
    "/og-image.png": (b) => b.subarray(1, 4).toString("latin1") === "PNG",
  };
  for (const [path, isValid] of Object.entries(MAGIC)) {
    const res = await request.get(path);
    expect(res.status(), `ikona ${path}`).toBe(200);
    const body = await res.body();
    expect(body.length, `ikona ${path} jest pusta`).toBeGreaterThan(100);
    expect(isValid(body), `ikona ${path} ma zły format`).toBe(true);
  }

  const manifest = await request.get("/site.webmanifest");
  expect(manifest.status()).toBe(200);
  const parsed = JSON.parse(await manifest.text());
  expect(parsed.name).toBe("Hetman Nieruchomości");
  expect(parsed.start_url).toBe("/");
  // Kolory manifestu = tło strony, jak <meta name="theme-color">.
  expect(parsed.theme_color).toBe("#f3f2ef");
  expect(parsed.background_color).toBe("#f3f2ef");
  expect(parsed.icons.length).toBeGreaterThan(0);
  for (const icon of parsed.icons) {
    const res = await request.get(icon.src);
    expect(res.status(), `ikona z manifestu ${icon.src}`).toBe(200);
  }
});

// Dane strukturalne: kształt węzłów pilnuje kontrakt unit
// (tests/unit/jsonld.test.ts). Do czasu wpięcia węzłów w strony żadna
// trasa nie może ich nieść (połowiczne wpięcie = wielokrotne deklaracje
// tego samego `@id` albo węzeł bez walidacji).
const ldJson = async (
  request: APIRequestContext,
  path: string,
): Promise<Record<string, unknown>[]> => {
  const html = await (await request.get(path)).text();
  return [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].map((m) => JSON.parse(m[1]) as Record<string, unknown>);
};

test("JSON-LD: żadna trasa statyczna nie niesie jeszcze węzłów", async ({
  request,
}) => {
  for (const path of CANONICAL_ROUTES) {
    expect((await ldJson(request, path)).length, `JSON-LD na ${path}`).toBe(0);
  }
});

test("każda trasa ma canonical wskazujący samą siebie w domenie głównej", async ({
  request,
}) => {
  for (const path of CANONICAL_ROUTES) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain(`<link rel="canonical" href="${SITE}${path}"`);
    expect(html, path).not.toContain('name="robots" content="noindex"');
  }
});

test("robots.txt niczego nie blokuje i wskazuje sitemapę", async ({
  request,
}) => {
  const res = await request.get("/robots.txt");
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toMatch(/^Disallow:\s*$/m);
  expect(body).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
});

test("pliki platformy: _headers (noindex podglądu) i _routes.json", async ({
  request,
}) => {
  // Preview serwuje je jak zwykłe pliki; na Cloudflare Pages sterują
  // nagłówkami i zakresem Functions. Tu pilnujemy, że trafiają do dist.
  const headers = await request.get("/_headers");
  expect(headers.ok()).toBe(true);
  const rules = await headers.text();
  expect(rules).toContain("https://nowa.hetmannieruchomosci.com/*");
  expect(rules).toContain("https://:project.pages.dev/*");
  expect(rules.match(/X-Robots-Tag: noindex/g)).toHaveLength(3);
  // domena główna NIE może dostać noindex
  expect(rules).not.toMatch(/^https:\/\/hetmannieruchomosci\.com/m);

  const routes = await request.get("/_routes.json");
  expect(routes.ok()).toBe(true);
  expect(JSON.parse(await routes.text())).toEqual({
    version: 1,
    include: ["/api/*"],
    exclude: [],
  });
});

test("sitemapa istnieje i zawiera dokładnie trasy z własnym canonicalem", async ({
  request,
}) => {
  const index = await request.get("/sitemap-index.xml");
  expect(index.ok()).toBe(true);
  const locs = [...(await index.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1],
  );
  expect(locs.length).toBeGreaterThan(0);

  const urls: string[] = [];
  for (const loc of locs) {
    const res = await request.get(new URL(loc).pathname);
    expect(res.ok(), `sitemapa ${loc}`).toBe(true);
    urls.push(
      ...[...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (m) => m[1],
      ),
    );
  }
  expect(urls.sort()).toEqual(
    CANONICAL_ROUTES.map((p) => `${SITE}${p}`).sort(),
  );
});

test("wszystkie wewnętrzne linki odpowiadają < 400", async ({
  page,
  request,
}) => {
  const hrefs = new Set<string>();
  for (const path of CANONICAL_ROUTES) {
    await gotoReady(page, path);
    for (const href of await page
      .locator("a[href]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")))) {
      if (!href || !href.startsWith("/") || href.startsWith("//")) continue;
      if (href.includes("/cdn-cgi/")) continue; // tylko na produkcji Cloudflare
      hrefs.add(href);
    }
  }
  expect(hrefs.size).toBeGreaterThan(0);
  for (const href of hrefs) {
    const res = await request.get(href);
    expect(res.status(), `link ${href}`).toBeLessThan(400);
  }
});
