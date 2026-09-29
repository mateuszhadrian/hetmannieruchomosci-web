// Strona 404 — kontrakty: PRAWDZIWY status 404 pod nieistniejącym adresem
// (bez 404.html Cloudflare Pages serwuje stronę główną z kodem 200 —
// soft-404), noindex bez canonicala/og:url i bez JSON-LD, komunikat +
// jedna akcja „Powrót na stronę główną", pełny chrome (navbar + stopka),
// tło = baza strony, zero JS widoku. Ten sam dokument odpowiada pod adresem dowolnej
// głębokości — stąd warianty ścieżek.
import { expect, test } from "@playwright/test";
import { HOME_PATH } from "../../src/lib/routes";
import { usePreviewGuard } from "../helpers/guards";
import { gotoReady } from "../helpers/scroll";

usePreviewGuard();

const MISSING = ["/fgsdfgsdf", "/nie-ma-takiej-strony/", "/a/b/c/"];
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
